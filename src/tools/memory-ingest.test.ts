import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { PluginConfig } from '../config';
import { ensureDirectory } from '../storage/paths';
import { createIngestTool } from './memory-ingest';

const logger = {
  info: (_message: string) => {},
  warn: (_message: string) => {},
  error: (_message: string) => {},
  debug: (_message: string) => {},
};

describe('createIngestTool', () => {
  let projectRoot: string;
  let config: PluginConfig;

  beforeEach(() => {
    projectRoot = path.join(
      os.tmpdir(),
      `historian-test-${crypto.randomUUID()}`,
    );
    ensureDirectory(projectRoot);
    ensureDirectory(path.join(projectRoot, '.mnemonics'));

    config = {
      temperature: 0.3,
      logLevel: 'info',
      debug: false,
      autoCompound: true,
    };
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('returns tool object with expected name', () => {
    const tool = createIngestTool(config, projectRoot, logger);
    expect(tool.name).toBe('memory_ingest');
  });

  it('returns tool object with description string', () => {
    const tool = createIngestTool(config, projectRoot, logger);
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('returns tool object with zod parameter schemas', () => {
    const tool = createIngestTool(config, projectRoot, logger);

    expect(tool.parameters).toHaveProperty('content');
    expect(tool.parameters).toHaveProperty('sourceType');
    expect(tool.parameters).toHaveProperty('context');

    expect(tool.parameters.content.safeParse('note').success).toBe(true);
    expect(tool.parameters.content.safeParse(123).success).toBe(false);

    expect(tool.parameters.sourceType.safeParse(undefined).success).toBe(true);
    expect(tool.parameters.sourceType.safeParse('conversation').success).toBe(
      true,
    );
    expect(tool.parameters.sourceType.safeParse(123).success).toBe(false);

    expect(tool.parameters.context.safeParse(undefined).success).toBe(true);
    expect(tool.parameters.context.safeParse('sprint retro').success).toBe(
      true,
    );
    expect(tool.parameters.context.safeParse({}).success).toBe(false);
  });

  it('returns failure for empty content', async () => {
    const tool = createIngestTool(config, projectRoot, logger);
    const result = await tool.handler({ content: '' });

    expect(result.success).toBe(false);
    expect(result.message).toBe('Content cannot be empty.');
    expect(result.instruction).toContain('Provide non-empty source content');
  });

  it('returns failure for whitespace-only content', async () => {
    const tool = createIngestTool(config, projectRoot, logger);
    const result = await tool.handler({ content: '   \n\t   ' });

    expect(result.success).toBe(false);
    expect(result.message).toBe('Content cannot be empty.');
    expect(result.instruction).toContain('call memory_ingest again');
  });

  it('returns success with instruction for valid content without optional params', async () => {
    const tool = createIngestTool(config, projectRoot, logger);
    const result = await tool.handler({
      content: 'Team decided to use PostgreSQL for analytics workloads.',
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Ingest instruction generated');
    expect(result.instruction).toContain(
      'You are performing memory ingest orchestration.',
    );
    expect(result.instruction).toContain(
      '- sourceType: (not provided; infer from content)',
    );
    expect(result.instruction).toContain('- context: (not provided)');
  });

  it('includes provided sourceType in instruction', async () => {
    const tool = createIngestTool(config, projectRoot, logger);
    const result = await tool.handler({
      content: 'Customer asked for shorter release notes.',
      sourceType: 'conversation',
    });

    expect(result.success).toBe(true);
    expect(result.instruction).toContain('- sourceType: conversation');
  });

  it('includes provided context in instruction', async () => {
    const tool = createIngestTool(config, projectRoot, logger);
    const result = await tool.handler({
      content: 'Retry policy updated after outage retrospective.',
      context: 'incident review 2026-04-10',
    });

    expect(result.success).toBe(true);
    expect(result.instruction).toContain(
      '- context: incident review 2026-04-10',
    );
  });

  it('includes both sourceType and context when both are provided', async () => {
    const tool = createIngestTool(config, projectRoot, logger);
    const result = await tool.handler({
      content: 'Adopted stricter API naming convention in design review.',
      sourceType: 'meeting-notes',
      context: 'api guild weekly',
    });

    expect(result.success).toBe(true);
    expect(result.instruction).toContain('- sourceType: meeting-notes');
    expect(result.instruction).toContain('- context: api guild weekly');
  });

  it('returns instruction with memory_remember execution guidance', async () => {
    const tool = createIngestTool(config, projectRoot, logger);
    const result = await tool.handler({
      content: 'Documented recurring deployment rollback checklist.',
    });

    expect(result.success).toBe(true);
    expect(result.instruction).toContain('memory_remember');
    expect(result.instruction).toContain('REQUIRED PROCESS:');
    expect(result.instruction).toContain('OUTPUT EXECUTION EXPECTATION:');
    expect(result.instruction).toContain(
      'title: concise, searchable, specific',
    );
    expect(result.instruction).toContain('memoryType: best-fit type');
    expect(result.instruction).toContain(
      'content: complete, durable summary with key facts and rationale',
    );
    expect(result.instruction).toContain('tags: 3-8 precise tags');
    expect(result.instruction).toContain('[[wikilinks]]');
  });

  it('handler does not throw with unusual valid input', async () => {
    const tool = createIngestTool(config, projectRoot, logger);

    await expect(
      tool.handler({
        content: '\n\t🧠 复杂输入 with unicode and symbols @@##$$%%\n',
        sourceType: 'document/📄/特殊',
        context: 'line1\nline2\tcontext',
      }),
    ).resolves.toMatchObject({ success: true });
  });
});
