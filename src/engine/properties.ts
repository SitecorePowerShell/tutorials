import type { SitecoreItem } from "../types";

/** Centralized, case-insensitive property resolver used by ALL pipeline stages */
export function getItemProperty(item: SitecoreItem, prop: string): string {
  const p = prop.toLowerCase();
  if (p === "name") return item.name;
  if (p === "id") return item.node._id || "";
  if (p === "templatename") return item.node._template || "";
  if (p === "templateid") return "{76036F5E-CBCE-46D1-AF0A-4143F9B557AA}";
  if (p === "itempath") return item.path || "/" + item.name;
  if (p === "version") return String(item.node._version || 1);
  if (p === "haschildren")
    return Object.keys(item.node._children || {}).length > 0 ? "True" : "False";
  if (p === "database") return "master";
  if (p === "displayname") return item.name;
  if (p === "language") return "en";
  // Check fields (case-sensitive for field names like __Updated, "__Updated by")
  if (item.node._fields && prop in item.node._fields)
    return item.node._fields[prop];
  // Case-insensitive field fallback
  if (item.node._fields) {
    const fieldKey = Object.keys(item.node._fields).find(
      (k) => k.toLowerCase() === p
    );
    if (fieldKey) return item.node._fields[fieldKey];
  }
  return "";
}
