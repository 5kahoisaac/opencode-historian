# MCP Servers

The Historian plugin comes with built-in MCP servers. **No user configuration required.**

## Built-in Servers

| Server | Purpose | Required |
|--------|---------|----------|
| **QMD** | Semantic search for memories | Yes |
| **Serena** | Codebase analysis | No |

## QMD MCP

**Purpose**: Semantic search and indexing

**Command**: `qmd mcp`

**Status**: Required for memory search functionality

### How It Works

1. Plugin registers QMD MCP automatically
2. Memory tools communicate via MCP for search
3. Index updates happen automatically after CRUD operations

### Tools Used

| Tool | Usage |
|------|-------|
| `qmd_vector_search` | `memory_recall` - semantic search |
| `qmd_search` | `memory_compound`, `memory_forget` - find targets |

### Stub Client

When QMD MCP is unavailable, the plugin uses a stub client:

- Returns empty results with helpful error message
- Plugin continues to load without crashing
- User sees guidance to install QMD

## Serena MCP

**Purpose**: Advanced codebase analysis

**Command**: `uvx --from git+https://github.com/oraios/serena serena start-mcp-server`

**Status**: Optional enhancement

### Capabilities

- Symbol navigation and search
- Code refactoring
- Project analysis

### Disabling Serena

If you don't need code analysis:

```json
{
  "disabledMcps": ["serena"]
}
```

## Registration Flow

```typescript
// src/index.ts - Automatic registration
mcp: createBuiltinMcps(config.disabledMcps)

// Creates:
// - qmd: { command: "qmd", args: ["mcp"] }
// - serena: { command: "uvx", args: [...] }
```

User config can only **disable**, not add or modify built-in MCPs.

## Troubleshooting

### QMD Not Working

```bash
# Verify QMD installed
qmd --version

# Test MCP mode
qmd mcp --help
```

### Serena Errors

```bash
# Check uv installed
uv --version

# Or disable Serena
# Add to .historian.json: { "disabledMcps": ["serena"] }
```

## Summary

| Aspect | User Action |
|--------|-------------|
| QMD registration | Automatic |
| Serena registration | Automatic |
| Index creation | Automatic |
| Index updates | Automatic |
| Configuration | Optional (disable only) |
