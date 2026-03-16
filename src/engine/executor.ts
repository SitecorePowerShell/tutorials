import type {
  SitecoreNode,
  SitecoreItem,
  SitecoreItemArray,
  ExecutionResult,
  ScriptResult,
  PropertySpec,
} from "../types";
import { VIRTUAL_TREE } from "./virtualTree";
import {
  resolvePath,
  getChildren,
  getAllDescendants,
} from "./pathResolver";
import { parseCommand } from "./parser";
import { getAllPropertyNames, getItemProperty } from "./properties";
import { formatItemTable, formatPropertyList, formatPropertyTable } from "./formatter";
import { ScriptContext } from "./scriptContext";
import { evaluateExpression } from "./expressionEval";
import { evaluateFilter } from "./filterEval";
import { findMatchingDelimiter } from "./expressionEval";
import { parsePropertyList } from "./propertySpec";
import {
  buildSearchIndex,
  executeSearch,
  entriesToItems,
  parseCriteriaHashtables,
} from "./searchIndex";
import { getCmdletHelp, formatHelpText, formatCmdletList } from "./cmdletHelp";

/** Expand a wildcard `*` in a -Property list to all properties of the first item */
function expandPropertyWildcard(specs: PropertySpec[], pipelineData: SitecoreItem[]): PropertySpec[] {
  if (specs.length === 1 && specs[0].type === "plain" && specs[0].name === "*" && pipelineData.length > 0) {
    return getAllPropertyNames(pipelineData[0]).map((n) => ({ type: "plain", name: n }));
  }
  return specs;
}

/** Canonical alias → cmdlet map (lowercase keys, lowercase cmdlet values) */
const ALIAS_MAP: Record<string, string> = {
  // Existing aliases
  foreach: "foreach-object", "%": "foreach-object",
  where: "where-object", "?": "where-object",
  select: "select-object", sort: "sort-object",
  group: "group-object", measure: "measure-object",
  gm: "get-member", pwd: "get-location", gl: "get-location",
  ft: "format-table",
  // New aliases
  gci: "get-childitem", ls: "get-childitem", dir: "get-childitem",
  gi: "get-item",
  echo: "write-output", write: "write-output",
  ni: "new-item",
  ri: "remove-item", rm: "remove-item", del: "remove-item",
  mi: "move-item", mv: "move-item", move: "move-item",
  ci: "copy-item", cp: "copy-item", copy: "copy-item",
  rni: "rename-item", ren: "rename-item",
  sp: "set-itemproperty",
  gal: "get-alias",
  cd: "set-location", sl: "set-location", chdir: "set-location",
  fi: "find-item",
  pi: "publish-item",
  help: "get-help",
};

/** Cmdlet-like tokens that should be executed as commands, not expressions */
const CMDLET_ALIASES = new Set(Object.keys(ALIAS_MAP));

/** Check if a string looks like a command (vs an expression) */
function looksLikeCommand(expr: string): boolean {
  const trimmed = expr.trim();
  // Pipeline → command
  if (hasTopLevelPipe(trimmed)) return true;
  const firstToken = trimmed.split(/\s/)[0];
  // Cmdlet naming convention (contains dash)
  if (firstToken.includes("-")) return true;
  // Known aliases
  if (CMDLET_ALIASES.has(firstToken.toLowerCase())) return true;
  return false;
}

/** Check if expression contains a pipe at the top level (not inside quotes/braces) */
function hasTopLevelPipe(expr: string): boolean {
  let depth = 0;
  let inQuote = false;
  let quoteChar = "";
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (inQuote) {
      if (ch === quoteChar) inQuote = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      continue;
    }
    if (ch === "|" && depth === 0) return true;
  }
  return false;
}

// ============================================================================
// Multi-line script executor
// ============================================================================

