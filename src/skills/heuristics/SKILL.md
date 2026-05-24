---
name: heuristics
description: Ingest user-provided files or folders into historian memories by extracting content, classifying it against available memory types, and storing useful knowledge through @historian. Use when the user wants to turn documents, screenshots, notes, code, or mixed source folders into persistent mnemonics.
license: MIT
compatibility: opencode, opencode-historian plugin, mnemonics skill, optional markitdown CLI, optional vision MCP.
metadata:
    author: Isaac Ng, Ka Ho
    version: "1.0.0"
---

# Heuristics: Source-to-Memory Ingestion

## Goal

Turn user-provided files or folders into useful historian memories.

This skill is a lightweight workflow. It does not add a new TypeScript tool,
knowledge-graph subsystem, or persistent ingestion pipeline. Use the current
agent's file and MCP abilities to extract source content, then use `@historian`
memory tools to save only durable knowledge.

## Required Inputs

The user must provide at least one file or folder path.

If no path is provided, ask for the path before doing anything else.

Optional user inputs:

- file globs or extensions to include or exclude
- preferred memory type, if known
- whether to process all files or only selected files
- whether to skip large or low-signal files

## Required First Step

Before extracting or saving content, ask `@historian` to list available memory
types:

```text
@historian list all memory types available
```

Use the returned type names as the primary `memoryType` values for saved
memories. If no type is a good fit for a file, skip that file and report why.

## Extraction Routing

For each user-provided path, enumerate candidate files first. Skip generated,
dependency, cache, and binary build-output folders unless the user explicitly
included them.

Common folders to skip by default:

- `.git/`
- `node_modules/`
- `dist/`, `build/`, `.next/`, `coverage/`
- cache folders such as `.cache/`, `.turbo/`, `.parcel-cache/`

### Text and Code Files

Read directly when the file is text-like:

- Markdown, TXT, RST, YAML, TOML, JSON, XML, CSV, TSV
- source code and config files
- logs when the user explicitly asks to ingest them

Extract durable facts, decisions, conventions, issues, preferences, or reusable
patterns. Do not store raw full files unless the whole file is already a concise
source of truth.

### Document Files

For PDF, DOCX, PPTX, XLSX, HTML, EPUB, and similar document formats:

1. If `markitdown` is available, use it to convert the file to Markdown.
2. If `markitdown` is unavailable or fails, extract with the best available LLM
   or file-reading method.
3. If extraction remains unreliable, skip the file and report the failure.

`markitdown` is optional. Never require the user to install it before making
progress if an LLM extraction path is available.

### Images and Screenshots

For PNG, JPG, JPEG, WEBP, GIF, HEIC, SVG, and screenshot-like files:

1. Use a vision MCP when available.
2. Prefer OCR-oriented extraction for screenshots containing text.
3. Prefer general image analysis for diagrams, whiteboards, or visual notes.
4. If no vision MCP is available, use LLM extraction if possible; otherwise skip
   and report that image extraction was unavailable.

### Mixed Folders

For folders, group files by extraction route and process the highest-signal
files first. The agent may decide chunking and batch size based on the folder
size, file sizes, and context budget. There is no fixed cap.

## Classification Rules

Classify each extracted item against the available memory types from
`memory_list_types`.

Use these heuristics unless the project defines better custom types:

| Source content | Likely memory type |
|----------------|--------------------|
| architecture choices, system tradeoffs, selected technologies | `architectural-decision` |
| UI/UX choices, visual direction, interaction decisions | `design-decision` |
| reusable lessons or discoveries | `learning` |
| user's stated working style or personal preference | `user-preference` |
| team/project conventions | `project-preference` or `conventions-pattern` |
| known bugs, risks, gaps, or limitations | `issue` |
| reusable implementation patterns | `recurring-pattern` |
| general durable project knowledge | `context` |

If several files describe the same concept, merge them into one memory rather
than creating duplicates.

## Persistence Workflow

For each useful extracted item:

1. Search existing memories with `memory_recall` when the content may duplicate
   or update existing knowledge.
2. If a related memory exists, update it via `memory_remember` using its
   `filePath`.
3. If no related memory exists, create a new memory with `memory_remember`.
4. Use concise, descriptive titles. Do not include the memory type in the title.
5. Add source paths in the memory body so the saved knowledge remains traceable.

Example historian request:

```text
@historian remember this as a learning:
Title: markitdown-is-optional-for-source-ingestion
Content: Source ingestion should use markitdown when available, but fall back to
LLM extraction when it is not installed. Source: docs/ingestion-notes.md
```

## What Not To Store

Skip content that is not durable project memory:

- temporary logs without a decision or finding
- copied vendor docs that can be retrieved elsewhere
- generated build artifacts
- raw source files with no extracted lesson, decision, convention, or issue
- secrets, credentials, tokens, or private personal data

If a file contains secrets, do not save the secret. Save only a sanitized issue
memory when useful, such as "example env file contained a real-looking token".

## Final Report

After processing, report a compact table:

| Source | Extraction | Memory type | Result |
|--------|------------|-------------|--------|
| `path/to/file.pdf` | markitdown | `context` | saved: `title` |
| `path/to/screen.png` | vision OCR | `issue` | saved: `title` |
| `path/to/vendor.js` | skipped | - | generated or low-signal |

Also report:

- memory types discovered
- files skipped and why
- any extraction failures

## Example Prompts

```text
Use heuristics to ingest ./docs into historian memories.
```

```text
Use heuristics on ./research and only save architectural decisions and issues.
```

```text
Use heuristics to extract these screenshots into memory: ./notes/*.png
```

```text
Use heuristics to ingest ./meeting-notes, use markitdown if available, otherwise
extract with LLM judgement.
```

## Success Criteria

The workflow is complete only when:

1. The user-provided paths were enumerated.
2. Available memory types were checked through `@historian` first.
3. Each file was extracted, skipped, or failed with a clear reason.
4. Useful knowledge was classified into an available memory type.
5. Useful knowledge was saved through `memory_remember` via `@historian`.
6. The final report maps every processed source to its extraction method,
   memory type, and result.
