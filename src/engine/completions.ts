import type { SitecoreNode } from "../types";

// ============================================================================
// Tab Completion Engine for ISE Editor (Ctrl+Space)
// ============================================================================

/** All supported cmdlet names */
export const CMDLET_NAMES = [
  "Close-Window",
  "ConvertTo-Json",
  "Copy-Item",
  "ForEach-Object",
  "Format-Table",
  "Get-ChildItem",
  "Get-Item",
  "Get-Location",
  "Get-Member",
  "Group-Object",
  "Measure-Object",
  "Move-Item",
  "New-Item",
  "Read-Variable",
  "Remove-Item",
  "Rename-Item",
  "Select-Object",
  "Set-ItemProperty",
  "Show-Alert",
  "Show-ListView",
  "Sort-Object",
  "Where-Object",
  "Write-Host",
  "Write-Output",
  "Get-Alias",
];

/** Cmdlet aliases */
export const CMDLET_ALIASES: Record<string, string> = {
  foreach: "ForEach-Object",
  where: "Where-Object",
  sort: "Sort-Object",
  select: "Select-Object",
  group: "Group-Object",
  measure: "Measure-Object",
  gm: "Get-Member",
  pwd: "Get-Location",
  gl: "Get-Location",
  ft: "Format-Table",
  gci: "Get-ChildItem", ls: "Get-ChildItem", dir: "Get-ChildItem",
  gi: "Get-Item",
  echo: "Write-Output", write: "Write-Output",
  ni: "New-Item",
  ri: "Remove-Item", rm: "Remove-Item", del: "Remove-Item",
  mi: "Move-Item", mv: "Move-Item", move: "Move-Item",
  ci: "Copy-Item", cp: "Copy-Item", copy: "Copy-Item",
  rni: "Rename-Item", ren: "Rename-Item",
  sp: "Set-ItemProperty",
  gal: "Get-Alias",
};

/** All completable cmdlet tokens (names + aliases) */
const ALL_CMDLET_TOKENS = [
  ...CMDLET_NAMES,
  ...Object.keys(CMDLET_ALIASES),
];

/** Parameters per cmdlet (canonical name → param list) */
const CMDLET_PARAMS: Record<string, string[]> = {
  "Get-Item": ["-Path"],
  "Get-ChildItem": ["-Path", "-Recurse"],
  "Where-Object": ["-FilterScript"],
  "ForEach-Object": ["-Process"],
  "Select-Object": ["-Property", "-First", "-Last"],
  "Sort-Object": ["-Property", "-Descending"],
  "Group-Object": ["-Property"],
  "Measure-Object": [],
  "Get-Location": [],
  "Get-Member": [],
  "New-Item": ["-Path", "-Name", "-ItemType"],
  "Remove-Item": ["-Path"],
  "Copy-Item": ["-Path", "-Destination"],
  "Move-Item": ["-Path", "-Destination"],
  "Rename-Item": ["-Path", "-NewName"],
  "Set-ItemProperty": ["-Path", "-Name", "-Value"],
  "Format-Table": ["-Property"],
  "Write-Host": ["-ForegroundColor"],
  "Write-Output": [],
  "ConvertTo-Json": [],
  "Show-ListView": ["-Property", "-Title"],
  "Show-Alert": ["-Title"],
  "Read-Variable": ["-Title", "-Description"],
  "Close-Window": [],
  "Get-Alias": [],
};

/** Built-in variables */
const BUILTIN_VARS = ["$_", "$PSItem", "$true", "$false", "$null"];

/** Common item properties for property-name completion */
const ITEM_PROPERTIES = [
  "Name",
  "ID",
  "TemplateName",
  "ItemPath",
  "HasChildren",
  "Fields",
  "Title",
  "Text",
  "__Updated",
  "__Created",
  "__Updated by",
];

export interface CompletionResult {
  /** The list of possible completions (full text to replace the token) */
  matches: string[];
  /** Start offset of the token being completed */
  replaceStart: number;
  /** End offset of the token being completed */
  replaceEnd: number;
}

/**
 * Determine what kind of completion context the cursor is in
 * and return matching candidates.
 */
