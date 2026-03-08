import type { ParsedCommand, ParsedStage } from "../types";

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  // Split on pipe, respecting quoted strings AND braces
  const rawStages: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";
  let braceDepth = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inQuote) {
      current += ch;
      if (ch === quoteChar) inQuote = false;
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
      current += ch;
    } else if (ch === "{") {
      braceDepth++;
      current += ch;
    } else if (ch === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      current += ch;
    } else if (ch === "|" && braceDepth === 0) {
      rawStages.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) rawStages.push(current.trim());
  return { raw: rawStages, parsed: rawStages.map(parseSingleCommand) };
}

export function parseSingleCommand(cmdStr: string): ParsedStage {
  const tokens: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";
  for (let i = 0; i < cmdStr.length; i++) {
    const ch = cmdStr[i];
    if (inQuote) {
      if (ch === quoteChar) {
        inQuote = false;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === " " || ch === "\t") {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);

  const cmdlet = tokens[0] || "";
  const params: Record<string, string> & { _positional?: string[] } = {};
  const switches: string[] = [];
  let currentParam: string | null = null;

  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith("-")) {
      if (currentParam) switches.push(currentParam);
      currentParam = t.substring(1);
    } else {
      if (currentParam) {
        params[currentParam] = t;
        currentParam = null;
      } else {
        // Positional param
        if (!params._positional) params._positional = [];
        params._positional.push(t);
      }
    }
  }
  if (currentParam) switches.push(currentParam);

  return { cmdlet, params, switches };
}
