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
      const endpoint = `${baseUrl}${scriptEndpoint}?sessionId=${sessionId}&rawOutput=true&persistentSession=false`;

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

      const contentType = response.headers.get("content-type") || "";
      let rawJson: unknown = null;
      let output: string;

      if (contentType.includes("application/json")) {
        rawJson = await response.json();
        output = JSON.stringify(rawJson, null, 2);
      } else {
        output = await response.text();
      }

      // SPE Remoting returns errors in a specific format
      const errorMatch = output.match(/^ERROR:\s*(.+)/m);

      return {
        output,
        error: errorMatch ? errorMatch[1] : null,
        rawJson,
      };
    },
  };
}

export type SpeClient = ReturnType<typeof createSpeClient>;
