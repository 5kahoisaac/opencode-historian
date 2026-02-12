# Architecture Patterns: AI Agent Memory/Historian Systems

**Domain:** AI Agent Memory Management (OpenCode Historian Plugin)  
**Researched:** February 13, 2026  
**Confidence:** HIGH (based on current industry patterns and official sources)

---

## Executive Summary

Modern AI agent memory systems are built on a **multi-tiered architecture** that mirrors human cognitive processes. For the opencode-historian plugin, the recommended architecture combines:

1. **Short-term/Working Memory** - Immediate conversation context within the active session
2. **Core Memory** - Structured, editable memory blocks (user preferences, project context)
3. **Recall Memory** - Searchable conversation history powered by qmd
4. **Archival Memory** - Long-term knowledge storage with vector + BM25 hybrid search

The architecture is built around the **MCP (Model Context Protocol)** for tool integration and **qmd (Query Markdown Documents)** for local, file-based memory storage with hybrid search capabilities.

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         OpenCode Historian Architecture                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AGENT LAYER (OpenCode)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Agent 1    │  │   Agent 2    │  │   Agent N    │  │  Historian   │         │
│  │  (Active)    │  │  (Active)    │  │  (Active)    │  │   (Plugin)   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────┘
          │                 │                 │                 │
          └─────────────────┴─────────────────┴─────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   MCP Protocol     │
                    │   (std/stdio)      │
                    └─────────┬──────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────────────────┐
│                         HISTORIAN SERVICE LAYER                                  │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                        Memory Manager                                      │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │   Working    │  │    Core      │  │   Recall     │  │  Archival    │   │  │
│  │  │   Memory     │  │   Memory     │  │   Memory     │  │   Memory     │   │  │
│  │  │  (In-Mem)    │  │  (Editable)  │  │  (History)   │  │  (Vectors)   │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                        Storage Backend (qmd)                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │ BM25 Search  │  │Vector Search │  │   SQLite     │  │  Markdown    │   │  │
│  │  │   (FTS5)     │  │  (sqlite-vec)│  │   (Index)    │  │   (Source)   │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   LSP Integration  │
                    │   (Optional)       │
                    └─────────┬──────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────────────────┐
│                         PROJECT FILESYSTEM                                       │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  .opencode/                                                                │  │
│  │  ├── memories/           # Memory storage directory                        │  │
│  │  │   ├── working/       # Session-based temporary memory                  │  │
│  │  │   ├── core/          # Editable memory blocks (user prefs, project)     │  │
│  │  │   │   ├── user.md    # User preferences and facts                       │  │
│  │  │   │   ├── project.md # Project-specific context                         │  │
│  │  │   │   └── skills.md  # Learned skills and procedures                    │  │
│  │  │   ├── history/      # Conversation logs                                 │  │
│  │  │   └── archive/      # Long-term knowledge (auto-organized)              │  │
│  │  └── index.sqlite      # qmd search index                                  │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### 1. Memory Manager

| Aspect | Details |
|--------|---------|
| **Responsibility** | Orchestrates memory operations across all tiers; decides what to store, retrieve, and forget |
| **Communicates With** | MCP Server, qmd storage backend, LSP client |
| **Key Operations** | `store()`, `retrieve()`, `update()`, `delete()`, `search()`, `consolidate()` |
| **State Management** | Maintains active working memory in-memory; persists to qmd on checkpoint |

**Why this boundary:** Centralizes memory logic and abstracts storage complexity from agents.

### 2. MCP Server

| Aspect | Details |
|--------|---------|
| **Responsibility** | Exposes memory operations as MCP tools for OpenCode integration |
| **Communicates With** | OpenCode agents, Memory Manager |
| **Key Operations** | `memory_store`, `memory_retrieve`, `memory_search`, `memory_update` |
| **Transport** | stdio (default) or HTTP (daemon mode) |

**Why this boundary:** Provides standardized protocol for any MCP-compatible client to use historian capabilities.

### 3. qmd Storage Backend

