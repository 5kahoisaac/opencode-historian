---
id: b8639c6b-63a9-44f1-a7da-3ae4652e4143
created: '2026-02-19T21:55:21.583Z'
modified: '2026-02-19T21:55:21.583Z'
memory_type: architectural-decision
tags: >-
  architecture, qmd, mcp, decision, opencode, memory, hybrid,
  separation-of-concerns
---
## Architectural Decision: qmd CLI for Memory Operations + MCP for Service Integrations

### Current Architecture
The opencode-historian uses a **hybrid approach** combining qmd CLI and MCP:

1. **qmd CLI for Core Memory Operations**:
   - Primary interface for all memory operations (search, recall, remember, forget, sync)
   - Located in `src/qmd/cli.ts` - implements CLI wrapper functions
   - Provides semantic search, indexing, and memory storage capabilities
   - Key functions: `search()`, `multiGet()`, `updateIndex()`, `updateEmbeddings()`

2. **MCP for Service Integrations**:
   - Used for integrating with external services (e.g., Serena)
   - Located in `src/mcp/index.ts` - provides MCP configurations
   - Complements qmd CLI rather than replacing it
   - Enables connections to other AI services and tools

### Evidence from Codebase

**Index.ts (Main Plugin Entry)**:
- Line 33: "Create memory tools using CLI-based functions"
- Line 34: `createMemoryTools(config, ctx.directory, logger)` - CLI-based memory operations
- Line 75-76: MCP configurations are still provided and registered
- Line 5: `import { createBuiltinMcps } from './mcp';` - MCP is actively used

**Memory Tools Implementation**:
- All memory tools (`memory_recall`, `memory_remember`, `memory_forget`, `memory_sync`) use qmd CLI
- Located in `src/tools/` - each tool calls qmd CLI functions from `src/qmd/cli.ts`
- Provides rich functionality: semantic search, memory classification, tagging

**MCP Integration**:
- MCP configurations are auto-configured as mentioned in README.md line 37
- Used for service integrations rather than core memory operations
- Enables extensibility to other AI services and tools

### Rationale for This Architecture

1. **Separation of Concerns**:
   - qmd CLI excels at memory indexing, search, and storage
   - MCP provides standardized protocol for service integrations
   - Clean separation between memory management and external service connections

2. **Performance & Features**:
   - qmd CLI provides advanced semantic search capabilities (BM25, vector search, hybrid queries)
   - Dedicated memory management with efficient indexing and embeddings
   - MCP allows integration with best-of-breed services without reinventing memory management

3. **Extensibility**:
   - New memory operations can be added using qmd CLI
   - New service integrations can be added via MCP
   - Each component can evolve independently

4. **Ecosystem Compatibility**:
   - qmd CLI provides a mature, specialized memory indexing solution
   - MCP enables integration with the broader AI service ecosystem
   - Maintains compatibility with OpenCode's plugin architecture

### Key Files and Structure

```
src/
├── qmd/cli.ts              # qmd CLI wrapper functions
├── tools/                  # Memory tools using qmd CLI
│   ├── memory-recall.ts
│   ├── memory-remember.ts
│   ├── memory-forget.ts
│   ├── memory-sync.ts
│   └── memory-list-types.ts
├── mcp/                    # MCP service integrations
│   ├── index.ts
│   ├── types.ts
│   └── serena.ts
└── index.ts               # Main plugin - combines both approaches
```

### Benefits
- **Best of both worlds**: qmd CLI for memory excellence + MCP for service integration
- **Maintainable**: Clear separation of concerns
- **Extensible**: Easy to add new memory operations or service integrations
- **Performance**: Optimized memory operations with standardized service protocols
- **Ecosystem**: Leverages both specialized tools and standardized protocols

This hybrid approach provides the robust memory management capabilities of qmd CLI while maintaining the flexibility and extensibility of the MCP protocol for service integrations.
