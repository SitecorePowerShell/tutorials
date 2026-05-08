import { describe, it, expect, beforeEach } from "vitest";
import { executeScript } from "../../engine/executor";
import { ScriptContext } from "../../engine/scriptContext";
import { _resetSecurityStore } from "../../engine/securityStore";

/**
 * Sanity tests for lesson 31 (Users, Roles & Access Rights).
 * Each test runs a user solution end-to-end through the executor and asserts
 * the substring used by the YAML validator's `outputContains`.
 */
describe("Lesson: security", () => {
  beforeEach(() => {
    _resetSecurityStore();
  });

  function run(script: string): { output: string; error: string | null } {
    const ctx = new ScriptContext();
    const result = executeScript(script, ctx);
    return { output: result.output, error: result.error };
  }

  it("Task 1 — Get-User -Identity admin returns the admin row", () => {
    const r = run(`Get-User -Identity admin`);
    expect(r.error).toBeNull();
    expect(r.output).toContain("sitecore\\Admin");
  });

  it("Task 2 — Get-User -Filter * returns all users across domains", () => {
    const r = run(`Get-User -Filter *`);
    expect(r.output).toContain("sitecore\\Admin");
    expect(r.output).toContain("extranet\\Anonymous");
    expect(r.output).toContain("default\\Anonymous");
  });

  it("Task 3 — Get-Role -Filter sitecore\\* lists Sitecore roles", () => {
    const r = run(`Get-Role -Filter "sitecore\\*"`);
    expect(r.output).toContain("sitecore\\Developer");
    expect(r.output).toContain("sitecore\\Author");
  });

  it("Task 4 — New-Role creates a role and prints confirmation", () => {
    const r = run(
      `New-Role -Identity "sitecore\\Editors" -Description "Content editors"`
    );
    expect(r.output).toContain("Role created: sitecore\\Editors");
  });

  it("Task 5 — Add-RoleMember reports the addition", () => {
    const r = run(`
      New-Role -Identity "sitecore\\Editors" -Description "Content editors"
      Add-RoleMember -Identity "sitecore\\Editors" -Members "sitecore\\michael"
    `);
    expect(r.output).toContain(
      "Added sitecore\\michael to sitecore\\Editors"
    );
  });

  it("Task 6 — Test-ItemAcl returns True for an authoring user on /content", () => {
    const r = run(
      `Test-ItemAcl -Path "master:\\content\\Home" -Identity "sitecore\\jdoe" -AccessRight item:write`
    );
    expect(r.output).toContain("True");
  });

  it("Test-ItemAcl returns False under /sitecore/system for non-admin", () => {
    const r = run(
      `Test-ItemAcl -Path "master:\\sitecore\\system\\Settings" -Identity "sitecore\\jdoe" -AccessRight item:write`
    );
    expect(r.output).toContain("False");
  });

  it("Test-Account distinguishes existing from missing identities", () => {
    expect(run(`Test-Account -Identity "sitecore\\admin"`).output).toBe("True");
    expect(run(`Test-Account -Identity "sitecore\\nope"`).output).toBe("False");
  });

  it("Get-User error surfaces a clear message for unknown identity", () => {
    const r = run(`Get-User -Identity "sitecore\\ghost"`);
    expect(r.error).toContain("User 'sitecore\\ghost' not found");
  });
});
