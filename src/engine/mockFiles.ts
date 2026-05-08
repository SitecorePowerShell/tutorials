/**
 * Tiny mock filesystem so file-reading cmdlets like Import-Csv have something
 * to read in the simulator. Keyed by path string (backslash style).
 */

/**
 * Files are stored under the resolved value of $SitecoreDataFolder so that
 * scripts written with the canonical built-in variable
 * (`Import-Csv -Path "$SitecoreDataFolder\contributors.csv"`) resolve
 * correctly after the ScriptContext expands $-references.
 */
const DATA_FOLDER = "C:\\inetpub\\wwwroot\\sitecore\\App_Data";

export const MOCK_FILES: Record<string, string> = {
  [`${DATA_FOLDER}\\contributors.csv`]: `Name,Email,Country
Alice,alice@example.com,US
Bob,bob@example.com,UK
Carol,carol@example.com,DE
Dave,dave@example.com,US`,

  [`${DATA_FOLDER}\\articles.csv`]: `Title,Author,Section,PublishDate
Welcome,Alice,Home,2024-01-15
About Us,Bob,Company,2024-02-03
Latest News,Carol,News,2024-03-20
Pricing,Dave,Company,2024-04-10`,
};

export function readMockFile(path: string): string | null {
  const cleaned = path.replace(/^["']|["']$/g, "").trim();
  // Normalize forward-slashes to backslashes for the lookup table
  const norm = cleaned.replace(/\//g, "\\");
  if (MOCK_FILES[norm]) return MOCK_FILES[norm];
  // Case-insensitive fallback
  const found = Object.keys(MOCK_FILES).find(
    (k) => k.toLowerCase() === norm.toLowerCase()
  );
  return found ? MOCK_FILES[found] : null;
}

export function listMockFiles(): string[] {
  return Object.keys(MOCK_FILES);
}

/** Minimal CSV parser — handles unquoted comma-separated values, one row per line. */
export function parseCsv(content: string): Record<string, string>[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}
