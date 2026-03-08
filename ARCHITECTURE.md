# SPE Interactive Tutorial — Architecture & Contributor Guide

## Overview

A browser-based interactive tutorial for Sitecore PowerShell Extensions (SPE), designed to embed into doc.sitecorepowershell.com via GitBook iframe. Users learn SPE commands against a simulated content tree — no real Sitecore instance required.

**Tech Stack:** React + TypeScript, Bun + Vite, Vitest, YAML lessons
**Host:** Cloudflare Pages
**Integration:** Embedded in GitBook via iframe blocks

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  React Application                                          │
│                                                             │
│  ┌──────────────┐  ┌──────────────────────────────────────┐ │
│  │ Lesson Panel  │  │  Editor Area (mode-aware)            │ │
│  │              │  │                                      │ │
│  │ • Markdown   │  │  REPL Mode:     ISE Mode:            │ │
│  │   renderer   │  │  ┌──────────┐   ┌──────────────────┐ │ │
│  │ • Task cards │  │  │ Console  │   │ Script Editor    │ │ │
│  │ • Hints      │  │  │ output   │   │ (textarea+lines) │ │ │
│  │ • Progress   │  │  │          │   ├──────────────────┤ │ │
│  │              │  │  │ [input]  │   │ Output pane      │ │ │
│  │              │  │  └──────────┘   └──────────────────┘ │ │
│  └──────────────┘  └──────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Simulation Engine                                      │ │
│  │                                                        │ │
│  │  ┌─────────────┐  ┌────────────┐  ┌────────────────┐  │ │
│  │  │ Command     │  │ Virtual    │  │ Validation     │  │ │
│  │  │ Parser &    │  │ Content    │  │ Engine         │  │ │
│  │  │ Executor    │  │ Tree       │  │                │  │ │
│  │  └─────────────┘  └────────────┘  └────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Virtual Content Tree (`VIRTUAL_TREE`)

A JSON structure simulating a Sitecore content tree. Each node has:

```javascript
{
  _id: "{GUID}",              // Sitecore item ID (braces, uppercase)
  _template: "Sample Item",   // TemplateName (short form)
  _templateFullName: "Sample/Sample Item",  // Template.FullName
  _version: 1,                // Version number
  _fields: {                  // Field values
    Title: "Welcome",
    __Updated: "20250315T103000Z",    // Sitecore compact date format
    "__Updated by": "sitecore\\admin", // Note: space in field name
    __Created: "20240601T080000Z",
  },
  _children: { ... }          // Child nodes (same structure)
}
```

**Key behaviors verified against real SPE:**

| Behavior | Detail |
|----------|--------|
| `TemplateName` | Short form: `"Sample Item"` not `"Sample/Sample Item"` |
| `Template.FullName` | Full path: `"Sample/Sample Item"` |
| Date format | Sitecore compact: `20251201T180830Z` |
| ID format | Braces + uppercase: `{110D559F-DEA5-42EA-9C1C-8A5DF7E70EF9}` |
| `HasChildren` | Boolean, displays as `True`/`False` |
| Field names | Case-sensitive, can contain spaces: `"__Updated by"` |
| Duplicate names | Allowed (Sitecore permits sibling items with same name) |

### 2. Path Resolution (`resolvePath`)

Converts user input paths to tree node references. Verified behaviors:

