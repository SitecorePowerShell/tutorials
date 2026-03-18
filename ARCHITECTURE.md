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
│  │ Execution Provider (pluggable)                         │ │
│  │                                                        │ │
│  │  ┌─────────────────┐    ┌────────────────────────────┐ │ │
│  │  │ LocalProvider    │    │ SpeRemotingProvider        │ │ │
│  │  │ (default)        │    │ (optional live connection) │ │ │
│  │  │                  │    │                            │ │ │
│  │  │ ┌──────────────┐ │    │ ┌────────────────────────┐ │ │ │
│  │  │ │ Simulation   │ │    │ │ SPE Remoting API       │ │ │ │
│  │  │ │ Engine       │ │    │ │ (JWT / Basic auth)     │ │ │ │
│  │  │ │ + Virtual    │ │    │ │ /-/script/v2           │ │ │ │
│  │  │ │   Tree       │ │    │ └────────────────────────┘ │ │ │
│  │  │ └──────────────┘ │    └────────────────────────────┘ │ │
│  │  └─────────────────┘                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Validation Engine (always local)                       │ │
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
| `Where-Object` | `where`, `?` | Compound filters: `-and`, `-or`, `-not`, parenthesized groups. Operators: `-eq`, `-ne`, `-like`, `-notlike`, `-match`, `-notmatch`, `-gt`, `-lt`, `-ge`, `-le` |
| `ForEach-Object` | `foreach`, `%` | `$_` context, expression bodies (string operators), command bodies |
| `Select-Object` | `select` | `-Property`, `-First`, `-Last` |
| `Sort-Object` | `sort` | `-Property`, `-Descending` |
| `Group-Object` | `group` | `-Property`, grouped count table |
| `Measure-Object` | `measure` | Count output |
| `Get-Member` | `gm` | Full property list matching real SPE |
| `Get-Location` | `gl`, `pwd` | Returns CWD |
| `Show-ListView` | — | Report table with `-Property`, `-Title` |
| `Write-Host` | `Write-Output` | Simple string output |
| `New-Item` | — | Creates item in virtual tree, `-Path`, `-Name`, `-ItemType` |
| `Remove-Item` | — | Removes item by path or pipeline input |
| `Move-Item` | — | Moves item to new parent, `-Path`, `-Destination` |
| `Copy-Item` | — | Deep copies item with new ID |
| `Rename-Item` | — | Renames item, preserves node reference |
| `Set-ItemProperty` | — | Sets field value, `-Path`, `-Name`, `-Value`, pipeline input |
| `Format-Table` | `ft` | `-Property` (specific columns) or default table |
| `ConvertTo-Json` | — | Serializes pipeline items to JSON |
| `Show-Alert` | — | Dialog simulation |
| `Read-Variable` | — | Parameter dialog placeholder |

**Planned commands (not yet implemented):**

| Command | Priority | Complexity |
|---------|----------|------------|
| `Find-Item` | Low | Medium — index-based query simulation |
| `Export-Csv` | Low | Low — format output as CSV |

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

### 6. Expression Evaluator (`evaluateExpression`)

Centralized evaluator for PowerShell expressions. Returns resolved values (strings, numbers, booleans, arrays, objects).

**Handles:**

| Pattern | Example | Result |
|---------|---------|--------|
| String literals | `"hello"`, `'world'` | String value |
| Number literals | `42`, `3.14` | Number value |
| Boolean/null | `$true`, `$false`, `$null` | Boolean/null |
| Variable reference | `$var` | Variable value |
| Property access | `$var.Name`, `$_.ItemPath` | Resolved property |
| Indexer access | `$var["Title"]`, `$_['field']` | Field value |
| String interpolation | `"Hello $name $(1+2)"` | Interpolated string |
| `-replace` | `"text" -replace "old", "new"` | Regex replacement |
| `-split` | `"a,b,c" -split ","` | Array |
| `-join` | `$arr -join ", "` | Joined string |
| `-f` format | `"{0} items" -f $count` | Formatted string |
| `+` concat | `"Hello" + " World"` | Concatenated string/sum |
| Hashtable | `@{ Key = "Val" }` | Object |
| Array | `@("a", "b", "c")` | Array |
| Type cast | `[int]"42"` | Coerced value |
| Static call | `[Math]::Round(3.14, 2)` | Method result |

**Simulated .NET types (`dotnetTypes.ts`):**

