# Usage Guidelines

This guide explains how to effectively use the Historian plugin, including how to configure `appendPrompt` in your project's `AGENTS.md` and usage examples.

## Understanding the Historian Agent

The historian is an **autonomous agent** that automatically manages memories. You don't directly call memory tools - the historian decides when to create, recall, update, or delete memories based on context.

### Key Principles

1. **Automatic Triggering**: The historian self-activates when it detects important context worth remembering
2. **Smart Classification**: It uses `memory_list_types` to choose appropriate memory types
3. **Default Fallback**: When uncertain, it defaults to `context` type
4. **Kebab-Case Only**: Memory types always use kebab-case (e.g., `architectural-decision`)

---

## Configuring appendPrompt

The `appendPrompt` option in `.historian.json` adds custom instructions to the historian agent. Use this to customize behavior for your project.

### Basic Example

```json
{
  "appendPrompt": "Focus on storing API design decisions and database schema changes."
}
```

### Advanced Example

```json
{
  "appendPrompt": "## Project Context\n\nThis is a fintech application handling sensitive financial data.\n\n## Memory Guidelines\n\n- Always include security implications in architectural decisions\n- Store regulatory compliance notes as 'issue' type\n- Tag all database-related memories with 'pci-dss' if applicable\n\n## Preferred Format\n\nUse this structure for decisions:\n## Decision\n## Rationale\n## Security Impact\n## Alternatives Considered"
}
```

### Integration with AGENTS.md

For project-wide agent configuration, add historian-specific guidance to your `AGENTS.md`:

```markdown
# Project Agents Configuration

## Historian Agent

When the historian agent is active for this project:

### Memory Guidelines
- Store all API endpoint decisions with request/response schemas
- Use 'security-decision' custom type for auth-related choices
- Always include rollback strategies in architectural decisions

### Custom Types
This project defines: 'api-endpoint', 'security-decision', 'compliance-note'

### Tags to Use
- `api-v1`, `api-v2` for API versioning
- `auth`, `payment`, `user` for domain areas
- `security`, `compliance` for risk-related memories
```

---

## Usage Examples

### Example 1: Automatic Architecture Decision Capture

**User says:**
```
"We decided to use Redis for session caching instead of Memcached because 
we need persistence and Redis has better data structure support."
```

**Historian automatically:**
1. Calls `memory_list_types` to check available types
2. Creates memory with type `architectural-decision`
3. Structures the content with decision and rationale

**Result (`.mnemonics/decision/architectural/use-redis-for-session-caching.md`):**
```markdown
---
memory_type: architectural-decision
tags:
  - redis
  - caching
  - session
created: 2026-02-16T10:30:00.000Z
modified: 2026-02-16T10:30:00.000Z
---

## Decision

Use Redis for session caching

## Rationale

- Need persistence for session data
- Better data structure support than Memcached
- Native support for complex data types

## Alternatives Considered

- Memcached: Simpler but no persistence
- In-memory: Not suitable for distributed systems
```

---

### Example 2: Learning from Debugging

**User says:**
```
"Just spent 2 hours debugging why the API was slow. Turns out we were 
doing N+1 queries on the orders endpoint. Fixed with eager loading."
```

**Historian automatically:**
1. Recognizes this as a learning
2. Creates memory with type `learning`
3. Includes the problem, cause, and solution

**Result (`.mnemonics/learning/fix-n-plus-one-orders-endpoint.md`):**
```markdown
---
memory_type: learning
tags:
  - debugging
  - performance
  - n-plus-one
created: 2026-02-16T10:45:00.000Z
modified: 2026-02-16T10:45:00.000Z
---

## Problem

API was slow on orders endpoint

## Root Cause

N+1 query problem - loading related data individually

## Solution

Implemented eager loading for order relationships

## Prevention

Always use query analysis tools before deploying
```

---

### Example 3: Recalling Context

**User asks:**
```
"Why did we choose PostgreSQL again? I want to reconsider."
```

**Historian automatically:**
1. Calls `memory_recall` with query "PostgreSQL database decision"
2. Finds relevant memories
3. Presents the stored decision with rationale

