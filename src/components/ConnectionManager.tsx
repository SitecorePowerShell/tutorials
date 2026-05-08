import { useState, useCallback } from "react";
import type { AuthMode, ConnectionConfig, ConnectionTestResult } from "../providers/types";

interface ConnectionManagerProps {
  isConnected: boolean;
  connectionInfo: ConnectionTestResult | null;
  onConnect: (config: ConnectionConfig) => Promise<ConnectionTestResult>;
  onDisconnect: () => void;
  isExecuting: boolean;
}

const STORAGE_KEY = "spe-connection-config";

type AuthKind = AuthMode["kind"];
type OAuthProvider = "identity" | "auth0" | "custom";

interface SavedFormState {
  url?: string;
  useProxy?: boolean;
  proxyUrl?: string;
  authKind?: AuthKind;
  userSecret?: { username?: string };
  accessKey?: { accessKeyId?: string };
  oauthCc?: { clientId?: string; tokenUrl?: string; scope?: string; provider?: OAuthProvider };
}

const OAUTH_PROVIDER_DEFAULTS: Record<OAuthProvider, { tokenUrlPlaceholder: string; scope: string }> = {
  identity: {
    tokenUrlPlaceholder: "https://id.your-sitecore.com/connect/token",
    scope: "sitecore.profile openid",
  },
  auth0: {
    tokenUrlPlaceholder: "https://your-tenant.auth0.com/oauth/token",
    scope: "",
  },
  custom: {
    tokenUrlPlaceholder: "https://idp.example.com/token",
    scope: "",
  },
};

function loadSavedState(): SavedFormState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved) as SavedFormState;
    return {
      url: parsed.url ?? "",
      useProxy: !!parsed.useProxy,
      proxyUrl: parsed.proxyUrl ?? "",
      authKind: parsed.authKind ?? "user-secret",
      userSecret: { username: parsed.userSecret?.username ?? "" },
      accessKey: { accessKeyId: parsed.accessKey?.accessKeyId ?? "" },
      oauthCc: {
        clientId: parsed.oauthCc?.clientId ?? "",
        tokenUrl: parsed.oauthCc?.tokenUrl ?? "",
        scope: parsed.oauthCc?.scope ?? "",
        provider: parsed.oauthCc?.provider ?? "identity",
      },
    };
  } catch {
    return {};
  }
}

