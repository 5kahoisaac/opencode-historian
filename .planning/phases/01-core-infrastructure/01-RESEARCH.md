# Phase 1: Core Infrastructure - Research

**Researched:** 2026-02-16
**Domain:** OpenCode Plugin Development, MCP Integration, File-based Storage with qmd
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundation for the opencode-historian plugin, implementing MCP registration, dual-layer storage (global + project-scoped), JSON/JSONC configuration management, and project structure following the oh-my-opencode-slim pattern. The plugin integrates with qmd for semantic search capabilities, using MCP tools for read operations and CLI commands for write operations.

The architecture follows a plugin-as-function pattern where the default export is an async function receiving a context object and returning a plugin definition with `name`, `agent`, `tool`, `mcp`, `config`, `event`, and hooks. Configuration uses Zod schemas with validation, supporting both user-level (`~/.opencode/`) and project-level (`.opencode/`) configs with deep merging.

**Primary recommendation:** Follow the oh-my-opencode-slim plugin pattern exactly: export a Plugin function, use Zod for config validation, implement hierarchical config loading (user → project), and strictly separate read (MCP) from write (CLI) qmd operations.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Plugin Entry Point
- Export full plugin object (agents, tools, config, hooks, events)
- Plugin name: `opencode-historian`
- Config location: User-level first (`~/.opencode/opencode-historian.json` or `.jsonc`), project-level overrides (`.opencode/opencode-historian.json` or `.jsonc`)
- Hooks: Minimal stub event handler for Phase 1 (full hooks added in later phases)
- Background tasks: Deferred to Phase 5/6

#### Storage Structure
- **Global memory path:** `~/.config/opencode/mnemonics/` — FIXED, not configurable
- **Project memory path:** `.mnemonics/` — always relative to project root
- **External paths:** Configured in global + project config, project scope overrides global
- **File naming:** Title-based (e.g., `my-decision.md`)
- **Collision handling:** Prompt user with options (keep both, overwrite, combine)

#### Configuration Schema
```typescript
interface PluginConfig {
  model: string;
  temperature?: number;      // default: 0.3
  appendPrompt?: string;
  externalPaths?: string[];
  memoryTypes?: CustomMemoryType[];
  autoCompound?: boolean;    // default: true
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  debug?: boolean;
}
```
**Config file format:** Support both `.json` and `.jsonc`

#### Historian Agent Configuration
```typescript
{
  name: 'historian',
  model: 'opencode/kimi-k2.5-free',
  fallbackModels: ['opencode/gpt-5-nano', 'opencode/big-pickle'],
  temperature: 0.3,
  description: 'Memory management specialist for contextual information',
  tools: ['memory_remember', 'memory_recall', 'memory_compound', 'memory_forget']
}
```

#### Tool Restrictions
- Memory tools restricted to historian subagent only
- Implementation: Agent-scoped registration

#### qmd Integration Design
- **Index naming:** `{folder_name}` (e.g., `opencode-historian`)
- **Collection naming:** `{memory_type}` (e.g., `decision-architectural`)
- **Design principle:** Read actions use qmd MCP tools. Write actions use qmd CLI commands.
- **ALL qmd operations MUST include** `--index {folder_name}` option

**Scope Constraint:** Write operations (remember, compound, forget) MUST ONLY operate on files inside `.mnemonics/**/*`.
**Format Constraint:** Memory files MUST be `.md` format only.

| Operation | Tool Type | Command/Tool | Scope | Format |
|-----------|-----------|--------------|-------|--------|
| `memory_recall` | MCP tool | `qmd_vsearch` | All sources | Any (only .md indexed) |
| `memory_remember` | CLI | `qmd collection add ... --index {folder_name}` | `.mnemonics/**/*` ONLY | `.md` ONLY |
| `memory_compound` | MCP + CLI | `qmd_vsearch` → file ops → `qmd update --index {folder_name}` | `.mnemonics/**/*` ONLY | `.md` ONLY |
| `memory_forget` | MCP + CLI | `qmd_search` → user confirm → `rm` → `qmd update --index {folder_name}` | `.mnemonics/**/*` ONLY | `.md` ONLY |

