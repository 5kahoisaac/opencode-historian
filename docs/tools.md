# Tools Reference

The Historian plugin provides 5 memory management tools. All tools are designed to be used by the historian agent, not directly by users.

## Overview

| Tool | Purpose |
|------|---------|
| `memory_list_types` | List available memory types |
| `memory_remember` | Create a new memory |
| `memory_recall` | Search memories |
| `memory_compound` | Update existing memory |
| `memory_forget` | Delete memory |

---

## memory_list_types

List all available memory types (built-in and custom).

### Parameters

None.

### Returns

```typescript
{
  types: MemoryType[];      // All available types with descriptions
  fallbackType: "context";  // Default type when uncertain
  fallbackDescription: string;
}
```

### Example Usage

```
// Agent internally calls:
memory_list_types()

// Returns:
{
  types: [
    { name: "architectural-decision", description: "..." },
    { name: "context", description: "... (DEFAULT fallback type)" },
    // ... more types
  ],
  fallbackType: "context",
  fallbackDescription: "General context information - use when no other type fits"
}
```

---

## memory_remember

Create a new memory with the given content.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | `string` | Yes | Memory title (used for filename) |
| `content` | `string` | Yes | Memory content in Markdown |
| `memoryType` | `string` | Yes | Classification type (kebab-case) |
| `tags` | `string[]` | No | Optional tags for categorization |

### Returns

```typescript
{
  success: boolean;
  filePath: string;      // Path to created file
  memoryType: string;    // Normalized type
  tags: string[];
}
```

### Example Usage

```
memory_remember({
  title: "Use PostgreSQL for primary database",
  content: "## Decision\n\nSelected PostgreSQL as the primary database...\n\n## Rationale\n\n- ACID compliance\n- Strong community",
  memoryType: "architectural-decision",
  tags: ["database", "infrastructure"]
})
```

### Memory File Format

Created files use YAML frontmatter:

```markdown
---
memory_type: architectural-decision
tags:
  - database
  - infrastructure
created: 2026-02-16T10:30:00.000Z
modified: 2026-02-16T10:30:00.000Z
---

## Decision

Selected PostgreSQL as the primary database...

## Rationale

- ACID compliance
- Strong community
```

---

## memory_recall

Search memories using semantic similarity.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | `string` | Yes | Natural language search query |
| `memoryType` | `string` | No | Filter by specific type |
| `limit` | `number` | No | Max results (default: 10) |

### Returns

```typescript
{
  memories: SearchResult[];  // Matching memories
  message?: string;          // If no results
  error?: string;            // If search failed
}

interface SearchResult {
  path: string;      // File path
  score: number;     // Relevance score
  content?: string;  // File content
}
```

### Example Usage

```
// Search all memories
memory_recall({
  query: "database decisions"
})

// Search specific type
memory_recall({
  query: "authentication flow",
  memoryType: "architectural-decision",
  limit: 5
})
```

---

## memory_compound

Update an existing memory by searching, modifying, and writing back.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | `string` | Yes | Search query to find memory |
| `modifications` | `string` | Yes | New content (replaces existing) |
| `memoryType` | `string` | No | Change the memory type |

### Returns

```typescript
{
  success: boolean;
  filePath: string;    // Updated file path
  memoryType: string;  // Current type
}
```

### Example Usage

```
memory_compound({
  query: "database decision PostgreSQL",
  modifications: "## Decision\n\nSelected PostgreSQL...\n\n## Updates\n\n- Added read replicas\n- Configured connection pooling",
  memoryType: "architectural-decision"
})
```

### Behavior

1. Searches for the best matching memory
2. Validates scope (must be in `.mnemonics/`)
3. Replaces content with modifications
4. Updates `modified` timestamp
5. Optionally changes memory type
6. Updates QMD index

---

## memory_forget

Delete memories by searching and removing from filesystem.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | `string` | Yes | Search query to find memories |
| `memoryType` | `string` | No | Filter by specific type |
| `confirm` | `boolean` | No | Confirmation flag (default: false) |

### Returns

**Without confirmation:**
```typescript
{
  confirmRequired: true;
  candidates: Array<{
    path: string;
    score: number;
  }>;
}
```

**With confirmation:**
```typescript
{
  success: boolean;
  deletedFiles: number;
  files: string[];  // Deleted file paths
}
```

### Example Usage

```
// First call - returns candidates
memory_forget({
  query: "outdated database notes"
})
// Returns: { confirmRequired: true, candidates: [...] }

// Second call - confirms deletion
memory_forget({
  query: "outdated database notes",
  confirm: true
})
// Returns: { success: true, deletedFiles: 2, files: [...] }
```

### Safety Features

- Two-step confirmation process
- Scope validation (only `.mnemonics/` allowed)
- Verifies deletion completed
- Updates QMD index after deletion

---

## Best Practices

### Choosing Memory Types

1. Use `memory_list_types` first to see available options
2. When uncertain, use `context` as the fallback
3. Never use generic types like "general" or "note"

### Memory Content

1. Use Markdown formatting for readability
2. Include sections like `## Decision`, `## Rationale`
3. Keep content focused and atomic
4. Add relevant tags for easier retrieval

### Search Queries

1. Use natural language for semantic search
2. Include key terms and concepts
3. Filter by type when targeting specific categories
4. Adjust limit based on expected result count

### Memory Lifecycle

1. **Create**: Use `memory_remember` for new information
2. **Retrieve**: Use `memory_recall` to find relevant memories
3. **Update**: Use `memory_compound` to modify existing memories
4. **Delete**: Use `memory_forget` with confirmation for cleanup