export function executeScript(script: string, sharedCtx?: ScriptContext): ScriptResult {
  const ctx = sharedCtx ?? new ScriptContext();
  const lines = script.split("\n");

  // Pre-process: join continuation lines (ending with |, `, or opening {)
  const joined: string[] = [];
  let buffer = "";
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      if (buffer) {
        joined.push(buffer);
        buffer = "";
      }
      continue;
    }
    if (buffer) {
      buffer += " " + trimmed;
    } else {
      buffer = trimmed;
    }
    // Continue accumulating if line ends with |, backtick, or comma
    // (comma = more array elements on next line, e.g. multi-criteria hashtables)
    if (trimmed.endsWith("|") || trimmed.endsWith("`") || trimmed.endsWith(",")) {
      buffer = buffer.replace(/[`]$/, "");
      continue;
    }
    // Check for balanced braces
    const openBraces = (buffer.match(/\{/g) || []).length;
    const closeBraces = (buffer.match(/\}/g) || []).length;
    if (openBraces > closeBraces) continue;

    joined.push(buffer);
    buffer = "";
  }
  if (buffer) joined.push(buffer);

  for (const line of joined) {
    executeLine(line, ctx);
  }

  return {
    output: ctx.outputs.join("\n\n"),
    error: ctx.errors.length > 0 ? ctx.errors.join("\n") : null,
    dialogRequests: ctx.dialogRequests,
  };
}

export function executeLine(line: string, ctx: ScriptContext): void {
  const trimmed = line.trim();

  // Variable assignment: $varName = <expression>
  const assignMatch = trimmed.match(/^\$(\w+)\s*=\s*(.+)$/);
  if (assignMatch) {
    const [, varName, expr] = assignMatch;

    if (looksLikeCommand(expr)) {
      // Execute as pipeline command
      const result = executeCommandWithContext(expr, ctx);
      if (result.error) {
        ctx.errors.push(result.error);
      } else if (result.pipelineData) {
        // Unwrap single-element arrays (PowerShell auto-unwrap behavior)
        if (Array.isArray(result.pipelineData) && result.pipelineData.length === 1) {
          ctx.setVar(varName, result.pipelineData[0]);
        } else {
          ctx.setVar(varName, result.pipelineData);
        }
      } else if (result.output) {
        ctx.setVar(varName, result.output);
      }
    } else {
      // Evaluate as expression
      const value = evaluateExpression(expr, ctx);
      ctx.setVar(varName, value);
    }
    return;
  }

  // if/else conditional
  if (/^if\s*\(/i.test(trimmed)) {
    const condStart = trimmed.indexOf("(");
    const condEnd = findMatchingDelimiter(trimmed, condStart, "(", ")");
    if (condStart === -1 || condEnd === -1) return;

    const condition = trimmed.slice(condStart + 1, condEnd);

    // Find the if body
    const ifBodyStart = trimmed.indexOf("{", condEnd);
    const ifBodyEnd = findMatchingDelimiter(trimmed, ifBodyStart, "{", "}");
    if (ifBodyStart === -1 || ifBodyEnd === -1) return;

    const ifBody = trimmed.slice(ifBodyStart + 1, ifBodyEnd);

    // Check for else
    let elseBody: string | null = null;
    const afterIf = trimmed.slice(ifBodyEnd + 1).trim();
    if (/^else\s*\{/i.test(afterIf)) {
      const elseStart = afterIf.indexOf("{");
      const elseEnd = findMatchingDelimiter(afterIf, elseStart, "{", "}");
      if (elseStart !== -1 && elseEnd !== -1) {
        elseBody = afterIf.slice(elseStart + 1, elseEnd);
      }
    }

    // Evaluate condition and execute appropriate body
    const condResult = evaluateFilter(condition, ctx);
    const body = condResult ? ifBody : elseBody;
    if (body) {
      const bodyLines = body
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const bl of bodyLines) {
        executeLine(bl, ctx);
      }
    }
    return;
  }

  // Foreach loop: foreach($var in $collection) { ... }
  const foreachMatch = trimmed.match(
    /^foreach\s*\(\s*\$(\w+)\s+in\s+\$(\w+)\s*\)\s*\{(.+)\}$/i
  );
  if (foreachMatch) {
    const [, iterVar, collectionVar, body] = foreachMatch;
    const collection = ctx.getVar(collectionVar);
    if (Array.isArray(collection)) {
      for (const item of collection) {
        ctx.setVar(iterVar, item);
        const bodyLines = body
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean);
        for (const bl of bodyLines) {
          executeLine(bl, ctx);
        }
      }
    }
    return;
  }

  // try/catch block
  if (/^try\s*\{/i.test(trimmed)) {
    const tryStart = trimmed.indexOf("{");
    const tryEnd = findMatchingDelimiter(trimmed, tryStart, "{", "}");
    if (tryStart === -1 || tryEnd === -1) return;

    const tryBody = trimmed.slice(tryStart + 1, tryEnd);

    // Find catch block
    const afterTry = trimmed.slice(tryEnd + 1).trim();
    if (/^catch\s*\{/i.test(afterTry)) {
      const catchStart = afterTry.indexOf("{");
      const catchEnd = findMatchingDelimiter(afterTry, catchStart, "{", "}");
      if (catchStart !== -1 && catchEnd !== -1) {
        const catchBody = afterTry.slice(catchStart + 1, catchEnd);

        // Execute try body, catch errors
        const errorsBefore = ctx.errors.length;
        const bodyLines = tryBody.split(";").map(s => s.trim()).filter(Boolean);
        for (const bl of bodyLines) {
          executeLine(bl, ctx);
          if (ctx.errors.length > errorsBefore) {
            // Set $_ to the error message in catch context
            const errorMsg = ctx.errors.pop()!;
            ctx.setVar("_", errorMsg);
            const catchLines = catchBody.split(";").map(s => s.trim()).filter(Boolean);
            for (const cl of catchLines) {
              executeLine(cl, ctx);
            }
            break;
          }
        }
        return;
      }
    }

    // No catch block, just execute try body
    const bodyLines = tryBody.split(";").map(s => s.trim()).filter(Boolean);
    for (const bl of bodyLines) {
      executeLine(bl, ctx);
    }
    return;
  }

  // Regular command execution
  const result = executeCommandWithContext(trimmed, ctx);
  if (result.error) ctx.errors.push(result.error);
  if (result.output) ctx.outputs.push(result.output);
}

// ============================================================================
// Core command execution with variable context
// ============================================================================

export function executeCommandWithContext(
  input: string,
  ctx: ScriptContext,
  tree: { sitecore: SitecoreNode } = VIRTUAL_TREE
): ExecutionResult {
  let expanded = input;

  // Expand $var["key"] indexer access patterns
  expanded = expanded.replace(
    /\$(\w+)\[["']([^"']+)["']\]/g,
    (match, varName, key) => {
      if (varName === "_") return match;
      const val = ctx.getVar(varName);
      if (!val) return match;
      if (typeof val === "object" && val !== null && "node" in val) {
        return getItemProperty(val as SitecoreItem, key);
      }
      if (typeof val === "object" && !Array.isArray(val) && val !== null) {
        return String((val as Record<string, unknown>)[key] ?? match);
      }
      return match;
    }
  );

  // Expand $var.Property access patterns
  expanded = expanded.replace(
    /\$(\w+)\.(\w+)/g,
    (match, varName, prop) => {
      if (varName === "_") return match; // Leave $_ alone for pipeline
      const val = ctx.getVar(varName);
      if (!val) return match;
      // Single item
      if (typeof val === "object" && val !== null && "node" in val) {
        return getItemProperty(val as SitecoreItem, prop);
      }
      // Array — return count for .Count/.Length
      if (Array.isArray(val)) {
        if (
          prop.toLowerCase() === "count" ||
          prop.toLowerCase() === "length"
        )
          return String(val.length);
      }
      return match;
    }
  );

  // Expand $() subexpressions in double-quoted strings, but skip those
  // containing $_ references (they must be resolved later inside pipeline blocks)
  expanded = expanded.replace(/"([^"]*\$\([^)]+\)[^"]*)"/g, (match) => {
    if (/\$_/.test(match)) return match;
    const inner = match.slice(1, -1);
    const interpolated = inner.replace(/\$\(([^)]+)\)/g, (_, subExpr: string) => {
      const trimSub = subExpr.trim();
      // If it looks like a command (contains Verb-Noun or alias), execute as pipeline
      if (looksLikeCommand(trimSub)) {
        const subResult = executeCommandWithContext(subExpr, ctx, tree);
        if (subResult.pipelineData) {
          if (Array.isArray(subResult.pipelineData)) {
            return String(
              (subResult.pipelineData as SitecoreItem[]).length
            );
          }
          return String(subResult.pipelineData);
        }
        return subResult.output || "";
      }
      // Otherwise evaluate as expression (variable access, literals, operators)
      const val = evaluateExpression(trimSub, ctx);
      return val !== undefined && val !== null ? String(val) : "";
    });
    return `"${interpolated}"`;
  });

  // Expand simple $var references in quoted strings
  expanded = expanded.replace(/"([^"]*\$\w+[^"]*)"/g, (match) => {
    return (
      '"' +
      match.slice(1, -1).replace(/\$(\w+)/g, (m, varName) => {
        if (varName === "_") return m;
        const val = ctx.getVar(varName);
        if (val === undefined) return m;
        if (typeof val === "string") return val;
        if (Array.isArray(val)) return `[Array: ${val.length} items]`;
        if (typeof val === "object" && val !== null && "name" in val)
          return (val as SitecoreItem).name;
        return String(val);
      }) +
      '"'
    );
  });

  // Expand bare $var references in command arguments (string/number only)
  expanded = expanded.replace(/\$(\w+)(?![.\[\w])/g, (match, varName) => {
    if (varName === "_") return match;
    const val = ctx.getVar(varName);
    if (val === undefined) return match;
    if (typeof val === "string") return val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    return match; // Don't expand arrays/objects (handled by pipeline)
  });

  // Check if the input is just a variable reference (to pipe variable contents)
  const bareVarMatch = expanded.trim().match(/^\$(\w+)$/);
  if (bareVarMatch) {
    const val = ctx.getVar(bareVarMatch[1]);
    if (val !== undefined) {
      if (Array.isArray(val)) {
        return {
          output: formatItemTable(val as SitecoreItem[]),
          error: null,
          pipelineData: val as SitecoreItem[],
        };
      }
      return { output: String(val), error: null, pipelineData: val as string };
    }
  }

  // Parse and execute the pipeline
  const { raw: rawStages, parsed: stages } = parseCommand(expanded);
  if (stages.length === 0) return { output: "", error: null };

  let pipelineData: SitecoreItemArray | SitecoreItem[] | null = null;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const cmdLower = ALIAS_MAP[stage.cmdlet.toLowerCase()] ?? stage.cmdlet.toLowerCase();

    // Check if the first stage is a variable reference
    if (i === 0 && stage.cmdlet.startsWith("$")) {
      const varVal = ctx.getVar(stage.cmdlet.substring(1));
      if (Array.isArray(varVal)) {
        pipelineData = varVal as SitecoreItem[];
        continue;
      } else if (
        varVal &&
        typeof varVal === "object" &&
        "node" in (varVal as object)
      ) {
        pipelineData = [varVal as SitecoreItem];
        continue;
      }
    }

    try {
      if (cmdLower === "get-item") {
        const path =
          stage.params.Path ||
          stage.params.path ||
          (stage.params._positional && stage.params._positional[0]) ||
          ".";
        const resolved = resolvePath(path, tree, ctx.cwd);
        if (!resolved)
          return {
            output: "",
            error: `Get-Item : Cannot find path '${path}' because it does not exist.`,
          };
        pipelineData = [
          { name: resolved.name, node: resolved.node, path: resolved.path },
        ];
      } else if (cmdLower === "get-childitem") {
        const path =
          stage.params.Path ||
          stage.params.path ||
          (stage.params._positional && stage.params._positional[0]);

        let items: SitecoreItem[] = [];
        const recurse = stage.switches.some(
          (s) => s.toLowerCase() === "recurse"
        );

        if (pipelineData) {
          for (const item of pipelineData) {
            if (recurse) {
              items.push(
                ...getAllDescendants(item.node, item.path || item.name)
              );
            } else {
              items.push(
                ...getChildren(item.node).map((c) => ({
                  ...c,
                  path: (item.path || item.name) + "/" + c.name,
                }))
              );
            }
          }
        } else {
          const resolved = resolvePath(path || ".", tree, ctx.cwd);
          if (!resolved)
            return {
              output: "",
              error: `Get-ChildItem : Cannot find path '${path}'`,
            };
          if (recurse) {
            items = getAllDescendants(resolved.node, resolved.path);
          } else {
            items = getChildren(resolved.node).map((c) => ({
              ...c,
              path: resolved.path + "/" + c.name,
            }));
          }
        }
        pipelineData = items;
      } else if (cmdLower === "where-object") {
        if (!pipelineData)
          return { output: "", error: "Where-Object : No pipeline input." };

        const rawCmd = rawStages[i] || "";
        const braceStart = rawCmd.indexOf("{");
        const braceEnd = rawCmd.lastIndexOf("}");
        let filterExpr = "";

        if (braceStart !== -1 && braceEnd > braceStart) {
          filterExpr = rawCmd.substring(braceStart + 1, braceEnd).trim();
        } else {
          const allTokens = [
            ...(stage.params._positional || []),
            ...Object.values(stage.params).filter(
              (v) => typeof v === "string"
            ),
            ...stage.switches,
          ]
            .join(" ")
            .replace(/[{}]/g, "")
            .trim();
          filterExpr = allTokens;
        }

        if (!filterExpr) {
          return {
            output: "",
            error: "Where-Object : Missing filter expression.",
          };
        }

        // Use the new filter evaluator for compound condition support
        pipelineData = pipelineData.filter((item) => {
          return evaluateFilter(filterExpr, ctx, item);
        });
      } else if (cmdLower === "foreach-object") {
        if (!pipelineData)
          return { output: "", error: "ForEach-Object : No pipeline input." };

        const rawCmd = rawStages[i] || "";
        const braceStart = rawCmd.indexOf("{");
        const braceEnd = rawCmd.lastIndexOf("}");

        if (braceStart !== -1 && braceEnd > braceStart) {
          const body = rawCmd.substring(braceStart + 1, braceEnd).trim();
          const results: string[] = [];

          for (const item of pipelineData) {
            ctx.setVar("_", item);

            // Split body on semicolons for multiple statements
            const bodyStatements = body
              .split(";")
              .map((s) => s.trim())
              .filter(Boolean);

            for (const stmt of bodyStatements) {
              const firstToken = stmt.split(/\s/)[0];
              const isCmd =
                firstToken.includes("-") ||
                CMDLET_ALIASES.has(firstToken.toLowerCase());

              if (isCmd) {
                // Pre-expand $_.Prop for command context
                let expandedBody = stmt.replace(/\$_\.(\w+)/g, (_, prop) => {
                  return getItemProperty(item, prop);
                });

                if (expandedBody.toLowerCase().startsWith("write-host")) {
                  const msg = expandedBody
                    .replace(/^write-host\s*/i, "")
                    .replace(/^["']|["']$/g, "");
                  results.push(msg);
                } else {
                  const innerResult = executeCommandWithContext(
                    expandedBody,
                    ctx,
                    tree
                  );
                  if (innerResult.output) results.push(innerResult.output);
                  if (innerResult.error) ctx.errors.push(innerResult.error);
                }
              } else {
                // Evaluate as expression (handles strings, operators, $_ access)
                const val = evaluateExpression(stmt, ctx, item);
                if (val !== undefined && val !== null && String(val) !== "") {
                  results.push(String(val));
                }
              }
            }
          }
          if (results.length > 0) {
            return { output: results.join("\n"), error: null };
          }
        }
      } else if (cmdLower === "select-object") {
        if (!pipelineData)
          return { output: "", error: "Select-Object : No pipeline input." };
        const propParam =
          stage.params.Property || stage.params.property ||
          (stage.params._positional && stage.params._positional[0]);
        if (propParam) {
          const specs = expandPropertyWildcard(parsePropertyList(propParam), pipelineData);
          (pipelineData as SitecoreItemArray)._selectedProperties = specs;
        }
        const first = stage.params.First || stage.params.first;
        if (first) pipelineData = pipelineData.slice(0, parseInt(first));
        const last = stage.params.Last || stage.params.last;
        if (last) pipelineData = pipelineData.slice(-parseInt(last));

        const skip = stage.params.Skip || stage.params.skip;
        if (skip) pipelineData = pipelineData.slice(parseInt(skip));

        const unique = stage.switches.some(
          (s) => s.toLowerCase() === "unique"
        );
        if (unique && pipelineData.length > 0) {
          const uniqueProp =
            stage.params.Property ||
            stage.params.property ||
            (stage.params._positional && stage.params._positional[0]);
          const seen = new Set<string>();
          pipelineData = pipelineData.filter((item) => {
            const key = uniqueProp
              ? getItemProperty(item, uniqueProp)
              : item.name;
            if (seen.has(key.toLowerCase())) return false;
            seen.add(key.toLowerCase());
            return true;
          });
        }

        const expandProp =
          stage.params.ExpandProperty || stage.params.expandproperty;
        if (expandProp) {
          const values = pipelineData.map((item) =>
            getItemProperty(item, expandProp)
          );
          return {
            output: values.filter((v) => v).join("\n"),
            error: null,
          };
        }
      } else if (cmdLower === "sort-object") {
        if (!pipelineData)
          return { output: "", error: "Sort-Object : No pipeline input." };
        const sortProp =
          stage.params.Property ||
          stage.params.property ||
          (stage.params._positional && stage.params._positional[0]);
        const desc = stage.switches.some(
          (s) => s.toLowerCase() === "descending"
        );
        if (sortProp) {
          pipelineData.sort((a, b) => {
            const aVal = getItemProperty(a, sortProp);
            const bVal = getItemProperty(b, sortProp);
            const cmp = String(aVal).localeCompare(String(bVal));
            return desc ? -cmp : cmp;
          });
        }
      } else if (cmdLower === "group-object") {
        if (!pipelineData)
          return { output: "", error: "Group-Object : No pipeline input." };
        const groupProp =
          stage.params.Property ||
          stage.params.property ||
          (stage.params._positional && stage.params._positional[0]);
        if (groupProp) {
          const groups: Record<string, SitecoreItem[]> = {};
          for (const item of pipelineData) {
            const key = getItemProperty(item, groupProp) || "(none)";
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
          }
          const headers = ["Count", "Name", "Group"];
          const rows = Object.entries(groups).map(([name, items]) => [
            String(items.length).padStart(5),
            name,
            `{${items
              .slice(0, 3)
              .map((i) => i.name)
              .join(", ")}${items.length > 3 ? "..." : ""}}`,
          ]);
          const colWidths = headers.map((h, idx) =>
            Math.max(h.length, ...rows.map((r) => r[idx].length))
          );
          const sep = colWidths.map((w) => "-".repeat(w)).join(" ");
          const headerLine = headers
            .map((h, idx) => h.padEnd(colWidths[idx]))
            .join(" ");
          const rowLines = rows.map((r) =>
            r.map((c, idx) => c.padEnd(colWidths[idx])).join(" ")
          );
          return {
            output: [headerLine, sep, ...rowLines].join("\n"),
            error: null,
          };
        }
      } else if (cmdLower === "measure-object") {
        if (!pipelineData)
          return { output: "", error: "Measure-Object : No pipeline input." };
        const count = Array.isArray(pipelineData) ? pipelineData.length : 0;

        const propParam =
          stage.params.Property ||
          stage.params.property ||
          (stage.params._positional && stage.params._positional[0]);

        const wantSum = stage.switches.some(
          (s) => s.toLowerCase() === "sum"
        );
        const wantAvg = stage.switches.some(
          (s) => s.toLowerCase() === "average"
        );
        const wantMax = stage.switches.some(
          (s) => s.toLowerCase() === "maximum"
        );
        const wantMin = stage.switches.some(
          (s) => s.toLowerCase() === "minimum"
        );

        let sum: number | undefined;
        let avg: number | undefined;
        let max: number | undefined;
        let min: number | undefined;

        if (
          propParam &&
          Array.isArray(pipelineData) &&
          (wantSum || wantAvg || wantMax || wantMin)
        ) {
          const nums = pipelineData
            .map((item) => parseFloat(getItemProperty(item, propParam)))
            .filter((n) => !isNaN(n));

          if (nums.length > 0) {
            if (wantSum || wantAvg)
              sum = nums.reduce((a, b) => a + b, 0);
            if (wantAvg) avg = sum! / nums.length;
            if (wantMax) max = Math.max(...nums);
            if (wantMin) min = Math.min(...nums);
          }
        }

        const lines = [`\nCount    : ${count}`];
        lines.push(`Average  : ${avg !== undefined ? avg : ""}`);
        lines.push(`Sum      : ${sum !== undefined ? sum : ""}`);
        lines.push(`Maximum  : ${max !== undefined ? max : ""}`);
        lines.push(`Minimum  : ${min !== undefined ? min : ""}`);
        lines.push(`Property : ${propParam || ""}`);

        return { output: lines.join("\n"), error: null };
      } else if (cmdLower === "get-member") {
        if (!pipelineData || pipelineData.length === 0) {
          return { output: "", error: "Get-Member : No input object." };
        }
        const members = [
          "   TypeName: Sitecore.Data.Items.Item",
          "",
          "Name                    MemberType Definition",
          "----                    ---------- ----------",
          "Access                  Property   Sitecore.Data.Items.ItemAccess Access {get;}",
          "Appearance              Property   Sitecore.Data.Items.ItemAppearance Appearance {get;}",
          "Axes                    Property   Sitecore.Data.Items.ItemAxes Axes {get;}",
          "Branch                  Property   Sitecore.Data.Items.BranchItem Branch {get;}",
          "Branches                Property   Sitecore.Data.Items.BranchItem[] Branches {get;}",
          "BranchId                Property   Sitecore.Data.ID BranchId {get; set;}",
          "Children                Property   Sitecore.Collections.ChildList Children {get;}",
          "Created                 Property   System.DateTime Created {get;}",
          "Database                Property   Sitecore.Data.Database Database {get;}",
          "DisplayName             Property   string DisplayName {get; set;}",
          "Editing                 Property   Sitecore.Data.Items.ItemEditing Editing {get;}",
          "Empty                   Property   bool Empty {get;}",
          "Fields                  Property   Sitecore.Data.Fields.FieldCollection Fields {get;}",
          "HasChildren             Property   bool HasChildren {get;}",
          "Help                    Property   Sitecore.Data.Items.ItemHelp Help {get;}",
          "ID                      Property   Sitecore.Data.ID ID {get;}",
          "InnerData               Property   Sitecore.Data.Items.ItemData InnerData {get;}",
          "IsClone                 Property   bool IsClone {get;}",
          "IsFallback              Property   bool IsFallback {get;}",
          "IsItemClone             Property   bool IsItemClone {get;}",
          "Key                     Property   string Key {get;}",
          "Language                Property   Sitecore.Globalization.Language Language {get;}",
          "Languages               Property   Sitecore.Globalization.Language[] Languages {get;}",
          "Links                   Property   Sitecore.Links.ItemLinks Links {get;}",
          "Locking                 Property   Sitecore.Data.Locking.ItemLocking Locking {get;}",
          "Modified                Property   System.DateTime Modified {get;}",
          "Name                    Property   string Name {get; set;}",
          "OriginalLanguage        Property   Sitecore.Globalization.Language OriginalLanguage {get;}",
          "OriginatorId            Property   Sitecore.Data.ID OriginatorId {get; set;}",
          "Parent                  Property   Sitecore.Data.Items.Item Parent {get;}",
          "ParentID                Property   Sitecore.Data.ID ParentID {get;}",
          "Paths                   Property   Sitecore.Data.ItemPath Paths {get;}",
          "Publishing              Property   Sitecore.Data.Items.ItemPublishing Publishing {get;}",
          "Security                Property   Sitecore.Data.Items.ItemSecurity Security {get;}",
          "Source                  Property   object Source {get;}",
          "SourceUri               Property   Sitecore.Data.DataUri SourceUri {get;}",
          "State                   Property   Sitecore.Data.Items.ItemState State {get;}",
          "Statistics              Property   Sitecore.Data.Items.ItemStatistics Statistics {get;}",
          "Template                Property   Sitecore.Data.Items.TemplateItem Template {get;}",
          "TemplateID              Property   Sitecore.Data.ID TemplateID {get; set;}",
          "TemplateName            Property   string TemplateName {get;}",
          "Uri                     Property   Sitecore.Data.DataUri Uri {get;}",
          "Version                 Property   Sitecore.Data.Version Version {get;}",
          "Versions                Property   Sitecore.Data.Items.ItemVersions Versions {get;}",
          "Visualization           Property   Sitecore.Data.Items.ItemVisualization Visualization {get;}",
        ];
        return { output: members.join("\n"), error: null };
      } else if (cmdLower === "set-location") {
        const path =
          stage.params.Path ||
          stage.params.path ||
          (stage.params._positional && stage.params._positional[0]);
        if (!path) {
          return {
            output: "",
            error: "Set-Location : Missing -Path parameter.",
          };
        }
        const resolved = resolvePath(path, tree, ctx.cwd);
        if (!resolved) {
          return {
            output: "",
            error: `Set-Location : Cannot find path '${path}' because it does not exist.`,
          };
        }
        ctx.cwd = resolved.path;
        return { output: "", error: null };
      } else if (cmdLower === "get-location") {
        const cwdDisplay = ctx.cwd.replace(/^\/sitecore\//, "").replace(/\//g, "\\");
        return {
          output:
            `\nPath                \n----                \nmaster:\\${cwdDisplay}\n`,
          error: null,
        };
      } else if (cmdLower === "show-listview") {
        if (!pipelineData || pipelineData.length === 0) {
          return { output: "", error: "Show-ListView : No pipeline input." };
        }
        const propParam =
          stage.params.Property || stage.params.property ||
          (stage.params._positional && stage.params._positional[0]);
        const title =
          stage.params.Title || stage.params.title || "List View";
        let specs: PropertySpec[] | null = null;
        if (propParam) {
          specs = expandPropertyWildcard(parsePropertyList(propParam), pipelineData);
        }
        let output = `\n  ${title}\n  ${"─".repeat(title.length)}\n\n`;
        if (specs) {
          if (specs.length > 4) {
            output += formatPropertyList(pipelineData, specs, ctx);
          } else {
            output += formatPropertyTable(pipelineData, specs, ctx);
          }
        } else {
          output += formatItemTable(pipelineData);
        }
        output += `\n\n  ${pipelineData.length} item(s) displayed.`;
        return { output, error: null };
      } else if (cmdLower === "show-alert") {
        const msg =
          stage.params.Title ||
          stage.params.title ||
          (stage.params._positional && stage.params._positional[0]) ||
          "";
        ctx.dialogRequests.push({ type: "alert", message: msg });
        return { output: `⚠ Alert: ${msg}`, error: null };
      } else if (cmdLower === "read-variable") {
        const title =
          stage.params.Title || stage.params.title || "Input";
        const desc =
          stage.params.Description || stage.params.description || "";
        ctx.dialogRequests.push({
          type: "read-variable",
          title,
          description: desc,
        });
        return {
          output: `📋 Dialog: ${title}${desc ? " — " + desc : ""}\n   (In real SPE, this opens an interactive parameter dialog)`,
          error: null,
        };
      } else if (cmdLower === "close-window") {
        return { output: "", error: null };
      } else if (cmdLower === "write-host" || cmdLower === "write-output") {
        const msg = [
          ...(stage.params._positional || []),
          ...Object.entries(stage.params)
            .filter(
              ([k]) =>
                k !== "_positional" &&
                k !== "ForegroundColor" &&
                k !== "foregroundcolor"
            )
            .map(([, v]) => v),
        ].join(" ");
        return { output: msg || "", error: null };
      } else if (cmdLower === "write-error") {
        const msg = stage.params.Message || stage.params.message ||
          (stage.params._positional && stage.params._positional[0]) || "";
        const cleanMsg = msg.replace(/^["']|["']$/g, "");
        return { output: "", error: `Write-Error : ${cleanMsg}` };
      } else if (cmdLower === "write-warning") {
        const msg = stage.params.Message || stage.params.message ||
          (stage.params._positional && stage.params._positional[0]) || "";
        const cleanMsg = msg.replace(/^["']|["']$/g, "");
        return { output: `WARNING: ${cleanMsg}`, error: null };
      } else if (cmdLower === "new-item") {
        const parentPath =
          stage.params.Path ||
          stage.params.path ||
          (stage.params._positional && stage.params._positional[0]);
        const name = stage.params.Name || stage.params.name;
        const itemType = stage.params.ItemType || stage.params.itemtype;
        if (!parentPath || !name) {
          return {
            output: "",
            error: "New-Item : Missing -Path and/or -Name parameter.",
          };
        }
        const resolved = resolvePath(parentPath, tree, ctx.cwd);
        if (!resolved)
          return {
            output: "",
            error: `New-Item : Cannot find path '${parentPath}'`,
          };
        const newId = `{${crypto.randomUUID ? crypto.randomUUID().toUpperCase() : "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"}}`;
        const templateShort = itemType
          ? itemType.split("/").pop()!
          : "Item";
        const newNode: SitecoreNode = {
          _id: newId,
          _template: templateShort,
          _templateFullName: itemType || "System/Item",
          _version: 1,
          _fields: {
            __Updated: new Date()
              .toISOString()
              .replace(/[-:]/g, "")
              .replace(/\.\d+/, ""),
            __Created: new Date()
              .toISOString()
              .replace(/[-:]/g, "")
              .replace(/\.\d+/, ""),
            "__Updated by": "sitecore\\admin",
          },
          _children: {},
        };
        resolved.node._children[name] = newNode;
        const newItem: SitecoreItem = {
          name,
          node: newNode,
          path: resolved.path + "/" + name,
        };
        pipelineData = [newItem];
      } else if (cmdLower === "remove-item") {
        const targetPath =
          stage.params.Path ||
          stage.params.path ||
          (stage.params._positional && stage.params._positional[0]);
        if (!targetPath && pipelineData) {
          for (const item of pipelineData) {
            removeFromTree(item.path!, tree);
          }
          return { output: "", error: null };
        }
        if (targetPath) {
          const resolved = resolvePath(targetPath, tree, ctx.cwd);
          if (!resolved)
            return {
              output: "",
              error: `Remove-Item : Cannot find path '${targetPath}'`,
            };
          removeFromTree(resolved.path, tree);
        }
        return { output: "", error: null };
      } else if (cmdLower === "move-item") {
        const sourcePath =
          stage.params.Path ||
          stage.params.path ||
          (stage.params._positional && stage.params._positional[0]);
        const destPath =
          stage.params.Destination ||
          stage.params.destination ||
          (stage.params._positional && stage.params._positional[1]);
        if (!sourcePath || !destPath) {
          return {
            output: "",
            error: "Move-Item : Missing -Path and/or -Destination parameter.",
          };
        }
        const sourceResolved = resolvePath(sourcePath, tree, ctx.cwd);
        if (!sourceResolved)
          return {
            output: "",
            error: `Move-Item : Cannot find path '${sourcePath}'`,
          };
        const destResolved = resolvePath(destPath, tree, ctx.cwd);
        if (!destResolved)
          return {
            output: "",
            error: `Move-Item : Cannot find destination '${destPath}'`,
          };
        destResolved.node._children[sourceResolved.name] =
          sourceResolved.node;
        removeFromTree(sourceResolved.path, tree);
        pipelineData = [
          {
            name: sourceResolved.name,
            node: sourceResolved.node,
            path: destResolved.path + "/" + sourceResolved.name,
          },
        ];
      } else if (cmdLower === "copy-item") {
        const sourcePath =
          stage.params.Path ||
          stage.params.path ||
          (stage.params._positional && stage.params._positional[0]);
        const destPath =
          stage.params.Destination ||
          stage.params.destination ||
          (stage.params._positional && stage.params._positional[1]);
        if (!sourcePath || !destPath) {
          return {
            output: "",
            error:
              "Copy-Item : Missing -Path and/or -Destination parameter.",
          };
        }
        const sourceResolved = resolvePath(sourcePath, tree, ctx.cwd);
        if (!sourceResolved)
          return {
            output: "",
            error: `Copy-Item : Cannot find path '${sourcePath}'`,
          };
        const destResolved = resolvePath(destPath, tree, ctx.cwd);
        if (!destResolved)
          return {
            output: "",
            error: `Copy-Item : Cannot find destination '${destPath}'`,
          };
        const cloned: SitecoreNode = JSON.parse(
          JSON.stringify(sourceResolved.node)
        );
        cloned._id = `{${crypto.randomUUID ? crypto.randomUUID().toUpperCase() : "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"}}`;
        destResolved.node._children[sourceResolved.name] = cloned;
        pipelineData = [
          {
            name: sourceResolved.name,
            node: cloned,
            path: destResolved.path + "/" + sourceResolved.name,
          },
        ];
      } else if (cmdLower === "rename-item") {
        const sourcePath =
          stage.params.Path ||
          stage.params.path ||
          (stage.params._positional && stage.params._positional[0]);
        const newName =
          stage.params.NewName ||
          stage.params.newname ||
          (stage.params._positional && stage.params._positional[1]);
        if (!newName) {
          return {
            output: "",
            error: "Rename-Item : Missing -NewName parameter.",
          };
        }
        let targetItem: SitecoreItem | ResolvedPathLike | null = null;
        let targetPath: string | null = null;
        if (pipelineData && pipelineData.length > 0 && !sourcePath) {
          targetItem = pipelineData[0];
          targetPath = targetItem.path!;
        } else if (sourcePath) {
          const resolved = resolvePath(sourcePath, tree, ctx.cwd);
          if (!resolved)
            return {
              output: "",
              error: `Rename-Item : Cannot find path '${sourcePath}'`,
            };
          targetItem = resolved;
          targetPath = resolved.path;
        }
        if (!targetItem || !targetPath) {
          return {
            output: "",
            error: "Rename-Item : Missing -Path parameter.",
          };
        }
        const parts: string[] = targetPath
          .replace(/^\//, "")
          .split("/")
          .filter(Boolean);
        if (parts.length < 2)
          return {
            output: "",
            error: "Rename-Item : Cannot rename root node.",
          };
        const parentParts: string[] = parts.slice(0, -1);
        const oldName: string = parts[parts.length - 1];
        let parent: SitecoreNode | null = null;
        for (const part of parentParts) {
          if (!parent) {
            if (part.toLowerCase() === "sitecore") parent = tree.sitecore;
            else
              return { output: "", error: "Rename-Item : Invalid path." };
          } else {
            const match: string | undefined = Object.keys(parent._children || {}).find(
              (k) => k.toLowerCase() === part.toLowerCase()
            );
            if (match) parent = parent._children[match];
            else
              return {
                output: "",
                error: "Rename-Item : Parent not found.",
              };
          }
        }
        if (parent && parent._children) {
          const matchKey: string | undefined = Object.keys(parent._children).find(
            (k) => k.toLowerCase() === oldName.toLowerCase()
          );
          if (matchKey) {
            const renamedNode: SitecoreNode = parent._children[matchKey];
            delete parent._children[matchKey];
            parent._children[newName] = renamedNode;
            const newPath: string = "/" + parentParts.join("/") + "/" + newName;
            pipelineData = [{ name: newName, node: renamedNode, path: newPath }];
          }
        }
      } else if (cmdLower === "set-itemproperty") {
        const targetPath =
          stage.params.Path ||
          stage.params.path ||
          (stage.params._positional && stage.params._positional[0]);
        const propName = stage.params.Name || stage.params.name;
        const propValue = stage.params.Value || stage.params.value;

        if (!propName) {
          return {
            output: "",
            error: "Set-ItemProperty : Missing -Name parameter.",
          };
        }

        let items: SitecoreItem[] = [];
        if (pipelineData && !targetPath) {
          items = [...pipelineData];
        } else if (targetPath) {
          const resolved = resolvePath(targetPath, tree, ctx.cwd);
          if (!resolved)
            return {
              output: "",
              error: `Set-ItemProperty : Cannot find path '${targetPath}'`,
            };
          items = [
            { name: resolved.name, node: resolved.node, path: resolved.path },
          ];
        }

        for (const item of items) {
          if (!item.node._fields) item.node._fields = {};
          item.node._fields[propName] = propValue || "";
        }

        pipelineData = items;
      } else if (cmdLower === "format-table") {
        if (!pipelineData)
          return { output: "", error: "Format-Table : No pipeline input." };
        const propParam =
          stage.params.Property ||
          stage.params.property ||
          (stage.params._positional && stage.params._positional[0]);
        if (propParam) {
          const specs = expandPropertyWildcard(parsePropertyList(propParam), pipelineData);
          if (specs.length > 4) {
            return { output: formatPropertyList(pipelineData, specs, ctx), error: null };
          }
          return {
            output: formatPropertyTable(pipelineData, specs, ctx),
            error: null,
          };
        }
        return { output: formatItemTable(pipelineData), error: null };
      } else if (cmdLower === "convertto-json") {
        if (!pipelineData)
          return {
            output: "",
            error: "ConvertTo-Json : No pipeline input.",
          };
        const jsonData = pipelineData.map((item) => {
          const obj: Record<string, unknown> = {
            Name: item.name,
            ID: item.node._id,
            TemplateName: item.node._template,
            ItemPath: item.path || "/" + item.name,
            HasChildren:
              Object.keys(item.node._children || {}).length > 0,
          };
          if (item.node._fields) {
            for (const [key, val] of Object.entries(item.node._fields)) {
              obj[key] = val;
            }
          }
          return obj;
        });
        const result = jsonData.length === 1 ? jsonData[0] : jsonData;
        return {
          output: JSON.stringify(result, null, 2),
          error: null,
        };
      } else if (cmdLower === "find-item") {
        // Parse -Index parameter
        const indexName = stage.params.Index || stage.params._positional?.[0] || "sitecore_master_index";
        if (indexName.replace(/['"]/g, "").toLowerCase() !== "sitecore_master_index") {
          return {
            output: "",
            error: `Find-Item : Index '${indexName}' not found. Available indexes: sitecore_master_index`,
          };
        }

        // Parse -Criteria from raw command string
        const rawStage = rawStages[i] || "";
        const criteria = parseCriteriaHashtables(rawStage);
        const hasHashtables = /@\{/.test(rawStage);
        if (criteria.length === 0) {
          if (hasHashtables) {
            return {
              output: "",
              error: "Find-Item : Each criterion requires a Filter type (Equals, Contains, StartsWith, DescendantOf, etc.). Use @{Filter = \"...\"; Field = \"...\"; Value = \"...\"}",
            };
          }
          return {
            output: "",
            error: "Find-Item : The -Criteria parameter is required. Use @{Filter = \"Equals\"; Field = \"_templatename\"; Value = \"...\"}",
          };
        }

        // Parse options
        const options: { orderBy?: string; first?: number; last?: number; skip?: number } = {};
        if (stage.params.OrderBy) {
          options.orderBy = stage.params.OrderBy.replace(/['"]/g, "");
        }
        if (stage.params.First) {
          options.first = parseInt(stage.params.First, 10);
        }
        if (stage.params.Last) {
          options.last = parseInt(stage.params.Last, 10);
        }
        if (stage.params.Skip) {
          options.skip = parseInt(stage.params.Skip, 10);
        }

        // Build index and execute search
        const searchIndex = buildSearchIndex(tree);
        const results = executeSearch(searchIndex, criteria, options, tree);
        pipelineData = entriesToItems(results, tree);

      } else if (cmdLower === "get-help") {
        // Get-Help [Name] [-Examples] [-Full] [-Parameter <name>]
        const targetName = stage.params.Name || stage.params.name ||
          (stage.params._positional && stage.params._positional[0]) || "";

        if (!targetName) {
          return { output: formatCmdletList(), error: null };
        }

        const help = getCmdletHelp(targetName);
        if (!help) {
          return {
            output: "",
            error: `Get-Help : No help found for '${targetName}'. Run Get-Help with no arguments to list available cmdlets.`,
          };
        }

        const hasExamples = stage.switches.some((s) => s.toLowerCase() === "examples");
        const hasFull = stage.switches.some((s) => s.toLowerCase() === "full");
        const paramSwitch = stage.params.Parameter || stage.params.parameter || "";

        let section: "examples" | "full" | "parameter" | undefined;
        if (hasExamples) section = "examples";
        else if (hasFull) section = "full";
        else if (paramSwitch) section = "parameter";

        return { output: formatHelpText(help, section, paramSwitch), error: null };

      } else if (cmdLower === "get-alias") {
        const entries = Object.entries(ALIAS_MAP)
          .map(([alias, cmdlet]) => ({ alias, cmdlet }))
          .sort((a, b) => a.alias.localeCompare(b.alias));
        const nameWidth = Math.max(4, ...entries.map((e) => e.alias.length));
        const header = "Name".padEnd(nameWidth) + " Definition";
        const sep = "-".repeat(nameWidth) + " " + "-".repeat(20);
        const rows = entries.map(
          (e) => e.alias.padEnd(nameWidth) + " " + e.cmdlet
        );
        return { output: [header, sep, ...rows].join("\n"), error: null };

      } else if (cmdLower === "publish-item") {
        // Resolve items from -Item param, -Path param, or pipeline input
        let items: SitecoreItem[] = [];
        const pathParam = stage.params.Path || stage.params.path ||
          (stage.params._positional && stage.params._positional[0]);
        const itemParam = stage.params.Item || stage.params.item;
        if (pipelineData && pipelineData.length > 0) {
          items = pipelineData as SitecoreItem[];
        } else if (pathParam) {
          const resolved = resolvePath(pathParam, tree, ctx.cwd);
          if (!resolved)
            return { output: "", error: `Publish-Item : Cannot find path '${pathParam}' because it does not exist.` };
          items = [{ name: resolved.name, node: resolved.node, path: resolved.path }];
        } else if (itemParam) {
          const resolved = resolvePath(itemParam, tree, ctx.cwd);
          if (!resolved)
            return { output: "", error: `Publish-Item : Cannot find path '${itemParam}' because it does not exist.` };
          items = [{ name: resolved.name, node: resolved.node, path: resolved.path }];
        } else {
          return { output: "", error: "Publish-Item : No item specified. Use -Path, -Item, or pipeline input." };
        }

        const publishMode = stage.params.PublishMode || stage.params.publishmode || "Smart";
        const target = stage.params.Target || stage.params.target || "web";

        if (items.length === 1) {
          return {
            output: `Publish-Item: Published item "${items[0].name}" to target "${target}" (${publishMode} publish)`,
            error: null,
          };
        }
        return {
          output: `Publish-Item: Published ${items.length} items to target "${target}" (${publishMode} publish)`,
          error: null,
        };

      } else if (cmdLower === "initialize-item") {
        if (!pipelineData || pipelineData.length === 0)
          return { output: "", error: "Initialize-Item : No pipeline input." };
        // In simulation, items are already "initialized" — pass through

      } else {
        return {
          output: "",
          error: `${stage.cmdlet} : The term '${stage.cmdlet}' is not recognized. Supported commands: Get-Item, Get-ChildItem, Set-Location, Where-Object, ForEach-Object, Select-Object, Sort-Object, Group-Object, Measure-Object, Get-Member, Get-Alias, Get-Help, Show-ListView, New-Item, Remove-Item, Move-Item, Copy-Item, Rename-Item, Set-ItemProperty, Format-Table, ConvertTo-Json, Write-Host, Write-Error, Write-Warning, Show-Alert, Read-Variable, Find-Item, Publish-Item, Initialize-Item`,
        };
      }
    } catch (err) {
      return {
        output: "",
        error: `Error executing ${stage.cmdlet}: ${(err as Error).message}`,
      };
    }
  }

  // Format output
  if (!pipelineData)
    return { output: "", error: null, pipelineData: null };
  if (typeof pipelineData === "string")
    return { output: pipelineData, error: null, pipelineData };

  const selectedProps = (pipelineData as SitecoreItemArray)
    ._selectedProperties;
  if (selectedProps) {
    const formatter =
      selectedProps.length > 4 ? formatPropertyList : formatPropertyTable;
    return {
      output: formatter(pipelineData, selectedProps, ctx),
      error: null,
      pipelineData,
    };
  }
  return {
    output: formatItemTable(pipelineData),
    error: null,
    pipelineData,
  };
}

// Type alias for the rename-item internal use
type ResolvedPathLike = { name: string; node: SitecoreNode; path: string };

/** Helper to remove a node from the virtual tree by path */
export function removeFromTree(
  pathStr: string,
  tree: { sitecore: SitecoreNode } = VIRTUAL_TREE
): void {
  const parts: string[] = pathStr.replace(/^\//, "").split("/").filter(Boolean);
  if (parts.length < 2) return;
  const parentParts: string[] = parts.slice(0, -1);
  const childName: string = parts[parts.length - 1];
  let current: SitecoreNode | null = null;
  for (const part of parentParts) {
    if (!current) {
      if (part.toLowerCase() === "sitecore") current = tree.sitecore;
      else return;
    } else {
      const found: string | undefined = Object.keys(current._children || {}).find(
        (k) => k.toLowerCase() === part.toLowerCase()
      );
      if (found) current = current._children[found];
      else return;
    }
  }
  if (current && current._children) {
    const childMatch: string | undefined = Object.keys(current._children).find(
      (k) => k.toLowerCase() === childName.toLowerCase()
    );
    if (childMatch) delete current._children[childMatch];
  }
}

/** Backward-compatible wrapper — single command execution without context */
export function executeCommand(input: string, sharedCtx?: ScriptContext): ExecutionResult {
  const ctx = sharedCtx ?? new ScriptContext();
  return executeCommandWithContext(input, ctx);
}
