---
phase: quick-7
plan: 01
subsystem: qmd
tags: [refactor, cli, search, bugfix]
dependency_graph:
  requires: []
  provides: [cli-based-qmd-search]
  affects: [memory-recall, memory-remember, memory-forget, memory-compound]
tech-stack:
  added: []
  patterns: [cli-exec, json-parse]
key-files:
  created: []
  modified:
    - src/qmd/cli.ts
    - src/qmd/index.ts
    - src/tools/memory-recall.ts
    - src/tools/memory-remember.ts
    - src/tools/memory-forget.ts
    - src/tools/memory-compound.ts
    - src/tools/memory-list-types.ts
    - src/tools/index.ts
    - src/types/index.ts
    - src/index.ts
  deleted:
    - src/qmd/client.ts
decisions:
  - Use CLI commands instead of MCP tools for qmd search operations
  - Remove QmdClient class entirely - no longer needed
  - Handle JSON parse errors gracefully by returning empty arrays
metrics:
  duration: ~5 minutes
  tasks_completed: 3
  files_modified: 10
  files_deleted: 1
  completed_date: 2026-02-17
---

# Quick Task 7: Replace QmdClient with CLI-based qmd Commands Summary

## One-liner

Replaced MCP-based QmdClient with CLI-based qmd commands that properly support the `--index` parameter for memory search operations.

## Context

The QmdClient used MCP tools (qmd_vector_search, qmd_search) which silently ignored the `--index` parameter, causing memory_recall to fail. CLI commands like `qmd vsearch "query" --index opencode-historian` work correctly.

## Tasks Completed

### Task 1: Add CLI-based search functions to src/qmd/cli.ts

Added three functions:
- `getIndexName(projectRoot: string): string` - Extract kebab-case folder name from path
- `search(query: string, options: SearchOptions): Promise<SearchResult[]>` - CLI-based keyword search
- `vectorSearch(query: string, options: SearchOptions): Promise<SearchResult[]>` - CLI-based vector search

All functions use `qmd search/vsearch --index <name>` CLI commands with proper `--json` output parsing.

**Commit:** 6574fae

### Task 2: Update memory tools to use CLI functions

Updated all memory tools to use CLI functions instead of QmdClient:
- memory-recall.ts: Uses `vectorSearch()` and `getIndexName()` imports
- memory-remember.ts: Uses `getIndexName()` import
- memory-forget.ts: Uses `search()` and `getIndexName()` imports
- memory-compound.ts: Uses `search()` and `getIndexName()` imports
- memory-list-types.ts: Removed unused QmdClient parameter
- tools/index.ts: Removed qmdClient parameter from `createMemoryTools()`

**Commit:** 2d43ef0

### Task 3: Remove QmdClient and update exports

- Deleted `src/qmd/client.ts` - QmdClient and StubQmdClient classes removed
- Updated `src/qmd/index.ts` to export CLI functions only
- Updated `src/types/index.ts` to remove QmdClient type export
- Updated `src/index.ts` to use `getIndexName()` and remove StubQmdClient

**Commit:** 42cbc49

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

| Check | Status |
|-------|--------|
| `bun run typecheck` | PASSED |
| `bun run build` | PASSED |
| `test -f src/qmd/client.ts` (should be deleted) | PASSED |
| `grep -r "QmdClient" src/` (should be empty) | PASSED |

## Key Changes

### Before (QmdClient - broken)
```typescript
const projectIndex = qmdClient.getIndexName(projectRoot);
projectResults = await qmdClient.vectorSearch(query, {
  index: projectIndex,  // This was ignored by MCP!
  collection: normalizedMemoryType,
  n: limit || 10,
});
```

### After (CLI - working)
```typescript
const projectIndex = getIndexName(projectRoot);
projectResults = await vectorSearch(query, {
  index: projectIndex,  // Properly passed to CLI command
  collection: normalizedMemoryType,
  n: limit || 10,
});
```

The CLI command `qmd vsearch "query" --index opencode-historian` now properly respects the index parameter.

## Commits

1. `6574fae` - feat(quick-7): add CLI-based search functions to qmd/cli.ts
2. `2d43ef0` - feat(quick-7): update memory tools to use CLI functions instead of QmdClient
3. `42cbc49` - feat(quick-7): remove QmdClient and update exports

## Self-Check: PASSED

- [x] src/qmd/cli.ts exports search, vectorSearch, getIndexName
- [x] src/qmd/client.ts deleted
- [x] All commits exist in git log
- [x] No QmdClient references in src/
- [x] Project builds successfully
