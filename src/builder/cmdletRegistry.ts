import { isLightMode } from "../theme";

export type ParamType = "string" | "expression" | "propertyList" | "criteriaList";

export interface CmdletParam {
  name: string;
  type: ParamType;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}

/** A named parameter set groups mutually-exclusive params */
export interface ParamSet {
  /** Display label shown in the toggle (e.g. "Properties", "Expand") */
  label: string;
  /** Which param names belong to this set */
  params: string[];
  /** Which switch names belong to this set */
  switches?: string[];
}

export interface CmdletDef {
  name: string;
  shortLabel: string;
  color: string;
  lightColor: string;
  icon: string;
  params: CmdletParam[];
  switches: string[];
  /** Optional parameter sets. If defined, the UI shows a toggle.
   *  Params not listed in any set are shown in all sets (common params). */
  paramSets?: ParamSet[];
}

export const CMDLET_REGISTRY: Record<string, CmdletDef> = {
  "Get-Item": {
    name: "Get-Item",
    shortLabel: "Get-Item",
    color: "#5c6bc0",
    lightColor: "#3949ab",
    icon: "📄",
    params: [
      { name: "Path", type: "string", required: true, defaultValue: "master:", placeholder: "master:\\content\\Home" },
    ],
    switches: [],
  },
  "Get-ChildItem": {
    name: "Get-ChildItem",
    shortLabel: "Get-ChildItem",
    color: "#7986cb",
    lightColor: "#3f51b5",
    icon: "📂",
    params: [
      { name: "Path", type: "string", required: true, defaultValue: "master:", placeholder: "master:\\content\\Home" },
    ],
    switches: ["Recurse"],
  },
  "Where-Object": {
    name: "Where-Object",
    shortLabel: "Where-Object",
    color: "#80deea",
    lightColor: "#00838f",
    icon: "🔍",
    params: [
      { name: "FilterScript", type: "expression", required: true, placeholder: '{ $_.Name -eq "Home" }' },
    ],
    switches: [],
  },
  "ForEach-Object": {
    name: "ForEach-Object",
    shortLabel: "ForEach-Object",
    color: "#ef9a9a",
    lightColor: "#c62828",
    icon: "🔄",
    params: [
      { name: "Process", type: "expression", required: true, placeholder: "{ $_.Name }" },
    ],
    switches: [],
  },
  "Select-Object": {
    name: "Select-Object",
    shortLabel: "Select-Object",
    color: "#ce93d8",
    lightColor: "#7b1fa2",
    icon: "✂️",
    params: [
      { name: "Property", type: "propertyList", placeholder: "Name, TemplateName" },
      { name: "ExcludeProperty", type: "propertyList", placeholder: "TemplateID" },
      { name: "ExpandProperty", type: "string", placeholder: "Name" },
      { name: "First", type: "string", placeholder: "5" },
      { name: "Last", type: "string", placeholder: "5" },
      { name: "Skip", type: "string", placeholder: "2" },
      { name: "SkipLast", type: "string", placeholder: "2" },
    ],
    switches: ["Unique"],
    paramSets: [
      { label: "Properties", params: ["Property", "ExcludeProperty"], switches: ["Unique"] },
      { label: "Expand", params: ["ExpandProperty"] },
      { label: "Subset", params: ["First", "Last", "Skip", "SkipLast"] },
    ],
  },
  "Sort-Object": {
    name: "Sort-Object",
    shortLabel: "Sort-Object",
    color: "#a5d6a7",
    lightColor: "#2e7d32",
    icon: "↕️",
    params: [
      { name: "Property", type: "propertyList", placeholder: "Name" },
    ],
    switches: ["Descending", "Unique"],
  },
  "Measure-Object": {
    name: "Measure-Object",
    shortLabel: "Measure-Object",
    color: "#ffcc80",
    lightColor: "#e65100",
    icon: "📊",
    params: [
      { name: "Property", type: "string", placeholder: "Name" },
    ],
    switches: ["Sum", "Average", "Maximum", "Minimum"],
    paramSets: [
      { label: "Count", params: [] },
      { label: "Numeric", params: ["Property"], switches: ["Sum", "Average", "Maximum", "Minimum"] },
    ],
  },
  "Format-Table": {
    name: "Format-Table",
    shortLabel: "Format-Table",
    color: "#fff59d",
    lightColor: "#9e9d24",
    icon: "📋",
    params: [
      { name: "Property", type: "propertyList", placeholder: "Name, TemplateName" },
      { name: "GroupBy", type: "string", placeholder: "TemplateName" },
    ],
    switches: ["AutoSize", "HideTableHeaders"],
  },
  "Group-Object": {
    name: "Group-Object",
    shortLabel: "Group-Object",
    color: "#ffb74d",
    lightColor: "#e65100",
    icon: "📦",
    params: [
      { name: "Property", type: "propertyList", required: true, placeholder: "TemplateName" },
    ],
    switches: ["NoElement"],
  },
  "Find-Item": {
    name: "Find-Item",
    shortLabel: "Find-Item",
    color: "#f06292",
    lightColor: "#ad1457",
    icon: "🔎",
    params: [
      { name: "Index", type: "string", required: true, defaultValue: "sitecore_master_index", placeholder: "sitecore_master_index" },
      { name: "Criteria", type: "criteriaList", required: true, placeholder: "Add search criteria..." },
      { name: "OrderBy", type: "string", placeholder: "_name" },
      { name: "First", type: "string", placeholder: "10" },
      { name: "Skip", type: "string", placeholder: "0" },
    ],
    switches: [],
  },
  "Get-User": {
    name: "Get-User",
    shortLabel: "Get-User",
    color: "#4db6ac",
    lightColor: "#00695c",
    icon: "👤",
    params: [
      { name: "Identity", type: "string", placeholder: "sitecore\\admin" },
      { name: "Filter", type: "string", placeholder: "sitecore\\*" },
    ],
    switches: ["Current", "Authenticated"],
    paramSets: [
      { label: "By identity", params: ["Identity"], switches: ["Authenticated"] },
      { label: "By filter", params: ["Filter"], switches: ["Authenticated"] },
      { label: "Current", params: [], switches: ["Current"] },
    ],
  },
  "Get-Role": {
    name: "Get-Role",
    shortLabel: "Get-Role",
    color: "#ba68c8",
    lightColor: "#6a1b9a",
    icon: "🛡️",
    params: [
      { name: "Identity", type: "string", placeholder: "sitecore\\Developer" },
      { name: "Filter", type: "string", placeholder: "sitecore\\*" },
    ],
    switches: [],
    paramSets: [
      { label: "By identity", params: ["Identity"] },
      { label: "By filter", params: ["Filter"] },
    ],
  },
  "Get-RoleMember": {
    name: "Get-RoleMember",
    shortLabel: "Get-RoleMember",
    color: "#b39ddb",
    lightColor: "#4527a0",
    icon: "👥",
    params: [
      { name: "Identity", type: "string", required: true, placeholder: "sitecore\\Developer" },
    ],
    switches: [],
  },
  "Test-ItemAcl": {
    name: "Test-ItemAcl",
    shortLabel: "Test-ItemAcl",
    color: "#90a4ae",
    lightColor: "#455a64",
    icon: "🔐",
    params: [
      { name: "Path", type: "string", required: true, placeholder: "master:\\content\\Home" },
      { name: "Identity", type: "string", required: true, placeholder: "sitecore\\admin" },
      { name: "AccessRight", type: "string", required: true, placeholder: "item:write" },
    ],
    switches: [],
  },
};

