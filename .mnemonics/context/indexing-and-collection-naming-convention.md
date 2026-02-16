---
id: 4117d632-850b-45b0-bce5-03cd98c06641
created: '2026-02-16T07:50:23.234Z'
modified: '2026-02-16T07:50:23.234Z'
memory_type: context
tags: 'convention, naming, indexing, collection, kebab-case, qmd'
---
**Decision:** Always use kebab-case for indexing and collection naming in opencode-historian.

This naming convention standard should be followed consistently throughout the codebase when creating or referencing indexes and collections. This applies to the qmd mnemonics system that the historian agent integrates with.

**Examples:**
- ✅ `conversation-history`
- ✅ `code-patterns`
- ❌ `conversationHistory`
- ❌ `CodePatterns`
- ❌ `conversation_history`
