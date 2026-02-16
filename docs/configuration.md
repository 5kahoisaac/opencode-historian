# Configuration

The Historian plugin can be configured through your `opencode.json` or via a dedicated configuration file.

## Configuration File

Create a `.historian.json` in your project root:

```json
{
  "model": "opencode/kimi-k2.5-free",
  "temperature": 0.3,
  "autoCompound": true,
  "logLevel": "info",
  "appendPrompt": "Focus on storing decisions about API design.",
  "memoryTypes": [
    {
      "name": "api-design",
      "description": "API endpoint design decisions and rationale",
      "template": "## Context\n\n## Decision\n\n## Alternatives Considered\n"
    }
  ],
  "externalPaths": [
    "/Users/username/shared-memories"
  ],
  "disabledMcps": []
}
```

## Configuration Options

### Core Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `model` | `string` | `"opencode/kimi-k2.5-free"` | AI model for the historian agent |
| `temperature` | `number` | `0.3` | Response temperature (0-2) |
| `autoCompound` | `boolean` | `true` | Auto-trigger memory compounding |
| `logLevel` | `string` | `"info"` | Logging verbosity: `debug`, `info`, `warn`, `error` |
| `debug` | `boolean` | `false` | Enable debug mode |

### Prompt Customization

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `appendPrompt` | `string?` | `undefined` | Additional instructions appended to agent prompt |

### Memory Types

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `memoryTypes` | `MemoryType[]?` | `undefined` | Custom memory types |

Each custom memory type:

```typescript
interface MemoryType {
  name: string;        // kebab-case identifier
  description: string; // Description for the LLM
  template?: string;   // Optional default template
}
```

### External Paths

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `externalPaths` | `string[]?` | `undefined` | Additional paths to search for memories |

External paths allow sharing memories across projects:

```json
{
  "externalPaths": [
    "/Users/username/.config/opencode/mnemonics",
    "/shared/team-memories"
  ]
}
```

### MCP Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `disabledMcps` | `string[]?` | `undefined` | MCP servers to disable |

## Model Configuration

The historian supports multiple models with automatic fallback:

```json
{
  "model": "opencode/kimi-k2.5-free"
}
```

Fallback chain (hardcoded):
1. `opencode/kimi-k2.5-free` (primary)
2. `opencode/gpt-5-nano` (fallback 1)
3. `opencode/big-pickle` (fallback 2)

## Temperature Settings

The temperature controls the creativity vs consistency trade-off:

| Value | Behavior |
|-------|----------|
| `0.0 - 0.2` | Very consistent, deterministic responses |
| `0.3` | **Recommended** - Balanced creativity for memory expansion |
| `0.5 - 1.0` | More creative, varied responses |
| `1.0+` | Highly creative, less predictable |

## Custom Memory Types Example

Define domain-specific memory types:

```json
{
  "memoryTypes": [
    {
      "name": "api-endpoint",
      "description": "REST API endpoint design decisions",
      "template": "## Endpoint\n\n## Method\n\n## Request/Response\n\n## Notes\n"
    },
    {
      "name": "database-schema",
      "description": "Database schema changes and migrations"
    },
    {
      "name": "security-decision",
      "description": "Security-related decisions and their rationale"
    }
  ]
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HISTORIAN_DEBUG` | Enable debug logging |
| `HISTORIAN_LOG_LEVEL` | Override log level |
| `QMD_PATH` | Custom QMD binary path |

## Full Example

```json
{
  "model": "opencode/kimi-k2.5-free",
  "temperature": 0.3,
  "autoCompound": true,
  "logLevel": "info",
  "debug": false,
  "appendPrompt": "When storing technical decisions, always include the rationale and alternatives considered.",
  "memoryTypes": [
    {
      "name": "api-design",
      "description": "API design decisions"
    }
  ],
  "externalPaths": [],
  "disabledMcps": []
}
```
