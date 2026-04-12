import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { PROJECT_MEMORY_DIR } from '../config';
import type { PluginConfig } from '../config/schema';
import { ensureDirectory } from '../storage/paths';
import type { Logger } from '../utils';
import { getBuiltinMemoryTypes } from '../utils';
import { generateSchema } from './schema-generator';

function createMockLogger(): Logger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  };
}

function makeTempProjectRoot(): string {
  return path.join(os.tmpdir(), crypto.randomUUID());
}

function makeBaseConfig(overrides?: Partial<PluginConfig>): PluginConfig {
  return {
    temperature: 0.3,
    autoCompound: true,
    logLevel: 'info',
    debug: false,
    ...overrides,
  };
}

describe('generateSchema', () => {
  let projectRoot: string;
  const logger = createMockLogger();

  beforeEach(() => {
    projectRoot = makeTempProjectRoot();
    ensureDirectory(projectRoot);
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('generates SCHEMA.md with builtin types for default config', async () => {
    const config = makeBaseConfig();

    await generateSchema(projectRoot, config, logger);

    const schemaPath = path.join(projectRoot, PROJECT_MEMORY_DIR, 'SCHEMA.md');
    expect(fs.existsSync(schemaPath)).toBe(true);

    const content = fs.readFileSync(schemaPath, 'utf-8');
    expect(content).toContain('# Memory Schema');
    expect(content).toContain('## Memory Types');

    for (const builtinType of getBuiltinMemoryTypes()) {
      expect(content).toContain(`| ${builtinType.name} |`);
    }
  });

  it('includes custom memory types in memory type and custom type tables', async () => {
    const config = makeBaseConfig({
      memoryTypes: [
        {
          name: 'Feature Note',
          description: 'Feature-level notes',
        },
        {
          name: 'Release-Retrospective',
          description: 'Release retrospective entries',
        },
      ],
    });

    await generateSchema(projectRoot, config, logger);

    const schemaPath = path.join(projectRoot, PROJECT_MEMORY_DIR, 'SCHEMA.md');
    const content = fs.readFileSync(schemaPath, 'utf-8');

    expect(content).toContain('| feature-note | Feature-level notes |');
    expect(content).toContain(
      '| release-retrospective | Release retrospective entries |',
    );
    expect(content).toContain('### Custom Types');
    expect(content).toContain('- Custom Types: 2');
  });

  it('renders templates in output when provided', async () => {
    const config = makeBaseConfig({
      memoryTypes: [
        {
          name: 'Postmortem',
          description: 'Incident postmortem memory',
          template: 'postmortem-template-v1',
        },
      ],
    });

    await generateSchema(projectRoot, config, logger);

    const schemaPath = path.join(projectRoot, PROJECT_MEMORY_DIR, 'SCHEMA.md');
    const content = fs.readFileSync(schemaPath, 'utf-8');

    expect(content).toContain('`postmortem-template-v1`');
    expect(content).toContain('| postmortem | Incident postmortem memory |');
  });

  it('creates SCHEMA.md at .mnemonics/SCHEMA.md', async () => {
    const config = makeBaseConfig();

    await generateSchema(projectRoot, config, logger);

    const expectedPath = path.join(
      projectRoot,
      PROJECT_MEMORY_DIR,
      'SCHEMA.md',
    );
    expect(fs.existsSync(expectedPath)).toBe(true);
  });

  it('contains expected sections and schema documentation content', async () => {
    const config = makeBaseConfig();

    await generateSchema(projectRoot, config, logger);

    const schemaPath = path.join(projectRoot, PROJECT_MEMORY_DIR, 'SCHEMA.md');
    const content = fs.readFileSync(schemaPath, 'utf-8');

    expect(content).toContain('## Memory Types');
    expect(content).toContain('## File Format');
    expect(content).toContain('## Conventions');
    expect(content).toContain('## Configuration');
    expect(content).toContain('| Field | Type | Required | Description |');
    expect(content).toContain('`memory_type`');
    expect(content).toContain('`tags`');
    expect(content).toContain('`related`');
  });

  it('shows configured model, temperature, and auto compound values', async () => {
    const config = makeBaseConfig({
      model: 'claude-sonnet-4',
      temperature: 0.8,
      autoCompound: false,
    });

    await generateSchema(projectRoot, config, logger);

    const schemaPath = path.join(projectRoot, PROJECT_MEMORY_DIR, 'SCHEMA.md');
    const content = fs.readFileSync(schemaPath, 'utf-8');

    expect(content).toContain('- Model: `claude-sonnet-4`');
    expect(content).toContain('- Temperature: 0.8');
    expect(content).toContain('- Auto Compound: disabled');
  });

  it('shows sourcePaths as configured raw source patterns', async () => {
    const config = makeBaseConfig({
      sourcePaths: ['./docs/**/*.md', './sources/'],
    });

    await generateSchema(projectRoot, config, logger);

    const schemaPath = path.join(projectRoot, PROJECT_MEMORY_DIR, 'SCHEMA.md');
    const content = fs.readFileSync(schemaPath, 'utf-8');

    expect(content).toContain('- Source Paths: 2');
    expect(content).toContain('### Source Paths');
    expect(content).toContain('- `./docs/**/*.md`');
    expect(content).toContain('- `./sources/`');
  });

  it('handles minimal required config correctly', async () => {
    const config: PluginConfig = {
      temperature: 0.3,
      autoCompound: true,
      logLevel: 'info',
      debug: false,
    };

    await generateSchema(projectRoot, config, logger);

    const schemaPath = path.join(projectRoot, PROJECT_MEMORY_DIR, 'SCHEMA.md');
    const content = fs.readFileSync(schemaPath, 'utf-8');

    expect(content).toContain('- Model: not set');
    expect(content).toContain('- Temperature: 0.3');
    expect(content).toContain('- Auto Compound: enabled');
    expect(content).toContain('- Custom Types: 0');
    expect(content).toContain('- Source Paths: 0');
  });
});
