import type { SitecoreNode, SitecoreItem } from "../types";
import { VIRTUAL_TREE } from "./virtualTree";
import { resolvePath } from "./pathResolver";
import { getItemProperty } from "./properties";

// ============================================================================
// Search Index — Simulates Sitecore Content Search API (Solr)
// ============================================================================

export interface SearchIndexEntry {
  /** Item name (lowercase) */
  _name: string;
  /** Template short name (lowercase) */
  _templatename: string;
  /** Full path like /sitecore/content/Home/About */
  _fullpath: string;
  /** Concatenation of all text fields for full-text search */
  _content: string;
  /** Item GUID */
  _id: string;
  /** All ancestor GUIDs (for DescendantOf queries) */
  _ancestors: string[];
  /** Template full path (lowercase) */
  _templatefullname: string;
  /** All custom fields indexed with lowercase keys */
  [field: string]: string | string[];
}

export interface SearchCriteria {
  Filter: string;
  Field?: string;
  Value: string;
  Invert?: boolean;
  Boost?: number;
}

export interface SearchOptions {
  orderBy?: string;
  first?: number;
  last?: number;
  skip?: number;
}

/** Build a flat search index from the virtual tree */
export function buildSearchIndex(
  tree: { sitecore: SitecoreNode } = VIRTUAL_TREE
): SearchIndexEntry[] {
  const entries: SearchIndexEntry[] = [];

  function walk(
    node: SitecoreNode,
    name: string,
    path: string,
    ancestors: string[]
  ) {
    // Build _content from all text fields
    const textParts: string[] = [name];
    if (node._fields) {
      for (const val of Object.values(node._fields)) {
        // Strip HTML tags for indexing
        textParts.push(val.replace(/<[^>]*>/g, ""));
      }
    }

    const entry: SearchIndexEntry = {
      _name: name.toLowerCase(),
      _templatename: (node._template || "").toLowerCase(),
      _templatefullname: (node._templateFullName || "").toLowerCase(),
      _fullpath: path.toLowerCase(),
      _content: textParts.join(" ").toLowerCase(),
      _id: node._id || "",
      _ancestors: ancestors,
    };

    // Index all custom fields with lowercase keys
    if (node._fields) {
      for (const [key, val] of Object.entries(node._fields)) {
        entry[key.toLowerCase()] = val.toLowerCase();
      }
    }

    entries.push(entry);

    // Recurse into children
    if (node._children) {
      const childAncestors = [...ancestors, node._id];
      for (const [childName, childNode] of Object.entries(node._children)) {
        walk(childNode, childName, path + "/" + childName, childAncestors);
      }
    }
  }

  walk(tree.sitecore, "sitecore", "/sitecore", []);
  return entries;
}

/** Evaluate a single criterion against an index entry */
function matchesCriterion(
  entry: SearchIndexEntry,
  criterion: SearchCriteria,
  tree: { sitecore: SitecoreNode }
): boolean {
  const filter = criterion.Filter.toLowerCase();
  const value = (criterion.Value || "").toLowerCase();

  // DescendantOf uses item ID or path — no Field needed
  if (filter === "descendantof") {
    let targetId = criterion.Value;
    // If value looks like a path (not a GUID), resolve it
    if (!targetId.startsWith("{")) {
      const resolved = resolvePath(targetId, tree);
      if (resolved) {
        targetId = resolved.node._id;
      } else {
        return false;
      }
    }
    const result = entry._ancestors.includes(targetId);
    return criterion.Invert ? !result : result;
  }

  const field = (criterion.Field || "").toLowerCase();
  const fieldValue = String(entry[field] ?? "");

  let result: boolean;
  switch (filter) {
    case "equals":
      result = fieldValue === value;
      break;
    case "contains":
      result = fieldValue.includes(value);
      break;
    case "startswith":
      result = fieldValue.startsWith(value);
      break;
    case "endswith":
      result = fieldValue.endsWith(value);
      break;
    case "containsany": {
      const anyValues = value.split("|").map((v) => v.trim());
      result = anyValues.some((v) => fieldValue.includes(v));
      break;
    }
    case "containsall": {
      const allValues = value.split("|").map((v) => v.trim());
      result = allValues.every((v) => fieldValue.includes(v));
      break;
    }
    case "matcheswildcard": {
      const regex = new RegExp(
        "^" + value.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
      );
      result = regex.test(fieldValue);
      break;
    }
    case "matchesregex": {
      try {
        result = new RegExp(value, "i").test(fieldValue);
      } catch {
        result = false;
      }
      break;
    }
    case "fuzzy": {
      // Simple fuzzy: check if strings are similar (contain each other or edit distance ≤ 2)
      result =
        fieldValue.includes(value) ||
        value.includes(fieldValue) ||
        levenshtein(fieldValue, value) <= 2;
      break;
    }
    case "lessthan":
      result = parseFloat(fieldValue) < parseFloat(value);
      break;
    case "greaterthan":
      result = parseFloat(fieldValue) > parseFloat(value);
      break;
    case "inclusiverange": {
      const [min, max] = value.split("|");
      const num = parseFloat(fieldValue);
      result = num >= parseFloat(min) && num <= parseFloat(max);
      break;
    }
    case "exclusiverange": {
      const [min, max] = value.split("|");
      const num = parseFloat(fieldValue);
      result = num > parseFloat(min) && num < parseFloat(max);
      break;
    }
    default:
      result = false;
  }

  return criterion.Invert ? !result : result;
}

