import { describe, it, expect } from "vitest";
import { getItemProperty } from "../properties";
import { createVirtualTree } from "../virtualTree";
import { resolvePath } from "../pathResolver";

describe("getItemProperty", () => {
  const tree = createVirtualTree();
  const homeResolved = resolvePath('master:\\content\\Home', tree)!;
  const home = { name: homeResolved.name, node: homeResolved.node, path: homeResolved.path };

  it("returns Name", () => {
    expect(getItemProperty(home, "Name")).toBe("Home");
  });

  it("returns Name case-insensitively", () => {
    expect(getItemProperty(home, "name")).toBe("Home");
  });

  it("returns ID", () => {
    expect(getItemProperty(home, "Id")).toBe("{110D559F-DEA5-42EA-9C1C-8A5DF7E70EF9}");
    expect(getItemProperty(home, "ID")).toBe("{110D559F-DEA5-42EA-9C1C-8A5DF7E70EF9}");
  });

  it("returns TemplateName (short form)", () => {
    expect(getItemProperty(home, "TemplateName")).toBe("Sample Item");
  });

  it("returns ItemPath", () => {
    expect(getItemProperty(home, "ItemPath")).toBe("/sitecore/content/Home");
  });

  it("returns Version", () => {
    expect(getItemProperty(home, "Version")).toBe("2");
  });

  it("returns HasChildren", () => {
    expect(getItemProperty(home, "HasChildren")).toBe("True");
  });

  it("returns HasChildren False for leaf nodes", () => {
    const historyResolved = resolvePath('master:\\content\\Home\\About\\History', tree)!;
    const history = { name: historyResolved.name, node: historyResolved.node, path: historyResolved.path };
    expect(getItemProperty(history, "HasChildren")).toBe("False");
  });

  it("returns Database", () => {
    expect(getItemProperty(home, "Database")).toBe("master");
  });

  it("returns DisplayName (same as Name)", () => {
    expect(getItemProperty(home, "DisplayName")).toBe("Home");
  });

  it("returns Language", () => {
    expect(getItemProperty(home, "Language")).toBe("en");
  });

  it("returns field values (case-sensitive first)", () => {
    expect(getItemProperty(home, "__Updated")).toBe("20250315T103000Z");
  });

  it("returns field values with spaces in names", () => {
    expect(getItemProperty(home, "__Updated by")).toBe("sitecore\\admin");
  });

  it("returns field values case-insensitively as fallback", () => {
    expect(getItemProperty(home, "__updated")).toBe("20250315T103000Z");
  });

  it("returns empty string for unknown properties", () => {
    expect(getItemProperty(home, "DoesNotExist")).toBe("");
  });

  it("returns Key (lowercase Name)", () => {
    expect(getItemProperty(home, "Key")).toBe("home");
  });

  it("returns Template.FullName", () => {
    expect(getItemProperty(home, "Template.FullName")).toBe("Sample/Sample Item");
  });

  it("returns Paths.FullPath (same as ItemPath)", () => {
    expect(getItemProperty(home, "Paths.FullPath")).toBe("/sitecore/content/Home");
  });

  it("returns Parent from path", () => {
    expect(getItemProperty(home, "Parent")).toBe("content");
    const aboutResolved = resolvePath('master:\\content\\Home\\About', tree)!;
    const about = { name: aboutResolved.name, node: aboutResolved.node, path: aboutResolved.path };
    expect(getItemProperty(about, "Parent")).toBe("Home");
  });

  it("returns __Created by field", () => {
    expect(getItemProperty(home, "__Created by")).toBe("sitecore\\admin");
  });
});
