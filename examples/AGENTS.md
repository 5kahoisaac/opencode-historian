# AGENTS.md - Agents' Basic Accomplishments and Rules

---

## Maximum Truth Seeking

- Pursue optimal solutions relentlessly; never abandon search for better practices/fixes.
- Absolute honesty: State problems/flaws/uncertainties openly and immediately.
- Emotion-free cognition: Eliminate emotional bias from all reasoning.
- Perfection commitment: Verify every claim; execute with maximum accuracy.

---

## Precision Code Operations

Prioritize **Serena MCP** for code symbol navigation, reference finding, renaming,
targeted inserts/deletes/edits.

> CRITICAL: Use `@historian` subagent or the **mnemonics** skill for memory operations.
> Serena memory tools are INTERNAL to Serena — NEVER use them for project memories.

### Serena MCP – Code Precision (LSP-powered)

Call **activate_project** first on new sessions.  
Verify with **check_onboarding_performed**.

**Core Symbol Tools**
- **find_symbol** — precise global/local symbol location
- **find_referencing_symbols** — all references/uses
- **rename_symbol** — safe codebase-wide rename
- **replace_symbol_body** — replace entire symbol definition

**Targeted Edit Tools**
- **insert_after_symbol** — add content after symbol end
- **insert_before_symbol** — add content before symbol start
- **replace_lines** — replace specific line range
- **delete_lines** — remove specific line range

**Analysis Tools**
- **get_symbols_overview** — top-level symbols in file
- **search_for_pattern** — regex fallback (non-symbol cases only)

**Memory Tools (INTERNAL to Serena)**
- **write_memory** / **read_memory** — for Serena's own bookkeeping during code
  navigation
- **NOT for storing/recalling project memories** — delegate to historian agent

### Memory & Semantic Search – Use @historian or mnemonics skill

Memory tools are **ONLY available via the historian subagent**. You have two options:

1. **Direct invocation:** `@historian remember that we use PostgreSQL`
2. **Load mnemonics skill:** Use the skill for detailed guidance on memory types

> **NEVER confuse Serena memory tools with historian memory tools.**
> - `serena_write_memory` / `serena_read_memory` → INTERNAL to Serena for code navigation
> - `memory_remember` / `memory_recall` → Available ONLY via @historian subagent

**Memory Tools (via @historian only)**
- `memory_remember` — create new memories or update existing ones
- `memory_recall` — search and retrieve memories (keyword or semantic)
- `memory_forget` — delete memories by file path
- `memory_list_types` — list available memory types in the project
- `memory_sync` — reindex after manual file changes (rarely needed)

**When to Use @historian**
- Storing project knowledge, decisions, or learnings
- Recalling relevant context from past sessions
- Semantic search across docs, notes, or transcripts
- Reindexing after manual external file modifications

### Tool Selection Table

| Task | Use This |
|------|----------|
| Code symbol navigation (find, rename, references) | Serena |
| Code edits (insert, replace, delete) | Serena |
| Store/recall project memories | `@historian` or **mnemonics** skill |
| Semantic search across docs/notes | `@historian` or **mnemonics** skill |
| Reindex after manual file changes | `@historian sync` |

### Best Practices

1. Start sessions: `activate_project` (Serena)
2. For memory: use `@historian` or load **mnemonics** skill
3. **NEVER** use `serena_*_memory` tools for project memories
4. Minimize broad searches; target narrow queries
5. Verify edits: read_file or symbol overview before/after changes
6. Fallback: shell only when MCPs cannot help

---
