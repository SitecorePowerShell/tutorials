import { describe, it, expect, beforeEach } from "vitest";
import { LocalProvider } from "../LocalProvider";

describe("LocalProvider", () => {
  let provider: LocalProvider;

  beforeEach(() => {
    provider = new LocalProvider({ isolatedTree: true });
  });

  it("has correct metadata", () => {
    expect(provider.name).toBe("Local Simulation");
    expect(provider.isRemote).toBe(false);
  });

  it("executes a simple command", async () => {
    const result = await provider.executeCommand(
      'Get-Item -Path "master:\\content\\Home"'
    );
    expect(result.entries.length).toBeGreaterThan(0);
    const outputEntry = result.entries.find((e) => e.type === "output");
    expect(outputEntry).toBeDefined();
    expect(outputEntry!.text).toContain("Home");
  });

  it("executes a script", async () => {
    const result = await provider.executeScript(
      'Get-ChildItem -Path "master:\\content\\Home"'
    );
    expect(result.entries.length).toBeGreaterThan(0);
    const outputEntry = result.entries.find((e) => e.type === "output");
    expect(outputEntry).toBeDefined();
    expect(outputEntry!.text).toContain("Name");
  });

  it("returns errors for invalid commands", async () => {
    const result = await provider.executeCommand("Get-Item -Path \"master:\\nonexistent\\path\"");
    const errorEntry = result.entries.find((e) => e.type === "error");
    expect(errorEntry).toBeDefined();
  });

  it("tracks cwd changes", async () => {
    expect(provider.getCwd()).toBe("/sitecore/content/Home");
    await provider.executeCommand('Set-Location "master:\\content"');
    expect(provider.getCwd()).toBe("/sitecore/content");
  });

  it("resets state", async () => {
    await provider.executeCommand('Set-Location "master:\\content"');
    expect(provider.getCwd()).toBe("/sitecore/content");
    provider.reset();
    expect(provider.getCwd()).toBe("/sitecore/content/Home");
  });

  it("provides tree access", () => {
    const tree = provider.getTree();
    expect(tree).toBeDefined();
    expect(tree._children).toBeDefined();
  });

  it("exposes ScriptContext for validation", () => {
    const ctx = provider.getContext();
    expect(ctx).toBeDefined();
    expect(ctx.cwd).toBe("/sitecore/content/Home");
  });

  it("handles dialog requests", async () => {
    const result = await provider.executeCommand(
      'Show-Alert "Hello World"'
    );
    const alertEntry = result.entries.find((e) => e.type === "dialog-alert");
    expect(alertEntry).toBeDefined();
  });

  it("returns cwd in result", async () => {
    const result = await provider.executeCommand(
      'Get-Item -Path "master:\\content\\Home"'
    );
    expect(result.cwd).toBe("/sitecore/content/Home");
  });
});
