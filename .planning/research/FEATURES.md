# Feature Landscape: AI Agent Historian/Memory Systems

**Domain:** AI agent memory management for OpenCode
**Researched:** February 13, 2026
**Confidence:** HIGH (verified with Context7-equivalent sources, official docs, and multiple ecosystem sources)

## Research Summary

AI agent memory systems have evolved from simple conversation buffers to sophisticated context management platforms. The key insight from 2025-2026 research: **effective agent memory is about context engineering, not just storage**.

Three dominant architectures emerged:
1. **Memory Blocks** (Letta/MemGPT): Self-editing structured sections that stay in context
2. **Knowledge Graphs** (Zep): Entity-relationship tracking with temporal facts
3. **Structured Summarization** (Mem0): Condensed memory with conflict resolution

For OpenCode plugins specifically, the `opencode-agent-memory` project (38 stars) demonstrates the viability of Letta-style memory blocks adapted for OpenCode's plugin architecture.

---

## Table Stakes (Users Expect These)

Features users assume exist. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Persistent Storage** | Agents must remember across sessions | Low | File-based (markdown) is acceptable; no database required for MVP |
| **CRUD Operations** | Basic create/read/update/delete of memories | Low | Via MCP tools (`memory_set`, `memory_list`, `memory_replace`) |
| **Scoped Memory** | Global (cross-project) vs Project-specific | Low | Global: `~/.config/opencode/memory/`, Project: `.opencode/memory/` |
| **Human-Readable Format** | Users want to see/edit memory directly | Low | Markdown with YAML frontmatter is standard (Letta, opencode-agent-memory) |
| **Metadata Support** | Labels, descriptions, limits, timestamps | Low | YAML frontmatter fields: `label`, `description`, `limit`, `read_only` |
| **System Prompt Injection** | Memory must appear in agent context | Medium | Blocks prepended to system prompt in XML-like format |

**Confidence:** HIGH — These are universal across all memory products (Letta, Zep, Mem0, OpenCode-agent-memory).

---

## Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Self-Editing Memory** | Agent autonomously maintains its own memory | Medium | Core Letta innovation — agent uses tools to update blocks |
| **Memory Block Descriptions** | Agent knows *how* to use each block | Low | Critical for self-editing; describes purpose in natural language |
| **Read-Only Blocks** | Share policies without modification risk | Low | For org standards, coding guidelines, project conventions |
| **Shared Blocks** | Multiple agents access same memory | Medium | Update once, visible everywhere; coordination primitive |
| **Block Size Limits** | Prevent context overflow | Low | Configurable `limit` field (default ~5000 chars) |
| **Selective Retrieval** | Only load relevant blocks | Medium | Filter by label, search by description |
| **Memory Versioning** | Track changes over time | High | Git-like history for memory blocks |
| **Conflict Resolution** | Handle concurrent edits | High | Last-write-wins vs merge strategies |
| **Memory Templates** | Pre-defined block structures | Low | Seed with persona/human/project blocks |
| **Temporal Tracking** | When was memory created/updated | Medium | Automatic timestamps in metadata |

**Confidence:** MEDIUM-HIGH — Self-editing blocks are proven (Letta, opencode-agent-memory). Versioning and conflict resolution are advanced features not yet common.

---

## Anti-Features (Deliberately NOT Building)

Features that seem good but create problems.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| **Automatic Memory Capture** | "Just remember everything" | Creates noise; agent forgets what's important | Self-editing — agent decides what to store |
| **Vector Search / Embeddings** | "Find similar memories" | Adds complexity (vector DB, embeddings API); often unnecessary | File-based with label/description search |
| **Complex Knowledge Graphs** | "Track entities and relationships" | High complexity, requires NER, relationship extraction | Simple structured blocks with descriptions |
| **Unlimited Memory Size** | "Store everything forever" | Context window limits; degrades performance | Size limits with archival strategy |
| **Real-time Sync** | "Keep memory in sync across machines" | Conflict nightmares; network dependencies | Git-based or manual sync |
| **Fine-grained Permissions** | "Control who can edit what" | Over-engineering for single-user agent tool | Read-only blocks, simple file permissions |

**Confidence:** HIGH — These anti-patterns are well-documented in memory system literature and post-mortems.

---

## Feature Dependencies

```
Self-Editing Memory
    └──requires──> Memory Block Descriptions
                       └──requires──> CRUD Operations
    └──requires──> System Prompt Injection

Shared Blocks
    └──requires──> Block IDs / Reference System
    └──enhances──> Read-Only Blocks

Scoped Memory (Global/Project)
    └──requires──> Persistent Storage

Memory Templates
    └──requires──> Scoped Memory
    └──requires──> Default Blocks (persona, human, project)

Temporal Tracking
    └──requires──> Metadata Support
```

### Dependency Notes

- **Self-editing requires descriptions:** Without descriptions, agent doesn't know how to use blocks effectively (Letta docs emphasize this)
- **Shared blocks need references:** Requires block ID system or symbolic links for cross-referencing
- **Templates need scope:** Different default blocks for global vs project context

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] **Persistent Storage** — Markdown files in `~/.config/opencode/memory/` and `.opencode/memory/`
- [ ] **CRUD Operations** — MCP tools: `memory_list`, `memory_set`, `memory_replace`
- [ ] **Scoped Memory** — Global blocks (cross-project) and Project blocks (codebase-specific)
- [ ] **Metadata Support** — YAML frontmatter: `label`, `description`, `limit`, `read_only`
- [ ] **System Prompt Injection** — Blocks appear in system prompt
- [ ] **Default Blocks** — Auto-create `persona`, `human`, `project` blocks on first run
- [ ] **Memory Block Descriptions** — Critical for agent understanding

