# Architecture: opencode-historian

**Mapped:** 2026-02-13

## Overview

opencode-historian is an OpenCode plugin that provides mnemonics (memory management) capabilities for AI agents. It enables agents to store, retrieve, and manage contextual information across sessions.

## Current State

⚠️ **Early Stage:** Project structure exists but implementation is minimal.

### Existing Files

```
src/
└── index.ts          # Empty entry point (1 blank line)
```

### Planned Structure

Based on `package.json` configuration:

```
src/
├── index.ts          # Main plugin export
├── cli/
│   └── index.ts      # CLI entry point
└── skills/           # Skill implementations (included in package)
```

## Component Boundaries

### Plugin Layer (`src/index.ts`)
- **Responsibility:** OpenCode plugin interface
- **Exports:** Plugin definition, tools, handlers
- **Dependencies:** `@opencode-ai/plugin`, `@opencode-ai/sdk`

### CLI Layer (`src/cli/index.ts`)
- **Responsibility:** Command-line interface
- **Binary:** `opencode-historian`
- **Dependencies:** Plugin layer, Bun runtime

### Skills Layer (`src/skills/`)
- **Responsibility:** Modular skill implementations
- **Pattern:** Each skill is self-contained
- **Purpose:** Reusable agent capabilities

### MCP Integration
- **Protocol:** Model Context Protocol
- **SDK:** `@modelcontextprotocol/sdk`
- **Purpose:** Tool registration and invocation

### LSP Integration
- **Protocol:** Language Server Protocol
- **Libraries:** `vscode-jsonrpc`, `vscode-languageserver-protocol`
- **Purpose:** Code analysis and symbol operations

## Data Flow

```
User/Agent
    ↓
OpenCode
    ↓
opencode-historian Plugin
    ↓
MCP Tools / LSP Operations
    ↓
Memory Store (TBD)
```

## Build Pipeline

```
Source (src/)
    ↓
Bun Bundler (ESM)
    ↓
TypeScript Declarations (tsc)
    ↓
dist/ (published)
```

## Key Decisions

| Decision | Status | Rationale |
|----------|--------|-----------|
| Bun runtime | Locked | Fast bundling, built-in TypeScript support |
| ESM modules | Locked | Modern standard, tree-shakeable |
| Biome tooling | Locked | Fast, unified lint/format/check |
| Strict TypeScript | Locked | Catch errors early |
| MCP protocol | Locked | OpenCode standard |
| LSP integration | Locked | Code analysis capabilities |

## Unknowns / TBD

- [ ] Memory storage backend (filesystem, SQLite, external?)
- [ ] Specific mnemonics operations (store, recall, forget, etc.)
- [ ] CLI command structure
- [ ] Skill organization pattern