### Claude's Discretion
- Exact config file schema TypeScript interface
- Error messages for invalid config
- Logging/debug output format
- Validation error handling

### Deferred Ideas (OUT OF SCOPE)
- **Background task infrastructure** — Add in Phase 5/6
- **Full hooks implementation** — Session idle hook for compounding (Phase 6)
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@opencode-ai/plugin` | latest | Plugin SDK types and interfaces | Official OpenCode plugin API |
| `@opencode-ai/sdk` | latest | AgentConfig types and SDK | Official OpenCode SDK |
| `zod` | ^3.22+ | Runtime schema validation | Industry standard for TypeScript validation, used by oh-my-opencode-slim |
| `gray-matter` | ^4.0+ | YAML frontmatter parsing | Most popular, battle-tested markdown metadata parser |
| `strip-json-comments` | latest | JSONC support | Required for .jsonc config file support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@modelcontextprotocol/sdk` | latest | MCP server/client types | If implementing custom MCP server |
| `yaml` | ^2.3+ | YAML stringify for frontmatter | Alternative to gray-matter for output |
| `chalk` | ^5.0+ | Terminal colors for CLI output | Logging/debugging formatting |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `gray-matter` | `front-matter` | Both work; gray-matter has more features and better TypeScript support |
| `zod` | `valibot` | Zod has better ecosystem integration with OpenCode |
| JSONC | YAML config | JSONC aligns with OpenCode conventions |

**Installation:**
```bash
bun add zod gray-matter strip-json-comments
bun add -d @types/node
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── index.ts              # Plugin entry point - exports default Plugin function
├── config/
│   ├── index.ts          # Config exports
│   ├── schema.ts         # Zod schemas for validation
│   ├── loader.ts         # Config loading from user + project paths
│   └── constants.ts      # Default values, paths
├── agents/
│   ├── index.ts          # Agent configuration aggregation
│   └── historian.ts      # Historian agent definition
├── tools/
│   ├── index.ts          # Tool exports
│   ├── memory-remember.ts
│   ├── memory-recall.ts
│   ├── memory-compound.ts
│   └── memory-forget.ts
├── storage/
│   ├── index.ts          # Storage layer exports
│   ├── paths.ts          # Path resolution (global, project, external)
│   └── files.ts          # File operations with YAML frontmatter
├── qmd/
│   ├── index.ts          # qmd integration exports
│   ├── client.ts         # MCP client wrapper for reads
│   └── cli.ts            # CLI command builder for writes
├── utils/
│   ├── logger.ts         # Debug/logging utilities
│   └── validation.ts     # Validation helpers
└── types/
    └── index.ts          # Shared TypeScript interfaces
```

### Pattern 1: Plugin Function Pattern
**What:** Export an async function that receives context and returns a plugin definition object
**When to use:** All OpenCode plugins following oh-my-opencode-slim pattern
**Example:**
```typescript
// Source: https://github.com/alvinunreal/oh-my-opencode-slim/blob/master/src/index.ts
import type { Plugin } from '@opencode-ai/plugin';

const OpencodeHistorian: Plugin = async (ctx) => {
  const config = loadPluginConfig(ctx.directory);
  
  return {
    name: 'opencode-historian',
    
    agent: {
      historian: {
        model: config.model || 'opencode/kimi-k2.5-free',
        temperature: config.temperature ?? 0.3,
        description: 'Memory management specialist',
        tools: ['memory_remember', 'memory_recall', 'memory_compound', 'memory_forget'],
      }
    },
    
    tool: {
      // Tool implementations
    },
    
    mcp: {
      // MCP server configurations
    },
    
    config: async (opencodeConfig) => {
      // Modify OpenCode configuration
    },
    
    event: async (input) => {
      // Handle events
    },
  };
};

export default OpencodeHistorian;
```

