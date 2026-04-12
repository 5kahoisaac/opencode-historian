---
name: heuristics
description: Ingest-oriented and memory health/audit workflow via the historian subagent. Use when you need to process configured source files into memories, review ambiguous ingest cases, or audit the `.mnemonics/` store for broken links, duplicates, stale memories, or metadata issues.
license: MIT
compatibility: opencode, opencode-historian plugin, qmd CLI, and MarkItDown (recommended for source ingest).
metadata:
    author: Isaac Ng, Ka Ho
    version: "1.0.0"
---

# Heuristics: Ingest and Memory Health via Historian

## CRITICAL: You Must Use @historian

These workflows are **ONLY available via the @historian subagent**. You CANNOT call these tools directly:

- `memory_ingest` - Process raw content or configured source files into memories
- `memory_lint` - Audit memory health, links, metadata, and duplicates
- `memory_sync` - Rebuild search/index artifacts after manual file edits

**Always delegate to historian:**

```
@historian ingest the configured source files
@historian lint the memory store
```

## When to Delegate to Historian

**Ingest (source processing):**
- Importing notes, docs, logs, or source folders into memories
- Running MarkItDown-first processing over configured `sourcePaths`
- Converting one source file into multiple coherent memories when strong boundaries exist
- Using deterministic or bounded LLM fallback extraction for unsupported inputs

**Audit / health-check:**
- Reviewing broken wikilinks or orphaned memories
- Checking for invalid metadata or duplicate titles
- Inspecting stale memories after large ingest runs
- Measuring overall memory health via `healthScore`

**Review queue / maintenance:**
- Checking ambiguous skipped items written to `.mnemonics/review/`
- Reindexing after manual edits to memory files

## Example Prompts

### Ingesting

```
@historian ingest the configured source paths
@historian process the source files into memories
@historian import the docs folder into project memories
```

### Auditing

```
@historian lint the memory store
@historian audit broken wikilinks and duplicates
@historian check memory health after the last ingest run
```

### Review and Maintenance

```
@historian show the ambiguous ingest review items
@historian sync the memory index after manual edits
```

## How It Works

1. **Source-path ingest** discovers configured `sourcePaths` and resolves files deterministically.
2. **Extraction** tries MarkItDown first, then deterministic text fallback, then bounded LLM fallback when needed.
3. **Persistence** creates or updates memories automatically using conservative typing and dedupe heuristics.
4. **Enrichment** adds related links/backlinks when high-confidence related memories are found.
5. **Audit** uses `memory_lint` to report broken links, stale memories, duplicates, missing metadata, and overall health.
6. **Review** writes ambiguous skipped ingest cases to `.mnemonics/review/source-ingest-ambiguous.ndjson` for later inspection.

## Best Practices

1. **Use ingest for external/source material** - not for simple remember/recall operations.
2. **Run lint after large ingest runs** - verify links, metadata, and duplicates stayed healthy.
3. **Treat review artifacts as follow-up work** - ambiguous skipped cases need manual inspection.
4. **Keep sourcePaths focused** - use precise folders/globs to avoid noisy ingest runs.
5. **Prefer deterministic extraction first** - bounded LLM fallback is for harder files, not the default path.
