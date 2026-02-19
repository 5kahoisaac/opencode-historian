# STATE: opencode-historian

**Project:** opencode-historian  
**Core Value:** AI agents can remember important context across conversations and sessions, enabling more coherent and personalized assistance.  
**Last Updated:** 2026-02-17  

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

Requirements: 0/12 complete (CORE-02, CORE-05 removed - project-scoped only, rely on qmd for indexing; CONF-03 removed - auto-compound handled by agent search-first workflow)
- [ ] CORE-01: MCP server registers tools with OpenCode
- [x] ~~CORE-02: Global memory storage at ~/.config/opencode/mnemonics/~~ **REMOVED** - project-scoped only
- [ ] CORE-03: Project-scoped memory storage at .mnemonics/
- [ ] CORE-04: Markdown files with YAML frontmatter format
- [ ] CORE-06: qmd index naming uses folder name; collection naming uses memory_type
- [ ] CONF-01: JSON schema for plugin configuration
- [ ] CONF-02: External folder/file paths for qmd collection
- [x] ~~CONF-03: Config option autoCompound~~ **REMOVED** - agent search-first workflow handles compounding
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
| Requirements Complete | 40/40 (100%) | 0/40 (0%) | 🔴 |
| Success Criteria Met | 33/33 (100%) | 0/33 (0%) | 🔴 |
| Phases Complete | 7/7 (100%) | 0/7 (0%) | 🔴 |
| Test Coverage | >80% | N/A | ⚪ |
| Build Status | Passing | N/A | ⚪ |

---
| Phase quick-7 P01 | 5m | 3 tasks | 10 files |
| Phase quick P9 | 5m | 3 tasks | 11 files |

## Accumulated Context

### Key Decisions

| Decision | Status | Notes |
|----------|--------|-------|
| Bun runtime | ✓ Locked | Fast bundling, built-in TS support |
| ESM modules | ✓ Locked | Modern standard, tree-shakeable |
| Biome tooling | ✓ Locked | Fast, unified lint/format/check |
| Strict TypeScript | ✓ Locked | Catch errors early |
| MCP protocol | ✓ Locked | OpenCode standard |
| ~~bun:sqlite~~ | ✗ Removed | Rely on qmd for all indexing |
| ~~autoCompound~~ | ✗ Removed | Agent search-first workflow handles compounding |
| qmd integration | ✓ Locked | Hybrid search (BM25 + vector) |
| File-based storage | ✓ Locked | Human-readable, git-friendly |
| Temperature | ✓ Locked | 0.3 (balanced creativity for memory expansion) |
| Model fallback | ✓ Locked | kimi-k2.5-free → gpt-5-nano → big-pickle |
| Write scope | ✓ Locked | .mnemonics/ only (protects external paths) |
| Write format | ✓ Locked | .md only (git-friendly, compoundable) |
| Read scope | ✓ Locked | All sources (project + external via externalPaths) |
| qmd operations | ✓ Locked | MCP for reads, CLI for writes |

### Technical Debt

None yet (early stage project)

### Known Issues

None yet

### Open Questions

1. **qmd installation method:** Should we bundle qmd or require separate install?
2. **Block size limits:** Default 5000 chars — need validation during testing
3. **External memory paths:** How to handle paths that don't exist?

---

## Session Continuity

### Last Session
- **Date:** 2026-02-13
- **Action:** Roadmap creation completed
- **Outcome:** ROADMAP.md and STATE.md written

### Current Session
- **Started:** 2026-02-16
- **Focus:** Remove global memory scope, connect externalPaths
- **Decisions Made:**
  - Removed global memory storage (CORE-02) - project-scoped only now
  - Removed `getGlobalMemoryPath()` from codebase
  - Connected `externalPaths` config to "context" collection
  - Added `addExternalPathsToIndex()` + `qmd update` on plugin init
  - Memory recall now returns `count` instead of `projectCount`/`globalCount`
- **Quick Tasks Completed:** 2 (add memory_list_types tool, fix docs)
- **Next Action:** `/gsd-plan-phase 1` to create detailed Phase 1 plan

### Upcoming Work

**Immediate (Phase 1):**
1. Create project structure (agents/, tools/, cli/, config/, utils/)
2. Implement MCP server registration
3. Set up storage layers (project-scoped only)
4. Create JSON schema for configuration
5. Set up qmd integration for indexing

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
1. Documentation
2. Release preparation

---

## Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Add memory_list_types tool and deprecate normalizeMemoryType | 2026-02-16 | ecdc78c | [1-add-memory-list-types-tool-and-deprecate](./quick/1-add-memory-list-types-tool-and-deprecate/) |
| 2 | Fix docs - remove useless sections like MCP commands | 2026-02-16 | cd9ab35 | [2-fix-docs-remove-useless-sections-like-mc](./quick/2-fix-docs-remove-useless-sections-like-mc/) |
| 3 | Remove global scope memory and connect externalPaths | 2026-02-16 | 7b5c822 | [4-remove-global-memory-scope-and-connect-e](./quick/4-remove-global-memory-scope-and-connect-e/) |
| 4 | Fix memory_forget tool - agent creates memories on delete | 2026-02-16 | f4917de | [5-fix-memory-forget-tool-agent-creates-mem](./quick/5-fix-memory-forget-tool-agent-creates-mem/) |
| 6 | Fix UAT gaps - qmd index path, agent prompts, logger usage | 2026-02-17 | 0439064 | [6-fix-uat-gaps-qmd-index-path-agent-prompt](./quick/6-fix-uat-gaps-qmd-index-path-agent-prompt/) |
| 7 | Replace QmdClient with CLI-based qmd commands | 2026-02-17 | 42cbc49 | [7-replace-qmdclient-with-cli-based-qmd-com](./quick/7-replace-qmdclient-with-cli-based-qmd-com/) |
| 8 | Test memory recall fix with CLI-based qmd | 2026-02-17 | f4b9e4c | [8-test-memory-recall-fix-with-cli-based-qm](./quick/8-test-memory-recall-fix-with-cli-based-qm/) |
| 9 | Unify qmd search functions with type parameter and fix lint errors | 2026-02-18 | 8369900 | [9-unify-qmd-search-functions-with-type-par](./quick/9-unify-qmd-search-functions-with-type-par/) |
| 10 | Remove memory_compound tool, use memory_remember for create/update | 2026-02-18 | 8d86663 | [10-remove-memory-compound-tool-deprecate-fo](./quick/10-remove-memory-compound-tool-deprecate-fo/) |
| 11 | Rewrite recall workflow with smart search type selection | 2026-02-18 | e309388 | [11-rewrite-recall-workflow-with-smart-searc](./quick/11-rewrite-recall-workflow-with-smart-searc/) |
| 12 | memory_recall fetch full content of search results | 2026-02-18 | fc7f7b9 | [12-memory-recall-fetch-full-content-of-sear](./quick/12-memory-recall-fetch-full-content-of-sear/) |
| 13 | Rewrite historian agent instructions for better compliance | 2026-02-18 | 49ab79d | [13-rewrite-historian-agent-instructions](./quick/13-rewrite-historian-agent-instructions/) |
| 14 | Fix memory_recall qmd:// path conversion | 2026-02-18 | 80b99fd | [14-fix-historian-recall-issue](./quick/14-fix-historian-recall-issue/) |
| 15 | Update memory_remember to support update via filePath parameter | 2026-02-18 | 8314436 | [15-update-memory-remember-to-support-update](./quick/15-update-memory-remember-to-support-update/) |
| 16 | Refactor memory_forget to accept filePaths parameter | 2026-02-19 | 4e36b0d | [16-refactor-memory-forget-to-accept-filepat](./quick/16-refactor-memory-forget-to-accept-filepat/) |
| 17 | Add isAll flag to memory_recall for getting all memories | 2026-02-19 | b567150 | [17-add-isall-flag-to-memory-recall-for-gett](./quick/17-add-isall-flag-to-memory-recall-for-gett/) |
| 18 | Add memory_sync tool and remove CLI (install/doctor) | 2026-02-19 | 5140dba | [18-add-memory-sync-tool-for-manual-index-up](./quick/18-add-memory-sync-tool-for-manual-index-up/) |

---

## Blockers

None currently.

### Potential Blockers to Watch

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| qmd integration complexity | Medium | High | Isolate in Phase 5; fallback to simple search |
| MCP protocol version conflicts | Low | Medium | Pin SDK version; test thoroughly |
| Large memory file performance | Low | Medium | Monitor; consider archiving old memories |

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
```

### Memory Type Quick Reference

| Type | Path |
|------|------|
| architectural-decision | `.mnemonics/architectural-decision/*.md` |
| design-decision | `.mnemonics/design-decision/*.md` |
| learning | `.mnemonics/learning/*.md` |
| user-preference | `.mnemonics/user-preference/*.md` |
| project-preference | `.mnemonics/project-preference/*.md` |
| issue | `.mnemonics/issue/*.md` |
| context | `.mnemonics/context/*.md` |
| recurring-pattern | `.mnemonics/recurring-pattern/*.md` |
| conventions-pattern | `.mnemonics/conventions-pattern/*.md` |

---

*This file is maintained by the GSD workflow. Update via `/gsd-state-update`.*
