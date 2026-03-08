import { describe, it, expect } from "vitest";
import { parseCommand, parseSingleCommand } from "../parser";

describe("parseSingleCommand", () => {
  it("parses a simple cmdlet with no params", () => {
    const result = parseSingleCommand("Get-Location");
    expect(result.cmdlet).toBe("Get-Location");
    expect(result.params).toEqual({});
    expect(result.switches).toEqual([]);
  });

  it("parses named parameters", () => {
    const result = parseSingleCommand(
      'Get-Item -Path "master:\\content\\Home"'
    );
    expect(result.cmdlet).toBe("Get-Item");
    expect(result.params.Path).toBe("master:\\content\\Home");
  });

  it("parses switches", () => {
    const result = parseSingleCommand(
      'Get-ChildItem -Path "master:\\content\\Home" -Recurse'
    );
    expect(result.cmdlet).toBe("Get-ChildItem");
    expect(result.params.Path).toBe("master:\\content\\Home");
    expect(result.switches).toContain("Recurse");
  });

  it("parses positional parameters", () => {
    const result = parseSingleCommand(
      'Get-Item "master:\\content\\Home"'
    );
    expect(result.params._positional).toEqual(["master:\\content\\Home"]);
  });

  it("strips quotes from parameter values", () => {
    const result = parseSingleCommand(
      "Get-Item -Path 'master:\\content\\Home'"
    );
    expect(result.params.Path).toBe("master:\\content\\Home");
  });

  it("handles multiple named parameters", () => {
    const result = parseSingleCommand(
      'New-Item -Path "master:\\content\\Home" -Name "TestItem" -ItemType "Sample/Sample Item"'
    );
    expect(result.params.Path).toBe("master:\\content\\Home");
    expect(result.params.Name).toBe("TestItem");
    expect(result.params.ItemType).toBe("Sample/Sample Item");
  });
});

describe("parseCommand", () => {
  it("splits on pipe", () => {
    const result = parseCommand(
      'Get-ChildItem -Path "master:\\content\\Home" | Measure-Object'
    );
    expect(result.parsed).toHaveLength(2);
    expect(result.parsed[0].cmdlet).toBe("Get-ChildItem");
    expect(result.parsed[1].cmdlet).toBe("Measure-Object");
  });

  it("preserves raw stage strings", () => {
    const result = parseCommand(
      'Get-ChildItem | Where-Object { $_.TemplateName -eq "Folder" }'
    );
    expect(result.raw).toHaveLength(2);
    expect(result.raw[1]).toContain("{");
    expect(result.raw[1]).toContain("}");
  });

  it("does not split on pipe inside braces", () => {
    const result = parseCommand(
      'Get-ChildItem | Where-Object { $_.Name | Write-Host }'
    );
    expect(result.parsed).toHaveLength(2);
    // The inner pipe should stay in the brace block
    expect(result.raw[1]).toContain("$_.Name | Write-Host");
  });

  it("does not split on pipe inside quotes", () => {
    const result = parseCommand('Write-Host "hello | world"');
    expect(result.parsed).toHaveLength(1);
    expect(result.parsed[0].cmdlet).toBe("Write-Host");
  });

  it("handles three-stage pipeline", () => {
    const result = parseCommand(
      "Get-ChildItem | Select-Object -Property Name,Id | Sort-Object -Property Name"
    );
    expect(result.parsed).toHaveLength(3);
    expect(result.parsed[0].cmdlet).toBe("Get-ChildItem");
    expect(result.parsed[1].cmdlet).toBe("Select-Object");
    expect(result.parsed[2].cmdlet).toBe("Sort-Object");
  });
});
