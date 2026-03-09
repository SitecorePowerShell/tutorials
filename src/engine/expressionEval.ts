/**
 * Centralized expression evaluator for PowerShell expressions.
 * Handles: literals, variables, property/indexer access, string operators,
 * .NET type calls/casts, hashtable/array literals, and string interpolation.
 */
import type { SitecoreItem } from "../types";
import { ScriptContext } from "./scriptContext";
import { getItemProperty } from "./properties";
import { callStaticMethod, castType } from "./dotnetTypes";

/**
 * Find a binary operator at the top level of an expression,
 * respecting quotes, parentheses, brackets, and braces.
 */
export function findOperator(
  expr: string,
  op: string
): { left: string; right: string } | null {
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
    if (depth > 0) continue;

    if (op === "+") {
      if (ch === "+" && i > 0 && i < expr.length - 1) {
        return {
          left: expr.slice(0, i).trim(),
          right: expr.slice(i + 1).trim(),
        };
      }
    } else {
      const opLen = op.length;
      if (i + opLen > expr.length) continue;
      const before = i === 0 || /\s/.test(expr[i - 1]);
      const chunk = expr.slice(i, i + opLen);
      const after = i + opLen >= expr.length || /\s/.test(expr[i + opLen]);
      if (before && chunk.toLowerCase() === op.toLowerCase() && after) {
        return {
          left: expr.slice(0, i).trim(),
          right: expr.slice(i + opLen).trim(),
        };
      }
    }
  }
  return null;
}

/**
 * Find the matching closing delimiter for an opening one at `start`.
 */
