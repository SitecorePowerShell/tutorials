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

/** Connection configuration for remote providers */
export interface ConnectionConfig {
  url: string;
  username: string;
  password?: string;
  sharedSecret?: string;
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
}
