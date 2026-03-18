export interface SpeStreamEntry {
  stream: "output" | "error" | "warning" | "verbose" | "debug" | "information";
  text: string;
}

export interface SpeResponse {
  output: string;
  error: string | null;
  rawJson: unknown;
  /** Parsed CLIXML stream entries (populated when response contains CLIXML) */
  streams?: SpeStreamEntry[];
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
 * Map CLIXML `S` attribute values to stream types.
 * See: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/export-clixml
 */
const CLIXML_STREAM_MAP: Record<string, SpeStreamEntry["stream"]> = {
  Error: "error",
  Warning: "warning",
  Verbose: "verbose",
  Debug: "debug",
  Information: "information",
};

/**
 * Decode CLIXML escape sequences in text content.
 * CLIXML encodes special characters as `_xHHHH_` hex sequences.
 */
function decodeCliXmlText(text: string): string {
  return text
    .replace(/_x000D__x000A_/g, "\n")
    .replace(/_x000D_/g, "\r")
    .replace(/_x000A_/g, "\n")
    .replace(/_x0009_/g, "\t")
    .replace(/_x005F_/g, "_");
}

/**
 * Unescape XML entities in text content.
 */
function unescapeXml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Parse a CLIXML response into structured stream entries.
 * CLIXML responses start with `#< CLIXML` followed by XML containing
 * `<S S="StreamName">message</S>` elements inside an `<Objs>` root.
 *
 * Uses regex-based parsing to avoid DOMParser dependency (not available
 * in Node/test environments). The CLIXML format is simple enough for this.
 *
 * Mirrors the parsing approach used by SPE's Invoke-RemoteScript.ps1.
 */
export function parseCliXml(text: string): SpeStreamEntry[] | null {
  // CLIXML responses are prefixed with "#< CLIXML"
  const cliXmlPrefix = "#< CLIXML";
  const idx = text.indexOf(cliXmlPrefix);
  if (idx === -1) return null;

  const xmlPart = text.substring(idx + cliXmlPrefix.length);
  if (!xmlPart.trim()) return null;

  const entries: SpeStreamEntry[] = [];

  // Match <S S="StreamName">content</S> elements
  const pattern = /<S\s+S="([^"]+)">([\s\S]*?)<\/S>/g;
  let match;
  while ((match = pattern.exec(xmlPart)) !== null) {
    const streamAttr = match[1];
    const stream = CLIXML_STREAM_MAP[streamAttr];
    if (!stream) continue;

    let message = unescapeXml(match[2]);
    message = decodeCliXmlText(message).trim();

    if (message) {
      entries.push({ stream, text: message });
    }
  }

  return entries.length > 0 ? entries : null;
}

export function createSpeClient(config: SpeClientConfig) {
  const { url, username, password, sharedSecret, scriptEndpoint, audienceOverride } = config;
  const baseUrl = url.replace(/\/$/, "");

  // JWT audience must be the real Sitecore origin, even when requests go through a proxy
  const audience = audienceOverride
    ? new URL(audienceOverride).origin
    : new URL(baseUrl).origin;

  async function sendScript(script: string, raw: boolean): Promise<SpeResponse> {
    const sessionId = crypto.randomUUID();
    const endpoint = `${baseUrl}${scriptEndpoint}?sessionId=${sessionId}&rawOutput=true&persistentSession=false`;

    // When raw=false, wrap in a scriptblock so Out-String applies ps1xml
    // formatting rules. When raw=true, send as-is (for JSON responses).
    const finalScript = raw ? script : `& { ${script} } | Out-String`;
    const body = `${finalScript}<#${sessionId}#>`;

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

    const output = await response.text();

    // Try to parse CLIXML responses (error/warning/verbose/debug/info streams)
    const streams = parseCliXml(output);
    if (streams) {
      // Extract the first error message for backward-compat `error` field
      const firstError = streams.find((s) => s.stream === "error");
      return {
        output: "",
        error: firstError?.text ?? null,
        rawJson: null,
        streams,
      };
    }

    // SPE Remoting returns errors prefixed with ERROR:
    const errorMatch = output.match(/^ERROR:\s*(.+)/m);

    return {
      output: output.trimEnd(),
      error: errorMatch ? errorMatch[1] : null,
      rawJson: null,
    };
  }

  return {
    executeScript: (script: string) => sendScript(script, false),
    executeScriptRaw: (script: string) => sendScript(script, true),
  };
}

export type SpeClient = ReturnType<typeof createSpeClient>;
