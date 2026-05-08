import { describe, it, expect } from "vitest";
import {
  getCmdletHelp,
  getSynopsis,
  getAllCmdletHelp,
  formatHelpText,
  formatCmdletList,
} from "../cmdletHelp";
import { executeCommand } from "../executor";
import { ScriptContext } from "../scriptContext";

describe("cmdletHelp", () => {
  describe("getCmdletHelp", () => {
    it("returns help for a cmdlet by canonical name", () => {
      const help = getCmdletHelp("Get-Item");
      expect(help).not.toBeNull();
      expect(help!.name).toBe("Get-Item");
      expect(help!.synopsis).toBeTruthy();
    });

    it("is case-insensitive", () => {
      const help = getCmdletHelp("get-childitem");
      expect(help).not.toBeNull();
      expect(help!.name).toBe("Get-ChildItem");
    });

    it("resolves aliases to canonical cmdlet help", () => {
      const help = getCmdletHelp("gci");
      expect(help).not.toBeNull();
      expect(help!.name).toBe("Get-ChildItem");
    });

    it("resolves ? alias to Where-Object", () => {
      const help = getCmdletHelp("?");
      expect(help).not.toBeNull();
      expect(help!.name).toBe("Where-Object");
    });

    it("resolves % alias to ForEach-Object", () => {
      const help = getCmdletHelp("%");
      expect(help).not.toBeNull();
      expect(help!.name).toBe("ForEach-Object");
    });

    it("returns null for unknown cmdlets", () => {
      expect(getCmdletHelp("Not-A-Cmdlet")).toBeNull();
    });

    it("includes Get-Help itself", () => {
      const help = getCmdletHelp("Get-Help");
      expect(help).not.toBeNull();
      expect(help!.name).toBe("Get-Help");
    });
  });

  describe("getSynopsis", () => {
    it("returns synopsis string for known cmdlet", () => {
      const syn = getSynopsis("Get-Item");
      expect(syn).toBeTruthy();
      expect(typeof syn).toBe("string");
    });

    it("returns null for unknown cmdlet", () => {
      expect(getSynopsis("Fake-Cmdlet")).toBeNull();
    });
  });

  describe("getAllCmdletHelp", () => {
    it("returns all cmdlet entries sorted by name", () => {
      const all = getAllCmdletHelp();
      expect(all.length).toBeGreaterThan(15);
      // Should be sorted
      for (let i = 1; i < all.length; i++) {
        expect(all[i].name.localeCompare(all[i - 1].name)).toBeGreaterThanOrEqual(0);
      }
    });

    it("includes top 10 cmdlets with full entries", () => {
      const all = getAllCmdletHelp();
      const topTen = [
        "Get-Item", "Get-ChildItem", "Where-Object", "ForEach-Object",
        "Select-Object", "Sort-Object", "Set-Location", "New-Item",
        "Format-Table", "Write-Host",
      ];
      for (const name of topTen) {
        const entry = all.find((h) => h.name === name);
        expect(entry, `Expected full entry for ${name}`).toBeDefined();
        expect(entry!.examples.length).toBeGreaterThan(0);
        expect(entry!.parameters.length).toBeGreaterThan(0);
      }
    });
  });

  describe("formatHelpText", () => {
    it("includes NAME and SYNOPSIS sections by default", () => {
      const help = getCmdletHelp("Get-Item")!;
      const text = formatHelpText(help);
      expect(text).toContain("NAME");
      expect(text).toContain("Get-Item");
      expect(text).toContain("SYNOPSIS");
      expect(text).toContain("SYNTAX");
    });

    it("shows examples when section is 'examples'", () => {
      const help = getCmdletHelp("Get-Item")!;
      const text = formatHelpText(help, "examples");
      expect(text).toContain("EXAMPLES");
      expect(text).toContain("Example 1");
      expect(text).not.toContain("PARAMETERS");
    });

    it("shows full details when section is 'full'", () => {
      const help = getCmdletHelp("Get-Item")!;
      const text = formatHelpText(help, "full");
      expect(text).toContain("DESCRIPTION");
      expect(text).toContain("PARAMETERS");
      expect(text).toContain("EXAMPLES");
    });

    it("shows parameter details when section is 'parameter'", () => {
      const help = getCmdletHelp("Get-Item")!;
      const text = formatHelpText(help, "parameter", "Path");
      expect(text).toContain("-Path");
      expect(text).toContain("Required?");
    });

    it("returns error for unknown parameter", () => {
      const help = getCmdletHelp("Get-Item")!;
      const text = formatHelpText(help, "parameter", "FakeParam");
      expect(text).toContain("No parameter named");
    });
  });

  describe("formatCmdletList", () => {
    it("lists all cmdlets with synopses", () => {
      const text = formatCmdletList();
      expect(text).toContain("Available commands:");
      expect(text).toContain("Get-Item");
      expect(text).toContain("Get-ChildItem");
      expect(text).toContain("Get-Help");
      expect(text).toContain("Where-Object");
    });
  });
});

