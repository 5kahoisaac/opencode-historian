# OpenCode Historian

> AI agents with long-term memory capabilities for OpenCode, powered by QMD.

## Overview

**Historian** is an OpenCode plugin that provides persistent memory management for AI agents. It enables agents to remember important context across conversations and sessions, creating more coherent and personalized assistance.

### Key Features

- **Persistent Memory**: Store and retrieve information across sessions
- **Semantic Search**: Find relevant memories using natural language queries
- **Memory Types**: Classify memories into 9 built-in types or custom types
- **Agent Integration**: Runs as a specialized subagent within OpenCode
- **Local-First**: All memories stored locally in human-readable Markdown

## Installation

### Prerequisites

- [Bun](https://bun.sh/) v1.3.9+
- [OpenCode](https://opencode.ai/) CLI
- [QMD](https://github.com/sst/opencode/tree/main/packages/qmd) for semantic search

### Install

```bash
# Clone the repository
git clone https://github.com/your-org/opencode-historian.git
cd opencode-historian

# Install dependencies
bun install

# Build the plugin
bun run build
```

### Configure OpenCode

Add to your `opencode.json`:

```json
{
  "plugins": ["opencode-historian"]
}
```

## Quick Start

The Historian agent is automatically available when the plugin is loaded. It provides memory management capabilities through specialized tools:

```bash
# The historian agent is invoked automatically when memory operations are needed
# Or explicitly via OpenCode's agent system
```

## Memory Types

Built-in memory types for classification:

| Type | Description |
|------|-------------|
| `architectural-decision` | High-level system architecture choices |
| `design-decision` | UI/UX and component design choices |
| `learning` | Lessons learned, insights, discoveries |
| `user-preference` | Individual user preferences |
| `project-preference` | Team/project-wide conventions |
| `issue` | Known problems, blockers, workarounds |
| `context` | Business context, domain knowledge (default) |
| `recurring-pattern` | Reusable solutions to common problems |
| `conventions-pattern` | Coding standards, naming conventions |

## Project Structure

```
opencode-historian/
├── src/
│   ├── index.ts           # Plugin entry point
│   ├── agents/
│   │   └── historian.ts   # Historian agent configuration
│   ├── tools/             # Memory management tools
│   │   ├── memory-list-types.ts
│   │   ├── memory-remember.ts
│   │   ├── memory-recall.ts
│   │   ├── memory-compound.ts
│   │   └── memory-forget.ts
│   ├── config/            # Configuration schema
│   ├── qmd/               # QMD client integration
│   └── storage/           # File storage utilities
├── docs/                  # Documentation
└── dist/                  # Built output
```

## Documentation

- [Configuration](./docs/configuration.md) - Plugin configuration options
- [Pre-requirements](./docs/pre-requirements.md) - Required dependencies
- [Tools](./docs/tools.md) - Memory management tools reference
- [MCPs](./docs/mcps.md) - Built-in MCP server information
- [Guidelines](./docs/guideline.md) - Usage guidelines and examples

## Development

```bash
# Development build
bun run build

# Type checking
bun run typecheck

# Linting
bun run lint

# Format code
bun run format

# Run all checks
bun run check
```

## License

MIT
