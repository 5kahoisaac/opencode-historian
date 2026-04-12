import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ToolContext } from '@opencode-ai/plugin';
import type { OpencodeClient } from '@opencode-ai/sdk';
import type { PluginConfig } from '../config';
import { ensureDirectory } from '../storage/paths';
import { createIngestTool } from './memory-ingest';

const logger = {
  info: (_message: string) => {},
  warn: (_message: string) => {},
  error: (_message: string) => {},
  debug: (_message: string) => {},
};

function buildFingerprint(content: string): string {
  return crypto
    .createHash('sha256')
    .update(content.replace(/\r\n/g, '\n').trim())
    .digest('hex');
}

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
      sourcePaths: [],
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

  it('returns source-path no-op for empty content', async () => {
    const tool = createIngestTool(config, projectRoot, logger);
    const result = await tool.handler({ content: '' });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('source-paths');
    expect(result.message).toBe(
      'No sourcePaths configured; nothing to ingest.',
    );
    if (result.mode === 'source-paths') {
      expect(result.files).toEqual([]);
      expect(result.summary.filesDiscovered).toBe(0);
      expect(result.summary.filesProcessed).toBe(0);
      expect(result.summary.created).toBe(0);
      expect(result.summary.updated).toBe(0);
      expect(result.summary.skipped).toBe(0);
      expect(result.summary.failed).toBe(0);
      expect(result.summary.fallbackUsed).toBe(0);
      expect(result.summary.llmFallbackExecuted).toBe(0);
      expect(result.summary.llmFallbackSkipped).toBe(0);
      expect(result.summary.memoryUnitsCreated).toBe(0);
      expect(result.summary.memoryUnitsUpdated).toBe(0);
      expect(result.summary.memoryUnitsSkipped).toBe(0);
      expect(result.summary.memoryUnitsFailed).toBe(0);
      expect(result.summary.memoryUnitsPersisted).toBe(0);
    }
  });

  it('returns source-path no-op when content is omitted and no sourcePaths configured', async () => {
    const tool = createIngestTool(config, projectRoot, logger);
    const result = await tool.handler({});

    expect(result).toMatchObject({
      success: true,
      mode: 'source-paths',
      message: 'No sourcePaths configured; nothing to ingest.',
      files: [],
      summary: {
        configuredPatterns: [],
        filesDiscovered: 0,
        filesProcessed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        fallbackUsed: 0,
        llmFallbackExecuted: 0,
        llmFallbackSkipped: 0,
        memoryUnitsCreated: 0,
        memoryUnitsUpdated: 0,
        memoryUnitsSkipped: 0,
        memoryUnitsFailed: 0,
        memoryUnitsPersisted: 0,
      },
    });
  });

  it('creates memory in source-path mode when conversion succeeds', async () => {
    const sourceFilePath = path.join(projectRoot, 'sources', 'notes.md');
    ensureDirectory(path.dirname(sourceFilePath));
    fs.writeFileSync(sourceFilePath, 'source note');

    const rememberCalls: unknown[] = [];
    const tool = createIngestTool(
      {
        ...config,
        sourcePaths: ['./sources/'],
      },
      projectRoot,
      logger,
      {
        preflight: async () => ({
          available: true,
          method: 'markitdown',
          stdout: '',
          stderr: '',
        }),
        convert: async (inputPath) => ({
          success: true,
          method: 'markitdown',
          inputPath,
          markdown: '# Converted',
          stdout: '# Converted',
          stderr: '',
          exitCode: 0,
        }),
        remember: async (payload) => {
          rememberCalls.push(payload);
          return {
            success: true,
            filePath: path.join(projectRoot, '.mnemonics', 'context', 'a.md'),
            memoryType: 'context',
            tags: [],
            isUpdate: false,
          };
        },
      },
    );

    const result = await tool.handler({});

    expect(result.success).toBe(true);
    expect(result.mode).toBe('source-paths');
    if (result.mode === 'source-paths') {
      expect(result.summary).toEqual({
        configuredPatterns: ['./sources/'],
        filesDiscovered: 1,
        filesProcessed: 1,
        created: 1,
        updated: 0,
        skipped: 0,
        failed: 0,
        fallbackUsed: 0,
        llmFallbackExecuted: 0,
        llmFallbackSkipped: 0,
        memoryUnitsCreated: 1,
        memoryUnitsUpdated: 0,
        memoryUnitsSkipped: 0,
        memoryUnitsFailed: 0,
        memoryUnitsPersisted: 1,
      });
      expect(result.files[0]?.status).toBe('created');
      expect(result.files[0]?.methodAttempted).toBe('markitdown');
      expect(result.files[0]?.fallbackUsed).toBe(false);
      expect(result.files[0]?.fallbackExecution).toBe('not-needed');
      expect(result.files[0]?.memory?.filePath).toBeDefined();
      expect(result.message).toContain('1 created');
      expect(rememberCalls.length).toBe(1);
    }
  });

  it('extracts multiple memories from one file using strong heading boundaries', async () => {
    const sourceFilePath = path.join(projectRoot, 'sources', 'notes.md');
    ensureDirectory(path.dirname(sourceFilePath));
    fs.writeFileSync(sourceFilePath, 'source note');

    const rememberCalls: Array<{ content: string; title: string }> = [];
    const tool = createIngestTool(
      {
        ...config,
        sourcePaths: ['./sources/'],
      },
      projectRoot,
      logger,
      {
        preflight: async () => ({
          available: true,
          method: 'markitdown',
          stdout: '',
          stderr: '',
        }),
        convert: async (inputPath) => ({
          success: true,
          method: 'markitdown',
          inputPath,
          markdown: [
            '## Architecture Decision',
            '',
            'We decided to consolidate service-to-service authentication via a single trust boundary and explicit token validation at every hop. This removes ad hoc exceptions, documents ownership, and keeps incident triage deterministic when credentials drift.',
            '',
            '## Incident Follow-up',
            '',
            'The incident review captured root cause, blast radius, and concrete remediation ownership. We added regression checks, linked the runbook, and codified the fallback strategy so future failures can be triaged with less ambiguity and lower recovery time.',
          ].join('\n'),
          stdout: '',
          stderr: '',
          exitCode: 0,
        }),
        remember: async (payload) => {
          rememberCalls.push({
            title: payload.title,
            content: payload.content,
          });
          return {
            success: true,
            filePath: path.join(
              projectRoot,
              '.mnemonics',
              payload.memoryType,
              `${rememberCalls.length}.md`,
            ),
            memoryType: payload.memoryType,
            tags: payload.tags ?? [],
            isUpdate: false,
          };
        },
      },
    );

    const result = await tool.handler({});

    expect(result.mode).toBe('source-paths');
    if (result.mode === 'source-paths') {
      expect(result.files[0]?.memories).toHaveLength(2);
      expect(result.files[0]?.memories?.[0]?.unitId).toBe('u01');
      expect(result.files[0]?.memories?.[1]?.unitId).toBe('u02');
      expect(result.files[0]?.memories?.[0]?.boundaryType).toBe('heading');
      expect(result.files[0]?.memories?.[1]?.boundaryType).toBe('heading');
      expect(result.summary.created).toBe(1);
      expect(result.summary.memoryUnitsCreated).toBe(2);
      expect(result.summary.memoryUnitsPersisted).toBe(2);
      expect(result.message).toContain('Processed 1 source files:');
    }

    expect(rememberCalls).toHaveLength(2);
    expect(rememberCalls[0]?.content).toContain('- source_unit: u01');
    expect(rememberCalls[1]?.content).toContain('- source_unit: u02');
    expect(rememberCalls[0]?.content).toContain(
      'source_locator: sources/notes.md#u01',
    );
    expect(rememberCalls[1]?.content).toContain(
      'source_locator: sources/notes.md#u02',
    );
  });

  it('falls back to a single memory when boundaries are weak', async () => {
    const sourceFilePath = path.join(projectRoot, 'sources', 'notes.md');
    ensureDirectory(path.dirname(sourceFilePath));
    fs.writeFileSync(sourceFilePath, 'source note');

    const rememberCalls: Array<{ content: string }> = [];
    const tool = createIngestTool(
      {
        ...config,
        sourcePaths: ['./sources/'],
      },
      projectRoot,
      logger,
      {
        preflight: async () => ({
          available: true,
          method: 'markitdown',
          stdout: '',
          stderr: '',
        }),
        convert: async (inputPath) => ({
          success: true,
          method: 'markitdown',
          inputPath,
          markdown: [
            '## A',
            '',
            'Short note.',
            '',
            '## B',
            '',
            'Another short note.',
          ].join('\n'),
          stdout: '',
          stderr: '',
          exitCode: 0,
        }),
        remember: async (payload) => {
          rememberCalls.push({ content: payload.content });
          return {
            success: true,
            filePath: path.join(projectRoot, '.mnemonics', 'context', 'a.md'),
            memoryType: payload.memoryType,
            tags: payload.tags ?? [],
            isUpdate: false,
          };
        },
      },
    );

    const result = await tool.handler({});

    expect(result.mode).toBe('source-paths');
    if (result.mode === 'source-paths') {
      expect(result.files[0]?.memories).toHaveLength(1);
      expect(result.files[0]?.memories?.[0]?.unitId).toBe('u01');
      expect(result.files[0]?.memories?.[0]?.boundaryType).toBe('single');
      expect(result.summary.memoryUnitsCreated).toBe(1);
      expect(result.summary.memoryUnitsPersisted).toBe(1);
    }

    expect(rememberCalls).toHaveLength(1);
    expect(rememberCalls[0]?.content).toContain('- source_unit: u01');
    expect(rememberCalls[0]?.content).toContain(
      'source_locator: sources/notes.md#u01',
    );
  });

  it('reports file-level and unit-level counters independently', async () => {
    const sourceFilePathA = path.join(projectRoot, 'sources', 'a.md');
    const sourceFilePathB = path.join(projectRoot, 'sources', 'b.md');
    ensureDirectory(path.dirname(sourceFilePathA));
    fs.writeFileSync(sourceFilePathA, 'source a');
    fs.writeFileSync(sourceFilePathB, 'source b');

    const tool = createIngestTool(
      {
        ...config,
        sourcePaths: ['./sources/'],
      },
      projectRoot,
      logger,
      {
        preflight: async () => ({
          available: true,
          method: 'markitdown',
          stdout: '',
          stderr: '',
        }),
        convert: async (inputPath) => ({
          success: true,
          method: 'markitdown',
          inputPath,
          markdown: inputPath.endsWith('a.md')
            ? [
                '## Section One',
                '',
                'This section is intentionally long to trigger conservative strong-boundary splitting. It captures operational details, ownership, and clear outcomes so that each extracted memory remains durable and independently useful for future recall across sessions.',
                '',
                '## Section Two',
                '',
                'This second section is also long enough to satisfy the minimum unit threshold. It describes follow-up actions, verification criteria, and rationale, enabling reliable multi-unit persistence from a single source file without over-segmentation.',
              ].join('\n')
            : 'single file content that should remain one memory unit',
          stdout: '',
          stderr: '',
          exitCode: 0,
        }),
        remember: async (payload) => ({
          success: true,
          filePath: path.join(
            projectRoot,
            '.mnemonics',
            payload.memoryType,
            `${crypto.randomUUID()}.md`,
          ),
          memoryType: payload.memoryType,
          tags: payload.tags ?? [],
          isUpdate: false,
        }),
      },
    );

    const result = await tool.handler({});

    expect(result.mode).toBe('source-paths');
    if (result.mode === 'source-paths') {
      expect(result.summary.filesProcessed).toBe(2);
      expect(result.summary.created).toBe(2);
      expect(result.summary.memoryUnitsCreated).toBe(3);
      expect(result.summary.memoryUnitsPersisted).toBe(3);
      expect(result.summary.memoryUnitsFailed).toBe(0);
      expect(result.files[0]?.memories?.length).toBe(2);
      expect(result.files[1]?.memories?.length).toBe(1);
      expect(result.message).toContain('Processed 2 source files:');
    }
  });

  it('runs conservative post-persist related enrichment for persisted files', async () => {
    const sourceFilePath = path.join(projectRoot, 'sources', 'notes.md');
    ensureDirectory(path.dirname(sourceFilePath));
    fs.writeFileSync(sourceFilePath, 'source note');

    const persistedPath = path.join(
      projectRoot,
      '.mnemonics',
      'context',
      'a.md',
    );
    const findRelatedCalls: Array<{ maxRelated?: number; minScore?: number }> =
      [];
    const updateRelatedCalls: Array<{ source: string; related: string[] }> = [];
    const backlinkCalls: Array<{ source: string; related: string[] }> = [];

    const tool = createIngestTool(
      {
        ...config,
        sourcePaths: ['./sources/'],
      },
      projectRoot,
      logger,
      {
        preflight: async () => ({
          available: true,
          method: 'markitdown',
          stdout: '',
          stderr: '',
        }),
        convert: async (inputPath) => ({
          success: true,
          method: 'markitdown',
          inputPath,
          markdown: '# Converted',
          stdout: '# Converted',
          stderr: '',
          exitCode: 0,
        }),
        remember: async () => ({
          success: true,
          filePath: persistedPath,
          memoryType: 'context',
          tags: [],
          isUpdate: false,
        }),
        findRelated: async (_filePath, _projectRoot, _logger, options) => {
          findRelatedCalls.push(options ?? {});
          return [
            path.join(projectRoot, '.mnemonics', 'context', 'related.md'),
          ];
        },
        updateRelated: async (filePath, relatedPaths) => {
          updateRelatedCalls.push({ source: filePath, related: relatedPaths });
        },
        addBacklinks: async (filePath, relatedPaths) => {
          backlinkCalls.push({ source: filePath, related: relatedPaths });
        },
      },
    );

    const result = await tool.handler({});

    expect(result.mode).toBe('source-paths');
    expect(findRelatedCalls).toHaveLength(1);
    expect(findRelatedCalls[0]).toEqual({ maxRelated: 3, minScore: 0.45 });
    expect(updateRelatedCalls).toHaveLength(1);
    expect(updateRelatedCalls[0]?.source).toBe(persistedPath);
    expect(backlinkCalls).toHaveLength(1);
    expect(backlinkCalls[0]?.source).toBe(persistedPath);
  });

  it('persists ingest record metadata for source-path run logging', async () => {
    const sourceFilePath = path.join(projectRoot, 'sources', 'notes.md');
    ensureDirectory(path.dirname(sourceFilePath));
    fs.writeFileSync(sourceFilePath, 'source note');

    const rememberCalls: Array<{ content: string; tags?: string[] }> = [];
    const tool = createIngestTool(
      {
        ...config,
        sourcePaths: ['./sources/'],
      },
      projectRoot,
      logger,
      {
        preflight: async () => ({
          available: true,
          method: 'markitdown',
          stdout: '',
          stderr: '',
        }),
        convert: async (inputPath) => ({
          success: true,
          method: 'markitdown',
          inputPath,
          markdown: 'Converted body',
          stdout: 'Converted body',
          stderr: '',
          exitCode: 0,
        }),
        remember: async (payload) => {
          rememberCalls.push({
            content: payload.content,
            tags: payload.tags,
          });
          return {
            success: true,
            filePath: path.join(projectRoot, '.mnemonics', 'context', 'a.md'),
            memoryType: payload.memoryType,
            tags: payload.tags ?? [],
            isUpdate: false,
          };
        },
      },
    );

    const result = await tool.handler({});

    expect(result.mode).toBe('source-paths');
    expect(rememberCalls.length).toBe(1);
    expect(rememberCalls[0]?.content).toContain('# Source Ingest Record');
    expect(rememberCalls[0]?.content).toContain(
      '- extraction_method: markitdown',
    );
    expect(rememberCalls[0]?.content).toContain('- fallback_used: no');
    expect(rememberCalls[0]?.content).toContain('## Extracted Content');
    expect(rememberCalls[0]?.content).toContain('Converted body');
    expect(rememberCalls[0]?.tags).toContain('source-ingest');
    expect(rememberCalls[0]?.tags).toContain('source-path-mode');
    expect(rememberCalls[0]?.tags).toContain('markitdown');
  });

  it('updates existing deterministic memory file in source-path mode', async () => {
    const sourceFilePath = path.join(projectRoot, 'sources', 'notes.md');
    ensureDirectory(path.dirname(sourceFilePath));
    fs.writeFileSync(sourceFilePath, 'source note');

    const tool = createIngestTool(
      {
        ...config,
        sourcePaths: ['./sources/'],
      },
      projectRoot,
      logger,
      {
        preflight: async () => ({
          available: true,
          method: 'markitdown',
          stdout: '',
          stderr: '',
        }),
        convert: async (inputPath) => ({
          success: true,
          method: 'markitdown',
          inputPath,
          markdown: '# Converted',
          stdout: '# Converted',
          stderr: '',
          exitCode: 0,
        }),
        remember: async () => ({
          success: true,
          filePath: path.join(projectRoot, '.mnemonics', 'context', 'a.md'),
          memoryType: 'context',
          tags: [],
          isUpdate: true,
        }),
      },
    );

    const result = await tool.handler({});

    expect(result.mode).toBe('source-paths');
    if (result.mode === 'source-paths') {
      expect(result.summary.updated).toBe(1);
      expect(result.files[0]?.status).toBe('updated');
      expect(result.files[0]?.outcome).toBe('updated');
    }
  });

  it('infers a better-fit built-in memory type in source-path mode', async () => {
    const sourceFilePath = path.join(projectRoot, 'sources', 'incident.md');
    ensureDirectory(path.dirname(sourceFilePath));
    fs.writeFileSync(sourceFilePath, 'incident source');

    const rememberCalls: Array<{ memoryType: string }> = [];
    const tool = createIngestTool(
      {
        ...config,
        sourcePaths: ['./sources/'],
      },
      projectRoot,
      logger,
      {
        preflight: async () => ({
          available: true,
          method: 'markitdown',
          stdout: '',
          stderr: '',
        }),
        convert: async (inputPath) => ({
          success: true,
          method: 'markitdown',
          inputPath,
          markdown: 'Production incident root cause and regression details.',
          stdout: '',
          stderr: '',
          exitCode: 0,
        }),
        remember: async (payload) => {
          rememberCalls.push({ memoryType: payload.memoryType });
          return {
            success: true,
            filePath: path.join(projectRoot, '.mnemonics', 'issue', 'a.md'),
            memoryType: payload.memoryType,
            tags: [],
            isUpdate: false,
          };
        },
      },
    );

    const result = await tool.handler({});

    expect(result.mode).toBe('source-paths');
    if (result.mode === 'source-paths') {
      expect(result.summary.created).toBe(1);
      expect(result.files[0]?.memory?.memoryType).toBe('issue');
    }
    expect(rememberCalls[0]?.memoryType).toBe('issue');
  });

  it('updates by strong fingerprint match even when source_path differs', async () => {
    const sourceFilePath = path.join(projectRoot, 'sources', 'moved-notes.md');
    ensureDirectory(path.dirname(sourceFilePath));
    fs.writeFileSync(sourceFilePath, 'new location');

    const extracted = 'Stable extracted content for strong fingerprint match.';
    const existingPath = path.join(
      projectRoot,
      '.mnemonics',
      'learning',
      'existing.md',
    );
    ensureDirectory(path.dirname(existingPath));
    fs.writeFileSync(
      existingPath,
      [
        '---',
        'id: existing-id',
        'created: 2025-01-01T00:00:00.000Z',
        'modified: 2025-01-01T00:00:00.000Z',
        'memory_type: learning',
        '---',
        '# Source Ingest Record',
        '',
        '- source_path: sources/old-notes.md',
        `- source_fingerprint: ${buildFingerprint(extracted)}`,
        '',
        '## Extracted Content',
        '',
        extracted,
      ].join('\n'),
    );

    const rememberCalls: Array<{ filePath?: string; memoryType: string }> = [];
    const tool = createIngestTool(
      {
        ...config,
        sourcePaths: ['./sources/'],
      },
      projectRoot,
      logger,
      {
        preflight: async () => ({
          available: true,
          method: 'markitdown',
          stdout: '',
          stderr: '',
        }),
        convert: async (inputPath) => ({
          success: true,
          method: 'markitdown',
          inputPath,
          markdown: extracted,
          stdout: '',
          stderr: '',
          exitCode: 0,
        }),
        remember: async (payload) => {
          rememberCalls.push({
            filePath: payload.filePath,
            memoryType: payload.memoryType,
          });
          return {
            success: true,
            filePath: payload.filePath ?? existingPath,
            memoryType: payload.memoryType,
            tags: [],
            isUpdate: true,
          };
        },
      },
    );

    const result = await tool.handler({});

    expect(result.mode).toBe('source-paths');
    if (result.mode === 'source-paths') {
      expect(result.summary.updated).toBe(1);
      expect(result.files[0]?.status).toBe('updated');
      expect(result.files[0]?.memory?.memoryType).toBe('learning');
    }
    expect(rememberCalls[0]?.filePath).toBe(existingPath);
    expect(rememberCalls[0]?.memoryType).toBe('learning');
  });

  it('skips persistence when dedupe match is ambiguous', async () => {
    const sourceFilePath = path.join(projectRoot, 'sources', 'notes.md');
    ensureDirectory(path.dirname(sourceFilePath));
    fs.writeFileSync(sourceFilePath, 'ambiguous source');

    const extracted = 'Same content that appears in multiple existing records.';
    const fingerprint = buildFingerprint(extracted);

    const existingA = path.join(
      projectRoot,
      '.mnemonics',
      'context',
      'existing-a.md',
    );
    const existingB = path.join(
      projectRoot,
      '.mnemonics',
      'context',
      'existing-b.md',
    );

    ensureDirectory(path.dirname(existingA));
    fs.writeFileSync(
      existingA,
      [
        '---',
        'id: existing-a',
        'created: 2025-01-01T00:00:00.000Z',
        'modified: 2025-01-01T00:00:00.000Z',
        'memory_type: context',
        '---',
        '# Source Ingest Record',
        '',
        '- source_path: sources/a.md',
        `- source_fingerprint: ${fingerprint}`,
      ].join('\n'),
    );
    fs.writeFileSync(
      existingB,
      [
        '---',
        'id: existing-b',
        'created: 2025-01-01T00:00:00.000Z',
        'modified: 2025-01-01T00:00:00.000Z',
        'memory_type: context',
        '---',
        '# Source Ingest Record',
        '',
        '- source_path: sources/b.md',
        `- source_fingerprint: ${fingerprint}`,
      ].join('\n'),
    );

    let rememberCalled = false;
    const tool = createIngestTool(
      {
        ...config,
        sourcePaths: ['./sources/'],
      },
      projectRoot,
      logger,
      {
        preflight: async () => ({
          available: true,
          method: 'markitdown',
          stdout: '',
          stderr: '',
        }),
        convert: async (inputPath) => ({
          success: true,
          method: 'markitdown',
          inputPath,
          markdown: extracted,
          stdout: '',
          stderr: '',
          exitCode: 0,
        }),
        remember: async () => {
          rememberCalled = true;
          return {
            success: true,
            filePath: path.join(projectRoot, '.mnemonics', 'context', 'a.md'),
            memoryType: 'context',
            tags: [],
            isUpdate: false,
          };
        },
      },
    );

    const result = await tool.handler({});

    expect(result.mode).toBe('source-paths');
    if (result.mode === 'source-paths') {
      expect(result.summary.skipped).toBe(1);
      expect(result.summary.created).toBe(0);
      expect(result.summary.updated).toBe(0);
      expect(result.files[0]?.status).toBe('skipped');
      expect(result.files[0]?.memories).toHaveLength(1);
      expect(result.files[0]?.memories?.[0]).toMatchObject({
        unitId: 'u01',
        status: 'skipped',
        boundaryType: 'single',
        sourceRelativePath: 'sources/notes.md',
      });
      expect(result.files[0]?.memories?.[0]?.message).toContain(
        'source_fingerprint',
      );
      expect(result.summary.memoryUnitsSkipped).toBe(1);
      expect(result.summary.memoryUnitsPersisted).toBe(0);
      expect(result.reviewArtifact).toEqual({
        path: '.mnemonics/review/source-ingest-ambiguous.ndjson',
        entriesWritten: 1,
        totalEntries: 1,
      });
    }
    expect(rememberCalled).toBe(false);

    const artifactPath = path.join(
      projectRoot,
      '.mnemonics',
      'review',
      'source-ingest-ambiguous.ndjson',
    );
    const raw = fs.readFileSync(artifactPath, 'utf-8').trim();
    const parsed = JSON.parse(raw) as {
      sourcePath: string;
      reasonCode: string;
      unitId?: string;
      message: string;
    };

    expect(parsed.sourcePath).toBe('sources/notes.md');
    expect(parsed.reasonCode).toBe('ambiguous-fingerprint-match');
    expect(parsed.unitId).toBe('u01');
    expect(parsed.message).toContain('ambiguity');
  });

  it('extracts multiple memories using strong horizontal-rule boundaries', async () => {
    const sourceFilePath = path.join(projectRoot, 'sources', 'notes.md');
    ensureDirectory(path.dirname(sourceFilePath));
    fs.writeFileSync(sourceFilePath, 'source note');

    const rememberCalls: Array<{ content: string; title: string }> = [];
    const tool = createIngestTool(
      {
        ...config,
        sourcePaths: ['./sources/'],
      },
      projectRoot,
      logger,
      {
        preflight: async () => ({
          available: true,
          method: 'markitdown',
          stdout: '',
          stderr: '',
        }),
        convert: async (inputPath) => ({
          success: true,
          method: 'markitdown',
          inputPath,
          markdown: [
            '# Section One',
            '',
            '- The team standardized ingest metadata with stable source locators and deterministic fingerprints so audits can compare outcomes across runs with less ambiguity and stronger replay behavior for migration scenarios.',
            '- The extraction flow now persists run-specific provenance fields, keeping manual triage simple and repeatable for long-lived project memory stores.',
            '',
            '---',
            '',
            '# Section Two',
            '',
            '- Horizontal-rule partitioning is now preserved when sections include clear structure, allowing conservative multi-unit extraction without fragmenting unrelated context or collapsing independently useful knowledge.',
            '- Each unit remains traceable through explicit source markers and deterministic IDs for future updates.',
            '',
            '---',
            '',
            '# Section Three',
            '',
            '- The final section documents follow-up ownership, verification checkpoints, and rollback cues to ensure source-driven memories remain actionable and durable over repeated ingest runs in CI and local environments.',
            '- This keeps downstream recall quality stable while avoiding speculative merges.',
          ].join('\n'),
          stdout: '',
          stderr: '',
          exitCode: 0,
        }),
        remember: async (payload) => {
          rememberCalls.push({
            title: payload.title,
            content: payload.content,
          });
          return {
            success: true,
            filePath: path.join(
              projectRoot,
              '.mnemonics',
              payload.memoryType,
              `${rememberCalls.length}.md`,
            ),
            memoryType: payload.memoryType,
            tags: payload.tags ?? [],
            isUpdate: false,
          };
        },
      },
    );

    const result = await tool.handler({});

    expect(result.mode).toBe('source-paths');
    if (result.mode === 'source-paths') {
      expect(result.files[0]?.memories).toHaveLength(3);
      expect(
        result.files[0]?.memories?.every(
          (m) => m.boundaryType === 'horizontal-rule',
        ),
      ).toBe(true);
      expect(result.summary.memoryUnitsCreated).toBe(3);
      expect(result.summary.memoryUnitsPersisted).toBe(3);
    }

    expect(rememberCalls).toHaveLength(3);
    expect(rememberCalls[0]?.content).toContain('- source_unit: u01');
    expect(rememberCalls[1]?.content).toContain('- source_unit: u02');
    expect(rememberCalls[2]?.content).toContain('- source_unit: u03');
  });

  it('uses deterministic fallback extraction and persists when markitdown preflight fails', async () => {
    const sourceFilePath = path.join(projectRoot, 'sources', 'notes.txt');
    ensureDirectory(path.dirname(sourceFilePath));
    fs.writeFileSync(sourceFilePath, 'plain text fallback');

    const tool = createIngestTool(
      {
        ...config,
        sourcePaths: ['./sources/'],
      },
      projectRoot,
      logger,
      {
        preflight: async () => ({
          available: false,
          method: 'markitdown',
          reason: 'missing-binary',
          message: 'missing',
          stdout: '',
          stderr: '',
        }),
        convert: async (inputPath) => ({
          success: true,
          method: 'markitdown',
          inputPath,
          markdown: 'unused',
          stdout: '',
          stderr: '',
          exitCode: 0,
        }),
        remember: async () => ({
          success: true,
          filePath: path.join(projectRoot, '.mnemonics', 'context', 'a.md'),
          memoryType: 'context',
          tags: [],
          isUpdate: false,
        }),
      },
    );

    const result = await tool.handler({});

    expect(result.mode).toBe('source-paths');
    if (result.mode === 'source-paths') {
      expect(result.summary.fallbackUsed).toBe(1);
      expect(result.summary.llmFallbackExecuted).toBe(0);
      expect(result.summary.llmFallbackSkipped).toBe(0);
      expect(result.summary.created).toBe(1);
      expect(result.files[0]?.methodAttempted).toBe('text-fallback');
      expect(result.files[0]?.fallbackUsed).toBe(true);
      expect(result.files[0]?.fallbackExecution).toBe('deterministic');
      expect(result.files[0]?.status).toBe('created');
    }
  });

  it('applies deterministic json fallback normalization without LLM fallback', async () => {
    const sourceFilePath = path.join(projectRoot, 'sources', 'data.json');
    ensureDirectory(path.dirname(sourceFilePath));
    fs.writeFileSync(sourceFilePath, '{"b":2,"a":{"x":1}}');

    const rememberCalls: Array<{ content: string }> = [];
    const tool = createIngestTool(
      {
        ...config,
        sourcePaths: ['./sources/'],
      },
      projectRoot,
      logger,
      {
        preflight: async () => ({
          available: false,
          method: 'markitdown',
          reason: 'missing-binary',
          message: 'missing',
          stdout: '',
          stderr: '',
        }),
        remember: async (payload) => {
          rememberCalls.push({ content: payload.content });
          return {
            success: true,
            filePath: path.join(projectRoot, '.mnemonics', 'context', 'a.md'),
            memoryType: 'context',
            tags: [],
            isUpdate: false,
          };
        },
      },
    );

    const result = await tool.handler({});

    expect(result.mode).toBe('source-paths');
    if (result.mode === 'source-paths') {
      expect(result.summary.created).toBe(1);
      expect(result.summary.fallbackUsed).toBe(1);
      expect(result.summary.llmFallbackExecuted).toBe(0);
      expect(result.files[0]?.methodAttempted).toBe('text-fallback');
      expect(result.files[0]?.fallbackExecution).toBe('deterministic');
    }

    expect(rememberCalls).toHaveLength(1);
    const persistedContent = rememberCalls[0]?.content ?? '';
    expect(persistedContent).toContain('"b": 2');
    expect(persistedContent).toContain('"a": {');
    expect(persistedContent).toContain('"x": 1');
  });

  it('keeps failures explicit when fallback extraction cannot run safely', async () => {
    const sourceFilePath = path.join(projectRoot, 'sources', 'notes.pdf');
    ensureDirectory(path.dirname(sourceFilePath));
    fs.writeFileSync(sourceFilePath, 'pdf source');

    const tool = createIngestTool(
      {
        ...config,
        sourcePaths: ['./sources/'],
      },
      projectRoot,
      logger,
      {
        preflight: async () => ({
          available: false,
          method: 'markitdown',
          reason: 'missing-binary',
          message: 'missing',
          stdout: '',
          stderr: '',
        }),
        convert: async (inputPath) => ({
          success: true,
          method: 'markitdown',
          inputPath,
          markdown: 'unused',
          stdout: '',
          stderr: '',
          exitCode: 0,
        }),
      },
    );

    const result = await tool.handler({});

    expect(result.mode).toBe('source-paths');
    if (result.mode === 'source-paths') {
      expect(result.summary.failed).toBe(1);
      expect(result.summary.fallbackUsed).toBe(0);
      expect(result.summary.llmFallbackExecuted).toBe(0);
      expect(result.summary.llmFallbackSkipped).toBe(1);
      expect(result.files[0]?.status).toBe('failed');
      expect(result.files[0]?.outcome).toBe('missing-binary');
      expect(result.files[0]?.fallbackExecution).toBe('llm-skipped');
      expect(result.files[0]?.extractionError).toContain(
        'Fallback extraction boundary reached',
      );
      expect(result.instruction).toContain(
        'bounded by strict per-run file count, file-size, and output-size limits',
      );
    }
  });

  it('uses LLM fallback extraction when deterministic fallback cannot run', async () => {
    const sourceFilePath = path.join(projectRoot, 'sources', 'notes.pdf');
    ensureDirectory(path.dirname(sourceFilePath));
    fs.writeFileSync(sourceFilePath, 'pdf source');

    const tool = createIngestTool(
      {
        ...config,
        sourcePaths: ['./sources/'],
      },
      projectRoot,
      logger,
      {
        preflight: async () => ({
          available: false,
          method: 'markitdown',
          reason: 'missing-binary',
          message: 'missing',
          stdout: '',
          stderr: '',
        }),
        convert: async (inputPath) => ({
          success: true,
          method: 'markitdown',
          inputPath,
          markdown: 'unused',
          stdout: '',
          stderr: '',
          exitCode: 0,
        }),
        extractLlmFallback: async () => ({
          success: true,
          method: 'llm-fallback',
          content: 'Extracted by llm fallback',
          message: 'ok',
          executed: true,
          skipped: false,
        }),
        remember: async () => ({
          success: true,
          filePath: path.join(projectRoot, '.mnemonics', 'context', 'a.md'),
          memoryType: 'context',
          tags: [],
          isUpdate: false,
        }),
      },
    );

    const result = await tool.handler({});

    expect(result.mode).toBe('source-paths');
    if (result.mode === 'source-paths') {
      expect(result.summary.created).toBe(1);
      expect(result.summary.failed).toBe(0);
      expect(result.summary.fallbackUsed).toBe(1);
      expect(result.summary.llmFallbackExecuted).toBe(1);
      expect(result.summary.llmFallbackSkipped).toBe(0);
      expect(result.files[0]?.methodAttempted).toBe('llm-fallback');
      expect(result.files[0]?.fallbackExecution).toBe('llm-executed');
      expect(result.files[0]?.status).toBe('created');
    }
  });

  it('normalizes LLM fallback output before persistence', async () => {
    const sourceFilePath = path.join(projectRoot, 'sources', 'notes.pdf');
    ensureDirectory(path.dirname(sourceFilePath));
    fs.writeFileSync(sourceFilePath, 'binary-like source');

    const rememberCalls: Array<{ content: string }> = [];
    const tool = createIngestTool(
      {
        ...config,
        sourcePaths: ['./sources/'],
      },
      projectRoot,
      logger,
      {
        preflight: async () => ({
          available: false,
          method: 'markitdown',
          reason: 'missing-binary',
          message: 'missing',
          stdout: '',
          stderr: '',
        }),
        extractFallback: async () => ({
          success: false,
          method: 'text-fallback',
          message: 'deterministic fallback unavailable',
        }),
        remember: async (payload) => {
          rememberCalls.push({ content: payload.content });
          return {
            success: true,
            filePath: path.join(projectRoot, '.mnemonics', 'context', 'a.md'),
            memoryType: payload.memoryType,
            tags: [],
            isUpdate: false,
          };
        },
      },
      {
        client: {
          session: {
            prompt: async () => ({
              data: {
                parts: [
                  {
                    type: 'text',
                    text: [
                      'Here is the extracted text:',
                      '```markdown',
                      '## Key Facts',
                      '- Fact A',
                      '```',
                      'Let me know if you need anything else.',
                    ].join('\n'),
                  },
                ],
              },
            }),
          },
        } as unknown as OpencodeClient,
      },
    );

    const result = await tool.handler({}, {
      sessionID: 'session-1',
      messageID: 'message-1',
      directory: projectRoot,
    } as ToolContext);

    expect(result.mode).toBe('source-paths');
    if (result.mode === 'source-paths') {
      expect(result.summary.llmFallbackExecuted).toBe(1);
      expect(result.summary.created).toBe(1);
    }

    expect(rememberCalls).toHaveLength(1);
    const persistedContent = rememberCalls[0]?.content ?? '';
    expect(persistedContent).toContain('## Key Facts');
    expect(persistedContent).toContain('- Fact A');
    expect(persistedContent).not.toContain('Here is the extracted text');
    expect(persistedContent).not.toContain('```markdown');
    expect(persistedContent).not.toContain('```');
    expect(persistedContent).not.toContain('Let me know if you need');
  });

  it('normalizes and bounds LLM fallback output before persistence', async () => {
    const sourceFilePath = path.join(projectRoot, 'sources', 'notes.pdf');
    ensureDirectory(path.dirname(sourceFilePath));
    fs.writeFileSync(sourceFilePath, 'binary-like source');

    const rememberCalls: Array<{ content: string }> = [];
    const tool = createIngestTool(
      {
        ...config,
        sourcePaths: ['./sources/'],
      },
      projectRoot,
      logger,
      {
        preflight: async () => ({
          available: false,
          method: 'markitdown',
          reason: 'missing-binary',
          message: 'missing',
          stdout: '',
          stderr: '',
        }),
        extractFallback: async () => ({
          success: false,
          method: 'text-fallback',
          message: 'deterministic fallback unavailable',
        }),
        remember: async (payload) => {
          rememberCalls.push({ content: payload.content });
          return {
            success: true,
            filePath: path.join(projectRoot, '.mnemonics', 'context', 'a.md'),
            memoryType: payload.memoryType,
            tags: [],
            isUpdate: false,
          };
        },
      },
      {
        llmFallbackLimits: {
          maxOutputChars: 120,
        },
        client: {
          session: {
            prompt: async () => ({
              data: {
                parts: [
                  {
                    type: 'text',
                    text: [
                      'Sure.',
                      '```markdown',
                      '# Key Findings',
                      '1. This line should remain because it is structured and useful for persisted extraction output.',
                      '2. This line should be truncated by maxOutputChars in the normalized result before persistence happens.',
                      '```',
                      'Hope this helps.',
                    ].join('\n'),
                  },
                ],
              },
            }),
          },
        } as unknown as OpencodeClient,
      },
    );

    const result = await tool.handler({}, {
      sessionID: 'session-1',
      messageID: 'message-1',
      directory: projectRoot,
    } as ToolContext);

    expect(result.mode).toBe('source-paths');
    if (result.mode === 'source-paths') {
      expect(result.summary.llmFallbackExecuted).toBe(1);
      expect(result.summary.created).toBe(1);
      expect(result.files[0]?.methodAttempted).toBe('llm-fallback');
      expect(result.files[0]?.fallbackExecution).toBe('llm-executed');
    }

    expect(rememberCalls).toHaveLength(1);
    const persistedContent = rememberCalls[0]?.content ?? '';
    expect(persistedContent).toContain('# Key Findings');
    expect(persistedContent).not.toContain('Sure.');
    expect(persistedContent).not.toContain('```markdown');
    expect(persistedContent).not.toContain('Hope this helps.');
    expect(persistedContent.length).toBeLessThan(700);
  });

  it('appends one concise ingest run summary log entry', async () => {
    const sourceFilePath = path.join(projectRoot, 'sources', 'notes.md');
    ensureDirectory(path.dirname(sourceFilePath));
    fs.writeFileSync(sourceFilePath, 'source note');

    const logEntries: Array<{ action: string; summary?: string }> = [];
    const tool = createIngestTool(
      {
        ...config,
        sourcePaths: ['./sources/'],
      },
      projectRoot,
      logger,
      {
        preflight: async () => ({
          available: true,
          method: 'markitdown',
          stdout: '',
          stderr: '',
        }),
        convert: async (inputPath) => ({
          success: true,
          method: 'markitdown',
          inputPath,
          markdown: '# Converted',
          stdout: '# Converted',
          stderr: '',
          exitCode: 0,
        }),
        remember: async () => ({
          success: true,
          filePath: path.join(projectRoot, '.mnemonics', 'context', 'a.md'),
          memoryType: 'context',
          tags: [],
          isUpdate: false,
        }),
        appendLog: async (_projectRoot, entry) => {
          logEntries.push({ action: entry.action, summary: entry.summary });
        },
      },
    );

    await tool.handler({});

    expect(logEntries).toHaveLength(1);
    expect(logEntries[0]?.action).toBe('ingest');
    expect(logEntries[0]?.summary).toContain('created=1');
    expect(logEntries[0]?.summary).toContain('updated=0');
    expect(logEntries[0]?.summary).toContain('skipped=0');
    expect(logEntries[0]?.summary).toContain('failed=0');
    expect(logEntries[0]?.summary).toContain('fallback=0');
  });

  it('returns source-path no-op when sourcePaths are configured but resolve no files', async () => {
    const tool = createIngestTool(
      {
        ...config,
        sourcePaths: ['./missing-sources/'],
      },
      projectRoot,
      logger,
    );

    const result = await tool.handler({});

    expect(result).toMatchObject({
      success: true,
      mode: 'source-paths',
      message:
        'No source files resolved from configured sourcePaths; nothing to ingest.',
      files: [],
      summary: {
        configuredPatterns: ['./missing-sources/'],
        filesDiscovered: 0,
        filesProcessed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        fallbackUsed: 0,
        llmFallbackExecuted: 0,
        llmFallbackSkipped: 0,
        memoryUnitsCreated: 0,
        memoryUnitsUpdated: 0,
        memoryUnitsSkipped: 0,
        memoryUnitsFailed: 0,
        memoryUnitsPersisted: 0,
      },
    });
  });

  it('preserves content-mode behavior and does not invoke source-path conversion deps', async () => {
    const tool = createIngestTool(config, projectRoot, logger, {
      preflight: async () => {
        throw new Error('preflight should not run for content mode');
      },
      convert: async () => {
        throw new Error('convert should not run for content mode');
      },
    });

    const result = await tool.handler({
      content: 'Persist this architectural decision for future recall.',
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('content');
    expect(result.message).toContain('Ingest instruction generated');
    expect(result.instruction).toContain(
      'You are performing memory ingest orchestration.',
    );
    expect(result.instruction).toContain(
      'Add cross-references between related memories using [[wikilinks]]',
    );
    expect(result.instruction).toContain(
      'Ensure resulting memory graph is connected with meaningful [[wikilinks]]',
    );
  });

  it('returns success with instruction for valid content without optional params', async () => {
    const tool = createIngestTool(config, projectRoot, logger);
    const result = await tool.handler({
      content: 'Team decided to use PostgreSQL for analytics workloads.',
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('content');
    expect(result.message).toContain('Ingest instruction generated');
    expect(result.instruction).toContain(
      'You are performing memory ingest orchestration.',
    );
    expect(result.instruction).toContain(
      '- sourceType: (not provided; infer from content)',
    );
    expect(result.instruction).toContain('- context: (not provided)');
    expect(result.instruction).toContain(
      '- configured source files: (none resolved from config.sourcePaths)',
    );
  });

  it('includes provided sourceType and context in instruction', async () => {
    const tool = createIngestTool(config, projectRoot, logger);
    const result = await tool.handler({
      content: 'Adopted stricter API naming convention in design review.',
      sourceType: 'meeting-notes',
      context: 'api guild weekly',
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('content');
    expect(result.instruction).toContain('- sourceType: meeting-notes');
    expect(result.instruction).toContain('- context: api guild weekly');
  });
});
