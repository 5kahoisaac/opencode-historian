# Technology Stack

**Project:** opencode-historian  
**Domain:** AI Agent Historian/Memory System  
**Researched:** February 13, 2026  
**Overall Confidence:** HIGH

## Executive Summary

For building an AI agent historian system as an OpenCode plugin, the 2025 standard stack centers on **Bun** + **MCP SDK** + **SQLite** + **Zod**. This combination delivers local-first storage, type-safe validation, and seamless MCP protocol integration. The reference architecture is **qmd** (tobi/qmd), which demonstrates production-ready patterns for markdown-based memory systems with hybrid search (BM25 + vector + reranking).

**Core Principle:** Build as an MCP server that OpenCode can discover and use, with local SQLite for persistence and markdown as the universal memory format.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Bun | ^1.2.0 | Runtime & package manager | Native SQLite support, fastest JS runtime, zero-config TypeScript |
| @modelcontextprotocol/sdk | ^1.26.0 | MCP protocol implementation | Standard for AI tool integration, 17M+ weekly downloads, maintained by Anthropic |
| @opencode-ai/sdk | ^1.1.60 | OpenCode integration | Official SDK for OpenCode plugins, provides session/context APIs |

### Storage & Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| bun:sqlite | Built-in | Local-first SQLite | 3-6x faster than better-sqlite3, zero dependencies, native FTS5 support |
| sqlite-vec | ^0.1.0 | Vector embeddings | Lightweight vector search in SQLite, 20KB overhead, no external services |

### Validation & Types

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| zod | ^4.3.0 | Schema validation | Required peer dep for MCP SDK, v4 has 2x better performance, automatic TypeScript inference |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @modelcontextprotocol/server | ^1.26.0 | High-level MCP server | Building tools/resources/prompts with less boilerplate |
| @modelcontextprotocol/node | ^1.26.0 | Node.js HTTP transport | Streamable HTTP server for MCP |
| uuid | ^11.0.0 | UUID generation | Memory IDs, session tracking |
| yaml | ^2.7.0 | Frontmatter parsing | Markdown metadata extraction |

---

## Architecture Reference: qmd

The **qmd** project (tobi/qmd, 8.1k stars) serves as the definitive reference for this architecture:

**Key Patterns from qmd:**
- **Storage:** SQLite with FTS5 for full-text search + sqlite-vec for embeddings
- **Chunking:** 800-token chunks with 15% overlap for semantic search
- **Hybrid Search:** BM25 + vector + RRF fusion + LLM reranking
- **Local Models:** node-llama-cpp with GGUF models (embedding + reranking)
- **MCP Server:** Exposes tools for search, retrieval, and document management
- **Data Format:** Markdown with YAML frontmatter

---

## Detailed Rationale

### Why bun:sqlite over better-sqlite3

```typescript
// bun:sqlite - built-in, fastest, simplest
import { Database } from 'bun:sqlite';
const db = new Database('memory.sqlite');

// 3-6x faster than better-sqlite3 for reads
// Zero npm dependencies
// Native FTS5 support
```

**Evidence:** Bun's official benchmarks show `bun:sqlite` is ~3-6x faster than better-sqlite3 and 8-9x faster than Deno's sqlite for read queries. It's the fastest SQLite driver available for JavaScript.

**Confidence:** HIGH (verified with official Bun documentation)

### Why MCP SDK v1.x (not v2)

The MCP TypeScript SDK is currently in a transition period:
- **v1.26.0** (latest): Stable, recommended for production
- **v2** (main branch): Pre-alpha, major rewrite expected Q1 2026

**Recommendation:** Use v1.26.0. The v1.x branch will receive bug fixes and security updates for at least 6 months after v2 ships.

**Confidence:** HIGH (verified with GitHub releases page)

### Why Zod v4

Zod v4 (released January 2026) brings:
- 2x better TypeScript compilation performance
- 50% smaller bundle size
- JSON Schema export (new)
- Required by MCP SDK as peer dependency

```typescript
import { z } from 'zod';

// MCP SDK internally imports from zod/v4
// But maintains backward compatibility with v3.25+
const MemorySchema = z.object({
  id: z.string(),
  content: z.string(),
  timestamp: z.number(),
  metadata: z.record(z.string())
});
```

**Confidence:** HIGH (verified with zod.dev release notes)

