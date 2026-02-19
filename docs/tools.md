# Tools Reference

Agent tools for memory management. Used automatically by the historian agent.

## Overview

| Tool | Purpose |
|------|---------|
| `memory_list_types` | List memory types |
| `memory_remember` | Create or update memory |
| `memory_recall` | Search memories |
| `memory_forget` | Delete memory |

---

## memory_list_types

List all available types.

**Parameters:** None

**Returns:**
```
{ types, fallbackType: "context", fallbackDescription }
```

---

## memory_remember

Create a new memory or update existing memory.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `title` | Yes | Title (used for filename on create) |
| `content` | Yes | Markdown content |
| `memoryType` | Yes | Type (kebab-case) |
| `tags` | No | Tags array |
| `filePath` | No | Path to existing file (from memory_recall) - if provided, updates instead of creates |

**Returns:** `{ success, filePath, memoryType, tags, isUpdate }`

**Usage:**
- To create new: omit `filePath`
- To update existing: pass `filePath` from `memory_recall` result

---

## memory_recall

Search memories by query, or get all memories with isAll flag.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `query` | No* | Search query (required when isAll=false) |
| `memoryType` | No | Filter by type |
| `limit` | No | Max results (default: 10 for search, 100 for isAll) |
| `type` | No | Search type: 'search', 'vsearch', or 'query' (default: 'vsearch') |
| `isAll` | No | Get all memories instead of search (default: false) |

**Usage:**
- Search by query: `memory_recall(query: "qmd")`
- Get all memories: `memory_recall(isAll: true)`
- Get all of a type: `memory_recall(isAll: true, memoryType: "learning")`

**Returns:**
```javascript
{
  memories: [
    {
      path: "/path/to/memory.md",
      score: 0.95,
      title: "Memory Title",
      memoryType: "context",
      tags: ["tag1", "tag2"],
      created: "2026-02-16T10:30:00.000Z",
      modified: "2026-02-16T10:30:00.000Z",
      content: "Full markdown content of the memory..."
    }
  ],
  count: 1,
  message?: "If no results found",
  error?: "If search failed"
}
```

---

## memory_forget

Delete memory files by their paths.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `filePaths` | Yes | Array of file paths to delete (from memory_recall results) |

**Returns:**
```javascript
{
  success: true,
  deletedCount: 2,
  deletedFiles: ["/path/to/memory1.md", "/path/to/memory2.md"],
  errors?: ["Skipped /path/other: not within .mnemonics/"]
}
```

**Usage:**
1. First call memory_recall to find memories
2. Filter results to .mnemonics/*.md files
3. Get user confirmation
4. Pass filePaths from recall results to delete

---

## Memory File Format

```markdown
---
memory_type: architectural-decision
tags: [database, infrastructure]
created: 2026-02-16T10:30:00.000Z
modified: 2026-02-16T10:30:00.000Z
---

## Decision

Content here...

## Rationale

- Point 1
- Point 2
```
