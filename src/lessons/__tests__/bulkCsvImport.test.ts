import { describe, it, expect } from "vitest";
import { executeScript } from "../../engine/executor";
import { ScriptContext } from "../../engine/scriptContext";

/**
 * Sanity tests for lesson 32 (Bulk Import from CSV).
 */
describe("Lesson: bulk-csv-import", () => {
  function run(script: string) {
    const ctx = new ScriptContext();
    const result = executeScript(script, ctx);
    return { output: result.output, error: result.error };
  }

  it("Task 1 — Import-Csv reads the contributors mock file", () => {
    const r = run(`Import-Csv -Path "data\\contributors.csv"`);
    expect(r.error).toBeNull();
    expect(r.output).toContain("Alice");
    expect(r.output).toContain("Email"); // header rendered
  });

  it("Task 2 — Where-Object filters rows by column", () => {
    const r = run(
      `Import-Csv -Path "data\\contributors.csv" | Where-Object { $_.Country -eq "US" }`
    );
    expect(r.output).toContain("Alice");
    expect(r.output).toContain("Dave");
    expect(r.output).not.toContain("Bob"); // UK should be filtered out
  });

  it("Task 3 — ForEach-Object reads $_.Email", () => {
    const r = run(
      `Import-Csv -Path "data\\contributors.csv" | ForEach-Object { Write-Host $_.Email }`
    );
    expect(r.output).toContain("alice@example.com");
    expect(r.output).toContain("bob@example.com");
  });

  it("Task 4 — Bulk-create runs without error", () => {
    const r = run(`
      Import-Csv -Path "data\\contributors.csv" | ForEach-Object {
        New-Item -Path "master:\\content\\Home" -Name $_.Name -ItemType "Sample/Sample Item"
      }
    `);
    expect(r.error).toBeNull();
    expect(r.output).toContain("Alice");
  });

  it("Import-Csv on a missing path emits a helpful error listing mock files", () => {
    const r = run(`Import-Csv -Path "data\\nope.csv"`);
    expect(r.error).toContain("Cannot find file");
    expect(r.error).toContain("contributors.csv");
  });
});
