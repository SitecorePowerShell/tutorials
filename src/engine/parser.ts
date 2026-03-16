import type { ParsedCommand, ParsedStage } from "../types";

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();

  // Check for unclosed strings
  let quoteCount = 0;
  let qChar = "";
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (!quoteCount && (ch === '"' || ch === "'")) {
      quoteCount = 1;
      qChar = ch;
    } else if (quoteCount && ch === qChar) {
      quoteCount = 0;
    }
  }
  if (quoteCount) {
    throw new Error(`The string is missing the terminator: ${qChar}.`);
  }

  // Split on pipe, respecting quoted strings AND braces
  const rawStages: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";
  let braceDepth = 0;
  let pipeCount = 0;
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
      pipeCount++;
      if (!current.trim()) {
        throw new Error("An empty pipe element is not allowed.");
      }
      rawStages.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  // Trailing empty pipe element: "Get-Item |"
  if (pipeCount > 0 && !current.trim()) {
    throw new Error("An empty pipe element is not allowed.");
  }
  if (current.trim()) rawStages.push(current.trim());
  return { raw: rawStages, parsed: rawStages.map(parseSingleCommand) };
}

export function parseSingleCommand(cmdStr: string): ParsedStage {
  const tokens: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";
  let braceDepth = 0;
  for (let i = 0; i < cmdStr.length; i++) {
    const ch = cmdStr[i];
    if (inQuote) {
      if (ch === quoteChar) {
        inQuote = false;
        // Preserve closing quote inside @{} blocks
        if (braceDepth > 0) {
          current += ch;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
      // Preserve opening quote inside @{} blocks
      if (braceDepth > 0) {
        current += ch;
      }
    } else if (ch === "{") {
      braceDepth++;
      current += ch;
    } else if (ch === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      current += ch;
    } else if ((ch === " " || ch === "\t") && braceDepth === 0) {
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
  let accumulatingComma = false;

  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith("-") && !accumulatingComma) {
      if (currentParam) switches.push(currentParam);
      currentParam = t.substring(1);
    } else {
      if (currentParam) {
        if (accumulatingComma) {
          // Continue appending comma-separated values
          params[currentParam] += " " + t;
        } else {
          params[currentParam] = t;
        }
        // If value ends with comma, more values follow
        if (t.endsWith(",")) {
          accumulatingComma = true;
        } else {
          accumulatingComma = false;
          currentParam = null;
        }
      } else {
        // Positional param — accumulate comma-separated values
        if (!params._positional) params._positional = [];
        if (accumulatingComma && params._positional.length > 0) {
          params._positional[params._positional.length - 1] += " " + t;
        } else {
          params._positional.push(t);
        }
        if (t.endsWith(",")) {
          accumulatingComma = true;
        } else {
          accumulatingComma = false;
        }
      }
    }
  }
  if (currentParam) switches.push(currentParam);

  return { cmdlet, params, switches };
}
