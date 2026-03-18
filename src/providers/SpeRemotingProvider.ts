import type { SitecoreNode } from "../types";
import type {
  ExecutionProvider,
  ProviderExecutionResult,
  ConnectionConfig,
} from "./types";
import { createSpeClient, type SpeClient } from "../integration/speClient";
import { VIRTUAL_TREE } from "../engine/virtualTree";

/**
 * Remote execution provider — sends scripts to a real Sitecore instance
 * via SPE Remoting.
 *
 * The tree panel still shows the local virtual tree (since SPE Remoting
 * doesn't provide a tree browsing API). A future GraphQL provider could
 * supply a live tree.
 */
export class SpeRemotingProvider implements ExecutionProvider {
  readonly name = "SPE Remoting";
  readonly isRemote = true;

  private client: SpeClient;
  private cwd: string = "/sitecore/content/Home";

  constructor(config: ConnectionConfig) {
    // When using the CORS proxy, send requests to the proxy URL instead of
    // the Sitecore instance directly. The proxy forwards to the real target.
    const effectiveUrl = config.useProxy
      ? (config.proxyUrl || "http://localhost:3001")
      : config.url;

    this.client = createSpeClient({
      url: effectiveUrl,
      username: config.username,
      password: config.password,
      sharedSecret: config.sharedSecret,
      scriptEndpoint: "/-/script/script/",
      // JWT audience must always be the real Sitecore URL, not the proxy
      audienceOverride: config.useProxy ? config.url : undefined,
    });
  }

  async executeScript(script: string): Promise<ProviderExecutionResult> {
    return this.execute(script);
  }

  async executeCommand(command: string): Promise<ProviderExecutionResult> {
    return this.execute(command);
  }

  getCwd(): string {
    return this.cwd;
  }

  reset(): void {
    this.cwd = "/sitecore/content/Home";
  }

  getTree(): SitecoreNode {
    // SPE Remoting doesn't provide tree browsing — use local tree as fallback
    return VIRTUAL_TREE.sitecore;
  }

  /**
   * Check whether a script already ends with a formatting/output cmdlet.
   * If not, we append `| Format-Table | Out-String` so SPE returns
   * human-readable text instead of raw .NET type names.
   */
  private autoFormat(script: string): string {
    // Match the last meaningful command in the pipeline — ignore trailing whitespace
    const trimmed = script.trimEnd();
    // Cmdlets that already produce text output
    const formattingPattern =
      /\|\s*(Format-Table|Format-List|Format-Wide|Format-Custom|Out-String|ConvertTo-Json|ConvertTo-Csv|ConvertTo-Xml|Write-Host|ft|fl|fw)\b/i;
    if (formattingPattern.test(trimmed)) {
      return script;
    }
    return `${trimmed} | Format-Table | Out-String`;
  }

  private async execute(script: string): Promise<ProviderExecutionResult> {
    try {
      const response = await this.client.executeScript(this.autoFormat(script));

      const entries: ProviderExecutionResult["entries"] = [];

      if (response.output) {
        entries.push({ type: "output", text: response.output });
      }

      if (response.error) {
        entries.push({ type: "error", text: response.error });
      }

      return { entries, cwd: this.cwd };
    } catch (err) {
      return {
        entries: [
          {
            type: "error",
            text: `Connection error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        cwd: this.cwd,
      };
    }
  }
}
