# Requirements: opencode-historian

**Defined:** 2026-02-13
**Core Value:** AI agents can remember important context across conversations and sessions, enabling more coherent and personalized assistance.

## v1 Requirements

### Core Infrastructure

- [ ] **CORE-01**: MCP server registers tools with OpenCode
- [ ] **CORE-02**: Global memory storage at `~/.config/opencode/memory/`
- [ ] **CORE-03**: Project-scoped memory storage at `.opencode/memory/` (configurable)
- [ ] **CORE-04**: Markdown files with YAML frontmatter format
- [ ] **CORE-05**: bun:sqlite for metadata and indexing
- [ ] **CORE-06**: qmd collection naming uses folder name: `{folder_name}/mnemonics/{memory_type}`

### Memory Operations (OpenCode Custom Tools)

All memory operations are implemented as OpenCode custom tools following the `ToolDefinition` pattern from `@opencode-ai/plugin`.

- [ ] **CRUD-01**: `memory_remember` — Create memory file, add to qmd collection
  - LLM determines memory type, saves to corresponding path
  - Runs: `qmd collection add .mnemonics/{memory_type} --name {folder_name}/mnemonics/{memory_type} --mask "**/*.md"`
- [ ] **CRUD-02**: ~~`memory_list`~~ — Removed (causes excessive token usage)
- [ ] **CRUD-03**: `memory_recall` — Query/search memories via qmd index
  - Reference: https://github.com/tobi/qmd#examples
  - Query by memory type index
- [ ] **CRUD-04**: `memory_compound` — Merge new content into existing memory
  - LLM finds memory location via qmd search
  - If no match: call `memory_remember`
  - If match: compound content into existing file
  - Update index: `qmd update`, verify: `qmd status`
- [ ] **CRUD-05**: `memory_forget` — Delete memory file and update qmd index
  - Delete file (e.g., `rm notes/old-record.md`)
  - Update index: `qmd update`, verify: `qmd status`

### System Integration

- [ ] **INTG-01**: Memory blocks injected into system prompt
- [ ] **INTG-02**: Default blocks auto-created: persona, human, project
- [ ] **INTG-03**: Block descriptions guide agent usage
- [ ] **INTG-04**: Metadata fields: label, description, limit, read_only, created_at, updated_at

### Self-Editing

- [ ] **EDIT-01**: Agent can call `memory_compound` on its own memory
- [ ] **EDIT-02**: Agent can create new memory blocks via `memory_remember`
- [ ] **EDIT-03**: Block descriptions explain when/how to use each block

### qmd Integration

- [ ] **QMD-01**: qmd connected as MCP resource
- [ ] **QMD-02**: Use qmd to recall memories via hybrid search (BM25 + vector)
- [ ] **QMD-03**: Store memories with defined memory types (9 defaults + extensible)
- [ ] **QMD-04**: Update qmd index after memory creation/update/deletion
- [ ] **QMD-05**: READ-ONLY memories from external config paths — agent/tools cannot modify

### Memory Types

- [ ] **TYPE-01**: 9 default memory types (see Memory Types Definition below)
- [ ] **TYPE-02**: Extensible via plugin config — users can add custom types
- [ ] **TYPE-03**: Memory type determines storage path

#### Default Memory Types

| Memory Type | Storage Path | Description |
|-------------|--------------|-------------|
| architectural decision | `.mnemonics/decision/architectural/*.md` | High-level architecture choices |
| design decision | `.mnemonics/decision/design/*.md` | UI/UX and component design choices |
| learning | `.mnemonics/learning/*.md` | Lessons learned, insights, discoveries |
| user preference | `.mnemonics/preference/user/*.md` | Individual user preferences |
| project preference | `.mnemonics/preference/project/*.md` | Team/project-wide conventions |
| issue | `.mnemonics/blocker/issue/*.md` | Known problems, blockers, workarounds |
| context | `.mnemonics/context/*.md` | Business context, domain knowledge |
| recurring pattern | `.mnemonics/pattern/recurring/*.md` | Reusable solutions to common problems |
| conventions pattern | `.mnemonics/pattern/conventions/*.md` | Coding standards, naming conventions |

