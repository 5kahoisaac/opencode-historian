---
id: 433215e7-884d-441b-8f24-5350c16aaa8e
created: '2026-02-16T08:02:21.396Z'
modified: '2026-02-16T08:02:21.396Z'
memory_type: conventions-pattern
tags: 'naming, convention, indexing, collection, kebab-case'
---
## Project Decision: Kebab-case Naming Convention

**Decision:** Always use kebab-case for indexing and collection naming in the opencode-historian project.

**Rationale:**
- Consistent with the existing `toKebabCase()` utility used throughout the codebase
- Matches the format used in YAML frontmatter for `memory_type` field
- Used directly as qmd collection names (no conversion needed)
- Prevents inconsistencies from mixed naming conventions (camelCase, PascalCase, etc.)

**Examples:**
- `architectural-decision` ✓
- `design-decision` ✓
- `user-preference` ✓
- `architecturalDecision` ✗
- `ArchitecturalDecision` ✗

**Implementation:**
- Memory types are defined in kebab-case in `BUILTIN_MEMORY_TYPES`
- `toKebabCase()` normalizes all input before indexing/searching
- Collection names in qmd use kebab-case directly
