# opencode-historian

## What This Is

An OpenCode plugin that provides mnemonics (memory management) capabilities for AI agents. It enables agents to store, retrieve, and manage contextual information across sessions, powered by qmd.

## Core Value

AI agents can remember important context across conversations and sessions, enabling more coherent and personalized assistance.

## Requirements

### Validated

- ✓ Project structure initialized — existing
- ✓ TypeScript + Bun build pipeline configured — existing
- ✓ Biome linting/formatting configured — existing
- ✓ OpenCode plugin dependencies installed — existing
- ✓ MCP and LSP protocol libraries available — existing

### Active

- [ ] Core plugin structure with MCP tool registration
- [ ] Memory store operations (write, read, list, delete)
- [ ] CLI interface for standalone usage
- [ ] Integration with OpenCode agent system

### Out of Scope

- Multi-user / authentication — Single user, local-first
- Cloud sync — Local filesystem storage only for v1
- Complex querying — Simple key-value and tag-based retrieval
- Encryption — Defer to v2+ if needed

## Context

**Current State:**
- Early-stage project with build tooling configured
- `src/index.ts` is empty — ready for implementation
- Dependencies include OpenCode SDK, MCP, LSP protocols
- Built with Bun for fast execution

**Technical Environment:**
- Bun v1.3.9+ runtime
- TypeScript with strict mode
- ESM modules
- Biome for code quality
- Published as npm package

**Target Platform:**
- OpenCode AI editor/agent system
- Can also run as standalone CLI tool

## Constraints

- **Tech Stack:** Bun + TypeScript + OpenCode SDK — Locked by project setup
- **Protocol:** Must implement MCP for OpenCode integration — Required
- **Compatibility:** OpenCode plugin API v1.x — Must align
- **Timeline:** v1 should be functional and publishable — Target

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Bun runtime | Fast bundling, built-in TS support | ✓ Good — Build pipeline works well |
| Biome over ESLint/Prettier | Unified tool, faster | ✓ Good — Single command for all checks |
| ESM modules | Modern standard | ✓ Good — No CommonJS complexity |
| MCP protocol | OpenCode standard | — Pending — Implementation needed |

---
*Last updated: 2026-02-13 after codebase mapping*