### Memory File Template

- [ ] **TMPL-01**: Standard memory template with YAML frontmatter
- [ ] **TMPL-02**: Template variables:
  - `{TITLE}` — Extracted title
  - `{CREATED_AT}` — Current ISO timestamp
  - `{MODIFIED_AT}` — Current ISO timestamp
  - `{OVERVIEW}` — Memory content/overview
  - `{EXAMPLES}` — Optional examples (or "N/A")
  - `{CUSTOM_SECTION_TITLE}` — Memory type-specific section title
  - `{CUSTOM_SECTION_CONTENT}` — Memory type-specific content

### Compounding Engineering

- [ ] **COMP-01**: Implement compounding engineering to solve context rot
  - Context rot: LLM performance degrades as input length grows
  - Solution: Intelligently compact/consolidate context before it degrades
  - Reference: https://avestalabs.ai/blog/context-engineering-series-1-beating-context-rot-with-compaction
- [ ] **COMP-02**: `memory_compound` merges new learnings into existing memory intelligently
  - Not just append — consolidate and resolve contradictions
  - Preserve important details, summarize redundant information
  - Maintain memory freshness and relevance
- [ ] **COMP-03**: Auto-prompt on session idle (task completed): "Compound learnings into memory? (Y/N)"
- [ ] **COMP-04**: Config option to disable auto-compound prompt
- [ ] **COMP-05**: Manual `memory_compound` tool always available for on-demand compounding
- [ ] **COMP-06**: qmd re-index triggered after compounding to keep search index fresh

### CLI Interface

- [ ] **CLI-01**: `bunx opencode-historian install` — Install sqlite and qmd
  - Prompt user to install sqlite (if not present)
  - Install qmd via appropriate method

### Plugin Configuration

- [ ] **CONF-01**: JSON schema for plugin configuration
- [ ] **CONF-02**: Allow users to add external folder/file paths for qmd collection
- [ ] **CONF-03**: Config option: `autoCompound` (boolean, default: true)
- [ ] **CONF-04**: Config option: `memoryTypes` (array, extends default types)

### Plugin Structure (based on oh-my-opencode-slim)

- [ ] **STRC-01**: `agents/` — Historian agent runs as OpenCode subagent
  - Subagents are specialized assistants that primary agents can invoke for specific tasks
  - Users can manually invoke by @ mentioning them: `@historian remember this pattern`
  - Historian agent handles all memory-related actions using the tools
- [ ] **STRC-02**: `tools/memory/` — Memory CRUD tools (restricted to historian agent via permissions)
- [ ] **STRC-03**: `cli/` — Install command and CLI interface
- [ ] **STRC-04**: `config/` — JSON schema for plugin configuration
- [ ] **STRC-05**: `utils/` — Shared utility functions

## v2 Requirements

### Advanced Features

- **READ-01**: Read-only blocks for policies and guidelines
- **LIMT-01**: Enforce block size limits (default ~5000 chars)
- **FLTR-01**: Filter memory blocks by label pattern
- **TMPL-01**: User-defined memory block templates
- **BACK-01**: Export memories to JSON format
- **SYNC-01**: Git integration for memory change tracking

## Out of Scope

