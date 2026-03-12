import { describe, it, expect, beforeEach } from "vitest";
import { createVirtualTree } from "../virtualTree";
import {
  buildSearchIndex,
  executeSearch,
  entriesToItems,
  parseCriteriaHashtables,
} from "../searchIndex";
import { executeCommandWithContext } from "../executor";
import { ScriptContext } from "../scriptContext";
import type { SitecoreNode } from "../../types";

let tree: { sitecore: SitecoreNode };
let ctx: ScriptContext;

beforeEach(() => {
  tree = createVirtualTree();
  ctx = new ScriptContext();
});

describe("buildSearchIndex", () => {
  it("indexes all items in the tree", () => {
    const index = buildSearchIndex(tree);
    expect(index.length).toBeGreaterThan(30);
  });

  it("indexes _templatename in lowercase", () => {
    const index = buildSearchIndex(tree);
    const contributors = index.filter((e) => e._templatename === "contributor");
    expect(contributors.length).toBe(25);
  });

  it("indexes _name in lowercase", () => {
    const index = buildSearchIndex(tree);
    const home = index.find((e) => e._name === "home");
    expect(home).toBeDefined();
    expect(home!._fullpath).toBe("/sitecore/content/home");
  });

  it("indexes custom fields with lowercase keys", () => {
    const index = buildSearchIndex(tree);
    const michael = index.find((e) => e._name === "michael west");
    expect(michael).toBeDefined();
    expect(michael!.country).toBe("united states");
    expect(michael!.company).toBe("");
  });

  it("populates _content with concatenated text fields", () => {
    const index = buildSearchIndex(tree);
    const michael = index.find((e) => e._name === "michael west");
    expect(michael!._content).toContain("mvp");
    expect(michael!._content).toContain("michael west");
  });

  it("populates _ancestors for DescendantOf queries", () => {
    const index = buildSearchIndex(tree);
    const michael = index.find((e) => e._name === "michael west");
    expect(michael!._ancestors).toContain("{B1111111-1111-1111-1111-111111111111}"); // Contributors folder
  });
});

describe("executeSearch", () => {
  it("finds items with Equals filter", () => {
    const index = buildSearchIndex(tree);
    const results = executeSearch(
      index,
      [{ Filter: "Equals", Field: "_templatename", Value: "Article" }],
      {},
      tree
    );
    expect(results.length).toBe(4);
    expect(results.every((r) => r._templatename === "article")).toBe(true);
  });

  it("finds items with Contains filter", () => {
    const index = buildSearchIndex(tree);
    const results = executeSearch(
      index,
      [{ Filter: "Contains", Field: "_content", Value: "MVP" }],
      {},
      tree
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r._content.includes("mvp"))).toBe(true);
  });

  it("finds items with StartsWith filter", () => {
    const index = buildSearchIndex(tree);
    const results = executeSearch(
      index,
      [{ Filter: "StartsWith", Field: "_name", Value: "SPE" }],
      {},
      tree
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r._name.startsWith("spe"))).toBe(true);
  });

  it("finds descendants with DescendantOf filter using path", () => {
    const index = buildSearchIndex(tree);
    const results = executeSearch(
      index,
      [{ Filter: "DescendantOf", Value: "master:\\content\\Home\\Products" }],
      {},
      tree
    );
    expect(results.length).toBeGreaterThan(0);
    // Should include products and their children
    const names = results.map((r) => r._name);
    expect(names).toContain("xm cloud");
  });

  it("combines multiple criteria with AND logic", () => {
    const index = buildSearchIndex(tree);
    const results = executeSearch(
      index,
      [
        { Filter: "Equals", Field: "_templatename", Value: "Contributor" },
        { Filter: "Equals", Field: "country", Value: "United States" },
      ],
      {},
      tree
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r._templatename === "contributor")).toBe(true);
    expect(results.every((r) => r.country === "united states")).toBe(true);
  });

  it("supports Invert on criteria", () => {
    const index = buildSearchIndex(tree);
    const results = executeSearch(
      index,
      [
        { Filter: "Equals", Field: "_templatename", Value: "Contributor" },
        { Filter: "Equals", Field: "country", Value: "United States", Invert: true },
      ],
      {},
      tree
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.country !== "united states")).toBe(true);
  });

  it("supports -OrderBy sorting", () => {
    const index = buildSearchIndex(tree);
    const results = executeSearch(
      index,
      [{ Filter: "Equals", Field: "_templatename", Value: "Contributor" }],
      { orderBy: "_name" },
      tree
    );
    for (let i = 1; i < results.length; i++) {
      expect(results[i]._name.localeCompare(results[i - 1]._name) >= 0).toBe(true);
    }
  });

  it("supports -First pagination", () => {
    const index = buildSearchIndex(tree);
    const results = executeSearch(
      index,
      [{ Filter: "Equals", Field: "_templatename", Value: "Contributor" }],
      { first: 5 },
      tree
    );
    expect(results.length).toBe(5);
  });

  it("supports -Skip pagination", () => {
    const index = buildSearchIndex(tree);
    const all = executeSearch(
      index,
      [{ Filter: "Equals", Field: "_templatename", Value: "Contributor" }],
      {},
      tree
    );
    const skipped = executeSearch(
      index,
      [{ Filter: "Equals", Field: "_templatename", Value: "Contributor" }],
      { skip: 5 },
      tree
    );
    expect(skipped.length).toBe(all.length - 5);
  });

  it("supports -First and -Skip combined", () => {
    const index = buildSearchIndex(tree);
    const page2 = executeSearch(
      index,
      [{ Filter: "Equals", Field: "_templatename", Value: "Contributor" }],
      { first: 5, skip: 5 },
      tree
    );
    expect(page2.length).toBe(5);
  });
});

