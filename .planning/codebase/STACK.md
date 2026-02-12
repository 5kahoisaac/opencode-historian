# Stack: opencode-historian

**Mapped:** 2026-02-13

## Runtime & Language

| Component | Choice | Purpose |
|-----------|--------|---------|
| Runtime | Bun v1.3.9+ | Fast JavaScript runtime with built-in bundling |
| Language | TypeScript 5.x | Type-safe development with strict mode |
| Module System | ESM | Modern ES modules with `.js` output |

## Core Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| `@opencode-ai/plugin` | ^1.1.61 | OpenCode plugin SDK |
| `@opencode-ai/sdk` | ^1.1.61 | OpenCode AI SDK |
| `@modelcontextprotocol/sdk` | ^1.26.0 | MCP (Model Context Protocol) implementation |
| `zod` | ^4.3.6 | Runtime validation and schema definition |
| `@ast-grep/cli` | ^0.40.5 | AST-based code search and manipulation |
| `vscode-jsonrpc` | ^8.2.1 | JSON-RPC protocol support |
| `vscode-languageserver-protocol` | ^3.17.5 | LSP (Language Server Protocol) support |

## Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Biome | ^2.3.15 | Linting, formatting, import organization |
| bun-types | ^1.3.9 | Bun runtime type definitions |

## Build Configuration

- **Entry Points:** 
  - Main: `src/index.ts` → `dist/index.js`
  - CLI: `src/cli/index.ts` → `dist/cli/index.js`
- **Target:** Bun runtime
- **Format:** ESM
- **Type Declarations:** Generated to `dist/`

## Package Distribution

- **Published Files:** `dist/`, `src/skills/`, `README.md`, `LICENSE`
- **Binary:** `opencode-historian` command
- **Registry:** npm

## Architecture Patterns

- Plugin-based architecture (OpenCode plugin)
- MCP (Model Context Protocol) for tool integration
- LSP integration for code analysis
- ESM-first module system

## Notes

- Project is in early stage — `src/index.ts` is currently empty
- CLI entry point (`src/cli/index.ts`) does not exist yet
- Skills directory (`src/skills/`) included in package but not yet created