| Aspect | Details |
|--------|---------|
| **Responsibility** | File-based storage with hybrid search (BM25 + vector + reranking) |
| **Communicates With** | Memory Manager |
| **Key Operations** | Index markdown, generate embeddings, search, retrieve |
| **Storage** | SQLite index + markdown source files |

**Why this boundary:** Leverages proven qmd architecture for local-first, git-friendly memory storage.

### 4. LSP Integration (Optional)

| Aspect | Details |
|--------|---------|
| **Responsibility** | Provides IDE-like features for memory management (completions, hovers, diagnostics) |
| **Communicates With** | VS Code, Cursor, other LSP clients |
| **Key Operations** | Memory completions, context-aware suggestions, memory validation |

**Why this boundary:** Enables advanced IDE integration for manual memory curation.

### 5. Memory Tiers

#### Working Memory (Short-term)
| Property | Value |
|----------|-------|
| **Lifetime** | Session-only (lost on agent restart) |
| **Storage** | In-memory (TypeScript Map/Set) |
| **Purpose** | Active conversation context, reasoning scratchpad |
| **Eviction** | FIFO with summarization before eviction |

#### Core Memory
| Property | Value |
|----------|-------|
| **Lifetime** | Persistent, user-managed |
| **Storage** | Markdown files (user.md, project.md, skills.md) |
| **Purpose** | User preferences, project context, learned skills |
| **Updates** | Via explicit API calls or agent self-modification |

#### Recall Memory
| Property | Value |
|----------|-------|
| **Lifetime** | Persistent, searchable history |
| **Storage** | Markdown logs + qmd index |
| **Purpose** | Full conversation history for retrieval |
| **Search** | BM25 + semantic hybrid |

#### Archival Memory
| Property | Value |
|----------|-------|
| **Lifetime** | Long-term, automatically organized |
| **Storage** | Markdown files organized by topic/time + vectors |
| **Purpose** | Condensed knowledge, extracted facts, patterns |
| **Maintenance** | Periodic consolidation by sleep-time agents |

---

## Data Flow

### 1. Memory Storage Flow

```
Agent Interaction
       │
       ▼
┌───────────────┐
│ Memory Manager │◄─── Decides: working / core / recall / archive
└───────┬───────┘
        │
        ├──► Working Memory ──► In-Memory Store
        │
        ├──► Core Memory ─────► Markdown File (user.md, project.md)
        │                         │
        │                         ▼
        │                    qmd Index Update
        │
        ├──► Recall Memory ───► Conversation Log (markdown)
        │                         │
        │                         ▼
        │                    qmd Index Update
        │
        └──► Archival Memory ─► Extracted Facts (markdown)
                                  │
                                  ▼
                             Vector Embedding
                                  │
                                  ▼
                             sqlite-vec Store
```

### 2. Memory Retrieval Flow

```
Agent Query
     │
     ▼
┌─────────────────┐
│  Memory Manager  │◄─── Determines which tier(s) to query
└────────┬────────┘
         │
         ├──► Check Working Memory (fast, in-memory)
         │
         ├──► Search Core Memory (file-based)
         │
         ├──► Search Recall Memory (qmd BM25 + vector)
         │
         └──► Search Archival Memory (vector semantic)
         │
         ▼
┌─────────────────┐
│  Result Fusion   │◄─── RRF (Reciprocal Rank Fusion) + scoring
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Return to Agent │
└─────────────────┘
```

### 3. Memory Consolidation Flow (Background)

```
Trigger (scheduled, idle time, or memory pressure)
     │
     ▼
┌─────────────────┐
│ Extractor Agent │◄─── Reviews recent conversations
└────────┬────────┘
         │
         ├──► Identify key facts, decisions, preferences
         │
         ├──► Summarize long conversations
         │
         ├──► Extract skills learned
         │
         └──► Update Core Memory files
         │
         ▼
┌─────────────────┐
│  qmd Re-index    │◄─── Update embeddings and FTS index
└─────────────────┘
```

---

## Suggested Build Order

Based on component dependencies, the recommended implementation sequence:

