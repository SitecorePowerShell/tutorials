export type ParamType = "string" | "expression" | "propertyList";

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
  icon: string;
  params: CmdletParam[];
  switches: string[];
}

export const CMDLET_REGISTRY: Record<string, CmdletDef> = {
  "Get-Item": {
    name: "Get-Item",
    shortLabel: "Get-Item",
    color: "#5c6bc0",
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
    icon: "📊",
    params: [],
    switches: [],
  },
  "Format-Table": {
    name: "Format-Table",
    shortLabel: "Format-Table",
    color: "#fff59d",
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
    icon: "📦",
    params: [
      { name: "Property", type: "propertyList", required: true, placeholder: "TemplateName" },
    ],
    switches: [],
  },
};

export const ALL_CMDLET_NAMES = Object.keys(CMDLET_REGISTRY);

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
