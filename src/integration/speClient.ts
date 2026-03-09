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
}

/**
 * Create an HS256 JWT matching SPE Remoting's New-Jwt.ps1 implementation.
 * Claims: iss="SPE Remoting", aud=<base url origin>, name=<username>, exp=<now+30s>
 */
function createSpeJwt(
  sharedSecret: string,
  audience: string,
  username: string
): string {
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

  // Use Node/Bun built-in crypto for HMAC-SHA256
  const crypto = require("crypto");
  const signature = crypto
    .createHmac("sha256", sharedSecret)
    .update(toBeSigned)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${toBeSigned}.${signature}`;
}

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function createSpeClient(config: SpeClientConfig) {
  const { url, username, password, sharedSecret, scriptEndpoint } = config;
  const baseUrl = url.replace(/\/$/, "");

  // Extract origin (scheme + host) for JWT audience, matching SPE's Uri.GetLeftPart(Authority)
  const audience = new URL(baseUrl).origin;

  return {
    async executeScript(script: string): Promise<SpeResponse> {
      const sessionId = crypto.randomUUID();
      const endpoint = `${baseUrl}${scriptEndpoint}?sessionId=${sessionId}&rawOutput=true&persistentSession=false`;

      // Build body matching SPE Remoting format: script<#sessionId#>params
      const body = `${script}<#${sessionId}#>`;

      let authorization: string;
      if (sharedSecret) {
        const token = createSpeJwt(sharedSecret, audience, username);
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