### Pattern 2: Hierarchical Config Loading
**What:** Load config from user-level first, then merge with project-level (project overrides)
**When to use:** When supporting both global user preferences and project-specific settings
**Example:**
```typescript
// Source: Adapted from oh-my-opencode-slim/src/config/loader.ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { stripJsonComments } from 'strip-json-comments';

function getUserConfigDir(): string {
  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
}

function findConfigPath(basePath: string): string | null {
  const jsoncPath = `${basePath}.jsonc`;
  const jsonPath = `${basePath}.json`;
  if (fs.existsSync(jsoncPath)) return jsoncPath;
  if (fs.existsSync(jsonPath)) return jsonPath;
  return null;
}

export function loadPluginConfig(directory: string): PluginConfig {
  const userConfigBasePath = path.join(
    getUserConfigDir(), 'opencode', 'opencode-historian'
  );
  const projectConfigBasePath = path.join(
    directory, '.opencode', 'opencode-historian'
  );

  const userConfigPath = findConfigPath(userConfigBasePath);
  const projectConfigPath = findConfigPath(projectConfigBasePath);

  let config: PluginConfig = userConfigPath
    ? loadConfigFromPath(userConfigPath) ?? {}
    : {};

  const projectConfig = projectConfigPath
    ? loadConfigFromPath(projectConfigPath)
    : null;
    
  if (projectConfig) {
    config = {
      ...config,
      ...projectConfig,
      // Deep merge nested objects
      memoryTypes: { ...config.memoryTypes, ...projectConfig.memoryTypes },
    };
  }

  return config;
}

function loadConfigFromPath(configPath: string): PluginConfig | null {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const rawConfig = JSON.parse(stripJsonComments(content));
    return PluginConfigSchema.parse(rawConfig);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`[opencode-historian] Error reading config:`, error);
    }
    return null;
  }
}
```

### Pattern 3: Zod Schema Validation
**What:** Define TypeScript types via Zod schemas for runtime validation
**When to use:** All configuration interfaces to ensure type safety at runtime
**Example:**
```typescript
// Source: Adapted from oh-my-opencode-slim/src/config/schema.ts
import { z } from 'zod';

export const MemoryTypeSchema = z.object({
  name: z.string(),
  description: z.string(),
  template: z.string().optional(),
});

export const PluginConfigSchema = z.object({
  model: z.string().default('opencode/kimi-k2.5-free'),
  temperature: z.number().min(0).max(2).default(0.3),
  appendPrompt: z.string().optional(),
  externalPaths: z.array(z.string()).optional(),
  memoryTypes: z.array(MemoryTypeSchema).optional(),
  autoCompound: z.boolean().default(true),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  debug: z.boolean().default(false),
});

export type PluginConfig = z.infer<typeof PluginConfigSchema>;
export type MemoryType = z.infer<typeof MemoryTypeSchema>;
```

### Pattern 4: qmd Read/Write Separation
**What:** Use MCP tools for read operations, CLI commands for write operations
**When to use:** All qmd integrations as per CONTEXT.md constraints
**Example:**
```typescript
// Source: Based on qmd documentation and CONTEXT.md requirements

// READ operations - use MCP tools
async function recallMemory(query: string, indexName: string) {
  // Use MCP qmd_vsearch tool
  const results = await mcpClient.callTool('qmd_vsearch', {
    query,
    index: indexName,
    n: 10,
  });
  return results;
}

// WRITE operations - use CLI commands
async function rememberMemory(filePath: string, indexName: string) {
  // Use qmd CLI - MUST include --index flag
  const command = `qmd collection add "${filePath}" --index ${indexName}`;
  const result = await execAsync(command);
  return result;
}

// After file modifications, update index
async function updateIndex(indexName: string) {
  const command = `qmd update --index ${indexName}`;
  await execAsync(command);
}
```

