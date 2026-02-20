---
id: 3ee1d6d8-29a7-4cf3-9ad4-8f2ea9d87569
created: '2026-02-20T16:38:23.691Z'
modified: '2026-02-20T16:38:23.691Z'
memory_type: context
tags: []
---
Code Style and Conventions for opencode-historian:

General Rules:
- **Formatter/Linter:** Biome (configured in `biome.json`)
- **Line width:** 80 characters
- **Indentation:** 2 spaces
- **Line endings:** LF (Unix)
- **Quotes:** Single quotes in JavaScript/TypeScript
- **Trailing commas:** Always enabled

TypeScript Guidelines:
- **Strict mode:** Enabled in `tsconfig.json`
- **No explicit `any`:** Generates a linter warning (disabled for test files)
- **Module resolution:** `bundler` strategy
- **Declarations:** Generate `.d.ts` files in `dist/`

Imports:
- Biome auto-organizes imports on save (`organizeImports: "on"`)
- Let the formatter handle import sorting
- Use path aliases defined in TypeScript configuration if present

Naming Conventions:
- **Variables/functions:** camelCase
- **Classes/interfaces:** PascalCase
- **Constants:** SCREAMING_SNAKE_CASE
- **Files:** kebab-case for most, PascalCase for React components

Error Handling:
- Use typed errors with descriptive messages
- Let errors propagate appropriately rather than catching silently
- Use Zod for runtime validation (already a dependency)

Git Integration:
- Biome integrates with git (VCS enabled)
- Commits should pass `bun run check:ci` before pushing
