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

## How to Use

Interact with the historian agent through natural language. Just ask it to remember or recall information:

**Remembering things:**
> "Remember that we're using PostgreSQL for the database"
> "Save this: we decided on JWT tokens with 24-hour expiry"
> "Note that the API rate limit is 100 requests per minute"

**Recalling things:**
> "What did we decide about authentication?"
> "Do we have any known issues?"
> "What are my preferences for this project?"

The historian automatically:
- Classifies memories by type (decision, learning, issue, etc.)
- Tags them for easy retrieval
- Indexes them for semantic search

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

## Storage

Memories are stored as markdown files in `.mnemonics/` at your project root:

```
.mnemonics/
├── architectural-decision/
├── design-decision/
├── learning/
└── ...
```

This means:
- Human-readable format
- Git-friendly (commit your memories alongside code)
- Easy to edit manually if needed

## Included Skills

This plugin includes a **mnemonics** skill that teaches agents how to use the historian subagent for memory operations.

> **Note:** As of early 2026, OpenCode's native skills system does not automatically install `SKILL.md` files from npm-published plugin packages. You need to manually copy the skill to your project.

### Install the Skill

Copy the skill to your project's `.opencode/skills/` directory:

```bash
# Create skills directory if needed
mkdir -p .opencode/skills/mnemonics

# Download the skill file
curl -o .opencode/skills/mnemonics/SKILL.md \
  https://raw.githubusercontent.com/5kahoisaac/opencode-historian/main/src/skills/mnemonics/SKILL.md
```

Or manually copy from the package:
```bash
# If installed via npm/bun
cp node_modules/opencode-historian/src/skills/mnemonics/SKILL.md \
   .opencode/skills/mnemonics/
```

Once installed, agents can load the skill for detailed guidance on memory types and `@historian` usage.

MIT
