---
id: 24722ad7-a820-4d20-8345-53ae401ccb97
created: '2026-02-20T16:37:54.684Z'
modified: '2026-02-20T16:37:54.684Z'
memory_type: context
tags: []
---
Build and development commands for opencode-historian:

- `bun run build` - Build TypeScript to `dist/` (both index.ts and cli/index.ts)
- `bun run typecheck` - Run TypeScript type checking without emitting
- `bun test` - Run all tests with Bun
- `bun run lint` - Run Biome linter on entire codebase
- `bun run format` - Format entire codebase with Biome
- `bun run check` - Run Biome check with auto-fix (lint + format + organize imports)
- `bun run check:ci` - Run Biome check without auto-fix (CI mode)
- `bun run dev` - Build and run with OpenCode

Single test execution: `bun test -t "test-name-pattern"`

Development workflow:
1. Make code changes
2. Run `bun run check:ci` to verify linting and formatting
3. Run `bun run typecheck` to verify types
4. Run `bun test` to verify tests pass
5. Commit changes
