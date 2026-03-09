# SPE Interactive Tutorial

A browser-based interactive tutorial for [Sitecore PowerShell Extensions](https://doc.sitecorepowershell.com), designed to embed into doc.sitecorepowershell.com.

Users learn SPE commands against a **simulated Sitecore content tree** — no real instance required. The commands taught work exactly the same in a real SPE console or ISE.

## Features

- **Dual-mode editor** — REPL (console) mode for one-liners, ISE mode for multi-line scripts
- **Simulated content tree** — realistic item hierarchy with proper field values, templates, and IDs
- **Output formatting** — matches real SPE output (verified against `Sitecore_Views.ps1xml` and `Sitecore_Types.ps1xml`)
- **23 interactive tasks** across 11 lessons covering:
  - Foundations (Get-Item, Get-ChildItem, pipelines, filtering, provider paths)
  - ISE Scripting (Show-ListView, variables, ForEach-Object)
  - Item Manipulation (New-Item, Remove-Item, Move-Item, Copy-Item, Rename-Item)
  - Real-World Patterns (content audit reports based on actual SPE repo scripts)
- **Advanced expression engine** — string operators (`-replace`, `-split`, `-join`, `-f`), compound filters (`-and`, `-or`, `-not`), `if`/`else` conditionals, .NET type simulation (`[DateTime]`, `[Math]`, `[guid]`, etc.), hashtable/array literals
- **Smart validation** — checks resolved paths (not string matching), supports aliases, validates multi-line scripts with variable assignments
- **Resizable ISE editor** with line numbers and Ctrl+Enter execution
- **Command history** with up/down arrow in REPL mode
- **Content tree panel** — visual reference for the simulated Sitecore structure

## Quick Start

**Prerequisites:** [Bun](https://bun.sh) (or Node.js 18+)

```bash
# Clone and install
git clone https://github.com/SitecorePowerShell/tutorials.git
cd tutorials
bun install

# Development
bun run dev        # Start dev server at http://localhost:5173

# Testing
bun run test       # Run all 229 tests
bun run test:watch # Watch mode

# Production build
bun run build      # Output to dist/ (deploy to Cloudflare Pages, etc.)
bun run preview    # Preview the production build locally
```

> **Note:** `npm install` / `npm run dev` also work if you don't have Bun installed.

## Project Structure

```
src/
  engine/       # Simulation engine (pure TypeScript, no React deps)
    expressionEval.ts   # Expression evaluator (operators, interpolation, .NET calls)
    filterEval.ts       # Boolean filter evaluator (compound conditions)
    dotnetTypes.ts      # Simulated .NET static types
    executor.ts         # Pipeline executor + cmdlet handlers
    ...                 # parser, pathResolver, properties, formatter, etc.
  validation/   # Task validation (structural + pipeline)
  components/   # React UI components
  lessons/      # 11 YAML lesson files + loader
  types/        # Shared TypeScript interfaces
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full system design, contributor guide, and implementation roadmap.

## Contributing Lessons

Lessons are YAML files in `src/lessons/`. To add a new lesson:

1. Create a new YAML file following the schema in [ARCHITECTURE.md](ARCHITECTURE.md#lesson-schema)
2. Register it in `src/lessons/loader.ts`
3. Run `bun run dev` and test your lesson
4. Run `bun run test` to ensure nothing is broken
5. Submit a PR

## Reference Data

The `reference/` folder contains calibration data from a real Sitecore instance:
- `spe-simulation-reference.ps1` / `part2.ps1` — Diagnostic scripts for capturing real SPE output
- `Sitecore_Views.ps1xml` — Default table column widths and headers
- `Sitecore_Types.ps1xml` — DefaultDisplayPropertySet and ScriptProperty definitions

## Roadmap

See the [implementation roadmap in ARCHITECTURE.md](ARCHITECTURE.md#implementation-roadmap). Key next steps:
- Advanced tutorial lessons using new engine capabilities
- Calculated property support (`@{Label=...; Expression=...}`)
- Cloudflare Pages CI/CD
- GitBook iframe embed integration
- localStorage progress persistence

## License

TBD

## Credits

Built for the [Sitecore PowerShell Extensions](https://github.com/SitecorePowerShell/Console) community.
