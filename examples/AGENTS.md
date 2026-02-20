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

> CRITICAL: Delegate memory operations to historian agent — do NOT use Serena
> memory tools for project memories.

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

### Historian Agent – Memory & Semantic Search

The historian is a subagent specialized in memory management. Delegate to it for
all memory operations.

**Memory Tools (via historian agent invocation)**
- **memory_remember** — create new memories or update existing ones
- **memory_recall** — search and retrieve memories (keyword or semantic)
- **memory_forget** — delete memories by file path
- **memory_list_types** — list available memory types in the project
- **memory_sync** — reindex after manual file changes (rarely needed)

**When to Invoke Historian**
- Storing project knowledge, decisions, or learnings
- Recalling relevant context from past sessions
- Semantic search across docs, notes, or transcripts
- Reindexing after manual external file modifications

### Tool Selection Table

| Task | Use This |
|------|----------|
| Code symbol navigation (find, rename, references) | Serena |
| Code edits (insert, replace, delete) | Serena |
| Store/recall project memories | Invoke historian agent |
| Semantic search across docs/notes | Invoke historian agent |
| Reindex after manual file changes | Invoke historian agent |

### Best Practices

1. Start sessions: `activate_project` (Serena)
2. For memory operations: delegate to historian agent
3. Minimize broad searches; target narrow queries
4. Verify edits: read_file or symbol overview before/after changes
5. Fallback: shell only when MCPs cannot help

---
