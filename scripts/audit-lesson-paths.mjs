// One-shot audit: scan every lesson YAML for `master:\...` paths and verify
// each resolves against the simulator's virtual tree. Prints unresolved paths
// with the file/line they appear on.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Pull the resolver and tree directly from src
const { resolvePath } = await import("../src/engine/pathResolver.ts");
const { VIRTUAL_TREE } = await import("../src/engine/virtualTree.ts");

const lessonsDir = "src/lessons";
const yamls = readdirSync(lessonsDir).filter((f) => f.endsWith(".yaml"));

// Two-pass match: quoted paths can contain spaces, bare paths cannot.
const quotedRe = /["'](master:\\[^"']+)["']/g;
const bareRe = /(?<!["'\\])master:(\\[^"'\s|`$()<>]+)/g;

const failures = [];
const okCount = { value: 0 };

function checkPath(psPath, file, lineNum, snippet) {
  // psPath looks like `master:\content\Home\Foo Bar`.
  // Strip the drive prefix and convert backslashes to forward slashes.
  const stripped = psPath.replace(/^master:/, "").replace(/\\/g, "/");
  const absolute = "/sitecore" + stripped;
  const resolved = resolvePath(absolute, VIRTUAL_TREE);
  if (!resolved) {
    failures.push({ file, line: lineNum, path: psPath, snippet });
  } else {
    okCount.value++;
  }
}

for (const file of yamls) {
  const content = readFileSync(join(lessonsDir, file), "utf8");
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const seen = new Set();
    quotedRe.lastIndex = 0;
    let m;
    while ((m = quotedRe.exec(line)) !== null) {
      seen.add(m.index);
      checkPath(m[1], file, i + 1, line.trim());
    }
    bareRe.lastIndex = 0;
    while ((m = bareRe.exec(line)) !== null) {
      // Skip if we already covered this offset via the quoted pass
      if ([...seen].some((s) => Math.abs(s - m.index) <= 1)) continue;
      checkPath(`master:${m[1]}`, file, i + 1, line.trim());
    }
  }
}

console.log(`✔ ${okCount.value} paths resolve against the virtual tree`);
console.log(`✘ ${failures.length} paths do NOT resolve`);
console.log();
for (const f of failures) {
  console.log(`${f.file}:${f.line}`);
  console.log(`  path: ${f.path}`);
  console.log(`  line: ${f.snippet}`);
  console.log();
}
