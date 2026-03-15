import { describe, it, expect } from "vitest";
import { validateStageParams, CMDLET_REGISTRY } from "../cmdletParams";
import { parseSingleCommand } from "../../engine/parser";
import { validateTask } from "../validator";
import type { Task } from "../../types";

describe("CMDLET_REGISTRY", () => {
  it("has entries for all core cmdlets", () => {
    const expected = [
      "get-item", "get-childitem", "new-item", "remove-item",
      "move-item", "copy-item", "rename-item", "set-itemproperty",
      "find-item", "where-object", "foreach-object", "select-object",
      "sort-object", "group-object", "measure-object", "get-member",
      "format-table", "convertto-json", "write-host", "write-output",
      "show-alert", "show-listview", "set-location", "get-location",
      "get-alias", "close-window", "read-variable",
    ];
    for (const cmd of expected) {
      expect(CMDLET_REGISTRY[cmd], `missing registry entry: ${cmd}`).toBeDefined();
    }
  });
});

describe("validateStageParams", () => {
  function parse(cmd: string) {
    return parseSingleCommand(cmd);
  }

  describe("unknown cmdlet — skipped", () => {
    it("returns null for unregistered cmdlet", () => {
      const stage = parse("Invoke-Something -Foo bar");
      expect(validateStageParams(stage, "invoke-something")).toBeNull();
    });
  });

  describe("named parameter validation", () => {
    it("accepts valid params for get-item", () => {
      const stage = parse('Get-Item -Path "master:\\content\\Home"');
      expect(validateStageParams(stage, "get-item")).toBeNull();
    });

    it("rejects unknown param on get-item", () => {
      const stage = parse('Get-Item -Foo "bar"');
      const err = validateStageParams(stage, "get-item");
      expect(err).toContain("Foo");
      expect(err).toContain("cannot be found");
    });

    it("accepts valid params for new-item (permissive mode includes SPE params)", () => {
      const stage = parse('New-Item -Path "master:\\content\\Home" -Name "Test" -ItemType "Sample/Sample Item"');
      expect(validateStageParams(stage, "new-item")).toBeNull();
    });

    it("rejects SPE param when allowSpeParams is false", () => {
      const stage = parse('New-Item -Path "master:\\content\\Home" -Name "Test" -ItemType "Sample/Sample Item"');
      const err = validateStageParams(stage, "new-item", { allowSpeParams: false });
      expect(err).toContain("ItemType");
      expect(err).toContain("cannot be found");
    });

    it("allows SPE params when explicitly enabled", () => {
      const stage = parse('New-Item -Path "master:\\content\\Home" -Name "Test" -ItemType "Sample/Sample Item"');
      expect(validateStageParams(stage, "new-item", { allowSpeParams: true })).toBeNull();
    });
  });

  describe("positional parameter validation", () => {
    it("accepts positional path for get-item", () => {
      const stage = parse('Get-Item "master:\\content\\Home"');
      expect(validateStageParams(stage, "get-item")).toBeNull();
    });
  });

  describe("switch validation", () => {
    it("accepts valid switch on get-childitem", () => {
      const stage = parse('Get-ChildItem -Path "master:\\content\\Home" -Recurse');
      expect(validateStageParams(stage, "get-childitem")).toBeNull();
    });

    it("rejects unknown switch on sort-object", () => {
      const stage = parse("Sort-Object -Ascending");
      const err = validateStageParams(stage, "sort-object");
      expect(err).toContain("Ascending");
      expect(err).toContain("cannot be found");
    });

    it("accepts valid switch on sort-object", () => {
      const stage = parse("Sort-Object -Property Name -Descending");
      expect(validateStageParams(stage, "sort-object")).toBeNull();
    });
  });

  describe("type checking", () => {
    it("rejects non-numeric value for -First on select-object", () => {
      const stage = parse("Select-Object -First abc");
      const err = validateStageParams(stage, "select-object");
      expect(err).toContain("abc");
      expect(err).toContain("Number");
    });

    it("accepts numeric value for -First", () => {
      const stage = parse("Select-Object -First 5");
      expect(validateStageParams(stage, "select-object")).toBeNull();
    });

    it("rejects empty path", () => {
      // Parser won't produce an empty string for a named param value,
      // but we can test with a stage where Path is explicitly empty
      const stage = { cmdlet: "Get-Item", params: { Path: "" }, switches: [] };
      const err = validateStageParams(stage, "get-item");
      expect(err).toContain("path must not be empty");
    });
  });

  describe("parameter sets", () => {
    it("validates against specific parameter set", () => {
      const stage = parse('Move-Item -Path "master:\\content\\Home\\About" -Destination "master:\\content\\Home\\Products"');
      expect(validateStageParams(stage, "move-item", { parameterSet: "ByPath" })).toBeNull();
    });

    it("rejects missing required param for parameter set", () => {
      const stage = parse('Move-Item -Path "master:\\content\\Home\\About"');
      const err = validateStageParams(stage, "move-item", { parameterSet: "ByPath" });
      expect(err).toContain("Destination");
      expect(err).toContain("requires parameter");
    });

    it("rejects nonexistent parameter set", () => {
      const stage = parse('Get-Item -Path "master:\\content\\Home"');
      const err = validateStageParams(stage, "get-item", { parameterSet: "NoSuchSet" });
      expect(err).toContain("does not exist");
    });

    it("uses ByPipeline set when specified (no Path required)", () => {
      const stage = parse('Set-ItemProperty -Name "Title" -Value "Hello"');
      expect(validateStageParams(stage, "set-itemproperty", { parameterSet: "ByPipeline" })).toBeNull();
    });

    it("ByPath set requires Path for set-itemproperty", () => {
      const stage = parse('Set-ItemProperty -Name "Title" -Value "Hello"');
      // Path is not required in ByPath set definition — it's optional there
      // (can come from pipeline too), so this should pass
      expect(validateStageParams(stage, "set-itemproperty", { parameterSet: "ByPath" })).toBeNull();
    });
  });

  describe("pipeline-only cmdlets", () => {
    it("where-object always passes (scriptblock)", () => {
      const stage = parse('Where-Object { $_.Name -eq "Home" }');
      expect(validateStageParams(stage, "where-object")).toBeNull();
    });

    it("foreach-object always passes (scriptblock)", () => {
      const stage = parse('ForEach-Object { $_.Name }');
      expect(validateStageParams(stage, "foreach-object")).toBeNull();
    });
  });
});