### Phase 1: Foundation (Core Memory Tier)
**Goal:** Basic memory storage and retrieval

1. **Memory Manager Core**
   - Define memory interfaces and types
   - Implement in-memory working memory
   - Build CRUD operations for core memory

2. **Markdown Storage**
   - Implement file-based storage for core memory
   - Define schema for user.md, project.md, skills.md
   - Add file watching for external edits

3. **Basic MCP Server**
   - Expose `memory_store` and `memory_retrieve` tools
   - stdio transport for OpenCode integration

**Dependencies:** None (self-contained)
**Enables:** Basic memory persistence across sessions

### Phase 2: Search (Recall Memory Tier)
**Goal:** Searchable conversation history

4. **qmd Integration**
   - Integrate qmd for BM25 + vector indexing
   - Configure collection for conversation history
   - Implement embedding generation

5. **Recall Memory Implementation**
   - Log conversations to markdown
   - Auto-index on new entries
   - Implement search API

6. **Enhanced MCP Tools**
   - Add `memory_search` tool
   - Add `memory_query` with hybrid search
   - Support filters (time, collection, score threshold)

**Dependencies:** Phase 1 complete
**Enables:** "What did we decide last week?" queries

### Phase 3: Intelligence (Archival Memory + Consolidation)
**Goal:** Automatic memory organization

7. **Archival Memory**
   - Implement extracted fact storage
   - Build topic-based organization
   - Add vector-only semantic search

8. **Memory Consolidation**
   - Build extractor for key facts
   - Implement summarization
   - Add skill extraction

9. **Sleep-Time Compute**
   - Background memory reorganization
   - Periodic consolidation jobs
   - Memory decay/expiration

**Dependencies:** Phase 2 complete
**Enables:** Self-improving memory over time

### Phase 4: Advanced Features
**Goal:** Production-ready features

10. **LSP Integration**
    - Memory-aware completions
    - Hover information for memory references
    - Diagnostics for memory issues

11. **Multi-Agent Support**
    - Shared memory spaces
    - Agent-specific memory isolation
    - Memory access control

12. **Performance Optimization**
    - Caching layer
    - HTTP transport for daemon mode
    - Memory compression

**Dependencies:** Phase 3 complete
**Enables:** IDE integration, team workflows

---

## Patterns to Follow

### Pattern 1: Memory as Context Engineering

**What:** Design memory systems around the context window, not human memory analogies.

**Implementation:**
```typescript
// Don't store raw conversations
// Store distilled context that fits efficiently

interface CoreMemoryBlock {
  label: string;        // e.g., "user_preferences"
  description: string;  // "User's coding preferences"
  value: string;        // The actual content for context window
  limit: number;        // Character limit for this block
}

// The memory manager decides what goes into the context window
function buildContextWindow(
  workingMemory: Message[],
  coreMemory: CoreMemoryBlock[],
  retrievedMemories: RetrievedMemory[]
): ContextWindow {
  // Prioritize: core > recent working > retrieved
  // Respect token limits
}
```

**When to use:** Always. The fundamental principle of agent memory.

### Pattern 2: Hybrid Search (BM25 + Vector + Reranking)

**What:** Combine keyword search (exact matches) with semantic search (concept similarity) and LLM reranking.

**Implementation:**
```typescript
interface SearchOptions {
  query: string;
  mode: 'fast' | 'balanced' | 'deep';
  collections?: string[];
  minScore?: number;
}

async function hybridSearch(options: SearchOptions): Promise<SearchResult[]> {
  // 1. Query expansion (LLM generates variations)
  const queries = await expandQuery(options.query);
  
  // 2. Parallel BM25 + vector search for each query
  const bm25Results = await Promise.all(
    queries.map(q => bm25Search(q))
  );
  const vectorResults = await Promise.all(
    queries.map(q => vectorSearch(q))
  );
  
  // 3. RRF Fusion (Reciprocal Rank Fusion)
  const fused = reciprocalRankFusion([
    ...bm25Results,
    ...vectorResults
  ]);
  
  // 4. LLM reranking for top candidates
  if (options.mode === 'deep') {
    return await rerankWithLLM(fused, options.query);
  }
  
  return fused;
}
```

