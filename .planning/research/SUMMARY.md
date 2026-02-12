# Project Research Summary

**Project:** opencode-historian  
**Domain:** AI Agent Historian/Memory System for OpenCode  
**Researched:** February 13, 2026  
**Overall Confidence:** HIGH

## Executive Summary

AI agent memory systems have evolved from simple conversation buffers to sophisticated context management platforms. The key insight from 2025-2026 research is that **effective agent memory is about context engineering, not just storage**. The reference architecture for this space is **qmd** (tobi/qmd), which demonstrates production-ready patterns for markdown-based memory systems with hybrid search capabilities.

For the opencode-historian plugin, the recommended approach combines **Bun + MCP SDK + SQLite** for local-first storage with **memory blocks** as the core organizational pattern (proven by Letta/MemGPT research). This stack delivers native MCP protocol integration, zero-config TypeScript development, and file-based storage that remains human-readable while supporting structured retrieval. The architecture follows a four-tier memory model: working (session), core (editable blocks), recall (searchable history), and archival (long-term knowledge).

**Key risks to mitigate:** The most common failure mode is the "goldfish brain" — building agents that appear to forget everything between sessions due to reliance on context windows alone. Prevention requires explicit memory persistence from day one. The second major risk is the MEMORY.md anti-pattern — using flat files as the primary store, which leads to unbounded token costs and information entropy. The solution is structured memory with semantic retrieval from the start, using files as interface rather than substrate.

## Key Findings

### Recommended Stack

The 2025 standard stack for AI agent memory systems centers on **local-first SQLite** with MCP protocol integration. This approach prioritizes privacy, latency, and simplicity while remaining extensible to cloud scenarios if needed.

**Core technologies:**
- **Bun (^1.2.0)**: Runtime and package manager — 3-6x faster SQLite performance than Node.js, native TypeScript support
- **@modelcontextprotocol/sdk (^1.26.0)**: MCP protocol implementation — standard for AI tool integration, 17M+ weekly downloads, maintained by Anthropic
- **bun:sqlite**: Local-first SQLite — built-in, zero dependencies, native FTS5 support for full-text search
- **sqlite-vec (^0.1.0)**: Vector embeddings — lightweight vector search in SQLite (20KB overhead), no external services required
- **Zod (^4.3.0)**: Schema validation — required peer dependency for MCP SDK, 2x better TypeScript performance than v3

**Reference architecture:** The **qmd** project (tobi/qmd, 8.1k stars) serves as the definitive implementation reference, demonstrating hybrid search (BM25 + vector + reranking), 800-token chunking with 15% overlap, and local GGUF model support for embeddings.

### Expected Features

AI agent memory systems have well-established patterns across the industry (Letta, Zep, Mem0, opencode-agent-memory). The opencode-agent-memory project (47 stars) proves memory blocks work specifically for OpenCode plugins.

**Must have (table stakes):**
- **Persistent Storage** — Markdown files in `~/.config/opencode/memory/` and `.opencode/memory/`
- **CRUD Operations** — MCP tools: `memory_list`, `memory_set`, `memory_replace`
- **Scoped Memory** — Global blocks (cross-project) and Project blocks (codebase-specific)
- **Metadata Support** — YAML frontmatter: `label`, `description`, `limit`, `read_only`
- **System Prompt Injection** — Blocks appear in system prompt in XML-like format
- **Default Blocks** — Auto-create `persona`, `human`, `project` blocks on first run
- **Memory Block Descriptions** — Critical for agent to know *how* to use each block

**Should have (competitive):**
- **Self-Editing Memory** — Agent autonomously maintains its own memory blocks (proven Letta pattern)
- **Read-Only Blocks** — For policies and guidelines that shouldn't be modified
- **Block Size Limits** — Prevent context overflow with configurable `limit` field
- **Selective Retrieval** — Filter blocks by label, search by description
- **Memory Templates** — Pre-defined block structures for common scenarios

