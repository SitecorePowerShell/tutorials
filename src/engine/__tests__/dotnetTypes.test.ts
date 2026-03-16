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

  describe("[TimeSpan]", () => {
    it("::FromDays(1) returns 1.00:00:00", () => {
      expect(callStaticMethod("TimeSpan", "FromDays", ["1"])).toBe("1.00:00:00");
    });

    it("::FromDays(1.5) returns 1.12:00:00", () => {
      expect(callStaticMethod("TimeSpan", "FromDays", ["1.5"])).toBe("1.12:00:00");
    });

    it("::FromHours(2) returns 02:00:00", () => {
      expect(callStaticMethod("TimeSpan", "FromHours", ["2"])).toBe("02:00:00");
    });

    it("::FromHours(25) returns 1.01:00:00", () => {
      expect(callStaticMethod("TimeSpan", "FromHours", ["25"])).toBe("1.01:00:00");
    });

    it("::FromMinutes(90) returns 01:30:00", () => {
      expect(callStaticMethod("TimeSpan", "FromMinutes", ["90"])).toBe("01:30:00");
    });

    it("::FromSeconds(45) returns 00:00:45", () => {
      expect(callStaticMethod("TimeSpan", "FromSeconds", ["45"])).toBe("00:00:45");
    });

    it("::Parse passes through string", () => {
      expect(callStaticMethod("TimeSpan", "Parse", ["1.02:30:00"])).toBe("1.02:30:00");
    });
  });

  describe("[Regex]", () => {
    it("::IsMatch returns true on match", () => {
      expect(callStaticMethod("Regex", "IsMatch", ["hello123", "\\d+"])).toBe(true);
    });

    it("::IsMatch returns false on no match", () => {
      expect(callStaticMethod("Regex", "IsMatch", ["hello", "\\d+"])).toBe(false);
    });

    it("::Match returns first match", () => {
      expect(callStaticMethod("Regex", "Match", ["abc123def", "\\d+"])).toBe("123");
    });

    it("::Match returns empty on no match", () => {
      expect(callStaticMethod("Regex", "Match", ["abc", "\\d+"])).toBe("");
    });

    it("::Replace replaces matches", () => {
      expect(callStaticMethod("Regex", "Replace", ["a1b2c3", "\\d", "X"])).toBe("aXbXcX");
    });

    it("::Split splits by pattern", () => {
      expect(callStaticMethod("Regex", "Split", ["one,two;three", "[,;]"])).toEqual(["one", "two", "three"]);
    });
  });

  describe("[Array]", () => {
    it("::Reverse reverses items", () => {
      expect(callStaticMethod("Array", "Reverse", ["a", "b", "c"])).toEqual(["c", "b", "a"]);
    });

    it("::Sort sorts items", () => {
      expect(callStaticMethod("Array", "Sort", ["c", "a", "b"])).toEqual(["a", "b", "c"]);
    });
  });

  describe("[Convert]", () => {
    it("::ToInt32 converts to integer", () => {
      expect(callStaticMethod("Convert", "ToInt32", ["42"])).toBe(42);
    });

    it("::ToString converts to string", () => {
      expect(callStaticMethod("Convert", "ToString", ["42"])).toBe("42");
    });

    it("::ToBase64String encodes to base64", () => {
      expect(callStaticMethod("Convert", "ToBase64String", ["Hello"])).toBe("SGVsbG8=");
    });

    it("::FromBase64String decodes from base64", () => {
      expect(callStaticMethod("Convert", "FromBase64String", ["SGVsbG8="])).toBe("Hello");
    });
  });

  describe("[Environment]", () => {
    it("::NewLine returns newline", () => {
      expect(callStaticMethod("Environment", "NewLine", [])).toBe("\n");
    });

    it("::MachineName returns server name", () => {
      expect(callStaticMethod("Environment", "MachineName", [])).toBe("SC-SERVER-01");
    });
  });

  describe("[Sitecore.Data.Database]", () => {
    it("::GetDatabase returns database name", () => {
      expect(callStaticMethod("Sitecore.Data.Database", "GetDatabase", ["web"])).toBe("web");
    });

    it("Factory alias also works", () => {
      expect(callStaticMethod("Sitecore.Configuration.Factory", "GetDatabase", ["master"])).toBe("master");
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

  it("casts to array (wraps non-array)", () => {
    expect(castType("array", "hello")).toEqual(["hello"]);
  });

  it("casts to array (passes through array)", () => {
    expect(castType("array", ["a", "b"])).toEqual(["a", "b"]);
  });

  it("casts to datetime", () => {
    const result = castType("datetime", "2024-01-15");
    expect(String(result)).toContain("2024-01-15");
  });

  it("casts to regex (returns string)", () => {
    expect(castType("regex", "\\d+")).toBe("\\d+");
  });

  it("returns value for unknown type", () => {
    expect(castType("CustomType", "hello")).toBe("hello");
  });
});