**When to use:** For all memory retrieval operations. Provides best balance of precision and recall.

### Pattern 3: Tiered Memory with Automatic Promotion

**What:** Information flows upward: working → recall → archival, with automatic extraction and summarization.

**Implementation:**
```typescript
interface MemoryTier {
  store(event: MemoryEvent): Promise<void>;
  retrieve(query: string): Promise<Memory[]>;
  consolidate(): Promise<void>;  // Promote to next tier
}

class WorkingMemoryTier implements MemoryTier {
  private buffer: Message[] = [];
  private maxSize = 20;  // messages
  
  async store(event: MemoryEvent): Promise<void> {
    this.buffer.push(event);
    
    if (this.buffer.length > this.maxSize) {
      // Summarize and promote oldest to recall
      const toSummarize = this.buffer.splice(0, 10);
      const summary = await summarize(toSummarize);
      await recallTier.store({ type: 'summary', content: summary });
    }
  }
  
  async consolidate(): Promise<void> {
    // Extract facts from working memory
    const facts = await extractFacts(this.buffer);
    await archivalTier.store(facts);
  }
}
```

**When to use:** For managing conversation context and long-term learning.

### Pattern 4: Git-Friendly Markdown Storage

**What:** Store memory as markdown files that work well with version control.

**Implementation:**
```markdown
<!-- .opencode/memories/core/user.md -->
# User Profile

## Preferences
- **Editor**: VS Code with Vim keybindings
- **Language**: TypeScript preferred
- **Style**: Functional programming patterns

## Projects
- Building opencode-historian (AI memory plugin)
- Interested in MCP protocol and LSP integration

## Communication Style
- Prefers concise explanations
- Likes code examples
- Values type safety

<!-- Auto-generated: 2026-02-13T10:30:00Z -->
<!-- Last updated: 2026-02-13T14:22:00Z -->
```

**When to use:** For core memory (user preferences, project context). Enables manual editing and version control.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Raw Conversation History

**What:** Saving every message verbatim without summarization.

**Why bad:** 
- Pollutes retrieval with irrelevant details
- Consumes excessive storage
- Makes semantic search noisy
- Hits context window limits quickly

**Instead:** 
- Summarize conversations before storing
- Extract key facts separately
- Store raw history in recall tier only, not archival

### Anti-Pattern 2: Global Memory Without Scoping

**What:** Single memory space shared across all contexts (users, projects).

**Why bad:**
- Privacy issues (cross-user data leakage)
- Context pollution (irrelevant memories surface)
- Unable to handle multi-tenant scenarios

**Instead:**
- Implement project-scoped memory (like Claude)
- Add user isolation boundaries
- Support memory namespaces

### Anti-Pattern 3: Synchronous Memory Operations on Hot Path

**What:** Blocking agent execution while writing to disk or indexing.

**Why bad:**
- Increases latency
- Degrades user experience
- Can cause timeouts

**Instead:**
- Use async/await for all storage operations
- Buffer writes and flush in background
- Implement write-ahead logging for durability

### Anti-Pattern 4: Over-Engineering Memory Tiers

**What:** Creating too many memory types (episodic, semantic, procedural, emotional, etc.) before proving need.

**Why bad:**
- Adds complexity without value
- Hard to reason about
- Premature optimization

**Instead:**
- Start with 3 tiers: working, core, archival
- Add tiers only when needed
- Let usage patterns drive architecture

### Anti-Pattern 5: Ignoring Memory Decay

**What:** Storing everything forever without expiration or relevance scoring.

**Why bad:**
- Storage grows unbounded
- Retrieval quality degrades over time
- Old irrelevant memories drown out recent relevant ones

**Instead:**
- Implement TTL (time-to-live) for working memory
- Add relevance scoring and decay
- Use Redis-style eviction policies
- Periodic cleanup of stale memories