**Defer (v2+):**
- **Shared Blocks** — Multiple agents accessing same memory (adds coordination complexity)
- **Memory Versioning** — Git-like history (high complexity, validate basic use case first)
- **Conflict Resolution** — Handle concurrent edits (only needed for multi-user scenarios)
- **Vector Search** — Semantic similarity search (anti-feature for MVP; use label/description search instead)

### Architecture Approach

Modern AI agent memory systems follow a **multi-tiered architecture** that mirrors human cognitive processes. The opencode-historian should implement four memory tiers with clear responsibilities and data flow between them.

**Major components:**

1. **Memory Manager** — Orchestrates memory operations across all tiers; maintains working memory in-memory, persists to qmd on checkpoint; key operations: `store()`, `retrieve()`, `update()`, `delete()`, `search()`, `consolidate()`

2. **MCP Server** — Exposes memory operations as MCP tools for OpenCode integration; provides standardized protocol for any MCP-compatible client; transport via stdio (default) or HTTP (daemon mode)

3. **qmd Storage Backend** — File-based storage with hybrid search (BM25 + vector + reranking); SQLite index + markdown source files; leverages proven qmd architecture for local-first, git-friendly storage

4. **Memory Tiers:**
   - **Working Memory** — Session-only, in-memory, FIFO with summarization before eviction
   - **Core Memory** — Persistent user-managed blocks (user.md, project.md, skills.md)
   - **Recall Memory** — Searchable conversation history with BM25 + semantic hybrid
   - **Archival Memory** — Long-term knowledge with automatic organization and consolidation

### Critical Pitfalls

Research across 10+ authoritative sources identifies six critical pitfalls that cause rewrites or major architectural issues:

1. **The "Goldfish Brain" — Treating Context Windows as Memory** — LLMs are stateless; relying solely on context windows means agents forget everything between sessions. **Prevention:** Design explicit memory persistence from day one, store memories outside context windows, implement lifecycle management.

2. **The MEMORY.md Anti-Pattern — Flat File Memory** — Single markdown files grow unbounded, degrade performance, and accumulate contradictions. Linear token costs of $500+/month. **Prevention:** Treat files as interface, not substrate; implement structured memory with metadata; use semantic retrieval.

3. **Context Window Overloading — "Lost in the Middle"** — LLMs miss details buried in long contexts even with million-token windows. **Prevention:** Implement context prioritization, use relevance scoring, design for targeted retrieval (500-1000 tokens) vs. bulk injection.

4. **Naive Vector Retrieval — Semantic Search Alone** — Vector similarity fails to capture relationships, hierarchies, or multi-hop reasoning. **Prevention:** Implement hybrid retrieval (semantic + keyword + metadata filtering), use re-ranking for top candidates.

5. **Memory Without Management — The Write-Only Store** — Unlimited writes with no updates/deletes/decay creates a graveyard of outdated information. **Prevention:** Design full CRUD operations, implement importance scoring and decay mechanisms, support memory consolidation.

6. **Ignoring Privacy and Data Sovereignty** — Storing sensitive information without access controls creates compliance risks. **Prevention:** Design privacy controls from start, implement memory namespacing (per-user, per-project), support export and deletion.

## Implications for Roadmap

Based on combined research from stack, features, architecture, and pitfalls, the following phase structure is recommended:

### Phase 1: Core Memory Infrastructure

