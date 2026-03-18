export interface SpeResponse {
  output: string;
  error: string | null;
  rawJson: unknown;
}

export interface SpeClientConfig {
  url: string;
  username: string;
  password?: string;
  sharedSecret?: string;
  scriptEndpoint: string;
  /** Override the JWT audience (e.g., the real Sitecore URL when going through a proxy) */
  audienceOverride?: string;
}

/**
 * Create an HS256 JWT matching SPE Remoting's New-Jwt.ps1 implementation.
 * Claims: iss="SPE Remoting", aud=<base url origin>, name=<username>, exp=<now+30s>
 */
async function createSpeJwt(
  sharedSecret: string,
  audience: string,
  username: string
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: "SPE Remoting",
    exp: Math.floor(Date.now() / 1000) + 30,
    aud: audience,
    name: username,
  };

  const encode = (obj: object) => base64UrlEncode(JSON.stringify(obj));
  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const toBeSigned = `${headerB64}.${payloadB64}`;

  // Use Web Crypto API (available in browsers, Bun, and Node 18+)
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sharedSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(toBeSigned));
  const signature = base64UrlEncodeBuffer(new Uint8Array(sigBuffer));

  return `${toBeSigned}.${signature}`;
}

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlEncodeBuffer(buffer: Uint8Array): string {
  let binary = "";
  for (const byte of buffer) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * Format the `output` field from an SPE JSON response into display text.
 * - Arrays of objects → tabular text (aligned columns)
 * - Primitives / strings → plain text
 * - Single objects → key: value pairs
 */
function formatOutput(output: unknown): string {
  if (output === null || output === undefined) return "";

  // Plain string
  if (typeof output === "string") return output;

  // Primitive (number, boolean)
  if (typeof output !== "object") return String(output);

  // Array of objects → table format
  if (Array.isArray(output)) {
    if (output.length === 0) return "";

    // Array of primitives
    if (typeof output[0] !== "object" || output[0] === null) {
      return output.map(String).join("\n");
    }

    // Collect all keys across all objects for column headers
    const keys = [...new Set(output.flatMap((item) => Object.keys(item)))];

    // Calculate column widths
    const widths = keys.map((key) =>
      Math.max(key.length, ...output.map((item) => String(item[key] ?? "").length))
    );

    // Header row
    const header = keys.map((key, i) => key.padEnd(widths[i])).join("  ");
    const separator = widths.map((w) => "-".repeat(w)).join("  ");
    const rows = output.map((item) =>
      keys.map((key, i) => String(item[key] ?? "").padEnd(widths[i])).join("  ")
    );

    return [header, separator, ...rows].join("\n");
  }

  // Single object → key: value pairs
  const entries = Object.entries(output as Record<string, unknown>);
  if (entries.length === 0) return "";

  const maxKeyLen = Math.max(...entries.map(([k]) => k.length));
  return entries
    .map(([key, value]) => `${key.padEnd(maxKeyLen)} : ${value ?? ""}`)
    .join("\n");
}

export function createSpeClient(config: SpeClientConfig) {
  const { url, username, password, sharedSecret, scriptEndpoint, audienceOverride } = config;
  const baseUrl = url.replace(/\/$/, "");

  // JWT audience must be the real Sitecore origin, even when requests go through a proxy
  const audience = audienceOverride
    ? new URL(audienceOverride).origin
    : new URL(baseUrl).origin;

  return {
    async executeScript(script: string): Promise<SpeResponse> {
      const sessionId = crypto.randomUUID();
      const endpoint = `${baseUrl}${scriptEndpoint}?sessionId=${sessionId}&rawOutput=false&outputFormat=Json&persistentSession=false`;

      // Build body matching SPE Remoting format: script<#sessionId#>params
      const body = `${script}<#${sessionId}#>`;

      let authorization: string;
      if (sharedSecret) {
        const token = await createSpeJwt(sharedSecret, audience, username);
        authorization = `Bearer ${token}`;
      } else {
        authorization = `Basic ${btoa(`${username}:${password || ""}`)}`;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: authorization,
          "Content-Type": "text/plain",
        },
        body,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        return {
          output: "",
          error: `HTTP ${response.status}: ${response.statusText}${text ? ` — ${text}` : ""}`,
          rawJson: null,
        };
      }

      // SPE Remoting JSON format returns { output: ..., errors: [...] }
      const text = await response.text();
      let rawJson: unknown = null;
      let output: string;
      let error: string | null = null;

      try {
        const parsed = JSON.parse(text);
        rawJson = parsed;

        // Extract errors from the structured response
        if (parsed.errors && Array.isArray(parsed.errors) && parsed.errors.length > 0) {
          error = parsed.errors.join("\n");
        }

        // Format the output for display
        if (parsed.output !== undefined && parsed.output !== null) {
          output = formatOutput(parsed.output);
        } else {
          output = "";
        }
      } catch {
        // Server may not support JSON format — fall back to raw text
        output = text;
        const errorMatch = text.match(/^ERROR:\s*(.+)/m);
        if (errorMatch) error = errorMatch[1];
      }

      return { output, error, rawJson };
    },
  };
}

export type SpeClient = ReturnType<typeof createSpeClient>;
