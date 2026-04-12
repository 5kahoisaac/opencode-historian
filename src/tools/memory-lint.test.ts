import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { PluginConfig } from '../config';
import { createMemoryFile, parseMemoryFile, writeMemoryFile } from '../storage';
import { ensureDirectory } from '../storage/paths';
import type { Logger } from '../utils';
import { createLintTool } from './memory-lint';

const logger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

const config: PluginConfig = {
  temperature: 0.3,
  autoCompound: true,
  logLevel: 'info',
  debug: false,
};

interface MemoryFixtureOptions {
  related?: string[];
  modified?: string;
  mtimeMs?: number;
}

describe('createLintTool', () => {
  let projectRoot: string;
  let mnemonicsRoot: string;

  beforeEach(() => {
    projectRoot = path.join(
      os.tmpdir(),
      `historian-test-${crypto.randomUUID()}`,
    );
    mnemonicsRoot = path.join(projectRoot, '.mnemonics');
    ensureDirectory(mnemonicsRoot);
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  function writeMemoryFixture(
    memoryType: string,
    fileName: string,
    content: string,
    options: MemoryFixtureOptions = {},
  ): string {
    const typeDir = path.join(mnemonicsRoot, memoryType);
    ensureDirectory(typeDir);

    const filePath = path.join(typeDir, `${fileName}.md`);
    const memory = createMemoryFile(content, memoryType, []);

    if (options.related) {
      memory.data.related = options.related;
    }

    if (options.modified) {
      memory.data.modified = options.modified;
    }

    writeMemoryFile(filePath, memory);

    if (options.mtimeMs) {
      const timestamp = new Date(options.mtimeMs);
      fs.utimesSync(filePath, timestamp, timestamp);
    }

    return filePath;
  }

  async function runLint() {
    const tool = createLintTool(config, projectRoot, logger);
    return tool.handler();
  }

  it('returns tool metadata with expected structure', () => {
    const tool = createLintTool(config, projectRoot, logger);

    expect(tool.name).toBe('memory_lint');
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
    expect(tool.parameters).toEqual({});
  });

  it('returns healthy summary when there are no memories', async () => {
    const result = await runLint();

    expect(result).toEqual({
      success: true,
      summary: {
        totalMemories: 0,
        issuesFound: 0,
        healthScore: 100,
      },
      issues: [],
    });
  });

  it('returns success with healthScore 100 when all memories are healthy', async () => {
    writeMemoryFixture('context', 'alpha', 'See [[context/beta]].', {
      related: ['context/beta.md'],
    });
    writeMemoryFixture('context', 'beta', 'See [[context/alpha]].', {
      related: ['context/alpha.md'],
    });

    const result = await runLint();

    expect(result.success).toBe(true);
    expect(result.summary.totalMemories).toBe(2);
    expect(result.summary.issuesFound).toBe(0);
    expect(result.summary.healthScore).toBe(100);
    expect(result.issues).toEqual([]);
  });

  it('reports missing-frontmatter with error severity', async () => {
    const typeDir = path.join(mnemonicsRoot, 'context');
    ensureDirectory(typeDir);
    fs.writeFileSync(
      path.join(typeDir, 'no-frontmatter.md'),
      'plain body text',
    );

    const result = await runLint();
    const issue = result.issues.find(
      (item) => item.type === 'missing-frontmatter',
    );

    expect(issue).toBeDefined();
    expect(issue?.severity).toBe('error');
  });

  it('reports empty-content with warning severity', async () => {
    writeMemoryFixture('context', 'empty-body', '  \n\t ', {
      related: ['context/linked.md'],
    });

    const result = await runLint();
    const issue = result.issues.find((item) => item.type === 'empty-content');

    expect(issue).toBeDefined();
    expect(issue?.severity).toBe('warning');
  });

  it('reports invalid-type when memory_type is unrecognized', async () => {
    writeMemoryFixture('not-a-real-type', 'bad-type', 'content', {
      related: ['context/linked.md'],
    });

    const result = await runLint();
    const issue = result.issues.find((item) => item.type === 'invalid-type');

    expect(issue).toBeDefined();
    expect(issue?.severity).toBe('error');
    expect(issue?.message).toContain('Invalid memory_type');
  });

  it('reports stale memories based on filesystem mtime older than 90 days', async () => {
    const now = Date.now();
    const ninetyOneDaysAgo = now - 91 * 24 * 60 * 60 * 1000;

    const stalePath = writeMemoryFixture('context', 'stale-note', 'content', {
      related: ['context/linked.md'],
      modified: new Date(ninetyOneDaysAgo).toISOString(),
      mtimeMs: ninetyOneDaysAgo,
    });

    const parsed = await parseMemoryFile(stalePath);
    expect(parsed.data.modified).toBe(new Date(ninetyOneDaysAgo).toISOString());

    const result = await runLint();
    const issue = result.issues.find((item) => item.type === 'stale');

    expect(issue).toBeDefined();
    expect(issue?.severity).toBe('warning');
  });

  it('reports orphan memories when related field is missing or empty', async () => {
    writeMemoryFixture('context', 'orphan-note', 'orphan content');

    const result = await runLint();
    const issue = result.issues.find((item) => item.type === 'orphan');

    expect(issue).toBeDefined();
    expect(issue?.severity).toBe('info');
  });

  it('reports broken wikilinks when targets do not exist', async () => {
    writeMemoryFixture('context', 'broken-link', 'Reference [[nonexistent]].', {
      related: ['context/something.md'],
    });

    const result = await runLint();
    const issue = result.issues.find((item) => item.type === 'broken-wikilink');

    expect(issue).toBeDefined();
    expect(issue?.severity).toBe('warning');
    expect(issue?.message).toContain('[[nonexistent]]');
  });

  it('reports duplicate-title for same filename across different memory types', async () => {
    writeMemoryFixture('context', 'shared-title', 'content', {
      related: ['context/linked.md'],
    });
    writeMemoryFixture('issue', 'shared-title', 'content', {
      related: ['issue/linked.md'],
    });

    const result = await runLint();
    const duplicateIssues = result.issues.filter(
      (item) => item.type === 'duplicate-title',
    );

    expect(duplicateIssues).toHaveLength(2);
    expect(duplicateIssues.every((item) => item.severity === 'warning')).toBe(
      true,
    );
  });

  it('sorts issues by severity rank: error, warning, then info', async () => {
    const typeDir = path.join(mnemonicsRoot, 'context');
    ensureDirectory(typeDir);
    fs.writeFileSync(path.join(typeDir, 'missing-meta.md'), 'plain body text');

    writeMemoryFixture('context', 'empty-warning', '   ', {
      related: ['context/linked.md'],
    });

    writeMemoryFixture('context', 'orphan-info', 'has content');

    const result = await runLint();
    const severityOrder = result.issues.map((item) => item.severity);

    const rank = (severity: 'error' | 'warning' | 'info'): number => {
      if (severity === 'error') return 0;
      if (severity === 'warning') return 1;
      return 2;
    };

    for (let index = 1; index < severityOrder.length; index++) {
      expect(rank(severityOrder[index - 1])).toBeLessThanOrEqual(
        rank(severityOrder[index]),
      );
    }

    expect(severityOrder).toContain('error');
    expect(severityOrder).toContain('warning');
    expect(severityOrder).toContain('info');
  });

  it('calculates healthScore as rounded healthy/total percentage', async () => {
    writeMemoryFixture('context', 'healthy-a', 'content', {
      related: ['context/healthy-b.md'],
    });
    writeMemoryFixture('context', 'healthy-b', 'content', {
      related: ['context/healthy-a.md'],
    });
    writeMemoryFixture('context', 'unhealthy', '   ', {
      related: ['context/healthy-a.md'],
    });

    const result = await runLint();

    expect(result.summary.totalMemories).toBe(3);
    expect(result.summary.issuesFound).toBe(1);
    expect(result.summary.healthScore).toBe(Math.round((2 / 3) * 100));
  });
});