export const ALL_CMDLET_NAMES = Object.keys(CMDLET_REGISTRY);

/** Returns the theme-appropriate color for a cmdlet definition. */
export function getCmdletColor(def: CmdletDef): string {
  return isLightMode() ? def.lightColor : def.color;
}

export { COMMON_PROPERTY_NAMES as COMMON_PROPERTIES } from "../engine/properties";

export const FOREACH_OPERATORS = [
  "-replace",
  "-split",
  "-join",
  "-match",
  "-like",
];

export const FILTER_OPERATORS = [
  "-eq",
  "-ne",
  "-like",
  "-notlike",
  "-match",
  "-notmatch",
  "-gt",
  "-lt",
  "-ge",
  "-le",
  "-contains",
  "-notcontains",
  "-in",
  "-notin",
  "-is",
  "-isnot",
];

/** Available filter types for Find-Item -Criteria */
export const CRITERIA_FILTER_TYPES = [
  "Equals",
  "Contains",
  "StartsWith",
  "EndsWith",
  "DescendantOf",
  "ContainsAny",
  "ContainsAll",
  "Fuzzy",
  "MatchesWildcard",
  "MatchesRegex",
  "LessThan",
  "GreaterThan",
  "InclusiveRange",
  "ExclusiveRange",
];

/** Common search index field names for Find-Item */
export const INDEX_FIELDS = [
  "_name",
  "_templatename",
  "_fullpath",
  "_content",
  "title",
  "country",
  "company",
  "bio",
  "category",
  "author",
  "tags",
  "price",
  "isactive",
  "mvpcategory",
  "priority",
];
