import type { SitecoreItem } from "../types";
import { getItemProperty } from "./properties";

export function formatItemTable(items: SitecoreItem[]): string {
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

export function formatPropertyTable(
  items: SitecoreItem[],
  properties: string[]
): string {
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

export function formatPropertyList(
  items: SitecoreItem[],
  properties: string[]
): string {
  const displayNames = properties.map((p) =>
    p.toLowerCase() === "id" ? "ID" : p
  );
  const maxLen = Math.max(...displayNames.map((n) => n.length));
  return items
    .map((item) =>
      properties
        .map((p, i) => {
          const val = getItemProperty(item, p) || "-";
          return `${displayNames[i].padStart(maxLen)} : ${val}`;
        })
        .join("\n")
    )
    .join("\n\n");
}
