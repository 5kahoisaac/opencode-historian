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

Create a new memory or update existing (handles both create and edit).

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `title` | Yes | Title (filename) |
| `content` | Yes | Markdown content |
| `memoryType` | Yes | Type (kebab-case) |
| `tags` | No | Tags array |

**Returns:** `{ success, filePath, memoryType, tags }`

---

## memory_recall

Search memories and return full content.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `query` | Yes | Search query |
| `memoryType` | No | Filter by type |
| `limit` | No | Max results (default: 10) |
| `type` | No | Search type: 'search', 'vsearch', or 'query' (default: 'vsearch') |

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

Delete memories.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `query` | Yes | Find targets |
| `memoryType` | No | Filter by type |
| `confirm` | No | Confirm deletion |
| `type` | No | Search type (default: 'vsearch') |

**Returns:** 
- Without confirm: `{ confirmRequired, candidates }`
- With confirm: `{ success, deletedFiles, files }`

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