describe("entriesToItems", () => {
  it("converts search entries back to SitecoreItem objects", () => {
    const index = buildSearchIndex(tree);
    const results = executeSearch(
      index,
      [{ Filter: "Equals", Field: "_templatename", Value: "Article" }],
      {},
      tree
    );
    const items = entriesToItems(results, tree);
    expect(items.length).toBe(4);
    expect(items[0].node._template).toBe("Article");
  });
});

describe("parseCriteriaHashtables", () => {
  it("parses a single criteria hashtable", () => {
    const raw = 'Find-Item -Index sitecore_master_index -Criteria @{Filter = "Equals"; Field = "_templatename"; Value = "Article"}';
    const criteria = parseCriteriaHashtables(raw);
    expect(criteria).toHaveLength(1);
    expect(criteria[0].Filter).toBe("Equals");
    expect(criteria[0].Field).toBe("_templatename");
    expect(criteria[0].Value).toBe("Article");
  });

  it("parses multiple criteria hashtables", () => {
    const raw = '-Criteria @{Filter = "Equals"; Field = "_templatename"; Value = "Contributor"}, @{Filter = "Contains"; Field = "_content"; Value = "MVP"}';
    const criteria = parseCriteriaHashtables(raw);
    expect(criteria).toHaveLength(2);
    expect(criteria[0].Filter).toBe("Equals");
    expect(criteria[1].Filter).toBe("Contains");
    expect(criteria[1].Value).toBe("MVP");
  });

  it("parses Invert = $true", () => {
    const raw = '@{Filter = "Equals"; Field = "country"; Value = "United States"; Invert = $true}';
    const criteria = parseCriteriaHashtables(raw);
    expect(criteria).toHaveLength(1);
    expect(criteria[0].Invert).toBe(true);
  });

  it("handles single-quoted values", () => {
    const raw = "@{Filter = 'Contains'; Field = '_content'; Value = 'test'}";
    const criteria = parseCriteriaHashtables(raw);
    expect(criteria).toHaveLength(1);
    expect(criteria[0].Filter).toBe("Contains");
    expect(criteria[0].Value).toBe("test");
  });
});

describe("Find-Item executor integration", () => {
  it("executes Find-Item with -Criteria in a pipeline", () => {
    const result = executeCommandWithContext(
      'Find-Item -Index sitecore_master_index -Criteria @{Filter = "Equals"; Field = "_templatename"; Value = "Article"}',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("Article");
  });

  it("supports Find-Item piped to Measure-Object", () => {
    const result = executeCommandWithContext(
      'Find-Item -Index sitecore_master_index -Criteria @{Filter = "Equals"; Field = "_templatename"; Value = "Contributor"} | Measure-Object',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("25");
  });

  it("supports Find-Item with multiple criteria", () => {
    const result = executeCommandWithContext(
      'Find-Item -Index sitecore_master_index -Criteria @{Filter = "Equals"; Field = "_templatename"; Value = "Contributor"}, @{Filter = "Equals"; Field = "country"; Value = "United States"} | Select-Object -Property Name, Country',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("United States");
    expect(result.output).not.toContain("Poland");
  });

  it("supports Find-Item piped to Select-Object", () => {
    const result = executeCommandWithContext(
      'Find-Item -Index sitecore_master_index -Criteria @{Filter = "Equals"; Field = "_templatename"; Value = "Article"} | Select-Object -Property Name, TemplateName',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("Article");
  });

  it("supports Find-Item with -First", () => {
    const result = executeCommandWithContext(
      'Find-Item -Index sitecore_master_index -Criteria @{Filter = "Equals"; Field = "_templatename"; Value = "Contributor"} -First 3 | Measure-Object',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("3");
  });

  it("supports Find-Item with DescendantOf using path", () => {
    const result = executeCommandWithContext(
      'Find-Item -Index sitecore_master_index -Criteria @{Filter = "DescendantOf"; Value = "master:\\content\\Home\\Products"}',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("XM Cloud");
  });

  it("returns error when no criteria provided", () => {
    const result = executeCommandWithContext(
      "Find-Item -Index sitecore_master_index",
      ctx,
      tree
    );
    expect(result.error).toContain("-Criteria parameter is required");
  });

  it("supports fi alias", () => {
    const result = executeCommandWithContext(
      'fi -Index sitecore_master_index -Criteria @{Filter = "Equals"; Field = "_templatename"; Value = "Article"}',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("Article");
  });

  it("works piped to Measure-Object in single command", () => {
    const result = executeCommandWithContext(
      'Find-Item -Index sitecore_master_index -Criteria @{Filter = "Equals"; Field = "_templatename"; Value = "Article"} | Measure-Object',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).toContain("4");
  });

  it("supports Invert in executor", () => {
    const result = executeCommandWithContext(
      'Find-Item -Index sitecore_master_index -Criteria @{Filter = "Equals"; Field = "_templatename"; Value = "Contributor"}, @{Filter = "Equals"; Field = "country"; Value = "United States"; Invert = $true} | Select-Object -Property Name, Country',
      ctx,
      tree
    );
    expect(result.error).toBeNull();
    expect(result.output).not.toContain("United States");
  });
});
