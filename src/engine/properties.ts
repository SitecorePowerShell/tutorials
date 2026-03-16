import type { SitecoreItem } from "../types";

// ============================================================================
// Canonical Property Registry
// ============================================================================
// Single source of truth for all Sitecore item properties in the tutorial.
// Two categories mirror real SPE behavior:
//   - "item" = built-in .NET properties on Sitecore.Data.Items.Item
//   - "spe-field" = convenience field aliases SPE adds via Types.ps1xml

/** Item-level properties from the Sitecore.Data.Items.Item .NET object */
export const ITEM_PROPERTIES = [
  "Name",
  "ID",
  "TemplateName",
  "TemplateID",
  "Template.FullName",
  "ItemPath",
  "Paths.FullPath",
  "Key",
  "Version",
  "HasChildren",
  "Database",
  "DisplayName",
  "Language",
  "Parent",
] as const;

/** Standard field properties SPE exposes as top-level accessors */
export const SPE_FIELD_PROPERTIES = [
  "__Created",
  "__Updated",
  "__Created by",
  "__Updated by",
  "__Workflow state",
] as const;

/** All property names — for completions and TreePanel */
export const ALL_PROPERTY_NAMES = [
  ...ITEM_PROPERTIES,
  ...SPE_FIELD_PROPERTIES,
] as const;

/** Curated subset for Visual Builder dropdowns */
export const COMMON_PROPERTY_NAMES = [
  "Name",
  "TemplateName",
  "Template.FullName",
  "ID",
  "ItemPath",
  "Key",
  "__Updated",
  "__Created",
  "__Updated by",
  "__Created by",
  "Language",
  "Version",
] as const;

/** Known dotted properties that should be treated as single property names */
const DOTTED_PROPERTIES = new Set(["template.fullname", "paths.fullpath"]);

/** Check if a property name is a known dotted property */
export function isDottedProperty(name: string): boolean {
  return DOTTED_PROPERTIES.has(name.toLowerCase());
}

// ============================================================================
// Property Resolution
// ============================================================================

/** Centralized, case-insensitive property resolver used by ALL pipeline stages */
export function getItemProperty(item: SitecoreItem, prop: string): string {
  const p = prop.toLowerCase();

  // Item-level built-in properties
  if (p === "name") return item.name;
  if (p === "id") return item.node._id || "";
  if (p === "templatename") return item.node._template || "";
  if (p === "templateid") return "{76036F5E-CBCE-46D1-AF0A-4143F9B557AA}";
  if (p === "template.fullname") return item.node._templateFullName || "";
  if (p === "itempath" || p === "paths.fullpath") return item.path || "/" + item.name;
  if (p === "key") return item.name.toLowerCase();
  if (p === "version") return String(item.node._version || 1);
  if (p === "haschildren")
    return Object.keys(item.node._children || {}).length > 0 ? "True" : "False";
  if (p === "database") return "master";
  if (p === "displayname") return item.name;
  if (p === "language") return "en";
  if (p === "parent") {
    const path = item.path || "";
    const segments = path.split("/").filter(Boolean);
    return segments.length > 1 ? segments[segments.length - 2] : "";
  }

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

/** Returns all property names for an item (built-in + dynamic fields) */
export function getAllPropertyNames(item: SitecoreItem): string[] {
  const fieldNames = item.node._fields ? Object.keys(item.node._fields) : [];
  const builtinNames = [...ITEM_PROPERTIES] as string[];
  // Add field names, deduplicating any that overlap with SPE standard fields
  const seen = new Set(builtinNames.map((n) => n.toLowerCase()));
  for (const f of fieldNames) {
    if (!seen.has(f.toLowerCase())) {
      builtinNames.push(f);
      seen.add(f.toLowerCase());
    }
  }
  return builtinNames;
}
