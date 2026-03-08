import type {
  Task,
  ValidationResult,
  StructuralValidation,
  PipelineValidation,
} from "../types";
import { resolvePath } from "../engine/pathResolver";
import { parseCommand } from "../engine/parser";
import { executeScript } from "../engine/executor";

export function validateTask(input: string, task: Task): ValidationResult {
  const v = task.validation;

  // For multi-line scripts, we need to find the pipeline to validate.
  const lines = input
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  // Join continuation lines (ending with |)
  const statements: string[] = [];
  let buffer = "";
  for (const line of lines) {
    if (buffer) {
      buffer += " " + line;
    } else {
      buffer = line;
    }
    if (line.endsWith("|")) continue;
    // Check brace balance
    const opens = (buffer.match(/\{/g) || []).length;
    const closes = (buffer.match(/\}/g) || []).length;
    if (opens > closes) continue;
    statements.push(buffer);
    buffer = "";
  }
  if (buffer) statements.push(buffer);

  // Separate assignments from pipelines
  const pipelines: string[] = [];
  for (const stmt of statements) {
    if (/^\$\w+\s*=/.test(stmt)) {
      const rhs = stmt.replace(/^\$\w+\s*=\s*/, "");
      if (rhs) pipelines.push(rhs);
    } else {
      const stripped = stmt.replace(/^\$\w+\s*\|\s*/, "");
      pipelines.push(stripped || stmt);
    }
  }

  // Collect ALL pipeline stages across all statements
  const allStages = [];
  for (const pl of pipelines) {
    const { parsed } = parseCommand(pl);
    allStages.push(...parsed);
  }

  // Also parse the last non-assignment statement as the "primary" pipeline
  const lastPipeline = pipelines[pipelines.length - 1] || "";
  const { parsed: stages } = parseCommand(lastPipeline);

  if (allStages.length === 0) {
    return { passed: false, feedback: "Enter a command to continue." };
  }

  // Structural validation
  if (v.type === "structural") {
    return validateStructural(v, stages, allStages);
  }

  // Pipeline validation
  if (v.type === "pipeline") {
    return validatePipeline(v, allStages, input);
  }

  return { passed: true };
}

function validateStructural(
  v: StructuralValidation,
  stages: ReturnType<typeof parseCommand>["parsed"],
  _allStages: ReturnType<typeof parseCommand>["parsed"]
): ValidationResult {
  const mainStage = stages[0];
  if (mainStage.cmdlet.toLowerCase() !== v.cmdlet) {
    return {
      passed: false,
      feedback: `Try using \`${formatCmdletName(v.cmdlet)}\` for this task.`,
      partial: ["You entered a valid command"],
    };
  }
  if (v.requirePath) {
    const userPath =
      mainStage.params.Path ||
      mainStage.params.path ||
      (mainStage.params._positional && mainStage.params._positional[0]) ||
      ".";
    const userResolved = resolvePath(userPath);

    const expectedResolved = v.requirePath
      .map((p) => resolvePath(p))
      .filter(Boolean);

    if (!userResolved) {
      return {
        passed: false,
        feedback:
          "The path you specified doesn't resolve to a valid item. Check your path.",
        partial: ["Correct cmdlet"],
      };
    }

    const matches = expectedResolved.some(
      (e) => e!.node._id === userResolved.node._id
    );
    if (!matches) {
      return {
        passed: false,
        feedback: "Your command resolved to the wrong item. Check your path.",
        partial: ["Correct cmdlet"],
      };
    }
  }
  if (v.requireSwitch) {
    const hasSwitch = mainStage.switches.some(
      (s) => s.toLowerCase() === v.requireSwitch!.toLowerCase()
    );
    if (!hasSwitch) {
      return {
        passed: false,
        feedback: `Don't forget the \`-${v.requireSwitch.charAt(0).toUpperCase() + v.requireSwitch.slice(1)}\` switch.`,
        partial: ["Correct cmdlet", "Correct path"],
      };
    }
  }
  return { passed: true };
}

const ALIASES: Record<string, string[]> = {
  "where-object": ["where-object", "where", "?"],
  "foreach-object": ["foreach-object", "foreach", "%"],
  "select-object": ["select-object", "select"],
  "sort-object": ["sort-object", "sort"],
  "group-object": ["group-object", "group"],
  "measure-object": ["measure-object", "measure"],
  "get-member": ["get-member", "gm"],
  "get-childitem": ["get-childitem", "gci", "dir", "ls"],
  "get-item": ["get-item", "gi"],
  "show-listview": ["show-listview"],
  "show-alert": ["show-alert"],
  "new-item": ["new-item"],
  "remove-item": ["remove-item"],
  "move-item": ["move-item", "mi", "mv"],
  "copy-item": ["copy-item", "ci", "cp", "cpi"],
  "rename-item": ["rename-item", "ren", "rni"],
};

function validatePipeline(
  v: PipelineValidation,
  allStages: ReturnType<typeof parseCommand>["parsed"],
  input: string
): ValidationResult {
  const allCmdlets = allStages.map((s) => s.cmdlet.toLowerCase());

  for (let i = 0; i < v.stages.length; i++) {
    const expected = v.stages[i];
    const validNames = ALIASES[expected] || [expected];
    const found = allCmdlets.some((cmd) => validNames.includes(cmd));
    if (!found) {
      return {
        passed: false,
        feedback: `Your script should include \`${formatCmdletName(expected)}\`.`,
        partial: v.stages
          .slice(0, i)
          .filter((s) => {
            const vn = ALIASES[s] || [s];
            return allCmdlets.some((cmd) => vn.includes(cmd));
          })
          .map(
            (s) =>
              `✓ ${formatCmdletName(s)}`
          ),
      };
    }
  }

  // Check output constraints — run full script
  if (v.outputContains || v.outputNotContains) {
    const result = executeScript(input);
    if (v.outputContains && !result.output.includes(v.outputContains)) {
      return {
        passed: false,
        feedback:
          "Your script runs, but the output doesn't match what's expected. Check your filter criteria.",
        partial: ["Correct pipeline structure"],
      };
    }
    if (v.outputNotContains && result.output.includes(v.outputNotContains)) {
      return {
        passed: false,
        feedback:
          "Your filter isn't specific enough — unwanted items are getting through.",
        partial: ["Correct pipeline structure"],
      };
    }
  }

  return { passed: true };
}

function formatCmdletName(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("-");
}
