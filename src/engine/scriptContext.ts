import type { DialogRequest, SitecoreItem } from "../types";

/** Script execution context — holds variable scope across lines */
export class ScriptContext {
  variables: Record<string, unknown> = {};
  outputs: string[] = [];
  errors: string[] = [];
  dialogRequests: DialogRequest[] = [];

  setVar(name: string, value: unknown): void {
    this.variables[name.replace(/^\$/, "")] = value;
  }

  getVar(name: string): unknown {
    const clean = name.replace(/^\$/, "");
    return this.variables[clean];
  }

  /** Expand $variable references in a string */
  expandVars(str: string): string {
    if (!str) return str;
    return str.replace(/\$(\w+)/g, (match, varName) => {
      const val = this.variables[varName];
      if (val === undefined) return match;
      if (Array.isArray(val)) return `[Array: ${val.length} items]`;
      if (typeof val === "object" && val !== null && "name" in val)
        return (val as SitecoreItem).name;
      return String(val);
    });
  }
}