| Type | Members |
|------|---------|
| `[DateTime]` | `::Now`, `::UtcNow`, `::Parse(str)` |
| `[Math]` | `::Round(n,d)`, `::Floor(n)`, `::Ceiling(n)`, `::Abs(n)` |
| `[string]` | `::IsNullOrEmpty(s)`, `::Join(sep, arr)`, `::Format(fmt, args)` |
| `[guid]` | `::NewGuid()` |
| `[System.IO.Path]` | `::GetExtension(s)`, `::GetFileNameWithoutExtension(s)`, `::Combine(a,b)` |
| `[Sitecore.Data.ID]` | `::NewID`, `::Parse(str)` |
| `[int]`, `[string]`, `[bool]` | Type casting: `[int]"42"` → `42` |

### 7. Filter Evaluator (`evaluateFilter`)

Boolean evaluator for Where-Object conditions and `if`/`else`. Reuses `evaluateExpression` for value resolution.

**Handles:**

- **Comparison operators:** `-eq`, `-ne`, `-like`, `-notlike`, `-match`, `-notmatch`, `-gt`, `-lt`, `-ge`, `-le`
- **Logical operators:** `-and`, `-or` (with correct precedence: `-and` binds tighter)
- **Negation:** `-not`, `!`
- **Parenthesized grouping:** `($_.Name -like "A*" -or $_.Name -like "B*") -and $_.HasChildren`
- **Truthy/falsy evaluation:** Non-empty strings, non-zero numbers, non-empty arrays are truthy

### 8. Output Formatting

**Default table** (from `Sitecore_Views.ps1xml`):

Fixed column widths: `Name(32) Children(8) Language(8) Version(7) Id(38) TemplateName(32)`

Note: Column header `Children` maps to property `HasChildren`. Header `Id` maps to property `ID`.

**Select-Object table:** Dynamic column widths (standard PowerShell behavior). `Id` always displays as `ID` in header.

**Show-ListView:** Report-style output with title, column headers, and item count.

### 9. Validation Engine (`validateTask`)

Two validation types:

**Structural:** Checks cmdlet name, resolved path (by node ID, not string match), and switches.

**Pipeline:** Checks pipeline stage sequence (alias-aware), optionally validates output content (`outputContains`, `outputNotContains`).

Multi-line scripts are normalized (comments stripped, lines joined) before validation.

### 10. Dual-Mode Editor

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

4. For expression evaluation (string operators, .NET calls, etc.), use `evaluateExpression()` from `src/engine/expressionEval.ts`. For boolean conditions, use `evaluateFilter()` from `src/engine/filterEval.ts`.

5. Add tests in `src/engine/__tests__/executor.test.ts` or `executorAdvanced.test.ts`.

6. Add to the supported commands table in this document.

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
- [x] **Vitest** test suites — 229 tests across 10 suites
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

### Phase 2.5 — Advanced Engine Capabilities (Complete)
- [x] **Expression evaluator** — centralized evaluator for string operators, interpolation, .NET calls
- [x] **Compound filters** — `-and`, `-or`, `-not`, parenthesized grouping in Where-Object
- [x] **`-notlike`, `-notmatch`** — negated pattern operators
- [x] **String operators** — `-replace`, `-split`, `-join`, `-f` format, `+` concatenation
- [x] **`$()` subexpression** expansion in double-quoted strings
- [x] **`if`/`else` conditionals** — condition evaluation reuses filter evaluator
- [x] **Set-ItemProperty** — field modification by path or pipeline, completes CRUD story
- [x] **Indexer access** — `$item["FieldName"]` for field retrieval
- [x] **Simulated .NET types** — `[DateTime]`, `[Math]`, `[string]`, `[guid]`, `[System.IO.Path]`, `[Sitecore.Data.ID]`, type casting
- [x] **Hashtable & array literals** — `@{ Key = "Value" }`, `@("a", "b")`
- [x] **Format-Table / ConvertTo-Json** — additional output formatters
- [x] **Single-element array auto-unwrap** — matches PowerShell behavior for `$item = Get-Item ...`
- [x] **Bare `$var` expansion** — variables expanded in command arguments

### Phase 3 — Real-World Lessons (Next)
- [ ] Advanced tutorial lessons using new engine capabilities
- [ ] Content audit reports (based on SPE repo scripts)
- [ ] Reporting with calculated properties (`@{Label=...; Expression=...}`)
- [ ] Bulk operations with ForEach-Object + string operators
- [ ] Conditional logic patterns with if/else
- [ ] Security: Get-ItemAcl patterns

### Phase 4 — Polish & Distribution
- [x] Migrate lessons to external YAML files
- [ ] GitHub Actions CI/CD to Cloudflare Pages
- [ ] GitBook embed integration
- [ ] localStorage progress persistence
- [ ] Community contribution workflow

### Phase 5 — Execution Provider & Live Connection (In Progress)

