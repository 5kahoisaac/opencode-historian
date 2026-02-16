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
- **Built-in MCPs**: QMD and Serena automatically configured

## Installation

### Prerequisites

- [Bun](https://bun.sh/) v1.3.9+
- [OpenCode](https://opencode.ai/) CLI
- [QMD](https://github.com/sst/opencode/tree/main/packages/qmd) for semantic search

### Install

```bash
# Install via npm/bun
bun add -g opencode-historian

# Or from source
git clone https://github.com/your-org/opencode-historian.git
cd opencode-historian
bun install
bun run build
```

### Configure OpenCode

Add to your `opencode.json`:

```json
{
  "plugins": ["opencode-historian"]
}
```

That's it. MCP servers (QMD, Serena) are automatically configured.

## Quick Start

The Historian agent is automatically available when the plugin loads:

1. **Automatic Memory**: Important context is captured automatically
2. **Semantic Recall**: Query memories with natural language
3. **Smart Classification**: Memories typed and tagged appropriately

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
│   ├── index.ts              # Plugin entry point
│   ├── agents/
│   │   ├── index.ts          # Agent exports
│   │   └── historian.ts      # Historian agent configuration
│   ├── cli/
│   │   └── index.ts          # CLI entry point
│   ├── config/
│   │   ├── index.ts          # Config exports
│   │   ├── loader.ts         # Configuration loader
│   │   ├── schema.ts         # Zod schema definitions
│   │   └── constants.ts      # Configuration constants
│   ├── mcp/
│   │   ├── index.ts          # MCP exports
│   │   ├── qmd.ts            # QMD MCP configuration
│   │   ├── serena.ts         # Serena MCP configuration
│   │   └── types.ts          # MCP type definitions
│   ├── qmd/
│   │   ├── index.ts          # QMD exports
│   │   ├── cli.ts            # QMD CLI utilities
│   │   └── client.ts         # QMD MCP client
│   ├── skills/               # OpenCode skills (empty)
│   ├── storage/
│   │   ├── index.ts          # Storage exports
│   │   ├── files.ts          # File operations
│   │   └── paths.ts          # Path utilities
│   ├── tools/
│   │   ├── index.ts          # Tool exports
│   │   ├── memory-list-types.ts
│   │   ├── memory-remember.ts
│   │   ├── memory-recall.ts
│   │   ├── memory-compound.ts
│   │   └── memory-forget.ts
│   ├── types/
│   │   └── index.ts          # Shared types
│   └── utils/
│       ├── index.ts          # Utils exports
│       ├── helpers.ts        # Utility helpers
│       ├── logger.ts         # Logging utilities
│       └── validation.ts     # Validation functions
├── docs/                     # Documentation
└── dist/                     # Built output
```

## Documentation

- [Configuration](./docs/configuration.md) - Plugin configuration options
- [Pre-requirements](./docs/pre-requirements.md) - Required dependencies
- [Tools](./docs/tools.md) - Memory management tools reference
- [MCPs](./docs/mcps.md) - Built-in MCP server information
- [Guidelines](./docs/guideline.md) - Usage guidelines and examples

## Development

```bash
bun run build      # Build TypeScript
bun run typecheck  # Type checking
bun run lint       # Linting
bun run format     # Format code
bun run check      # All checks
```

## License

MIT
