# Pre-requirements

The Historian plugin requires several dependencies to function properly.

## Required Dependencies

### 1. Bun Runtime

[Bun](https://bun.sh/) is the JavaScript runtime used by this plugin.

```bash
# Install Bun (macOS/Linux)
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version  # Should be v1.3.9+
```

### 2. OpenCode CLI

[OpenCode](https://opencode.ai/) is the AI agent framework this plugin integrates with.

```bash
# Install OpenCode
npm install -g @opencode-ai/cli

# Verify installation
opencode --version
```

### 3. QMD (Required)

[QMD](https://github.com/sst/opencode/tree/main/packages/qmd) provides hybrid search (BM25 + vector) for memory files.

```bash
# Install QMD
bun install -g qmd

# Or via npm
npm install -g qmd

# Verify installation
qmd --version
```

#### QMD Setup

Initialize QMD for your project:

```bash
# Create .mnemonics directory
mkdir -p .mnemonics

# Initialize QMD index
qmd index create --name my-project

# Index the memories directory
qmd index .mnemonics
```

#### QMD Configuration

QMD uses configuration files for indexing. Create `qmd.config.json`:

```json
{
  "collections": {
    "architectural-decision": ".mnemonics/decision/architectural/*.md",
    "design-decision": ".mnemonics/decision/design/*.md",
    "learning": ".mnemonics/learning/*.md",
    "user-preference": ".mnemonics/preference/user/*.md",
    "project-preference": ".mnemonics/preference/project/*.md",
    "issue": ".mnemonics/blocker/issue/*.md",
    "context": ".mnemonics/context/*.md",
    "recurring-pattern": ".mnemonics/pattern/recurring/*.md",
    "conventions-pattern": ".mnemonics/pattern/conventions/*.md"
  }
}
```

## Optional Dependencies

### Serena MCP Server

Serena provides advanced codebase analysis capabilities. It's included by default but can be disabled.

Requirements:
- Python 3.10+
- `uv` package manager

```bash
# Install uv
pip install uv

# Serena is automatically managed by the plugin
# No manual installation required
```

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Node.js | 18.x | 20.x+ |
| Bun | 1.3.9 | Latest |
| Memory | 512MB | 1GB+ |
| Disk | 100MB | 1GB+ |

## Verification

Run the following to verify your setup:

```bash
# Check all dependencies
bun --version
opencode --version
qmd --version

# Test QMD indexing
mkdir -p .mnemonics
echo "# Test Memory\n\nThis is a test." > .mnemonics/test.md
qmd index .mnemonics
qmd search "test"
```

## Troubleshooting

### QMD Not Found

```bash
# Error: qmd: command not found
# Solution: Ensure QMD is installed globally

npm install -g qmd
# Or add to PATH
export PATH="$PATH:$(npm bin -g)"
```

### Index Not Created

```bash
# Error: Index not found
# Solution: Initialize the QMD index

qmd index create --name $(basename $(pwd))
qmd index .mnemonics
```

### Permission Denied

```bash
# Error: Permission denied on .mnemonics/
# Solution: Check directory permissions

chmod 755 .mnemonics
```

### MCP Connection Failed

```bash
# Error: MCP server connection failed
# Solution: Check if QMD MCP server is running

qmd mcp --help
```

## Next Steps

After installing prerequisites:

1. [Configure the plugin](./configuration.md)
2. [Learn about available tools](./tools.md)
3. [Read usage guidelines](./guideline.md)
