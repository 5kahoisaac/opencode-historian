<div align="center">
  <img src="assets/historian.jpeg" alt="historian agent" width="240">
  <p><i>Historian gives your AI agent persistent memory across conversations.</i></p>
  <p>Sync · Recall · Remember · Forget · <b>Compound</b></p>
</div>

---

# OpenCode Historian

Persistent memory for OpenCode agents, powered by QMD.

Historian helps your agent remember decisions, preferences, learnings, and project context across sessions. It stores memories as markdown, indexes them with QMD, and exposes tools for remembering, recalling, forgetting, and syncing memory.

## What You Get

- Persistent memory across conversations
- Semantic search over saved memories
- Built-in memory types for decisions, issues, learnings, and preferences
- Markdown-based storage in your repo
- A bundled `historian` agent and memory tools
- Optional Serena MCP support for code navigation

## Prerequisites

- **Bun** `1.3.9+`
- **QMD** installed globally

Install QMD:

```bash
npm install -g qmd
# or
bun install -g qmd
```

## Install the Plugin

Add the plugin to your `opencode.json`:

```json
{
  "plugins": ["opencode-historian"]
}
```

That is enough to register the plugin, the bundled `historian` agent, and the memory tools.

## Install the `mnemonics` Skill

The plugin also includes a `mnemonics` skill that teaches agents how to use the `@historian` subagent effectively.

Recommended install:

```bash
npx skills add https://github.com/5kahoisaac/opencode-historian/tree/main/src --skill mnemonics
```

After installing it, agents can load `mnemonics` for guidance on memory types, when to use `@historian`, and how to store or recall project knowledge correctly.

## Quick Start

Once the plugin is enabled, talk to the historian agent in natural language.

### Save information

> "Remember that we're using PostgreSQL for the database"
>
> "Save this: we decided on JWT tokens with 24-hour expiry"
>
> "Note that the API rate limit is 100 requests per minute"

### Recall information

> "What did we decide about authentication?"
>
> "Do we have any known issues?"
>
> "What are my preferences for this project?"

Historian will:

- classify memories by type
- tag them for retrieval
- index them for semantic search
- keep them in a git-friendly markdown format

## Memory Types

Historian ships with these built-in memory types:

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

Optional config file:

```text
.opencode/opencode-historian.json
```

Example:

```json
{
  "appendPrompt": "Focus on API design decisions.",
  "memoryTypes": [
    {
      "name": "api-endpoint",
      "description": "API endpoint decisions"
    }
  ],
  "sourcePaths": ["./docs/**/*.md", "./sources/"],
  "disabledMcps": ["serena"]
}
```

### Options

| Option         | Default | Description |
|----------------|---------|-------------|
| `model`        | - | Model used by the historian agent |
| `temperature`  | `0.3` | Response creativity |
| `appendPrompt` | - | Additional instructions appended to the historian prompt |
| `memoryTypes`  | - | Custom memory types to add alongside the built-ins |
| `sourcePaths`  | - | Raw source path patterns for ingest context (glob or directory), for example `"./docs/**/*.md"`, `"./sources/"` |
| `autoCompound` | `true` | Automatically merge new learnings into existing memories when appropriate |
| `disabledMcps` | - | Bundled MCPs to disable, for example `["serena"]` |

## Storage

Memories are stored as markdown files under `.mnemonics/` in your project root:

```text
.mnemonics/
├── architectural-decision/
├── design-decision/
├── learning/
└── ...
```

Benefits:

- human-readable
- easy to version with git
- easy to inspect or edit manually

## Included Tools

The plugin registers these memory tools:

- `memory_remember`
- `memory_recall`
- `memory_forget`
- `memory_list_types`
- `memory_sync`

## When to Use the Skill vs. the Tools

- Use the **plugin** to make memory available inside OpenCode
- Use the **`mnemonics` skill** to teach agents how to use `@historian` well
- Use the **memory tools** when you want direct programmatic memory operations

In short: the plugin gives you capability, and the skill gives agents better judgment about how to use it.

## License

This project is licensed under the [MIT License](LICENSE).
