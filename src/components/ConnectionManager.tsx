import { useState, useCallback } from "react";
import type { ConnectionConfig, ConnectionTestResult } from "../providers/types";

interface ConnectionManagerProps {
  isConnected: boolean;
  connectionInfo: ConnectionTestResult | null;
  onConnect: (config: ConnectionConfig) => Promise<ConnectionTestResult>;
  onDisconnect: () => void;
  isExecuting: boolean;
}

const STORAGE_KEY = "spe-connection-config";

function loadSavedConfig(): Partial<ConnectionConfig> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Never persist passwords/secrets — only URL, username, and proxy prefs
      return {
        url: parsed.url || "",
        username: parsed.username || "",
        useProxy: parsed.useProxy || false,
        proxyUrl: parsed.proxyUrl || "",
      };
    }
  } catch { /* ignore */ }
  return {};
}

function saveConfig(config: ConnectionConfig): void {
  try {
    // Only persist non-sensitive fields
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        url: config.url,
        username: config.username,
        useProxy: config.useProxy,
        proxyUrl: config.proxyUrl,
      })
    );
  } catch { /* ignore */ }
}

export function ConnectionManager({
  isConnected,
  connectionInfo,
  onConnect,
  onDisconnect,
  isExecuting,
}: ConnectionManagerProps) {
  const [expanded, setExpanded] = useState(false);
  const saved = loadSavedConfig();
  const [url, setUrl] = useState(saved.url || "");
  const [username, setUsername] = useState(saved.username || "");
  const [password, setPassword] = useState("");
  const [sharedSecret, setSharedSecret] = useState("");
  const [authMode, setAuthMode] = useState<"basic" | "jwt">("jwt");
  const [useProxy, setUseProxy] = useState(saved.useProxy || false);
  const [proxyUrl, setProxyUrl] = useState(saved.proxyUrl || "");
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);

  const handleConnect = useCallback(async () => {
    if (!url.trim() || !username.trim()) {
      setError("URL and username are required");
      return;
    }
    const config: ConnectionConfig = {
      url: url.trim(),
      username: username.trim(),
      ...(authMode === "basic"
        ? { password }
        : { sharedSecret }),
      useProxy,
      ...(useProxy && proxyUrl.trim() ? { proxyUrl: proxyUrl.trim() } : {}),
    };

    setError("");
    setConnecting(true);

    try {
      const result = await onConnect(config);
      if (result.connected) {
        saveConfig(config);
        // Stay expanded briefly to show success, then close
        setExpanded(false);
      } else {
        setError(result.error || "Connection failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  }, [url, username, password, sharedSecret, authMode, useProxy, proxyUrl, onConnect]);

  const handleDisconnect = useCallback(() => {
    onDisconnect();
    setPassword("");
    setSharedSecret("");
  }, [onDisconnect]);

  // Button always opens the dialog
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
          {isConnected ? "\u25CF" : "\u25CB"}
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
        width: 320,
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

      {/* Connected state — show info + disconnect */}
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
            <div><span style={{ color: "var(--color-text-muted, #666)" }}>User:</span> <span style={{ color: "var(--color-text-primary, #e0e0e0)" }}>{connectionInfo.user || username}</span></div>
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

      {/* Disconnected state — show connect form */}
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

          <div style={{ display: "flex", gap: 8 }}>
            <label
              style={{
                ...labelStyle,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <input
                type="radio"
                name="authMode"
                checked={authMode === "jwt"}
                onChange={() => setAuthMode("jwt")}
                disabled={connecting}
              />
              JWT (Shared Secret)
            </label>
            <label
              style={{
                ...labelStyle,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <input
                type="radio"
                name="authMode"
                checked={authMode === "basic"}
                onChange={() => setAuthMode("basic")}
                disabled={connecting}
              />
              Basic Auth
            </label>
          </div>

          {authMode === "jwt" ? (
            <label style={labelStyle}>
              Shared Secret
              <input
                type="password"
                value={sharedSecret}
                onChange={(e) => setSharedSecret(e.target.value)}
                placeholder="SPE Remoting shared secret"
                disabled={connecting}
                style={inputStyle}
              />
            </label>
          ) : (
            <label style={labelStyle}>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={connecting}
                style={inputStyle}
              />
            </label>
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
            Credentials are not stored — only URL and username are saved.
            {" "}Enable the CORS proxy if you get cross-origin errors.
          </div>
        </div>
      )}
    </div>
  );
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