**Rationale:** The goldfish brain pitfall (Critical Pitfall #1) must be addressed from day one. Without explicit memory persistence, the system is fundamentally broken. This phase establishes the foundational storage and retrieval mechanisms.

**Delivers:**
- Memory Manager with in-memory working memory
- File-based storage for core memory (user.md, project.md, skills.md)
- Basic MCP server with `memory_store` and `memory_retrieve` tools
- Scoped memory (global vs. project-specific)
- Default blocks auto-created on first run

**Addresses:** All table stakes features from FEATURES.md (persistent storage, CRUD, scoped memory, metadata, system prompt injection, default blocks, descriptions)

**Avoids:** Critical Pitfall #1 (Goldfish Brain), Critical Pitfall #6 (Privacy — namespacing from start)

**Research needed:** LOW — Standard MCP patterns, well-documented

### Phase 2: Memory Schema & Structured Storage

**Rationale:** Critical Pitfall #2 (MEMORY.md anti-pattern) must be addressed before file entropy sets in. This phase transforms from simple files to structured memory with proper retrieval.

**Delivers:**
- qmd integration for hybrid search (BM25 + vector)
- Memory block schema with YAML frontmatter validation
- Enhanced MCP tools: `memory_search`, `memory_query`
- File watching for external edits
- Basic chunking strategy (800 tokens with 15% overlap)

**Uses:** sqlite-vec for embeddings, bun:sqlite for FTS5 indexing

**Avoids:** Critical Pitfall #2 (Flat file entropy), Moderate Pitfall #1 (Poor chunking)

**Research needed:** LOW — qmd patterns are well-documented

### Phase 3: Retrieval & Ranking

**Rationale:** Critical Pitfall #3 (Context overloading) and #4 (Naive vector retrieval) require sophisticated retrieval to prevent production failures. Without proper ranking and filtering, agents miss critical information.

**Delivers:**
- Hybrid search implementation (BM25 + vector + RRF fusion)
- Relevance scoring and filtering
- Context compression for long histories
- Recall memory tier (conversation history logging)
- Selective retrieval by label/description

**Implements:** Pattern 2 (Hybrid Search) and Pattern 3 (Tiered Memory) from ARCHITECTURE.md

**Avoids:** Critical Pitfall #3 (Lost in the middle), Critical Pitfall #4 (Naive retrieval)

**Research needed:** MEDIUM — Reranking strategies, query expansion techniques

### Phase 4: Memory Lifecycle & Intelligence

**Rationale:** Critical Pitfall #5 (Write-only store) requires full CRUD and lifecycle management. This phase adds the intelligence layer for automatic memory organization.

**Delivers:**
- Self-editing memory (agent modifies own blocks via tools)
- Read-only blocks for policies/guidelines
- Block size limit enforcement
- Memory consolidation (extractor agent for key facts)
- Importance scoring and decay mechanisms
- Archival memory tier with automatic organization

**Implements:** Pattern 3 (Tiered Memory with Automatic Promotion) from ARCHITECTURE.md

**Avoids:** Critical Pitfall #5 (Memory without management)

**Research needed:** MEDIUM — Consolidation strategies, extractor agent patterns

### Phase 5: Security & Production Hardening

**Rationale:** Privacy and security validation deferred to allow rapid iteration, but must be addressed before production use. Revisits Critical Pitfall #6 with full implementation.

**Delivers:**
- Encryption at rest for sensitive memories
- Memory export and deletion APIs (GDPR compliance)
- Audit logging for memory access
- Backup/restore mechanisms
- Performance optimization and caching
- LSP integration (optional advanced feature)

**Avoids:** Critical Pitfall #6 (Privacy — full implementation), Moderate Pitfall #4 (Single-point-of-failure)

**Research needed:** MEDIUM — Encryption patterns, compliance requirements

### Phase Ordering Rationale

**Dependency chain:** Phase 1 (storage) → Phase 2 (schema) → Phase 3 (retrieval) → Phase 4 (lifecycle) → Phase 5 (hardening)

- **Phase 1 must come first** because without persistence, the system is useless (goldfish brain)
- **Phase 2 follows naturally** because flat files degrade quickly; structured storage is needed before accumulation
- **Phase 3 depends on Phase 2** because retrieval requires indexed, structured content
- **Phase 4 builds on Phase 3** because lifecycle management requires working retrieval
- **Phase 5 is last** because security/compliance features need stable core functionality

**Grouping rationale:**
- Phases 1-2 are about **storage and structure** (making memory work)
- Phase 3 is about **retrieval quality** (making memory useful)
- Phase 4 is about **intelligence** (making memory self-maintaining)
- Phase 5 is about **production readiness** (making memory safe)

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 3 (Retrieval & Ranking):** Reranking implementation, query expansion strategies, evaluation framework for retrieval quality
- **Phase 4 (Memory Lifecycle):** Consolidation algorithms, extractor agent design, importance scoring heuristics
- **Phase 5 (Security):** Encryption patterns for local storage, audit logging implementation

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Core Infrastructure):** MCP patterns are well-established, qmd reference architecture is proven
- **Phase 2 (Memory Schema):** YAML frontmatter patterns standard, SQLite FTS5 documented

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Verified with Context7, official MCP SDK docs (17M+ weekly downloads), Bun official benchmarks, qmd reference architecture (8.1k stars) |
| Features | **HIGH** | Letta documentation and opencode-agent-memory (47 stars) prove memory blocks work; feature matrix validated against 4 competitors |
| Architecture | **HIGH** | Multi-tiered memory is industry consensus (Letta, Redis, Zep); qmd provides concrete implementation reference |
| Pitfalls | **HIGH** | 10+ authoritative sources including O'Reilly, Factory.ai, LangWatch; community consensus on critical issues |

