# OpenCode Historian

> Memory management for AI agents. Powered by QMD.

## What It Does

Historian gives your AI agent persistent memory across conversations. It automatically stores, retrieves, and organizes important context so your agent remembers decisions, preferences, and learnings.

**Features:**
- Persistent memory across sessions
- Semantic search for finding relevant context
- 9 built-in memory types (decisions, learnings, issues, etc.)
- Automatic classification and tagging

## Prerequisites

- **Bun** 1.3.9+ - JavaScript runtime
- **QMD** - Memory indexing and search engine

Install QMD:
```bash
npm install -g qmd
# or
bun install -g qmd
```

## Install

Add to your `opencode.json`:

```json
{
  "plugins": ["opencode-historian"]
}
```

That's it. MCP servers are auto-configured.

## Memory Types

| Type                     | Use For                     |
|--------------------------|-----------------------------|
| `architectural-decision` | System architecture choices |
| `design-decision`        | UI/UX decisions             |
| `learning`               | Lessons and discoveries     |
| `user-preference`        | User preferences            |
| `project-preference`     | Team conventions            |
| `issue`                  | Known problems              |
| `context`                | General context (default)   |
| `recurring-pattern`      | Reusable patterns           |
| `conventions-pattern`    | Coding standards            |

## Configuration

Create `.opencode/opencode-historian.json` (optional):

```json
{
  "appendPrompt": "Focus on API design decisions.",
  "memoryTypes": [
    { "name": "api-endpoint", "description": "API endpoint decisions" }
  ],
  "disabledMcps": []
}
```

### Options

| Option         | Default | Description                          |
|----------------|---------|--------------------------------------|
| `model`        | -       | AI model                             |
| `temperature`  | `0.3`   | Response creativity                  |
| `appendPrompt` | -       | Custom instructions                  |
| `memoryTypes`  | -       | Custom memory types                  |
| `disabledMcps` | -       | MCPs to disable (e.g., `["serena"]`) |

## Internal Tools

The historian agent has access to these memory tools:

| Tool               | Description                                    |
|--------------------|------------------------------------------------|
| `memory_list_types`| List all available memory types                |
| `memory_recall`    | Search and retrieve memories (semantic search) |
| `memory_remember`  | Create or update a memory                      |
| `memory_forget`    | Delete memories with confirmation              |
| `memory_sync`      | Sync index after manual file changes           |

### Tool Parameters

**memory_recall:**
- `query` (optional when isAll=true) - Search query
- `memoryType` - Filter by type
- `limit` - Max results (default: 10)
- `type` - Search type: 'search' (keyword), 'vsearch' (semantic), 'query' (hybrid)
- `isAll` - Get all memories (default: false)

**memory_remember:**
- `title` - Memory title
- `content` - Memory content
- `memoryType` - Type of memory
- `tags` - Optional tags array
- `filePath` - Path to update existing memory (from recall result)

**memory_forget:**
- `filePaths` - Array of file paths to delete (from recall result)

**memory_sync:**
- No parameters - syncs index and embeddings

## Dev

```bash
bun run build      # Build
bun run typecheck  # Type check
bun run check      # Lint + format
```

MIT