### Pattern 5: YAML Frontmatter File Format
**What:** Store memory files as Markdown with YAML frontmatter metadata
**When to use:** All memory files in `.mnemonics/` directory
**Example:**
```typescript
// Source: Based on gray-matter documentation
import matter from 'gray-matter';

interface MemoryFile {
  content: string;
  data: {
    id: string;
    created: string;
    modified: string;
    memory_type: string;
    tags?: string[];
    related?: string[];
  };
}

function parseMemoryFile(fileContent: string): MemoryFile {
  const parsed = matter(fileContent);
  return {
    content: parsed.content,
    data: parsed.data as MemoryFile['data'],
  };
}

function stringifyMemoryFile(memory: MemoryFile): string {
  return matter.stringify(memory.content, memory.data);
}
```

### Anti-Patterns to Avoid
- **Storing config in a single location:** Always support both user and project configs
- **Using any type for config:** Always use Zod validation with proper TypeScript types
- **Mixing read/write qmd approaches:** NEVER use MCP for writes or CLI for reads
- **Hardcoding paths:** Use path resolution functions that respect XDG_CONFIG_HOME
- **Sync file operations in plugin init:** Keep plugin init fast; defer heavy work

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config validation | Manual if/else checks | Zod schemas | Type inference, error messages, nested validation |
| YAML frontmatter parsing | Regex/string manipulation | gray-matter | Handles edge cases, multiple formats, caching |
| JSONC parsing | Manual comment stripping | strip-json-comments | Handles multi-line comments, edge cases |
| Path resolution | String concatenation | `node:path` module | Cross-platform compatibility, normalization |
| qmd integration | Direct SQLite access | MCP tools + CLI | Maintains index integrity, proper locking |
| Config merging | Object spread only | Deep merge utility | Nested objects need recursive merging |

**Key insight:** The complexity in file-based storage isn't in basic CRUD—it's in maintaining index consistency, handling concurrent access, and ensuring cross-platform path compatibility. qmd handles all of this; custom solutions will break.

## Common Pitfalls

### Pitfall 1: Missing `--index` Flag in qmd Commands
**What goes wrong:** qmd operations fail silently or operate on wrong index
**Why it happens:** Developer forgets that per CONTEXT.md, ALL qmd operations must include `--index {folder_name}`
**How to avoid:** Create wrapper functions that always inject the index flag; never call qmd directly
**Warning signs:** "Collection not found" errors, operations affecting wrong project

### Pitfall 2: Config Scope Confusion
**What goes wrong:** Project config not overriding user config as expected
**Why it happens:** Using shallow merge instead of deep merge for nested objects
**How to avoid:** Implement proper deepMerge function for nested config objects (agents, memoryTypes)
**Warning signs:** User settings persisting when project settings should override

### Pitfall 3: Tool Permission Leak
**What goes wrong:** Memory tools accessible to agents other than historian
**Why it happens:** Not implementing agent-scoped tool registration per CONTEXT.md
**How to avoid:** In `config` hook, set permission rules that deny memory tools to non-historian agents
**Warning signs:** Other agents calling memory_remember/recall/compound/forget

### Pitfall 4: Write Scope Violation
**What goes wrong:** Write operations modifying files outside `.mnemonics/`
**Why it happens:** Not validating paths before write operations
**How to avoid:** Always resolve paths and verify they're within `.mnemonics/` before any write
**Warning signs:** Files appearing in unexpected locations, permission errors

### Pitfall 5: Missing Index Updates
**What goes wrong:** New memories not searchable immediately after creation
**Why it happens:** Forgetting to run `qmd update --index {name}` after file modifications
**How to avoid:** Every write operation (remember, compound, forget) must end with index update
**Warning signs:** "I just created a memory but can't find it"

