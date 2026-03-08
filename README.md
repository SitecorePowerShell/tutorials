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
- **Smart validation** — checks resolved paths (not string matching), supports aliases, validates multi-line scripts with variable assignments
- **Resizable ISE editor** with line numbers and Ctrl+Enter execution
- **Command history** with up/down arrow in REPL mode
- **Content tree panel** — visual reference for the simulated Sitecore structure

## Quick Start

This is currently a single-file React prototype (`spe-tutorial-prototype.jsx`). To run it:

1. Use in Claude.ai artifacts viewer (upload the JSX file)
2. Or integrate into a React project and import as a component

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full system design, contributor guide, and implementation roadmap.

## Reference Data

The `reference/` folder contains:
- `spe-simulation-reference.ps1` — Diagnostic script (Part 1) for capturing real SPE output formatting
- `spe-simulation-reference-part2.ps1` — Diagnostic script (Part 2) for Select-Object, editing context, and pipeline behaviors

These scripts were run against a vanilla Sitecore instance to calibrate the simulation.

## Roadmap

See the [Phase 2-4 roadmap in ARCHITECTURE.md](ARCHITECTURE.md#implementation-roadmap) for planned features including:
- External YAML lesson files
- localStorage progress persistence
- GitHub Pages deployment
- GitBook embed integration

## License

TBD

## Credits

Built for the [Sitecore PowerShell Extensions](https://github.com/SitecorePowerShell/Console) community.
