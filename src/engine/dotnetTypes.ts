/**
 * Simulated .NET static type calls and type casting for the SPE tutorial.
 * Only a curated set of types commonly used in Sitecore PowerShell scripts.
 */

export function callStaticMethod(
  typeName: string,
  methodOrProp: string,
  args: string[]
): unknown {
  const t = typeName.toLowerCase().replace(/^system\./, "");
  const m = methodOrProp.toLowerCase();

  // [DateTime]
  if (t === "datetime") {
    if (m === "now") return new Date().toISOString();
    if (m === "utcnow") return new Date().toISOString();
    if (m === "parse" && args.length > 0) {
      try {
        return new Date(args[0]).toISOString();
      } catch {
        return args[0];
      }
    }
  }

  // [Math]
  if (t === "math") {
    if (m === "round") {
      const n = parseFloat(args[0] || "0");
      const d = parseInt(args[1] || "0");
      const factor = Math.pow(10, d);
      return Math.round(n * factor) / factor;
    }
    if (m === "floor") return Math.floor(parseFloat(args[0] || "0"));
    if (m === "ceiling" || m === "ceil")
      return Math.ceil(parseFloat(args[0] || "0"));
    if (m === "abs") return Math.abs(parseFloat(args[0] || "0"));
  }

  // [string]
  if (t === "string") {
    if (m === "isnullorempty") {
      return !args[0] || args[0] === "";
    }
    if (m === "join" && args.length >= 2) {
      const sep = args[0];
      const items = args.slice(1);
      return items.join(sep);
    }
    if (m === "format" && args.length >= 1) {
      let fmt = args[0];
      for (let i = 1; i < args.length; i++) {
        fmt = fmt.replace(new RegExp(`\\{${i - 1}\\}`, "g"), args[i] || "");
      }
      return fmt;
    }
  }

  // [guid]
  if (t === "guid") {
    if (m === "newguid") {
      return crypto.randomUUID
        ? crypto.randomUUID()
        : "00000000-0000-0000-0000-000000000000";
    }
  }

  // [System.IO.Path]
  if (t === "io.path" || typeName.toLowerCase() === "system.io.path") {
    if (m === "getextension" && args.length > 0) {
      const match = args[0].match(/\.[^.]+$/);
      return match ? match[0] : "";
    }
    if (m === "getfilenamewithoutextension" && args.length > 0) {
      return args[0]
        .replace(/\.[^.]+$/, "")
        .split(/[/\\]/)
        .pop() || "";
    }
    if (m === "combine") {
      return args.join("/");
    }
  }

  // [Sitecore.Data.ID]
  if (
    typeName.toLowerCase() === "sitecore.data.id" ||
    t === "sitecore.data.id"
  ) {
    if (m === "newid") {
      const uuid = crypto.randomUUID
        ? crypto.randomUUID().toUpperCase()
        : "00000000-0000-0000-0000-000000000000";
      return `{${uuid}}`;
    }
    if (m === "parse" && args.length > 0) {
      const id = args[0].replace(/[{}]/g, "");
      return `{${id.toUpperCase()}}`;
    }
  }

  // Fallback: return a descriptive string
  return `[${typeName}]::${methodOrProp}(${args.join(", ")})`;
}

export function castType(typeName: string, value: unknown): unknown {
  const t = typeName.toLowerCase().replace(/^system\./, "");

  if (t === "int" || t === "int32" || t === "int64") {
    return parseInt(String(value)) || 0;
  }
  if (t === "string") {
    return String(value ?? "");
  }
  if (t === "bool" || t === "boolean") {
    const s = String(value).toLowerCase();
    return s !== "" && s !== "0" && s !== "false" && s !== "$false";
  }
  if (t === "double" || t === "float" || t === "decimal") {
    return parseFloat(String(value)) || 0;
  }

  return value;
}
