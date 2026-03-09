import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createSpeClient, type SpeClient } from "../speClient";
import { parseTextTable, extractErrorPattern } from "../outputNormalizer";
import { executeScript } from "../../engine/executor";

// Load .env.test if it exists (no external dependency)
const envPath = resolve(process.cwd(), ".env.test");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex < 0) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const SPE_URL = process.env.SPE_URL;
const SPE_USERNAME = process.env.SPE_USERNAME || "sitecore\\admin";
const SPE_PASSWORD = process.env.SPE_PASSWORD;
const SPE_SHARED_SECRET = process.env.SPE_SHARED_SECRET;
const SPE_SCRIPT_ENDPOINT =
  process.env.SPE_SCRIPT_ENDPOINT || "/-/script/script/";

describe.skipIf(!SPE_URL)("SPE Remoting Integration Tests", () => {
  let client: SpeClient;

  beforeAll(() => {
    client = createSpeClient({
      url: SPE_URL!,
      username: SPE_USERNAME,
      password: SPE_PASSWORD,
      sharedSecret: SPE_SHARED_SECRET,
      scriptEndpoint: SPE_SCRIPT_ENDPOINT,
    });
  });

  describe("Get-Item property structure", () => {
    it("should return matching column headers for Get-Item", async () => {
      const script = 'Get-Item -Path "master:\\content"';

      const simResult = executeScript(script);
      const simStructure = parseTextTable(simResult.output);

      const speResult = await client.executeScript(
        `${script} | Format-Table | Out-String`
      );
      const speStructure = parseTextTable(speResult.output);

      expect(simStructure.columnHeaders).toEqual(
        expect.arrayContaining(["Name", "TemplateName"])
      );
      expect(speStructure.columnHeaders).toEqual(
        expect.arrayContaining(["Name", "TemplateName"])
      );

      // Both should have data
      expect(simStructure.hasData).toBe(true);
      expect(speStructure.hasData).toBe(true);
    });
  });

  describe("Get-ChildItem table format", () => {
    it("should return same column headers", async () => {
      const script = 'Get-ChildItem -Path "master:\\content"';

      const simResult = executeScript(script);
      const simStructure = parseTextTable(simResult.output);

      const speResult = await client.executeScript(
        `${script} | Format-Table | Out-String`
      );
      const speStructure = parseTextTable(speResult.output);

      expect(simStructure.columnHeaders).toEqual(
        expect.arrayContaining(["Name", "Children", "TemplateName"])
      );
      expect(speStructure.columnHeaders).toEqual(
        expect.arrayContaining(["Name", "TemplateName"])
      );

      expect(simStructure.hasData).toBe(true);
      expect(speStructure.hasData).toBe(true);
    });
  });

  describe("Get-ChildItem -Recurse", () => {
    it("should return more items than non-recursive", async () => {
      const basePath = "master:\\content";

      const speFlat = await client.executeScript(
        `(Get-ChildItem -Path "${basePath}").Count`
      );
      const speRecurse = await client.executeScript(
        `(Get-ChildItem -Path "${basePath}" -Recurse).Count`
      );

      const flatCount = parseInt(speFlat.output.trim(), 10);
      const recurseCount = parseInt(speRecurse.output.trim(), 10);

      // Recurse should return at least as many items
      expect(recurseCount).toBeGreaterThanOrEqual(flatCount);
    });
  });

  describe("Where-Object filtering", () => {
    it("should preserve output structure after filtering", async () => {
      const script =
        'Get-ChildItem -Path "master:\\content" | Where-Object { $_.TemplateName -ne "Folder" }';

      const simResult = executeScript(script);
      const simStructure = parseTextTable(simResult.output);

      const speResult = await client.executeScript(
        `${script} | Format-Table | Out-String`
      );
      const speStructure = parseTextTable(speResult.output);

      // Both should maintain table structure with headers
      if (simStructure.hasData) {
        expect(simStructure.columnHeaders.length).toBeGreaterThan(0);
      }
      if (speStructure.hasData) {
        expect(speStructure.columnHeaders.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Select-Object projection", () => {
    it("should show only selected columns", async () => {
      // Note: simulator parser requires no space after comma in property list
      const simScript =
        'Get-ChildItem -Path "master:\\content" | Select-Object -Property Name,TemplateName';
      const speScript =
        'Get-ChildItem -Path "master:\\content" | Select-Object -Property Name, TemplateName';

      const simResult = executeScript(simScript);
      const simStructure = parseTextTable(simResult.output);

      const speResult = await client.executeScript(
        `${speScript} | Format-Table | Out-String`
      );
      const speStructure = parseTextTable(speResult.output);

      expect(simStructure.columnHeaders).toEqual(["Name", "TemplateName"]);
      expect(speStructure.columnHeaders).toEqual(
        expect.arrayContaining(["Name", "TemplateName"])
      );
      // SPE should not have extra default columns
      expect(speStructure.columnHeaders.length).toBeLessThanOrEqual(3);
    });
  });

  describe("Sort-Object ordering", () => {
    it("should preserve output structure after sorting", async () => {
      const script =
        'Get-ChildItem -Path "master:\\content" | Sort-Object -Property Name';

      const simResult = executeScript(script);
      const simStructure = parseTextTable(simResult.output);

      const speResult = await client.executeScript(
        `${script} | Format-Table | Out-String`
      );
      const speStructure = parseTextTable(speResult.output);

      if (simStructure.hasData) {
        expect(simStructure.columnHeaders).toEqual(
          expect.arrayContaining(["Name"])
        );
      }
      if (speStructure.hasData) {
        expect(speStructure.columnHeaders).toEqual(
          expect.arrayContaining(["Name"])
        );
      }
    });
  });

  describe("Measure-Object counting", () => {
    it("should both output Count with numeric value", async () => {
      const script =
        'Get-ChildItem -Path "master:\\content" | Measure-Object';

      const simResult = executeScript(script);
      const speResult = await client.executeScript(
        `${script} | Out-String`
      );

      // Both should contain "Count" with a number
      expect(simResult.output).toMatch(/Count\s*:\s*\d+/);
      expect(speResult.output).toMatch(/Count\s*:\s*\d+/);
    });
  });

  describe("Group-Object grouping", () => {
    it("should both produce grouped output structure", async () => {
      const script =
        'Get-ChildItem -Path "master:\\content" | Group-Object -Property TemplateName';

      const simResult = executeScript(script);
      const simStructure = parseTextTable(simResult.output);

      const speResult = await client.executeScript(
        `${script} | Format-Table | Out-String`
      );
      const speStructure = parseTextTable(speResult.output);

      // Both should have Count and Name columns
      expect(simStructure.columnHeaders).toEqual(
        expect.arrayContaining(["Count", "Name"])
      );
      if (speStructure.hasData) {
        expect(speStructure.columnHeaders).toEqual(
          expect.arrayContaining(["Count", "Name"])
        );
      }
    });
  });

  describe("Get-Member output", () => {
    it("should return TypeName and property list", async () => {
      const script = 'Get-Item -Path "master:\\content" | Get-Member';

      const simResult = executeScript(script);
      const speResult = await client.executeScript(
        `${script} | Out-String`
      );

      // Both should contain TypeName
      expect(simResult.output).toContain("TypeName:");
      expect(speResult.output).toContain("TypeName:");

      // Both should have Name/MemberType/Definition columns
      const simStructure = parseTextTable(simResult.output);
      const speStructure = parseTextTable(speResult.output);

      expect(simStructure.columnHeaders).toEqual(
        expect.arrayContaining(["Name", "MemberType", "Definition"])
      );
      expect(speStructure.columnHeaders).toEqual(
        expect.arrayContaining(["Name", "MemberType", "Definition"])
      );
    });
  });

  describe("Get-Location", () => {
    it("should both return a path string", async () => {
      const simResult = executeScript("Get-Location");
      const speResult = await client.executeScript(
        "Get-Location | Out-String"
      );

      // Both should contain "Path" or a drive:path pattern
      const hasPath =
        simResult.output.includes("Path") ||
        simResult.output.includes("master:");
      expect(hasPath).toBe(true);

      const speHasPath =
        speResult.output.includes("Path") ||
        speResult.output.includes("master:");
      expect(speHasPath).toBe(true);
    });
  });

  describe("Invalid path error", () => {
    it("should both produce an error for nonexistent path", async () => {
      const script =
        'Get-Item -Path "master:\\nonexistent\\does\\not\\exist"';

      const simResult = executeScript(script);
      const speResult = await client.executeScript(script);

      // Simulator produces an error
      expect(simResult.error).toBeTruthy();
      const simErrorPattern = extractErrorPattern(simResult.error!);
      expect(simErrorPattern).toBe("Get-Item:PathNotFound");

      // SPE should also produce an error or empty/error output
      const speHasError =
        speResult.error !== null ||
        speResult.output.includes("Cannot find") ||
        speResult.output.includes("Exception") ||
        speResult.output.includes("ERROR") ||
        speResult.output.trim() === "";
      expect(speHasError).toBe(true);
    });
  });
});
