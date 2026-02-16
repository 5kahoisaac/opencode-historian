# MCP Servers

The Historian plugin integrates with MCP (Model Context Protocol) servers to provide enhanced capabilities.

## Built-in MCP Servers

### 1. QMD MCP Server

**Purpose**: Semantic search and indexing for memory files

**Command**: `qmd mcp`

**Status**: Required for full functionality

#### Capabilities

| Tool | Description |
|------|-------------|
| `qmd_search` | Keyword-based search |
| `qmd_vector_search` | Semantic vector search |
| `qmd_deep_search` | Combined search with re-ranking |
| `qmd_get` | Retrieve document by path |
| `qmd_multi_get` | Retrieve multiple documents |
| `qmd_status` | Check index status |

#### Integration

The Historian plugin uses QMD for:

1. **Memory Retrieval**: `memory_recall` uses vector search
2. **Memory Lookup**: `memory_compound` and `memory_forget` use search to find targets
3. **Index Updates**: Automatic index refresh after modifications

#### Configuration

QMD is configured automatically by the plugin. The index name is derived from the project folder name.

```typescript
// Internal configuration
const indexName = qmdClient.getIndexName(projectRoot);
// Results in: "my-project" for "/path/to/my-project"
```

#### Stub Client

When QMD MCP is not connected, the plugin uses a stub client that:
- Returns empty search results
- Logs warnings about missing QMD
- Allows the plugin to load without crashing

---

### 2. Serena MCP Server

**Purpose**: Advanced codebase analysis and IDE assistance

**Command**: `uvx --from git+https://github.com/oraios/serena serena start-mcp-server --context ide-assistant --open-web-dashboard False`

**Status**: Optional (can be disabled)

#### Capabilities

| Category | Tools |
|----------|-------|
| **File Operations** | `serena_list_dir`, `serena_find_file`, `serena_read_file` |
| **Symbol Navigation** | `serena_find_symbol`, `serena_get_symbols_overview` |
| **Code Editing** | `serena_replace_lines`, `serena_insert_at_line`, `serena_delete_lines` |
| **Refactoring** | `serena_rename_symbol`, `serena_insert_after_symbol` |
| **References** | `serena_find_referencing_symbols` |
| **Project Management** | `serena_activate_project`, `serena_list_memories` |
| **Memory** | `serena_write_memory`, `serena_read_memory` |

#### Use Cases

Serena enhances the historian's ability to:

1. **Understand Code Context**: Navigate codebase while storing memories
2. **Link Code to Decisions**: Reference symbols in architectural decisions
3. **Maintain Project Knowledge**: Store codebase-specific insights

#### Disabling Serena

To disable Serena (reduces resource usage):

```json
{
  "disabledMcps": ["serena"]
}
```

---

## MCP Configuration in Plugin

The plugin registers MCP servers in `src/index.ts`:

```typescript
// MCP configurations are registered during plugin initialization
mcp: {
  qmd: {
    command: "qmd",
    args: ["mcp"],
  },
  serena: {
    command: "uvx",
    args: [
      "--from",
      "git+https://github.com/oraios/serena",
      "serena",
      "start-mcp-server",
      "--context",
      "ide-assistant",
      "--open-web-dashboard",
      "False",
    ],
  },
}
```

## Custom MCP Integration

You can extend the historian with additional MCP servers by configuring them in your OpenCode setup. The historian agent can access any MCP tools registered at the OpenCode level.

### Example: Adding a Custom MCP

```json
// opencode.json
{
  "mcpServers": {
    "my-custom-server": {
      "command": "my-mcp-server",
      "args": ["--port", "8080"]
    }
  }
}
```

## Troubleshooting

### QMD MCP Not Starting

```bash
# Check QMD installation
qmd --version

# Test MCP mode
qmd mcp

# Check index exists
qmd status
```

### Serena MCP Errors

```bash
# Check Python/uv installation
python --version
uv --version

# Manual test
uvx --from git+https://github.com/oraios/serena serena --help
```

### Connection Issues

```bash
# Check MCP server logs
# Look for error messages in OpenCode output

# Verify MCP server responds
qmd mcp --help
```

## Performance Considerations

| Server | Memory | CPU | Notes |
|--------|--------|-----|-------|
| QMD | ~50-100MB | Low | Essential for search |
| Serena | ~200-500MB | Medium | Optional, disable if not needed |

For minimal resource usage:

```json
{
  "disabledMcps": ["serena"]
}
```
