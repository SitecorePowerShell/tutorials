import { describe, it, expect, beforeEach } from "vitest";
import {
  evaluateExpression,
  findOperator,
  splitCommaArgs,
  interpolateString,
  findMatchingDelimiter,
} from "../expressionEval";
import { ScriptContext } from "../scriptContext";
import type { SitecoreItem, SitecoreNode } from "../../types";

let ctx: ScriptContext;

function makeItem(name: string, template = "Sample Item"): SitecoreItem {
  return {
    name,
    node: {
      _id: "{TEST-ID}",
      _template: template,
      _templateFullName: `Sample/${template}`,
      _version: 1,
      _fields: { Title: `${name} Title`, __Updated: "20240101T120000Z" },
      _children: {},
    },
    path: `/sitecore/content/Home/${name}`,
  };
}

beforeEach(() => {
  ctx = new ScriptContext();
});

describe("findOperator", () => {
  it("finds -replace at top level", () => {
    const result = findOperator('"hello" -replace "h", "H"', "-replace");
    expect(result).not.toBeNull();
    expect(result!.left).toBe('"hello"');
    expect(result!.right).toBe('"h", "H"');
  });

  it("does not find operator inside quotes", () => {
    const result = findOperator('"hello -replace world"', "-replace");
    expect(result).toBeNull();
  });

  it("finds + operator", () => {
    const result = findOperator('"hello" + " world"', "+");
    expect(result).not.toBeNull();
    expect(result!.left).toBe('"hello"');
    expect(result!.right).toBe('" world"');
  });

  it("does not find + inside parentheses", () => {
    const result = findOperator("(1 + 2)", "+");
    expect(result).toBeNull();
  });
});

describe("splitCommaArgs", () => {
  it("splits simple args", () => {
    expect(splitCommaArgs('"a", "b"')).toEqual(['"a"', '"b"']);
  });

  it("handles no commas", () => {
    expect(splitCommaArgs('"single"')).toEqual(['"single"']);
  });

  it("respects quotes", () => {
    expect(splitCommaArgs('"a, b", "c"')).toEqual(['"a, b"', '"c"']);
  });
});

describe("findMatchingDelimiter", () => {
  it("finds matching brace", () => {
    expect(findMatchingDelimiter("{ hello }", 0, "{", "}")).toBe(8);
  });

  it("handles nested braces", () => {
    expect(findMatchingDelimiter("{ { inner } }", 0, "{", "}")).toBe(12);
  });

  it("returns -1 if no match", () => {
    expect(findMatchingDelimiter("{ unclosed", 0, "{", "}")).toBe(-1);
  });
});

