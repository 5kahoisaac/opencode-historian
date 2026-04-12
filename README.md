<div align="center">
  <img src="assets/historian.jpeg" alt="historian agent" width="240">
  <p><i>Historian gives your AI agent persistent memory across conversations.</i></p>
  <p>Sync · Recall · Remember · Forget · <b>Compound</b></p>
</div>

---

# OpenCode Historian

Persistent memory for OpenCode agents, powered by QMD, MarkItDown, and LLM Wiki workflows.

Historian helps your agent remember decisions, preferences, learnings, and project context across sessions. It stores memories as markdown, indexes them with QMD, and now also supports source-driven ingest, memory linting, review artifacts for ambiguous ingest cases, and conservative multi-memory extraction from a single source file.

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
- **Python 3.10+** for MarkItDown-powered source ingest

### Install QMD:

```bash
npm install -g qmd
# or
bun install -g qmd
```

### Install MarkItDown

`memory_ingest` uses MarkItDown first when processing configured `sourcePaths`.

Recommended install:

```bash
# Basic installation
pip install markitdown

# Full installation (recommended)
pip install 'markitdown[all]'

# Selective extras example
pip install 'markitdown[pdf,docx,pptx]'
```

#### Key notes from the official installation guide:

- use a **virtual environment** when possible
- `markitdown[all]` enables the broadest format support
- useful extras include:
  - `pdf`
  - `docx`
  - `pptx`
  - `xlsx`
  - `xls`
  - `outlook`
  - `audio-transcription`
  - `youtube-transcription`
  - `az-doc-intel`
- for richer image metadata extraction, install **ExifTool**
  - macOS: `brew install exiftool`
  - Linux: `apt-get install libimage-exiftool-perl`

Official reference:
- https://mintlify.wiki/microsoft/markitdown/installation

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

## Install the `heuristics` Skill

The plugin also includes a `heuristics` skill for ingest-oriented and memory health/audit workflows.

Recommended install:

```bash
npx skills add https://github.com/5kahoisaac/opencode-historian/tree/main/src --skill heuristics
```

After installing it, agents can load `heuristics` for:

- source-driven ingest workflows
- memory health / audit workflows
- ambiguous ingest review handling
- MarkItDown-first import guidance

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
- `memory_ingest`
- `memory_lint`

### Memory linting

`memory_lint` audits the `.mnemonics/` store and reports memory health issues such as:

- broken wikilinks
- missing frontmatter
- invalid memory types
- empty content
- duplicate titles across types
- stale/orphan memories

It returns a structured summary with:

- `totalMemories`
- `issuesFound`
- `healthScore`

Use it when you want to verify memory quality after manual edits or large ingest runs.

### Source-driven ingest

`memory_ingest` supports two modes:

- **content mode**: pass raw `content` directly
- **source-path mode**: omit `content` and configure `sourcePaths`

In source-path mode, `memory_ingest` now runs an automatic **discover → convert/extract → persist → report** pipeline:

- if `sourcePaths` is empty/missing, returns a no-op summary
- resolves configured directories/globs into concrete files
- runs a MarkItDown preflight check (`markitdown --help`)
- if MarkItDown is available:
  - attempts MarkItDown conversion per discovered file
  - persists extracted content automatically through the existing memory pipeline
- if MarkItDown is unavailable or a conversion fails:
  - attempts a deterministic text fallback for safe text-like files
  - if deterministic fallback cannot extract safely, attempts a bounded LLM fallback
  - persists fallback-extracted content automatically when fallback succeeds
  - returns explicit failures when no fallback path can safely extract

Per-file results are returned in `files[]`, including:

- `sourcePath`
- `methodAttempted` (`markitdown`, `text-fallback`, `llm-fallback`, or `none`)
- `status` (`created`, `updated`, `skipped`, `failed`)
- `outcome`
- `message`
- `fallbackUsed`
- `fallbackExecution`
- `memory` metadata when persistence succeeded

Source-path persistence is automatic and now also includes:

- source ingest run metadata embedded in each generated record (`source_path`, `source_fingerprint`, extraction method, fallback marker)
- normalized LLM fallback output before persistence (text-only extraction, bounded and trimmed)
- post-persist related-link/backlink enrichment for successfully persisted memories so memory graphs stay connected when high-confidence related memories are found
- conservative multi-memory extraction from one source file:
  - strong boundaries (`##` headings or repeated `---` sections) may produce multiple memory units
  - weak/unclear boundaries fall back to one memory unit for that file
  - each unit includes `source_unit` and `source_locator` markers for traceability
- explicit ambiguity handling at unit level:
  - when duplicate signals are ambiguous (`source_path`/`source_unit` or `source_fingerprint`), that unit is skipped
  - skip reason is surfaced in per-unit result messages for manual review

Summary counters include:

- `summary.filesDiscovered`
- `summary.filesProcessed`
- `summary.created`
- `summary.updated`
- `summary.skipped`
- `summary.failed`
- `summary.fallbackUsed`
- `summary.llmFallbackExecuted`
- `summary.llmFallbackSkipped`
- `summary.memoryUnitsCreated`
- `summary.memoryUnitsUpdated`
- `summary.memoryUnitsSkipped`
- `summary.memoryUnitsFailed`
- `summary.memoryUnitsPersisted`

Important conservative boundaries:

- automatic LLM fallback is bounded by strict per-run file count, file-size, and output-size limits
- text fallback is limited to safe text-like files
- duplicate handling is conservative; exact source-path/fingerprint signals may update, but uncertain merges are skipped
- deterministic text fallback is extension-gated and binary-aware (safe text-like files only)
- memory typing is heuristic and restricted to allowed memory types; weak signals fall back to `context`
- content mode is preserved: passing non-empty `content` returns orchestration instructions and does not run source-path conversion

## When to Use the Skill vs. the Tools

- Use the **plugin** to make memory available inside OpenCode
- Use the **`mnemonics` skill** to teach agents how to use `@historian` well
- Use the **`heuristics` skill** for ingest-oriented and memory health/audit workflows
- Use the **memory tools** when you want direct programmatic memory operations

In short: the plugin gives you capability, `mnemonics` teaches core memory usage, and `heuristics` teaches ingest and audit workflows.

## License

This project is licensed under the [MIT License](LICENSE).
