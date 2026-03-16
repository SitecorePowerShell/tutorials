/**
 * Boolean filter evaluator for Where-Object conditions and if/else.
 * Handles compound conditions with -and/-or/-not and parenthesized grouping.
 * Uses the expression evaluator for value resolution.
 */
import type { SitecoreItem } from "../types";
import { ScriptContext } from "./scriptContext";
import { evaluateExpression, findOperator } from "./expressionEval";

/**
 * Find the matching closing parenthesis for an opening paren at `start`.
 */
function findMatchingParen(expr: string, start: number): number {
  let depth = 0;
  let inQuote = false;
  let quoteChar = "";
  for (let i = start; i < expr.length; i++) {
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
    if (ch === "(") depth++;
    if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Split an expression on a logical operator (-and/-or) at the top level,
 * respecting quotes, parentheses, and brackets.
 */
function splitOnLogicalOp(expr: string, op: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inQuote = false;
  let quoteChar = "";
  let current = "";
  const opLen = op.length;

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];

    if (inQuote) {
      current += ch;
      if (ch === quoteChar) inQuote = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
      current += ch;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      current += ch;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      current += ch;
      continue;
    }
    if (depth > 0) {
      current += ch;
      continue;
    }

    // Check for operator at this position
    if (i + opLen <= expr.length) {
      const before = i === 0 || /\s/.test(expr[i - 1]);
      const chunk = expr.slice(i, i + opLen);
      const after = i + opLen >= expr.length || /\s/.test(expr[i + opLen]);

      if (before && chunk.toLowerCase() === op.toLowerCase() && after) {
        parts.push(current.trim());
        current = "";
        i += opLen - 1;
        continue;
      }
    }

    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/**
 * Check if a value matches a given PowerShell type name.
 */
function checkType(val: unknown, typeName: string): boolean {
  switch (typeName) {
    case "string":
      return typeof val === "string";
    case "int":
    case "int32":
    case "int64":
      return (
        typeof val === "number" ||
        (typeof val === "string" && /^-?\d+$/.test(val))
      );
    case "array":
    case "object[]":
      return Array.isArray(val);
    case "bool":
    case "boolean":
      return (
        typeof val === "boolean" ||
        val === "true" ||
        val === "false" ||
        val === "True" ||
        val === "False"
      );
    default:
      return false;
  }
}

/**
 * Compare two values using a PowerShell comparison operator.
 */
function compareValues(left: unknown, right: unknown, op: string): boolean {
  const l = String(left ?? "");
  const r = String(right ?? "");

  switch (op.toLowerCase()) {
    case "-eq":
      return l.toLowerCase() === r.toLowerCase();
    case "-ne":
      return l.toLowerCase() !== r.toLowerCase();
    case "-like": {
      const pattern =
        "^" +
        r
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, ".*")
          .replace(/\?/g, ".") +
        "$";
      return new RegExp(pattern, "i").test(l);
    }
    case "-notlike": {
      const pattern =
        "^" +
        r
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, ".*")
          .replace(/\?/g, ".") +
        "$";
      return !new RegExp(pattern, "i").test(l);
    }
    case "-match":
      return new RegExp(r, "i").test(l);
    case "-notmatch":
      return !new RegExp(r, "i").test(l);
    case "-gt": {
      const ln = parseFloat(l);
      const rn = parseFloat(r);
      if (!isNaN(ln) && !isNaN(rn)) return ln > rn;
      return l.localeCompare(r) > 0;
    }
    case "-lt": {
      const ln = parseFloat(l);
      const rn = parseFloat(r);
      if (!isNaN(ln) && !isNaN(rn)) return ln < rn;
      return l.localeCompare(r) < 0;
    }
    case "-ge": {
      const ln = parseFloat(l);
      const rn = parseFloat(r);
      if (!isNaN(ln) && !isNaN(rn)) return ln >= rn;
      return l.localeCompare(r) >= 0;
    }
    case "-le": {
      const ln = parseFloat(l);
      const rn = parseFloat(r);
      if (!isNaN(ln) && !isNaN(rn)) return ln <= rn;
      return l.localeCompare(r) <= 0;
    }
    default:
      return false;
  }
}

/** Check if a value is truthy in PowerShell semantics */
function isTruthy(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  if (typeof val === "string")
    return val !== "" && val.toLowerCase() !== "false";
  if (Array.isArray(val)) return val.length > 0;
  return true;
}

/**
 * Evaluate a boolean filter expression (for Where-Object and if conditions).
 */
