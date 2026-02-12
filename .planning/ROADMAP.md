# ROADMAP: opencode-historian

**Version:** 1.0.0  
**Depth:** Comprehensive  
**Created:** 2026-02-13  
**Requirements:** 41 v1 requirements mapped

---

## Overview

opencode-historian is an OpenCode plugin providing mnemonics (memory management) for AI agents. This roadmap delivers a complete memory system enabling agents to store, retrieve, and manage contextual information across sessions using qmd-powered hybrid search.

The roadmap follows a natural progression from infrastructure to operations, integration, intelligence, and finally CLI tooling. Each phase delivers a complete, verifiable capability that builds upon previous phases.

---

## Phases

### Phase 1: Core Infrastructure

**Goal:** Plugin foundation with MCP registration, storage layers, configuration, and project structure

**Dependencies:** None (foundation phase)

**Requirements Mapped:**
- CORE-01: MCP server registers tools with OpenCode
- CORE-02: Global memory storage at `~/.config/opencode/memory/`
- CORE-03: Project-scoped memory storage at `.opencode/memory/`
- CORE-04: Markdown files with YAML frontmatter format
- CORE-05: bun:sqlite for metadata and indexing
- CORE-06: qmd collection naming convention
- CONF-01: JSON schema for plugin configuration
- CONF-02: External folder/file paths for qmd collection
- CONF-03: Config option `autoCompound` (boolean, default: true)
- CONF-04: Config option `memoryTypes` (array, extends default types)
- STRC-01: `agents/` — Historian agent runs as OpenCode subagent
- STRC-02: `tools/memory/` — Memory CRUD tools
- STRC-03: `cli/` — Install command and CLI interface
- STRC-04: `config/` — JSON schema for plugin configuration
- STRC-05: `utils/` — Shared utility functions

**Success Criteria (Observable Behaviors):**

1. **Plugin Registration:** OpenCode recognizes opencode-historian plugin and lists it in available tools
2. **Storage Initialization:** Global memory folder `~/.config/opencode/memory/` is created on first run
3. **Project Storage:** When plugin initializes in a project, `.opencode/memory/` folder is created
4. **Configuration Validation:** Configuration file accepts user settings and validates against JSON schema
5. **Project Structure:** Repository follows oh-my-opencode-slim pattern with agents/, tools/, cli/, config/, utils/ directories

---

### Phase 2: Memory Operations & Types

**Goal:** Complete memory CRUD operations with 9 default types and templates

**Dependencies:** Phase 1 (Core Infrastructure)

**Requirements Mapped:**
- CRUD-01: `memory_remember` — Create memory file, add to qmd collection
- CRUD-03: `memory_recall` — Query/search memories via qmd index
- CRUD-04: `memory_compound` — Merge new content into existing memory
- CRUD-05: `memory_forget` — Delete memory file and update qmd index
- TYPE-01: 9 default memory types
- TYPE-02: Extensible via plugin config
- TYPE-03: Memory type determines storage path
- TMPL-01: Standard memory template with YAML frontmatter
- TMPL-02: Template variables (TITLE, CREATED_AT, MODIFIED_AT, OVERVIEW, EXAMPLES, CUSTOM_SECTION_TITLE, CUSTOM_SECTION_CONTENT)

**Success Criteria (Observable Behaviors):**

1. **Memory Creation:** User can say "remember this as [type]" and memory file is created at correct path with proper template
2. **Memory Retrieval:** User can recall memories by querying content, and relevant memories are returned
3. **Memory Update:** User can compound new information into existing memory, and file is updated with merged content
4. **Memory Deletion:** User can delete memories, and files are removed with index updated
5. **Type Selection:** Nine default memory types are available: architectural decision, design decision, learning, user preference, project preference, issue, context, recurring pattern, conventions pattern
6. **Template Rendering:** Created memories include all template fields with proper YAML frontmatter

---

### Phase 3: System Integration

**Goal:** Memory blocks injected into system prompt with metadata and defaults

**Dependencies:** Phase 2 (Memory Operations & Types)

**Requirements Mapped:**
- INTG-01: Memory blocks injected into system prompt
- INTG-02: Default blocks auto-created: persona, human, project
- INTG-03: Block descriptions guide agent usage
- INTG-04: Metadata fields: label, description, limit, read_only, created_at, updated_at

**Success Criteria (Observable Behaviors):**

1. **Prompt Injection:** Memory blocks automatically appear in OpenCode's system prompt in XML-like format
2. **Default Blocks:** On first run in a new project, persona.md, human.md, and project.md are auto-created
3. **Block Guidance:** Memory block descriptions are visible to the agent and guide when/how to use each block
4. **Metadata Respect:** Read-only blocks cannot be modified; size limits are enforced; timestamps track creation and updates
5. **Scoped Memory:** Global memories (from ~/.config/) and project memories (from .opencode/) both appear in prompt when relevant

---

### Phase 4: Self-Editing Capabilities

