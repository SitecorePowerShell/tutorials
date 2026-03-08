import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================================
// VIRTUAL SITECORE CONTENT TREE
// ============================================================================
const VIRTUAL_TREE = {
  sitecore: {
    _id: "{11111111-1111-1111-1111-111111111111}",
    _template: "Root",
    _templateFullName: "System/Root",
    _version: 1,
    _fields: {},
    _children: {
      content: {
        _id: "{0DE95AE4-41AB-4D01-9EB0-67441B7C2450}",
        _template: "Node",
        _templateFullName: "System/Node",
        _version: 1,
        _fields: {},
        _children: {
          Home: {
            _id: "{110D559F-DEA5-42EA-9C1C-8A5DF7E70EF9}",
            _template: "Sample Item",
            _templateFullName: "Sample/Sample Item",
            _version: 2,
            _fields: {
              Title: "Welcome to Sitecore",
              Text: "<p>This is the home page content.</p>",
              __Updated: "20250315T103000Z",
              __Created: "20240601T080000Z",
              "__Updated by": "sitecore\\admin",
            },
            _children: {
              About: {
                _id: "{A2B3C4D5-E6F7-8901-2345-678901234567}",
                _template: "Sample Item",
                _templateFullName: "Sample/Sample Item",
                _version: 1,
                _fields: {
                  Title: "About Us",
                  Text: "<p>Learn more about our company.</p>",
                  __Updated: "20250220T140000Z",
                  __Created: "20240710T090000Z",
                  "__Updated by": "sitecore\\author1",
                },
                _children: {
                  Team: {
                    _id: "{B1111111-1111-1111-1111-111111111111}",
                    _template: "Sample Item",
                    _templateFullName: "Sample/Sample Item",
                    _version: 1,
                    _fields: {
                      Title: "Our Team",
                      Text: "<p>Meet the team behind the product.</p>",
                      __Updated: "20250110T110000Z",
                      __Created: "20240815T100000Z",
                      "__Updated by": "sitecore\\author1",
                    },
                    _children: {},
                  },
                  History: {
                    _id: "{B2222222-2222-2222-2222-222222222222}",
                    _template: "Sample Item",
                    _templateFullName: "Sample/Sample Item",
                    _version: 1,
                    _fields: {
                      Title: "Our History",
                      Text: "<p>Founded in 2003.</p>",
                      __Updated: "20250105T090000Z",
                      __Created: "20240815T103000Z",
                      "__Updated by": "sitecore\\admin",
                    },
                    _children: {},
                  },
                },
              },
              Products: {
                _id: "{C3D4E5F6-7890-1234-5678-901234567890}",
                _template: "Folder",
                _templateFullName: "Common/Folder",
                _version: 1,
                _fields: {
                  __Updated: "20250301T080000Z",
                  __Created: "20240615T120000Z",
                  "__Updated by": "sitecore\\admin",
                },
                _children: {
                  "Product A": {
                    _id: "{D1111111-1111-1111-1111-111111111111}",
                    _template: "Sample Item",
                    _templateFullName: "Sample/Sample Item",
                    _version: 1,
                    _fields: {
                      Title: "Product A",
                      Text: "<p>Our flagship product.</p>",
                      __Updated: "20250310T160000Z",
                      __Created: "20240901T080000Z",
                      "__Updated by": "sitecore\\author2",
                    },
                    _children: {},
                  },
                  "Product B": {
                    _id: "{D2222222-2222-2222-2222-222222222222}",
                    _template: "Sample Item",
                    _templateFullName: "Sample/Sample Item",
                    _version: 1,
                    _fields: {
                      Title: "Product B",
                      Text: "<p>Enterprise solution.</p>",
                      __Updated: "20250228T120000Z",
                      __Created: "20240915T100000Z",
                      "__Updated by": "sitecore\\author2",
                    },
                    _children: {},
                  },
                  "Product C": {
                    _id: "{D3333333-3333-3333-3333-333333333333}",
                    _template: "Sample Item",
                    _templateFullName: "Sample/Sample Item",
                    _version: 1,
                    _fields: {
                      Title: "Product C",
                      Text: "<p>Developer toolkit.</p>",
                      __Updated: "20250120T143000Z",
                      __Created: "20241001T090000Z",
                      "__Updated by": "sitecore\\admin",
                    },
                    _children: {},
                  },
                },
              },
              News: {
                _id: "{E4F5A6B7-C8D9-0123-4567-890123456789}",
                _template: "Folder",
                _templateFullName: "Common/Folder",
                _version: 1,
                _fields: {
                  __Updated: "20250312T090000Z",
                  __Created: "20240701T080000Z",
                  "__Updated by": "sitecore\\admin",
                },
                _children: {
                  "2025 Roadmap": {
                    _id: "{E1111111-1111-1111-1111-111111111111}",
                    _template: "Sample Item",
                    _templateFullName: "Sample/Sample Item",
                    _version: 1,
                    _fields: {
                      Title: "2025 Product Roadmap",
                      Text: "<p>Exciting things ahead.</p>",
                      __Updated: "20250312T090000Z",
                      __Created: "20250105T080000Z",
                      "__Updated by": "sitecore\\author1",
                    },
                    _children: {},
                  },
                  "Sitecore Launch": {
                    _id: "{E2222222-2222-2222-2222-222222222222}",
                    _template: "Sample Item",
                    _templateFullName: "Sample/Sample Item",
                    _version: 1,
                    _fields: {
                      Title: "New Sitecore Features",
                      Text: "<p>Latest platform updates.</p>",
                      __Updated: "20250215T110000Z",
                      __Created: "20241120T100000Z",
                      "__Updated by": "sitecore\\author2",
                    },
                    _children: {},
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

// ============================================================================
// SIMULATION ENGINE
// ============================================================================
// The current working directory — matches real SPE ISE default
const CWD = "/sitecore/content/Home";

function resolvePath(pathStr) {
  let clean = pathStr.replace(/['"]/g, "").trim();

  // Handle "master:\" (with backslash) → root of drive (the sitecore node)
  if (/^(master|core|web):[\\/]$/i.test(clean)) {
    return { node: VIRTUAL_TREE.sitecore, name: "sitecore", path: "/sitecore" };
  }

  // Handle "master:" (bare, no backslash) → current location (same as ".")
  if (/^(master|core|web):$/i.test(clean)) {
    return resolveAbsolutePath(CWD);
  }

  // Strip drive prefix: master:\content\Home → content\Home
  clean = clean.replace(/^(master|core|web):[\\/]?/i, "");
  clean = clean.replace(/\\/g, "/");

  // Handle dot-paths relative to CWD
  if (clean === "." || clean === "") {
    return resolveAbsolutePath(CWD);
  } else if (clean.startsWith("./")) {
    clean = CWD + clean.substring(1);
  } else if (clean.startsWith("/sitecore")) {
    // Already absolute with /sitecore prefix — keep as-is
  } else if (clean.startsWith("sitecore/") || clean.toLowerCase() === "sitecore") {
    clean = "/" + clean;
  } else {
    // Relative path segment (e.g. "content/Home") — resolve from /sitecore
    clean = "/sitecore/" + clean;
  }

  return resolveAbsolutePath(clean);
}

function resolveAbsolutePath(cleanPath) {
  // Remove trailing slash
  const clean = cleanPath.replace(/\/$/, "");

  const parts = clean.split("/").filter(Boolean);
  let current = null;
  let currentName = "";

  for (const part of parts) {
    if (!current) {
      if (part.toLowerCase() === "sitecore") {
        current = VIRTUAL_TREE.sitecore;
        currentName = "sitecore";
      } else return null;
    } else {
      const children = current._children || {};
      const match = Object.keys(children).find(
        (k) => k.toLowerCase() === part.toLowerCase()
      );
      if (match) {
        current = children[match];
        currentName = match;
      } else return null;
    }
  }
  return current ? { node: current, name: currentName, path: clean } : null;
}

function getChildren(node) {
  if (!node || !node._children) return [];
  return Object.entries(node._children).map(([name, child]) => ({
    name,
    node: child,
  }));
}

function getAllDescendants(node, parentPath = "") {
  const results = [];
  const children = node._children || {};
  for (const [name, child] of Object.entries(children)) {
    const path = parentPath + "/" + name;
    results.push({ name, node: child, path });
    results.push(...getAllDescendants(child, path));
  }
  return results;
}

function formatItemTable(items) {
  if (items.length === 0) return "";
  // Match real SPE table format from Sitecore_Views.ps1xml:
  // Name(32) Children/HasChildren(8) Language(8) Version(7) Id/ID(38) TemplateName(32)
  const headers = ["Name", "Children", "Language", "Version", "Id", "TemplateName"];
  const rows = items.map((item) => [
    item.name,
    Object.keys(item.node._children || {}).length > 0 ? "True" : "False",
    "en",
    String(item.node._version || 1),
    item.node._id || "-",
    item.node._template || "-",
  ]);

  // Fixed widths from Sitecore_Views.ps1xml TableColumnHeader definitions
  const fixedWidths = [32, 8, 8, 7, 38, 32];
  const colWidths = headers.map((h, i) => {
    const dataMax = Math.max(h.length, ...rows.map((r) => String(r[i]).length));
    return fixedWidths[i] > 0 ? Math.max(fixedWidths[i], dataMax) : dataMax;
  });
  const sep = colWidths.map((w) => "-".repeat(w)).join(" ");
  const headerLine = headers
    .map((h, i) => h.padEnd(colWidths[i]))
    .join(" ");
  const rowLines = rows.map((r) =>
    r.map((c, i) => String(c).padEnd(colWidths[i])).join(" ")
  );
  return [headerLine, sep, ...rowLines].join("\n");
}

function formatPropertyTable(items, properties) {
  if (items.length === 0) return "";

  // Normalize property names to match real SPE behavior
  // "Id" always displays as "ID" in headers (property name is ID)
  const displayHeaders = properties.map((p) => {
    if (p.toLowerCase() === "id") return "ID";
    return p;
  });

  const rows = items.map((item) =>
    properties.map((p) => getItemProperty(item, p) || "-")
  );
  const colWidths = displayHeaders.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => String(r[i]).length))
  );
  const sep = colWidths.map((w) => "-".repeat(w)).join(" ");
  const headerLine = displayHeaders
    .map((h, i) => h.padEnd(colWidths[i]))
    .join(" ");
  const rowLines = rows.map((r) =>
    r.map((c, i) => String(c).padEnd(colWidths[i])).join(" ")
  );
  return [headerLine, sep, ...rowLines].join("\n");
}

function parseCommand(input) {
  const trimmed = input.trim();
  // Split on pipe, respecting quoted strings AND braces
  const rawStages = [];
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

function parseSingleCommand(cmdStr) {
  const tokens = [];
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
  const params = {};
  const switches = [];
  let currentParam = null;

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

// Shared property resolver — case-insensitive, matches real SPE behavior
function getItemProperty(item, prop) {
  const p = prop.toLowerCase();
  if (p === "name") return item.name;
  if (p === "id") return item.node._id || "";
  if (p === "templatename") return item.node._template || "";
  if (p === "templateid") return "{76036F5E-CBCE-46D1-AF0A-4143F9B557AA}";
  if (p === "itempath") return item.path || "/" + item.name;
  if (p === "version") return String(item.node._version || 1);
  if (p === "haschildren") return Object.keys(item.node._children || {}).length > 0 ? "True" : "False";
  if (p === "database") return "master";
  if (p === "displayname") return item.name;
  if (p === "language") return "en";
  // Check fields (case-sensitive for field names like __Updated, __Created by)
  if (item.node._fields && prop in item.node._fields) return item.node._fields[prop];
  // Case-insensitive field fallback
  if (item.node._fields) {
    const fieldKey = Object.keys(item.node._fields).find(k => k.toLowerCase() === p);
    if (fieldKey) return item.node._fields[fieldKey];
  }
  return "";
}

// Script execution context — holds variable scope across lines
class ScriptContext {
  constructor() {
    this.variables = {};
    this.outputs = [];
    this.errors = [];
    this.dialogRequests = []; // For Read-Variable, Show-Alert
  }

  setVar(name, value) {
    this.variables[name.replace(/^\$/, "")] = value;
  }

  getVar(name) {
    const clean = name.replace(/^\$/, "");
    return this.variables[clean];
  }

  // Expand $variable references in a string
  expandVars(str) {
    if (!str) return str;
    return str.replace(/\$(\w+)/g, (match, varName) => {
      const val = this.variables[varName];
      if (val === undefined) return match;
      if (Array.isArray(val)) return `[Array: ${val.length} items]`;
      if (typeof val === "object" && val.name) return val.name;
      return String(val);
    });
  }
}

// Execute a multi-line script with shared variable scope
function executeScript(script) {
  const ctx = new ScriptContext();
  const lines = script.split("\n");

  // Pre-process: join continuation lines (ending with |, `, or opening {)
  const joined = [];
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
    // Continue accumulating if line ends with | or backtick
    if (trimmed.endsWith("|") || trimmed.endsWith("`")) {
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

function executeLine(line, ctx) {
  const trimmed = line.trim();

  // Variable assignment: $varName = <expression>
  const assignMatch = trimmed.match(/^\$(\w+)\s*=\s*(.+)$/);
  if (assignMatch) {
    const [, varName, expr] = assignMatch;
    // Execute the RHS as a command
    const result = executeCommandWithContext(expr, ctx);
    if (result.error) {
      ctx.errors.push(result.error);
    } else if (result.pipelineData) {
      ctx.setVar(varName, result.pipelineData);
    } else if (result.output) {
      // Primitive value assignment (string/number)
      ctx.setVar(varName, result.output);
    }
    return;
  }

  // Foreach loop: foreach($var in $collection) { ... }
  const foreachMatch = trimmed.match(/^foreach\s*\(\s*\$(\w+)\s+in\s+\$(\w+)\s*\)\s*\{(.+)\}$/i);
  if (foreachMatch) {
    const [, iterVar, collectionVar, body] = foreachMatch;
    const collection = ctx.getVar(collectionVar);
    if (Array.isArray(collection)) {
      for (const item of collection) {
        ctx.setVar(iterVar, item);
        const bodyLines = body.split(";").map(s => s.trim()).filter(Boolean);
        for (const bl of bodyLines) {
          executeLine(bl, ctx);
        }
      }
    }
    return;
  }

  // Regular command execution
  const result = executeCommandWithContext(trimmed, ctx);
  if (result.error) ctx.errors.push(result.error);
  if (result.output) ctx.outputs.push(result.output);
}

// Core command execution with variable context
function executeCommandWithContext(input, ctx) {
  // Expand variables in the input
  let expanded = input;

  // Expand $var.Property access patterns
  expanded = expanded.replace(/\$(\w+)\.(\w+)/g, (match, varName, prop) => {
    if (varName === "_") return match; // Leave $_ alone for pipeline
    const val = ctx.getVar(varName);
    if (!val) return match;
    // Single item
    if (val.node) {
      return getItemProperty(val, prop);
    }
    // Array — return count for .Count/.Length
    if (Array.isArray(val)) {
      if (prop.toLowerCase() === "count" || prop.toLowerCase() === "length") return String(val.length);
    }
    return match;
  });

  // Expand simple $var references in quoted strings
  expanded = expanded.replace(/"([^"]*\$\w+[^"]*)"/g, (match) => {
    return '"' + match.slice(1, -1).replace(/\$(\w+)/g, (m, varName) => {
      if (varName === "_") return m;
      const val = ctx.getVar(varName);
      if (val === undefined) return m;
      if (typeof val === "string") return val;
      if (Array.isArray(val)) return `[Array: ${val.length} items]`;
      if (val.name) return val.name;
      return String(val);
    }) + '"';
  });

  // Check if the input is just a variable reference (to pipe variable contents)
  const bareVarMatch = expanded.trim().match(/^\$(\w+)$/);
  if (bareVarMatch) {
    const val = ctx.getVar(bareVarMatch[1]);
    if (val !== undefined) {
      if (Array.isArray(val)) {
        return { output: formatItemTable(val), error: null, pipelineData: val };
      }
      return { output: String(val), error: null, pipelineData: val };
    }
  }

  // Parse and execute the pipeline
  const { raw: rawStages, parsed: stages } = parseCommand(expanded);
  if (stages.length === 0) return { output: "", error: null };

  let pipelineData = null;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const cmdLower = stage.cmdlet.toLowerCase();

    // Check if the first stage is a variable reference (e.g., $items | Where-Object)
    if (i === 0 && stage.cmdlet.startsWith("$")) {
      const varVal = ctx.getVar(stage.cmdlet.substring(1));
      if (Array.isArray(varVal)) {
        pipelineData = varVal;
        continue;
      } else if (varVal && varVal.node) {
        pipelineData = [varVal];
        continue;
      }
    }

    try {
      if (cmdLower === "get-item") {
        const path =
          stage.params.Path || stage.params.path || (stage.params._positional && stage.params._positional[0]) || ".";
        const resolved = resolvePath(path);
        if (!resolved) return { output: "", error: `Get-Item : Cannot find path '${path}' because it does not exist.` };
        pipelineData = [{ name: resolved.name, node: resolved.node, path: resolved.path }];

      } else if (cmdLower === "get-childitem") {
        const path =
          stage.params.Path || stage.params.path || (stage.params._positional && stage.params._positional[0]);

        let items = [];
        const recurse = stage.switches.some((s) => s.toLowerCase() === "recurse");

        if (pipelineData) {
          for (const item of pipelineData) {
            if (recurse) {
              items.push(...getAllDescendants(item.node, item.path || item.name));
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
          const resolved = resolvePath(path || ".");
          if (!resolved) return { output: "", error: `Get-ChildItem : Cannot find path '${path}'` };
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

      } else if (cmdLower === "where-object" || cmdLower === "where" || cmdLower === "?") {
        if (!pipelineData) return { output: "", error: "Where-Object : No pipeline input." };

        const rawCmd = rawStages[i] || "";
        const braceStart = rawCmd.indexOf("{");
        const braceEnd = rawCmd.lastIndexOf("}");
        let filterExpr = "";

        if (braceStart !== -1 && braceEnd > braceStart) {
          filterExpr = rawCmd.substring(braceStart + 1, braceEnd).trim();
        } else {
          const allTokens = [
            ...(stage.params._positional || []),
            ...Object.values(stage.params).filter(v => typeof v === "string"),
            ...stage.switches
          ].join(" ").replace(/[{}]/g, "").trim();
          filterExpr = allTokens;
        }

        if (!filterExpr) {
          return { output: "", error: "Where-Object : Missing filter expression." };
        }

        const filterMatch = filterExpr.match(
          /\$_\.(\w+)\s+-(eq|ne|like|notlike|match|gt|lt|ge|le)\s+(?:"([^"]+)"|'([^']+)'|(\S+))/i
        );
        if (filterMatch) {
          const prop = filterMatch[1];
          const op = filterMatch[2];
          const val = filterMatch[3] || filterMatch[4] || filterMatch[5] || "";
          pipelineData = pipelineData.filter((item) => {
            const itemVal = getItemProperty(item, prop);

            switch (op.toLowerCase()) {
              case "eq": return String(itemVal).toLowerCase() === val.toLowerCase();
              case "ne": return String(itemVal).toLowerCase() !== val.toLowerCase();
              case "like": {
                const regex = new RegExp("^" + val.replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i");
                return regex.test(String(itemVal));
              }
              case "match": return new RegExp(val, "i").test(String(itemVal));
              default: return true;
            }
          });
        }

      } else if (cmdLower === "foreach-object" || cmdLower === "foreach" || cmdLower === "%") {
        if (!pipelineData) return { output: "", error: "ForEach-Object : No pipeline input." };

        const rawCmd = rawStages[i] || "";
        const braceStart = rawCmd.indexOf("{");
        const braceEnd = rawCmd.lastIndexOf("}");

        if (braceStart !== -1 && braceEnd > braceStart) {
          const body = rawCmd.substring(braceStart + 1, braceEnd).trim();
          const results = [];

          for (const item of pipelineData) {
            // Set $_ in context for the loop body
            ctx.setVar("_", item);

            // Handle property access: $_.PropertyName
            let expandedBody = body.replace(/\$_\.(\w+)/g, (_, prop) => {
              return getItemProperty(item, prop);
            });

            // Handle Write-Host or simple expression output
            if (expandedBody.toLowerCase().startsWith("write-host")) {
              const msg = expandedBody.replace(/^write-host\s*/i, "").replace(/^["']|["']$/g, "");
              results.push(msg);
            } else if (expandedBody.startsWith('"') || expandedBody.startsWith("'")) {
              // String expression — expand and output
              results.push(expandedBody.replace(/^["']|["']$/g, ""));
            } else {
              // Try executing as a command
              const innerResult = executeCommandWithContext(expandedBody, ctx);
              if (innerResult.output) results.push(innerResult.output);
              if (innerResult.error) ctx.errors.push(innerResult.error);
            }
          }
          if (results.length > 0) {
            return { output: results.join("\n"), error: null };
          }
        }
        // If no brace block, ForEach-Object just passes through
        // (real PS supports -Process but we simplify)

      } else if (cmdLower === "select-object" || cmdLower === "select") {
        if (!pipelineData) return { output: "", error: "Select-Object : No pipeline input." };
        const propParam = stage.params.Property || stage.params.property;
        if (propParam) {
          const props = propParam.split(",").map((p) => p.trim());
          pipelineData._selectedProperties = props;
        }
        const first = stage.params.First || stage.params.first;
        if (first) pipelineData = pipelineData.slice(0, parseInt(first));
        const last = stage.params.Last || stage.params.last;
        if (last) pipelineData = pipelineData.slice(-parseInt(last));

      } else if (cmdLower === "sort-object" || cmdLower === "sort") {
        if (!pipelineData) return { output: "", error: "Sort-Object : No pipeline input." };
        const sortProp = stage.params.Property || stage.params.property || (stage.params._positional && stage.params._positional[0]);
        const desc = stage.switches.some((s) => s.toLowerCase() === "descending");
        if (sortProp) {
          pipelineData.sort((a, b) => {
            const aVal = getItemProperty(a, sortProp);
            const bVal = getItemProperty(b, sortProp);
            const cmp = String(aVal).localeCompare(String(bVal));
            return desc ? -cmp : cmp;
          });
        }

      } else if (cmdLower === "group-object" || cmdLower === "group") {
        if (!pipelineData) return { output: "", error: "Group-Object : No pipeline input." };
        const groupProp = stage.params.Property || stage.params.property || (stage.params._positional && stage.params._positional[0]);
        if (groupProp) {
          const groups = {};
          for (const item of pipelineData) {
            const key = getItemProperty(item, groupProp) || "(none)";
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
          }
          const headers = ["Count", "Name", "Group"];
          const rows = Object.entries(groups).map(([name, items]) => [
            String(items.length).padStart(5),
            name,
            `{${items.slice(0, 3).map(i => i.name).join(", ")}${items.length > 3 ? "..." : ""}}`,
          ]);
          const colWidths = headers.map((h, idx) =>
            Math.max(h.length, ...rows.map(r => r[idx].length))
          );
          const sep = colWidths.map(w => "-".repeat(w)).join(" ");
          const headerLine = headers.map((h, idx) => h.padEnd(colWidths[idx])).join(" ");
          const rowLines = rows.map(r => r.map((c, idx) => c.padEnd(colWidths[idx])).join(" "));
          return { output: [headerLine, sep, ...rowLines].join("\n"), error: null };
        }

      } else if (cmdLower === "measure-object" || cmdLower === "measure") {
        if (!pipelineData) return { output: "", error: "Measure-Object : No pipeline input." };
        const count = Array.isArray(pipelineData) ? pipelineData.length : 0;
        return { output: `\nCount    : ${count}\nAverage  : \nSum      : \nMaximum  : \nMinimum  : \nProperty :`, error: null };

      } else if (cmdLower === "get-member" || cmdLower === "gm") {
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

      } else if (cmdLower === "get-location" || cmdLower === "gl" || cmdLower === "pwd") {
        return { output: "\nPath                \n----                \nmaster:\\content\\Home\n", error: null };

      } else if (cmdLower === "show-listview") {
        if (!pipelineData || pipelineData.length === 0) {
          return { output: "", error: "Show-ListView : No pipeline input." };
        }
        const propParam = stage.params.Property || stage.params.property;
        const title = stage.params.Title || stage.params.title || "List View";
        let props = null;
        if (propParam) {
          props = propParam.split(",").map((p) => p.trim());
        }
        let output = `\n  ${title}\n  ${"─".repeat(title.length)}\n\n`;
        if (props) {
          output += formatPropertyTable(pipelineData, props);
        } else {
          output += formatItemTable(pipelineData);
        }
        output += `\n\n  ${pipelineData.length} item(s) displayed.`;
        return { output, error: null };

      } else if (cmdLower === "show-alert") {
        const msg = stage.params.Title || stage.params.title ||
          (stage.params._positional && stage.params._positional[0]) || "";
        ctx.dialogRequests.push({ type: "alert", message: msg });
        return { output: `⚠ Alert: ${msg}`, error: null };

      } else if (cmdLower === "read-variable") {
        // Simulate Read-Variable by capturing parameters and showing them as form output
        const title = stage.params.Title || stage.params.title || "Input";
        const desc = stage.params.Description || stage.params.description || "";
        ctx.dialogRequests.push({ type: "read-variable", title, description: desc });
        return { output: `📋 Dialog: ${title}${desc ? " — " + desc : ""}\n   (In real SPE, this opens an interactive parameter dialog)`, error: null };

      } else if (cmdLower === "close-window") {
        return { output: "", error: null }; // No-op in simulation

      } else if (cmdLower === "write-host" || cmdLower === "write-output") {
        const msg = [
          ...(stage.params._positional || []),
          ...(Object.entries(stage.params)
            .filter(([k]) => k !== "_positional" && k !== "ForegroundColor" && k !== "foregroundcolor")
            .map(([, v]) => v))
        ].join(" ");
        return { output: msg || "", error: null };

      } else if (cmdLower === "new-item") {
        const parentPath = stage.params.Path || stage.params.path || (stage.params._positional && stage.params._positional[0]);
        const name = stage.params.Name || stage.params.name;
        const itemType = stage.params.ItemType || stage.params.itemtype;
        if (!parentPath || !name) {
          return { output: "", error: "New-Item : Missing -Path and/or -Name parameter." };
        }
        const resolved = resolvePath(parentPath);
        if (!resolved) return { output: "", error: `New-Item : Cannot find path '${parentPath}'` };
        // Add to virtual tree
        const newId = `{${crypto.randomUUID ? crypto.randomUUID().toUpperCase() : "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"}}`;
        const templateShort = itemType ? itemType.split("/").pop() : "Item";
        const newNode = {
          _id: newId,
          _template: templateShort,
          _templateFullName: itemType || "System/Item",
          _version: 1,
          _fields: {
            __Updated: new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""),
            __Created: new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""),
            "__Updated by": "sitecore\\admin",
          },
          _children: {},
        };
        resolved.node._children[name] = newNode;
        const newItem = { name, node: newNode, path: resolved.path + "/" + name };
        pipelineData = [newItem];

      } else if (cmdLower === "remove-item") {
        const targetPath = stage.params.Path || stage.params.path || (stage.params._positional && stage.params._positional[0]);
        if (!targetPath && pipelineData) {
          // Remove from pipeline input
          for (const item of pipelineData) {
            removeFromTree(item.path);
          }
          return { output: "", error: null };
        }
        if (targetPath) {
          const resolved = resolvePath(targetPath);
          if (!resolved) return { output: "", error: `Remove-Item : Cannot find path '${targetPath}'` };
          removeFromTree(resolved.path);
        }
        return { output: "", error: null };

      } else if (cmdLower === "move-item") {
        // Move-Item -Path <source> -Destination <target>
        const sourcePath = stage.params.Path || stage.params.path || (stage.params._positional && stage.params._positional[0]);
        const destPath = stage.params.Destination || stage.params.destination || (stage.params._positional && stage.params._positional[1]);
        if (!sourcePath || !destPath) {
          return { output: "", error: "Move-Item : Missing -Path and/or -Destination parameter." };
        }
        const sourceResolved = resolvePath(sourcePath);
        if (!sourceResolved) return { output: "", error: `Move-Item : Cannot find path '${sourcePath}'` };
        const destResolved = resolvePath(destPath);
        if (!destResolved) return { output: "", error: `Move-Item : Cannot find destination '${destPath}'` };
        // Clone node to destination, remove from source
        destResolved.node._children[sourceResolved.name] = sourceResolved.node;
        removeFromTree(sourceResolved.path);
        pipelineData = [{ name: sourceResolved.name, node: sourceResolved.node, path: destResolved.path + "/" + sourceResolved.name }];

      } else if (cmdLower === "copy-item") {
        // Copy-Item -Path <source> -Destination <target>
        const sourcePath = stage.params.Path || stage.params.path || (stage.params._positional && stage.params._positional[0]);
        const destPath = stage.params.Destination || stage.params.destination || (stage.params._positional && stage.params._positional[1]);
        if (!sourcePath || !destPath) {
          return { output: "", error: "Copy-Item : Missing -Path and/or -Destination parameter." };
        }
        const sourceResolved = resolvePath(sourcePath);
        if (!sourceResolved) return { output: "", error: `Copy-Item : Cannot find path '${sourcePath}'` };
        const destResolved = resolvePath(destPath);
        if (!destResolved) return { output: "", error: `Copy-Item : Cannot find destination '${destPath}'` };
        // Deep clone the source node
        const cloned = JSON.parse(JSON.stringify(sourceResolved.node));
        cloned._id = `{${crypto.randomUUID ? crypto.randomUUID().toUpperCase() : "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"}}`;
        destResolved.node._children[sourceResolved.name] = cloned;
        pipelineData = [{ name: sourceResolved.name, node: cloned, path: destResolved.path + "/" + sourceResolved.name }];

      } else if (cmdLower === "rename-item") {
        // Rename-Item -Path <source> -NewName <name>
        const sourcePath = stage.params.Path || stage.params.path || (stage.params._positional && stage.params._positional[0]);
        const newName = stage.params.NewName || stage.params.newname || (stage.params._positional && stage.params._positional[1]);
        if (!newName) {
          return { output: "", error: "Rename-Item : Missing -NewName parameter." };
        }
        // Support pipeline input: Get-Item ... | Rename-Item -NewName "..."
        let targetItem = null;
        let targetPath = null;
        if (pipelineData && pipelineData.length > 0 && !sourcePath) {
          targetItem = pipelineData[0];
          targetPath = targetItem.path;
        } else if (sourcePath) {
          const resolved = resolvePath(sourcePath);
          if (!resolved) return { output: "", error: `Rename-Item : Cannot find path '${sourcePath}'` };
          targetItem = resolved;
          targetPath = resolved.path;
        }
        if (!targetItem || !targetPath) {
          return { output: "", error: "Rename-Item : Missing -Path parameter." };
        }
        // Find parent, remove old key, add with new key
        const parts = targetPath.replace(/^\//, "").split("/").filter(Boolean);
        if (parts.length < 2) return { output: "", error: "Rename-Item : Cannot rename root node." };
        const parentParts = parts.slice(0, -1);
        const oldName = parts[parts.length - 1];
        let parent = null;
        for (const part of parentParts) {
          if (!parent) {
            if (part.toLowerCase() === "sitecore") parent = VIRTUAL_TREE.sitecore;
            else return { output: "", error: "Rename-Item : Invalid path." };
          } else {
            const match = Object.keys(parent._children || {}).find(k => k.toLowerCase() === part.toLowerCase());
            if (match) parent = parent._children[match];
            else return { output: "", error: "Rename-Item : Parent not found." };
          }
        }
        if (parent && parent._children) {
          const matchKey = Object.keys(parent._children).find(k => k.toLowerCase() === oldName.toLowerCase());
          if (matchKey) {
            const node = parent._children[matchKey];
            delete parent._children[matchKey];
            parent._children[newName] = node;
            const newPath = "/" + parentParts.join("/") + "/" + newName;
            pipelineData = [{ name: newName, node, path: newPath }];
          }
        }

      } else {
        return {
          output: "",
          error: `${stage.cmdlet} : The term '${stage.cmdlet}' is not recognized. Supported commands: Get-Item, Get-ChildItem, Where-Object, ForEach-Object, Select-Object, Sort-Object, Group-Object, Measure-Object, Get-Member, Show-ListView, New-Item, Remove-Item, Move-Item, Copy-Item, Rename-Item, Write-Host, Show-Alert, Read-Variable`,
        };
      }
    } catch (err) {
      return { output: "", error: `Error executing ${stage.cmdlet}: ${err.message}` };
    }
  }

  // Format output
  if (!pipelineData) return { output: "", error: null, pipelineData: null };
  if (typeof pipelineData === "string") return { output: pipelineData, error: null, pipelineData };

  const selectedProps = pipelineData._selectedProperties;
  if (selectedProps) {
    return { output: formatPropertyTable(pipelineData, selectedProps), error: null, pipelineData };
  }
  return { output: formatItemTable(pipelineData), error: null, pipelineData };
}

// Helper to remove a node from the virtual tree by path
function removeFromTree(pathStr) {
  const parts = pathStr.replace(/^\//, "").split("/").filter(Boolean);
  if (parts.length < 2) return;
  const parentParts = parts.slice(0, -1);
  const childName = parts[parts.length - 1];
  let current = null;
  for (const part of parentParts) {
    if (!current) {
      if (part.toLowerCase() === "sitecore") current = VIRTUAL_TREE.sitecore;
      else return;
    } else {
      const match = Object.keys(current._children || {}).find(k => k.toLowerCase() === part.toLowerCase());
      if (match) current = current._children[match];
      else return;
    }
  }
  if (current && current._children) {
    const match = Object.keys(current._children).find(k => k.toLowerCase() === childName.toLowerCase());
    if (match) delete current._children[match];
  }
}

// Backward-compatible wrapper — single command execution without context
function executeCommand(input) {
  const ctx = new ScriptContext();
  return executeCommandWithContext(input, ctx);
}

// ============================================================================
// LESSON DEFINITIONS
// ============================================================================
const LESSONS = [
  {
    id: "welcome",
    module: "Foundations",
    order: 0,
    title: "Welcome to SPE",
    difficulty: "intro",
    description: `**Sitecore PowerShell Extensions** (SPE) gives you a command-line interface directly inside Sitecore. Think of it as having a PowerShell console that speaks Sitecore natively.

In this tutorial, you'll work with a **simulated Sitecore content tree** — no real instance required. The commands you learn here work exactly the same in a real SPE console.

The simulated tree looks like this:

\`\`\`
sitecore/
  content/
    Home/
      About/
        Team
        History
      Products/
        Product A
        Product B
        Product C
      News/
        2025 Roadmap
        Sitecore Launch
\`\`\`

Let's start with the most fundamental command in SPE.`,
    tasks: [
      {
        instruction:
          'Use `Get-Item` to retrieve the Home item. The path format is: `master:\\content\\Home`',
        hint: 'Type: Get-Item -Path "master:\\content\\Home"',
        validation: {
          type: "structural",
          cmdlet: "get-item",
          requirePath: ["master:\\content\\home", "master:\\content\\Home", "master:/content/Home"],
        },
        successMessage:
          "You just retrieved your first Sitecore item. Notice the output shows the item Name, whether it has Children, the Language, Version number, its ID (a GUID in braces), and its TemplateName.",
      },
    ],
  },
  {
    id: "get-children",
    module: "Foundations",
    order: 1,
    title: "Navigating the Content Tree",
    difficulty: "beginner",
    description: `Now that you can retrieve a single item, let's explore the tree. \`Get-ChildItem\` returns the direct children of an item — just like \`dir\` or \`ls\` in a filesystem.

In Sitecore terms, if Home has child pages like About, Products, and News, \`Get-ChildItem\` will return those three items.`,
    tasks: [
      {
        instruction:
          'Use `Get-ChildItem` to list the children of the Home item.',
        hint: 'Type: Get-ChildItem -Path "master:\\content\\Home"',
        validation: {
          type: "structural",
          cmdlet: "get-childitem",
          requirePath: ["master:\\content\\home", "master:\\content\\Home", "master:/content/Home"],
        },
        successMessage:
          "You can see Home has three children: About, Products, and News. Notice that Products and News show Children=True, meaning they have sub-items too.",
      },
      {
        instruction:
          "Now add the `-Recurse` switch to get ALL descendants, not just direct children.",
        hint: 'Type: Get-ChildItem -Path "master:\\content\\Home" -Recurse',
        validation: {
          type: "structural",
          cmdlet: "get-childitem",
          requireSwitch: "recurse",
        },
        successMessage:
          "With `-Recurse`, you get the entire subtree. In a real Sitecore instance, be careful with this on large trees — it can be slow. We'll cover performance best practices later.",
      },
    ],
  },
  {
    id: "pipeline-basics",
    module: "Foundations",
    order: 2,
    title: "The Pipeline",
    difficulty: "beginner",
    description: `PowerShell's killer feature is the **pipeline** — chaining commands together with \`|\`. Each command passes its output to the next.

This works identically in SPE. You can pipe Sitecore items through \`Where-Object\` to filter, \`Select-Object\` to pick properties, and \`Sort-Object\` to order results.

The pattern: **Get items → Filter → Select properties → Sort**`,
    tasks: [
      {
        instruction:
          "Get all descendants of Home and pipe to `Measure-Object` to count them.",
        hint: 'Type: Get-ChildItem -Path "master:\\content\\Home" -Recurse | Measure-Object',
        validation: {
          type: "pipeline",
          stages: ["get-childitem", "measure-object"],
        },
        successMessage:
          "The count shows all items in the subtree. `Measure-Object` is your go-to for quick counts.",
      },
      {
        instruction:
          'Filter the descendants to only show items using the "Folder" template. Use `Where-Object` with `$_.TemplateName -eq "Folder"`.',
        hint: 'Get-ChildItem -Path "master:\\content\\Home" -Recurse | Where-Object { $_.TemplateName -eq "Folder" }',
        validation: {
          type: "pipeline",
          stages: ["get-childitem", "where-object"],
          outputContains: "Folder",
          outputNotContains: "Sample Item",
        },
        successMessage:
          'Filtering with `Where-Object` (alias `?`) is how you narrow down results. The `$_` variable represents the current item in the pipeline — same as in regular PowerShell. Note that `TemplateName` returns the short name (e.g. "Folder", not "Common/Folder"). Use `Template.FullName` for the full path.',
      },
      {
        instruction:
          'Now get all recursive children of Home, select only the `Name`, `Id`, and `__Updated` properties, and sort by `Name`.',
        hint: 'Get-ChildItem -Path "master:\\content\\Home" -Recurse | Select-Object -Property Name,Id,__Updated | Sort-Object -Property Name',
        validation: {
          type: "pipeline",
          stages: ["get-childitem", "select-object", "sort-object"],
        },
        successMessage:
          "This pattern — Get → Select → Sort — is one you'll use constantly in SPE for reporting and auditing content.",
      },
    ],
  },
  {
    id: "filtering-deep",
    module: "Foundations",
    order: 3,
    title: "Filtering & Wildcards",
    difficulty: "beginner",
    description: `\`Where-Object\` supports several comparison operators. The most useful for Sitecore work:

• \`-eq\` — exact match (case-insensitive)
• \`-ne\` — not equal
• \`-like\` — wildcard match (\`*\` = any characters, \`?\` = single character)
• \`-match\` — regex match

These operators let you build powerful content queries without writing Sitecore Query or LINQ.`,
    tasks: [
      {
        instruction:
          'Find all items under Home whose Name contains "Product" using the `-like` operator with wildcards.',
        hint: 'Get-ChildItem -Path "master:\\content\\Home" -Recurse | Where-Object { $_.Name -like "*Product*" }',
        validation: {
          type: "pipeline",
          stages: ["get-childitem", "where-object"],
          outputContains: "Product",
        },
        successMessage:
          "Wildcard matching with `-like` is perfect for finding items by naming convention — a very common Sitecore pattern.",
      },
      {
        instruction:
          "Now use `Get-Item` to retrieve the Products folder, then pipe it to `Get-Member` to inspect what properties and methods are available on a Sitecore item.",
        hint: 'Get-Item -Path "master:\\content\\Home\\Products" | Get-Member',
        validation: {
          type: "pipeline",
          stages: ["get-item", "get-member"],
        },
        successMessage:
          "`Get-Member` reveals the full API surface of a Sitecore item. In a real instance, you'd see hundreds of members — fields, properties, and methods from the Sitecore API. This is how you discover what's possible.",
      },
    ],
  },
  {
    id: "provider-paths",
    module: "Foundations",
    order: 4,
    title: "Provider Paths & Drives",
    difficulty: "beginner",
    description: `SPE uses a **provider** to make Sitecore databases look like drives. The three main drives are:

• \`master:\` — the editing/authoring database
• \`web:\` — the published/delivery database  
• \`core:\` — Sitecore's system database

Paths work like filesystem paths: \`master:\\content\\Home\\About\` points to the About item under Home in the master database.

**Key insight:** The \`/sitecore\` prefix in paths is optional. These are equivalent:
\`\`\`
master:\\content\\Home
master:\\sitecore\\content\\Home
\`\`\`

In this simulation, all paths resolve against the master database.`,
    tasks: [
      {
        instruction:
          "Retrieve the About item by navigating the full path through Home.",
        hint: 'Get-Item -Path "master:\\content\\Home\\About"',
        validation: {
          type: "structural",
          cmdlet: "get-item",
          requirePath: [
            "master:\\content\\Home\\About",
            "master:\\content\\home\\about",
            "master:/content/Home/About",
          ],
        },
        successMessage:
          "Path navigation is intuitive — it mirrors the content tree structure you see in Sitecore's Content Editor.",
      },
      {
        instruction:
          "Get the children of the About item to see what's nested under it.",
        hint: 'Get-ChildItem -Path "master:\\content\\Home\\About"',
        validation: {
          type: "structural",
          cmdlet: "get-childitem",
          requirePath: [
            "master:\\content\\Home\\About",
            "master:\\content\\home\\about",
            "master:/content/Home/About",
          ],
        },
        successMessage:
          'Team and History are nested under About. You now know how to navigate any depth of the content tree. In real projects, you\'d use these patterns to script bulk operations across entire site sections.',
      },
    ],
  },
  {
    id: "ise-intro",
    module: "ISE Scripting",
    order: 5,
    title: "The Scripting Environment",
    difficulty: "intermediate",
    mode: "ise",
    description: `You've been working in the **SPE Console** — great for one-liners. Now let's switch to the **ISE** (Integrated Scripting Environment), where you write multi-line scripts.

In real Sitecore, you access the ISE from: **Sitecore → Development Tools → PowerShell ISE**

The ISE lets you write a complete script, hit **Run**, and see all the output at once. This is how most real SPE work gets done — reporting, bulk operations, content auditing.

**\`Show-ListView\`** is one of SPE's most powerful commands. It takes pipeline input and renders it as an interactive report table with filtering, sorting, and export capabilities.`,
    tasks: [
      {
        instruction:
          `Write a multi-line script that:
1. Gets all recursive children of Home
2. Filters to only "Sample Item" templates
3. Pipes to \`Show-ListView\` with \`-Property Name,ItemPath,__Updated\`

The script should be 3 lines — one per pipeline stage, piped together.`,
        hint: `Get-ChildItem -Path "master:\\content\\Home" -Recurse |
    Where-Object { $_.TemplateName -eq "Sample Item" } |
    Show-ListView -Property Name,ItemPath,__Updated`,
        starterCode: `# Get all items, filter by template, display as report
Get-ChildItem -Path "master:\\content\\Home" -Recurse |
    Where-Object { $_.TemplateName -eq "" } |
    Show-ListView -Property Name,ItemPath,__Updated`,
        validation: {
          type: "pipeline",
          stages: ["get-childitem", "where-object", "show-listview"],
          outputContains: "item(s) displayed",
        },
        successMessage:
          "You just built your first SPE report! In real Sitecore, `Show-ListView` opens an interactive window with filtering, sorting, and export to CSV/Excel/JSON. This pattern — Get → Filter → Report — is the foundation of all SPE content auditing.",
      },
      {
        instruction:
          `Now write a script that creates a sorted report of all items showing \`Name\`, \`TemplateName\`, and \`__Updated\`, sorted by the \`__Updated\` field.

Pipe through \`Sort-Object\` before \`Show-ListView\`.`,
        hint: `Get-ChildItem -Path "master:\\content\\Home" -Recurse |
    Sort-Object -Property __Updated |
    Show-ListView -Property Name,TemplateName,__Updated`,
        starterCode: `# Audit report: all items sorted by last update date
Get-ChildItem -Path "master:\\content\\Home" -Recurse |
    Sort-Object -Property __Updated |
    Show-ListView -Property Name,TemplateName,__Updated`,
        validation: {
          type: "pipeline",
          stages: ["get-childitem", "sort-object", "show-listview"],
          outputContains: "item(s) displayed",
        },
        successMessage:
          "Sorting before `Show-ListView` controls the initial display order. In real Sitecore, users can also re-sort by clicking column headers in the ListView window.",
      },
    ],
  },
  {
    id: "variables",
    module: "ISE Scripting",
    order: 6,
    title: "Variables & Collections",
    difficulty: "intermediate",
    mode: "ise",
    description: `In real SPE scripts, you almost always store results in **variables** before processing them. This lets you reuse data, check counts, and build multi-step workflows.

Variable syntax is the same as standard PowerShell:
\`\`\`
$items = Get-ChildItem -Path "master:\\content\\Home" -Recurse
$items.Count
$items | Where-Object { $_.TemplateName -eq "Folder" }
\`\`\`

Variables persist across lines within a script — assign once, use many times.`,
    tasks: [
      {
        instruction:
          `Store all recursive children of Home in a variable called \`$items\`, then on the next line pipe \`$items\` to \`Measure-Object\` to count them.`,
        hint: `$items = Get-ChildItem -Path "master:\\content\\Home" -Recurse
$items | Measure-Object`,
        starterCode: `# Store items in a variable, then count them
$items = Get-ChildItem -Path "master:\\content\\Home" -Recurse
$items | Measure-Object`,
        validation: {
          type: "pipeline",
          stages: ["measure-object"],
          outputContains: "Count",
        },
        successMessage:
          "Variables let you capture a result set once and reuse it multiple times. This avoids hitting the content tree repeatedly — important for performance in real Sitecore.",
      },
      {
        instruction:
          `Now write a script that:
1. Stores all descendants of Home in \`$allItems\`
2. Filters to only "Folder" templates and stores in \`$folders\`
3. Displays \`$folders\` with \`Show-ListView\``,
        hint: `$allItems = Get-ChildItem -Path "master:\\content\\Home" -Recurse
$folders = $allItems | Where-Object { $_.TemplateName -eq "Folder" }
$folders | Show-ListView -Property Name,ItemPath,TemplateName`,
        starterCode: `# Multi-step filtering with variables
$allItems = Get-ChildItem -Path "master:\\content\\Home" -Recurse
$folders = $allItems | Where-Object { $_.TemplateName -eq "Folder" }
$folders | Show-ListView -Property Name,ItemPath,TemplateName`,
        validation: {
          type: "pipeline",
          stages: ["show-listview"],
          outputContains: "Folder",
        },
        successMessage:
          "This multi-step pattern is how most real SPE reports work: gather data → filter → present. Each variable is a checkpoint you can inspect in the console if something looks wrong.",
      },
    ],
  },
  {
    id: "foreach-object",
    module: "ISE Scripting",
    order: 7,
    title: "ForEach-Object & Iteration",
    difficulty: "intermediate",
    mode: "ise",
    description: `\`ForEach-Object\` (alias \`%\`) lets you execute a script block against every item in the pipeline. The current item is accessed via \`$_\`.

This is how you process items one at a time — reading properties, building output strings, or performing operations on each item.

\`\`\`
$items | ForEach-Object { Write-Host $_.Name }
\`\`\`

Combined with \`Where-Object\`, it's the core of every SPE bulk operation.`,
    tasks: [
      {
        instruction:
          `Get all children of Home and use \`ForEach-Object\` to output each item's Name and TemplateName as a formatted string.`,
        hint: `Get-ChildItem -Path "master:\\content\\Home" |
    ForEach-Object { Write-Host "$($_.Name) [$($_.TemplateName)]" }`,
        starterCode: `# Iterate over items and output formatted info
Get-ChildItem -Path "master:\\content\\Home" |
    ForEach-Object { Write-Host "$($_.Name) [$($_.TemplateName)]" }`,
        validation: {
          type: "pipeline",
          stages: ["get-childitem", "foreach-object"],
        },
        successMessage:
          "`ForEach-Object` is your workhorse for item-by-item processing. In real SPE, you'd use this for bulk field updates, publishing operations, and data transformation.",
      },
      {
        instruction:
          `Write a script that:
1. Gets all recursive children of Home
2. Groups them by TemplateName using \`Group-Object\`

This shows you the distribution of templates in a content tree — a common audit pattern.`,
        hint: `Get-ChildItem -Path "master:\\content\\Home" -Recurse |
    Group-Object -Property TemplateName`,
        starterCode: `# Audit: what templates are used in the content tree?
Get-ChildItem -Path "master:\\content\\Home" -Recurse |
    Group-Object -Property TemplateName`,
        validation: {
          type: "pipeline",
          stages: ["get-childitem", "group-object"],
        },
        successMessage:
          "`Group-Object` is perfect for content auditing — quickly see how many items use each template, who last updated them, or which language versions exist.",
      },
    ],
  },
  {
    id: "content-reports",
    module: "Real-World Patterns",
    order: 8,
    title: "Content Audit Reports",
    difficulty: "advanced",
    mode: "ise",
    description: `Now let's build scripts based on the **real reports included with SPE**. These are found in the Sitecore content tree under:

\`/sitecore/system/Modules/PowerShell/Script Library/SPE/Reporting/Content Reports\`

The standard pattern for a content report is:

1. **Gather** — Get items from the content tree
2. **Filter** — Apply criteria (template, date, field values)
3. **Sort** — Order the results meaningfully
4. **Present** — Display with \`Show-ListView\` or export

Many built-in reports also use \`Read-Variable\` to collect parameters from the user before running (e.g., "how many days back?"). In our simulation, we'll show how this would work.`,
    tasks: [
      {
        instruction:
          `Build a "Recently Modified Items" report. This mirrors the real SPE report from the repo.

Get all descendants of Home, filter to items where \`__Updated\` is not empty, sort by \`__Updated\` descending (most recent first), then display with \`Show-ListView\`.`,
        hint: `$items = Get-ChildItem -Path "master:\\content\\Home" -Recurse
$items |
    Sort-Object -Property __Updated -Descending |
    Show-ListView -Property Name,ItemPath,__Updated,"__Updated by" -Title "Recently Modified Items"`,
        starterCode: `# Content Report: Recently Modified Items
# Based on SPE/Reporting/Content Reports/Reports/Content Audit
$items = Get-ChildItem -Path "master:\\content\\Home" -Recurse
$items |
    Sort-Object -Property __Updated -Descending |
    Show-ListView -Property Name,ItemPath,__Updated,"__Updated by" -Title "Recently Modified Items"`,
        validation: {
          type: "pipeline",
          stages: ["sort-object", "show-listview"],
          outputContains: "Recently Modified",
        },
        successMessage:
          'This is essentially what the built-in "Recently Modified" report does. In the real script, `Read-Variable` would first ask the user to select a root path and number of days.',
      },
      {
        instruction:
          `Now build an "Items by Template" audit. Store items in a variable, group by TemplateName, then display a report showing the template distribution.

Bonus: Use \`Show-Alert\` at the end to show a summary message with the total count.`,
        hint: `$items = Get-ChildItem -Path "master:\\content\\Home" -Recurse
$items | Group-Object -Property TemplateName
Show-Alert -Title "Audit complete: found $($items.Count) items"`,
        starterCode: `# Content Report: Template Distribution Audit
$items = Get-ChildItem -Path "master:\\content\\Home" -Recurse
$items | Group-Object -Property TemplateName
Show-Alert -Title "Audit complete"`,
        validation: {
          type: "pipeline",
          stages: ["get-childitem", "group-object"],
        },
        successMessage:
          "Template auditing is one of the most common SPE use cases. This pattern helps you understand the content model of any Sitecore site — essential when inheriting an unfamiliar codebase.",
      },
    ],
  },
  {
    id: "creating-items",
    module: "Item Manipulation",
    order: 9,
    title: "Creating & Removing Items",
    difficulty: "intermediate",
    mode: "ise",
    description: `\`New-Item\` creates Sitecore items. You specify where (\`-Path\`), what to call it (\`-Name\`), and what template to use (\`-ItemType\`).

\`\`\`
New-Item -Path "master:\\content\\Home" -Name "My Page" -ItemType "Sample/Sample Item"
\`\`\`

**\`-ItemType\`** uses the template's full path (matching \`Template.FullName\`), not the short name.

\`Remove-Item\` deletes items. In real SPE, add \`-Permanently\` to skip the recycle bin.

**Important:** These commands mutate the content tree in our simulation. You'll see the changes reflected in the Content Tree panel.`,
    tasks: [
      {
        instruction:
          `Create a new item called "Contact Us" under the About section, using the "Sample/Sample Item" template. Then verify it was created by listing About's children.`,
        hint: `New-Item -Path "master:\\content\\Home\\About" -Name "Contact Us" -ItemType "Sample/Sample Item"
Get-ChildItem -Path "master:\\content\\Home\\About"`,
        starterCode: `# Create a new page under About
New-Item -Path "master:\\content\\Home\\About" -Name "Contact Us" -ItemType "Sample/Sample Item"

# Verify - list children of About
Get-ChildItem -Path "master:\\content\\Home\\About"`,
        validation: {
          type: "pipeline",
          stages: ["new-item", "get-childitem"],
          outputContains: "Contact Us",
        },
        successMessage:
          "The new item appears in the tree with its own ID and version 1. In real Sitecore, `New-Item` also supports `-Language` for creating specific language versions and you can pipe items to set field values immediately after creation.",
      },
      {
        instruction:
          `Now remove the item you just created. Use \`Remove-Item\` with the full path, then verify it's gone.`,
        hint: `Remove-Item -Path "master:\\content\\Home\\About\\Contact Us"
Get-ChildItem -Path "master:\\content\\Home\\About"`,
        starterCode: `# Remove the Contact Us page
Remove-Item -Path "master:\\content\\Home\\About\\Contact Us"

# Verify - should only show Team and History
Get-ChildItem -Path "master:\\content\\Home\\About"`,
        validation: {
          type: "pipeline",
          stages: ["remove-item", "get-childitem"],
          outputNotContains: "Contact Us",
        },
        successMessage:
          "The item is gone. In real SPE, `Remove-Item` sends items to the recycle bin by default. Add `-Permanently` to bypass it. You can also pipe items: `Get-Item ... | Remove-Item`.",
      },
    ],
  },
  {
    id: "moving-copying",
    module: "Item Manipulation",
    order: 10,
    title: "Moving, Copying & Renaming",
    difficulty: "intermediate",
    mode: "ise",
    description: `Three commands for reorganizing content:

**\`Move-Item\`** — moves an item (and its subtree) to a new parent:
\`\`\`
Move-Item -Path "master:\\content\\Home\\About\\Team" -Destination "master:\\content\\Home\\Products"
\`\`\`

**\`Copy-Item\`** — duplicates an item to a new location (new ID assigned):
\`\`\`
Copy-Item -Path "master:\\content\\Home\\About\\Team" -Destination "master:\\content\\Home\\News"
\`\`\`

**\`Rename-Item\`** — changes an item's name in place:
\`\`\`
Get-Item -Path "master:\\content\\Home\\About\\Team" | Rename-Item -NewName "Our People"
\`\`\`

These operations are common during content restructuring and site migrations.`,
    tasks: [
      {
        instruction:
          `Copy the "Team" item from under About to under News. Then list the children of News to confirm it's there alongside the existing news items.`,
        hint: `Copy-Item -Path "master:\\content\\Home\\About\\Team" -Destination "master:\\content\\Home\\News"
Get-ChildItem -Path "master:\\content\\Home\\News"`,
        starterCode: `# Copy Team into the News section
Copy-Item -Path "master:\\content\\Home\\About\\Team" -Destination "master:\\content\\Home\\News"

# Verify the copy
Get-ChildItem -Path "master:\\content\\Home\\News"`,
        validation: {
          type: "pipeline",
          stages: ["copy-item", "get-childitem"],
          outputContains: "Team",
        },
        successMessage:
          "The copied item gets a new ID — it's a fully independent item, not a clone. The original under About is untouched. In real SPE, add `-Recurse` to copy an entire subtree.",
      },
      {
        instruction:
          `Rename the "History" item under About to "Our Story" using the pipeline pattern: \`Get-Item | Rename-Item\`. Then verify with \`Get-ChildItem\`.`,
        hint: `Get-Item -Path "master:\\content\\Home\\About\\History" | Rename-Item -NewName "Our Story"
Get-ChildItem -Path "master:\\content\\Home\\About"`,
        starterCode: `# Rename History to Our Story
Get-Item -Path "master:\\content\\Home\\About\\History" | Rename-Item -NewName "Our Story"

# Verify
Get-ChildItem -Path "master:\\content\\Home\\About"`,
        validation: {
          type: "pipeline",
          stages: ["get-item", "rename-item", "get-childitem"],
          outputContains: "Our Story",
        },
        successMessage:
          "Renaming preserves the item's ID, fields, and children — only the name changes. The pipeline pattern (`Get-Item | Rename-Item`) is idiomatic SPE and works with all item manipulation commands.",
      },
      {
        instruction:
          `Finally, move "Product C" from Products to the About section. Verify by listing both Products and About children.`,
        hint: `Move-Item -Path "master:\\content\\Home\\Products\\Product C" -Destination "master:\\content\\Home\\About"
Get-ChildItem -Path "master:\\content\\Home\\Products"
Get-ChildItem -Path "master:\\content\\Home\\About"`,
        starterCode: `# Move Product C into About
Move-Item -Path "master:\\content\\Home\\Products\\Product C" -Destination "master:\\content\\Home\\About"

# Verify both locations
Write-Host "--- Products ---"
Get-ChildItem -Path "master:\\content\\Home\\Products"
Write-Host "--- About ---"
Get-ChildItem -Path "master:\\content\\Home\\About"`,
        validation: {
          type: "pipeline",
          stages: ["move-item"],
        },
        successMessage:
          "Move preserves the item's ID and all properties — it's the same item in a new location. This is how content restructuring works in SPE. Combined with `-Recurse` on Get-ChildItem and ForEach-Object, you can reorganize entire site sections programmatically.",
      },
    ],
  },
];

// ============================================================================
// VALIDATION ENGINE
// ============================================================================
function validateTask(input, task) {
  const v = task.validation;
  
  // For multi-line scripts, we need to find the pipeline to validate.
  // Strategy: split into logical statements, skip assignments and comments,
  // then find the last pipeline (which is typically the output/display command).
  const lines = input.split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"));
  
  // Join continuation lines (ending with |)
  const statements = [];
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
  const pipelines = [];
  for (const stmt of statements) {
    if (/^\$\w+\s*=/.test(stmt)) {
      // It's an assignment — extract the RHS as a potential pipeline too
      const rhs = stmt.replace(/^\$\w+\s*=\s*/, "");
      if (rhs) pipelines.push(rhs);
    } else {
      // Strip leading $variable | from pipeline starts
      const stripped = stmt.replace(/^\$\w+\s*\|\s*/, "");
      pipelines.push(stripped || stmt);
    }
  }
  
  // For validation, collect ALL pipeline stages across all statements
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
    const mainStage = stages[0];
    if (mainStage.cmdlet.toLowerCase() !== v.cmdlet) {
      return {
        passed: false,
        feedback: `Try using \`${v.cmdlet.charAt(0).toUpperCase() + v.cmdlet.slice(1).replace(/(item|childitem|object|member)/i, (m) => m.charAt(0).toUpperCase() + m.slice(1))}\` for this task.`,
        partial: ["You entered a valid command"],
      };
    }
    if (v.requirePath) {
      // Resolve what the user's path actually points to
      const userPath =
        mainStage.params.Path ||
        mainStage.params.path ||
        (mainStage.params._positional && mainStage.params._positional[0]) ||
        ".";
      const userResolved = resolvePath(userPath);

      // Resolve what the expected paths point to
      const expectedResolved = v.requirePath
        .map((p) => resolvePath(p))
        .filter(Boolean);

      if (!userResolved) {
        return {
          passed: false,
          feedback: `The path you specified doesn't resolve to a valid item. Check your path.`,
          partial: ["Correct cmdlet"],
        };
      }

      const matches = expectedResolved.some(
        (e) => e.node._id === userResolved.node._id
      );
      if (!matches) {
        return {
          passed: false,
          feedback: `Your command resolved to the wrong item. Check your path.`,
          partial: ["Correct cmdlet"],
        };
      }
    }
    if (v.requireSwitch) {
      const hasSwitch = mainStage.switches.some(
        (s) => s.toLowerCase() === v.requireSwitch.toLowerCase()
      );
      if (!hasSwitch) {
        return {
          passed: false,
          feedback: `Don't forget the \`-${v.requireSwitch.charAt(0).toUpperCase() + v.requireSwitch.slice(1)}\` switch.`,
          partial: ["Correct cmdlet", "Correct path"],
        };
      }
    }
  }

  // Pipeline validation
  if (v.type === "pipeline") {
    // Collect all cmdlet names from the full script (across all statements)
    const allCmdlets = allStages.map(s => s.cmdlet.toLowerCase());
    
    // Build alias lookup
    const aliases = {
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
    };
    
    // Check that each expected stage appears somewhere in the script
    for (let i = 0; i < v.stages.length; i++) {
      const expected = v.stages[i];
      const validNames = aliases[expected] || [expected];
      const found = allCmdlets.some(cmd => validNames.includes(cmd));
      if (!found) {
        return {
          passed: false,
          feedback: `Your script should include \`${expected.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("-")}\`.`,
          partial: v.stages.slice(0, i).filter(s => {
            const vn = aliases[s] || [s];
            return allCmdlets.some(cmd => vn.includes(cmd));
          }).map(s => `✓ ${s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("-")}`),
        };
      }
    }

    // Check output constraints if specified — run full script for ISE mode
    if (v.outputContains || v.outputNotContains) {
      const result = executeScript(input);
      if (v.outputContains && !result.output.includes(v.outputContains)) {
        return {
          passed: false,
          feedback: `Your script runs, but the output doesn't match what's expected. Check your filter criteria.`,
          partial: ["Correct pipeline structure"],
        };
      }
      if (v.outputNotContains && result.output.includes(v.outputNotContains)) {
        return {
          passed: false,
          feedback: `Your filter isn't specific enough — unwanted items are getting through.`,
          partial: ["Correct pipeline structure"],
        };
      }
    }
  }

  return { passed: true };
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Syntax highlighter for PowerShell
function HighlightedCode({ code }) {
  const keywords = /\b(Get-Item|Get-ChildItem|Where-Object|Select-Object|Sort-Object|Measure-Object|Get-Member|ForEach-Object|New-Item|Remove-Item|Move-Item|Copy-Item|Set-Item|Get-Help|Get-Command)\b/gi;
  const params = /\s(-\w+)/g;
  const strings = /("[^"]*"|'[^']*')/g;
  const pipes = /(\|)/g;
  const variables = /(\$_?\.\w+|\$\w+)/g;
  const braces = /([{}])/g;

  let html = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(strings, '<span style="color:#a5d6a7">$1</span>');
  html = html.replace(keywords, '<span style="color:#90caf9;font-weight:600">$1</span>');
  html = html.replace(params, ' <span style="color:#ce93d8">$1</span>');
  html = html.replace(pipes, '<span style="color:#ffcc80;font-weight:700">$1</span>');
  html = html.replace(variables, '<span style="color:#ef9a9a">$1</span>');
  html = html.replace(braces, '<span style="color:#fff59d">$1</span>');

  return (
    <code
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace", fontSize: 13 }}
    />
  );
}

function MarkdownLite({ text }) {
  // Very simple markdown: **bold**, `code`, ```blocks```, headers, bullet lists
  const lines = text.split("\n");
  const elements = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let key = 0;

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={key++}
            style={{
              background: "#1a1a2e",
              padding: "12px 16px",
              borderRadius: 6,
              overflowX: "auto",
              margin: "8px 0",
              fontSize: 13,
              lineHeight: 1.5,
              border: "1px solid #2a2a4a",
            }}
          >
            <code style={{ color: "#c5c8d4", fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace" }}>
              {codeBuffer.join("\n")}
            </code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (line.trim() === "") {
      elements.push(<div key={key++} style={{ height: 8 }} />);
      continue;
    }

    // Process inline formatting
    let processed = line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, '<code style="background:#1a1a2e;padding:2px 6px;border-radius:3px;font-family:\'JetBrains Mono\',monospace;font-size:12.5px;color:#90caf9;border:1px solid #2a2a4a">$1</code>');

    if (line.startsWith("• ") || line.startsWith("- ")) {
      processed = processed.replace(/^[•-]\s/, "");
      elements.push(
        <div
          key={key++}
          style={{ paddingLeft: 16, position: "relative", lineHeight: 1.65, marginBottom: 2 }}
        >
          <span style={{ position: "absolute", left: 0, color: "#5c6bc0" }}>•</span>
          <span dangerouslySetInnerHTML={{ __html: processed }} />
        </div>
      );
    } else {
      elements.push(
        <p
          key={key++}
          style={{ margin: "4px 0", lineHeight: 1.65 }}
          dangerouslySetInnerHTML={{ __html: processed }}
        />
      );
    }
  }

  return <div>{elements}</div>;
}

// ============================================================================
// MAIN APP
// ============================================================================
export default function SPETutorial() {
  const [currentLesson, setCurrentLesson] = useState(0);
  const [currentTask, setCurrentTask] = useState(0);
  const [code, setCode] = useState("");
  const [consoleOutput, setConsoleOutput] = useState([]);
  const [completedTasks, setCompletedTasks] = useState({});
  const [showHint, setShowHint] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showTreePanel, setShowTreePanel] = useState(false);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [editorHeight, setEditorHeight] = useState(250);
  const inputRef = useRef(null);
  const consoleEndRef = useRef(null);
  const isDragging = useRef(false);
  const editorPaneRef = useRef(null);

  const lesson = LESSONS[currentLesson];
  const task = lesson?.tasks?.[currentTask];
  const isISE = lesson?.mode === "ise";
  const totalTasks = LESSONS.reduce((sum, l) => sum + l.tasks.length, 0);
  const completedCount = Object.keys(completedTasks).length;

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleOutput]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentLesson, currentTask]);

  // Reset editor and output when switching lessons or tasks
  useEffect(() => {
    setConsoleOutput([]);
    setShowHint(false);
    if (isISE && task?.starterCode) {
      setCode(task.starterCode);
    } else if (isISE) {
      setCode("# Write your script here\n");
    } else {
      setCode("");
    }
  }, [currentLesson, currentTask]);

  // Drag resize for ISE editor pane
  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current || !editorPaneRef.current) return;
      const containerRect = editorPaneRef.current.parentElement.getBoundingClientRect();
      const newHeight = e.clientY - editorPaneRef.current.getBoundingClientRect().top;
      const clamped = Math.max(100, Math.min(newHeight, containerRect.height - 100));
      setEditorHeight(clamped);
    };
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleRun = useCallback(() => {
    if (!code.trim()) return;
    const taskKey = `${currentLesson}-${currentTask}`;

    const newOutput = isISE
      ? [...consoleOutput]
      : [...consoleOutput, { type: "command", text: code.trim() }];

    if (isISE) {
      newOutput.push({ type: "script", text: code.trim() });
    }

    // Execute — multi-line with variable scope for ISE, single command for REPL
    let result;
    if (isISE) {
      result = executeScript(code);
    } else {
      const normalized = code.split("\n")
        .map(l => l.trim())
        .filter(l => l && !l.startsWith("#"))
        .join(" ");
      result = executeCommand(normalized);
    }

    if (result.error) {
      newOutput.push({ type: "error", text: result.error });
    } else if (result.output) {
      newOutput.push({ type: "output", text: result.output });
    }

    // Validate against current task
    if (task) {
      const validation = validateTask(code.trim(), task);
      if (validation.passed) {
        newOutput.push({
          type: "success",
          text: `✓ ${task.successMessage || "Correct!"}`,
        });
        setCompletedTasks((prev) => ({ ...prev, [taskKey]: true }));
      } else {
        newOutput.push({
          type: "hint",
          text: validation.feedback,
        });
        if (validation.partial) {
          newOutput.push({
            type: "partial",
            text: validation.partial.join(" → "),
          });
        }
      }
    }

    setConsoleOutput(newOutput);
    if (!isISE) {
      setCommandHistory((prev) => [...prev, code.trim()]);
      setHistoryIndex(-1);
      setCode("");
    }
    setShowHint(false);
  }, [code, consoleOutput, currentLesson, currentTask, task, isISE]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleRun();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const newIndex = historyIndex === -1
        ? commandHistory.length - 1
        : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setCode(commandHistory[newIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      const newIndex = historyIndex + 1;
      if (newIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setCode("");
      } else {
        setHistoryIndex(newIndex);
        setCode(commandHistory[newIndex]);
      }
    }
  };

  const advanceTask = () => {
    if (currentTask < lesson.tasks.length - 1) {
      setCurrentTask(currentTask + 1);
      setConsoleOutput([]);
      setShowHint(false);
    } else if (currentLesson < LESSONS.length - 1) {
      setCurrentLesson(currentLesson + 1);
      setCurrentTask(0);
      setConsoleOutput([]);
      setShowHint(false);
    }
  };

  const goToLesson = (idx) => {
    setCurrentLesson(idx);
    setCurrentTask(0);
    setConsoleOutput([]);
    setShowHint(false);
  };

  const isTaskComplete = (lessonIdx, taskIdx) =>
    completedTasks[`${lessonIdx}-${taskIdx}`];

  const isLessonComplete = (lessonIdx) =>
    LESSONS[lessonIdx].tasks.every((_, ti) => isTaskComplete(lessonIdx, ti));

  const currentTaskComplete = isTaskComplete(currentLesson, currentTask);

  // Tree viewer component
  function TreeNode({ name, node, depth = 0 }) {
    const [expanded, setExpanded] = useState(depth < 2);
    const children = Object.entries(node._children || {});
    const hasChildren = children.length > 0;

    return (
      <div>
        <div
          onClick={() => hasChildren && setExpanded(!expanded)}
          style={{
            paddingLeft: depth * 18 + 8,
            paddingTop: 3,
            paddingBottom: 3,
            cursor: hasChildren ? "pointer" : "default",
            fontSize: 12.5,
            fontFamily: "'JetBrains Mono', monospace",
            color: hasChildren ? "#90caf9" : "#9e9eb8",
            display: "flex",
            alignItems: "center",
            gap: 6,
            borderRadius: 3,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#1e1e3a")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span style={{ width: 14, fontSize: 10, color: "#5c6bc0", flexShrink: 0 }}>
            {hasChildren ? (expanded ? "▼" : "▶") : " "}
          </span>
          <span style={{ color: hasChildren ? "#7986cb" : "#b0b0c8" }}>
            {(node._template || "").includes("Folder") ? "📁" : hasChildren ? "📂" : "📄"}
          </span>
          <span>{name}</span>
          <span style={{ color: "#555570", fontSize: 11, marginLeft: "auto", paddingRight: 8 }}>
            {node._template?.split("/").pop() || ""}
          </span>
        </div>
        {expanded &&
          children.map(([childName, childNode]) => (
            <TreeNode key={childName} name={childName} node={childNode} depth={depth + 1} />
          ))}
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        fontFamily: "'Instrument Sans', 'DM Sans', system-ui, sans-serif",
        background: "#0d0d1a",
        color: "#d4d4e8",
        overflow: "hidden",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* SIDEBAR — Lesson Navigation */}
      <div
        style={{
          width: sidebarCollapsed ? 48 : 260,
          background: "#0f0f24",
          borderRight: "1px solid #1a1a35",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.25s ease",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: sidebarCollapsed ? "16px 8px" : "20px 20px 16px",
            borderBottom: "1px solid #1a1a35",
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarCollapsed ? "center" : "space-between",
            minHeight: 60,
          }}
        >
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#8187dc", letterSpacing: "0.02em" }}>
                SPE Tutorial
              </div>
              <div style={{ fontSize: 11, color: "#555570", marginTop: 2 }}>
                {completedCount}/{totalTasks} tasks complete
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              background: "none",
              border: "none",
              color: "#555570",
              cursor: "pointer",
              fontSize: 16,
              padding: 4,
              lineHeight: 1,
            }}
          >
            {sidebarCollapsed ? "▶" : "◀"}
          </button>
        </div>

        {!sidebarCollapsed && (
          <div style={{ flex: 1, overflow: "auto", padding: "12px 0" }}>
            {LESSONS.map((l, li) => {
              const complete = isLessonComplete(li);
              const active = li === currentLesson;
              return (
                <button
                  key={l.id}
                  onClick={() => goToLesson(li)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    width: "100%",
                    padding: "10px 20px",
                    background: active ? "#1a1a3a" : "transparent",
                    border: "none",
                    borderLeft: active ? "3px solid #5c6bc0" : "3px solid transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    color: active ? "#d4d4e8" : "#8888a8",
                    transition: "all 0.15s",
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: complete
                        ? "2px solid #4caf50"
                        : active
                        ? "2px solid #5c6bc0"
                        : "2px solid #333355",
                      background: complete ? "#4caf50" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      color: "#fff",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    {complete ? "✓" : li + 1}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, lineHeight: 1.3 }}>
                      {l.title}
                    </div>
                    <div style={{ fontSize: 11, color: "#555570", marginTop: 2 }}>
                      {l.tasks.length} task{l.tasks.length > 1 ? "s" : ""}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Progress bar at bottom */}
        {!sidebarCollapsed && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid #1a1a35" }}>
            <div
              style={{
                height: 4,
                background: "#1a1a35",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(completedCount / totalTasks) * 100}%`,
                  background: "linear-gradient(90deg, #5c6bc0, #7c4dff)",
                  borderRadius: 2,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <div
          style={{
            height: 48,
            background: "#0f0f24",
            borderBottom: "1px solid #1a1a35",
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            gap: 16,
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 13, color: "#8888a8" }}>
            <span style={{ color: "#5c6bc0", fontWeight: 600 }}>{lesson.module}</span>
            <span style={{ margin: "0 8px", color: "#333355" }}>/</span>
            <span style={{ color: "#d4d4e8" }}>{lesson.title}</span>
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setShowTreePanel(!showTreePanel)}
            style={{
              background: showTreePanel ? "#1a1a3a" : "transparent",
              border: "1px solid #2a2a4a",
              color: showTreePanel ? "#90caf9" : "#8888a8",
              padding: "5px 12px",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "inherit",
            }}
          >
            🌲 Content Tree
          </button>
          <div
            style={{
              fontSize: 11,
              color: isISE ? "#7c4dff" : "#5c6bc0",
              padding: "4px 10px",
              background: "#1a1a2e",
              borderRadius: 4,
              border: `1px solid ${isISE ? "#3a2a6a" : "#1a1a35"}`,
            }}
          >
            {isISE ? "ISE" : "Console"}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#555570",
              padding: "4px 10px",
              background: "#1a1a2e",
              borderRadius: 4,
            }}
          >
            Task {currentTask + 1} of {lesson.tasks.length}
          </div>
        </div>

        {/* Split pane */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* LEFT — Lesson panel */}
          <div
            style={{
              width: showTreePanel ? "35%" : "40%",
              borderRight: "1px solid #1a1a35",
              display: "flex",
              flexDirection: "column",
              overflow: "auto",
              transition: "width 0.25s ease",
            }}
          >
            <div style={{ padding: "24px 28px", flex: 1, overflow: "auto" }}>
              {/* Lesson description */}
              <div style={{ marginBottom: 24 }}>
                <MarkdownLite text={lesson.description} />
              </div>

              {/* Current task */}
              {task && (
                <div
                  style={{
                    background: currentTaskComplete ? "#0d1f0d" : "#12122a",
                    border: currentTaskComplete
                      ? "1px solid #2e5e2e"
                      : "1px solid #2a2a4a",
                    borderRadius: 8,
                    padding: "18px 20px",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: currentTaskComplete ? "#4caf50" : "#5c6bc0",
                      marginBottom: 10,
                    }}
                  >
                    {currentTaskComplete ? "✓ Completed" : `Task ${currentTask + 1}`}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                    <MarkdownLite text={task.instruction} />
                  </div>

                  {!currentTaskComplete && (
                    <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setShowHint(!showHint)}
                        style={{
                          background: "transparent",
                          border: "1px solid #333355",
                          color: "#8888a8",
                          padding: "5px 12px",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 12,
                          fontFamily: "inherit",
                        }}
                      >
                        {showHint ? "Hide Hint" : "Show Hint"}
                      </button>
                    </div>
                  )}

                  {showHint && !currentTaskComplete && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "10px 14px",
                        background: "#1a1a2e",
                        borderRadius: 6,
                        borderLeft: "3px solid #ffab40",
                        fontSize: 13,
                      }}
                    >
                      <HighlightedCode code={task.hint} />
                    </div>
                  )}

                  {currentTaskComplete && (
                    <button
                      onClick={advanceTask}
                      style={{
                        marginTop: 14,
                        background: "linear-gradient(135deg, #5c6bc0, #7c4dff)",
                        border: "none",
                        color: "#fff",
                        padding: "8px 20px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: "inherit",
                      }}
                    >
                      {currentTask < lesson.tasks.length - 1
                        ? "Next Task →"
                        : currentLesson < LESSONS.length - 1
                        ? "Next Lesson →"
                        : "🎉 Tutorial Complete!"}
                    </button>
                  )}
                </div>
              )}

              {/* Task dots */}
              {lesson.tasks.length > 1 && (
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  {lesson.tasks.map((_, ti) => (
                    <div
                      key={ti}
                      onClick={() => {
                        setCurrentTask(ti);
                        setConsoleOutput([]);
                        setShowHint(false);
                      }}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: isTaskComplete(currentLesson, ti)
                          ? "#4caf50"
                          : ti === currentTask
                          ? "#5c6bc0"
                          : "#333355",
                        cursor: "pointer",
                        transition: "background 0.2s",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* MIDDLE — Editor + Console (mode-aware) */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            {/* ISE MODE: Script editor on top, output on bottom */}
            {isISE && (
              <>
                {/* Script editor pane */}
                <div
                  ref={editorPaneRef}
                  style={{
                    borderBottom: "none",
                    background: "#0d0d1f",
                    display: "flex",
                    flexDirection: "column",
                    height: editorHeight,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      padding: "8px 16px",
                      borderBottom: "1px solid #1a1a35",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#8888a8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Script Editor
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={handleRun}
                        style={{
                          background: "linear-gradient(135deg, #5c6bc0, #7c4dff)",
                          border: "none",
                          color: "#fff",
                          padding: "5px 16px",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: "inherit",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        ▶ Run
                      </button>
                      <button
                        onClick={() => setConsoleOutput([])}
                        style={{
                          background: "transparent",
                          border: "1px solid #2a2a4a",
                          color: "#666680",
                          padding: "5px 12px",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 12,
                          fontFamily: "inherit",
                        }}
                      >
                        Clear Output
                      </button>
                    </div>
                  </div>
                  <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                    <div style={{ display: "flex", height: "100%" }}>
                      {/* Line numbers */}
                      <div
                        style={{
                          padding: "10px 0",
                          textAlign: "right",
                          color: "#444460",
                          fontSize: 13,
                          fontFamily: "'JetBrains Mono', monospace",
                          lineHeight: "20px",
                          userSelect: "none",
                          minWidth: 36,
                          paddingRight: 8,
                          borderRight: "1px solid #1a1a35",
                          background: "#0a0a18",
                        }}
                      >
                        {code.split("\n").map((_, i) => (
                          <div key={i}>{i + 1}</div>
                        ))}
                      </div>
                      <textarea
                        ref={inputRef}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.ctrlKey) {
                            e.preventDefault();
                            handleRun();
                          }
                        }}
                        spellCheck={false}
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          color: "#d4d4e8",
                          fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
                          fontSize: 13,
                          lineHeight: "20px",
                          padding: "10px 12px",
                          resize: "none",
                          caretColor: "#5c6bc0",
                          tabSize: 4,
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ padding: "4px 16px 6px", borderTop: "1px solid #1a1a35", fontSize: 11, color: "#555570" }}>
                    Ctrl+Enter to run
                  </div>
                </div>

                {/* Resize handle */}
                <div
                  onMouseDown={handleDragStart}
                  style={{
                    height: 6,
                    background: "#1a1a35",
                    cursor: "row-resize",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a5a")}
                  onMouseLeave={(e) => {
                    if (!isDragging.current) e.currentTarget.style.background = "#1a1a35";
                  }}
                >
                  <div style={{ width: 32, height: 2, background: "#333355", borderRadius: 1 }} />
                </div>

                {/* Output pane */}
                <div
                  style={{
                    flex: 1,
                    overflow: "auto",
                    padding: "16px 20px",
                    background: "#0a0a18",
                    fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  {consoleOutput.length === 0 && (
                    <div style={{ color: "#444460", fontStyle: "italic", fontSize: 12 }}>
                      Output will appear here after you run your script...
                    </div>
                  )}
                  {consoleOutput.map((entry, i) => (
                    <div key={i} style={{ marginBottom: 6 }}>
                      {entry.type === "script" && (
                        <div style={{ color: "#555570", fontSize: 11, marginBottom: 8, borderBottom: "1px solid #1a1a30", paddingBottom: 6 }}>
                          Script executed
                        </div>
                      )}
                      {entry.type === "output" && (
                        <pre style={{ color: "#b0b0c8", margin: "4px 0", whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "inherit" }}>
                          {entry.text}
                        </pre>
                      )}
                      {entry.type === "error" && (
                        <div style={{ color: "#ef5350", margin: "4px 0" }}>{entry.text}</div>
                      )}
                      {entry.type === "success" && (
                        <div style={{ color: "#66bb6a", margin: "8px 0", padding: "8px 12px", background: "#0d1f0d", borderRadius: 4, borderLeft: "3px solid #4caf50" }}>
                          {entry.text}
                        </div>
                      )}
                      {entry.type === "hint" && (
                        <div style={{ color: "#ffab40", margin: "4px 0", padding: "6px 12px", background: "#1a1508", borderRadius: 4, borderLeft: "3px solid #ff9100", fontSize: 12 }}>
                          💡 {entry.text}
                        </div>
                      )}
                      {entry.type === "partial" && (
                        <div style={{ color: "#5c6bc0", fontSize: 11, marginLeft: 16 }}>{entry.text}</div>
                      )}
                    </div>
                  ))}
                  <div ref={consoleEndRef} />
                </div>
              </>
            )}

            {/* REPL MODE: Console output with command input at bottom */}
            {!isISE && (
              <>
                {/* Console output area */}
                <div
                  style={{
                    flex: 1,
                    overflow: "auto",
                    padding: "16px 20px",
                    background: "#0a0a18",
                    fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  {consoleOutput.length === 0 && (
                    <div style={{ color: "#444460", fontStyle: "italic", fontSize: 12 }}>
                      PS master:\content\Home&gt; Type your command below and press Enter...
                    </div>
                  )}
                  {consoleOutput.map((entry, i) => (
                    <div key={i} style={{ marginBottom: 6 }}>
                      {entry.type === "command" && (
                        <div>
                          <span style={{ color: "#5c6bc0" }}>PS master:\content\Home&gt; </span>
                          <HighlightedCode code={entry.text} />
                        </div>
                      )}
                      {entry.type === "output" && (
                        <pre style={{ color: "#b0b0c8", margin: "4px 0", whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "inherit" }}>
                          {entry.text}
                        </pre>
                      )}
                      {entry.type === "error" && (
                        <div style={{ color: "#ef5350", margin: "4px 0" }}>{entry.text}</div>
                      )}
                      {entry.type === "success" && (
                        <div style={{ color: "#66bb6a", margin: "8px 0", padding: "8px 12px", background: "#0d1f0d", borderRadius: 4, borderLeft: "3px solid #4caf50" }}>
                          {entry.text}
                        </div>
                      )}
                      {entry.type === "hint" && (
                        <div style={{ color: "#ffab40", margin: "4px 0", padding: "6px 12px", background: "#1a1508", borderRadius: 4, borderLeft: "3px solid #ff9100", fontSize: 12 }}>
                          💡 {entry.text}
                        </div>
                      )}
                      {entry.type === "partial" && (
                        <div style={{ color: "#5c6bc0", fontSize: 11, marginLeft: 16 }}>{entry.text}</div>
                      )}
                    </div>
                  ))}
                  <div ref={consoleEndRef} />
                </div>

                {/* Command input */}
                <div
                  style={{
                    borderTop: "1px solid #1a1a35",
                    background: "#0d0d1f",
                    padding: "12px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      color: "#5c6bc0",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 13,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    PS master:\content\Home&gt;
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your SPE command here..."
                    spellCheck={false}
                    autoComplete="off"
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "#d4d4e8",
                      fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
                      fontSize: 13,
                      caretColor: "#5c6bc0",
                    }}
                  />
                  <button
                    onClick={handleRun}
                    style={{
                      background: code.trim() ? "linear-gradient(135deg, #5c6bc0, #7c4dff)" : "#1a1a35",
                      border: "none",
                      color: code.trim() ? "#fff" : "#555570",
                      padding: "6px 16px",
                      borderRadius: 4,
                      cursor: code.trim() ? "pointer" : "default",
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    Run ⏎
                  </button>
                  <button
                    onClick={() => setConsoleOutput([])}
                    style={{
                      background: "transparent",
                      border: "1px solid #2a2a4a",
                      color: "#666680",
                      padding: "6px 12px",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 12,
                      fontFamily: "inherit",
                    }}
                  >
                    Clear
                  </button>
                </div>
              </>
            )}
          </div>

          {/* RIGHT — Content Tree Panel (toggle) */}
          {showTreePanel && (
            <div
              style={{
                width: 280,
                borderLeft: "1px solid #1a1a35",
                background: "#0d0d1f",
                overflow: "auto",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid #1a1a35",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#8888a8",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Sitecore Content Tree
              </div>
              <div style={{ padding: "8px 0" }}>
                <TreeNode name="sitecore" node={VIRTUAL_TREE.sitecore} depth={0} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
