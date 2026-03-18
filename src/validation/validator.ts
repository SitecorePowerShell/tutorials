import type {
  Task,
  ValidationResult,
  StructuralValidation,
  PipelineValidation,
  OutputValidation,
  SideEffectValidation,
} from "../types";
import { resolvePath } from "../engine/pathResolver";
import { parseCommand } from "../engine/parser";
import { executeScript } from "../engine/executor";
import { getItemProperty } from "../engine/properties";
import { validateStageParams } from "./cmdletParams";

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

  // Output-only validation — execute and check output strings, no structural checks
  if (v.type === "output") {
    return validateOutput(v, input);
  }

  // Side-effect validation — execute and check tree mutations
  if (v.type === "side-effect") {
    return validateSideEffect(v, allStages, input);
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
        partial: ["Correct command"],
      };
    }

    const matches = expectedResolved.some(
      (e) => e!.node._id === userResolved.node._id
    );
    if (!matches) {
      return {
        passed: false,
        feedback: "Your command resolved to the wrong item. Check your path.",
        partial: ["Correct command"],
      };
    }
  }
  if (v.requireSwitches) {
    for (const sw of v.requireSwitches) {
      const hasSwitch = mainStage.switches.some(
        (s) => s.toLowerCase() === sw.toLowerCase()
      );
      if (!hasSwitch) {
        return {
          passed: false,
          feedback: `Don't forget the \`-${sw.charAt(0).toUpperCase() + sw.slice(1)}\` switch.`,
          partial: ["Correct command", "Correct path"],
        };
      }
    }
  }
  if (v.requireParams) {
    for (const [key, expectedValue] of Object.entries(v.requireParams)) {
      const actualValue = findParam(mainStage.params, key);
      if (actualValue === undefined) {
        return {
          passed: false,
          feedback: `Don't forget the \`-${key}\` parameter.`,
          partial: ["Correct command", "Correct path"],
        };
      }
      if (actualValue !== expectedValue) {
        return {
          passed: false,
          feedback: `The \`-${key}\` parameter value doesn't match what's expected.`,
          partial: ["Correct command", "Correct path"],
        };
      }
    }
  }

  // Registry-based parameter type validation
  const registryError = validateStageParams(mainStage, v.cmdlet, {
    parameterSet: v.parameterSet,
    allowSpeParams: v.allowSpeParams,
  });
  if (registryError) {
    return {
      passed: false,
      feedback: registryError,
      partial: ["Correct command", "Correct path"],
    };
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
  "find-item": ["find-item", "fi"],
  "publish-item": ["publish-item"],
  "initialize-item": ["initialize-item"],
  "write-error": ["write-error"],
  "write-warning": ["write-warning"],
  "write-host": ["write-host"],
  "set-itemproperty": ["set-itemproperty", "sp"],
};

/** Resolve a user-typed cmdlet name to its canonical lowercase form */
function resolveAlias(cmdlet: string): string {
  const lower = cmdlet.toLowerCase();
  for (const [canonical, aliases] of Object.entries(ALIASES)) {
    if (aliases.includes(lower)) return canonical;
  }
  return lower;
}

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

  // Check required params across all matched stages
  if (v.requireParams) {
    for (const [key, expectedValue] of Object.entries(v.requireParams)) {
      const found = allStages.some((stage) => {
        const val = findParam(stage.params, key);
        return val !== undefined && val === expectedValue;
      });
      if (!found) {
        return {
          passed: false,
          feedback: `Your script should include \`-${key} ${/\s/.test(expectedValue) ? `"${expectedValue}"` : expectedValue}\`.`,
          partial: ["Correct pipeline structure"],
        };
      }
    }
  }

  // Registry-based parameter type validation (opt-in for pipeline)
  if (v.parameterSet !== undefined || v.allowSpeParams !== undefined) {
    for (const stage of allStages) {
      const canonical = resolveAlias(stage.cmdlet);
      const registryError = validateStageParams(stage, canonical, {
        parameterSet: v.parameterSet,
        allowSpeParams: v.allowSpeParams,
      });
      if (registryError) {
        return {
          passed: false,
          feedback: registryError,
          partial: ["Correct pipeline structure"],
        };
      }
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

function validateOutput(v: OutputValidation, input: string): ValidationResult {
  const result = executeScript(input);
  if (v.outputContains && !result.output.includes(v.outputContains)) {
    return {
      passed: false,
      feedback:
        "Your script runs, but the output doesn't match what's expected. Check your code.",
      partial: ["Script executed"],
    };
  }
  if (v.outputNotContains && result.output.includes(v.outputNotContains)) {
    return {
      passed: false,
      feedback:
        "Your output contains something unexpected. Check your code.",
      partial: ["Script executed"],
    };
  }
  return { passed: true };
}

function validateSideEffect(
  v: SideEffectValidation,
  allStages: ReturnType<typeof parseCommand>["parsed"],
  input: string
): ValidationResult {
  // 1. Check required stages (like pipeline validation)
  if (v.stages) {
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
            .map((s) => `\u2713 ${formatCmdletName(s)}`),
        };
      }
    }
  }

  // 2. Execute the script (mutates the shared VIRTUAL_TREE)
  const result = executeScript(input);
  if (result.error) {
    return {
      passed: false,
      feedback: `Script error: ${result.error}`,
      partial: v.stages ? ["Correct pipeline structure"] : [],
    };
  }

  // 3. Check output constraint
  if (v.outputContains && !result.output.includes(v.outputContains)) {
    return {
      passed: false,
      feedback:
        "Your script runs, but the output doesn't match what's expected.",
      partial: ["Script executed"],
    };
  }

  // 4. Check that required paths exist
  if (v.requirePaths) {
    for (const path of v.requirePaths) {
      const resolved = resolvePath(path);
      if (!resolved) {
        return {
          passed: false,
          feedback: `Expected item at \`${path}\` was not found. Make sure your script creates it.`,
          partial: ["Script executed"],
        };
      }
    }
  }

  // 5. Check that forbidden paths don't exist
  if (v.forbidPaths) {
    for (const path of v.forbidPaths) {
      const resolved = resolvePath(path);
      if (resolved) {
        return {
          passed: false,
          feedback: `Item at \`${path}\` should not exist after your script runs.`,
          partial: ["Script executed"],
        };
      }
    }
  }

  // 6. Check field values at specific paths
  if (v.requireFields) {
    for (const { path, field, value } of v.requireFields) {
      const resolved = resolvePath(path);
      if (!resolved) {
        return {
          passed: false,
          feedback: `Expected item at \`${path}\` was not found. Make sure your script creates it.`,
          partial: ["Script executed"],
        };
      }
      const item = { name: resolved.name, node: resolved.node, path: resolved.path };
      const actual = getItemProperty(item, field);
      if (actual !== value) {
        return {
          passed: false,
          feedback: `Field \`${field}\` at \`${path}\` has value "${actual}" but expected "${value}".`,
          partial: ["Script executed", "Item exists"],
        };
      }
    }
  }

  return { passed: true };
}

/** Case-insensitive parameter lookup on parsed params */
function findParam(
  params: Record<string, string> & { _positional?: string[] },
  key: string
): string | undefined {
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(params)) {
    if (k === "_positional") continue;
    if (k.toLowerCase() === lower) return v as string;
  }
  return undefined;
}

function formatCmdletName(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("-");
}