export function findMatchingDelimiter(
  str: string,
  start: number,
  open: string,
  close: string
): number {
  let depth = 0;
  let inQuote = false;
  let quoteChar = "";
  for (let i = start; i < str.length; i++) {
    const ch = str[i];
    if (inQuote) {
      if (ch === quoteChar) inQuote = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
      continue;
    }
    if (ch === open) depth++;
    if (ch === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Split comma-separated arguments, respecting quotes and nesting.
 */
export function splitCommaArgs(str: string): string[] {
  const args: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";
  let depth = 0;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inQuote) {
      current += ch;
      if (ch === quoteChar) inQuote = false;
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
      current += ch;
    } else if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      current += ch;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      current += ch;
    } else if (ch === "," && depth === 0) {
      args.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

/**
 * Interpolate variables and $() subexpressions in a double-quoted string.
 */
export function interpolateString(
  str: string,
  ctx: ScriptContext,
  currentItem?: SitecoreItem
): string {
  // Handle $() subexpressions
  let result = str.replace(/\$\(([^)]+)\)/g, (_, subExpr) => {
    const val = evaluateExpression(subExpr, ctx, currentItem);
    return String(val ?? "");
  });

  // Handle $_.Property
  result = result.replace(/\$_\.(\w+)/g, (match, prop) => {
    if (currentItem) return getItemProperty(currentItem, prop);
    return match;
  });

  // Handle $var.Property
  result = result.replace(/\$(\w+)\.(\w+)/g, (match, varName, prop) => {
    if (varName === "_") return match;
    const val = ctx.getVar(varName);
    if (val && typeof val === "object" && val !== null && "node" in val) {
      return getItemProperty(val as SitecoreItem, prop);
    }
    if (Array.isArray(val)) {
      const p = prop.toLowerCase();
      if (p === "count" || p === "length") return String(val.length);
    }
    if (val && typeof val === "object" && val !== null) {
      const v = (val as Record<string, unknown>)[prop];
      if (v !== undefined) return String(v);
    }
    return match;
  });

  // Handle $var
  result = result.replace(/\$(\w+)/g, (match, varName) => {
    if (varName === "_") {
      if (currentItem) return currentItem.name;
      return match;
    }
    const val = ctx.getVar(varName);
    if (val === undefined) return match;
    if (typeof val === "string") return val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (Array.isArray(val))
      return val
        .map((v) =>
          typeof v === "object" && v !== null && "name" in v
            ? (v as SitecoreItem).name
            : String(v)
        )
        .join(" ");
    if (typeof val === "object" && val !== null && "name" in val)
      return (val as SitecoreItem).name;
    return String(val);
  });

  return result;
}

/** Check if a string is a balanced quoted string (no unescaped inner quotes) */
function isBalancedQuote(str: string, q: string): boolean {
  if (str.length < 2) return false;
  for (let i = 1; i < str.length - 1; i++) {
    if (str[i] === q) {
      if (str[i - 1] === "`") continue; // backtick-escaped
      if (i + 1 < str.length - 1 && str[i + 1] === q) {
        i++;
        continue;
      } // doubled
      return false;
    }
  }
  return true;
}

/** Parse a hashtable literal body: Key = "Value"; Key2 = "Value2" */
function parseHashtable(
  body: string,
  ctx: ScriptContext,
  currentItem?: SitecoreItem
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const entries = body
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const entry of entries) {
    const eqIndex = entry.indexOf("=");
    if (eqIndex === -1) continue;
    const key = entry.slice(0, eqIndex).trim();
    const valueExpr = entry.slice(eqIndex + 1).trim();
    result[key] = evaluateExpression(valueExpr, ctx, currentItem);
  }
  return result;
}

/** Parse an array literal body: "a", "b", "c" */
function parseArrayLiteral(
  body: string,
  ctx: ScriptContext,
  currentItem?: SitecoreItem
): unknown[] {
  if (!body.trim()) return [];
  const items = splitCommaArgs(body);
  return items.map((item) => evaluateExpression(item.trim(), ctx, currentItem));
}

/** Parse function argument list for .NET calls */
function parseArgList(
  argsStr: string,
  ctx: ScriptContext,
  currentItem?: SitecoreItem
): unknown[] {
  if (!argsStr.trim()) return [];
  const args = splitCommaArgs(argsStr);
  return args.map((a) => evaluateExpression(a.trim(), ctx, currentItem));
}

/**
 * Evaluate a PowerShell expression and return its value.
 */
export function evaluateExpression(
  expr: string,
  ctx: ScriptContext,
  currentItem?: SitecoreItem
): unknown {
  const trimmed = expr.trim();
  if (!trimmed) return "";

  // Boolean/null literals
  const lower = trimmed.toLowerCase();
  if (lower === "$true") return true;
  if (lower === "$false") return false;
  if (lower === "$null") return null;

  // Numeric literal
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return parseFloat(trimmed);

  // Single-quoted string (no interpolation)
  if (
    trimmed.startsWith("'") &&
    trimmed.endsWith("'") &&
    isBalancedQuote(trimmed, "'")
  ) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }

  // Double-quoted string (with interpolation)
  if (
    trimmed.startsWith('"') &&
    trimmed.endsWith('"') &&
    isBalancedQuote(trimmed, '"')
  ) {
    return interpolateString(trimmed.slice(1, -1), ctx, currentItem);
  }

  // Hashtable literal: @{ ... }
  if (trimmed.startsWith("@{")) {
    const closeIdx = findMatchingDelimiter(trimmed, 1, "{", "}");
    if (closeIdx === trimmed.length - 1) {
      return parseHashtable(trimmed.slice(2, -1), ctx, currentItem);
    }
  }

  // Array literal: @( ... )
  if (trimmed.startsWith("@(")) {
    const closeIdx = findMatchingDelimiter(trimmed, 1, "(", ")");
    if (closeIdx === trimmed.length - 1) {
      return parseArrayLiteral(trimmed.slice(2, -1), ctx, currentItem);
    }
  }

  // .NET type cast: [type]expression (but not [type]::)
  const castMatch = trimmed.match(/^\[(\w+(?:\.\w+)*)\](?!::)(.+)$/);
  if (castMatch) {
    const value = evaluateExpression(castMatch[2], ctx, currentItem);
    return castType(castMatch[1], value);
  }

  // .NET static call: [Type]::Method(args) or [Type]::Property
  const staticCallMatch = trimmed.match(
    /^\[(\w+(?:\.\w+)*)\]::(\w+)(?:\(([^)]*)\))?$/
  );
  if (staticCallMatch) {
    const [, typeName, method, argsStr] = staticCallMatch;
    const args =
      argsStr !== undefined
        ? parseArgList(argsStr, ctx, currentItem)
        : [];
    return callStaticMethod(typeName, method, args.map(String));
  }

  // $_ with indexer: $_["field"]
  const uIndexer = trimmed.match(/^\$_\[["']([^"']+)["']\]$/);
  if (uIndexer) {
    if (currentItem) return getItemProperty(currentItem, uIndexer[1]);
    return "";
  }

  // $_ property: $_.Prop
  const uProp = trimmed.match(/^\$_\.(\w+)$/);
  if (uProp) {
    if (currentItem) return getItemProperty(currentItem, uProp[1]);
    return "";
  }

  // $_ alone
  if (trimmed === "$_") return currentItem;

  // $var with indexer: $var["key"]
  const vIndexer = trimmed.match(/^\$(\w+)\[["']([^"']+)["']\]$/);
  if (vIndexer) {
    const val = ctx.getVar(vIndexer[1]);
    if (val && typeof val === "object" && val !== null && "node" in val) {
      return getItemProperty(val as SitecoreItem, vIndexer[2]);
    }
    if (val && typeof val === "object" && !Array.isArray(val) && val !== null) {
      return (val as Record<string, unknown>)[vIndexer[2]] ?? "";
    }
    return "";
  }

  // $var.Property
  const vProp = trimmed.match(/^\$(\w+)\.(\w+)$/);
  if (vProp) {
    const val = ctx.getVar(vProp[1]);
    if (val && typeof val === "object" && val !== null && "node" in val) {
      return getItemProperty(val as SitecoreItem, vProp[2]);
    }
    if (Array.isArray(val)) {
      const p = vProp[2].toLowerCase();
      if (p === "count" || p === "length") return val.length;
    }
    if (val && typeof val === "object" && val !== null) {
      return (val as Record<string, unknown>)[vProp[2]] ?? "";
    }
    return "";
  }

  // Simple $var
  const vRef = trimmed.match(/^\$(\w+)$/);
  if (vRef) {
    const val = ctx.getVar(vRef[1]);
    return val !== undefined ? val : "";
  }

  // -replace operator
  const replaceOp = findOperator(trimmed, "-replace");
  if (replaceOp) {
    const left = evaluateExpression(replaceOp.left, ctx, currentItem);
    const args = splitCommaArgs(replaceOp.right);
    const pattern = String(evaluateExpression(args[0], ctx, currentItem));
    const replacement =
      args.length > 1
        ? String(evaluateExpression(args[1], ctx, currentItem))
        : "";
    return String(left).replace(new RegExp(pattern, "gi"), replacement);
  }

  // -split operator
  const splitOp = findOperator(trimmed, "-split");
  if (splitOp) {
    const left = evaluateExpression(splitOp.left, ctx, currentItem);
    const delim = String(evaluateExpression(splitOp.right, ctx, currentItem));
    return String(left).split(delim);
  }

  // -join operator
  const joinOp = findOperator(trimmed, "-join");
  if (joinOp) {
    const left = evaluateExpression(joinOp.left, ctx, currentItem);
    const sep = String(evaluateExpression(joinOp.right, ctx, currentItem));
    if (Array.isArray(left)) return left.join(sep);
    return String(left);
  }

  // -f (format operator)
  const fmtOp = findOperator(trimmed, "-f");
  if (fmtOp) {
    let fmt = String(evaluateExpression(fmtOp.left, ctx, currentItem));
    const args = splitCommaArgs(fmtOp.right);
    for (let i = 0; i < args.length; i++) {
      const val = evaluateExpression(args[i].trim(), ctx, currentItem);
      fmt = fmt.replace(new RegExp(`\\{${i}\\}`, "g"), String(val));
    }
    return fmt;
  }

  // + (concatenation / addition)
  const plusOp = findOperator(trimmed, "+");
  if (plusOp && plusOp.left && plusOp.right) {
    const left = evaluateExpression(plusOp.left, ctx, currentItem);
    const right = evaluateExpression(plusOp.right, ctx, currentItem);
    if (typeof left === "number" && typeof right === "number")
      return left + right;
    return String(left ?? "") + String(right ?? "");
  }

  // If nothing matched, return the trimmed string as-is
  return trimmed;
}
