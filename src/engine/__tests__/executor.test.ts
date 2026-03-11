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
      expect(result.output).toContain("Team");
      expect(result.output).toContain("Product A");
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
        'Get-ChildItem -Path "master:\\content\\Home" -Recurse | Where-Object { $_.Name -like "*Product*" }',
        ctx,
        tree
      );
      expect(result.error).toBeNull();
      expect(result.output).toContain("Product A");
      expect(result.output).toContain("Product B");
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
        'Move-Item -Path "master:\\content\\Home\\About\\Team" -Destination "master:\\content\\Home\\Products"',
        ctx,
        tree
      );
      expect(tree.sitecore._children.content._children.Home._children.About._children["Team"]).toBeUndefined();
      expect(tree.sitecore._children.content._children.Home._children.Products._children["Team"]).toBeDefined();
    });
  });

  describe("Copy-Item", () => {
    it("copies an item with a new ID", () => {
      const originalId = tree.sitecore._children.content._children.Home._children.About._children.Team._id;
      executeCommandWithContext(
        'Copy-Item -Path "master:\\content\\Home\\About\\Team" -Destination "master:\\content\\Home\\News"',
        ctx,
        tree
      );
      // Original still exists
      expect(tree.sitecore._children.content._children.Home._children.About._children["Team"]).toBeDefined();
      // Copy exists in News
      const copied = tree.sitecore._children.content._children.Home._children.News._children["Team"];
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
    expect(result.output).toContain("Count    : 21");
  });

  it("handles continuation lines (pipe at end)", () => {
    const result = executeScript(
      'Get-ChildItem -Path "master:\\content\\Home" -Recurse |\nMeasure-Object'
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("Count    : 21");
  });

  it("skips comments", () => {
    const result = executeScript(
      '# This is a comment\nGet-Location'
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("master:\\content\\Home");
  });

  it("handles foreach loops", () => {
    const script = `$items = Get-ChildItem -Path "master:\\content\\Home"
foreach($item in $items) { Write-Host $item.Name }`;
    // Note: foreach with single-line body — the variable expansion happens in executeLine
    // This tests the foreach mechanism
    const result = executeScript(script);
    expect(result.error).toBeNull();
  });
});

describe("executeCommand (backward-compatible wrapper)", () => {
  it("executes a single command", () => {
    const result = executeCommand("Get-Location");
    expect(result.error).toBeNull();
    expect(result.output).toContain("master:\\content\\Home");
  });
});
