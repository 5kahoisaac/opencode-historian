# Tools Reference

Agent tools for memory management. Used automatically by the historian agent.

## Overview

| Tool | Purpose |
|------|---------|
| `memory_list_types` | List memory types |
| `memory_remember` | Create memory |
| `memory_recall` | Search memories |
| `memory_compound` | Update memory |
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

Create a memory.

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

Search memories.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `query` | Yes | Search query |
| `memoryType` | No | Filter by type |
| `limit` | No | Max results (default: 10) |

**Returns:** `{ memories, message?, error? }`

---

## memory_compound

Update a memory.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `query` | Yes | Find target |
| `modifications` | Yes | New content |
| `memoryType` | No | Change type |

**Returns:** `{ success, filePath, memoryType }`

---

## memory_forget

Delete memories.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `query` | Yes | Find targets |
| `memoryType` | No | Filter by type |
| `confirm` | No | Confirm deletion |

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