| Input | Resolves To |
|-------|-------------|
| `master:\content\Home` | Home node |
| `master:\sitecore\content\Home` | Home node (sitecore prefix optional) |
| `master:/content/Home` | Home node (forward slashes work) |
| `.` | Current working directory (Home by default) |
| `master:` | Current working directory (NOT root) |
| `master:\` | Sitecore root node |
| `Get-Item` (no path) | Current working directory |

**CWD** is `master:\content\Home` — matching the real SPE ISE default.

### 3. Command Parser (`parseCommand`)

Splits input into pipeline stages, respecting:
- Quoted strings (single and double)
- Brace blocks `{ }` (not split on `|` inside braces)
- Returns both raw strings and parsed tokens per stage

Each parsed stage contains:
```javascript
{
  cmdlet: "Get-ChildItem",
  params: { Path: "master:\\content\\Home", _positional: [...] },
  switches: ["Recurse"]
}
```

### 4. Command Executor (`executeCommand`)

Pipeline execution engine. Processes stages left-to-right, passing `pipelineData` between stages.

**Currently supported commands:**

| Command | Aliases | Notes |
|---------|---------|-------|
| `Get-Item` | `gi` | Path resolution, default to CWD |
| `Get-ChildItem` | `gci`, `dir`, `ls` | `-Recurse` switch, pipeline input |
| `Where-Object` | `where`, `?` | `-eq`, `-ne`, `-like`, `-match` operators |
| `Select-Object` | `select` | `-Property`, `-First`, `-Last` |
| `Sort-Object` | `sort` | `-Property`, `-Descending` |
| `Measure-Object` | `measure` | Count output |
| `Get-Member` | `gm` | Full property list matching real SPE |
| `Get-Location` | `gl`, `pwd` | Returns CWD |
| `Show-ListView` | — | Report table with `-Property`, `-Title` |
| `Write-Host` | `Write-Output` | Simple string output |

**Planned commands (Phase 2 — not yet implemented):**

| Command | Priority | Complexity |
|---------|----------|------------|
| `Find-Item` | Low | Medium — index-based query simulation |
| `Export-Csv` | Low | Low — format output as CSV |
| `Set-ItemProperty` | Medium | Medium — needs BeginEdit/EndEdit |
| `BeginEdit`/`EndEdit` | Medium | Medium — editing context state |

### 5. Property Resolution (`getItemProperty`)

Centralized, case-insensitive property resolver used by all pipeline stages:

```javascript
function getItemProperty(item, prop) {
  // Built-in properties (case-insensitive)
  // Name, ID, TemplateName, ItemPath, Version,
  // HasChildren, Database, DisplayName, Language, TemplateID
  
  // Then checks _fields (case-sensitive first, case-insensitive fallback)
}
```

### 6. Output Formatting

**Default table** (from `Sitecore_Views.ps1xml`):

Fixed column widths: `Name(32) Children(8) Language(8) Version(7) Id(38) TemplateName(32)`

Note: Column header `Children` maps to property `HasChildren`. Header `Id` maps to property `ID`.

**Select-Object table:** Dynamic column widths (standard PowerShell behavior). `Id` always displays as `ID` in header.

**Show-ListView:** Report-style output with title, column headers, and item count.

### 7. Validation Engine (`validateTask`)

Two validation types:

**Structural:** Checks cmdlet name, resolved path (by node ID, not string match), and switches.

**Pipeline:** Checks pipeline stage sequence (alias-aware), optionally validates output content (`outputContains`, `outputNotContains`).

Multi-line scripts are normalized (comments stripped, lines joined) before validation.

### 8. Dual-Mode Editor

Driven by `mode` field on lesson definition:

**REPL Mode** (`mode: undefined` or `mode: "repl"`):
- Single-line input with `PS master:\content\Home>` prompt
- Enter to execute
- Up/down arrow command history

**ISE Mode** (`mode: "ise"`):
- Multi-line textarea with line numbers
- Ctrl+Enter to execute
- Code persists after execution (iterate in place)
- Supports `starterCode` field for pre-populated editor content

---

## Lesson Schema

Lessons are defined as JavaScript objects (planned: external YAML files).

```yaml
# Lesson definition
id: "get-item-basics"        # Unique ID
module: "Foundations"          # Section in sidebar
order: 1                      # Sort order within module
title: "Your First Command"   # Display title
difficulty: "beginner"        # beginner | intermediate | advanced
mode: "repl"                  # "repl" (default) or "ise"

description: |                # Markdown content for lesson panel
  Learn to use `Get-Item`...

tasks:                        # Array of tasks within the lesson
  - instruction: |            # What the user should do (Markdown)
      Use `Get-Item` to retrieve the Home item.
    
    hint: |                   # Shown when user clicks "Show Hint"
      Get-Item -Path "master:\content\Home"
    
    starterCode: |            # ISE mode only — pre-populated in editor
      # Get the Home item
      Get-Item -Path "master:\content\Home"
    
    validation:               # How to check if the task is complete
      type: "structural"      # "structural" or "pipeline"
      cmdlet: "get-item"
      requirePath:            # Paths that should resolve to correct node
        - "master:\\content\\Home"
      requireSwitch: "Recurse"  # Optional: required switch
    
    # Pipeline validation alternative:
    validation:
      type: "pipeline"
      stages:                 # Required pipeline stage sequence
        - "get-childitem"
        - "where-object"
        - "show-listview"
      outputContains: "item(s) displayed"    # Optional output check
      outputNotContains: "Sample Item"       # Optional exclusion check
    
    successMessage: |         # Shown on task completion
      You retrieved your first item!
