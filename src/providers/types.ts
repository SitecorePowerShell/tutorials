import type { ConsoleEntry, SitecoreNode } from "../types";

/** Result of executing a script or command via any provider */
export interface ProviderExecutionResult {
  /** Console entries to append (output, errors, dialogs, etc.) */
  entries: ConsoleEntry[];
  /** Updated working directory (if changed by the script) */
  cwd?: string;
}

/** Completion suggestion for tab-complete */
export interface CompletionItem {
  text: string;
  /** Display label (may differ from inserted text) */
  label?: string;
}

/** Result of a connection test */
export interface ConnectionTestResult {
  connected: boolean;
  version?: string;
  user?: string;
  error?: string;
}

/**
 * Authentication mode for SPE Remoting.
 *
 *  - `user-secret` — JWT signed with a shared secret, identified by username.
 *    Mirrors `New-Jwt.ps1` from the SPE Remoting module.
 *  - `accesskey`   — JWT signed with a shared secret, identified by an Access
 *    Key ID registered server-side. The server resolves the key to a user.
 *  - `oauth-cc`    — OAuth 2.0 client_credentials grant. The client exchanges
 *    a client ID / secret for a Bearer access token at `tokenUrl`.
 */
export type AuthMode =
  | { kind: "user-secret"; username: string; sharedSecret: string }
  | { kind: "accesskey"; accessKeyId: string; sharedSecret: string }
  | {
      kind: "oauth-cc";
      clientId: string;
      clientSecret: string;
      tokenUrl: string;
      scope?: string;
      /** UI hint only — affects placeholder/scope defaults, not the wire protocol */
      provider?: "identity" | "auth0" | "custom";
    };

/** Connection configuration for remote providers */
export interface ConnectionConfig {
  url: string;
  auth: AuthMode;
  /** When true, requests target a local CORS proxy instead of the Sitecore instance directly */
  useProxy?: boolean;
  /** Local CORS proxy URL (default: http://localhost:3001) */
  proxyUrl?: string;
}

/**
 * Abstracts where and how scripts are executed.
 *
 * LocalProvider uses the in-memory engine and virtual tree.
 * SpeRemotingProvider sends scripts to a real Sitecore instance.
 */
export interface ExecutionProvider {
  readonly name: string;
  readonly isRemote: boolean;

  /** Execute a script (multi-line, ISE mode) */
  executeScript(script: string): Promise<ProviderExecutionResult>;

  /** Execute a single command (REPL mode) */
  executeCommand(command: string): Promise<ProviderExecutionResult>;

  /** Get the current working directory */
  getCwd(): string;

  /** Reset state (variables, cwd) */
  reset(): void;

  /** Get the content tree root for the TreePanel */
  getTree(): SitecoreNode;

  /**
   * Snapshot of variables currently in scope (after the most recent execute).
   * LocalProvider exposes the simulator's ScriptContext.variables; remote
   * providers can return null since SPE Remoting doesn't surface the
   * server-side runspace state.
   */
  getVariables?(): Record<string, unknown> | null;
}
