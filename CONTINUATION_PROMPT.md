# SPE Interactive Tutorial — Continuation Prompt

Use this prompt when continuing development in a new conversation. Paste it as your first message along with any files you want to modify.

---

## Project Context

I'm building a browser-based interactive tutorial for Sitecore PowerShell Extensions (SPE) that will be embedded into doc.sitecorepowershell.com (a GitBook site). The tutorial teaches SPE commands against a simulated Sitecore content tree — no real instance required.

I am an application architect. I primarily code in C# and PowerShell, programming since 2006. I prefer direct technical details and clear examples.

## Current State

The prototype is a single React JSX file (`spe-tutorial-prototype.jsx`, ~2950 lines) containing:

### Simulation Engine
- **Virtual Content Tree** — JSON structure simulating Sitecore items with `_id`, `_template` (short name), `_templateFullName`, `_version`, `_fields` (including `__Updated`, `__Created`, `"__Updated by"` with space)
- **Path Resolution** — handles `master:\content\Home`, `master:\sitecore\content\Home`, `.`, `master:` (CWD), `master:\` (root), forward/back slashes
- **CWD** is `master:\content\Home` (matching real SPE ISE default). `master:` (bare) resolves to CWD, `master:\` resolves to sitecore root node.
- **ScriptContext class** — holds variable scope, output accumulator, dialog request queue across multi-line scripts
- **executeScript** — multi-line executor with line continuation joining (pipes, backticks, unbalanced braces)
- **executeLine** — handles `$var = <expr>` assignment, `foreach($x in $y) { ... }` loops, and regular commands
- **executeCommandWithContext** — pipeline executor with `$variable` expansion, `$var.Property` access, string interpolation in double-quoted strings, `$var | pipeline` support

### Supported Commands
| Command | Aliases | Mutable |
|---------|---------|---------|
| Get-Item | gi | No |
| Get-ChildItem | gci, dir, ls | No |
| Where-Object | where, ? | No |
| ForEach-Object | foreach, % | No |
| Select-Object | select | No |
| Sort-Object | sort | No |
| Group-Object | group | No |
| Measure-Object | measure | No |
| Get-Member | gm | No |
| Get-Location | gl, pwd | No |
| Show-ListView | — | No |
| Write-Host | Write-Output | No |
| Show-Alert | — | No |
| Read-Variable | — | No |
| Close-Window | — | No |
| New-Item | — | Yes - adds to tree |
| Remove-Item | — | Yes - deletes from tree |
| Move-Item | mi, mv | Yes - relocates in tree |
| Copy-Item | ci, cp, cpi | Yes - deep clones with new ID |
| Rename-Item | ren, rni | Yes - re-keys in parent |

### Output Formatting (verified against real SPE)
- **Default table** from `Sitecore_Views.ps1xml`: fixed widths `Name(32) Children(8) Language(8) Version(7) Id(38) TemplateName(32)`
- **Select-Object** uses dynamic column widths. `Id`/`ID` always displays as `ID` header.
- **TemplateName** is short form: `"Sample Item"` not `"Sample/Sample Item"`. `Template.FullName` has the path.
- **Dates** use Sitecore compact format: `20251201T180830Z`
- **IDs** use braces + uppercase: `{110D559F-DEA5-42EA-9C1C-8A5DF7E70EF9}`

### Validation Engine
- **Structural validation** — compares resolved node IDs (not string paths), checks cmdlet names, switches
- **Pipeline validation** — collects ALL cmdlets across entire multi-line script (handles `$var = Get-ChildItem` on one line and `$var | Sort-Object | Show-ListView` on another). Strips `$variable |` prefixes. Uses `executeScript` for output constraint checks.
- Multi-line scripts are pre-processed: comments stripped, continuation lines joined, assignments separated from pipelines

### UI
- **Sidebar** — lesson navigation with progress tracking, collapsible
- **Lesson panel** — markdown renderer, task cards with hints, task dots, "Next" button
- **REPL mode** — single-line input with `PS master:\content\Home>` prompt, Enter to execute, up/down arrow history
- **ISE mode** — resizable split pane (drag handle between editor and output), multi-line textarea with line numbers, Ctrl+Enter to run, starter code support, code persists after execution
- **Content Tree panel** — toggleable right panel showing the virtual tree
- **Mode indicator** — "Console" or "ISE" badge in top bar
- Editor/output/console all clear when switching lessons or tasks. ISE loads `starterCode` if defined.

### Lessons (11 lessons, 23 tasks, 4 modules)
1. **Foundations** (REPL): Welcome, Navigating, Pipeline, Filtering, Provider Paths
2. **ISE Scripting** (ISE): ISE Intro/Show-ListView, Variables, ForEach-Object
3. **Real-World Patterns** (ISE): Content Audit Reports
4. **Item Manipulation** (ISE): Creating/Removing, Moving/Copying/Renaming

### Key Design Decisions
- `getItemProperty()` — centralized, case-insensitive property resolver used by ALL pipeline stages (Where-Object, Sort-Object, Select-Object, formatPropertyTable)
- `parseCommand()` returns `{ raw: string[], parsed: object[] }` — raw strings needed for Where-Object/ForEach-Object brace block extraction
- Pipeline splitter respects brace depth (no splitting on `|` inside `{ }`)
- Validation resolves paths to node IDs rather than string comparison — any valid path format that reaches the correct item passes

## Calibration Sources
The simulation was calibrated against real SPE output from a vanilla Sitecore instance using two diagnostic scripts:
- **Part 1**: Default formatting, dot paths, bare drive behavior, path formats, property access, pipeline output, error messages, template names, ID formatting, provider drives
- **Part 2**: Select-Object dynamic widths, `Id` vs `ID` header casing, `HasChildren` vs `Children` header, Format-Table, dot notation vs indexer, editing context errors (`EditingNotAllowedException`), New-Item duplicate behavior, Group-Object, `-Query` parameter

Also calibrated against:
- `Sitecore_Views.ps1xml` — exact column widths and property-to-label mappings
- `Sitecore_Types.ps1xml` — DefaultDisplayPropertySet, ScriptProperty definitions for system fields
- Real script examples from `github.com/SitecorePowerShell/Console/tree/master/unicorn/SPE/Scripts`
- Show-ListView documentation and community examples

## What Needs to Be Done Next (Priority Order)

### Immediate
1. **Split into proper project structure** — separate the monolith JSX into modules (engine/, validation/, components/, lessons/)
2. **Migrate lessons to external YAML** — lesson definitions as `.yaml` files that contributors can edit without touching React
3. **Add TypeScript** — the engine is complex enough to benefit from types

### Phase 2 Engine
4. **BeginEdit/EndEdit simulation** — error on direct field set: `"Item '/sitecore/content/Home' is not in editing mode. Item ID: {guid}"` with `EditingNotAllowedException`. IsEditing state: `False → BeginEdit() → True → EndEdit()/CancelEdit() → False`
5. **Read-Variable dialog** — render as an interactive form in the output pane (text inputs, dropdowns)
6. **Calculated property support** — `@{Label="Name"; Expression={$_.DisplayName}}` hashtable syntax for Show-ListView columns
7. **-Query parameter** — Sitecore query syntax on Get-Item

### Phase 3 Content
8. **More lessons from real SPE scripts** — Broken Links report, Unused Media Items, Security Audit patterns
9. **Packaging lesson** — Export-Package, New-Package workflow
10. **Performance lesson** — Find-Item vs Get-ChildItem -Recurse, fast: queries

### Phase 4 Distribution
11. **GitHub Pages deployment** via Actions
12. **GitBook iframe embed** integration
13. **localStorage progress persistence**
14. **Community contribution workflow** documentation

## Important Behaviors to Preserve
- `master:` (no backslash) = CWD (Home). `master:\` (with backslash) = sitecore root. This was verified against real SPE.
- TemplateName is always short form. Template.FullName has the path.
- New-Item with duplicate names succeeds (Sitecore allows this).
- Where-Object/ForEach-Object extract brace blocks from raw command strings, not parsed tokens.
- Select-Object `-First`/`-Last` work on the array before formatting.
- The virtual tree is mutable — New-Item/Remove-Item/Move-Item/Copy-Item/Rename-Item actually modify it.

---

**Attach the current `spe-tutorial-prototype.jsx` and `ARCHITECTURE.md` when starting a new session.**