### Why Local-First SQLite (not cloud)

For an AI agent historian, local-first is the correct default:

| Concern | Local SQLite | Cloud Vector DB |
|---------|--------------|-----------------|
| Privacy | Data stays on device | Requires network round-trip |
| Latency | <1ms | 50-200ms |
| Offline | Works always | Requires connectivity |
| Cost | Free | Pay per query/storage |
| Setup | Zero config | API keys, provisioning |

**When to add cloud:** Only if cross-device sync is required. Even then, start local-first and add sync layer later.

**Confidence:** HIGH (industry consensus, Oracle blog Feb 2025)

---

## Installation

```bash
# Core dependencies
bun add @modelcontextprotocol/sdk @modelcontextprotocol/server zod

# OpenCode integration
bun add @opencode-ai/sdk

# Optional: Vector search (if implementing semantic memory)
bun add sqlite-vec

# Utilities
bun add uuid yaml

# Dev dependencies
bun add -D @types/uuid @types/bun
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Database | SQLite (bun:sqlite) | PostgreSQL + pgvector | Overkill for local-first, adds deployment complexity |
| Runtime | Bun | Node.js | Bun's native SQLite is 3-6x faster; project already uses Bun |
| Vector Search | sqlite-vec | Pinecone/Weaviate | External services add latency, cost, privacy concerns |
| Storage Format | Markdown + YAML | JSON only | Markdown is LLM-native; YAML frontmatter for metadata |
| Protocol | MCP | Custom API | MCP is the emerging standard; 17M+ weekly downloads |

---

## MCP Server Configuration

For OpenCode to discover the historian plugin, provide this configuration:

```json
{
  "mcpServers": {
    "historian": {
      "command": "bun",
      "args": ["run", "/path/to/opencode-historian/dist/index.js"]
    }
  }
}
```

Or for global installation:
```json
{
  "mcpServers": {
    "historian": {
      "command": "opencode-historian"
    }
  }
}
```

---

## Version Pinning Strategy

| Package | Pinning | Rationale |
|---------|---------|-----------|
| @modelcontextprotocol/* | ^1.26.0 | Stable API, security fixes only |
| @opencode-ai/sdk | ^1.1.60 | Rapid development, check release notes |
| zod | ^4.3.0 | Major version, stable API |
| bun:sqlite | N/A | Bundled with Bun runtime |

---

## Sources

### Official Documentation (HIGH confidence)
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk (v1.26.0 released Feb 4, 2026)
- OpenCode SDK Docs: https://opencode.ai/docs/sdk/ (verified Feb 13, 2026)
- Bun SQLite Docs: https://bun.com/docs/runtime/sqlite (verified Feb 13, 2026)
- Zod v4 Release Notes: https://zod.dev/v4 (released Jan 2026)

### Reference Architecture (HIGH confidence)
- qmd (tobi/qmd): https://github.com/tobi/qmd (8.1k stars, production-proven)

### Ecosystem Research (MEDIUM confidence)
- Oracle Blog: "Comparing File Systems and Databases for Effective AI Agent Memory" (Feb 5, 2026)
- LogRocket: "Offline-first frontend apps in 2025" (Nov 18, 2025)
- Multiple community MCP server implementations analyzed

---

## Confidence Assessment

| Recommendation | Confidence | Basis |
|----------------|------------|-------|
| Bun runtime | HIGH | Project already uses Bun; official benchmarks confirm performance |
| MCP SDK v1.26.0 | HIGH | Context7 verified; npm weekly downloads 17M+ |
| bun:sqlite | HIGH | Official Bun docs; no external dependencies |
| Zod v4 | HIGH | Official release notes; MCP SDK peer dependency |
| SQLite over cloud | HIGH | Oracle technical blog; qmd reference architecture |
| Markdown format | MEDIUM | qmd validates approach; community consensus |

---

## Migration Path

**If requirements change:**

1. **Need cloud sync?** Add Litestream for SQLite replication, or migrate to Turso (SQLite at edge)
2. **Need advanced vector search?** Upgrade to PostgreSQL + pgvector, but only after local-first is proven
3. **MCP v2 released?** Migration guide will be provided; v1.x supported for 6+ months

**Confidence:** The local-first SQLite approach is future-proof for 95% of use cases. Cloud additions should be additive, not replacing the local core.
