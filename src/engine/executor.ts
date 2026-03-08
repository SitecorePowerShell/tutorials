import type {
  SitecoreNode,
  SitecoreItem,
  SitecoreItemArray,
  ExecutionResult,
  ScriptResult,
} from "../types";
import { VIRTUAL_TREE } from "./virtualTree";
import {
  resolvePath,
  getChildren,
  getAllDescendants,
} from "./pathResolver";
import { parseCommand } from "./parser";
import { getItemProperty } from "./properties";
import { formatItemTable, formatPropertyTable } from "./formatter";
import { ScriptContext } from "./scriptContext";

// ============================================================================
// Multi-line script executor
// ============================================================================

export function executeScript(script: string): ScriptResult {
  const ctx = new ScriptContext();
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

export function executeLine(line: string, ctx: ScriptContext): void {
  const trimmed = line.trim();

  // Variable assignment: $varName = <expression>
  const assignMatch = trimmed.match(/^\$(\w+)\s*=\s*(.+)$/);
  if (assignMatch) {
    const [, varName, expr] = assignMatch;
    const result = executeCommandWithContext(expr, ctx);
    if (result.error) {
      ctx.errors.push(result.error);
    } else if (result.pipelineData) {
      ctx.setVar(varName, result.pipelineData);
    } else if (result.output) {
      ctx.setVar(varName, result.output);
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
    const cmdLower = stage.cmdlet.toLowerCase();

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
        const resolved = resolvePath(path, tree);
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
          const resolved = resolvePath(path || ".", tree);
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
      } else if (
        cmdLower === "where-object" ||
        cmdLower === "where" ||
        cmdLower === "?"
      ) {
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
              case "eq":
                return (
                  String(itemVal).toLowerCase() === val.toLowerCase()
                );
              case "ne":
                return (
                  String(itemVal).toLowerCase() !== val.toLowerCase()
                );
              case "like": {
                const regex = new RegExp(
                  "^" +
                    val.replace(/\*/g, ".*").replace(/\?/g, ".") +
                    "$",
                  "i"
                );
                return regex.test(String(itemVal));
              }
              case "match":
                return new RegExp(val, "i").test(String(itemVal));
              default:
                return true;
            }
          });
        }
      } else if (
        cmdLower === "foreach-object" ||
        cmdLower === "foreach" ||
        cmdLower === "%"
      ) {
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

            // Handle property access: $_.PropertyName
            let expandedBody = body.replace(/\$_\.(\w+)/g, (_, prop) => {
              return getItemProperty(item, prop);
            });

            // Handle Write-Host or simple expression output
            if (expandedBody.toLowerCase().startsWith("write-host")) {
              const msg = expandedBody
                .replace(/^write-host\s*/i, "")
                .replace(/^["']|["']$/g, "");
              results.push(msg);
            } else if (
              expandedBody.startsWith('"') ||
              expandedBody.startsWith("'")
            ) {
              results.push(expandedBody.replace(/^["']|["']$/g, ""));
            } else {
              const innerResult = executeCommandWithContext(
                expandedBody,
                ctx,
                tree
              );
              if (innerResult.output) results.push(innerResult.output);
              if (innerResult.error) ctx.errors.push(innerResult.error);
            }
          }
          if (results.length > 0) {
            return { output: results.join("\n"), error: null };
          }
        }
      } else if (
        cmdLower === "select-object" ||
        cmdLower === "select"
      ) {
        if (!pipelineData)
          return { output: "", error: "Select-Object : No pipeline input." };
        const propParam =
          stage.params.Property || stage.params.property;
        if (propParam) {
          const props = propParam.split(",").map((p) => p.trim());
          (pipelineData as SitecoreItemArray)._selectedProperties = props;
        }
        const first = stage.params.First || stage.params.first;
        if (first) pipelineData = pipelineData.slice(0, parseInt(first));
        const last = stage.params.Last || stage.params.last;
        if (last) pipelineData = pipelineData.slice(-parseInt(last));
      } else if (cmdLower === "sort-object" || cmdLower === "sort") {
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
      } else if (
        cmdLower === "group-object" ||
        cmdLower === "group"
      ) {
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
      } else if (
        cmdLower === "measure-object" ||
        cmdLower === "measure"
      ) {
        if (!pipelineData)
          return { output: "", error: "Measure-Object : No pipeline input." };
        const count = Array.isArray(pipelineData)
          ? pipelineData.length
          : 0;
        return {
          output: `\nCount    : ${count}\nAverage  : \nSum      : \nMaximum  : \nMinimum  : \nProperty :`,
          error: null,
        };
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
      } else if (
        cmdLower === "get-location" ||
        cmdLower === "gl" ||
        cmdLower === "pwd"
      ) {
        return {
          output:
            "\nPath                \n----                \nmaster:\\content\\Home\n",
          error: null,
        };
      } else if (cmdLower === "show-listview") {
        if (!pipelineData || pipelineData.length === 0) {
          return { output: "", error: "Show-ListView : No pipeline input." };
        }
        const propParam =
          stage.params.Property || stage.params.property;
        const title =
          stage.params.Title || stage.params.title || "List View";
        let props: string[] | null = null;
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
      } else if (
        cmdLower === "write-host" ||
        cmdLower === "write-output"
      ) {
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
        const resolved = resolvePath(parentPath, tree);
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
          const resolved = resolvePath(targetPath, tree);
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
        const sourceResolved = resolvePath(sourcePath, tree);
        if (!sourceResolved)
          return {
            output: "",
            error: `Move-Item : Cannot find path '${sourcePath}'`,
          };
        const destResolved = resolvePath(destPath, tree);
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
        const sourceResolved = resolvePath(sourcePath, tree);
        if (!sourceResolved)
          return {
            output: "",
            error: `Copy-Item : Cannot find path '${sourcePath}'`,
          };
        const destResolved = resolvePath(destPath, tree);
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
          const resolved = resolvePath(sourcePath, tree);
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
      } else {
        return {
          output: "",
          error: `${stage.cmdlet} : The term '${stage.cmdlet}' is not recognized. Supported commands: Get-Item, Get-ChildItem, Where-Object, ForEach-Object, Select-Object, Sort-Object, Group-Object, Measure-Object, Get-Member, Show-ListView, New-Item, Remove-Item, Move-Item, Copy-Item, Rename-Item, Write-Host, Show-Alert, Read-Variable`,
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
    return {
      output: formatPropertyTable(pipelineData, selectedProps),
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
export function executeCommand(input: string): ExecutionResult {
  const ctx = new ScriptContext();
  return executeCommandWithContext(input, ctx);
}
