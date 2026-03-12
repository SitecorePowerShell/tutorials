import { CMDLET_REGISTRY } from "./cmdletRegistry";

export interface PipelineStage {
  id: string;
  cmdlet: string;
  params: Record<string, string>;
  switches: string[];
  locked?: boolean;
}

/** Create a new pipeline stage, pre-filling params that have defaultValue */
export function createStage(cmdletName: string): PipelineStage {
  const def = CMDLET_REGISTRY[cmdletName];
  const params: Record<string, string> = {};
  if (def) {
    for (const p of def.params) {
      if (p.defaultValue) {
        params[p.name] = p.defaultValue;
      }
    }
  }
  return {
    id: crypto.randomUUID(),
    cmdlet: cmdletName,
    params,
    switches: [],
  };
}

export interface ValidationError {
  stageIndex: number;
  cmdlet: string;
  paramName: string;
}

/** Return missing required params across all stages */
export function getValidationErrors(stages: PipelineStage[]): ValidationError[] {
  const errors: ValidationError[] = [];
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const def = CMDLET_REGISTRY[stage.cmdlet];
    if (!def) continue;
    for (const paramDef of def.params) {
      if (paramDef.required && !stage.params[paramDef.name]?.trim()) {
        errors.push({ stageIndex: i, cmdlet: stage.cmdlet, paramName: paramDef.name });
      }
    }
  }
  return errors;
}

/** Assemble pipeline stages into a PowerShell command string */
export function assembleCommand(stages: PipelineStage[]): string {
  if (stages.length === 0) return "";

  const parts = stages.map((stage) => {
    const def = CMDLET_REGISTRY[stage.cmdlet];
    const tokens: string[] = [stage.cmdlet];

    if (def) {
      for (const paramDef of def.params) {
        const value = stage.params[paramDef.name];
        if (!value) continue;

        if (paramDef.type === "expression") {
          // Expression params are positional (no -ParamName prefix)
          tokens.push(value);
        } else if (paramDef.type === "propertyList") {
          tokens.push(`-${paramDef.name}`, value);
        } else {
          tokens.push(`-${paramDef.name}`, value);
        }
      }

      for (const sw of stage.switches) {
        tokens.push(`-${sw}`);
      }
    }

    return tokens.join(" ");
  });

  return parts.join(" | ");
}