An `ExecutionProvider` abstraction decouples _where_ commands run from the UI, enabling the
tutorial to optionally connect to a real Sitecore instance via SPE Remoting.

**Completed:**
- [x] `ExecutionProvider` interface (`src/providers/types.ts`) — `executeScript()`, `executeCommand()`, `getTree()`, `getCwd()`, `reset()`
- [x] `LocalProvider` — wraps existing engine, zero behavior change for tutorials
- [x] `SpeRemotingProvider` — sends scripts to real Sitecore via `speClient.ts` (`/-/script/script/`, JWT + Basic auth)
- [x] `ConnectionManager` UI component — connect/disconnect toggle, URL, auth fields (JWT/Basic), CORS proxy toggle
- [x] `App.tsx` refactored to delegate execution through active provider (async)
- [x] Task validation always runs locally (simulation engine) regardless of active provider
- [x] `speClient.ts` migrated from Node `require("crypto")` to Web Crypto API
- [x] Scripts wrapped in `& { <script> } | Out-String` for ps1xml formatting via `rawOutput=true`
- [x] Local CORS proxy (`tools/cors-proxy.ts`) — Bun server that forwards requests and adds CORS headers; works with internal/VPN instances

**Future work:**

| Item | Priority | Notes |
|------|----------|-------|
| **Connection test/ping** | High | Validate credentials before switching provider; show connection errors inline |
| **Loading spinner** | High | Visual indicator during remote execution (async latency) |
| **Live tree browsing** | Medium | Fetch real content tree from SPE Remoting (`Get-ChildItem` on connect); lazy-load children on expand |
| **GraphQL provider** | Medium | Read-only tree browsing via Sitecore GraphQL (XM Cloud, XP 10+); complements SPE Remoting |
| **Dual output** | Medium | Show both simulation and remote output side-by-side so students can compare |
| **REST API provider** | Low | Item CRUD via Sitecore ItemService REST API (no script execution) |
| **SitecoreAI / XM Cloud provider** | Low | Cloud API integration for XM Cloud instances |
| **Connection profiles** | Low | Save multiple named connections in localStorage (not just the last one) |
| ~~**CORS proxy**~~ | ~~Low~~ | Done — `tools/cors-proxy.ts` with ConnectionManager toggle |

**Extraction roadmap** (if components are packaged for reuse beyond the tutorial):

| Phase | Scope |
|-------|-------|
| **Monorepo split** | Extract `@spe/engine`, `@spe/providers`, `@spe/ui`, keep `@spe/tutorial` as consumer |
| **Web Components** | Wrap console/ISE/builder as `<spe-console>`, `<spe-ise>`, `<spe-builder>` Custom Elements |
| **Standalone app** | Separate entry point without tutorial chrome — connection manager, tabs, script save/load |

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
│   │   ├── expressionEval.ts     # Centralized expression evaluator
│   │   ├── filterEval.ts         # Boolean filter evaluator (compound conditions)
│   │   ├── dotnetTypes.ts        # Simulated .NET static types + type casting
│   │   ├── executor.ts           # executeScript, executeCommand, all cmdlet handlers
│   │   ├── formatter.ts          # formatItemTable, formatPropertyTable
│   │   ├── index.ts              # Re-exports
│   │   └── __tests__/            # Vitest test suites (229 tests)
│   │       ├── parser.test.ts
│   │       ├── pathResolver.test.ts
│   │       ├── properties.test.ts
│   │       ├── executor.test.ts
│   │       ├── executorAdvanced.test.ts
│   │       ├── expressionEval.test.ts
│   │       ├── filterEval.test.ts
│   │       ├── dotnetTypes.test.ts
│   │       └── formatter.test.ts
│   ├── providers/
│   │   ├── types.ts              # ExecutionProvider interface, ConnectionConfig
│   │   ├── LocalProvider.ts      # Wraps engine — default for tutorials
│   │   ├── SpeRemotingProvider.ts# Remote execution via SPE Remoting API
│   │   ├── index.ts              # Barrel exports
│   │   └── __tests__/
│   │       └── LocalProvider.test.ts
│   ├── integration/
│   │   ├── speClient.ts          # SPE Remoting HTTP client (JWT + Basic auth)
│   │   └── outputNormalizer.ts   # Output structure analysis (text/JSON)
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
│   │   ├── ConnectionManager.tsx  # Connect to Sitecore UI (URL, auth, toggle)
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
- **Testing:** Vitest (229 tests across 10 suites)
- **Lesson Format:** YAML (loaded via js-yaml + Vite ?raw imports)
- **Deployment Target:** Cloudflare Pages (static build)
