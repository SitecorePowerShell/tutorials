const { executeScript } = await import("../src/engine/executor.ts");
const { ScriptContext } = await import("../src/engine/scriptContext.ts");

const tasks = [
  {
    label: "Task 1 — read CSV",
    script: `Import-Csv -Path "$SitecoreDataFolder\\contributors.csv"`,
  },
  {
    label: "Task 2 — filter",
    script: `Import-Csv -Path "$SitecoreDataFolder\\contributors.csv" | Where-Object { $_.Country -eq "US" }`,
  },
  {
    label: "Task 3 — print emails",
    script: `Import-Csv -Path "$SitecoreDataFolder\\contributors.csv" | ForEach-Object { Write-Host $_.Email }`,
  },
  {
    label: "Task 4 — bulk create",
    script: `Import-Csv -Path "$SitecoreDataFolder\\contributors.csv" | ForEach-Object {
        New-Item -Path "master:\\content\\Home\\About\\Contributors" -Name $_.Name -ItemType "Sample/Sample Item"
    }`,
  },
  {
    label: "Task 5 — verify",
    script: `Get-ChildItem -Path "master:\\content\\Home\\About\\Contributors"`,
  },
];

for (const t of tasks) {
  const ctx = new ScriptContext();
  const result = executeScript(t.script, ctx);
  console.log(`\n========== ${t.label} ==========`);
  console.log("ERROR:", result.error);
  console.log("OUTPUT (first 500 chars):", result.output.slice(0, 500));
}
