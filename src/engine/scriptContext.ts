import type { DialogRequest, SitecoreItem } from "../types";

/** Default working directory — matches real SPE ISE default */
export const DEFAULT_CWD = "/sitecore/content/Home";

/**
 * SPE built-in variables that should always be available in any session.
 * Real Sitecore exposes these via the runspace; the simulator hard-codes
 * representative values so users can practice with the documented variable
 * names instead of made-up paths.
 */
export const SPE_BUILTIN_VARIABLES: Record<string, string> = {
  AppPath: "C:\\inetpub\\wwwroot\\sitecore",
  SitecoreDataFolder: "C:\\inetpub\\wwwroot\\sitecore\\App_Data",
  SitecoreLogFolder: "C:\\inetpub\\wwwroot\\sitecore\\App_Data\\logs",
  SitecoreTempFolder: "C:\\inetpub\\wwwroot\\sitecore\\App_Data\\temp",
  SitecorePackageFolder: "C:\\inetpub\\wwwroot\\sitecore\\App_Data\\packages",
  SitecoreSerializationFolder: "C:\\inetpub\\wwwroot\\sitecore\\App_Data\\serialization",
  SitecoreContextDatabase: "master",
  SitecoreContextSite: "shell",
  SitecoreContextUser: "sitecore\\admin",
  // SitecoreContextItem is set on construction to the cwd-resolved item; see seed()
};

/** Names of variables seeded by seed() — used to distinguish built-ins from user vars */
export const SPE_BUILTIN_NAMES: ReadonlySet<string> = new Set([
  ...Object.keys(SPE_BUILTIN_VARIABLES),
  "SitecoreContextItem",
]);

/** Script execution context — holds variable scope across lines */
export class ScriptContext {
  variables: Record<string, unknown> = {};
  outputs: string[] = [];
  errors: string[] = [];
  dialogRequests: DialogRequest[] = [];
  cwd: string = DEFAULT_CWD;

  constructor() {
    this.seedBuiltIns();
  }

  /** Seed (or re-seed) the SPE built-in variables. Called from constructor and
   * after a hard reset so they survive ISE-style variable wipes. */
  seedBuiltIns(): void {
    for (const [name, value] of Object.entries(SPE_BUILTIN_VARIABLES)) {
      this.variables[name] = value;
    }
    // Stub for $SitecoreContextItem — real SPE points it at the current item
    // in Content Editor; here it's a placeholder string the user can recognize.
    this.variables["SitecoreContextItem"] = "(current item)";
  }

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
