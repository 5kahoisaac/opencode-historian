---
id: 89a7c9be-d921-4032-88e5-8ac3d26ee5eb
created: '2026-02-16T08:47:57.637Z'
modified: '2026-02-16T08:47:57.637Z'
memory_type: architectural-decision
tags: 'naming-convention,qmd,index,collection'
---
**Title:** QMD Index and Collection Naming Convention

**Decision:**
1. **Index Name:** Always use the project folder name (kebab-case) for the `--index` parameter in qmd commands. This is derived from the project root directory name.

2. **Collection Name:** Always use the memory type in kebab-case format for collection names in qmd.

**Rationale:**
- Index names based on folder name provide unique identification per project
- Collection names matching memory types enable organized, type-based searching
- Kebab-case is consistent throughout the codebase (see `toKebabCase()` utility)
- Direct mapping between memory_type and collection name (no conversion needed)

**Examples:**
- Project at `/Users/dev/my-project` → index name: `my-project`
- Project at `/Users/dev/MyCoolApp` → index name: `my-cool-app`
- Memory type `architectural-decision` → collection: `architectural-decision`
- Memory type `UserPreference` → collection: `user-preference` (normalized)

**Implementation:**
- `qmdClient.getIndexName(projectRoot)` extracts folder name and converts to kebab-case
- `addToCollection()` uses memory type directly as collection name
- All memory types are validated and normalized to kebab-case before use
