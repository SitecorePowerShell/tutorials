import type { ParsedStage } from "../types";
import { resolvePath } from "../engine/pathResolver";

// ============================================================================
// Types
// ============================================================================

export type ParamType = "path" | "number" | "string" | "scriptblock";

export interface ParamDef {
  type: ParamType;
  required?: boolean;
  /** 0-based positional index (e.g., 0 means first positional arg maps here) */
  positional?: number;
}

export interface ParameterSet {
  name: string;
  params: Record<string, ParamDef>;
}

export interface CmdletRegistration {
  sets: ParameterSet[];
  switches?: string[];
  /** SPE-specific params layered on top of all sets */
  speParams?: Record<string, ParamDef>;
  /** Cmdlet requires pipeline input */
  pipelineOnly?: boolean;
}

// ============================================================================
// Registry
// ============================================================================

export const CMDLET_REGISTRY: Record<string, CmdletRegistration> = {
  "get-item": {
    sets: [
      { name: "ByPath", params: { Path: { type: "path", positional: 0 } } },
    ],
  },

  "get-childitem": {
    sets: [
      { name: "ByPath", params: { Path: { type: "path", positional: 0 } } },
    ],
    switches: ["Recurse", "Force"],
  },

  "new-item": {
    sets: [
      {
        name: "ByPath",
        params: {
          Path: { type: "path", positional: 0, required: true },
          Name: { type: "string", required: true },
        },
      },
    ],
    speParams: {
      ItemType: { type: "string" },
      Language: { type: "string" },
    },
  },

  "remove-item": {
    sets: [
      { name: "ByPath", params: { Path: { type: "path", positional: 0 } } },
      { name: "ByPipeline", params: {} },
    ],
  },

  "move-item": {
    sets: [
      {
        name: "ByPath",
        params: {
          Path: { type: "path", positional: 0, required: true },
          Destination: { type: "path", positional: 1, required: true },
        },
      },
    ],
  },

  "copy-item": {
    sets: [
      {
        name: "ByPath",
        params: {
          Path: { type: "path", positional: 0, required: true },
          Destination: { type: "path", positional: 1, required: true },
        },
      },
    ],
  },

  "rename-item": {
    sets: [
      {
        name: "ByPath",
        params: {
          Path: { type: "path", positional: 0 },
          NewName: { type: "string", positional: 1, required: true },
        },
      },
      {
        name: "ByPipeline",
        params: {
          NewName: { type: "string", positional: 0, required: true },
        },
      },
    ],
  },

  "set-itemproperty": {
    sets: [
      {
        name: "ByPath",
        params: {
          Path: { type: "path", positional: 0 },
          Name: { type: "string", required: true },
          Value: { type: "string" },
        },
      },
      {
        name: "ByPipeline",
        params: {
          Name: { type: "string", required: true },
          Value: { type: "string" },
        },
      },
    ],
  },

  "set-location": {
    sets: [
      {
        name: "ByPath",
        params: { Path: { type: "path", positional: 0, required: true } },
      },
    ],
  },

  "get-location": { sets: [] },

  "find-item": {
    sets: [
      {
        name: "Default",
        params: {
          Index: { type: "string", positional: 0 },
          Criteria: { type: "scriptblock" },
          OrderBy: { type: "string" },
          First: { type: "number" },
          Last: { type: "number" },
          Skip: { type: "number" },
        },
      },
    ],
  },

  "where-object": {
    sets: [{ name: "ScriptBlock", params: {} }],
    pipelineOnly: true,
  },

  "foreach-object": {
    sets: [{ name: "ScriptBlock", params: {} }],
    pipelineOnly: true,
  },

  "select-object": {
    sets: [
      {
        name: "Default",
        params: {
          Property: { type: "string", positional: 0 },
          First: { type: "number" },
          Last: { type: "number" },
        },
      },
    ],
    pipelineOnly: true,
  },

  "sort-object": {
    sets: [
      {
        name: "Default",
        params: { Property: { type: "string", positional: 0 } },
      },
    ],
    switches: ["Descending"],
    pipelineOnly: true,
  },

  "group-object": {
    sets: [
      {
        name: "Default",
        params: { Property: { type: "string", positional: 0 } },
      },
    ],
    pipelineOnly: true,
  },

  "measure-object": { sets: [], pipelineOnly: true },

  "get-member": { sets: [], pipelineOnly: true },

  "format-table": {
    sets: [
      {
        name: "Default",
        params: { Property: { type: "string", positional: 0 } },
      },
    ],
    pipelineOnly: true,
  },

  "convertto-json": { sets: [], pipelineOnly: true },

  "write-host": {
    sets: [
      {
        name: "Default",
        params: {
          Object: { type: "string", positional: 0 },
          ForegroundColor: { type: "string" },
        },
      },
    ],
  },

  "write-output": {
    sets: [
      {
        name: "Default",
        params: { InputObject: { type: "string", positional: 0 } },
      },
    ],
  },

  "show-alert": {
    sets: [
      {
        name: "Default",
        params: { Title: { type: "string", positional: 0 } },
      },
    ],
  },

  "show-listview": {
    sets: [
      {
        name: "Default",
        params: {
          Property: { type: "string", positional: 0 },
          Title: { type: "string" },
        },
      },
    ],
    pipelineOnly: true,
  },

  "read-variable": {
    sets: [
      {
        name: "Default",
        params: {
          Title: { type: "string" },
          Description: { type: "string" },
        },
      },
    ],
  },

  "close-window": { sets: [] },

  "get-alias": { sets: [] },
};