**Overall confidence:** **HIGH**

All four research areas converge on consistent recommendations. The stack choices are validated by official documentation and production usage. Feature requirements are proven by working implementations. Architecture patterns are industry-standard. Pitfalls are well-documented across multiple authoritative sources.

### Gaps to Address

While overall confidence is high, the following gaps should be addressed during planning:

- **Evaluation framework:** How to measure retrieval quality? Need to define metrics (Recall@K, MRR) and build evaluation dataset during Phase 3.

- **Chunking strategy validation:** 800-token chunks with 15% overlap is the qmd default, but may need tuning for agent conversation patterns. Validate during Phase 2.

- **Importance scoring heuristics:** No standard approach for memory decay. Research during Phase 4 planning to define decay algorithms.

- **MCP v2 timeline:** MCP SDK is stable (v1.26.0) but v2 is in pre-alpha. Monitor for migration impact during Phase 5.

## Sources

### Primary (HIGH confidence)
- **MCP TypeScript SDK** — https://github.com/modelcontextprotocol/typescript-sdk (v1.26.0, 17M+ weekly downloads)
- **OpenCode SDK Docs** — https://opencode.ai/docs/sdk/ (verified Feb 13, 2026)
- **Bun SQLite Docs** — https://bun.com/docs/runtime/sqlite (official benchmarks)
- **qmd (tobi/qmd)** — https://github.com/tobi/qmd (8.1k stars, production-proven hybrid search)
- **Letta Documentation** — https://docs.letta.com/guides/agents/memory-blocks/ (memory block architecture)
- **opencode-agent-memory** — https://github.com/joshuadavidthomas/opencode-agent-memory (47 stars, proves concept for OpenCode)

### Secondary (MEDIUM confidence)
- **Oracle Blog:** "Comparing File Systems and Databases for Effective AI Agent Memory" (Feb 5, 2026)
- **The New Stack:** "Memory for AI Agents: A New Paradigm of Context Engineering" (2025)
- **Redis Memory Management Guide** — https://redis.io/blog/build-smarter-ai-agents-manage-short-term-and-long-term-memory-with-redis/
- **Zep vs Mem0 Comparison** — https://www.getzep.com/mem0-vs-zep-agent-memory (accuracy benchmarks)
- **Zod v4 Release Notes** — https://zod.dev/v4 (released Jan 2026, 2x performance improvement)

### Tertiary (Verifying Patterns)
- **"23 RAG Pitfalls and How to Fix Them"** — Cornellius Yudha Wijaya (Aug 2025)
- **"The 6 Context Engineering Challenges Stopping AI from Scaling"** — Manouk Draisma, LangWatch (Aug 2025)
- **"Beyond the Goldfish Brain: Why Memory is the Secret Sauce for AI Agents"** — Ajay Verma, GoPenAI (Jan 2026)
- **Sparkco AI Memory Systems** — https://sparkco.ai/blog/ai-agent-memory-systems-architecture-and-innovations

---

*Research completed: February 13, 2026*  
*Ready for roadmap: yes*
