# MCP Servers

MCP servers are built-in and automatic. **No configuration needed.**

## What's Included

| Server | Purpose | Required |
|--------|---------|----------|
| **QMD** | Semantic search | Yes |
| **Serena** | Code analysis | No |

## QMD

Required for memory search. The plugin:
- Registers QMD automatically
- Updates index when memories change
- Falls back gracefully if unavailable

Just ensure `qmd` is installed globally.

## Serena

Optional. Provides code navigation and analysis.

**Disable if not needed:**

```json
{
  "disabledMcps": ["serena"]
}
```

## Summary

| Aspect | User Action |
|--------|-------------|
| Registration | Automatic |
| Indexing | Automatic |
| Configuration | Disable only |

That's it. No commands to run, no config to write.
