import { isLightMode } from "../theme";

export type ParamType = "string" | "expression" | "propertyList" | "criteriaList";

export interface CmdletParam {
  name: string;
  type: ParamType;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}

export interface CmdletDef {
  name: string;
  shortLabel: string;
  color: string;
  lightColor: string;
  icon: string;
  params: CmdletParam[];
  switches: string[];
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
      { name: "First", type: "string", placeholder: "5" },
      { name: "Last", type: "string", placeholder: "5" },
    ],
    switches: [],
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
    switches: ["Descending"],
  },
  "Measure-Object": {
    name: "Measure-Object",
    shortLabel: "Measure-Object",
    color: "#ffcc80",
    lightColor: "#e65100",
    icon: "📊",
    params: [],
    switches: [],
  },
  "Format-Table": {
    name: "Format-Table",
    shortLabel: "Format-Table",
    color: "#fff59d",
    lightColor: "#9e9d24",
    icon: "📋",
    params: [
      { name: "Property", type: "propertyList", placeholder: "Name, TemplateName" },
    ],
    switches: [],
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
    switches: [],
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
};

export const ALL_CMDLET_NAMES = Object.keys(CMDLET_REGISTRY);

/** Returns the theme-appropriate color for a cmdlet definition. */
export function getCmdletColor(def: CmdletDef): string {
  return isLightMode() ? def.lightColor : def.color;
}

export const COMMON_PROPERTIES = [
  "Name",
  "TemplateName",
  "Template.FullName",
  "Id",
  "__Updated",
  "__Created",
  "Language",
  "Version",
];

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
  "-gt",
  "-lt",
  "-ge",
  "-le",
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
