import { describe, it, expect } from "vitest";
import { formatItemTable, formatPropertyTable } from "../formatter";
import { createVirtualTree } from "../virtualTree";
import { resolvePath, getChildren } from "../pathResolver";
import type { PropertySpec } from "../../types";

describe("formatItemTable", () => {
  const tree = createVirtualTree();
  const homeNode = resolvePath('master:\\content\\Home', tree)!.node;
  const children = getChildren(homeNode).map((c) => ({
    ...c,
    path: "/sitecore/content/Home/" + c.name,
  }));

  it("returns empty string for empty array", () => {
    expect(formatItemTable([])).toBe("");
  });

  it("includes correct headers", () => {
    const result = formatItemTable(children);
    const firstLine = result.split("\n")[0];
    expect(firstLine).toContain("Name");
    expect(firstLine).toContain("Children");
    expect(firstLine).toContain("Language");
    expect(firstLine).toContain("Version");
    expect(firstLine).toContain("Id");
    expect(firstLine).toContain("TemplateName");
  });

  it("includes separator line", () => {
    const result = formatItemTable(children);
    const secondLine = result.split("\n")[1];
    expect(secondLine).toMatch(/^-+/);
  });

  it("formats data rows", () => {
    const result = formatItemTable(children);
    expect(result).toContain("About");
    expect(result).toContain("Products");
    expect(result).toContain("News");
  });

  it("shows HasChildren as True/False", () => {
    const result = formatItemTable(children);
    expect(result).toContain("True");
  });
});

describe("formatPropertyTable", () => {
  const tree = createVirtualTree();
  const homeNode = resolvePath('master:\\content\\Home', tree)!.node;
  const children = getChildren(homeNode).map((c) => ({
    ...c,
    path: "/sitecore/content/Home/" + c.name,
  }));

  const plain = (...names: string[]): PropertySpec[] =>
    names.map((n) => ({ type: "plain", name: n }));

  it("formats selected properties", () => {
    const result = formatPropertyTable(children, plain("Name", "TemplateName"));
    expect(result).toContain("Name");
    expect(result).toContain("TemplateName");
    expect(result).toContain("About");
  });

  it("displays Id as ID in header", () => {
    const result = formatPropertyTable(children, plain("Name", "Id"));
    const firstLine = result.split("\n")[0];
    expect(firstLine).toContain("ID");
  });

  it("returns empty string for empty array", () => {
    expect(formatPropertyTable([], plain("Name"))).toBe("");
  });
});