**Response includes:**
```
Based on the architectural decision from [date], PostgreSQL was chosen because:

1. ACID compliance for financial transactions
2. Strong JSON support for flexible schemas
3. Active community and extensive documentation

The alternatives considered were MySQL and MongoDB.

Would you like to compound this memory with new considerations?
```

---

### Example 4: Updating a Memory

**User says:**
```
"Actually, we're now adding read replicas to PostgreSQL for better 
read performance. Update the database decision."
```

**Historian automatically:**
1. Searches for the PostgreSQL decision memory
2. Calls `memory_compound` to update it
3. Preserves original content, adds new section

**Updated memory:**
```markdown
---
memory_type: architectural-decision
tags:
  - database
  - postgresql
  - infrastructure
created: 2026-01-15T10:00:00.000Z
modified: 2026-02-16T11:00:00.000Z
---

## Decision

Use PostgreSQL as primary database

## Rationale

- ACID compliance
- JSON support
- Strong community

## Updates

### 2026-02-16: Read Replicas

Added read replicas for improved read performance:
- Primary: Writes and critical reads
- Replica 1: Analytics queries
- Replica 2: Reporting workloads
```

---

### Example 5: Cleaning Up Old Memories

**User says:**
```
"Clean up any outdated memories about the old monolith architecture."
```

**Historian automatically:**
1. Calls `memory_forget` (first call - returns candidates)
2. Presents found memories for review
3. Waits for confirmation
4. Calls `memory_forget` with `confirm: true` after approval

**Process:**
```
Found 3 memories about monolith architecture:
1. .mnemonics/architectural-decision/monolith-structure.md
2. .mnemonics/learning/monolith-scaling-issues.md
3. .mnemonics/context/monolith-deprecation-plan.md

Delete these? [User confirms]

Deleted 3 files successfully.
```

---

## Best Practices for appendPrompt

### 1. Domain-Specific Instructions

```json
{
  "appendPrompt": "This is a healthcare application. Always include HIPAA compliance notes when storing decisions about patient data handling."
}
```

### 2. Formatting Preferences

```json
{
  "appendPrompt": "Use this template for all decisions:\n## Context\n## Decision\n## Impact\n## Trade-offs"
}
```

### 3. Tagging Conventions

```json
{
  "appendPrompt": "Always tag memories with the affected service: 'auth-service', 'payment-service', 'user-service', etc."
}
```

### 4. Custom Type Reminders

```json
{
  "appendPrompt": "Remember to use custom types: 'compliance-note' for regulatory items, 'incident' for production issues."
}
```

### 5. Integration Context

```json
{
  "appendPrompt": "This project integrates with Salesforce. When storing API-related memories, include Salesforce API version and endpoint details."
}
```

---

## Troubleshooting Common Issues

### Memories Not Being Created

**Cause**: Historian may not be recognizing important context

**Solution**: Add explicit triggers to `appendPrompt`:
```json
{
  "appendPrompt": "Automatically create memories for: API changes, database schema modifications, security decisions, and performance optimizations."
}
```

### Wrong Memory Type

**Cause**: Unclear context or missing type definitions

**Solution**: Add type hints to `appendPrompt`:
```json
{
  "appendPrompt": "Classification hints:\n- Database changes → architectural-decision\n- Bug fixes → learning\n- User feedback → user-preference"
}
```

### Cannot Find Memories

**Cause**: Search queries not matching stored content

**Solution**: Use `memory_recall` with different query terms, or add tags:
```json
{
  "appendPrompt": "Always include these tags when relevant: 'api', 'database', 'security', 'performance', 'ui'"
}
```

---

## Summary

| Scenario | Tool Used | Automatic |
|----------|-----------|-----------|
| New information to store | `memory_remember` | ✓ |
| Finding relevant context | `memory_recall` | ✓ |
| Updating existing memory | `memory_compound` | ✓ |
| Removing outdated info | `memory_forget` | ✓ |
| Checking available types | `memory_list_types` | ✓ |

The historian agent handles all of this automatically. Your role is to:

1. **Configure** `appendPrompt` for project-specific behavior
2. **Communicate** naturally - the historian will capture important context
3. **Trust** the system - memories are persisted and searchable across sessions
