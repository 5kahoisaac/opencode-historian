import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { PROJECT_MEMORY_DIR } from '../config';
import { createMemoryFile, writeMemoryFile } from '../storage/files';
import { ensureDirectory, getProjectMemoryPath } from '../storage/paths';
import type { Logger } from '../utils';
import { getBuiltinMemoryTypes } from '../utils';
import { generateIndex } from './index-generator';

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

function writeMemoryFixture(
  projectRoot: string,
  memoryType: string,
  fileName: string,
  content: string,
  options?: {
    modified?: string;
    tags?: string[];
  },
): string {
  const memoryTypeDir = path.join(
    getProjectMemoryPath(projectRoot),
    memoryType,
  );
  ensureDirectory(memoryTypeDir);

  const filePath = path.join(memoryTypeDir, fileName);
  const memory = createMemoryFile(content, memoryType, options?.tags ?? []);

  if (options?.modified) {
    memory.data.modified = options.modified;
  }

  writeMemoryFile(filePath, memory);
  return filePath;
}

describe('generateIndex', () => {
  let projectRoot: string;
  const logger = createMockLogger();

  beforeEach(() => {
    projectRoot = makeTempProjectRoot();
    ensureDirectory(projectRoot);
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('creates index for empty mnemonics directory with zero stats', async () => {
    await generateIndex(projectRoot, logger);

    const indexPath = path.join(projectRoot, PROJECT_MEMORY_DIR, 'index.md');
    expect(fs.existsSync(indexPath)).toBe(true);

    const content = fs.readFileSync(indexPath, 'utf-8');
    expect(content).toContain('# Memory Index');
    expect(content).toContain('- Total memories: 0');
    expect(content).toContain('No memories yet.');
    expect(content).toContain('Generated: ');
  });

  it('indexes single memory file with stats and listing', async () => {
    writeMemoryFixture(
      projectRoot,
      'context',
      'first-memory.md',
      'Single memory content',
      {
        tags: ['alpha', 'beta'],
        modified: '2026-01-01T12:00:00.000Z',
      },
    );

    await generateIndex(projectRoot, logger);

    const indexPath = path.join(projectRoot, PROJECT_MEMORY_DIR, 'index.md');
    const content = fs.readFileSync(indexPath, 'utf-8');

    expect(content).toContain('- Total memories: 1');
    expect(content).toContain('| context | 1 |');
    expect(content).toContain('## Context');
    expect(content).toContain(
      '| [First Memory](./context/first-memory.md) | alpha, beta | 2026-01-01T12:00:00.000Z |',
    );
  });

  it('groups by memory type and sorts entries by modified date descending', async () => {
    writeMemoryFixture(projectRoot, 'issue', 'older-issue.md', 'Older issue', {
      modified: '2025-01-01T00:00:00.000Z',
    });
    writeMemoryFixture(projectRoot, 'issue', 'newer-issue.md', 'Newer issue', {
      modified: '2026-02-01T00:00:00.000Z',
    });
    writeMemoryFixture(
      projectRoot,
      'learning',
      'learning-note.md',
      'Learning',
      {
        modified: '2026-01-15T00:00:00.000Z',
      },
    );

    await generateIndex(projectRoot, logger);

    const indexPath = path.join(projectRoot, PROJECT_MEMORY_DIR, 'index.md');
    const content = fs.readFileSync(indexPath, 'utf-8');

    expect(content).toContain('## Issue');
    expect(content).toContain('## Learning');

    const newerPos = content.indexOf('Newer Issue');
    const olderPos = content.indexOf('Older Issue');
    expect(newerPos).toBeGreaterThan(-1);
    expect(olderPos).toBeGreaterThan(-1);
    expect(newerPos).toBeLessThan(olderPos);
  });

  it('orders builtin memory types first, then custom types alphabetically', async () => {
    writeMemoryFixture(projectRoot, 'project-preference', 'pref.md', 'Pref');
    writeMemoryFixture(projectRoot, 'context', 'ctx.md', 'Ctx');
    writeMemoryFixture(projectRoot, 'zeta-custom', 'zeta.md', 'Zeta');
    writeMemoryFixture(projectRoot, 'alpha-custom', 'alpha.md', 'Alpha');

    await generateIndex(projectRoot, logger);

    const indexPath = path.join(projectRoot, PROJECT_MEMORY_DIR, 'index.md');
    const content = fs.readFileSync(indexPath, 'utf-8');

    const contextPos = content.indexOf('| context | 1 |');
    const projectPreferencePos = content.indexOf('| project-preference | 1 |');
    const alphaCustomPos = content.indexOf('| alpha-custom | 1 |');
    const zetaCustomPos = content.indexOf('| zeta-custom | 1 |');

    expect(contextPos).toBeGreaterThan(-1);
    expect(projectPreferencePos).toBeGreaterThan(-1);
    expect(alphaCustomPos).toBeGreaterThan(-1);
    expect(zetaCustomPos).toBeGreaterThan(-1);

    expect(projectPreferencePos).toBeLessThan(contextPos);
    expect(contextPos).toBeLessThan(alphaCustomPos);
    expect(alphaCustomPos).toBeLessThan(zetaCustomPos);

    const builtinNames = getBuiltinMemoryTypes().map((type) => type.name);
    expect(builtinNames.includes('context')).toBe(true);
    expect(builtinNames.includes('project-preference')).toBe(true);
  });

  it('excludes special files index.md, log.md, and SCHEMA.md from listing', async () => {
    const mnemonicsPath = getProjectMemoryPath(projectRoot);
    ensureDirectory(mnemonicsPath);

    fs.writeFileSync(
      path.join(mnemonicsPath, 'index.md'),
      '# old index\n',
      'utf-8',
    );
    fs.writeFileSync(path.join(mnemonicsPath, 'log.md'), '# log\n', 'utf-8');
    fs.writeFileSync(
      path.join(mnemonicsPath, 'SCHEMA.md'),
      '# schema\n',
      'utf-8',
    );

    writeMemoryFixture(
      projectRoot,
      'context',
      'actual-memory.md',
      'Real memory',
    );

    await generateIndex(projectRoot, logger);

    const indexPath = path.join(mnemonicsPath, 'index.md');
    const content = fs.readFileSync(indexPath, 'utf-8');

    expect(content).toContain('Actual Memory');
    expect(content).not.toContain('old index');
    expect(content).not.toContain('log.md');
    expect(content).not.toContain('SCHEMA.md');
    expect(content).toContain('- Total memories: 1');
  });

  it('includes generated timestamp and type count table in stats section', async () => {
    writeMemoryFixture(projectRoot, 'context', 'ctx.md', 'ctx');
    writeMemoryFixture(projectRoot, 'issue', 'issue.md', 'issue');

    await generateIndex(projectRoot, logger);

    const indexPath = path.join(projectRoot, PROJECT_MEMORY_DIR, 'index.md');
    const content = fs.readFileSync(indexPath, 'utf-8');

    expect(content).toContain('## Statistics');
    expect(content).toContain('- Total memories: 2');
    expect(content).toContain('| Memory Type | Count |');
    expect(content).toContain('| context | 1 |');
    expect(content).toContain('| issue | 1 |');
    expect(content).toMatch(/Generated: \d{4}-\d{2}-\d{2}T/);
  });

  it('writes relative memory links for each listed file', async () => {
    writeMemoryFixture(projectRoot, 'context', 'path-link-memory.md', 'path');

    await generateIndex(projectRoot, logger);

    const indexPath = path.join(projectRoot, PROJECT_MEMORY_DIR, 'index.md');
    const content = fs.readFileSync(indexPath, 'utf-8');

    expect(content).toContain('(./context/path-link-memory.md)');
  });

  it('creates index.md at .mnemonics/index.md', async () => {
    await generateIndex(projectRoot, logger);

    const expectedPath = path.join(projectRoot, PROJECT_MEMORY_DIR, 'index.md');
    expect(fs.existsSync(expectedPath)).toBe(true);
  });

  it('handles missing and malformed frontmatter gracefully', async () => {
    const mnemonicsPath = getProjectMemoryPath(projectRoot);
    ensureDirectory(path.join(mnemonicsPath, 'context'));

    fs.writeFileSync(
      path.join(mnemonicsPath, 'context', 'plain-file.md'),
      'This file has no frontmatter.\n',
      'utf-8',
    );

    fs.writeFileSync(
      path.join(mnemonicsPath, 'context', 'broken-frontmatter.md'),
      '---\ninvalid: [\n---\nBody\n',
      'utf-8',
    );

    await generateIndex(projectRoot, logger);

    const indexPath = path.join(mnemonicsPath, 'index.md');
    const content = fs.readFileSync(indexPath, 'utf-8');

    expect(content).toContain('- Total memories: 1');
    expect(content).toContain('## Context');
    expect(content).toContain('[Plain File](./context/plain-file.md)');
    expect(content).not.toContain('Broken Frontmatter');
  });
});