**Goal:** Agent can autonomously manage its own memory blocks

**Dependencies:** Phase 3 (System Integration)

**Requirements Mapped:**
- EDIT-01: Agent can call `memory_compound` on its own memory
- EDIT-02: Agent can create new memory blocks via `memory_remember`
- EDIT-03: Block descriptions explain when/how to use each block

**Success Criteria (Observable Behaviors):**

1. **Autonomous Updates:** Agent can update its own persona block without explicit user instruction
2. **Pattern Recognition:** Agent can create new memory blocks when it identifies recurring patterns or important context
3. **Usage Guidance:** Agent understands from block descriptions which memories to update for different scenarios
4. **Learning Persistence:** Agent's learnings from previous sessions are available and applied to current context

---

### Phase 5: QMD Integration

**Goal:** Full qmd integration with hybrid search, indexing, and read-only external sources

**Dependencies:** Phase 4 (Self-Editing Capabilities)

**Requirements Mapped:**
- QMD-01: qmd connected as MCP resource
- QMD-02: Use qmd to recall memories via hybrid search (BM25 + vector)
- QMD-03: Store memories with defined memory types
- QMD-04: Update qmd index after memory creation/update/deletion
- QMD-05: READ-ONLY memories from external config paths

**Success Criteria (Observable Behaviors):**

1. **MCP Connection:** qmd runs as an MCP resource accessible to the plugin
2. **Hybrid Search:** Memory recall uses BM25 + vector search for relevance ranking
3. **Type-Aware Storage:** Memories are stored in qmd collections named by memory type
4. **Index Synchronization:** qmd index is updated automatically after any memory change
5. **External Sources:** Memories from external config paths appear in recall results but cannot be modified by agent or tools

---

### Phase 6: Compounding Engineering

**Goal:** Intelligent context compaction to prevent context rot and maintain memory freshness

**Dependencies:** Phase 5 (QMD Integration)

**Requirements Mapped:**
- COMP-01: Implement compounding engineering to solve context rot
- COMP-02: `memory_compound` merges new learnings intelligently (consolidate contradictions, preserve details, summarize redundancy)
- COMP-03: Auto-prompt on session idle: "Compound learnings into memory? (Y/N)"
- COMP-04: Config option to disable auto-compound prompt
- COMP-05: Manual `memory_compound` tool always available
- COMP-06: qmd re-index triggered after compounding

**Success Criteria (Observable Behaviors):**

1. **Context Preservation:** Agent performance does not degrade as conversation length increases
2. **Intelligent Merging:** When compounding, contradictions are resolved, important details preserved, redundant information summarized
3. **Auto-Prompt:** When a task completes (session idle), user is prompted to compound learnings (can be disabled in config)
4. **Manual Control:** User can trigger compounding on-demand at any time
5. **Fresh Index:** Search results reflect compounded content immediately after operation

---

### Phase 7: CLI Interface

**Goal:** Standalone CLI for installation and management

**Dependencies:** Phase 1 (Core Infrastructure) — can be developed in parallel after Phase 1

**Requirements Mapped:**
- CLI-01: `bunx opencode-historian install` — Install sqlite and qmd

**Success Criteria (Observable Behaviors):**

1. **Installation Command:** Running `bunx opencode-historian install` sets up required dependencies (sqlite, qmd)
2. **Dependency Prompt:** If sqlite is not present, user is prompted with installation instructions
3. **qmd Setup:** qmd is installed via appropriate method for the platform
4. **Verification:** After install, user can verify setup with a status check

---

## Progress

| Phase | Status | Requirements | Success Criteria Met |
|-------|--------|--------------|---------------------|
| 1 - Core Infrastructure | 🔵 Pending | 15/41 | 0/5 |
| 2 - Memory Operations | 🔵 Pending | 10/41 | 0/6 |
| 3 - System Integration | 🔵 Pending | 4/41 | 0/5 |
| 4 - Self-Editing | 🔵 Pending | 3/41 | 0/4 |
| 5 - QMD Integration | 🔵 Pending | 5/41 | 0/5 |
| 6 - Compounding | 🔵 Pending | 6/41 | 0/5 |
| 7 - CLI Interface | 🔵 Pending | 1/41 | 0/4 |

**Overall:** 0/41 requirements completed, 0/34 success criteria met

---

## Phase Dependencies

```
Phase 1 (Infrastructure)
    ↓
    ├──→ Phase 2 (Operations) → Phase 3 (Integration) → Phase 4 (Self-Editing) → Phase 5 (QMD) → Phase 6 (Compounding)
    ↓
Phase 7 (CLI) [can run parallel after Phase 1]
```

---

## Coverage Validation

✓ **100% Coverage:** All 41 v1 requirements mapped to exactly one phase  
✓ **No Orphans:** Every requirement contributes to at least one success criterion  
✓ **No Duplicates:** No requirement appears in multiple phases  

### Requirement-to-Phase Mapping

