# Pre-requirements

Minimal setup. Everything else is automatic.

## Required

```bash
# Bun runtime
bun --version   # Need 1.3.9+

# OpenCode CLI
opencode --version

# QMD for search
qmd --version
```

## Install

```bash
# Bun
curl -fsSL https://bun.sh/install | bash

# OpenCode
npm install -g @opencode-ai/cli

# QMD
bun install -g qmd
```

## Optional

**Serena** (code analysis) - requires `uv`:

```bash
pip install uv
```

Or disable it:

```json
{ "disabledMcps": ["serena"] }
```

## Automatic

| Feature | Status |
|---------|--------|
| MCP registration | Auto |
| Index creation | Auto |
| Index updates | Auto |
| Memory storage | Auto |

## Storage

```
your-project/
└── .mnemonics/     # Created automatically
```

Done.