### Pitfall 6: External Path Security
**What goes wrong:** External paths configured but not validated, leading to path traversal
**Why it happens:** Trusting config input without sanitization
**How to avoid:** Validate all external paths resolve to actual directories, reject relative paths with `..`
**Warning signs:** Access to files outside intended scope

## Code Examples

### Plugin Entry Point Structure
```typescript
// src/index.ts
import type { Plugin } from '@opencode-ai/plugin';
import { loadPluginConfig } from './config/loader';
import { createHistorianAgent } from './agents/historian';
import { createMemoryTools } from './tools';

const OpencodeHistorian: Plugin = async (ctx) => {
  const config = loadPluginConfig(ctx.directory);
  
  return {
    name: 'opencode-historian',
    
    agent: {
      historian: createHistorianAgent(config),
    },
    
    tool: createMemoryTools(config),
    
    config: async (opencodeConfig) => {
      // Set default agent
      (opencodeConfig as { default_agent?: string }).default_agent = 'historian';
      
      // Configure tool permissions - ONLY historian gets memory tools
      const agentConfig = opencodeConfig.agent as Record<string, unknown>;
      for (const [agentName, config] of Object.entries(agentConfig)) {
        const permission = (config as { permission?: Record<string, string> }).permission ?? {};
        
        if (agentName === 'historian') {
          permission['memory_*'] = 'allow';
        } else {
          permission['memory_*'] = 'deny';
        }
        
        (config as { permission: Record<string, string> }).permission = permission;
      }
    },
    
    event: async (input) => {
      // Minimal stub for Phase 1
      // Full implementation in Phase 5/6
    },
  };
};

export default OpencodeHistorian;
```

### Config Schema with Zod
```typescript
// src/config/schema.ts
import { z } from 'zod';

export const MemoryTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  template: z.string().optional(),
  icon: z.string().optional(),
});

export const PluginConfigSchema = z.object({
  model: z.string().default('opencode/kimi-k2.5-free'),
  temperature: z.number().min(0).max(2).default(0.3),
  appendPrompt: z.string().optional(),
  externalPaths: z.array(z.string()).optional(),
  memoryTypes: z.array(MemoryTypeSchema).optional(),
  autoCompound: z.boolean().default(true),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  debug: z.boolean().default(false),
});

export type PluginConfig = z.infer<typeof PluginConfigSchema>;
export type MemoryType = z.infer<typeof MemoryTypeSchema>;
```

### Path Resolution
```typescript
// src/storage/paths.ts
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';

const GLOBAL_MEMORY_DIR = path.join(os.homedir(), '.config', 'opencode', 'mnemonics');
const PROJECT_MEMORY_DIR = '.mnemonics';

export function getGlobalMemoryPath(): string {
  return GLOBAL_MEMORY_DIR;
}

export function getProjectMemoryPath(projectRoot: string): string {
  return path.join(projectRoot, PROJECT_MEMORY_DIR);
}

export function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function isWithinProjectMnemonics(filePath: string, projectRoot: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const mnemonicsPath = path.resolve(getProjectMemoryPath(projectRoot));
  return resolvedPath.startsWith(mnemonicsPath);
}
```

### Memory File Operations
```typescript
// src/storage/files.ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';
import { randomUUID } from 'node:crypto';

export interface MemoryMetadata {
  id: string;
  created: string;
  modified: string;
  memory_type: string;
  tags?: string[];
  related?: string[];
}

export interface MemoryFile {
  content: string;
  data: MemoryMetadata;
}

export function createMemoryFile(
  content: string,
  memoryType: string,
  tags?: string[]
): MemoryFile {
  const now = new Date().toISOString();
  return {
    content,
    data: {
      id: randomUUID(),
      created: now,
      modified: now,
      memory_type: memoryType,
      tags,
    },
  };
}

export function parseMemoryFile(filePath: string): MemoryFile {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(content);
  return {
    content: parsed.content,
    data: parsed.data as MemoryMetadata,
  };
}

export function writeMemoryFile(filePath: string, memory: MemoryFile): void {
  const output = matter.stringify(memory.content, memory.data);
  fs.writeFileSync(filePath, output, 'utf-8');
}

export function generateFilename(title: string): string {
  // Convert title to kebab-case
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '.md';
}
```