| Requirement ID | Phase | Success Criteria |
|----------------|-------|------------------|
| CORE-01 | 1 | Plugin Registration |
| CORE-02 | 1 | Storage Initialization |
| CORE-03 | 1 | Project Storage |
| CORE-04 | 1 | (enables all file operations) |
| CORE-05 | 1 | (enables indexing) |
| CORE-06 | 1 | (naming convention) |
| CONF-01 | 1 | Configuration Validation |
| CONF-02 | 1 | Configuration Validation |
| CONF-03 | 1 | Configuration Validation |
| CONF-04 | 1 | Configuration Validation |
| STRC-01 | 1 | Project Structure |
| STRC-02 | 1 | Project Structure |
| STRC-03 | 1 | Project Structure |
| STRC-04 | 1 | Project Structure |
| STRC-05 | 1 | Project Structure |
| CRUD-01 | 2 | Memory Creation |
| CRUD-03 | 2 | Memory Retrieval |
| CRUD-04 | 2 | Memory Update |
| CRUD-05 | 2 | Memory Deletion |
| TYPE-01 | 2 | Type Selection |
| TYPE-02 | 2 | Type Selection |
| TYPE-03 | 2 | Type Selection |
| TMPL-01 | 2 | Template Rendering |
| TMPL-02 | 2 | Template Rendering |
| INTG-01 | 3 | Prompt Injection |
| INTG-02 | 3 | Default Blocks |
| INTG-03 | 3 | Block Guidance |
| INTG-04 | 3 | Metadata Respect |
| EDIT-01 | 4 | Autonomous Updates |
| EDIT-02 | 4 | Pattern Recognition |
| EDIT-03 | 4 | Usage Guidance |
| QMD-01 | 5 | MCP Connection |
| QMD-02 | 5 | Hybrid Search |
| QMD-03 | 5 | Type-Aware Storage |
| QMD-04 | 5 | Index Synchronization |
| QMD-05 | 5 | External Sources |
| COMP-01 | 6 | Context Preservation |
| COMP-02 | 6 | Intelligent Merging |
| COMP-03 | 6 | Auto-Prompt |
| COMP-04 | 6 | Auto-Prompt |
| COMP-05 | 6 | Manual Control |
| COMP-06 | 6 | Fresh Index |
| CLI-01 | 7 | Installation Command |

---

## Success Criteria by Category

### User Experience (12 criteria)
1. Plugin appears in OpenCode's registered tools list
2. Global and project memory folders auto-create
3. Configuration validates user settings
4. User can create memories with natural language
5. User can search and retrieve memories
6. User can update and delete memories
7. Memory blocks appear in system prompt
8. Default blocks auto-create on first run
9. Agent autonomously manages its memory
10. Search uses hybrid BM25 + vector ranking
11. Auto-prompt for compounding on task completion
12. CLI install command sets up dependencies

### Data Integrity (8 criteria)
1. YAML frontmatter format consistent
2. Template variables render correctly
3. Metadata fields tracked (created_at, updated_at)
4. Read-only blocks cannot be modified
5. Size limits enforced
6. Contradictions resolved during compounding
7. Important details preserved during merges
8. Redundant information summarized

### System Integration (7 criteria)
1. MCP registration successful
2. bun:sqlite provides metadata/indexing
3. qmd connected as MCP resource
4. Index updates after memory changes
5. External sources appear read-only
6. qmd re-index after compounding
7. Scoped memory (global + project) works

### Agent Intelligence (7 criteria)
1. Nine memory types available
2. Block descriptions guide usage
3. Agent understands when to use each block
4. Agent updates persona autonomously
5. Agent creates blocks for patterns
6. Learning persists across sessions
7. Context performance doesn't degrade

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| qmd integration complexity | High | Phase 5 isolated; can use simpler search in Phase 2-3 |
| Context rot in long sessions | High | Phase 6 addresses directly with compounding |
| File-based storage performance | Medium | bun:sqlite provides indexing; qmd handles search |
| MCP protocol changes | Low | SDK version pinned; v2 migration deferred to post-v1 |
| Over-eager auto-compounding | Medium | Configurable; user can disable and trigger manually |

---

## Definition of Done

The v1 roadmap is complete when:

- [ ] All 41 v1 requirements are implemented
- [ ] All 34 success criteria are met
- [ ] Plugin is installable via `bunx opencode-historian install`
- [ ] Agent can store, retrieve, update, and delete memories
- [ ] Memories persist across OpenCode sessions
- [ ] Compounding prevents context rot in long conversations
- [ ] Documentation complete (README, API docs, examples)

---

## Next Steps

1. **Current Phase:** Phase 1 - Core Infrastructure
2. **Next Action:** `/gsd-plan-phase 1` to create detailed plan for Phase 1
3. **Parallel Work:** Phase 7 (CLI) can be planned once Phase 1 structure is stable

---

*Last updated: 2026-02-13*  
*Roadmap version: 1.0.0*
