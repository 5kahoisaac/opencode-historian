# Phase 1: Core Infrastructure - Context

**Gathered:** 2026-02-13
**Status:** In progress — discussion paused

<domain>
## Phase Boundary

Plugin foundation with MCP registration, storage layers, configuration, and project structure following oh-my-opencode-slim pattern. This phase sets up the core infrastructure that all other phases build upon.

**15 Requirements:**
- CORE-01 to CORE-06: MCP server, storage paths, markdown format, naming
- CONF-01 to CONF-04: JSON schema, external paths, autoCompound/memoryTypes config
- STRC-01 to STRC-05: Project structure (agents, tools, cli, config, utils)

**Note:** CORE-05 (bun:sqlite) removed — will rely on qmd for all indexing.

</domain>

<decisions>
## Implementation Decisions

### Plugin Entry Point
- Export full plugin object (agents, tools, config, hooks, events)
- Plugin name: `opencode-historian`
- Config location: User-level first (~/.opencode/opencode-historian.json or .jsonc), project-level overrides (.opencode/opencode-historian.json or .jsonc)
- Hooks: Minimal stub event handler for Phase 1 (full hooks added in later phases)
- Background tasks: Deferred to Phase 5/6 (add when needed for QMD indexing/compounding)

### Storage Structure
- **Global memory path:** `~/.opencode/mnemonics/` — FIXED, not configurable
- **Project memory path:** `.mnemonics/` — always relative to project root
- **External paths:** Configured in global + project config, project scope overrides global
- **SQLite:** REMOVED — rely on qmd for all indexing/search
- **File naming:** Title-based (e.g., `my-decision.md`)
- **Collision handling:** Prompt user with options (keep both, overwrite, combine)

### Configuration Options (Phase 1)
- **externalPaths:** `string[]` — additional read-only memory sources (default: `[]`)
- **memoryTypes:** `custom[]` — extend default 9 memory types (default: `[]`)
- **autoCompound:** `boolean` — enable/disable auto-compound prompt (default: `true`)
- **Config format:** Support both `.json` and `.jsonc` formats

### Claude's Discretion
- Exact config file schema structure
- Error messages for invalid config
- Logging/debug output format

</decisions>

<specifics>
## Specific Ideas

- Follow oh-my-opencode-slim plugin structure pattern
- Config hierarchy: user-level as base, project-level overrides
- External paths become read-only memories (per QMD-05)

</specifics>

<deferred>
## Deferred Ideas

- **Background task infrastructure** — Add in Phase 5/6 when needed for QMD indexing and compounding operations
- **Full hooks implementation** — Session idle hook for compounding (Phase 6), system prompt injection hooks (Phase 3)

</deferred>

<pending>
## Still to Discuss

- [ ] Historian agent setup (prompts, model)
- [ ] Tool restrictions (how to restrict memory tools to historian only)
- [ ] Configuration schema details

</pending>

---

*Phase: 01-core-infrastructure*
*Context gathered: 2026-02-13 (paused)*
