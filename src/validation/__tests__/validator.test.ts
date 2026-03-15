import { describe, it, expect } from "vitest";
import { validateTask } from "../validator";
import type { Task } from "../../types";

describe("validateTask — structural", () => {
  const structuralTask: Task = {
    instruction: "Get the Home item",
    hint: 'Get-Item -Path "master:\\content\\Home"',
    validation: {
      type: "structural",
      cmdlet: "get-item",
      requirePath: ["master:\\content\\Home"],
    },
    successMessage: "You got it!",
  };

  it("passes with correct cmdlet and path", () => {
    const result = validateTask(
      'Get-Item -Path "master:\\content\\Home"',
      structuralTask
    );
    expect(result.passed).toBe(true);
  });

  it("passes with forward slashes", () => {
    const result = validateTask(
      'Get-Item -Path "master:/content/Home"',
      structuralTask
    );
    expect(result.passed).toBe(true);
  });

  it("passes with sitecore prefix", () => {
    const result = validateTask(
      'Get-Item -Path "master:\\sitecore\\content\\Home"',
      structuralTask
    );
    expect(result.passed).toBe(true);
  });

  it("fails with wrong cmdlet", () => {
    const result = validateTask(
      'Get-ChildItem -Path "master:\\content\\Home"',
      structuralTask
    );
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain("Get-Item");
  });

  it("fails with wrong path", () => {
    const result = validateTask(
      'Get-Item -Path "master:\\content\\Home\\About"',
      structuralTask
    );
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain("wrong item");
  });

  const switchTask: Task = {
    instruction: "Use -Recurse",
    hint: "hint",
    validation: {
      type: "structural",
      cmdlet: "get-childitem",
      requireSwitches: ["recurse"],
    },
    successMessage: "Done!",
  };

  it("passes with required switch", () => {
    const result = validateTask(
      'Get-ChildItem -Path "master:\\content\\Home" -Recurse',
      switchTask
    );
    expect(result.passed).toBe(true);
  });

  it("fails without required switch", () => {
    const result = validateTask(
      'Get-ChildItem -Path "master:\\content\\Home"',
      switchTask
    );
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain("-Recurse");
  });

  it("checks multiple required switches", () => {
    const multiSwitchTask: Task = {
      instruction: "Use -Recurse and -Force",
      hint: "hint",
      validation: {
        type: "structural",
        cmdlet: "get-childitem",
        requireSwitches: ["recurse", "force"],
      },
      successMessage: "Done!",
    };
    const pass = validateTask(
      'Get-ChildItem -Path "master:\\content\\Home" -Recurse -Force',
      multiSwitchTask
    );
    expect(pass.passed).toBe(true);

    const fail = validateTask(
      'Get-ChildItem -Path "master:\\content\\Home" -Recurse',
      multiSwitchTask
    );
    expect(fail.passed).toBe(false);
    expect(fail.feedback).toContain("-Force");
  });

  it("checks required params on structural validation", () => {
    const paramTask: Task = {
      instruction: "Create a new item",
      hint: "hint",
      validation: {
        type: "structural",
        cmdlet: "new-item",
        requireParams: { Name: "Contact Us", ItemType: "Sample/Sample Item" },
      },
      successMessage: "Done!",
    };
    const pass = validateTask(
      'New-Item -Path "master:\\content\\Home" -Name "Contact Us" -ItemType "Sample/Sample Item"',
      paramTask
    );
    expect(pass.passed).toBe(true);

    const missingParam = validateTask(
      'New-Item -Path "master:\\content\\Home" -Name "Contact Us"',
      paramTask
    );
    expect(missingParam.passed).toBe(false);
    expect(missingParam.feedback).toContain("-ItemType");

    const wrongValue = validateTask(
      'New-Item -Path "master:\\content\\Home" -Name "Wrong Name" -ItemType "Sample/Sample Item"',
      paramTask
    );
    expect(wrongValue.passed).toBe(false);
    expect(wrongValue.feedback).toContain("-Name");
  });
});

