---
id: 54cff168-6088-4026-a3af-2392ad5ffd63
created: '2026-02-20T16:38:50.585Z'
modified: '2026-02-20T16:38:50.585Z'
memory_type: context
tags: []
---
Project Structure for opencode-historian:

```
opencode-historian/
├── src/              # TypeScript source files
├── dist/             # Built JavaScript and declarations  
├── node_modules/     # Dependencies
├── biome.json        # Biome configuration
├── tsconfig.json     # TypeScript configuration
├── package.json      # Project manifest and scripts
├── .mnemonics/       # Memory storage directory
└── AGENTS.md         # Agent coding guidelines
```

Key directories:
- `src/` - Contains all TypeScript source code
- `dist/` - Output directory for compiled JavaScript and TypeScript declarations
- `.mnemonics/` - Directory where memory files are stored as markdown files

Key files:
- `src/index.ts` - Main plugin export point for the OpenCode historian agent
- `package.json` - Defines project dependencies and build scripts
- `tsconfig.json` - TypeScript compiler configuration
- `biome.json` - Biome linter and formatter configuration
- `AGENTS.md` - Guidelines for AI agents working on this codebase
