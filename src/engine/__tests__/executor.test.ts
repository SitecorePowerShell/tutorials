import { describe, it, expect, beforeEach } from "vitest";
import { createVirtualTree } from "../virtualTree";
import { executeCommandWithContext, executeScript, executeCommand } from "../executor";
import { ScriptContext } from "../scriptContext";
import type { SitecoreNode } from "../../types";

let tree: { sitecore: SitecoreNode };
let ctx: ScriptContext;

beforeEach(() => {
  tree = createVirtualTree();
  ctx = new ScriptContext();
});

describe("executeCommandWithContext", () => {
  describe("Get-Item", () => {
    it("retrieves an item by path", () => {
      const result = executeCommandWithContext(
        'Get-Item -Path "master:\\content\\Home"',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      expect(result.output).toContain("Home");
    });

    it("returns error for invalid path", () => {
      const result = executeCommandWithContext(
        'Get-Item -Path "master:\\content\\DoesNotExist"',
        ctx,
        tree
      );
      expect(result.error).toContain("Cannot find path");
    });

    it("defaults to CWD when no path given", () => {
      const result = executeCommandWithContext("Get-Item", ctx, tree);
      // CWD is /sitecore/content/Home
      expect(result.error).toBeNull();
      expect(result.output).toContain("Home");
    });
  });

  describe("Get-ChildItem", () => {
    it("returns children of a path", () => {
      const result = executeCommandWithContext(
        'Get-ChildItem -Path "master:\\content\\Home"',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      expect(result.output).toContain("About");
      expect(result.output).toContain("Products");
      expect(result.output).toContain("News");
    });

    it("returns all descendants with -Recurse", () => {
      const result = executeCommandWithContext(
        'Get-ChildItem -Path "master:\\content\\Home" -Recurse',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      expect(result.output).toContain("Contributors");
      expect(result.output).toContain("XM Cloud");
    });
  });

  describe("Where-Object", () => {
    it("filters by TemplateName -eq", () => {
      const result = executeCommandWithContext(
        'Get-ChildItem -Path "master:\\content\\Home" -Recurse | Where-Object { $_.TemplateName -eq "Folder" }',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      expect(result.output).toContain("Products");
      expect(result.output).toContain("News");
      expect(result.output).not.toContain("About");
    });

    it("filters by Name -like wildcard", () => {
      const result = executeCommandWithContext(
        'Get-ChildItem -Path "master:\\content\\Home" -Recurse | Where-Object { $_.Name -like "*Sitecore*" }',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      expect(result.output).toContain("Sitecore Search");
      expect(result.output).toContain("Sitecore Send");
    });
  });

  describe("Select-Object", () => {
    it("selects specific properties", () => {
      const result = executeCommandWithContext(
        'Get-ChildItem -Path "master:\\content\\Home" | Select-Object -Property Name,TemplateName',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      expect(result.output).toContain("Name");
      expect(result.output).toContain("TemplateName");
    });

    it("supports positional wildcard (Select-Object *)", () => {
      const result = executeCommandWithContext(
        'Get-ChildItem -Path "master:\\content\\Home" | Select-Object *',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      // Wildcard expands all properties
      expect(result.output).toContain("Name");
      expect(result.output).toContain("TemplateName");
    });

    it("supports positional property list (Select-Object Name,TemplateName)", () => {
      const result = executeCommandWithContext(
        'Get-ChildItem -Path "master:\\content\\Home" | Select-Object Name,TemplateName',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      expect(result.output).toContain("Name");
      expect(result.output).toContain("TemplateName");
    });

    it("supports -First", () => {
      const result = executeCommandWithContext(
        'Get-ChildItem -Path "master:\\content\\Home" -Recurse | Select-Object -First 2',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      // Should only have 2 data rows (+ header + separator)
      const lines = result.output.split("\n").filter((l) => l.trim());
      expect(lines.length).toBe(4); // header, separator, 2 rows
    });

    it("applies -Skip before -First (correct PowerShell order)", () => {
      const result = executeCommandWithContext(
        'Get-ChildItem -Path "master:\\content\\Home" | Select-Object -Skip 1 -First 1',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      // Home has About, Products, News — skip 1 (About), take 1 (Products)
      expect(result.output).toContain("Products");
      expect(result.output).not.toContain("About");
    });

    it("supports -SkipLast", () => {
      const result = executeCommandWithContext(
        'Get-ChildItem -Path "master:\\content\\Home" | Select-Object -SkipLast 1',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      // Home has About, Products, News — skip last 1 (News)
      expect(result.output).toContain("About");
      expect(result.output).toContain("Products");
      expect(result.output).not.toContain("News");
    });

    it("supports -ExpandProperty", () => {
      const result = executeCommandWithContext(
        'Get-ChildItem -Path "master:\\content\\Home" | Select-Object -ExpandProperty Name',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      expect(result.output).toBe("About\nProducts\nNews");
    });
  });

  describe("Sort-Object", () => {
    it("sorts by Name", () => {
      const result = executeCommandWithContext(
        'Get-ChildItem -Path "master:\\content\\Home" | Sort-Object -Property Name',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      const lines = result.output.split("\n").filter((l) => l.trim());
      const dataLines = lines.slice(2); // Skip header and separator
      expect(dataLines[0]).toContain("About");
      expect(dataLines[1]).toContain("News");
      expect(dataLines[2]).toContain("Products");
    });
  });

  describe("Measure-Object", () => {
    it("counts pipeline items", () => {
      const result = executeCommandWithContext(
        'Get-ChildItem -Path "master:\\content\\Home" | Measure-Object',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      expect(result.output).toContain("Count    : 3");
    });
  });

  describe("Get-Location", () => {
    it("returns CWD path", () => {
      const result = executeCommandWithContext("Get-Location", ctx, tree);
      expect(result.output).toContain("master:\\content\\Home");
    });

    it("reflects changed cwd after Set-Location", () => {
      executeCommandWithContext('Set-Location -Path "master:\\content"', ctx, tree);
      const result = executeCommandWithContext("Get-Location", ctx, tree);
      expect(result.output).toContain("master:\\content");
      expect(result.output).not.toContain("master:\\content\\Home");
    });
  });

  describe("Set-Location", () => {
    it("changes cwd with absolute path", () => {
      const result = executeCommandWithContext(
        'Set-Location -Path "master:\\content"',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      expect(ctx.cwd).toBe("/sitecore/content");
    });

    it("changes cwd with cd alias", () => {
      const result = executeCommandWithContext(
        'cd "master:\\content"',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      expect(ctx.cwd).toBe("/sitecore/content");
    });

    it("changes cwd with positional parameter", () => {
      const result = executeCommandWithContext(
        'cd "master:\\content\\Home\\About"',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      expect(ctx.cwd).toBe("/sitecore/content/Home/About");
    });

    it("navigates to parent with cd ..", () => {
      const result = executeCommandWithContext("cd ..", ctx, tree);
      expect(result.error).toBeNull();
      expect(ctx.cwd).toBe("/sitecore/content");
    });

    it("returns error for nonexistent path", () => {
      const result = executeCommandWithContext(
        'cd "master:\\content\\DoesNotExist"',
        ctx,
        tree
      );
      expect(result.error).toContain("Cannot find path");
      // CWD should not change
      expect(ctx.cwd).toBe("/sitecore/content/Home");
    });

    it("returns error when no path given", () => {
      const result = executeCommandWithContext("Set-Location", ctx, tree);
      expect(result.error).toContain("Missing -Path");
    });

    it("Get-Item . resolves to new cwd after cd", () => {
      executeCommandWithContext('cd "master:\\content\\Home\\About"', ctx, tree);
      const result = executeCommandWithContext("Get-Item .", ctx, tree);
      expect(result.error).toBeNull();
      expect(result.output).toContain("About");
    });

    it("Get-ChildItem uses new cwd after cd", () => {
      executeCommandWithContext('cd "master:\\content"', ctx, tree);
      const result = executeCommandWithContext("Get-ChildItem", ctx, tree);
      expect(result.error).toBeNull();
      expect(result.output).toContain("Home");
    });

    it("supports bare relative name to navigate into child", () => {
      executeCommandWithContext("cd About", ctx, tree);
      expect(ctx.cwd).toBe("/sitecore/content/Home/About");
    });

    it("works via executeCommand (console mode)", () => {
      const result = executeCommand("Get-Location", ctx);
      expect(result.error).toBeNull();
      expect(result.output).toContain("master:\\content\\Home");
    });

    it("cd + Get-Location works via executeCommand (console mode)", () => {
      executeCommand('cd "master:\\content"', ctx);
      expect(ctx.cwd).toBe("/sitecore/content");
      const result = executeCommand("Get-Location", ctx);
      expect(result.output).toContain("master:\\content");
      expect(result.output).not.toContain("master:\\content\\Home");
    });

    it("cd + Get-Location works in ISE multi-line script", () => {
      const script = 'Get-Location\ncd "master:\\content"\nGet-Location';
      const result = executeScript(script, ctx);
      expect(result.error).toBeNull();
      expect(ctx.cwd).toBe("/sitecore/content");
      // Both Get-Location calls should produce different output
      const parts = ctx.outputs;
      expect(parts).toHaveLength(2);
      expect(parts[0]).toContain("master:\\content\\Home");
      expect(parts[1]).toContain("master:\\content");
      expect(parts[1]).not.toContain("master:\\content\\Home");
    });

    it("cd without quotes works in ISE script", () => {
      const script = "Get-Location\ncd master:\\content\nGet-Location";
      const result = executeScript(script, ctx);
      expect(result.error).toBeNull();
      expect(ctx.cwd).toBe("/sitecore/content");
      const parts = ctx.outputs;
      expect(parts).toHaveLength(2);
      expect(parts[0]).toContain("master:\\content\\Home");
      expect(parts[1]).toContain("master:\\content");
      expect(parts[1]).not.toContain("master:\\content\\Home");
    });
  });

  describe("Show-ListView", () => {
    it("displays items as a report", () => {
      const result = executeCommandWithContext(
        'Get-ChildItem -Path "master:\\content\\Home" | Show-ListView -Title "Test Report"',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      expect(result.output).toContain("Test Report");
      expect(result.output).toContain("3 item(s) displayed.");
    });

    it("supports positional wildcard (Show-ListView *)", () => {
      const result = executeCommandWithContext(
        'Get-ChildItem -Path "master:\\content\\Home" | Show-ListView *',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      expect(result.output).toContain("Name");
      expect(result.output).toContain("TemplateName");
    });
  });

  describe("Write-Host", () => {
    it("outputs a message", () => {
      const result = executeCommandWithContext(
        'Write-Host "Hello World"',
        ctx,
        tree
      );
      expect(result.output).toBe("Hello World");
    });
  });

  describe("New-Item", () => {
    it("creates a new item in the tree", () => {
      const result = executeCommandWithContext(
        'New-Item -Path "master:\\content\\Home" -Name "TestPage" -ItemType "Sample/Sample Item"',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      expect(result.output).toContain("TestPage");
      // Verify it's actually in the tree
      expect(tree.sitecore._children.content._children.Home._children["TestPage"]).toBeDefined();
    });
  });

  describe("Remove-Item", () => {
    it("removes an item from the tree", () => {
      // First verify About exists
      expect(tree.sitecore._children.content._children.Home._children["About"]).toBeDefined();
      executeCommandWithContext(
        'Remove-Item -Path "master:\\content\\Home\\About"',
        ctx,
        tree
      );
      expect(tree.sitecore._children.content._children.Home._children["About"]).toBeUndefined();
    });
  });

  describe("Move-Item", () => {
    it("moves an item to a new parent", () => {
      executeCommandWithContext(
        'Move-Item -Path "master:\\content\\Home\\About\\Contributors" -Destination "master:\\content\\Home\\Products"',
        ctx,
        tree
      );
      expect(tree.sitecore._children.content._children.Home._children.About._children["Contributors"]).toBeUndefined();
      expect(tree.sitecore._children.content._children.Home._children.Products._children["Contributors"]).toBeDefined();
    });
  });

  describe("Copy-Item", () => {
    it("copies an item with a new ID", () => {
      const originalId = tree.sitecore._children.content._children.Home._children.About._children.Contributors._id;
      executeCommandWithContext(
        'Copy-Item -Path "master:\\content\\Home\\About\\Contributors" -Destination "master:\\content\\Home\\News"',
        ctx,
        tree
      );
      // Original still exists
      expect(tree.sitecore._children.content._children.Home._children.About._children["Contributors"]).toBeDefined();
      // Copy exists in News
      const copied = tree.sitecore._children.content._children.Home._children.News._children["Contributors"];
      expect(copied).toBeDefined();
      // Different ID
      expect(copied._id).not.toBe(originalId);
    });
  });

  describe("Rename-Item", () => {
    it("renames an item preserving its node", () => {
      const originalId = tree.sitecore._children.content._children.Home._children.About._children.History._id;
      executeCommandWithContext(
        'Get-Item -Path "master:\\content\\Home\\About\\History" | Rename-Item -NewName "Our Story"',
        ctx,
        tree
      );
      expect(tree.sitecore._children.content._children.Home._children.About._children["History"]).toBeUndefined();
      const renamed = tree.sitecore._children.content._children.Home._children.About._children["Our Story"];
      expect(renamed).toBeDefined();
      expect(renamed._id).toBe(originalId);
    });
  });

  describe("Unrecognized command", () => {
    it("returns error for unknown cmdlets", () => {
      const result = executeCommandWithContext("Invoke-Magic", ctx, tree);
      expect(result.error).toContain("not recognized");
    });
  });
});

describe("executeScript", () => {
  it("handles multi-line scripts with variables", () => {
    const result = executeScript(
      '$items = Get-ChildItem -Path "master:\\content\\Home" -Recurse\n$items | Measure-Object'
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("Count    : 43");
  });

  it("reports error for assignment with missing value expression", () => {
    const result = executeScript("$items = ");
    expect(result.error).toContain("You must provide a value expression following the '=' operator.");
  });

  it("reports error for empty pipe element at start", () => {
    const result = executeCommandWithContext("| Get-Item", ctx, tree);
    expect(result.error).toContain("An empty pipe element is not allowed.");
  });

  it("reports error for empty pipe element at end", () => {
    const result = executeCommandWithContext("Get-Item |", ctx, tree);
    expect(result.error).toContain("An empty pipe element is not allowed.");
  });

  it("reports error for unclosed string", () => {
    const result = executeCommandWithContext('"unclosed string', ctx, tree);
    expect(result.error).toContain('The string is missing the terminator: ".');
  });

  it("returns no output for undefined variable reference", () => {
    const result = executeCommandWithContext("$undefinedVar", ctx, tree);
    expect(result.error).toBeNull();
    expect(result.output).toBe("");
  });

  it("prints variable value when used as standalone line in script", () => {
    const result = executeScript('$var = "b"\n$var');
    expect(result.error).toBeNull();
    expect(result.output).toBe("b");
  });

  it("reports error for bare dollar sign", () => {
    const result = executeScript("$");
    expect(result.error).toContain("Variable reference is not valid.");
  });

  it("reports error for assignment without variable", () => {
    const result = executeScript("= 5");
    expect(result.error).toContain("The assignment expression is not valid.");
  });

  it("reports error for incomplete comparison operator", () => {
    const result = executeScript("$x -eq");
    expect(result.error).toContain("You must provide a value expression following the '-eq' operator.");
  });

  it("reports error for empty if condition", () => {
    const result = executeScript('if () { "yes" }');
    expect(result.error).toContain("You must provide a value expression following the 'if' keyword.");
  });

  it("reports error for foreach with missing collection", () => {
    const result = executeScript("foreach ($x in ) { $x }");
    expect(result.error).toContain("You must provide a value expression following the 'in' keyword.");
  });

  it("reports error for missing parameter argument", () => {
    const result = executeCommandWithContext("Get-Item -Path", ctx, tree);
    expect(result.error).toContain("Missing an argument for parameter 'Path'.");
  });

  it("handles continuation lines (pipe at end)", () => {
    const result = executeScript(
      'Get-ChildItem -Path "master:\\content\\Home" -Recurse |\nMeasure-Object'
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("Count    : 43");
  });

  it("skips comments", () => {
    const result = executeScript(
      '# This is a comment\nGet-Location'
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("master:\\content\\Home");
  });

  it("handles continuation lines (trailing comma for multi-criteria)", () => {
    const script = `# Multi-criteria search
Find-Item -Index sitecore_master_index \`
    -Criteria @{Filter = "Equals"; Field = "_templatename"; Value = "Contributor"},
             @{Filter = "Equals"; Field = "country"; Value = "United States"} \`
    -OrderBy "_name"`;
    const result = executeScript(script);
    expect(result.error).toBeNull();
    expect(result.output).toContain("Michael West");
  });

  it("handles foreach loops", () => {
    const script = `$items = Get-ChildItem -Path "master:\\content\\Home"
foreach($item in $items) { Write-Host $item.Name }`;
    // Note: foreach with single-line body — the variable expansion happens in executeLine
    // This tests the foreach mechanism
    const result = executeScript(script);
    expect(result.error).toBeNull();
  });

  it("evaluates standalone [DateTime]::Now as expression", () => {
    const result = executeScript("[DateTime]::Now");
    expect(result.error).toBeNull();
    expect(result.output).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("evaluates standalone .NET calls case-insensitively", () => {
    const result = executeScript("[datetime]::now");
    expect(result.error).toBeNull();
    expect(result.output).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("evaluates standalone [Math]::Round()", () => {
    const result = executeScript("[Math]::Round(3.14159, 2)");
    expect(result.error).toBeNull();
    expect(result.output).toBe("3.14");
  });

  it("evaluates standalone [Guid]::NewGuid()", () => {
    const result = executeScript("[Guid]::NewGuid()");
    expect(result.error).toBeNull();
    expect(result.output).toMatch(/^[0-9a-f]{8}-/i);
  });

  it("handles [datetime]::now inside Where-Object filter", () => {
    const script = 'Get-ChildItem -Path "master:\\content\\Home" | Where-Object { $_.__Updated -lt [datetime]::now }';
    const result = executeScript(script);
    expect(result.error).toBeNull();
  });
});

describe("executeCommandWithContext - Write-Error", () => {
  it("produces error output", () => {
    const result = executeCommandWithContext(
      'Write-Error "Something went wrong"',
      ctx,
      tree
    );
    expect(result.error).toContain("Write-Error");
    expect(result.error).toContain("Something went wrong");
  });

  it("supports -Message parameter", () => {
    const result = executeCommandWithContext(
      'Write-Error -Message "Bad input"',
      ctx,
      tree
    );
    expect(result.error).toContain("Write-Error : Bad input");
  });
});

describe("executeCommandWithContext - Write-Warning", () => {
  it("produces WARNING: prefixed output", () => {
    const result = executeCommandWithContext(
      'Write-Warning "Careful now"',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toBe("WARNING: Careful now");
  });

  it("supports -Message parameter", () => {
    const result = executeCommandWithContext(
      'Write-Warning -Message "Proceed with caution"',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toBe("WARNING: Proceed with caution");
  });
});

describe("executeScript - try/catch", () => {
  it("catches errors from failing commands", () => {
    const script = 'try { Get-Item -Path "master:\\content\\DoesNotExist" } catch { Write-Host "caught" }';
    const result = executeScript(script, ctx);
    expect(ctx.outputs).toContain("caught");
    // The error should have been consumed by catch, not propagated
    expect(ctx.errors.length).toBe(0);
  });

  it("sets $_ to the error message in catch block", () => {
    const script = 'try { Get-Item -Path "master:\\content\\NoSuchPath" } catch { $msg = $_ }';
    const result = executeScript(script, ctx);
    const msg = ctx.getVar("msg");
    expect(typeof msg).toBe("string");
    expect(msg as string).toContain("Cannot find path");
    expect(ctx.errors.length).toBe(0);
  });

  it("executes try body normally when no error occurs", () => {
    const script = 'try { Write-Host "all good" } catch { Write-Host "should not run" }';
    const result = executeScript(script, ctx);
    expect(ctx.outputs).toContain("all good");
    expect(ctx.outputs).not.toContain("should not run");
  });

  it("works without a catch block", () => {
    const script = 'try { Write-Host "just try" }';
    const result = executeScript(script, ctx);
    expect(ctx.outputs).toContain("just try");
  });
});

describe("executeCommandWithContext - Publish-Item", () => {
  it("publishes a single item by path", () => {
    const result = executeCommandWithContext(
      'Publish-Item -Path "master:\\content\\Home"',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain('Published item "Home"');
    expect(result.output).toContain('target "web"');
    expect(result.output).toContain("Smart publish");
  });

  it("publishes via pipeline input", () => {
    const result = executeCommandWithContext(
      'Get-Item -Path "master:\\content\\Home" | Publish-Item',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain('Published item "Home"');
  });

  it("publishes multiple items via pipeline", () => {
    const result = executeCommandWithContext(
      'Get-ChildItem -Path "master:\\content\\Home" | Publish-Item',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("Published 3 items");
    expect(result.output).toContain('target "web"');
  });

  it("supports -PublishMode parameter", () => {
    const result = executeCommandWithContext(
      'Publish-Item -Path "master:\\content\\Home" -PublishMode Full',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("Full publish");
  });

  it("supports -Target parameter", () => {
    const result = executeCommandWithContext(
      'Publish-Item -Path "master:\\content\\Home" -Target "staging"',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain('target "staging"');
  });

  it("returns error for invalid path", () => {
    const result = executeCommandWithContext(
      'Publish-Item -Path "master:\\content\\DoesNotExist"',
      ctx,
      tree
    );
    expect(result.error).toContain("Cannot find path");
  });

  it("returns error when no item specified", () => {
    const result = executeCommandWithContext("Publish-Item", ctx, tree);
    expect(result.error).toContain("No item specified");
  });

  it("works with pi alias", () => {
    const result = executeCommandWithContext(
      'pi -Path "master:\\content\\Home"',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain('Published item "Home"');
  });
});

describe("executeCommandWithContext - Initialize-Item", () => {
  it("passes through pipeline data", () => {
    const result = executeCommandWithContext(
      'Get-ChildItem -Path "master:\\content\\Home" | Initialize-Item',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("About");
    expect(result.output).toContain("Products");
    expect(result.output).toContain("News");
  });

  it("returns error when no pipeline input", () => {
    const result = executeCommandWithContext("Initialize-Item", ctx, tree);
    expect(result.error).toContain("No pipeline input");
  });

  it("works in a pipeline with Find-Item", () => {
    const result = executeCommandWithContext(
      'Find-Item -Index sitecore_master_index -Criteria @{Filter="Equals"; Field="_templatename"; Value="Sample Item"} | Initialize-Item | Measure-Object',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("Count");
  });
});

describe("executeCommand (backward-compatible wrapper)", () => {
  it("executes a single command", () => {
    const result = executeCommand("Get-Location");
    expect(result.error).toBeNull();
    expect(result.output).toContain("master:\\content\\Home");
  });
});

describe("Dialog requests", () => {
  it("Show-Alert populates dialogRequests with alert type", () => {
    const result = executeCommandWithContext(
      'Show-Alert "Hello World"',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(ctx.dialogRequests).toHaveLength(1);
    expect(ctx.dialogRequests[0]).toEqual({
      type: "alert",
      message: "Hello World",
    });
  });

  it("Read-Variable populates dialogRequests with read-variable type", () => {
    const result = executeCommandWithContext(
      'Read-Variable -Title "Config" -Description "Enter settings"',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(ctx.dialogRequests).toHaveLength(1);
    expect(ctx.dialogRequests[0]).toEqual({
      type: "read-variable",
      title: "Config",
      description: "Enter settings",
    });
  });

  it("Show-ListView populates dialogRequests with listview type and itemCount", () => {
    const result = executeCommandWithContext(
      'Get-ChildItem -Path "master:\\content\\Home" | Show-ListView -Title "Results"',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(ctx.dialogRequests).toHaveLength(1);
    expect(ctx.dialogRequests[0].type).toBe("listview");
    expect(ctx.dialogRequests[0].title).toBe("Results");
    expect(ctx.dialogRequests[0].itemCount).toBeGreaterThan(0);
  });
});
