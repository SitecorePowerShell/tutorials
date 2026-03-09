import { describe, it, expect, beforeEach } from "vitest";
import { evaluateFilter } from "../filterEval";
import { ScriptContext } from "../scriptContext";
import type { SitecoreItem } from "../../types";

let ctx: ScriptContext;

function makeItem(
  name: string,
  template = "Sample Item",
  hasChildren = false
): SitecoreItem {
  const children: Record<string, any> = {};
  if (hasChildren) {
    children["Child1"] = {
      _id: "{CHILD}",
      _template: "Item",
      _templateFullName: "System/Item",
      _version: 1,
      _fields: {},
      _children: {},
    };
  }
  return {
    name,
    node: {
      _id: "{TEST-ID}",
      _template: template,
      _templateFullName: `Sample/${template}`,
      _version: 1,
      _fields: { Title: `${name} Title` },
      _children: children,
    },
    path: `/sitecore/content/Home/${name}`,
  };
}

beforeEach(() => {
  ctx = new ScriptContext();
});

describe("evaluateFilter", () => {
  describe("simple comparisons", () => {
    it("-eq matches case-insensitively", () => {
      const item = makeItem("About", "Folder");
      expect(
        evaluateFilter('$_.TemplateName -eq "Folder"', ctx, item)
      ).toBe(true);
      expect(
        evaluateFilter('$_.TemplateName -eq "folder"', ctx, item)
      ).toBe(true);
    });

    it("-ne returns true for non-match", () => {
      const item = makeItem("About", "Folder");
      expect(
        evaluateFilter('$_.TemplateName -ne "Page"', ctx, item)
      ).toBe(true);
      expect(
        evaluateFilter('$_.TemplateName -ne "Folder"', ctx, item)
      ).toBe(false);
    });

    it("-like with wildcard", () => {
      const item = makeItem("HomePage");
      expect(evaluateFilter('$_.Name -like "Home*"', ctx, item)).toBe(true);
      expect(evaluateFilter('$_.Name -like "*Page"', ctx, item)).toBe(true);
      expect(evaluateFilter('$_.Name -like "About*"', ctx, item)).toBe(false);
    });

    it("-notlike negates wildcard match", () => {
      const item = makeItem("HomePage");
      expect(evaluateFilter('$_.Name -notlike "About*"', ctx, item)).toBe(
        true
      );
      expect(evaluateFilter('$_.Name -notlike "Home*"', ctx, item)).toBe(
        false
      );
    });

    it("-match with regex", () => {
      const item = makeItem("Product123");
      expect(evaluateFilter('$_.Name -match "\\d+"', ctx, item)).toBe(true);
      expect(evaluateFilter('$_.Name -match "^Product"', ctx, item)).toBe(
        true
      );
    });

    it("-notmatch negates regex", () => {
      const item = makeItem("About");
      expect(evaluateFilter('$_.Name -notmatch "\\d+"', ctx, item)).toBe(true);
    });

    it("-gt with numbers", () => {
      const item = makeItem("Item");
      item.node._version = 3;
      expect(evaluateFilter("$_.Version -gt 2", ctx, item)).toBe(true);
      expect(evaluateFilter("$_.Version -gt 5", ctx, item)).toBe(false);
    });

    it("-lt with numbers", () => {
      const item = makeItem("Item");
      item.node._version = 1;
      expect(evaluateFilter("$_.Version -lt 2", ctx, item)).toBe(true);
    });
  });

  describe("compound conditions with -and", () => {
    it("both conditions true", () => {
      const item = makeItem("HomePage", "Folder", true);
      expect(
        evaluateFilter(
          '$_.TemplateName -eq "Folder" -and $_.HasChildren -eq "True"',
          ctx,
          item
        )
      ).toBe(true);
    });

    it("one condition false", () => {
      const item = makeItem("HomePage", "Folder", false);
      expect(
        evaluateFilter(
          '$_.TemplateName -eq "Folder" -and $_.HasChildren -eq "True"',
          ctx,
          item
        )
      ).toBe(false);
    });

    it("three conditions with -and", () => {
      const item = makeItem("HomePage", "Folder", true);
      expect(
        evaluateFilter(
          '$_.TemplateName -eq "Folder" -and $_.HasChildren -eq "True" -and $_.Name -like "Home*"',
          ctx,
          item
        )
      ).toBe(true);
    });
  });

  describe("compound conditions with -or", () => {
    it("one condition true", () => {
      const item = makeItem("About");
      expect(
        evaluateFilter(
          '$_.Name -eq "About" -or $_.Name -eq "Home"',
          ctx,
          item
        )
      ).toBe(true);
    });

    it("neither condition true", () => {
      const item = makeItem("Products");
      expect(
        evaluateFilter(
          '$_.Name -eq "About" -or $_.Name -eq "Home"',
          ctx,
          item
        )
      ).toBe(false);
    });
  });

  describe("mixed -and / -or", () => {
    it("-or has lower precedence than -and", () => {
      const item = makeItem("About", "Page");
      // This is: ($_.Name -eq "About" -and $_.TemplateName -eq "Page") -or ($_.Name -eq "Home")
      // = (true -and true) -or false = true
      expect(
        evaluateFilter(
          '$_.Name -eq "About" -and $_.TemplateName -eq "Page" -or $_.Name -eq "Home"',
          ctx,
          item
        )
      ).toBe(true);
    });
  });

  describe("negation with -not and !", () => {
    it("-not negates condition", () => {
      const item = makeItem("About", "Page");
      expect(
        evaluateFilter('-not ($_.TemplateName -eq "Folder")', ctx, item)
      ).toBe(true);
    });

    it("! negates condition", () => {
      const item = makeItem("About", "Page");
      expect(
        evaluateFilter('!($_.TemplateName -eq "Folder")', ctx, item)
      ).toBe(true);
    });
  });

  describe("parenthesized grouping", () => {
    it("groups with parentheses", () => {
      const item = makeItem("About", "Folder");
      // ($_.Name -like "A*" -or $_.Name -like "B*") -and $_.TemplateName -eq "Folder"
      expect(
        evaluateFilter(
          '($_.Name -like "A*" -or $_.Name -like "B*") -and $_.TemplateName -eq "Folder"',
          ctx,
          item
        )
      ).toBe(true);
    });

    it("parentheses change evaluation order", () => {
      const item = makeItem("Products", "Page");
      // Without parens: $_.Name -eq "About" -and ($_.TemplateName -eq "Page" -or $_.Name -eq "Products")
      // = false -and true = false
      expect(
        evaluateFilter(
          '$_.Name -eq "About" -and ($_.TemplateName -eq "Page" -or $_.Name -eq "Products")',
          ctx,
          item
        )
      ).toBe(false);
    });
  });

  describe("truthy/falsy evaluation", () => {
    it("non-empty string is truthy", () => {
      const item = makeItem("About");
      expect(evaluateFilter("$_.Name", ctx, item)).toBe(true);
    });

    it("$true is truthy", () => {
      expect(evaluateFilter("$true", ctx)).toBe(true);
    });

    it("$false is falsy", () => {
      expect(evaluateFilter("$false", ctx)).toBe(false);
    });

    it("$null is falsy", () => {
      expect(evaluateFilter("$null", ctx)).toBe(false);
    });
  });

  describe("with variables", () => {
    it("compares variable to literal", () => {
      ctx.setVar("status", "active");
      expect(evaluateFilter('$status -eq "active"', ctx)).toBe(true);
    });

    it("uses variable in compound condition", () => {
      ctx.setVar("count", "5");
      expect(
        evaluateFilter("$count -gt 3 -and $count -lt 10", ctx)
      ).toBe(true);
    });
  });
});