describe("evaluateExpression", () => {
  describe("literals", () => {
    it("evaluates $true", () => {
      expect(evaluateExpression("$true", ctx)).toBe(true);
    });

    it("evaluates $false", () => {
      expect(evaluateExpression("$false", ctx)).toBe(false);
    });

    it("evaluates $null", () => {
      expect(evaluateExpression("$null", ctx)).toBe(null);
    });

    it("evaluates integers", () => {
      expect(evaluateExpression("42", ctx)).toBe(42);
    });

    it("evaluates decimals", () => {
      expect(evaluateExpression("3.14", ctx)).toBe(3.14);
    });

    it("evaluates single-quoted strings", () => {
      expect(evaluateExpression("'hello world'", ctx)).toBe("hello world");
    });

    it("evaluates double-quoted strings", () => {
      expect(evaluateExpression('"hello world"', ctx)).toBe("hello world");
    });
  });

  describe("variable references", () => {
    it("resolves simple variable", () => {
      ctx.setVar("name", "test");
      expect(evaluateExpression("$name", ctx)).toBe("test");
    });

    it("returns empty string for undefined variable", () => {
      expect(evaluateExpression("$undefined", ctx)).toBe("");
    });

    it("resolves variable property (item)", () => {
      ctx.setVar("item", makeItem("About"));
      expect(evaluateExpression("$item.Name", ctx)).toBe("About");
    });

    it("resolves variable property (TemplateName)", () => {
      ctx.setVar("item", makeItem("About"));
      expect(evaluateExpression("$item.TemplateName", ctx)).toBe(
        "Sample Item"
      );
    });

    it("resolves array .Count", () => {
      ctx.setVar("items", [makeItem("A"), makeItem("B"), makeItem("C")]);
      expect(evaluateExpression("$items.Count", ctx)).toBe(3);
    });

    it("resolves array .Length", () => {
      ctx.setVar("items", [makeItem("A"), makeItem("B")]);
      expect(evaluateExpression("$items.Length", ctx)).toBe(2);
    });

    it("resolves $_.Template.FullName as dotted property", () => {
      const item = makeItem("About");
      expect(evaluateExpression("$_.Template.FullName", ctx, item)).toBe(
        "Sample/Sample Item"
      );
    });

    it("resolves $_.Paths.FullPath as dotted property", () => {
      const item = makeItem("About");
      expect(evaluateExpression("$_.Paths.FullPath", ctx, item)).toBe(
        "/sitecore/content/Home/About"
      );
    });

    it("resolves $_.Key as lowercase name", () => {
      const item = makeItem("About");
      expect(evaluateExpression("$_.Key", ctx, item)).toBe("about");
    });
  });

  describe("indexer access", () => {
    it("accesses item field by indexer", () => {
      ctx.setVar("item", makeItem("Page"));
      expect(evaluateExpression('$item["Title"]', ctx)).toBe("Page Title");
    });

    it("accesses item field with single quotes", () => {
      ctx.setVar("item", makeItem("Page"));
      expect(evaluateExpression("$item['Title']", ctx)).toBe("Page Title");
    });

    it("accesses hashtable by indexer", () => {
      ctx.setVar("hash", { Key1: "Val1", Key2: "Val2" });
      expect(evaluateExpression('$hash["Key1"]', ctx)).toBe("Val1");
    });
  });

  describe("$_ (current item)", () => {
    const item = makeItem("Current");

    it("resolves $_.Name", () => {
      expect(evaluateExpression("$_.Name", ctx, item)).toBe("Current");
    });

    it("resolves $_.ItemPath", () => {
      expect(evaluateExpression("$_.ItemPath", ctx, item)).toBe(
        "/sitecore/content/Home/Current"
      );
    });

    it('resolves $_["Title"]', () => {
      expect(evaluateExpression('$_["Title"]', ctx, item)).toBe(
        "Current Title"
      );
    });

    it("resolves $_ alone", () => {
      expect(evaluateExpression("$_", ctx, item)).toBe(item);
    });
  });

  describe("string operators", () => {
    it("-replace with pattern and replacement", () => {
      const result = evaluateExpression(
        '"Hello World" -replace "World", "PowerShell"',
        ctx
      );
      expect(result).toBe("Hello PowerShell");
    });

    it("-replace with regex pattern", () => {
      const result = evaluateExpression(
        '"test123" -replace "\\d+", "XXX"',
        ctx
      );
      expect(result).toBe("testXXX");
    });

    it("-replace with $_ property", () => {
      const item = makeItem("MyPage");
      const result = evaluateExpression(
        '$_.Name -replace "My", "Your"',
        ctx,
        item
      );
      expect(result).toBe("YourPage");
    });

    it("-split produces array", () => {
      const result = evaluateExpression('"a,b,c" -split ","', ctx);
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("-join combines array", () => {
      ctx.setVar("arr", ["a", "b", "c"]);
      const result = evaluateExpression('$arr -join ", "', ctx);
      expect(result).toBe("a, b, c");
    });

    it("+ concatenates strings", () => {
      const result = evaluateExpression('"Hello" + " World"', ctx);
      expect(result).toBe("Hello World");
    });

    it("+ adds numbers", () => {
      const result = evaluateExpression("1 + 2", ctx);
      expect(result).toBe(3);
    });

    it("-f format operator", () => {
      const result = evaluateExpression('"{0} has {1} items" -f "Folder", 5', ctx);
      expect(result).toBe("Folder has 5 items");
    });

    it("-f with variable", () => {
      ctx.setVar("count", 42);
      const result = evaluateExpression('"{0} items" -f $count', ctx);
      expect(result).toBe("42 items");
    });
  });

  describe("string interpolation in double quotes", () => {
    it("interpolates $var", () => {
      ctx.setVar("name", "World");
      expect(evaluateExpression('"Hello $name"', ctx)).toBe("Hello World");
    });

    it("interpolates $var.Prop", () => {
      ctx.setVar("item", makeItem("Test"));
      expect(evaluateExpression('"Item: $item.Name"', ctx)).toBe(
        "Item: Test"
      );
    });

    it("interpolates $() subexpression", () => {
      ctx.setVar("a", 2);
      ctx.setVar("b", 3);
      expect(evaluateExpression('"Sum: $($a + $b)"', ctx)).toBe("Sum: 5");
    });

    it("does not interpolate in single quotes", () => {
      ctx.setVar("name", "World");
      expect(evaluateExpression("'Hello $name'", ctx)).toBe("Hello $name");
    });
  });

  describe("hashtable literals", () => {
    it("parses simple hashtable", () => {
      const result = evaluateExpression(
        '@{ Name = "Test"; Value = "Hello" }',
        ctx
      );
      expect(result).toEqual({ Name: "Test", Value: "Hello" });
    });

    it("parses hashtable with number values", () => {
      const result = evaluateExpression("@{ Count = 42 }", ctx);
      expect(result).toEqual({ Count: 42 });
    });
  });

  describe("array literals", () => {
    it("parses simple array", () => {
      const result = evaluateExpression('@("a", "b", "c")', ctx);
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("parses empty array", () => {
      const result = evaluateExpression("@()", ctx);
      expect(result).toEqual([]);
    });

    it("parses array with numbers", () => {
      const result = evaluateExpression("@(1, 2, 3)", ctx);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe(".NET type casts", () => {
    it("casts to int", () => {
      expect(evaluateExpression('[int]"42"', ctx)).toBe(42);
    });

    it("casts to string", () => {
      expect(evaluateExpression("[string]42", ctx)).toBe("42");
    });

    it("casts to bool", () => {
      expect(evaluateExpression('[bool]"true"', ctx)).toBe(true);
    });
  });

  describe(".NET static calls", () => {
    it("[Math]::Abs", () => {
      expect(evaluateExpression("[Math]::Abs(-5)", ctx)).toBe(5);
    });

    it("[Math]::Round with precision", () => {
      expect(evaluateExpression("[Math]::Round(3.14159, 2)", ctx)).toBe(3.14);
    });

    it("[Math]::Floor", () => {
      expect(evaluateExpression("[Math]::Floor(3.7)", ctx)).toBe(3);
    });

    it("[Math]::Ceiling", () => {
      expect(evaluateExpression("[Math]::Ceiling(3.2)", ctx)).toBe(4);
    });

    it("[string]::IsNullOrEmpty with empty", () => {
      expect(evaluateExpression('[string]::IsNullOrEmpty("")', ctx)).toBe(true);
    });

    it("[string]::IsNullOrEmpty with value", () => {
      expect(evaluateExpression('[string]::IsNullOrEmpty("hello")', ctx)).toBe(
        false
      );
    });

    it("[guid]::NewGuid returns guid-like string", () => {
      const result = evaluateExpression("[guid]::NewGuid()", ctx);
      expect(typeof result).toBe("string");
      expect(String(result)).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it("[Sitecore.Data.ID]::NewID returns braced guid", () => {
      const result = evaluateExpression("[Sitecore.Data.ID]::NewID", ctx);
      expect(String(result)).toMatch(/^\{[0-9A-F-]+\}$/);
    });

    it("[DateTime]::Now returns ISO date", () => {
      const result = evaluateExpression("[DateTime]::Now", ctx);
      expect(typeof result).toBe("string");
      expect(String(result)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("[System.IO.Path]::GetExtension", () => {
      expect(
        evaluateExpression('[System.IO.Path]::GetExtension("file.txt")', ctx)
      ).toBe(".txt");
    });

    it("[System.IO.Path]::GetFileNameWithoutExtension", () => {
      expect(
        evaluateExpression(
          '[System.IO.Path]::GetFileNameWithoutExtension("file.txt")',
          ctx
        )
      ).toBe("file");
    });

    it("[System.IO.Path]::Combine", () => {
      expect(
        evaluateExpression(
          '[System.IO.Path]::Combine("path", "to", "file")',
          ctx
        )
      ).toBe("path/to/file");
    });
  });
});

describe("interpolateString", () => {
  it("handles plain string", () => {
    expect(interpolateString("hello", ctx)).toBe("hello");
  });

  it("interpolates variable", () => {
    ctx.setVar("x", "world");
    expect(interpolateString("hello $x", ctx)).toBe("hello world");
  });

  it("interpolates $_ in item context", () => {
    const item = makeItem("Test");
    expect(interpolateString("Name: $_.Name", ctx, item)).toBe("Name: Test");
  });
});
