# Phase 1: Core Infrastructure - Context

**Gathered:** 2026-02-13
**Status:** In progress — discussion paused (session 3)

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
- **Global memory path:** `~/.config/opencode/mnemonics/` — FIXED, not configurable
- **Project memory path:** `.mnemonics/` — always relative to project root
- **External paths:** Configured in global + project config, project scope overrides global
- **SQLite:** REMOVED — rely on qmd for all indexing/search
- **File naming:** Title-based (e.g., `my-decision.md`)
- **Collision handling:** Prompt user with options (keep both, overwrite, combine)

### Configuration Schema (Extended)
Flat structure with the following fields:

```typescript
interface PluginConfig {
  // Agent config
  model: string;
  temperature?: number;
  appendPrompt?: string;
  
  // Storage config
  externalPaths?: string[];
  memoryTypes?: CustomMemoryType[];
  
  // Behavior config
  autoCompound?: boolean;  // default: true
  
  // Debug config
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  debug?: boolean;
}
```

**Config file format:** Support both `.json` and `.jsonc`

### Tool Restrictions
- Memory tools restricted to historian subagent only (not accessible by main agent)
- Implementation: Agent-scoped registration — memory tools only registered in historian agent config, not globally
- **Delegation policy:**
  - `memory_recall` — **Delegatable** (read-only, safe to delegate)
  - `memory_remember` — **NOT delegatable** (write operation, requires explicit @historian)
  - `memory_compound` — **NOT delegatable** (write operation, requires explicit @historian)
  - `memory_forget` — **NOT delegatable** (write operation, requires explicit @historian)

### qmd Integration Design
- **Index naming:** `{folder_name}` (e.g., `opencode-historian`)
- **Collection naming:** `{memory_type}` (e.g., `decision-architectural`)
- **Design principle:** Read actions use qmd MCP tools (lightweight, safe). Write actions use qmd CLI commands.
- **ALL qmd operations MUST include** `--index {folder_name}` option

**Scope Constraint:** This is a project-scope plugin. Write operations (remember, compound, forget) MUST ONLY operate on files inside `.mnemonics/**/*`. This protects global collection (`~/.config/opencode/mnemonics/`) and external materials from accidental modification. Read operations (recall) can access all sources.

**Format Constraint:** Memory files MUST be in `.md` (Markdown) format only. This ensures easy text-based compounding, human readability, git-friendliness, and full-text search indexing. External sources (read-only) can contain any format, but the plugin only indexes `.md` files.

| Operation | Tool Type | Command/Tool | Scope | Format |
|-----------|-----------|--------------|-------|--------|
| `memory_recall` | MCP tool | `qmd_vsearch` (LLM determines memory type → collection filter) | All sources | Any (but only .md indexed) |
| `memory_remember` | CLI | `qmd collection add ... --index {folder_name}` | `.mnemonics/**/*` ONLY | `.md` ONLY |
| `memory_compound` | MCP + CLI | `qmd_vsearch` → file ops → `qmd update --index {folder_name}` | `.mnemonics/**/*` ONLY | `.md` ONLY |
| `memory_forget` | MCP + CLI | `qmd_search` → user confirm → `rm` → `qmd update --index {folder_name}` | `.mnemonics/**/*` ONLY | `.md` ONLY |

### Claude's Discretion
- Exact config file schema TypeScript interface
- Error messages for invalid config
- Logging/debug output format
- Validation error handling

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

</pending>

---

*Phase: 01-core-infrastructure*
*Context gathered: 2026-02-13 (session 3 paused)*
