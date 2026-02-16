# Pre-requirements

The Historian plugin has minimal requirements. MCP servers and index management are handled automatically.

## Required

### Bun Runtime

[Bun](https://bun.sh/) v1.3.9+ is the JavaScript runtime.

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Verify
bun --version
```

### OpenCode CLI

[OpenCode](https://opencode.ai/) is the AI agent framework.

```bash
npm install -g @opencode-ai/cli
opencode --version
```

### QMD

[QMD](https://github.com/sst/opencode/tree/main/packages/qmd) provides semantic search.

```bash
bun install -g qmd
qmd --version
```

## Automatic Setup

### MCP Servers

The plugin automatically configures:

| Server | Command | Status |
|--------|---------|--------|
| **QMD** | `qmd mcp` | Required |
| **Serena** | `uvx serena` | Optional |

No user configuration needed. Serena can be disabled via `disabledMcps`.

### Index Management

The QMD index is managed automatically:

- **On Remember**: Index updated after creating memories
- **On Compound**: Index updated after modifying memories
- **On Forget**: Index updated after deleting memories

Index name is derived from your project folder automatically.

## Optional

### Serena (Code Analysis)

For advanced codebase analysis:

```bash
pip install uv
```

If not installed, Serena is skipped. Disable explicitly:

```json
{
  "disabledMcps": ["serena"]
}
```

## Memory Storage

Memories are stored in your project:

```
your-project/
└── .mnemonics/
    ├── architectural-decision/
    ├── learning/
    ├── context/
    └── ...
```

Created automatically when first memory is stored.

## Verification

```bash
# Check dependencies
bun --version
opencode --version
qmd --version

# Test QMD
qmd --help
```

That's all. The plugin handles MCP registration and index management.
