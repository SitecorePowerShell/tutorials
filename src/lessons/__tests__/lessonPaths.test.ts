import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolvePath } from "../../engine/pathResolver";
import { VIRTUAL_TREE } from "../../engine/virtualTree";

/**
 * Audit every `master:\…` path that appears in any lesson YAML and verify
 * it either:
 *   1. Resolves against the seed virtual tree, OR
 *   2. Is on the allowlist of paths that are intentionally absent (created
 *      earlier in the same script via New-Item, or deliberately invalid for
 *      try/catch teaching).
 *
 * Adding a new lesson with a broken path will fail this test.
 */

// Paths that are intentionally not in the seed tree.
const ALLOWED_TRANSIENT = new Set([
  // Lesson 10 creates "Contact Us", then the next task removes it.
  "master:\\content\\Home\\About\\Contact Us",
  // Lesson 18 creates FAQ in step 1 of a multi-line script, then references it.
  "master:\\content\\Home\\FAQ",
]);

const ALLOWED_NEGATIVE = new Set([
  // Lesson 26 deliberately uses non-existent paths to teach try/catch.
  "master:\\nonexistent\\path",
  "master:\\\\content\\\\Missing", // markdown-escaped form inside the description
  "master:\\content\\Missing",
]);

const quotedRe = /["'](master:\\[^"']+)["']/g;
const bareRe = /(?<!["'\\])master:(\\[^"'\s|`$()<>]+)/g;

function pathExists(psPath: string): boolean {
  if (ALLOWED_TRANSIENT.has(psPath) || ALLOWED_NEGATIVE.has(psPath)) return true;
  const stripped = psPath.replace(/^master:/, "").replace(/\\/g, "/");
  return resolvePath("/sitecore" + stripped, VIRTUAL_TREE) !== null;
}

describe("Lesson paths", () => {
  it("every master:\\… path in lesson YAMLs either resolves or is on the allowlist", () => {
    const lessonsDir = "src/lessons";
    const yamls = readdirSync(lessonsDir).filter((f) => f.endsWith(".yaml"));
    const failures: { file: string; line: number; path: string }[] = [];

    for (const file of yamls) {
      const content = readFileSync(join(lessonsDir, file), "utf8");
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const seen = new Set<number>();
        quotedRe.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = quotedRe.exec(line)) !== null) {
          seen.add(m.index);
          if (!pathExists(m[1])) {
            failures.push({ file, line: i + 1, path: m[1] });
          }
        }
        bareRe.lastIndex = 0;
        while ((m = bareRe.exec(line)) !== null) {
          const offset = m.index;
          if ([...seen].some((s) => Math.abs(s - offset) <= 1)) continue;
          const psPath = `master:${m[1]}`;
          if (!pathExists(psPath)) {
            failures.push({ file, line: i + 1, path: psPath });
          }
        }
      }
    }

    if (failures.length > 0) {
      const msg = failures
        .map((f) => `  ${f.file}:${f.line} → ${f.path}`)
        .join("\n");
      throw new Error(
        `${failures.length} lesson path(s) don't resolve against the virtual tree and aren't on the intentional-allowlist:\n${msg}`
      );
    }
    expect(failures).toEqual([]);
  });
});
