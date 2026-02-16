# OpenCode Historian

> Memory management for AI agents. Powered by QMD.

## What It Does

Historian gives your AI agent persistent memory across conversations. It automatically stores, retrieves, and organizes important context so your agent remembers decisions, preferences, and learnings.

**Features:**
- Persistent memory across sessions
- Semantic search for finding relevant context
- 9 built-in memory types (decisions, learnings, issues, etc.)
- Automatic classification and tagging

## Install

```bash
# Prerequisites
bun --version    # Need Bun 1.3.9+
qmd --version    # Need QMD for search

# Add to opencode.json
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

Create `.historian.json` (optional):

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

## Docs

- [Configuration](./docs/configuration.md) - All options
- [Tools](./docs/tools.md) - Memory tools reference
- [Guidelines](./docs/guideline.md) - Usage examples

## Dev

```bash
bun run build      # Build
bun run typecheck  # Type check
bun run check      # Lint + format
```

MIT
