import type { SitecoreItem, PropertySpec } from "../types";
import { getItemProperty } from "./properties";
import { getPropertyLabel, evaluatePropertySpec } from "./propertySpec";
import type { ScriptContext } from "./scriptContext";

export function formatItemTable(items: SitecoreItem[]): string {
  if (items.length === 0) return "";

  // SearchResultItem (from Find-Item) shows a reduced column set
  if (items[0]._isSearchResult) {
    const headers = ["Name", "Language", "Id", "TemplateName", "Path"];
    const rows = items.map((item) => [
      item.name,
      "en",
      item.node._id || "-",
      item.node._template || "-",
      item.path || "-",
    ]);
    const colWidths = headers.map((h, i) =>
      Math.max(h.length, ...rows.map((r) => String(r[i]).length))
    );
    const sep = colWidths.map((w) => "-".repeat(w)).join(" ");
    const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join(" ");
    const rowLines = rows.map((r) =>
      r.map((c, i) => String(c).padEnd(colWidths[i])).join(" ")
    );
    return (
      "   TypeName: Sitecore.ContentSearch.SearchTypes.SearchResultItem\n\n" +
      [headerLine, sep, ...rowLines].join("\n")
    );
  }

  // Full Item format from Sitecore_Views.ps1xml:
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

export function formatPropertyTable(
  items: SitecoreItem[],
  properties: PropertySpec[],
  ctx?: ScriptContext
): string {
  if (items.length === 0) return "";

  const displayHeaders = properties.map((p) => getPropertyLabel(p));

  const rows = items.map((item) =>
    properties.map((p) => {
      if (p.type === "calculated" && ctx) {
        return evaluatePropertySpec(p, item, ctx);
      }
      const name = p.type === "plain" ? p.name : p.label;
      return getItemProperty(item, name) || "-";
    })
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

export function formatPropertyList(
  items: SitecoreItem[],
  properties: PropertySpec[],
  ctx?: ScriptContext
): string {
  const displayNames = properties.map((p) => getPropertyLabel(p));
  const maxLen = Math.max(...displayNames.map((n) => n.length));
  return items
    .map((item) =>
      properties
        .map((p, i) => {
          let val: string;
          if (p.type === "calculated" && ctx) {
            val = evaluatePropertySpec(p, item, ctx);
          } else {
            const name = p.type === "plain" ? p.name : p.label;
            val = getItemProperty(item, name) || "-";
          }
          return `${displayNames[i].padStart(maxLen)} : ${val}`;
        })
        .join("\n")
    )
    .join("\n\n");
}