```

---

## Contributing Lessons

### Quick Start

1. Fork the repo
2. Create a new YAML file in `src/lessons/` and register it in `src/lessons/loader.ts`
3. Test locally — `bun run dev` and verify your lesson works
4. Run `bun run test` to ensure existing tests still pass
5. Submit PR

### Guidelines

- **One concept per task.** Don't ask users to learn pipelines AND filtering in the same task.
- **Progressive difficulty.** Each task should build on the previous one.
- **Constructive hints.** Hints should guide, not give away the answer.
- **Test your validation.** Try multiple correct approaches — the validator should accept aliases, path variations, etc.
- **Match real SPE.** If you're unsure how something behaves, run it against a real instance first.

### Adding New Commands to the Engine

To add a new simulated command:

1. Add a handler in `executeCommandWithContext()` in `src/engine/executor.ts`:
```typescript
} else if (cmdLower === "your-command") {
  // Access pipelineData for pipeline input
  // Access stage.params for named parameters
  // Access stage.switches for switch parameters
  // Return { output: "...", error: null }
}
```

2. Add the command to the `ALIASES` table in `src/validation/validator.ts` if it has aliases.

3. Use `getItemProperty()` from `src/engine/properties.ts` for any property access — don't inline your own resolution.

4. Add tests in `src/engine/__tests__/executor.test.ts`.

5. Add to the supported commands table in this document.

---

## Implementation Roadmap

### Phase 1 — Foundation (Complete)
- [x] Virtual content tree with realistic data
- [x] Command parser with pipeline support
- [x] Get-Item, Get-ChildItem, Where-Object, Select-Object, Sort-Object, Measure-Object, Get-Member
- [x] Output formatting matching real SPE (verified against Sitecore_Views.ps1xml)
- [x] Structural and pipeline validation
- [x] REPL mode with command history
- [x] ISE mode with multi-line editor
- [x] Show-ListView simulation
- [x] 6 lessons / 13 tasks
- [x] Content tree panel

### Phase 1.5 — Modular TypeScript Split (Complete)
- [x] **Split monolith** into engine/, validation/, components/, lessons/ modules
- [x] **TypeScript** with strict mode throughout
- [x] **Bun + Vite** build toolchain
- [x] **Vitest** test suites — 86 tests across parser, pathResolver, properties, executor, formatter, validator
- [x] **YAML lessons** — 11 lesson files loaded via js-yaml
- [x] **createVirtualTree()** — deep clone factory for isolated test state

### Phase 2 — Engine Expansion (Complete)
- [x] **Variable assignment** (`$items = Get-ChildItem ...`)
- [x] **ForEach-Object** with `$_` context
- [x] **Write-Host** / **Write-Output**
- [x] **New-Item / Remove-Item** (mutable virtual tree)
- [x] **Move-Item / Copy-Item / Rename-Item**
- [x] **Group-Object**
- [x] **Show-Alert** dialog simulation
- [x] **Read-Variable** placeholder simulation
- [x] **Close-Window** (no-op)

### Phase 2.5 — Engine Expansion (Next)
- [ ] **BeginEdit / EndEdit** simulation with error on direct set
- [ ] **Read-Variable** interactive form in output pane
- [ ] **Calculated property support** (`@{Label=...; Expression=...}`)
- [ ] **-Query parameter** — Sitecore query syntax on Get-Item

### Phase 3 — Real-World Lessons
- [ ] Content audit reports (based on SPE repo scripts)
- [ ] Reporting with calculated properties (`@{Label=...; Expression=...}`)
- [ ] Bulk operations with ForEach-Object
- [ ] Security: Get-ItemAcl patterns
- [ ] Packaging basics

### Phase 4 — Polish & Distribution
- [x] Migrate lessons to external YAML files
- [ ] GitHub Actions CI/CD to Cloudflare Pages
- [ ] GitBook embed integration
- [ ] localStorage progress persistence
- [ ] Community contribution workflow

---

## Reference Data Sources

The simulation is calibrated against real SPE output captured from a vanilla Sitecore instance:

| Source | Used For |
|--------|----------|
| `Sitecore_Views.ps1xml` | Default table column widths and headers |
| `Sitecore_Types.ps1xml` | DefaultDisplayPropertySet, ScriptProperty definitions |
| SPE diagnostic script (Part 1) | Path resolution, Get-Location, error formats, ID/date formatting |
| SPE diagnostic script (Part 2) | Select-Object formatting, editing context errors, pipeline behaviors |
| `unicorn/SPE/Scripts/` | Real-world script examples for lesson content |
| `doc.sitecorepowershell.com` | Command documentation and API reference |

---

## File Structure

```
tutorials/
├── src/
│   ├── types/
│   │   └── index.ts              # SitecoreNode, SitecoreItem, Lesson, Task, etc.
│   ├── engine/
│   │   ├── virtualTree.ts        # VIRTUAL_TREE data + createVirtualTree()
│   │   ├── pathResolver.ts       # resolvePath, getChildren, getAllDescendants
│   │   ├── parser.ts             # parseCommand, parseSingleCommand
│   │   ├── properties.ts         # getItemProperty (centralized resolver)
│   │   ├── scriptContext.ts      # ScriptContext class (variable scope)
│   │   ├── executor.ts           # executeScript, executeCommand, all cmdlet handlers
│   │   ├── formatter.ts          # formatItemTable, formatPropertyTable
│   │   ├── index.ts              # Re-exports
│   │   └── __tests__/            # Vitest test suites (86 tests)
│   │       ├── parser.test.ts
│   │       ├── pathResolver.test.ts
│   │       ├── properties.test.ts
│   │       ├── executor.test.ts
│   │       └── formatter.test.ts
│   ├── validation/
│   │   ├── validator.ts          # validateTask (structural + pipeline)
│   │   └── __tests__/
│   │       └── validator.test.ts
│   ├── components/
│   │   ├── Sidebar.tsx           # Lesson navigation sidebar
│   │   ├── LessonPanel.tsx       # Lesson content, task cards, hints
│   │   ├── ReplEditor.tsx        # REPL mode console
│   │   ├── IseEditor.tsx         # ISE mode editor with drag resize
│   │   ├── OutputPane.tsx        # Shared output rendering
│   │   ├── TreePanel.tsx         # Content tree viewer
│   │   ├── MarkdownLite.tsx      # Simple markdown renderer
│   │   └── HighlightedCode.tsx   # PowerShell syntax highlighter
│   ├── lessons/
│   │   ├── loader.ts             # YAML import + parse
│   │   ├── 01-welcome.yaml
│   │   ├── 02-navigating.yaml
│   │   ├── 03-pipeline.yaml
│   │   ├── 04-filtering.yaml
│   │   ├── 05-provider-paths.yaml
│   │   ├── 06-ise-intro.yaml
│   │   ├── 07-variables.yaml
│   │   ├── 08-foreach.yaml
│   │   ├── 09-content-reports.yaml
│   │   ├── 10-creating-items.yaml
│   │   └── 11-moving-copying.yaml
│   ├── App.tsx                   # Main SPETutorial component
│   ├── main.tsx                  # Entry point (ReactDOM.createRoot)
│   └── vite-env.d.ts            # Vite + YAML type declarations
├── index.html
├── package.json                  # Bun + Vite + React + Vitest
├── tsconfig.json
├── vite.config.ts
├── spe-tutorial-prototype.jsx    # Original monolith (reference)
├── ARCHITECTURE.md
├── CONTINUATION_PROMPT.md
└── reference/                    # SPE calibration data
    ├── spe-simulation-reference.ps1
    ├── spe-simulation-reference-part2.ps1
    ├── Sitecore_Views.ps1xml
    └── Sitecore_Types.ps1xml
```

### Tech Stack
- **Runtime/Package Manager:** Bun
- **Bundler:** Vite with @vitejs/plugin-react
- **Language:** TypeScript (strict mode)
- **Testing:** Vitest (86 tests across 6 suites)
- **Lesson Format:** YAML (loaded via js-yaml + Vite ?raw imports)
- **Deployment Target:** Cloudflare Pages (static build)
