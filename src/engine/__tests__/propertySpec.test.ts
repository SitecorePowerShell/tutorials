import { describe, it, expect, beforeEach } from "vitest";
import { parsePropertyList, evaluatePropertySpec, getPropertyLabel } from "../propertySpec";
import { createVirtualTree } from "../virtualTree";
import { resolvePath, getChildren } from "../pathResolver";
import { ScriptContext } from "../scriptContext";
import { executeCommandWithContext } from "../executor";
import type { SitecoreItem } from "../../types";

describe("parsePropertyList", () => {
  it("parses plain property names", () => {
    const specs = parsePropertyList("Name, TemplateName");
    expect(specs).toEqual([
      { type: "plain", name: "Name" },
      { type: "plain", name: "TemplateName" },
    ]);
  });

  it("parses a calculated property", () => {
    const specs = parsePropertyList('@{Label="Type";Expression={$_.TemplateName}}');
    expect(specs).toHaveLength(1);
    expect(specs[0]).toEqual({
      type: "calculated",
      label: "Type",
      expression: "$_.TemplateName",
    });
  });

  it("parses mixed plain and calculated", () => {
    const specs = parsePropertyList('Name, @{Label="Template";Expression={$_.TemplateName}}');
    expect(specs).toHaveLength(2);
    expect(specs[0]).toEqual({ type: "plain", name: "Name" });
    expect(specs[1]).toEqual({
      type: "calculated",
      label: "Template",
      expression: "$_.TemplateName",
    });
  });

  it("supports short aliases l and e", () => {
    const specs = parsePropertyList('@{l="Custom";e={$_.Name}}');
    expect(specs[0]).toEqual({
      type: "calculated",
      label: "Custom",
      expression: "$_.Name",
    });
  });

  it("supports n alias for name/label", () => {
    const specs = parsePropertyList('@{n="Title";e={$_.Name}}');
    expect(specs[0]).toEqual({
      type: "calculated",
      label: "Title",
      expression: "$_.Name",
    });
  });
});

describe("getPropertyLabel", () => {
  it("returns name for plain properties", () => {
    expect(getPropertyLabel({ type: "plain", name: "Name" })).toBe("Name");
  });

  it("returns ID for plain id property", () => {
    expect(getPropertyLabel({ type: "plain", name: "id" })).toBe("ID");
  });

  it("returns label for calculated properties", () => {
    expect(getPropertyLabel({ type: "calculated", label: "Custom", expression: "$_.Name" })).toBe("Custom");
  });
});

describe("evaluatePropertySpec", () => {
  let tree: ReturnType<typeof createVirtualTree>;
  let ctx: ScriptContext;
  let item: SitecoreItem;

  beforeEach(() => {
    tree = createVirtualTree();
    ctx = new ScriptContext();
    const resolved = resolvePath("master:\\content\\Home", tree)!;
    item = { name: resolved.name, node: resolved.node, path: resolved.path };
  });

  it("evaluates plain property", () => {
    const result = evaluatePropertySpec({ type: "plain", name: "Name" }, item, ctx);
    expect(result).toBe("Home");
  });

  it("evaluates calculated property expression", () => {
    const result = evaluatePropertySpec(
      { type: "calculated", label: "Template", expression: "$_.TemplateName" },
      item,
      ctx
    );
    expect(result).toBe("Sample Item");
  });
});

describe("calculated properties in pipelines", () => {
  let tree: ReturnType<typeof createVirtualTree>;
  let ctx: ScriptContext;

  beforeEach(() => {
    tree = createVirtualTree();
    ctx = new ScriptContext();
  });

  it("Format-Table with calculated property", () => {
    const result = executeCommandWithContext(
      'Get-ChildItem -Path "master:\\content\\Home" | Format-Table Name, @{Label="Type";Expression={$_.TemplateName}}',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("Name");
    expect(result.output).toContain("Type");
    expect(result.output).toContain("About");
    expect(result.output).toContain("Sample Item");
  });

  it("Select-Object with calculated property", () => {
    const result = executeCommandWithContext(
      'Get-ChildItem -Path "master:\\content\\Home" | Select-Object Name, @{l="Template";e={$_.TemplateName}}',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("Name");
    expect(result.output).toContain("Template");
    expect(result.output).toContain("About");
  });
});
