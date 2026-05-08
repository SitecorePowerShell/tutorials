import type { ConsoleEntry, SitecoreNode } from "../types";
import type { ExecutionProvider, ProviderExecutionResult } from "./types";
import { VIRTUAL_TREE, createVirtualTree } from "../engine/virtualTree";
import { executeScript, executeCommand } from "../engine/executor";
import { ScriptContext, DEFAULT_CWD } from "../engine/scriptContext";

/**
 * Local execution provider — runs commands against the in-memory virtual tree.
 * This is the default provider used by the tutorial.
 *
 * When `isolatedTree` is true, creates a deep clone of the virtual tree
 * so mutations don't affect the shared tree. Useful for testing.
 */
export class LocalProvider implements ExecutionProvider {
  readonly name = "Local Simulation";
  readonly isRemote = false;

  private ctx: ScriptContext;
  private tree: { sitecore: SitecoreNode };

  constructor(options?: { isolatedTree?: boolean }) {
    this.ctx = new ScriptContext();
    this.tree = options?.isolatedTree ? createVirtualTree() : VIRTUAL_TREE;
  }

  async executeScript(script: string): Promise<ProviderExecutionResult> {
    // ISE-style runs are isolated — every Run starts from a clean variable
    // scope, matching the "press F8 from a fresh state" mental model.
    this.resetPerExecution({ keepVariables: false });
    const result = executeScript(script, this.ctx);
    return this.buildResult(result.output, result.error);
  }

  async executeCommand(command: string): Promise<ProviderExecutionResult> {
    // REPL-style runs accumulate state — `$x = 5` in one command must still
    // be visible to the next, like a real PowerShell console session.
    this.resetPerExecution({ keepVariables: true });
    const result = executeCommand(command, this.ctx);
    return this.buildResult(result.output, result.error);
  }

  getCwd(): string {
    return this.ctx.cwd;
  }

  reset(): void {
    this.ctx = new ScriptContext();
  }

  getTree(): SitecoreNode {
    return this.tree.sitecore;
  }

  /** Expose the ScriptContext for validation (tutorial needs this) */
  getContext(): ScriptContext {
    return this.ctx;
  }

  /** Snapshot of script-scope variables (for the Variables panel). */
  getVariables(): Record<string, unknown> | null {
    return this.ctx.variables;
  }

  /** Expose the full tree object for validation (tutorial needs this) */
  getFullTree(): { sitecore: SitecoreNode } {
    return this.tree;
  }

  private resetPerExecution(opts: { keepVariables: boolean }): void {
    this.ctx.outputs = [];
    this.ctx.errors = [];
    this.ctx.dialogRequests = [];
    if (!opts.keepVariables) {
      this.ctx.variables = {};
    }
  }

  private buildResult(
    output: string,
    error: string | null
  ): ProviderExecutionResult {
    const entries: ConsoleEntry[] = [];
    const dialogTypes = new Set(this.ctx.dialogRequests.map((d) => d.type));

    // 1. Listview consumes the output text into the dialog itself
    if (output && dialogTypes.has("listview")) {
      const lv = this.ctx.dialogRequests.find((d) => d.type === "listview")!;
      entries.push({
        type: "dialog-listview",
        text: output,
        title: lv.title || "List View",
        itemCount: lv.itemCount ?? 0,
        columns: lv.columns || [],
        rows: lv.rows || [],
      });
    }

    // 2. Visual dialogs come first so they're never below the fold under
    //    a long text-output dump from Add-* commands.
    for (const dr of this.ctx.dialogRequests) {
      if (dr.type === "alert") {
        entries.push({
          type: "dialog-alert",
          text: dr.message || "",
          message: dr.message || "",
        });
      } else if (dr.type === "read-variable") {
        entries.push({
          type: "dialog-read-variable",
          text: `${dr.title}${dr.description ? " — " + dr.description : ""}`,
          title: dr.title || "Input",
          description: dr.description || "",
        });
      } else if (dr.type === "dialog-builder") {
        entries.push({
          type: "dialog-builder",
          text: `Dialog: ${dr.title || "Untitled"}`,
          title: dr.title || "Dialog",
          fields: dr.fields || [],
        });
      }
    }

    // 3. Then the regular text output (suppressed for listview, alert,
    //    read-variable, since those dialogs already convey it).
    if (
      output &&
      !dialogTypes.has("listview") &&
      !dialogTypes.has("alert") &&
      !dialogTypes.has("read-variable")
    ) {
      entries.push({ type: "output", text: output });
    }

    if (error) {
      entries.push({ type: "error", text: error });
    }

    return { entries, cwd: this.ctx.cwd };
  }
}
