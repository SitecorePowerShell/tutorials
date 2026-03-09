import { describe, it, expect, beforeEach } from "vitest";
import { createVirtualTree } from "../virtualTree";
import { executeCommandWithContext, executeScript } from "../executor";
import { ScriptContext } from "../scriptContext";
import type { SitecoreNode } from "../../types";

let tree: { sitecore: SitecoreNode };
let ctx: ScriptContext;

beforeEach(() => {
  tree = createVirtualTree();
  ctx = new ScriptContext();
});

describe("Compound Where-Object filters", () => {
  it("filters with -and", () => {
    const result = executeCommandWithContext(
      'Get-ChildItem -Path "master:\\content\\Home" -Recurse | Where-Object { $_.TemplateName -ne "Folder" -and $_.Name -like "H*" }',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("History");
    expect(result.output).not.toContain("Products");
    expect(result.output).not.toContain("News");
  });

  it("filters with -or", () => {
    const result = executeCommandWithContext(
      'Get-ChildItem -Path "master:\\content\\Home" | Where-Object { $_.Name -eq "About" -or $_.Name -eq "News" }',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("About");
    expect(result.output).toContain("News");
    expect(result.output).not.toContain("Products");
  });

  it("filters with -notlike", () => {
    const result = executeCommandWithContext(
      'Get-ChildItem -Path "master:\\content\\Home" | Where-Object { $_.Name -notlike "A*" }',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).not.toContain("About");
    expect(result.output).toContain("Products");
    expect(result.output).toContain("News");
  });

  it("filters with -notmatch", () => {
    const result = executeCommandWithContext(
      'Get-ChildItem -Path "master:\\content\\Home" | Where-Object { $_.Name -notmatch "^[AP]" }',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).not.toContain("About");
    expect(result.output).not.toContain("Products");
    expect(result.output).toContain("News");
  });

  it("filters with -not prefix", () => {
    const result = executeCommandWithContext(
      'Get-ChildItem -Path "master:\\content\\Home" | Where-Object { -not ($_.TemplateName -eq "Folder") }',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("About");
    expect(result.output).not.toContain("Products");
    expect(result.output).not.toContain("News");
  });
});

describe("ForEach-Object with expressions", () => {
  it("evaluates string expression with -replace", () => {
    const result = executeCommandWithContext(
      'Get-Item -Path "master:\\content\\Home" | ForEach-Object { $_.Name -replace "Home", "Dashboard" }',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("Dashboard");
  });

  it("evaluates double-quoted string with interpolation", () => {
    const result = executeCommandWithContext(
      'Get-ChildItem -Path "master:\\content\\Home" | ForEach-Object { "Item: $_.Name" }',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("Item: About");
    expect(result.output).toContain("Item: Products");
    expect(result.output).toContain("Item: News");
  });

  it("evaluates $_ property access", () => {
    const result = executeCommandWithContext(
      'Get-ChildItem -Path "master:\\content\\Home" | ForEach-Object { $_.TemplateName }',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    // About is "Sample Item", Products and News are "Folder"
    expect(result.output).toContain("Sample Item");
    expect(result.output).toContain("Folder");
  });

  it("still handles Write-Host inside ForEach-Object", () => {
    const result = executeCommandWithContext(
      'Get-ChildItem -Path "master:\\content\\Home" | ForEach-Object { Write-Host $_.Name }',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("About");
  });
});

describe("Set-ItemProperty", () => {
  it("sets a field by path", () => {
    executeCommandWithContext(
      'Set-ItemProperty -Path "master:\\content\\Home\\About" -Name "Title" -Value "About Us"',
      ctx,
      tree
    );
    expect(
      tree.sitecore._children.content._children.Home._children.About._fields
        .Title
    ).toBe("About Us");
  });

  it("sets a field via pipeline", () => {
    executeCommandWithContext(
      'Get-Item -Path "master:\\content\\Home\\About" | Set-ItemProperty -Name "Title" -Value "New Title"',
      ctx,
      tree
    );
    expect(
      tree.sitecore._children.content._children.Home._children.About._fields
        .Title
    ).toBe("New Title");
  });

  it("round-trips: set then get verifies value", () => {
    executeCommandWithContext(
      'Set-ItemProperty -Path "master:\\content\\Home\\About" -Name "CustomField" -Value "TestValue"',
      ctx,
      tree
    );
    const getResult = executeCommandWithContext(
      'Get-Item -Path "master:\\content\\Home\\About" | ForEach-Object { $_["CustomField"] }',
      ctx,
      tree
    );
    expect(getResult.output).toContain("TestValue");
  });

  it("returns error for missing -Name", () => {
    const result = executeCommandWithContext(
      'Set-ItemProperty -Path "master:\\content\\Home" -Value "Test"',
      ctx,
      tree
    );
    expect(result.error).toContain("Missing -Name");
  });
});

describe("Indexer access ($var['field'])", () => {
  it("accesses item field via indexer in variable expansion", () => {
    const script = `$item = Get-Item -Path "master:\\content\\Home\\About"
Write-Host $item["Title"]`;
    const result = executeScript(script);
    expect(result.error).toBeNull();
    expect(result.output).toContain("About Us");
  });
});

describe("if/else conditionals", () => {
  it("executes if body when condition is true", () => {
    const script = `$item = Get-Item -Path "master:\\content\\Home"
if ($item.HasChildren -eq "True") { Write-Host "Has children" }`;
    const result = executeScript(script);
    expect(result.error).toBeNull();
    expect(result.output).toContain("Has children");
  });

  it("executes else body when condition is false", () => {
    const script = `$item = Get-Item -Path "master:\\content\\Home\\About\\History"
if ($item.HasChildren -eq "True") { Write-Host "Has children" } else { Write-Host "No children" }`;
    const result = executeScript(script);
    expect(result.error).toBeNull();
    expect(result.output).toContain("No children");
  });

  it("supports compound conditions in if", () => {
    const script = `$item = Get-Item -Path "master:\\content\\Home"
if ($item.HasChildren -eq "True" -and $item.Name -eq "Home") { Write-Host "It is Home with children" }`;
    const result = executeScript(script);
    expect(result.error).toBeNull();
    expect(result.output).toContain("It is Home with children");
  });

  it("condition evaluates to false with -and when one part fails", () => {
    const script = `$item = Get-Item -Path "master:\\content\\Home"
if ($item.HasChildren -eq "True" -and $item.Name -eq "NotHome") { Write-Host "yes" } else { Write-Host "no" }`;
    const result = executeScript(script);
    expect(result.error).toBeNull();
    expect(result.output).toContain("no");
  });

  it("executes commands in if body", () => {
    const script = `$item = Get-Item -Path "master:\\content\\Home"
if ($item.HasChildren -eq "True") { $children = Get-ChildItem -Path "master:\\content\\Home"; $children | Measure-Object }`;
    const result = executeScript(script);
    expect(result.error).toBeNull();
    expect(result.output).toContain("Count    : 3");
  });
});

describe("Expression evaluation in variable assignment", () => {
  it("assigns string expression result", () => {
    const script = `$name = "Hello" + " World"
Write-Host $name`;
    const result = executeScript(script);
    expect(result.error).toBeNull();
    expect(result.output).toContain("Hello World");
  });

  it("assigns numeric expression result", () => {
    const script = `$sum = 2 + 3
Write-Host $sum`;
    const result = executeScript(script);
    expect(result.error).toBeNull();
    expect(result.output).toContain("5");
  });

  it("assigns variable property", () => {
    const script = `$item = Get-Item -Path "master:\\content\\Home"
$name = $item.Name
Write-Host $name`;
    const result = executeScript(script);
    expect(result.error).toBeNull();
    expect(result.output).toContain("Home");
  });

  it("assigns hashtable", () => {
    const script = `$hash = @{ Key = "Value"; Num = 42 }
Write-Host $hash`;
    const result = executeScript(script);
    expect(result.error).toBeNull();
    // The hashtable is stored as an object; Write-Host converts it to string
  });

  it("assigns array literal", () => {
    const script = `$arr = @("first", "second", "third")
Write-Host $arr.Count`;
    // $arr.Count is expanded in the string context
    const result = executeScript(script);
    expect(result.error).toBeNull();
    expect(result.output).toContain("3");
  });
});

describe("Format-Table cmdlet", () => {
  it("formats with specific properties", () => {
    const result = executeCommandWithContext(
      'Get-ChildItem -Path "master:\\content\\Home" | Format-Table -Property Name,TemplateName',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("Name");
    expect(result.output).toContain("TemplateName");
    expect(result.output).toContain("About");
  });

  it("formats with default columns", () => {
    const result = executeCommandWithContext(
      'Get-ChildItem -Path "master:\\content\\Home" | Format-Table',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("About");
    expect(result.output).toContain("Products");
  });
});

describe("ConvertTo-Json cmdlet", () => {
  it("converts single item to JSON", () => {
    const result = executeCommandWithContext(
      'Get-Item -Path "master:\\content\\Home" | ConvertTo-Json',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    const parsed = JSON.parse(result.output);
    expect(parsed.Name).toBe("Home");
    expect(parsed.TemplateName).toBe("Sample Item");
    expect(parsed.HasChildren).toBe(true);
  });

  it("converts multiple items to JSON array", () => {
    const result = executeCommandWithContext(
      'Get-ChildItem -Path "master:\\content\\Home" | ConvertTo-Json',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    const parsed = JSON.parse(result.output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(3);
    expect(parsed[0].Name).toBe("About");
  });
});

describe("Complex multi-step scripts", () => {
  it("compound filter with multiple conditions", () => {
    const script = `Get-ChildItem -Path "master:\\content\\Home" -Recurse | Where-Object { $_.TemplateName -ne "Folder" -and $_.Name -like "H*" }`;
    const result = executeScript(script);
    expect(result.error).toBeNull();
    expect(result.output).toContain("History");
  });

  it("if/else with Get-ChildItem in body", () => {
    const script = `$item = Get-Item -Path "master:\\content\\Home"
if ($item.HasChildren -eq "True") { Get-ChildItem -Path "master:\\content\\Home" | Measure-Object } else { Write-Host "Empty" }`;
    const result = executeScript(script);
    expect(result.error).toBeNull();
    expect(result.output).toContain("Count    : 3");
  });

  it("Set-ItemProperty then verify with indexer", () => {
    const script = `Set-ItemProperty -Path "master:\\content\\Home\\About" -Name "Subtitle" -Value "Our Story"
$item = Get-Item -Path "master:\\content\\Home\\About"
Write-Host $item["Subtitle"]`;
    const result = executeScript(script);
    expect(result.error).toBeNull();
    expect(result.output).toContain("Our Story");
  });
});
