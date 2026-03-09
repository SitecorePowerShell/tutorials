import { describe, it, expect } from "vitest";
import { callStaticMethod, castType } from "../dotnetTypes";

describe("callStaticMethod", () => {
  describe("[DateTime]", () => {
    it("::Now returns ISO date string", () => {
      const result = callStaticMethod("DateTime", "Now", []);
      expect(typeof result).toBe("string");
      expect(String(result)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("::UtcNow returns ISO date string", () => {
      const result = callStaticMethod("DateTime", "UtcNow", []);
      expect(String(result)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("::Parse parses date string", () => {
      const result = callStaticMethod("DateTime", "Parse", ["2024-01-15"]);
      expect(String(result)).toContain("2024-01-15");
    });
  });

  describe("[Math]", () => {
    it("::Round(3.14159, 2) returns 3.14", () => {
      expect(callStaticMethod("Math", "Round", ["3.14159", "2"])).toBe(3.14);
    });

    it("::Floor(3.7) returns 3", () => {
      expect(callStaticMethod("Math", "Floor", ["3.7"])).toBe(3);
    });

    it("::Ceiling(3.2) returns 4", () => {
      expect(callStaticMethod("Math", "Ceiling", ["3.2"])).toBe(4);
    });

    it("::Abs(-5) returns 5", () => {
      expect(callStaticMethod("Math", "Abs", ["-5"])).toBe(5);
    });
  });

  describe("[string]", () => {
    it("::IsNullOrEmpty with empty string returns true", () => {
      expect(callStaticMethod("string", "IsNullOrEmpty", [""])).toBe(true);
    });

    it("::IsNullOrEmpty with value returns false", () => {
      expect(callStaticMethod("string", "IsNullOrEmpty", ["hello"])).toBe(
        false
      );
    });

    it("::Join joins with separator", () => {
      expect(callStaticMethod("string", "Join", [", ", "a", "b", "c"])).toBe(
        "a, b, c"
      );
    });

    it("::Format replaces placeholders", () => {
      expect(
        callStaticMethod("string", "Format", ["{0} has {1}", "Item", "3"])
      ).toBe("Item has 3");
    });
  });

  describe("[guid]", () => {
    it("::NewGuid returns guid-format string", () => {
      const result = callStaticMethod("guid", "NewGuid", []);
      expect(String(result)).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe("[System.IO.Path]", () => {
    it("::GetExtension returns extension", () => {
      expect(
        callStaticMethod("System.IO.Path", "GetExtension", ["file.txt"])
      ).toBe(".txt");
    });

    it("::GetFileNameWithoutExtension strips extension", () => {
      expect(
        callStaticMethod("System.IO.Path", "GetFileNameWithoutExtension", [
          "document.pdf",
        ])
      ).toBe("document");
    });

    it("::Combine joins paths", () => {
      expect(
        callStaticMethod("System.IO.Path", "Combine", ["path", "to", "file"])
      ).toBe("path/to/file");
    });
  });

  describe("[Sitecore.Data.ID]", () => {
    it("::NewID returns braced uppercase GUID", () => {
      const result = callStaticMethod("Sitecore.Data.ID", "NewID", []);
      expect(String(result)).toMatch(/^\{[0-9A-F-]+\}$/);
    });

    it("::Parse wraps in braces and uppercases", () => {
      expect(
        callStaticMethod("Sitecore.Data.ID", "Parse", [
          "abc12345-1234-1234-1234-123456789abc",
        ])
      ).toBe("{ABC12345-1234-1234-1234-123456789ABC}");
    });
  });
});

describe("castType", () => {
  it("casts to int", () => {
    expect(castType("int", "42")).toBe(42);
    expect(castType("int", "3.7")).toBe(3);
  });

  it("casts to string", () => {
    expect(castType("string", 42)).toBe("42");
  });

  it("casts to bool", () => {
    expect(castType("bool", "true")).toBe(true);
    expect(castType("bool", "false")).toBe(false);
    expect(castType("bool", "")).toBe(false);
    expect(castType("bool", "1")).toBe(true);
  });

  it("casts to double", () => {
    expect(castType("double", "3.14")).toBe(3.14);
  });

  it("returns value for unknown type", () => {
    expect(castType("CustomType", "hello")).toBe("hello");
  });
});
