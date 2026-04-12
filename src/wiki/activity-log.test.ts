import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { appendToLog, rotateLogIfNeeded } from './activity-log';

const LOG_HEADER =
  '# Activity Log\n\nChronological record of memory operations.\n\n';

describe('activity-log', () => {
  let projectRoot: string;
  let logPath: string;

  beforeEach(() => {
    projectRoot = path.join(os.tmpdir(), crypto.randomUUID());
    logPath = path.join(projectRoot, '.mnemonics', 'log.md');
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  describe('appendToLog', () => {
    it('creates log file with header when missing', async () => {
      await appendToLog(projectRoot, {
        action: 'remember',
      });

      const content = await fs.promises.readFile(logPath, 'utf8');
      expect(content.startsWith(LOG_HEADER)).toBeTrue();
      expect(content).toContain('] REMEMBER general — "No details provided"');
    });

    it('appends entry in expected wire format', async () => {
      await appendToLog(projectRoot, {
        action: 'update',
        filePath: '/tmp/context/note.md',
        summary: 'updated summary',
      });

      const content = await fs.promises.readFile(logPath, 'utf8');
      const lines = content.trimEnd().split('\n');
      const lastLine = lines[lines.length - 1];

      expect(lastLine).toBeDefined();
      expect(lastLine).toMatch(
        /^- \[[^\]]+\] UPDATE note — "updated summary"$/,
      );
    });

    it('appends to existing log file', async () => {
      await appendToLog(projectRoot, {
        action: 'remember',
        summary: 'first entry',
      });
      await appendToLog(projectRoot, {
        action: 'forget',
        summary: 'second entry',
      });

      const content = await fs.promises.readFile(logPath, 'utf8');
      const entryLines = content.match(/^- \[/gm) ?? [];

      expect(entryLines).toHaveLength(2);
      expect(content).toContain('REMEMBER general — "first entry"');
      expect(content).toContain('FORGET general — "second entry"');
    });

    it('uses all optional fields to build target and description', async () => {
      await appendToLog(projectRoot, {
        action: 'ingest',
        memoryType: 'context',
        filePath: '/tmp/context/my-file.md',
        title: 'My Title',
        summary: 'fallback summary',
      });

      const content = await fs.promises.readFile(logPath, 'utf8');
      expect(content).toContain('INGEST context/my-file — "My Title"');
    });

    it('handles minimal entries with just action', async () => {
      await appendToLog(projectRoot, {
        action: 'sync',
      });

      const content = await fs.promises.readFile(logPath, 'utf8');
      expect(content).toContain('SYNC general — "No details provided"');
    });
  });

  describe('rotateLogIfNeeded', () => {
    it('does nothing when log file does not exist', async () => {
      await rotateLogIfNeeded(projectRoot, 1);

      const memoryDir = path.join(projectRoot, '.mnemonics');
      expect(fs.existsSync(memoryDir)).toBeTrue();
      expect(fs.existsSync(logPath)).toBeFalse();
    });

    it('does nothing when entries are below threshold', async () => {
      await appendToLog(projectRoot, {
        action: 'remember',
        summary: 'only entry',
      });

      await rotateLogIfNeeded(projectRoot, 2);

      const content = await fs.promises.readFile(logPath, 'utf8');
      expect(content).toContain('REMEMBER general — "only entry"');

      const files = await fs.promises.readdir(path.dirname(logPath));
      expect(files.filter((f) => /^log\..+\.md$/.test(f)).length).toBe(0);
    });

    it('rotates when entries exceed configured max', async () => {
      await appendToLog(projectRoot, {
        action: 'remember',
        summary: 'entry one',
      });
      await appendToLog(projectRoot, {
        action: 'forget',
        summary: 'entry two',
      });

      const beforeRotate = await fs.promises.readFile(logPath, 'utf8');

      await rotateLogIfNeeded(projectRoot, 1);

      const directoryEntries = await fs.promises.readdir(path.dirname(logPath));
      const archives = directoryEntries.filter((entry) =>
        /^log\..+\.md$/.test(entry),
      );

      expect(archives).toHaveLength(1);
      expect(archives[0]).toMatch(/^log\.\d{4}-\d{2}-\d{2}T[^.]+-\d{3}Z\.md$/);

      const archivedContent = await fs.promises.readFile(
        path.join(path.dirname(logPath), archives[0]),
        'utf8',
      );
      expect(archivedContent).toBe(beforeRotate);

      const currentLog = await fs.promises.readFile(logPath, 'utf8');
      expect(currentLog).toBe(LOG_HEADER);
    });

    it('uses default threshold when maxEntries is omitted', async () => {
      const lines: string[] = [LOG_HEADER];
      for (let i = 0; i <= 500; i += 1) {
        lines.push(
          `- [2026-01-01T00:00:00.000Z] REMEMBER general — "entry ${i}"\n`,
        );
      }

      await fs.promises.mkdir(path.dirname(logPath), { recursive: true });
      await fs.promises.writeFile(logPath, lines.join(''), 'utf8');

      await rotateLogIfNeeded(projectRoot);

      const directoryEntries = await fs.promises.readdir(path.dirname(logPath));
      const archives = directoryEntries.filter((entry) =>
        /^log\..+\.md$/.test(entry),
      );

      expect(archives).toHaveLength(1);
      const currentLog = await fs.promises.readFile(logPath, 'utf8');
      expect(currentLog).toBe(LOG_HEADER);
    });
  });
});
