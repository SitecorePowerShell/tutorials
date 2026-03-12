import { describe, it, expect } from "vitest";
import { assembleCommand, type PipelineStage } from "../assembleCommand";

function makeStage(overrides: Partial<PipelineStage> & { cmdlet: string }): PipelineStage {
  return {
    id: crypto.randomUUID(),
    params: {},
    switches: [],
    ...overrides,
  };
}

describe("assembleCommand", () => {
  it("returns empty string for empty stages", () => {
    expect(assembleCommand([])).toBe("");
  });

  it("assembles a single stage with params", () => {
    const stages = [
      makeStage({
        cmdlet: "Get-ChildItem",
        params: { Path: '"master:\\content\\Home"' },
      }),
    ];
    expect(assembleCommand(stages)).toBe('Get-ChildItem -Path "master:\\content\\Home"');
  });

  it("assembles a single stage with switches", () => {
    const stages = [
      makeStage({
        cmdlet: "Get-ChildItem",
        params: { Path: '"master:\\content\\Home"' },
        switches: ["Recurse"],
      }),
    ];
    expect(assembleCommand(stages)).toBe(
      'Get-ChildItem -Path "master:\\content\\Home" -Recurse'
    );
  });

  it("assembles a multi-stage pipeline", () => {
    const stages = [
      makeStage({
        cmdlet: "Get-ChildItem",
        params: { Path: '"master:\\content\\Home"' },
      }),
      makeStage({ cmdlet: "Measure-Object" }),
    ];
    expect(assembleCommand(stages)).toBe(
      'Get-ChildItem -Path "master:\\content\\Home" | Measure-Object'
    );
  });

  it("emits expression params positionally (no -FilterScript prefix)", () => {
    const stages = [
      makeStage({
        cmdlet: "Get-ChildItem",
        params: { Path: '"master:\\content\\Home"' },
      }),
      makeStage({
        cmdlet: "Where-Object",
        params: { FilterScript: '{ $_.Name -eq "Home" }' },
      }),
    ];
    const result = assembleCommand(stages);
    expect(result).toBe(
      'Get-ChildItem -Path "master:\\content\\Home" | Where-Object { $_.Name -eq "Home" }'
    );
    expect(result).not.toContain("-FilterScript");
  });

  it("emits ForEach-Object process positionally", () => {
    const stages = [
      makeStage({
        cmdlet: "ForEach-Object",
        params: { Process: "{ $_.Name }" },
      }),
    ];
    expect(assembleCommand(stages)).toBe("ForEach-Object { $_.Name }");
  });

  it("handles propertyList params", () => {
    const stages = [
      makeStage({
        cmdlet: "Select-Object",
        params: { Property: "Name, TemplateName" },
      }),
    ];
    expect(assembleCommand(stages)).toBe("Select-Object -Property Name, TemplateName");
  });

  it("skips empty params", () => {
    const stages = [
      makeStage({
        cmdlet: "Select-Object",
        params: { Property: "Name", First: "", Last: "" },
      }),
    ];
    expect(assembleCommand(stages)).toBe("Select-Object -Property Name");
  });

  it("handles Sort-Object with Descending switch", () => {
    const stages = [
      makeStage({
        cmdlet: "Sort-Object",
        params: { Property: "Name" },
        switches: ["Descending"],
      }),
    ];
    expect(assembleCommand(stages)).toBe("Sort-Object -Property Name -Descending");
  });
});
