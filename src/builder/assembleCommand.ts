import { CMDLET_REGISTRY } from "./cmdletRegistry";

export interface PipelineStage {
  id: string;
  cmdlet: string;
  params: Record<string, string>;
  switches: string[];
  locked?: boolean;
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