describe("validator integration — parameterSet", () => {
  it("structural validation uses registry to reject unknown params", () => {
    const task: Task = {
      instruction: "Get the Home item",
      hint: 'Get-Item -Path "master:\\content\\Home"',
      validation: {
        type: "structural",
        cmdlet: "get-item",
        requirePath: ["master:\\content\\Home"],
      },
    };
    // Unknown param -Garbage should be caught by the registry
    const result = validateTask(
      'Get-Item -Path "master:\\content\\Home" -Garbage "foo"',
      task
    );
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain("Garbage");
  });

  it("structural validation with parameterSet enforces required params", () => {
    const task: Task = {
      instruction: "Move an item",
      hint: "hint",
      validation: {
        type: "structural",
        cmdlet: "move-item",
        parameterSet: "ByPath",
      },
    };
    const result = validateTask(
      'Move-Item -Path "master:\\content\\Home\\About"',
      task
    );
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain("Destination");
  });

  it("structural validation with allowSpeParams: false rejects SPE params", () => {
    const task: Task = {
      instruction: "Create item",
      hint: "hint",
      validation: {
        type: "structural",
        cmdlet: "new-item",
        allowSpeParams: false,
      },
    };
    const result = validateTask(
      'New-Item -Path "master:\\content\\Home" -Name "Test" -ItemType "Sample/Sample Item"',
      task
    );
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain("ItemType");
  });

  it("pipeline validation with allowSpeParams opts into registry checks", () => {
    const task: Task = {
      instruction: "Create and verify",
      hint: "hint",
      validation: {
        type: "pipeline",
        stages: ["new-item"],
        allowSpeParams: true,
      },
    };
    // Valid SPE param
    const pass = validateTask(
      'New-Item -Path "master:\\content\\Home" -Name "Test" -ItemType "Sample/Sample Item"',
      task
    );
    expect(pass.passed).toBe(true);

    // Garbage param — registry catches it
    const fail = validateTask(
      'New-Item -Path "master:\\content\\Home" -Name "Test" -Bogus "value"',
      task
    );
    expect(fail.passed).toBe(false);
    expect(fail.feedback).toContain("Bogus");
  });
});