describe("Get-Help executor integration", () => {
  it("lists all cmdlets when called with no args", () => {
    const ctx = new ScriptContext();
    const result = executeCommand("Get-Help", ctx);
    expect(result.error).toBeNull();
    expect(result.output).toContain("Available commands:");
    expect(result.output).toContain("Get-Item");
  });

  it("shows help for a specific cmdlet", () => {
    const ctx = new ScriptContext();
    const result = executeCommand("Get-Help Get-Item", ctx);
    expect(result.error).toBeNull();
    expect(result.output).toContain("NAME");
    expect(result.output).toContain("Get-Item");
    expect(result.output).toContain("SYNOPSIS");
  });

  it("resolves aliases in help lookup", () => {
    const ctx = new ScriptContext();
    const result = executeCommand("Get-Help gci", ctx);
    expect(result.error).toBeNull();
    expect(result.output).toContain("Get-ChildItem");
  });

  it("shows examples with -Examples switch", () => {
    const ctx = new ScriptContext();
    const result = executeCommand("Get-Help Get-ChildItem -Examples", ctx);
    expect(result.error).toBeNull();
    expect(result.output).toContain("EXAMPLES");
    expect(result.output).toContain("Example 1");
  });

  it("shows full help with -Full switch", () => {
    const ctx = new ScriptContext();
    const result = executeCommand("Get-Help Where-Object -Full", ctx);
    expect(result.error).toBeNull();
    expect(result.output).toContain("DESCRIPTION");
    expect(result.output).toContain("PARAMETERS");
  });

  it("returns error for unknown cmdlet", () => {
    const ctx = new ScriptContext();
    const result = executeCommand("Get-Help Not-Real", ctx);
    expect(result.error).toContain("No help found");
  });

  it("works with help alias", () => {
    const ctx = new ScriptContext();
    const result = executeCommand("help Get-Item", ctx);
    expect(result.error).toBeNull();
    expect(result.output).toContain("Get-Item");
  });

  describe("coverage", () => {
    /**
     * Every cmdlet the executor dispatches should have a help entry. If this
     * fails after adding a new cmdlet, add it to FULL_HELP_3 in cmdletHelp.ts.
     * This guards against the help-button silently being a no-op for new commands.
     */
    it("every executor cmdlet has a help entry", () => {
      // Snapshot of every cmdlet name the executor's switch handles, taken from
      // src/engine/executor.ts. Update this list when adding a new cmdlet.
      const executorCmdlets = [
        "Add-Checkbox", "Add-Checklist", "Add-DateRangeFilter", "Add-DateTimePicker",
        "Add-DialogField", "Add-Dropdown", "Add-Droplink", "Add-Droptree",
        "Add-FieldContains", "Add-FieldEquals", "Add-InfoText", "Add-ItemPicker",
        "Add-LinkField", "Add-MultiLineTextField", "Add-MultiList",
        "Add-RadioButtons", "Add-RoleMember", "Add-RolePicker", "Add-SearchFilter",
        "Add-TemplateFilter", "Add-TextField", "Add-TreeList", "Add-TristateCheckbox",
        "Add-UserPicker", "Close-Window", "ConvertTo-Json", "Copy-Item", "Find-Item",
        "ForEach-Object", "Format-Table", "Get-Alias", "Get-ChildItem", "Get-Help",
        "Get-Item", "Get-Location", "Get-Member", "Get-Role", "Get-RoleMember",
        "Get-SearchFilter", "Get-User", "Group-Object", "Import-Function",
        "Initialize-Item", "Invoke-Dialog", "Invoke-Search", "Measure-Object",
        "Move-Item", "New-DialogBuilder", "New-Item", "New-Role", "New-SearchBuilder",
        "New-User", "Publish-Item", "Read-Variable", "Remove-Item", "Remove-RoleMember",
        "Rename-Item", "Reset-SearchBuilder", "Select-Object", "Set-ItemProperty",
        "Set-Location", "Show-Alert", "Show-Confirm", "Show-FieldEditor", "Show-Input",
        "Show-ListView", "Show-ModalDialog", "Show-YesNoCancel", "Sort-Object",
        "Test-Account", "Test-ItemAcl", "Where-Object", "Write-Error", "Write-Host",
        "Write-Output", "Write-Warning", "Import-Csv", "ConvertFrom-Csv",
      ];
      const missing = executorCmdlets.filter((name) => !getCmdletHelp(name));
      expect(missing).toEqual([]);
    });
  });
});
