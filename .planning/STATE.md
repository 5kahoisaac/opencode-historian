# STATE: opencode-historian

**Project:** opencode-historian  
**Core Value:** AI agents can remember important context across conversations and sessions, enabling more coherent and personalized assistance.  
**Last Updated:** 2026-02-13  

---

## Project Reference

**What This Is:** An OpenCode plugin that provides mnemonics (memory management) capabilities for AI agents, powered by qmd.

**Key Constraints:**
- Bun + TypeScript (locked by project setup)
- MCP protocol for OpenCode integration (required)
- Local-first storage (no cloud for v1)
- Single user (no multi-user/auth for v1)

**Out of Scope for v1:**
- Multi-user / authentication
- Cloud sync
- Vector search (qmd's hybrid search sufficient)
- Encryption
- Complex querying beyond label/description

---

## Current Position

**Current Phase:** Phase 1 - Core Infrastructure  
**Current Plan:** None (awaiting `/gsd-plan-phase 1`)  
**Status:** 🔵 Not Started

### Phase 1 Progress

```
Phase 1: Core Infrastructure
[░░░░░░░░░░░░░░░░░░░░] 0%

Requirements: 0/15 complete
- [ ] CORE-01: MCP server registers tools with OpenCode
- [ ] CORE-02: Global memory storage at ~/.config/opencode/memory/
- [ ] CORE-03: Project-scoped memory storage at .opencode/memory/
- [ ] CORE-04: Markdown files with YAML frontmatter format
- [ ] CORE-05: bun:sqlite for metadata and indexing
- [ ] CORE-06: qmd collection naming convention
- [ ] CONF-01: JSON schema for plugin configuration
- [ ] CONF-02: External folder/file paths for qmd collection
- [ ] CONF-03: Config option autoCompound
- [ ] CONF-04: Config option memoryTypes
- [ ] STRC-01: agents/ directory structure
- [ ] STRC-02: tools/memory/ directory structure
- [ ] STRC-03: cli/ directory structure
- [ ] STRC-04: config/ directory structure
- [ ] STRC-05: utils/ directory structure

Success Criteria: 0/5 met
- [ ] Plugin Registration
- [ ] Storage Initialization
- [ ] Project Storage
- [ ] Configuration Validation
- [ ] Project Structure
```

---

## Performance Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Requirements Complete | 41/41 (100%) | 0/41 (0%) | 🔴 |
| Success Criteria Met | 34/34 (100%) | 0/34 (0%) | 🔴 |
| Phases Complete | 7/7 (100%) | 0/7 (0%) | 🔴 |
| Test Coverage | >80% | N/A | ⚪ |
| Build Status | Passing | N/A | ⚪ |

---

## Accumulated Context

### Key Decisions

| Decision | Status | Notes |
|----------|--------|-------|
| Bun runtime | ✓ Locked | Fast bundling, built-in TS support |
| ESM modules | ✓ Locked | Modern standard, tree-shakeable |
| Biome tooling | ✓ Locked | Fast, unified lint/format/check |
| Strict TypeScript | ✓ Locked | Catch errors early |
| MCP protocol | ✓ Locked | OpenCode standard |
| bun:sqlite | ✓ Locked | Built-in, zero dependencies |
| qmd integration | ✓ Locked | Hybrid search (BM25 + vector) |
| File-based storage | ✓ Locked | Human-readable, git-friendly |

### Technical Debt

None yet (early stage project)

### Known Issues

None yet

### Open Questions

1. **qmd installation method:** Should we bundle qmd or require separate install?
2. **Auto-compound timing:** What defines "session idle" for auto-prompt?
3. **Block size limits:** Default 5000 chars — need validation during testing
4. **External memory paths:** How to handle paths that don't exist?

---

## Session Continuity

### Last Session
- **Date:** 2026-02-13
- **Action:** Roadmap creation completed
- **Outcome:** ROADMAP.md and STATE.md written

### Current Session
- **Started:** 2026-02-13
- **Focus:** Awaiting user approval of roadmap
- **Next Action:** `/gsd-plan-phase 1` once approved

### Upcoming Work

**Immediate (Phase 1):**
1. Create project structure (agents/, tools/, cli/, config/, utils/)
2. Implement MCP server registration
3. Set up storage layers (global + project)
4. Create JSON schema for configuration
5. Implement bun:sqlite metadata store

**Near-term (Phases 2-3):**
1. Memory CRUD operations
2. Template system with YAML frontmatter
3. 9 default memory types
4. System prompt injection
5. Default block auto-creation

**Medium-term (Phases 4-6):**
1. Self-editing capabilities
2. qmd integration and hybrid search
3. Compounding engineering
4. Context rot prevention

**Final (Phase 7):**
1. CLI install command
2. Documentation
3. Release preparation

---

## Blockers

None currently.

### Potential Blockers to Watch

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| qmd integration complexity | Medium | High | Isolate in Phase 5; fallback to simple search |
| MCP protocol version conflicts | Low | Medium | Pin SDK version; test thoroughly |
| SQLite performance with large memories | Low | Medium | Monitor; consider archiving old memories |

---

## Notes

### Project State

This is a **brownfield project** with build tooling already configured:
- ✓ TypeScript + Bun configured
- ✓ Biome linting/formatting configured
- ✓ Dependencies installed (OpenCode SDK, MCP SDK)
- ✗ Implementation not started (src/index.ts is empty)

### Development Environment

- **Runtime:** Bun v1.3.9+
- **Build:** `bun run build` (outputs to dist/)
- **Type Check:** `bun run typecheck`
- **Lint:** `bun run lint`
- **Format:** `bun run format`
- **Test:** `bun test`

### Architecture Reminders

- Plugin follows oh-my-opencode-slim pattern
- Historian runs as OpenCode subagent
- Memory tools restricted to historian agent only
- Skills included in package at src/skills/
- Memory storage uses qmd for hybrid search

---

## Quick Reference

### File Locations

| File | Path |
|------|------|
| Project spec | `.planning/PROJECT.md` |
| Requirements | `.planning/REQUIREMENTS.md` |
| Roadmap | `.planning/ROADMAP.md` |
| State (this file) | `.planning/STATE.md` |
| Research | `.planning/research/SUMMARY.md` |
| Architecture | `.planning/codebase/ARCHITECTURE.md` |
| Stack | `.planning/codebase/STACK.md` |

### Commands

```bash
# Build
bun run build

# Type check
bun run typecheck

# Lint and format
bun run check

# Test
bun test

# Install dependencies
bun install

# Run CLI (when implemented)
bunx opencode-historian install
```

### Memory Type Quick Reference

| Type | Path |
|------|------|
| architectural decision | `.opencode/memory/decision/architectural/*.md` |
| design decision | `.opencode/memory/decision/design/*.md` |
| learning | `.opencode/memory/learning/*.md` |
| user preference | `.opencode/memory/preference/user/*.md` |
| project preference | `.opencode/memory/preference/project/*.md` |
| issue | `.opencode/memory/blocker/issue/*.md` |
| context | `.opencode/memory/context/*.md` |
| recurring pattern | `.opencode/memory/pattern/recurring/*.md` |
| conventions pattern | `.opencode/memory/pattern/conventions/*.md` |

---

*This file is maintained by the GSD workflow. Update via `/gsd-state-update`.*
