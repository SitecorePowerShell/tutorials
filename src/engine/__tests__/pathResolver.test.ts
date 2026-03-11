import { describe, it, expect } from "vitest";
import { createVirtualTree } from "../virtualTree";
import { resolvePath, getChildren, getAllDescendants } from "../pathResolver";

describe("resolvePath", () => {
  const tree = createVirtualTree();

  it("resolves master:\\content\\Home", () => {
    const result = resolvePath('master:\\content\\Home', tree);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Home");
    expect(result!.node._id).toBe("{110D559F-DEA5-42EA-9C1C-8A5DF7E70EF9}");
  });

  it("resolves with forward slashes", () => {
    const result = resolvePath("master:/content/Home", tree);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Home");
  });

  it("resolves with sitecore prefix", () => {
    const result = resolvePath('master:\\sitecore\\content\\Home', tree);
    expect(result).not.toBeNull();
    expect(result!.node._id).toBe("{110D559F-DEA5-42EA-9C1C-8A5DF7E70EF9}");
  });

  it("resolves dot to CWD (Home)", () => {
    const result = resolvePath(".", tree);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Home");
  });

  it("resolves master: (bare) to CWD (Home)", () => {
    const result = resolvePath("master:", tree);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Home");
  });

  it("resolves master:\\ to sitecore root", () => {
    const result = resolvePath("master:\\", tree);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("sitecore");
    expect(result!.node._template).toBe("Root");
  });

  it("resolves case-insensitively", () => {
    const result = resolvePath('master:\\CONTENT\\HOME', tree);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Home");
  });

  it("resolves deep paths", () => {
    const result = resolvePath('master:\\content\\Home\\About\\Contributors', tree);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Contributors");
    expect(result!.node._id).toBe("{B1111111-1111-1111-1111-111111111111}");
  });

  it("returns null for invalid paths", () => {
    const result = resolvePath('master:\\content\\DoesNotExist', tree);
    expect(result).toBeNull();
  });

  it("resolves paths with quoted strings", () => {
    const result = resolvePath('"master:\\content\\Home"', tree);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Home");
  });

  it("resolves items with spaces in names", () => {
    const result = resolvePath('master:\\content\\Home\\Products\\XM Cloud', tree);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("XM Cloud");
  });
});

describe("getChildren", () => {
  const tree = createVirtualTree();

  it("returns direct children of Home", () => {
    const home = resolvePath('master:\\content\\Home', tree)!.node;
    const children = getChildren(home);
    expect(children).toHaveLength(3);
    const names = children.map((c) => c.name);
    expect(names).toContain("About");
    expect(names).toContain("Products");
    expect(names).toContain("News");
  });

  it("returns empty array for leaf nodes", () => {
    const history = resolvePath('master:\\content\\Home\\About\\History', tree)!.node;
    const children = getChildren(history);
    expect(children).toHaveLength(0);
  });
});

describe("getAllDescendants", () => {
  const tree = createVirtualTree();

  it("returns all descendants recursively", () => {
    const home = resolvePath('master:\\content\\Home', tree)!.node;
    const descendants = getAllDescendants(home, "/sitecore/content/Home");
    // Home has: About (Contributors + 25 contributors, History, Careers), Products (A + Features + 2, B, C, D), News (4 articles) = 42
    expect(descendants).toHaveLength(43);
  });

  it("includes paths for all descendants", () => {
    const home = resolvePath('master:\\content\\Home', tree)!.node;
    const descendants = getAllDescendants(home, "/sitecore/content/Home");
    const contributors = descendants.find((d) => d.name === "Contributors");
    expect(contributors).toBeDefined();
    expect(contributors!.path).toBe("/sitecore/content/Home/About/Contributors");
  });
});