export function getCompletions(
  text: string,
  cursorPos: number,
  tree?: { sitecore: SitecoreNode },
  userVariables?: string[]
): CompletionResult | null {
  // Extract the token to the left of the cursor
  const beforeCursor = text.slice(0, cursorPos);

  // Try variable completion ($...)
  const varMatch = beforeCursor.match(/(\$[\w]*)$/);
  if (varMatch) {
    const prefix = varMatch[1];
    const start = cursorPos - prefix.length;
    const allVars = [
      ...BUILTIN_VARS,
      ...(userVariables || []).map((v) => (v.startsWith("$") ? v : "$" + v)),
    ];
    const matches = allVars.filter((v) =>
      v.toLowerCase().startsWith(prefix.toLowerCase())
    );
    if (matches.length > 0) {
      return { matches, replaceStart: start, replaceEnd: cursorPos };
    }
  }

  // Try parameter completion (-...)
  const paramMatch = beforeCursor.match(/(^|[\s|])(-[\w]*)$/);
  if (paramMatch) {
    const prefix = paramMatch[2];
    const start = cursorPos - prefix.length;
    const cmdletName = findCurrentCmdlet(beforeCursor);
    const params = getParamsForCmdlet(cmdletName);
    const matches = params.filter((p) =>
      p.toLowerCase().startsWith(prefix.toLowerCase())
    );
    if (matches.length > 0) {
      return { matches, replaceStart: start, replaceEnd: cursorPos };
    }
  }

  // Try path completion (/sitecore/... or relative paths after -Path or positional)
  if (tree) {
    const pathResult = tryPathCompletion(beforeCursor, cursorPos, tree);
    if (pathResult) return pathResult;
  }

  // Try cmdlet name completion
  const tokenMatch = beforeCursor.match(/(^|[\s|;(])([A-Za-z][\w-]*)$/);
  if (tokenMatch) {
    const prefix = tokenMatch[2];
    const start = cursorPos - prefix.length;
    const matches = ALL_CMDLET_TOKENS.filter((c) =>
      c.toLowerCase().startsWith(prefix.toLowerCase())
    );
    // Sort: exact-case matches first, then alphabetical
    matches.sort((a, b) => {
      const aExact = a.startsWith(prefix) ? 0 : 1;
      const bExact = b.startsWith(prefix) ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return a.localeCompare(b);
    });
    if (matches.length > 0) {
      return { matches, replaceStart: start, replaceEnd: cursorPos };
    }
  }

  return null;
}

/** Find the cmdlet name on the current pipeline segment */
function findCurrentCmdlet(beforeCursor: string): string | null {
  // Find last pipe or start of line
  const lastPipe = beforeCursor.lastIndexOf("|");
  const lastNewline = beforeCursor.lastIndexOf("\n");
  const segmentStart = Math.max(lastPipe, lastNewline) + 1;
  const segment = beforeCursor.slice(segmentStart).trimStart();

  // First token is the cmdlet
  const firstToken = segment.split(/\s/)[0];
  if (!firstToken) return null;

  // Resolve alias
  const alias = CMDLET_ALIASES[firstToken.toLowerCase()];
  if (alias) return alias;

  // Check if it's a known cmdlet
  const found = CMDLET_NAMES.find(
    (c) => c.toLowerCase() === firstToken.toLowerCase()
  );
  return found || null;
}

/** Get parameters for a cmdlet (by canonical name) */
function getParamsForCmdlet(cmdletName: string | null): string[] {
  if (!cmdletName) {
    // Return common params if we can't determine the cmdlet
    return ["-Path", "-Property", "-Name", "-Recurse", "-Descending"];
  }
  return CMDLET_PARAMS[cmdletName] || [];
}

/** Supported Sitecore drive names */
const DRIVE_NAMES = ["master", "core", "web"];

/** Try to complete a Sitecore path using drive syntax (master:\path) */
function tryPathCompletion(
  beforeCursor: string,
  cursorPos: number,
  tree: { sitecore: SitecoreNode }
): CompletionResult | null {
  // Match drive:\ or drive:/ paths (e.g. master:\content\Home, master:/content)
  // Also match bare "master:" for root-level completion
  const pathMatch = beforeCursor.match(
    /(["']?)((master|core|web):([\\/][\w\s-]*)*[\\/]?)$/i
  );
  if (!pathMatch) return null;

  const quote = pathMatch[1];
  const fullPath = pathMatch[2];
  const drive = pathMatch[3];
  const start = cursorPos - fullPath.length - quote.length;

  // Normalize separators to backslash for output, forward slash internally
  const normalized = fullPath.slice(drive.length + 1); // strip "master:" prefix
  const parts = normalized.replace(/\\/g, "/").split("/").filter(Boolean);
  const endsWithSep = /[\\/]$/.test(fullPath);

  // Bare drive (e.g. "master:") — complete with root-level children
  const isBare = normalized === "" || normalized === "/" || normalized === "\\";

  let node: SitecoreNode = tree.sitecore;
  let resolvedPath = `${drive}:`;

  if (isBare || endsWithSep) {
    // Navigate all segments
    for (const seg of parts) {
      const childName = findChildCaseInsensitive(node, seg);
      if (!childName) return null;
      node = node._children[childName];
      resolvedPath += "\\" + childName;
    }
    // Complete children of this node
    const children = Object.keys(node._children);
    if (children.length === 0) return null;
    const matches = children.map((c) => quote + resolvedPath + "\\" + c);
    return { matches, replaceStart: start, replaceEnd: cursorPos };
  } else {
    // Partial last segment — navigate to parent, match against children
    const lastSegment = parts[parts.length - 1] || "";
    for (let i = 0; i < parts.length - 1; i++) {
      const childName = findChildCaseInsensitive(node, parts[i]);
      if (!childName) return null;
      node = node._children[childName];
      resolvedPath += "\\" + childName;
    }
    const children = Object.keys(node._children);
    const matches = children
      .filter((c) => c.toLowerCase().startsWith(lastSegment.toLowerCase()))
      .map((c) => quote + resolvedPath + "\\" + c);
    if (matches.length === 0) return null;
    return { matches, replaceStart: start, replaceEnd: cursorPos };
  }
}

/** Case-insensitive child lookup */
function findChildCaseInsensitive(
  node: SitecoreNode,
  name: string
): string | null {
  // Exact match first
  if (node._children[name]) return name;
  // Case-insensitive
  const lower = name.toLowerCase();
  return (
    Object.keys(node._children).find((k) => k.toLowerCase() === lower) || null
  );
}
