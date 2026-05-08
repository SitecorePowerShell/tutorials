import { describe, it, expect } from "vitest";
import { executeScript } from "../../engine/executor";
import { ScriptContext } from "../../engine/scriptContext";

/**
 * Sanity tests for lesson 29 (Building Interactive Dialogs).
 * Each test runs a user solution end-to-end through the executor and asserts
 * the substring used by the YAML validator's `outputContains`.
 */
describe("Lesson: dialog-builder", () => {
  function run(script: string): string {
    const ctx = new ScriptContext();
    const result = executeScript(script, ctx);
    return result.output;
  }

  it("Task 1 — Import-Function loads the library", () => {
    const out = run(`Import-Function -Name DialogBuilder`);
    expect(out).toContain("Loaded function library: DialogBuilder");
  });

  it("Task 2 — New-DialogBuilder emits the creation message even when assigned", () => {
    const out = run(`
      Import-Function -Name DialogBuilder
      $dialog = New-DialogBuilder -Title "Content Editor"
    `);
    expect(out).toContain('DialogBuilder created: "Content Editor"');
  });

  it("Task 3 — Add-TextField with -Mandatory shows the asterisk", () => {
    const out = run(`
      Import-Function -Name DialogBuilder
      $dialog = New-DialogBuilder -Title "Content Editor"
      $dialog | Add-TextField -Name "userName" -Title "User Name" -Mandatory
    `);
    expect(out).toContain("TextField 'userName' — User Name *");
  });

  it("Task 4 — Add-Checkbox renders without asterisk", () => {
    const out = run(`
      Import-Function -Name DialogBuilder
      $dialog = New-DialogBuilder -Title "Content Editor"
      $dialog | Add-TextField -Name "userName" -Title "User Name" -Mandatory
      $dialog | Add-Checkbox -Name "publish" -Title "Publish after save"
    `);
    expect(out).toContain("Checkbox 'publish' — Publish after save");
  });

  it("Task 5 — Add-Dropdown renders the label", () => {
    const out = run(`
      Import-Function -Name DialogBuilder
      $dialog = New-DialogBuilder -Title "Content Editor"
      $dialog | Add-TextField -Name "userName" -Title "User Name" -Mandatory
      $dialog | Add-Checkbox -Name "publish" -Title "Publish after save"
      $dialog | Add-Dropdown -Name "language" -Title "Language" -Options @{
          "en"    = "English"
          "fr-FR" = "French"
      }
    `);
    expect(out).toContain("Dropdown 'language' — Language");
  });

  it("Task 6 — Invoke-Dialog summary is visible when result is assigned", () => {
    const out = run(`
      Import-Function -Name DialogBuilder
      $dialog = New-DialogBuilder -Title "Content Editor"
      $dialog | Add-TextField -Name "userName" -Title "User Name" -Mandatory
      $dialog | Add-Checkbox -Name "publish" -Title "Publish after save"
      $dialog | Add-Dropdown -Name "language" -Title "Language" -Options @{
          "en"    = "English"
          "fr-FR" = "French"
      }
      $result = $dialog | Invoke-Dialog
    `);
    expect(out).toContain('Dialog "Content Editor" shown with 3 field(s)');
  });

  it("Invoke-Dialog without a builder errors helpfully", () => {
    const ctx = new ScriptContext();
    const result = executeScript(`Invoke-Dialog`, ctx);
    expect(result.error).toContain("Invoke-Dialog : Pipeline input is not a DialogBuilder");
  });
});
