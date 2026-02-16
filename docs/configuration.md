# Configuration

Optional `.historian.json` in project root.

## Quick Example

```json
{
  "appendPrompt": "Focus on API design decisions.",
  "memoryTypes": [
    { "name": "api-endpoint", "description": "API decisions" }
  ],
  "disabledMcps": []
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `model` | `string` | `kimi-k2.5-free` | AI model |
| `temperature` | `number` | `0.3` | Creativity (0-2) |
| `appendPrompt` | `string` | - | Extra instructions |
| `memoryTypes` | `array` | - | Custom types |
| `externalPaths` | `array` | - | Extra memory paths |
| `disabledMcps` | `array` | - | MCPs to disable |
| `autoCompound` | `boolean` | `true` | Auto memory updates |
| `logLevel` | `string` | `info` | `debug`, `info`, `warn`, `error` |
| `debug` | `boolean` | `false` | Debug mode |

## Custom Memory Types

```json
{
  "memoryTypes": [
    {
      "name": "api-endpoint",
      "description": "REST API design decisions",
      "template": "## Endpoint\n## Method\n## Notes"
    }
  ]
}
```

- `name`: kebab-case identifier
- `description`: For the LLM to understand when to use
- `template`: Optional default structure

## Disable Serena

```json
{
  "disabledMcps": ["serena"]
}
```

## Model Fallback

Primary: `kimi-k2.5-free`
Fallback: `gpt-5-nano` → `big-pickle`