export function evaluateFilter(
  expr: string,
  ctx: ScriptContext,
  currentItem?: SitecoreItem
): boolean {
  const trimmed = expr.trim();
  if (!trimmed) return false;

  // Handle -not / ! prefix
  if (/^-not\s+/i.test(trimmed)) {
    return !evaluateFilter(
      trimmed.replace(/^-not\s+/i, ""),
      ctx,
      currentItem
    );
  }
  if (trimmed.startsWith("!")) {
    return !evaluateFilter(trimmed.slice(1).trim(), ctx, currentItem);
  }

  // Handle parenthesized group at outermost level
  if (trimmed.startsWith("(")) {
    const closeIdx = findMatchingParen(trimmed, 0);
    if (closeIdx === trimmed.length - 1) {
      return evaluateFilter(trimmed.slice(1, -1), ctx, currentItem);
    }
  }

  // Split on -or (lowest precedence)
  const orParts = splitOnLogicalOp(trimmed, "-or");
  if (orParts.length > 1) {
    return orParts.some((part) => evaluateFilter(part, ctx, currentItem));
  }

  // Split on -and
  const andParts = splitOnLogicalOp(trimmed, "-and");
  if (andParts.length > 1) {
    return andParts.every((part) => evaluateFilter(part, ctx, currentItem));
  }

  // Special handling for collection/type operators that need raw values
  const containsOp = findOperator(trimmed, "-contains");
  if (containsOp) {
    const leftVal = evaluateExpression(containsOp.left, ctx, currentItem);
    const rightVal = evaluateExpression(containsOp.right, ctx, currentItem);
    if (Array.isArray(leftVal)) {
      return leftVal.some((item) => {
        const itemStr =
          typeof item === "object" && item !== null && "name" in item
            ? (item as any).name
            : String(item);
        return itemStr.toLowerCase() === String(rightVal).toLowerCase();
      });
    }
    return String(leftVal).toLowerCase() === String(rightVal).toLowerCase();
  }

  const notcontainsOp = findOperator(trimmed, "-notcontains");
  if (notcontainsOp) {
    const leftVal = evaluateExpression(notcontainsOp.left, ctx, currentItem);
    const rightVal = evaluateExpression(notcontainsOp.right, ctx, currentItem);
    if (Array.isArray(leftVal)) {
      return !leftVal.some((item) => {
        const itemStr =
          typeof item === "object" && item !== null && "name" in item
            ? (item as any).name
            : String(item);
        return itemStr.toLowerCase() === String(rightVal).toLowerCase();
      });
    }
    return String(leftVal).toLowerCase() !== String(rightVal).toLowerCase();
  }

  const inOp = findOperator(trimmed, "-in");
  if (inOp) {
    const leftVal = evaluateExpression(inOp.left, ctx, currentItem);
    const rightVal = evaluateExpression(inOp.right, ctx, currentItem);
    if (Array.isArray(rightVal)) {
      return rightVal.some((item) => {
        const itemStr =
          typeof item === "object" && item !== null && "name" in item
            ? (item as any).name
            : String(item);
        return itemStr.toLowerCase() === String(leftVal).toLowerCase();
      });
    }
    return String(leftVal).toLowerCase() === String(rightVal).toLowerCase();
  }

  const notinOp = findOperator(trimmed, "-notin");
  if (notinOp) {
    const leftVal = evaluateExpression(notinOp.left, ctx, currentItem);
    const rightVal = evaluateExpression(notinOp.right, ctx, currentItem);
    if (Array.isArray(rightVal)) {
      return !rightVal.some((item) => {
        const itemStr =
          typeof item === "object" && item !== null && "name" in item
            ? (item as any).name
            : String(item);
        return itemStr.toLowerCase() === String(leftVal).toLowerCase();
      });
    }
    return String(leftVal).toLowerCase() !== String(rightVal).toLowerCase();
  }

  const isOp = findOperator(trimmed, "-is");
  if (isOp) {
    const leftVal = evaluateExpression(isOp.left, ctx, currentItem);
    const rightType = isOp.right.replace(/[\[\]]/g, "").trim().toLowerCase();
    return checkType(leftVal, rightType);
  }

  const isnotOp = findOperator(trimmed, "-isnot");
  if (isnotOp) {
    const leftVal = evaluateExpression(isnotOp.left, ctx, currentItem);
    const rightType = isnotOp.right
      .replace(/[\[\]]/g, "")
      .trim()
      .toLowerCase();
    return !checkType(leftVal, rightType);
  }

  // Atomic condition: try comparison operators
  const compOps = [
    "-eq",
    "-ne",
    "-like",
    "-notlike",
    "-match",
    "-notmatch",
    "-gt",
    "-lt",
    "-ge",
    "-le",
  ];
  for (const op of compOps) {
    const match = findOperator(trimmed, op);
    if (match) {
      const leftVal = evaluateExpression(match.left, ctx, currentItem);
      const rightVal = evaluateExpression(match.right, ctx, currentItem);
      return compareValues(leftVal, rightVal, op);
    }
  }

  // No operator found — evaluate as truthy/falsy
  const val = evaluateExpression(trimmed, ctx, currentItem);
  return isTruthy(val);
}