describe("validateTask — pipeline requireParams", () => {
  it("checks required params across pipeline stages", () => {
    const task: Task = {
      instruction: "Set a field",
      hint: "hint",
      validation: {
        type: "pipeline",
        stages: ["set-itemproperty"],
        requireParams: { Name: "Title", Value: "About Our Company" },
      },
      successMessage: "Done!",
    };
    const pass = validateTask(
      'Set-ItemProperty -Path "master:\\content\\Home\\About" -Name "Title" -Value "About Our Company"',
      task
    );
    expect(pass.passed).toBe(true);

    const fail = validateTask(
      'Set-ItemProperty -Path "master:\\content\\Home\\About" -Name "Title" -Value "Wrong"',
      task
    );
    expect(fail.passed).toBe(false);
    expect(fail.feedback).toContain("-Value");
  });

  it("finds params across multiple statements", () => {
    const task: Task = {
      instruction: "Create and verify",
      hint: "hint",
      validation: {
        type: "pipeline",
        stages: ["new-item", "get-childitem"],
        requireParams: { Name: "Contact Us" },
      },
      successMessage: "Done!",
    };
    const result = validateTask(
      'New-Item -Path "master:\\content\\Home\\About" -Name "Contact Us" -ItemType "Sample/Sample Item"\nGet-ChildItem -Path "master:\\content\\Home\\About"',
      task
    );
    expect(result.passed).toBe(true);
  });
});

describe("validateTask — pipeline", () => {
  const pipelineTask: Task = {
    instruction: "Build a pipeline",
    hint: "hint",
    validation: {
      type: "pipeline",
      stages: ["get-childitem", "where-object", "show-listview"],
      outputContains: "item(s) displayed",
    },
    successMessage: "Great!",
  };

  it("passes with correct pipeline", () => {
    const result = validateTask(
      'Get-ChildItem -Path "master:\\content\\Home" -Recurse | Where-Object { $_.TemplateName -eq "Sample Item" } | Show-ListView -Property Name,ItemPath',
      pipelineTask
    );
    expect(result.passed).toBe(true);
  });

  it("accepts aliases in stage recognition", () => {
    // Aliases are recognized in the pipeline stages check.
    // However, the executor only recognizes full cmdlet names + a subset of aliases
    // (where/?, foreach/%, sort, select, group, measure, gm, gi, gl, pwd).
    // gci is NOT an executor alias, so outputContains would fail when executing.
    // Test alias recognition without output constraint:
    const aliasTask: Task = {
      instruction: "Build a pipeline",
      hint: "hint",
      validation: {
        type: "pipeline",
        stages: ["get-childitem", "where-object"],
      },
      successMessage: "Great!",
    };
    const result = validateTask(
      'Get-ChildItem -Path "master:\\content\\Home" -Recurse | ? { $_.TemplateName -eq "Sample Item" }',
      aliasTask
    );
    expect(result.passed).toBe(true);
  });

  it("fails with missing stage", () => {
    const result = validateTask(
      'Get-ChildItem -Path "master:\\content\\Home" | Show-ListView',
      pipelineTask
    );
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain("Where-Object");
  });

  it("validates multi-line scripts with variables", () => {
    const multiLineTask: Task = {
      instruction: "Use variables",
      hint: "hint",
      validation: {
        type: "pipeline",
        stages: ["get-childitem", "measure-object"],
        outputContains: "Count",
      },
      successMessage: "Done!",
    };
    const result = validateTask(
      '$items = Get-ChildItem -Path "master:\\content\\Home" -Recurse\n$items | Measure-Object',
      multiLineTask
    );
    expect(result.passed).toBe(true);
  });

  it("fails when output doesn't match", () => {
    const outputTask: Task = {
      instruction: "Filter",
      hint: "hint",
      validation: {
        type: "pipeline",
        stages: ["get-childitem", "where-object"],
        outputNotContains: "Sample Item",
      },
      successMessage: "Done!",
    };
    // This filters TO Sample Item, but validation says it should NOT contain "Sample Item"
    const result = validateTask(
      'Get-ChildItem -Path "master:\\content\\Home" -Recurse | Where-Object { $_.TemplateName -eq "Sample Item" }',
      outputTask
    );
    expect(result.passed).toBe(false);
  });
});
