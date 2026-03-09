export interface OutputStructure {
  columnHeaders: string[];
  rowCount: number;
  hasData: boolean;
  errorPattern: string | null;
}

/**
 * Extracts structural metadata from text-table output (simulator format).
 * Detects header rows by looking for a separator line of dashes.
 */
export function parseTextTable(output: string): OutputStructure {
  const lines = output.split("\n").map((l) => l.trimEnd());

  // Find separator line (all dashes and spaces)
  const sepIndex = lines.findIndex((l) => /^[\s-]+$/.test(l) && l.includes("-"));
  if (sepIndex < 0 || sepIndex === 0) {
    return {
      columnHeaders: [],
      rowCount: 0,
      hasData: false,
      errorPattern: extractErrorPattern(output),
    };
  }

  const headerLine = lines[sepIndex - 1];
  const sepLine = lines[sepIndex];

  // Determine column boundaries from the separator line
  const columnHeaders = extractHeadersFromSep(headerLine, sepLine);

  // Count data rows after separator
  const dataLines = lines
    .slice(sepIndex + 1)
    .filter((l) => l.trim().length > 0);

  return {
    columnHeaders,
    rowCount: dataLines.length,
    hasData: dataLines.length > 0,
    errorPattern: null,
  };
}

/**
 * Extracts structural metadata from JSON response (SPE Remoting format).
 * Handles both array-of-objects and single-object responses.
 */
export function parseJsonOutput(json: unknown): OutputStructure {
  if (json === null || json === undefined) {
    return { columnHeaders: [], rowCount: 0, hasData: false, errorPattern: null };
  }

  const items = Array.isArray(json) ? json : [json];
  if (items.length === 0) {
    return { columnHeaders: [], rowCount: 0, hasData: false, errorPattern: null };
  }

  // Extract property names from first item as "column headers"
  const first = items[0];
  const columnHeaders =
    typeof first === "object" && first !== null
      ? Object.keys(first)
      : [];

  return {
    columnHeaders,
    rowCount: items.length,
    hasData: items.length > 0,
    errorPattern: null,
  };
}

/**
 * Extracts error pattern from output text.
 * Returns a normalized error identifier (cmdlet name + error type).
 */
export function extractErrorPattern(output: string): string | null {
  // Match patterns like "Get-Item : Cannot find path..."
  const match = output.match(/^(\S+)\s*:\s*(.+)/m);
  if (match) {
    const cmdlet = match[1];
    const message = match[2].trim();
    // Normalize: extract just the error type, not the specific path
    if (message.includes("Cannot find path")) return `${cmdlet}:PathNotFound`;
    if (message.includes("not recognized")) return `${cmdlet}:CommandNotFound`;
    return `${cmdlet}:Error`;
  }

  // SPE Remoting error format
  if (output.includes("ERROR:") || output.includes("Exception")) {
    return "RemoteError";
  }

  return null;
}

/** Extract column headers by splitting on whitespace boundaries defined by the separator */
function extractHeadersFromSep(headerLine: string, sepLine: string): string[] {
  const headers: string[] = [];
  let i = 0;

  while (i < sepLine.length) {
    // Skip spaces
    while (i < sepLine.length && sepLine[i] === " ") i++;
    if (i >= sepLine.length) break;

    // Find end of dash group
    const start = i;
    while (i < sepLine.length && sepLine[i] === "-") i++;

    // Extract header from same position
    const header = headerLine.substring(start, i).trim();
    if (header) headers.push(header);
  }

  return headers;
}
