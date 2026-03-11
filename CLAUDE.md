# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Browser-based interactive tutorial for Sitecore PowerShell Extensions (SPE). Embedded in doc.sitecorepowershell.com via iframe. Built with Bun + Vite + React 19 + TypeScript (strict). Deployed to Cloudflare Pages.

## Commands

- `bun install` — Install dependencies (always use Bun, never npm/yarn/pnpm)
- `bun run dev` — Dev server at http://localhost:5173
- `bun run build` — Type-check + production build
- `bun run test` — Run all unit tests (Vitest)
- `bun run test:watch` — Watch mode
- `bunx vitest run src/engine/__tests__/executor.test.ts` — Run a single test file
- `bunx vitest run -t "test name pattern"` — Run tests matching a name
- `bun run test:spe` — Integration tests against a real SPE instance (separate config, 30s timeout)
- `bun run deploy` — Build + deploy to Cloudflare Pages via Wrangler

## Architecture

The codebase has two independent layers: a **pure TypeScript simulation engine** (`src/engine/`) with zero React dependencies, and a **React UI** (`src/components/`). The engine is fully testable in isolation.

### Engine (`src/engine/`)

**executor.ts** — Core pipeline executor. Dispatches parsed commands to ~20 cmdlet handlers (Get-Item, Get-ChildItem, Where-Object, ForEach-Object, Select-Object, Sort-Object, etc.) via a switch/case on cmdlet name. Supports aliases (`gci`, `ls`, `dir`, `?`, `where`, `select`, etc.) through `ALIAS_MAP`. Handles multi-line scripts with `executeScript()`, including if/else, foreach loops, and variable assignments.

**virtualTree.ts** — Simulated Sitecore content tree as a deep nested object. Each node has `_id`, `_template`, `_templateFullName`, `_version`, `_fields`, `_children`. Use `createVirtualTree()` to get a deep clone for test isolation — never mutate the shared `VIRTUAL_TREE` in tests.

**expressionEval.ts** — Centralized expression evaluator handling: literals, variables (`$_`, `$varName`), operators (`-eq`, `-like`, `-match`, `-replace`, `-split`, `-join`, `-f`), .NET static calls (`[DateTime]::Now`, `[Math]::Round()`), type casts, and property chaining.

**filterEval.ts** — Boolean filter evaluator for Where-Object conditions. Supports compound expressions with `-and`, `-or`, `-not`. Delegates to `evaluateExpression()` for individual comparisons.

**parser.ts** — Tokenizer that splits on `|` at the top level while respecting quotes and `{}` braces. Returns both `raw` strings (needed for Where-Object/ForEach-Object brace extraction) and `parsed` stages.

**properties.ts** — `getItemProperty(item, prop)` is the single source of truth for all property access. Case-insensitive lookup with fallback chain: builtins → case-sensitive fields → case-insensitive fields → empty string. Always returns strings.

**pathResolver.ts** — Resolves PowerShell-style paths (`master:\content\Home`) to tree node references.

**scriptContext.ts** — `ScriptContext` holds variable scope across multi-line scripts. Auto-unwraps single-element arrays on assignment (PowerShell behavior).

### Validation (`src/validation/`)

**validator.ts** — Two modes: **structural** (checks cmdlet presence, parameters, switches without executing) and **pipeline** (executes command, checks output contains/excludes strings). Validates resolved paths, not raw strings, so aliases and path variations work correctly.

### Lessons (`src/lessons/`)

18 YAML files loaded via `loader.ts` using js-yaml with Vite `?raw` imports. Each lesson has `id`, `module`, `title`, `difficulty`, `mode` (repl/ise), `description` (markdown), and `tasks[]` with instruction, hint, starterCode, and validation spec.

### UI (`src/components/`)

`App.tsx` is the root component holding all state. Key components: Sidebar (lesson navigation), LessonPanel (instructions + TreePanel in tabs), ReplEditor (console with autocomplete/history), IseEditor (multi-line editor), OutputPane (result formatting). Session progress and UI preferences persist to localStorage.

## Critical Conventions

- **Always use `getItemProperty()`** for property access — never read `_fields` directly.
- **Always use `evaluateExpression()`** for expression evaluation — it's the single truth source for all operator/variable/interpolation handling.
- **Always use `createVirtualTree()`** in tests — prevents cross-test contamination.
- **Executor accepts a `tree` parameter** — `executeCommandWithContext(cmd, ctx, tree?)` for test injection; defaults to shared `VIRTUAL_TREE` in production.
- **`parseCommand().raw`** preserves original strings — required for Where-Object/ForEach-Object to extract brace blocks correctly.
- **Variable assignment auto-unwraps** single-element arrays to match PowerShell semantics.
- **Line continuation** — lines ending with `|` or backtick (`` ` ``) are joined before execution.

## Testing

Tests live in `__tests__/` directories adjacent to source. Use `describe/it/expect/beforeEach` pattern. Every test that touches the tree should call `createVirtualTree()` in `beforeEach`. Engine tests import directly from engine modules — no React rendering needed.
