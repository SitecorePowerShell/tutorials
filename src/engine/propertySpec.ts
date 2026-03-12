import type { SitecoreItem, PropertySpec, PlainProperty, CalculatedProperty } from "../types";
import { getItemProperty } from "./properties";
import { evaluateExpression, splitCommaArgs } from "./expressionEval";
import type { ScriptContext } from "./scriptContext";

/**
 * Parse a property list string that may contain plain names and calculated properties.
 * Examples:
 *   "Name, TemplateName"
 *   'Name, @{Label="Type";Expression={$_.TemplateName}}'
 */
export function parsePropertyList(raw: string): PropertySpec[] {
  const parts = splitCommaArgs(raw);
  return parts.map((part) => {
    const trimmed = part.trim();
    if (trimmed.startsWith("@{") && trimmed.endsWith("}")) {
      return parseCalculatedProperty(trimmed);
    }
    return { type: "plain", name: trimmed } as PlainProperty;
  });
}

function parseCalculatedProperty(raw: string): CalculatedProperty {
  // Strip @{ and trailing }
  const inner = raw.slice(2, -1).trim();

  let label = "";
  let expression = "";

  // Split on semicolons at the top level (respecting nested braces/quotes)
  const pairs = splitSemicolons(inner);
  for (const pair of pairs) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim().toLowerCase();
    let value = pair.slice(eqIdx + 1).trim();

    if (key === "label" || key === "l" || key === "name" || key === "n") {
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      label = value;
    } else if (key === "expression" || key === "e") {
      // Strip outer {} from script block
      if (value.startsWith("{") && value.endsWith("}")) {
        value = value.slice(1, -1).trim();
      }
      expression = value;
    }
  }

  return { type: "calculated", label: label || "Expression", expression };
}

/** Split on semicolons at the top level, respecting braces and quotes */
function splitSemicolons(str: string): string[] {
  const parts: string[] = [];
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
    } else if (ch === "{" || ch === "(" || ch === "[") {
      depth++;
      current += ch;
    } else if (ch === "}" || ch === ")" || ch === "]") {
      depth--;
      current += ch;
    } else if (ch === ";" && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Get the display label for a property spec */
export function getPropertyLabel(spec: PropertySpec): string {
  if (spec.type === "plain") {
    if (spec.name.toLowerCase() === "id") return "ID";
    return spec.name;
  }
  return spec.label;
}

/** Evaluate a property spec against an item, returning the string value */
export function evaluatePropertySpec(
  spec: PropertySpec,
  item: SitecoreItem,
  ctx: ScriptContext
): string {
  if (spec.type === "plain") {
    return getItemProperty(item, spec.name) || "-";
  }
  try {
    const result = evaluateExpression(spec.expression, ctx, item);
    return result == null ? "-" : String(result);
  } catch {
    return "-";
  }
}