---

## Scalability Considerations

| Concern | At 100 memories | At 10K memories | At 1M memories |
|---------|-----------------|-----------------|----------------|
| **Storage** | Single SQLite file | Sharded by project | Distributed vector DB |
| **Search Latency** | <10ms (local) | <50ms (indexed) | <100ms (cached) |
| **Indexing** | Real-time | Batch background | Streaming pipeline |
| **Memory Consolidation** | On every write | Hourly batches | Sleep-time compute |
| **Backup** | Git commits | Automated snapshots | Cross-region replication |

### Scaling Strategies

1. **Local-First (Current)**
   - SQLite + local files
   - Suitable for individual developers
   - Git for version control

2. **Team Scale**
   - Shared qmd index on network storage
   - Synchronization protocol
   - Access control per project

3. **Enterprise Scale**
   - Replace SQLite with PostgreSQL + pgvector
   - Redis for working memory cache
   - Separate indexing pipeline

---

## OpenCode Integration Points

### MCP Tools Exposed

```typescript
// Core memory operations
{
  name: 'memory_store',
  description: 'Store information to agent memory',
  inputSchema: {
    content: string,
    tier: 'core' | 'recall' | 'archival',
    metadata?: Record<string, any>
  }
}

{
  name: 'memory_retrieve',
  description: 'Retrieve specific memory by ID',
  inputSchema: {
    memoryId: string
  }
}

{
  name: 'memory_search',
  description: 'Search agent memory',
  inputSchema: {
    query: string,
    tier?: 'all' | 'core' | 'recall' | 'archival',
    limit?: number
  }
}

{
  name: 'memory_update',
  description: 'Update existing memory',
  inputSchema: {
    memoryId: string,
    content: string
  }
}

{
  name: 'memory_get_core',
  description: 'Get core memory blocks for context injection',
  inputSchema: {
    blocks?: string[]  // Specific blocks, or all if omitted
  }
}
```

### LSP Features

| Feature | Description |
|---------|-------------|
| **Memory Completions** | Suggest memory references when typing `@memory` |
| **Hover Information** | Show memory content on hover over references |
| **Go to Definition** | Navigate to source memory file |
| **Find References** | Find where a memory is used |
| **Memory Diagnostics** | Warn about stale or conflicting memories |

---

## Sources

| Source | Confidence | Notes |
|--------|------------|-------|
| [Letta Agent Memory Blog](https://www.letta.com/blog/agent-memory) | HIGH | Current industry leader in agent memory |
| [Redis Memory Management Guide](https://redis.io/blog/build-smarter-ai-agents-manage-short-term-and-long-term-memory-with-redis/) | HIGH | Production memory architecture patterns |
| [MemGPT/Letta Research](https://research.memgpt.ai/) | HIGH | OS-inspired memory virtualization |
| [QMD Repository](https://github.com/tobi/qmd) | HIGH | Hybrid search implementation details |
| [Serokell Memory Patterns](https://serokell.io/blog/design-patterns-for-long-term-memory-in-llm-powered-architectures) | MEDIUM | Comparative architecture analysis |
| [Sparkco AI Memory Systems](https://sparkco.ai/blog/ai-agent-memory-systems-architecture-and-innovations) | MEDIUM | 2025 architecture overview |

---

## Appendix: File Structure

```
.opencode/
├── memories/
│   ├── README.md              # Overview of memory system
│   ├── core/
│   │   ├── user.md            # User preferences and facts
│   │   ├── project.md         # Current project context
│   │   └── skills.md          # Learned skills and patterns
│   ├── history/
│   │   ├── 2026-02-13-session-a.md
│   │   └── 2026-02-13-session-b.md
│   └── archive/
│       ├── facts/
│       │   ├── typescript-patterns.md
│       │   └── project-decisions.md
│       └── topics/
│           ├── mcp-protocol.md
│           └── memory-architecture.md
└── index.sqlite               # qmd search index
```

---

**Next Steps:** See STACK.md for technology choices and FEATURES.md for prioritized capabilities.
