---
id: b669dd15-42cb-4240-838a-18afc3c7e67a
created: '2026-02-16T23:08:06.895Z'
modified: '2026-02-16T23:08:06.895Z'
memory_type: architectural-decision
tags: []
---
Add concrete examples showing correct vs incorrect naming:

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