### qmd CLI Integration
```typescript
// src/qmd/cli.ts
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface QmdOptions {
  index: string;
}

export async function addToCollection(
  filePath: string,
  collectionName: string,
  options: QmdOptions
): Promise<void> {
  const command = `qmd collection add "${filePath}" --name ${collectionName} --index ${options.index}`;
  await execAsync(command);
}

export async function updateIndex(options: QmdOptions): Promise<void> {
  const command = `qmd update --index ${options.index}`;
  await execAsync(command);
}

export async function removeFromIndex(
  filePath: string,
  options: QmdOptions
): Promise<void> {
  // qmd doesn't have direct file removal; re-index after file deletion
  await updateIndex(options);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSON-only config | JSONC support (comments) | 2024 | Better user experience with documented configs |
| Direct SQLite access | MCP + CLI abstraction | 2025 | Maintains index integrity, proper locking |
| Single config location | Hierarchical (user + project) | 2024 | Flexibility for user defaults + project overrides |
| Manual type guards | Zod validation | 2023 | Runtime type safety with TypeScript inference |

**Deprecated/outdated:**
- Direct qmd SQLite access: Use MCP tools or CLI commands instead
- Synchronous file operations in plugin init: Use async patterns to avoid blocking
- String-based path concatenation: Use `node:path` module

## Open Questions

1. **External path validation strategy**
   - What we know: External paths are configured in config, project overrides global
   - What's unclear: How to validate paths are safe (no traversal), exist, are readable
   - Recommendation: Validate on config load, reject paths with `..`, require absolute paths

2. **Collision handling UX**
   - What we know: Must prompt user when filename collisions occur
   - What's unclear: How to integrate user prompts within tool execution flow
   - Recommendation: Return error with options, let orchestrator handle user interaction

3. **Error message format**
   - What we know: Config validation errors need user-friendly messages
   - What's unclear: Whether to use Zod's default error formatting or custom messages
   - Recommendation: Use Zod's `superRefine` for custom error messages per field

4. **Index naming edge cases**
   - What we know: Index name is based on folder name
   - What's unclear: How to handle special characters, spaces, or very long folder names
   - Recommendation: Sanitize folder names (kebab-case, alphanumeric only) for index names

5. **Memory type customization validation**
   - What we know: Users can define custom memory types in config
   - What's unclear: What validation is needed for template strings, required fields
   - Recommendation: Validate templates use allowed variables, have required frontmatter fields

## Sources

### Primary (HIGH confidence)
- [oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim) - Plugin structure, config loading, agent definitions
- [qmd](https://github.com/tobi/qmd) - CLI commands, MCP tools, index/collection management
- [OpenCode Docs](https://open-code.ai/docs/en/config) - Config file locations, precedence order
- [gray-matter](https://github.com/jonschlinkert/gray-matter) - Frontmatter parsing API

### Secondary (MEDIUM confidence)
- [OpenCode MCP Guide](https://medium.com/composiohq/a-practical-guide-to-open-code-with-mcp-b016b3417261) - MCP integration patterns
- [Zod Documentation](https://zod.dev) - Schema validation patterns

### Tertiary (LOW confidence)
- Web search results for TypeScript plugin patterns (general ecosystem patterns)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Directly from oh-my-opencode-slim and qmd repos
- Architecture: HIGH - Based on working code in oh-my-opencode-slim
- Pitfalls: MEDIUM-HIGH - Inferred from constraints + common patterns

**Research date:** 2026-02-16
**Valid until:** 2026-04-16 (60 days for stable patterns)
