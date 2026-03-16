/**
 * Simulated .NET static type calls and type casting for the SPE tutorial.
 * Only a curated set of types commonly used in Sitecore PowerShell scripts.
 */

function formatTimeSpan(totalSeconds: number): string {
  const negative = totalSeconds < 0;
  totalSeconds = Math.abs(totalSeconds);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const sign = negative ? "-" : "";
  return days > 0 ? `${sign}${days}.${hh}:${mm}:${ss}` : `${sign}${hh}:${mm}:${ss}`;
}

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

  // [TimeSpan]
  if (t === "timespan") {
    if (m === "fromdays") return formatTimeSpan(parseFloat(args[0] || "0") * 86400);
    if (m === "fromhours") return formatTimeSpan(parseFloat(args[0] || "0") * 3600);
    if (m === "fromminutes") return formatTimeSpan(parseFloat(args[0] || "0") * 60);
    if (m === "fromseconds") return formatTimeSpan(parseFloat(args[0] || "0"));
    if (m === "parse" && args.length > 0) return args[0];
  }

  // [Regex] / [System.Text.RegularExpressions.Regex]
  if (t === "regex" || t === "text.regularexpressions.regex") {
    if (m === "ismatch" && args.length >= 2) {
      try {
        return new RegExp(args[1]).test(args[0]);
      } catch {
        return false;
      }
    }
    if (m === "match" && args.length >= 2) {
      try {
        const match = args[0].match(new RegExp(args[1]));
        return match ? match[0] : "";
      } catch {
        return "";
      }
    }
    if (m === "replace" && args.length >= 3) {
      try {
        return args[0].replace(new RegExp(args[1], "g"), args[2]);
      } catch {
        return args[0];
      }
    }
    if (m === "split" && args.length >= 2) {
      try {
        return args[0].split(new RegExp(args[1]));
      } catch {
        return [args[0]];
      }
    }
  }

  // [Array]
  if (t === "array") {
    if (m === "reverse") return [...args].reverse();
    if (m === "sort") return [...args].sort();
  }

  // [Convert]
  if (t === "convert") {
    if (m === "toint32") return parseInt(String(args[0])) || 0;
    if (m === "tostring") return String(args[0] ?? "");
    if (m === "todouble") return parseFloat(String(args[0])) || 0;
    if (m === "toboolean") {
      const s = String(args[0]).toLowerCase();
      return s !== "" && s !== "0" && s !== "false";
    }
    if (m === "tobase64string") return btoa(args[0] || "");
    if (m === "frombase64string") return atob(args[0] || "");
  }

  // [Environment]
  if (t === "environment") {
    if (m === "newline") return "\n";
    if (m === "machinename") return "SC-SERVER-01";
    if (m === "username") return "sitecore\\admin";
  }

  // [Sitecore.Data.Database] / [Sitecore.Configuration.Factory]
  if (
    typeName.toLowerCase() === "sitecore.data.database" ||
    typeName.toLowerCase() === "sitecore.configuration.factory"
  ) {
    if (m === "getdatabase") return args[0] || "master";
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

  if (t === "array") {
    return Array.isArray(value) ? value : [value];
  }
  if (t === "datetime") {
    try {
      return new Date(String(value)).toISOString();
    } catch {
      return String(value);
    }
  }
  if (t === "timespan") {
    const n = parseFloat(String(value));
    if (!isNaN(n)) return formatTimeSpan(n);
    return String(value);
  }
  if (t === "regex") {
    return String(value);
  }

  return value;
}