**Why these?** These match the successful `opencode-agent-memory` plugin (47 stars) which proves the concept works.

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **Self-Editing Memory** — Agent uses tools to modify its own memory
- [ ] **Read-Only Blocks** — For policies and guidelines
- [ ] **Block Size Limits** — Enforce `limit` field
- [ ] **Selective Retrieval** — Filter blocks by label
- [ ] **Memory Templates** — User-defined block templates

**Trigger for adding:** User feedback requesting agent autonomy or policy enforcement.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Shared Blocks** — Multiple agents accessing same memory
- [ ] **Memory Versioning** — Git-like history
- [ ] **Conflict Resolution** — Handle concurrent edits
- [ ] **Temporal Tracking** — Automatic timestamps
- [ ] **Archival Strategy** — Move old memory to external storage

**Why defer?** These add significant complexity; validate basic use case first.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Persistent Storage | HIGH | LOW | P1 |
| CRUD Operations | HIGH | LOW | P1 |
| Scoped Memory | HIGH | LOW | P1 |
| Metadata Support | HIGH | LOW | P1 |
| System Prompt Injection | HIGH | MEDIUM | P1 |
| Default Blocks | HIGH | LOW | P1 |
| Memory Block Descriptions | HIGH | LOW | P1 |
| Self-Editing Memory | HIGH | MEDIUM | P2 |
| Read-Only Blocks | MEDIUM | LOW | P2 |
| Block Size Limits | MEDIUM | LOW | P2 |
| Selective Retrieval | MEDIUM | MEDIUM | P2 |
| Shared Blocks | MEDIUM | HIGH | P3 |
| Memory Versioning | LOW | HIGH | P3 |
| Conflict Resolution | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Letta/MemGPT | Zep | Mem0 | opencode-agent-memory | Our Approach |
|---------|--------------|-----|------|----------------------|--------------|
| Memory Blocks | ✅ Core feature | ❌ Graph-based | ❌ Summarization | ✅ Yes | ✅ Yes (primary) |
| Self-Editing | ✅ Yes | ❌ Auto-extract | ❌ Auto-extract | ✅ Yes | ✅ Yes (P2) |
| Knowledge Graph | ❌ No | ✅ Core | ❌ No | ❌ No | ❌ No (anti-feature) |
| Vector Search | ❌ No | ✅ Yes | ✅ Yes | ❌ No | ❌ No (anti-feature) |
| Scoped Memory | ✅ Global/Agent | ✅ User-scoped | ✅ User-scoped | ✅ Global/Project | ✅ Global/Project |
| Read-Only Blocks | ✅ Yes | ❌ No | ❌ No | ❌ No | ✅ Yes (P2) |
| Open Source | ✅ Yes | ❌ Partial | ✅ Yes | ✅ Yes | ✅ Yes |
| MCP Integration | ❌ No | ❌ No | ❌ No | ❌ No | ✅ Yes (target) |

**Key Differentiator:** We combine Letta's proven memory block architecture with MCP integration for OpenCode, while avoiding the complexity of vector search and knowledge graphs that Zep/Mem0 require.

---

## Sources

### Primary Sources (HIGH Confidence)

1. **Letta Documentation** — https://docs.letta.com/guides/agents/memory-blocks/
   - Official documentation for memory blocks architecture
   - Block structure: label, description, value, limit
   - Self-editing memory patterns

2. **opencode-agent-memory GitHub** — https://github.com/joshuadavidthomas/opencode-agent-memory
   - Working OpenCode plugin with 47 stars
   - Proves memory blocks work for OpenCode
   - Default blocks: persona, human, project

3. **Letta Blog: Memory Blocks** — https://www.letta.com/blog/memory-blocks
   - Origin of memory block concept from MemGPT research
   - Block descriptions are critical for agent usage

### Secondary Sources (MEDIUM Confidence)

4. **The New Stack: Memory for AI Agents** — https://thenewstack.io/memory-for-ai-agents-a-new-paradigm-of-context-engineering/
   - Three design philosophies: vector store, summarization, graph
   - Memory requires both technical and philosophical clarity

5. **Sparkco: AI Agent Memory Systems** — https://sparkco.ai/blog/ai-agent-memory-systems-architecture-and-innovations
   - Multi-tiered memory architecture
   - Short-term, episodic, long-term memory layers

6. **Zep vs Mem0 Comparison** — https://www.getzep.com/mem0-vs-zep-agent-memory
   - Accuracy and latency benchmarks
   - Knowledge graph vs summarization approaches

### Tertiary Sources (Verifying Patterns)

7. **MCP Protocol Documentation** — https://modelcontextprotocol.io/
   - Standard for AI tool integration
   - Memory server patterns

8. **Medium: Building AI Agents That Remember** — https://medium.com/@pankaj_pandey/building-ai-agents-that-actually-remember-memory-management-options-for-ai-agents-in-2025-de03ce4105ff
   - Memory importance for personalization
   - Framework comparison (LangChain, Agno, AutoGen, CrewAI)

---

*Feature research for: AI Agent Historian/Memory Systems*
*Researched: February 13, 2026*
