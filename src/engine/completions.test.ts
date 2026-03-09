import { describe, it, expect } from "vitest";
import { getCompletions } from "./completions";

const MOCK_TREE = {
  sitecore: {
    _id: "root",
    _template: "Root",
    _templateFullName: "System/Root",
    _version: 1,
    _fields: {},
    _children: {
      content: {
        _id: "content-id",
        _template: "Node",
        _templateFullName: "System/Node",
        _version: 1,
        _fields: {},
        _children: {
          Home: {
            _id: "home-id",
            _template: "Sample Item",
            _templateFullName: "Sample/Sample Item",
            _version: 1,
            _fields: {},
            _children: {
              About: {
                _id: "about-id",
                _template: "Sample Item",
                _templateFullName: "Sample/Sample Item",
                _version: 1,
                _fields: {},
                _children: {},
              },
              Contact: {
                _id: "contact-id",
                _template: "Sample Item",
                _templateFullName: "Sample/Sample Item",
                _version: 1,
                _fields: {},
                _children: {},
              },
            },
          },
        },
      },
      templates: {
        _id: "templates-id",
        _template: "Node",
        _templateFullName: "System/Node",
        _version: 1,
        _fields: {},
        _children: {},
      },
    },
  },
};

describe("completions", () => {
  describe("cmdlet name completion", () => {
    it("completes Get- prefix", () => {
      const result = getCompletions("Get-", 4);
      expect(result).not.toBeNull();
      expect(result!.matches).toContain("Get-Item");
      expect(result!.matches).toContain("Get-ChildItem");
      expect(result!.matches).toContain("Get-Location");
      expect(result!.matches).toContain("Get-Member");
      expect(result!.replaceStart).toBe(0);
      expect(result!.replaceEnd).toBe(4);
    });

    it("completes partial cmdlet name", () => {
      const result = getCompletions("Get-Ch", 6);
      expect(result).not.toBeNull();
      expect(result!.matches).toContain("Get-ChildItem");
      expect(result!.matches).not.toContain("Get-Item");
    });

    it("completes cmdlet after pipe", () => {
      const result = getCompletions("Get-Item | Sort", 15);
      expect(result).not.toBeNull();
      expect(result!.matches).toContain("Sort-Object");
    });

    it("completes aliases", () => {
      const result = getCompletions("fore", 4);
      expect(result).not.toBeNull();
      expect(result!.matches).toContain("foreach");
      expect(result!.matches).toContain("ForEach-Object");
    });

    it("is case-insensitive", () => {
      const result = getCompletions("get-i", 5);
      expect(result).not.toBeNull();
      expect(result!.matches).toContain("Get-Item");
    });

    it("returns null for no matches", () => {
      const result = getCompletions("XyzNonExistent", 14);
      expect(result).toBeNull();
    });
  });

  describe("parameter completion", () => {
    it("completes parameters for known cmdlet", () => {
      const result = getCompletions("Get-ChildItem -", 15);
      expect(result).not.toBeNull();
      expect(result!.matches).toContain("-Path");
      expect(result!.matches).toContain("-Recurse");
    });

    it("completes partial parameter name", () => {
      const result = getCompletions("Select-Object -Pr", 17);
      expect(result).not.toBeNull();
      expect(result!.matches).toContain("-Property");
    });

    it("completes parameters after pipe", () => {
      const result = getCompletions("Get-Item | Sort-Object -", 24);
      expect(result).not.toBeNull();
      expect(result!.matches).toContain("-Property");
      expect(result!.matches).toContain("-Descending");
    });

    it("completes params for alias cmdlets", () => {
      const result = getCompletions("select -", 8);
      expect(result).not.toBeNull();
      expect(result!.matches).toContain("-Property");
      expect(result!.matches).toContain("-First");
    });

    it("returns common params for unknown cmdlet", () => {
      const result = getCompletions("SomeUnknown -", 13);
      expect(result).not.toBeNull();
      expect(result!.matches.length).toBeGreaterThan(0);
    });
  });

  describe("variable completion", () => {
    it("completes $ prefix with builtins", () => {
      const result = getCompletions("$", 1);
      expect(result).not.toBeNull();
      expect(result!.matches).toContain("$_");
      expect(result!.matches).toContain("$PSItem");
      expect(result!.matches).toContain("$true");
      expect(result!.matches).toContain("$false");
      expect(result!.matches).toContain("$null");
    });

    it("completes partial variable name", () => {
      const result = getCompletions("$PS", 3);
      expect(result).not.toBeNull();
      expect(result!.matches).toContain("$PSItem");
    });

    it("includes user-defined variables", () => {
      const result = getCompletions("$my", 3, undefined, ["myVar", "myOther"]);
      expect(result).not.toBeNull();
      expect(result!.matches).toContain("$myVar");
      expect(result!.matches).toContain("$myOther");
    });

    it("completes variable mid-expression", () => {
      const result = getCompletions("Write-Host $t", 13);
      expect(result).not.toBeNull();
      expect(result!.matches).toContain("$true");
    });
  });

  describe("path completion", () => {
    it("completes top-level children of /sitecore/", () => {
      const result = getCompletions(
        "Get-Item /sitecore/",
        19,
        MOCK_TREE
      );
      expect(result).not.toBeNull();
      expect(result!.matches).toContain("/sitecore/content");
      expect(result!.matches).toContain("/sitecore/templates");
    });

    it("completes partial path segment", () => {
      const result = getCompletions(
        "Get-Item /sitecore/con",
        22,
        MOCK_TREE
      );
      expect(result).not.toBeNull();
      expect(result!.matches).toContain("/sitecore/content");
      expect(result!.matches).not.toContain("/sitecore/templates");
    });

    it("completes nested paths", () => {
      const result = getCompletions(
        "Get-Item /sitecore/content/Home/",
        32,
        MOCK_TREE
      );
      expect(result).not.toBeNull();
      expect(result!.matches).toContain("/sitecore/content/Home/About");
      expect(result!.matches).toContain("/sitecore/content/Home/Contact");
    });

    it("returns null for non-existent path", () => {
      const result = getCompletions(
        "Get-Item /sitecore/nonexistent/",
        31,
        MOCK_TREE
      );
      expect(result).toBeNull();
    });

    it("completes path with partial nested segment", () => {
      const result = getCompletions(
        "Get-Item /sitecore/content/Home/Ab",
        34,
        MOCK_TREE
      );
      expect(result).not.toBeNull();
      expect(result!.matches).toContain("/sitecore/content/Home/About");
    });
  });
});
