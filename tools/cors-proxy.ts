/**
 * Local CORS proxy for SPE Remoting.
 *
 * Runs on the user's machine so it can reach Sitecore instances on internal
 * networks. Forwards requests to the target instance and adds CORS headers
 * so the browser allows the response.
 *
 * Usage:
 *   bun run tools/cors-proxy.ts --target https://sitecore.example.com
 *   bun run tools/cors-proxy.ts --target https://sitecore.example.com --port 3001
 */

const DEFAULT_PORT = 3001;
const ALLOWED_METHODS = "GET, POST, OPTIONS";
const ALLOWED_HEADERS = "Authorization, Content-Type";

function parseArgs(args: string[]): { target: string; port: number } {
  let target = "";
  let port = DEFAULT_PORT;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--target" && args[i + 1]) {
      target = args[++i].replace(/\/$/, "");
    } else if (args[i] === "--port" && args[i + 1]) {
      port = parseInt(args[++i], 10);
    }
  }

  if (!target) {
    console.error("Usage: bun run tools/cors-proxy.ts --target <sitecore-url> [--port <port>]");
    console.error("  --target  Base URL of the Sitecore instance (required)");
    console.error("  --port    Local port to listen on (default: 3001)");
    process.exit(1);
  }

  try {
    new URL(target);
  } catch {
    console.error(`Invalid target URL: ${target}`);
    process.exit(1);
  }

  if (isNaN(port) || port < 1 || port > 65535) {
    console.error(`Invalid port: ${port}`);
    process.exit(1);
  }

  return { target, port };
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function log(icon: string, msg: string): void {
  console.log(`${timestamp()}  ${icon} ${msg}`);
}

const { target, port } = parseArgs(process.argv.slice(2));

const server = Bun.serve({
  port,
  async fetch(req) {
    const origin = req.headers.get("Origin") || "*";
    const cors = corsHeaders(origin);

    // Handle preflight
    if (req.method === "OPTIONS") {
      log("~", `PREFLIGHT ${req.url}`);
      return new Response(null, { status: 204, headers: cors });
    }

    // Build the target URL: take the request path and append to target
    const url = new URL(req.url);
    const targetUrl = `${target}${url.pathname}${url.search}`;
    const start = performance.now();

    log(">", `${req.method} ${url.pathname}`);

    try {
      // Forward the request
      const proxyHeaders = new Headers();
      const auth = req.headers.get("Authorization");
      if (auth) {
        proxyHeaders.set("Authorization", auth);
        const authType = auth.startsWith("Bearer") ? "JWT" : "Basic";
        log(" ", `Auth: ${authType}`);
      }
      const contentType = req.headers.get("Content-Type");
      if (contentType) proxyHeaders.set("Content-Type", contentType);

      const body = req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined;
      if (body) {
        // Extract the script from the SPE body format: script<#sessionId#>
        const scriptMatch = body.match(/^([\s\S]*?)<#/);
        if (scriptMatch) {
          const script = scriptMatch[1].trim();
          const preview = script.length > 120 ? script.slice(0, 120) + "..." : script;
          log(" ", `Script: ${preview}`);
        }
      }

      const proxyResponse = await fetch(targetUrl, {
        method: req.method,
        headers: proxyHeaders,
        body,
        // @ts-expect-error -- Bun supports this option to skip TLS verification for self-signed certs
        tls: { rejectUnauthorized: false },
      });

      const elapsed = Math.round(performance.now() - start);

      // Build response with CORS headers
      const responseHeaders = new Headers(cors);
      const respContentType = proxyResponse.headers.get("Content-Type");
      if (respContentType) responseHeaders.set("Content-Type", respContentType);

      const responseText = await proxyResponse.text();

      if (proxyResponse.ok) {
        const preview = responseText.length > 200
          ? responseText.slice(0, 200).replace(/\n/g, "\\n") + "..."
          : responseText.replace(/\n/g, "\\n");
        log("<", `${proxyResponse.status} (${elapsed}ms) ${preview}`);
      } else {
        log("!", `${proxyResponse.status} ${proxyResponse.statusText} (${elapsed}ms)`);
        log(" ", responseText.slice(0, 500));
      }

      return new Response(responseText, {
        status: proxyResponse.status,
        statusText: proxyResponse.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      const message = err instanceof Error ? err.message : String(err);
      log("!", `ERROR (${elapsed}ms) ${message}`);
      return new Response(JSON.stringify({ error: message }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  },
});

console.log(`SPE CORS Proxy`);
console.log(`  Listening: http://localhost:${server.port}`);
console.log(`  Target:    ${target}`);
console.log(`\nUse http://localhost:${server.port} as the Instance URL in the tutorial.`);