// ============================================================================
// Validation
// ============================================================================

function formatCmdlet(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("-");
}

/**
 * Build the full allowed-params map for a registration, given options.
 * Returns null if the named parameterSet doesn't exist.
 */
function getAllowedParams(
  reg: CmdletRegistration,
  parameterSet?: string,
  allowSpeParams?: boolean
): Record<string, ParamDef> | null {
  let setParams: Record<string, ParamDef>;

  if (parameterSet) {
    const set = reg.sets.find(
      (s) => s.name.toLowerCase() === parameterSet.toLowerCase()
    );
    if (!set) return null;
    setParams = { ...set.params };
  } else {
    // Merge all sets (permissive mode)
    setParams = {};
    for (const set of reg.sets) {
      Object.assign(setParams, set.params);
    }
  }

  // Add SPE params if allowed (default: true when no parameterSet specified)
  const includeSpe = allowSpeParams ?? !parameterSet;
  if (includeSpe && reg.speParams) {
    Object.assign(setParams, reg.speParams);
  }

  return setParams;
}

/** Case-insensitive lookup in an allowed-params map */
function findAllowedParam(
  allowed: Record<string, ParamDef>,
  key: string
): [string, ParamDef] | undefined {
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(allowed)) {
    if (k.toLowerCase() === lower) return [k, v];
  }
  return undefined;
}

/**
 * Validate a parsed stage's parameters against the registry.
 * Returns null if valid, or an error message if invalid.
 */
export function validateStageParams(
  stage: ParsedStage,
  cmdlet: string,
  options?: {
    parameterSet?: string;
    allowSpeParams?: boolean;
  }
): string | null {
  const reg = CMDLET_REGISTRY[cmdlet.toLowerCase()];
  if (!reg) return null; // Unknown cmdlet — skip

  const cmdName = formatCmdlet(cmdlet);
  const allowed = getAllowedParams(
    reg,
    options?.parameterSet,
    options?.allowSpeParams
  );

  if (allowed === null) {
    return `${cmdName} : Parameter set '${options!.parameterSet}' does not exist.`;
  }

  // Check named params
  for (const [key, value] of Object.entries(stage.params)) {
    if (key === "_positional") continue;
    const match = findAllowedParam(allowed, key);
    if (!match) {
      return `${cmdName} : A parameter cannot be found that matches parameter name '${key}'.`;
    }
    const [, def] = match;
    const typeError = checkParamType(def, value as string, key, cmdName);
    if (typeError) return typeError;
  }

  // Check positional params — bind to positional defs and type-check
  if (stage.params._positional) {
    const positionalDefs = Object.entries(allowed)
      .filter(([, d]) => d.positional !== undefined)
      .sort(([, a], [, b]) => a.positional! - b.positional!);

    for (let i = 0; i < stage.params._positional.length; i++) {
      const value = stage.params._positional[i];
      if (i < positionalDefs.length) {
        const [pName, pDef] = positionalDefs[i];
        const typeError = checkParamType(pDef, value, pName, cmdName);
        if (typeError) return typeError;
      }
    }
  }

  // Check switches
  if (stage.switches.length > 0) {
    const allowedSwitches = (reg.switches || []).map((s) => s.toLowerCase());
    for (const sw of stage.switches) {
      if (!allowedSwitches.includes(sw.toLowerCase())) {
        // Could be an unknown param parsed as switch — check allowed params too
        const match = findAllowedParam(allowed, sw);
        if (!match) {
          return `${cmdName} : A parameter cannot be found that matches parameter name '${sw}'.`;
        }
      }
    }
  }

  // Check required params if a specific parameterSet is requested
  if (options?.parameterSet) {
    const set = reg.sets.find(
      (s) => s.name.toLowerCase() === options.parameterSet!.toLowerCase()
    );
    if (set) {
      for (const [pName, pDef] of Object.entries(set.params)) {
        if (!pDef.required) continue;
        // Check named params
        const hasNamed = Object.keys(stage.params).some(
          (k) => k !== "_positional" && k.toLowerCase() === pName.toLowerCase()
        );
        // Check positional params
        const hasPositional =
          pDef.positional !== undefined &&
          stage.params._positional &&
          stage.params._positional.length > pDef.positional;
        if (!hasNamed && !hasPositional) {
          return `${cmdName} : Parameter set '${options.parameterSet}' requires parameter '${pName}'.`;
        }
      }
    }
  }

  return null;
}

function checkParamType(
  def: ParamDef,
  value: string,
  paramName: string,
  cmdName: string
): string | null {
  if (def.type === "scriptblock") return null;

  if (def.type === "number") {
    if (isNaN(Number(value))) {
      return `${cmdName} : Cannot convert '-${paramName}' value "${value}" to type Number.`;
    }
  }

  if (def.type === "path") {
    if (!value || value.trim() === "") {
      return `${cmdName} : Cannot bind parameter '${paramName}'. The path must not be empty.`;
    }
  }

  if (def.type === "string") {
    if (!value || value.trim() === "") {
      return `${cmdName} : Cannot bind parameter '${paramName}'. The value must not be empty.`;
    }
  }

  return null;
}