/** Simple Levenshtein distance for fuzzy matching */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Execute a search against the index with AND-combined criteria */
export function executeSearch(
  index: SearchIndexEntry[],
  criteria: SearchCriteria[],
  options: SearchOptions = {},
  tree: { sitecore: SitecoreNode } = VIRTUAL_TREE
): SearchIndexEntry[] {
  // Filter: all criteria must match (AND logic)
  let results = index.filter((entry) =>
    criteria.every((c) => matchesCriterion(entry, c, tree))
  );

  // Sort by orderBy field
  if (options.orderBy) {
    const field = options.orderBy.toLowerCase();
    const descending = field.endsWith(" desc");
    const cleanField = descending ? field.replace(/ desc$/, "").trim() : field;
    results.sort((a, b) => {
      const va = String(a[cleanField] ?? "");
      const vb = String(b[cleanField] ?? "");
      const cmp = va.localeCompare(vb);
      return descending ? -cmp : cmp;
    });
  }

  // Pagination
  if (options.skip) {
    results = results.slice(options.skip);
  }
  if (options.first != null) {
    results = results.slice(0, options.first);
  }
  if (options.last != null) {
    results = results.slice(-options.last);
  }

  return results;
}

/** Convert search index entries back to SitecoreItem[] by resolving from the tree */
export function entriesToItems(
  entries: SearchIndexEntry[],
  tree: { sitecore: SitecoreNode } = VIRTUAL_TREE
): SitecoreItem[] {
  const items: SitecoreItem[] = [];
  for (const entry of entries) {
    const resolved = resolveByPath(entry._fullpath, tree);
    if (resolved) {
      items.push(resolved);
    }
  }
  return items;
}

/** Resolve an item from the tree by its full path (case-insensitive) */
function resolveByPath(
  fullpath: string,
  tree: { sitecore: SitecoreNode }
): SitecoreItem | null {
  const parts = fullpath.split("/").filter(Boolean);
  let current: SitecoreNode | null = null;
  let currentName = "";

  for (const part of parts) {
    if (!current) {
      if (part.toLowerCase() === "sitecore") {
        current = tree.sitecore;
        currentName = "sitecore";
      } else return null;
    } else {
      const children: Record<string, SitecoreNode> = current._children || {};
      const match = Object.keys(children).find(
        (k) => k.toLowerCase() === part.toLowerCase()
      );
      if (match) {
        current = children[match];
        currentName = match;
      } else return null;
    }
  }

  if (!current) return null;
  return {
    name: currentName,
    node: current,
    path: "/" + parts.map((p) => {
      // Reconstruct with original case
      return p;
    }).join("/"),
  };
}

/** Parse @{Key = "Value"; ...} hashtable blocks from a raw command string */
export function parseCriteriaHashtables(raw: string): SearchCriteria[] {
  const criteria: SearchCriteria[] = [];

  // Find all @{ ... } blocks
  let pos = 0;
  while (pos < raw.length) {
    const start = raw.indexOf("@{", pos);
    if (start === -1) break;

    // Find matching closing brace
    let depth = 0;
    let end = start + 1;
    for (; end < raw.length; end++) {
      if (raw[end] === "{") depth++;
      else if (raw[end] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }

    if (depth !== 0) break;

    const block = raw.substring(start + 2, end).trim();
    const criterion = parseHashtableBlock(block);
    if (criterion) {
      criteria.push(criterion);
    }

    pos = end + 1;
  }

  return criteria;
}

/** Parse a single hashtable block content: Filter = "Equals"; Field = "_templatename"; Value = "Article" */
function parseHashtableBlock(block: string): SearchCriteria | null {
  const result: Record<string, string | boolean | number> = {};

  // Split by semicolons (respecting quoted strings)
  const pairs = splitHashtablePairs(block);

  for (const pair of pairs) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;

    const key = pair.substring(0, eqIdx).trim();
    let value = pair.substring(eqIdx + 1).trim();

    // Strip quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Handle booleans
    if (value === "$true" || value === "true") {
      result[key] = true;
    } else if (value === "$false" || value === "false") {
      result[key] = false;
    } else if (/^\d+$/.test(value)) {
      result[key] = parseInt(value, 10);
    } else {
      result[key] = value;
    }
  }

  if (!result.Filter) return null;

  return {
    Filter: String(result.Filter),
    Field: result.Field != null ? String(result.Field) : undefined,
    Value: result.Value != null ? String(result.Value) : "",
    Invert: result.Invert === true ? true : undefined,
    Boost: typeof result.Boost === "number" ? result.Boost : undefined,
  };
}

/** Split hashtable content by semicolons, respecting quoted strings */
function splitHashtablePairs(block: string): string[] {
  const pairs: string[] = [];
  let current = "";
  let inQuote: string | null = null;

  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    if (inQuote) {
      current += ch;
      if (ch === inQuote) inQuote = null;
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
      current += ch;
    } else if (ch === ";") {
      if (current.trim()) pairs.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) pairs.push(current.trim());
  return pairs;
}