| Feature | Reason |
|---------|--------|
| Vector search / embeddings | Adds complexity; qmd's hybrid search sufficient |
| Knowledge graphs | High complexity, requires NER; blocks are simpler |
| Automatic memory capture | Creates noise; self-editing is cleaner |
| Real-time sync | Conflict nightmares; defer to manual/git sync |
| Multi-agent shared blocks | Coordination complexity; single-user focus |
| Memory versioning | Git-like history; defer until needed |
| Encryption | Privacy-focused but defer to v2+ |
| Cloud storage | Local-first philosophy; network adds complexity |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1 | Pending |
| CORE-02 | Phase 1 | Pending |
| CORE-03 | Phase 1 | Pending |
| CORE-04 | Phase 1 | Pending |
| CORE-05 | Phase 1 | Pending |
| CORE-06 | Phase 1 | Pending |
| CRUD-01 | Phase 2 | Pending |
| CRUD-03 | Phase 2 | Pending |
| CRUD-04 | Phase 2 | Pending |
| CRUD-05 | Phase 2 | Pending |
| INTG-01 | Phase 3 | Pending |
| INTG-02 | Phase 3 | Pending |
| INTG-03 | Phase 3 | Pending |
| INTG-04 | Phase 3 | Pending |
| EDIT-01 | Phase 4 | Pending |
| EDIT-02 | Phase 4 | Pending |
| EDIT-03 | Phase 4 | Pending |
| QMD-01 | Phase 5 | Pending |
| QMD-02 | Phase 5 | Pending |
| QMD-03 | Phase 5 | Pending |
| QMD-04 | Phase 5 | Pending |
| QMD-05 | Phase 5 | Pending |
| TYPE-01 | Phase 2 | Pending |
| TYPE-02 | Phase 2 | Pending |
| TYPE-03 | Phase 2 | Pending |
| TMPL-01 | Phase 2 | Pending |
| TMPL-02 | Phase 2 | Pending |
| COMP-01 | Phase 6 | Pending |
| COMP-02 | Phase 6 | Pending |
| COMP-03 | Phase 6 | Pending |
| COMP-04 | Phase 6 | Pending |
| COMP-05 | Phase 6 | Pending |
| COMP-06 | Phase 6 | Pending |
| CLI-01 | Phase 7 | Pending |
| CONF-01 | Phase 1 | Pending |
| CONF-02 | Phase 1 | Pending |
| CONF-03 | Phase 1 | Pending |
| CONF-04 | Phase 1 | Pending |
| STRC-01 | Phase 1 | Pending |
| STRC-02 | Phase 1 | Pending |
| STRC-03 | Phase 1 | Pending |
| STRC-04 | Phase 1 | Pending |
| STRC-05 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0 ✓

---

## Reference

### qmd Integration Details

**Source:** https://github.com/tobi/qmd

**Skills Reference:** https://github.com/tobi/qmd/tree/main/skills/qmd — Implementation patterns for qmd skills

**Collection naming:** `{folder_name}/mnemonics/{memory_type}`

**READ-ONLY constraint:** If memory source is from config file (external source), the memory is read-only. Agent and tools must NOT perform any write action.

**Re-index trigger:** Usually trigger qmd re-index when OpenCode session idle hook fires.

### oh-my-opencode-slim Reference

**Source:** https://github.com/alvinunreal/oh-my-opencode-slim
**Tools Reference:** https://github.com/alvinunreal/oh-my-opencode-slim/tree/master/src/tools

The plugin structure follows this pattern:
- `agents/` — Historian agent for memory-related actions
- `tools/` — Memory CRUD tools (restricted to historian agent via agent permissions)
- `cli/` — Installation and CLI commands
- `config/` — Plugin configuration schema
- `utils/` — Shared utility functions
- `skills/` — (Optional) Skill definitions for reusable agent capabilities

**Tools vs Skills:**
- **Tools** (`src/tools/`): OpenCode custom tools following the `ToolDefinition` pattern from `@opencode-ai/plugin`. These are registered with OpenCode's tool system (like `memory_remember`, `memory_recall`). Access can be restricted to specific agents via agent configuration.
- **Skills** (`src/skills/`): Special skill definition files packaged with the plugin. Used for reusable agent capabilities.

For opencode-historian:
- Memory CRUD operations should be **tools** in `src/tools/memory/` (following the pattern of `src/tools/grep/`, `src/tools/lsp/`)
- Agent permissions will restrict these tools to the historian agent only
- Skills folder may be used for additional capabilities if needed

Other folders (`background/`, `hooks/`, `mcp/`) may be needed based on oh-my-opencode-slim requirements.

---
*Requirements defined: 2026-02-13*
*Last updated: 2026-02-13 after user additions*
