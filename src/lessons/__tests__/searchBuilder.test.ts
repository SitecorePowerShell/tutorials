import { describe, it, expect } from "vitest";
import { executeScript } from "../../engine/executor";
import { ScriptContext } from "../../engine/scriptContext";
import { LocalProvider } from "../../providers/LocalProvider";

/**
 * Sanity tests for lesson 30 (Composing Searches with SearchBuilder).
 * Each test runs a user solution end-to-end through the executor and asserts
 * the substring used by the YAML validator's `outputContains`.
 */
describe("Lesson: search-builder", () => {
  function run(script: string): string {
    const ctx = new ScriptContext();
    const result = executeScript(script, ctx);
    return result.output;
  }

  it("Task 1 — Import-Function loads the library", () => {
    const out = run(`Import-Function -Name SearchBuilder`);
    expect(out).toContain("Loaded function library: SearchBuilder");
  });

  it("Task 2 — New-SearchBuilder emits creation message even when assigned", () => {
    const out = run(`
      Import-Function -Name SearchBuilder
      $search = New-SearchBuilder -Index "sitecore_master_index" -First 25 -LatestVersion
    `);
    expect(out).toContain('SearchBuilder created: index "sitecore_master_index"');
  });

  it("Task 3 — Add-TemplateFilter renders", () => {
    const out = run(`
      Import-Function -Name SearchBuilder
      $search = New-SearchBuilder -Index "sitecore_master_index" -First 25 -LatestVersion
      $search | Add-TemplateFilter -Name "Article"
    `);
    expect(out).toContain("TemplateFilter: Name = 'Article'");
  });

  it("Task 4 — Add-FieldContains renders", () => {
    const out = run(`
      Import-Function -Name SearchBuilder
      $search = New-SearchBuilder -Index "sitecore_master_index" -First 25 -LatestVersion
      $search | Add-TemplateFilter -Name "Article"
      $search | Add-FieldContains -Field "Title" -Value "Welcome"
    `);
    expect(out).toContain("FieldContains: Title contains 'Welcome'");
  });

  it("Task 5 — Add-DateRangeFilter with relative shorthand", () => {
    const out = run(`
      Import-Function -Name SearchBuilder
      $search = New-SearchBuilder -Index "sitecore_master_index" -First 25 -LatestVersion
      $search | Add-TemplateFilter -Name "Article"
      $search | Add-FieldContains -Field "Title" -Value "Welcome"
      $search | Add-DateRangeFilter -Field "__Updated" -Last "30d"
    `);
    expect(out).toContain("DateRangeFilter: __Updated within last 30d");
  });

  it("Task 6 — Invoke-Search summary appears when result is assigned", () => {
    const out = run(`
      Import-Function -Name SearchBuilder
      $search = New-SearchBuilder -Index "sitecore_master_index" -First 25 -LatestVersion
      $search | Add-TemplateFilter -Name "Article"
      $search | Add-FieldContains -Field "Title" -Value "Welcome"
      $search | Add-DateRangeFilter -Field "__Updated" -Last "30d"
      $results = $search | Invoke-Search
    `);
    expect(out).toContain('Search "sitecore_master_index" executed');
  });

  it("Invoke-Search without a builder errors helpfully", () => {
    const ctx = new ScriptContext();
    const result = executeScript(`Invoke-Search`, ctx);
    expect(result.error).toContain("Invoke-Search : Pipeline input is not a SearchBuilder");
  });

  it("Add-SearchFilter respects -Invert and -Boost", () => {
    const out = run(`
      Import-Function -Name SearchBuilder
      $search = New-SearchBuilder -Index "sitecore_master_index"
      $search | Add-SearchFilter -Field "_name" -Filter "Contains" -Value "system" -Invert -Boost 5
    `);
    expect(out).toContain("[Invert]");
    expect(out).toContain("[Boost 5]");
  });

  it("$results.Items pipeline access does not error", () => {
    // Regression: previously `$results.Items | ForEach-Object {...}` failed
    // with "term '$results.Items' is not recognized" because the executor
    // only resolved bare `$var` at pipeline start.
    const ctx = new ScriptContext();
    const result = executeScript(
      `
      Import-Function -Name SearchBuilder
      $search = New-SearchBuilder -Index "sitecore_master_index"
      $search | Add-TemplateFilter -Name "Article"
      $results = $search | Invoke-Search
      $results.Items | ForEach-Object { $_.Name }
    `,
      ctx
    );
    expect(result.error).toBeNull();
  });

  it("LocalProvider does NOT produce a dialog entry for SearchBuilder — search returns content, not a dialog", async () => {
    const provider = new LocalProvider();
    const result = await provider.executeScript(`
      Import-Function -Name SearchBuilder
      $search = New-SearchBuilder -Index "sitecore_master_index"
      $search | Add-TemplateFilter -Name "Sample Item"
      $results = $search | Invoke-Search
    `);
    const dialog = result.entries.find(
      (e) =>
        e.type === "dialog-alert" ||
        e.type === "dialog-read-variable" ||
        e.type === "dialog-listview" ||
        e.type === "dialog-builder"
    );
    expect(dialog).toBeUndefined();
    // The text summary is still present
    const text = result.entries.find((e) => e.type === "output");
    expect(text).toBeDefined();
  });

  it("Invoke-Search does not push any dialogRequest", () => {
    const ctx = new ScriptContext();
    executeScript(
      `
      Import-Function -Name SearchBuilder
      $search = New-SearchBuilder -Index "sitecore_master_index"
      $search | Add-TemplateFilter -Name "Article"
      $search | Invoke-Search
    `,
      ctx
    );
    expect(ctx.dialogRequests).toHaveLength(0);
  });

  it("Invoke-Search bridges to the real search index and returns items", () => {
    // Without filters, Items would match everything in the tree.
    const ctx = new ScriptContext();
    const result = executeScript(
      `
      Import-Function -Name SearchBuilder
      $search = New-SearchBuilder -Index "sitecore_master_index" -First 5
      $results = $search | Invoke-Search
      $results.Items | Select-Object -First 1 | ForEach-Object { $_.Name }
    `,
      ctx
    );
    expect(result.error).toBeNull();
    // The tree's first item under /sitecore is "content" (or similar) —
    // we just assert the pipeline produced *some* output without erroring.
    expect(result.output.length).toBeGreaterThan(0);
  });
});