function saveState(state: SavedFormState): void {
  try {
    // Only non-sensitive identifiers are persisted. Shared secrets and client
    // secrets stay in component state for the session and are never written.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function ConnectionManager({
  isConnected,
  connectionInfo,
  onConnect,
  onDisconnect,
  isExecuting,
}: ConnectionManagerProps) {
  const [expanded, setExpanded] = useState(false);
  const saved = loadSavedState();

  const [url, setUrl] = useState(saved.url || "");
  const [useProxy, setUseProxy] = useState(!!saved.useProxy);
  const [proxyUrl, setProxyUrl] = useState(saved.proxyUrl || "");
  const [authKind, setAuthKind] = useState<AuthKind>(saved.authKind || "user-secret");

  // Per-mode identifier state — preserved across mode switches so the user
  // doesn't lose what they typed when toggling tabs.
  const [username, setUsername] = useState(saved.userSecret?.username || "");
  const [sharedSecretUS, setSharedSecretUS] = useState("");

  const [accessKeyId, setAccessKeyId] = useState(saved.accessKey?.accessKeyId || "");
  const [sharedSecretAK, setSharedSecretAK] = useState("");

  const [clientId, setClientId] = useState(saved.oauthCc?.clientId || "");
  const [clientSecret, setClientSecret] = useState("");
  const [tokenUrl, setTokenUrl] = useState(saved.oauthCc?.tokenUrl || "");
  const [scope, setScope] = useState(saved.oauthCc?.scope || "");
  const [oauthProvider, setOauthProvider] = useState<OAuthProvider>(saved.oauthCc?.provider || "identity");

  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);

  const handleProviderChange = useCallback((next: OAuthProvider) => {
    setOauthProvider(next);
    // Helpful default: only overwrite scope if it's empty or matches another preset
    const presets = Object.values(OAUTH_PROVIDER_DEFAULTS).map((p) => p.scope);
    if (!scope || presets.includes(scope)) {
      setScope(OAUTH_PROVIDER_DEFAULTS[next].scope);
    }
  }, [scope]);

  const buildAuth = useCallback((): { auth: AuthMode; missing: string | null } => {
    if (authKind === "user-secret") {
      if (!username.trim()) return { auth: null as never, missing: "Username is required" };
      if (!sharedSecretUS) return { auth: null as never, missing: "Shared secret is required" };
      return { auth: { kind: "user-secret", username: username.trim(), sharedSecret: sharedSecretUS }, missing: null };
    }
    if (authKind === "accesskey") {
      if (!accessKeyId.trim()) return { auth: null as never, missing: "Access Key ID is required" };
      if (!sharedSecretAK) return { auth: null as never, missing: "Shared secret is required" };
      return { auth: { kind: "accesskey", accessKeyId: accessKeyId.trim(), sharedSecret: sharedSecretAK }, missing: null };
    }
    if (!clientId.trim()) return { auth: null as never, missing: "Client ID is required" };
    if (!clientSecret) return { auth: null as never, missing: "Client secret is required" };
    if (!tokenUrl.trim()) return { auth: null as never, missing: "Token URL is required" };
    return {
      auth: {
        kind: "oauth-cc",
        clientId: clientId.trim(),
        clientSecret,
        tokenUrl: tokenUrl.trim(),
        scope: scope.trim() || undefined,
        provider: oauthProvider,
      },
      missing: null,
    };
  }, [authKind, username, sharedSecretUS, accessKeyId, sharedSecretAK, clientId, clientSecret, tokenUrl, scope, oauthProvider]);

  const handleConnect = useCallback(async () => {
    if (!url.trim()) {
      setError("Instance URL is required");
      return;
    }
    const { auth, missing } = buildAuth();
    if (missing) {
      setError(missing);
      return;
    }
    const config: ConnectionConfig = {
      url: url.trim(),
      auth,
      useProxy,
      ...(useProxy && proxyUrl.trim() ? { proxyUrl: proxyUrl.trim() } : {}),
    };

    setError("");
    setConnecting(true);

    try {
      const result = await onConnect(config);
      if (result.connected) {
        saveState({
          url: config.url,
          useProxy: config.useProxy,
          proxyUrl: config.proxyUrl,
          authKind,
          userSecret: { username: username.trim() },
          accessKey: { accessKeyId: accessKeyId.trim() },
          oauthCc: {
            clientId: clientId.trim(),
            tokenUrl: tokenUrl.trim(),
            scope: scope.trim(),
            provider: oauthProvider,
          },
        });
        setExpanded(false);
      } else {
        setError(result.error || "Connection failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  }, [url, useProxy, proxyUrl, authKind, username, accessKeyId, clientId, tokenUrl, scope, oauthProvider, buildAuth, onConnect]);

  const handleDisconnect = useCallback(() => {
    onDisconnect();
    setSharedSecretUS("");
    setSharedSecretAK("");
    setClientSecret("");
  }, [onDisconnect]);

  // The label shown in the connected pill / details — best-effort identifier
  // for the active auth mode, with the server-reported user taking priority.
  const activeIdentifier =
    connectionInfo?.user ||
    (authKind === "user-secret" ? username : authKind === "accesskey" ? accessKeyId : clientId);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        disabled={isExecuting}
        title={isConnected ? "View connection details" : "Connect to Sitecore instance"}
        style={{
          background: "none",
          border: `1px solid ${isConnected ? "var(--color-accent-primary, #00a4ef)" : "var(--color-border-base, #333)"}`,
          color: isConnected ? "var(--color-accent-primary, #00a4ef)" : "var(--color-text-secondary, #999)",
          borderRadius: 4,
          padding: "4px 10px",
          fontSize: 12,
          cursor: isExecuting ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: 8, color: isConnected ? "#4caf50" : "#666" }}>
          {isConnected ? "●" : "○"}
        </span>
        {isConnected ? "Connected" : "Connect"}
      </button>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        top: "100%",
        right: 0,
        marginTop: 4,
        background: "var(--color-bg-panel, #1e1e1e)",
        border: "1px solid var(--color-border-base, #333)",
        borderRadius: 6,
        padding: 16,
        width: 340,
        zIndex: 1000,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-text-primary, #e0e0e0)",
          }}
        >
          {isConnected ? "Connection" : "Connect to Sitecore"}
        </span>
        <button
          onClick={() => setExpanded(false)}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted, #666)",
            cursor: "pointer",
            fontSize: 16,
            padding: 4,
          }}
        >
          ×
        </button>
      </div>

      {isConnected && connectionInfo && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              background: "var(--color-bg-base, #121212)",
              border: "1px solid var(--color-border-base, #333)",
              borderRadius: 4,
              padding: 10,
              fontSize: 12,
              lineHeight: 1.6,
              color: "var(--color-text-secondary, #999)",
            }}
          >
            <div><span style={{ color: "var(--color-text-muted, #666)" }}>URL:</span> <span style={{ color: "var(--color-text-primary, #e0e0e0)" }}>{url}</span></div>
            <div><span style={{ color: "var(--color-text-muted, #666)" }}>User:</span> <span style={{ color: "var(--color-text-primary, #e0e0e0)" }}>{activeIdentifier}</span></div>
            <div><span style={{ color: "var(--color-text-muted, #666)" }}>Auth:</span> <span style={{ color: "var(--color-text-primary, #e0e0e0)" }}>{authLabel(authKind)}</span></div>
            <div><span style={{ color: "var(--color-text-muted, #666)" }}>SPE Version:</span> <span style={{ color: "var(--color-text-primary, #e0e0e0)" }}>{connectionInfo.version || "unknown"}</span></div>
          </div>

          <button
            onClick={() => {
              handleDisconnect();
              setExpanded(false);
            }}
            disabled={isExecuting}
            style={{
              background: "none",
              color: "#f44336",
              border: "1px solid #f44336",
              borderRadius: 4,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: isExecuting ? "not-allowed" : "pointer",
            }}
          >
            Disconnect
          </button>
        </div>
      )}

      {!isConnected && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={labelStyle}>
            Instance URL
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://sitecore.example.com"
              disabled={connecting}
              style={inputStyle}
            />
          </label>

          {/* 3-way segmented control */}
          <div style={{ display: "flex", gap: 0, borderRadius: 4, overflow: "hidden", border: "1px solid var(--color-border-base, #333)" }}>
            {(["user-secret", "accesskey", "oauth-cc"] as AuthKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setAuthKind(kind)}
                disabled={connecting}
                style={{
                  flex: 1,
                  background: authKind === kind ? "var(--color-accent-primary, #00a4ef)" : "transparent",
                  color: authKind === kind ? "#fff" : "var(--color-text-secondary, #999)",
                  border: "none",
                  padding: "6px 4px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: connecting ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {authShortLabel(kind)}
              </button>
            ))}
          </div>

          {authKind === "user-secret" && (
            <>
              <label style={labelStyle}>
                Username
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="sitecore\\admin"
                  disabled={connecting}
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Shared Secret
                <input
                  type="password"
                  value={sharedSecretUS}
                  onChange={(e) => setSharedSecretUS(e.target.value)}
                  placeholder="SPE Remoting shared secret"
                  disabled={connecting}
                  style={inputStyle}
                />
              </label>
            </>
          )}

          {authKind === "accesskey" && (
            <>
              <label style={labelStyle}>
                Access Key ID
                <input
                  type="text"
                  value={accessKeyId}
                  onChange={(e) => setAccessKeyId(e.target.value)}
                  placeholder="registered access key id"
                  disabled={connecting}
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Shared Secret
                <input
                  type="password"
                  value={sharedSecretAK}
                  onChange={(e) => setSharedSecretAK(e.target.value)}
                  placeholder="secret bound to the access key"
                  disabled={connecting}
                  style={inputStyle}
                />
              </label>
            </>
          )}

          {authKind === "oauth-cc" && (
            <>
              <label style={labelStyle}>
                Identity Provider
                <select
                  value={oauthProvider}
                  onChange={(e) => handleProviderChange(e.target.value as OAuthProvider)}
                  disabled={connecting}
                  style={inputStyle}
                >
                  <option value="identity">Sitecore Identity</option>
                  <option value="auth0">Auth0</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              <label style={labelStyle}>
                Token URL
                <input
                  type="url"
                  value={tokenUrl}
                  onChange={(e) => setTokenUrl(e.target.value)}
                  placeholder={OAUTH_PROVIDER_DEFAULTS[oauthProvider].tokenUrlPlaceholder}
                  disabled={connecting}
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Client ID
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  disabled={connecting}
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Client Secret
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  disabled={connecting}
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Scope <span style={{ color: "var(--color-text-muted, #666)", fontWeight: 400 }}>(optional)</span>
                <input
                  type="text"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  placeholder={OAUTH_PROVIDER_DEFAULTS[oauthProvider].scope || "leave blank if not required"}
                  disabled={connecting}
                  style={inputStyle}
                />
              </label>
            </>
          )}

          <label
            style={{
              ...labelStyle,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <input
              type="checkbox"
              checked={useProxy}
              onChange={(e) => setUseProxy(e.target.checked)}
              disabled={connecting}
            />
            Use CORS proxy
          </label>

          {useProxy && (
            <label style={labelStyle}>
              Proxy URL
              <input
                type="url"
                value={proxyUrl}
                onChange={(e) => setProxyUrl(e.target.value)}
                placeholder="http://localhost:3001"
                disabled={connecting}
                style={inputStyle}
              />
              <span style={{ fontSize: 10, color: "var(--color-text-muted, #666)", lineHeight: 1.3 }}>
                Run: bun run cors-proxy -- --target {url || "<sitecore-url>"}
                {authKind === "oauth-cc" && (
                  <>
                    <br />
                    OAuth token requests are forwarded through the same proxy via /__corsproxy/passthrough.
                  </>
                )}
              </span>
            </label>
          )}

          {error && (
            <div style={{ color: "#f44336", fontSize: 12 }}>{error}</div>
          )}

          <button
            onClick={handleConnect}
            disabled={connecting}
            style={{
              background: connecting
                ? "var(--color-border-base, #333)"
                : "var(--color-accent-primary, #00a4ef)",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: connecting ? "not-allowed" : "pointer",
              marginTop: 4,
            }}
          >
            {connecting ? "Connecting..." : "Connect"}
          </button>

          <div
            style={{
              fontSize: 11,
              color: "var(--color-text-muted, #666)",
              lineHeight: 1.4,
            }}
          >
            Requires SPE Remoting enabled on your Sitecore instance.
            Secrets and client secrets are never persisted — only identifiers and the
            instance URL are saved.
          </div>
        </div>
      )}
    </div>
  );
}

function authShortLabel(kind: AuthKind): string {
  switch (kind) {
    case "user-secret":
      return "User";
    case "accesskey":
      return "Access Key";
    case "oauth-cc":
      return "OAuth";
  }
}

function authLabel(kind: AuthKind): string {
  switch (kind) {
    case "user-secret":
      return "Username + Shared Secret";
    case "accesskey":
      return "Access Key + Shared Secret";
    case "oauth-cc":
      return "OAuth (client credentials)";
  }
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  color: "var(--color-text-secondary, #999)",
};

const inputStyle: React.CSSProperties = {
  background: "var(--color-bg-base, #121212)",
  border: "1px solid var(--color-border-base, #333)",
  borderRadius: 4,
  padding: "6px 10px",
  fontSize: 13,
  color: "var(--color-text-primary, #e0e0e0)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
