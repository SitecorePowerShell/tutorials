import { useState, useCallback } from "react";
import type { ConnectionConfig } from "../providers/types";

interface ConnectionManagerProps {
  isConnected: boolean;
  onConnect: (config: ConnectionConfig) => void;
  onDisconnect: () => void;
  isExecuting: boolean;
}

const STORAGE_KEY = "spe-connection-config";

function loadSavedConfig(): Partial<ConnectionConfig> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Never persist passwords/secrets — only URL and username
      return { url: parsed.url || "", username: parsed.username || "" };
    }
  } catch { /* ignore */ }
  return {};
}

function saveConfig(config: ConnectionConfig): void {
  try {
    // Only persist non-sensitive fields
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ url: config.url, username: config.username })
    );
  } catch { /* ignore */ }
}

export function ConnectionManager({
  isConnected,
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
  const [error, setError] = useState("");

  const handleConnect = useCallback(() => {
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
    };
    saveConfig(config);
    setError("");
    onConnect(config);
    setExpanded(false);
  }, [url, username, password, sharedSecret, authMode, onConnect]);

  const handleDisconnect = useCallback(() => {
    onDisconnect();
    setPassword("");
    setSharedSecret("");
  }, [onDisconnect]);

  if (!expanded) {
    return (
      <button
        onClick={() => {
          if (isConnected) {
            handleDisconnect();
          } else {
            setExpanded(true);
          }
        }}
        disabled={isExecuting}
        title={isConnected ? "Disconnect from remote instance" : "Connect to Sitecore instance"}
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
          Connect to Sitecore
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

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={labelStyle}>
          Instance URL
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://sitecore.example.com"
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
              style={inputStyle}
            />
          </label>
        )}

        {error && (
          <div style={{ color: "#f44336", fontSize: 12 }}>{error}</div>
        )}

        <button
          onClick={handleConnect}
          style={{
            background: "var(--color-accent-primary, #00a4ef)",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          Connect
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
        </div>
      </div>
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
