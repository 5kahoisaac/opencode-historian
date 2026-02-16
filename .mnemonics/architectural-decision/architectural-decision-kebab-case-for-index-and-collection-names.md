---
id: 579e9026-4c4c-4284-8e82-dd994fe101f4
created: '2026-02-16T22:46:26.459Z'
modified: '2026-02-16T22:46:26.459Z'
memory_type: architectural-decision
tags: 'naming-convention, qmd, kebab-case, architecture'
---
## Decision
When working with qmd (quadratic-means-docs), all index names and collection names MUST use kebab-case format.

## Rationale
- Consistency across the codebase
- Matches common conventions for file/database naming
- Avoids case-sensitive issues across different systems

## Examples
### Correct naming (kebab-case):
- ✓ `my-collection`
- ✓ `user-preferences`  
- ✓ `chat-history`
- ✓ `index-data`
- ✓ `session-logs`

### Incorrect naming:
- ✗ `myCollection` (camelCase)
- ✗ `MyCollection` (PascalCase)  
- ✗ `my_collection` (snake_case)
- ✗ `my collection` (with spaces)

These examples demonstrate the kebab-case convention where words are separated by hyphens and all letters are lowercase.

## Scope
This applies to:
1. Creating new indexes
2. Creating new collections
3. Referencing existing indexes/collections in code
