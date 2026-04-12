import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMemoryFile, parseMemoryFile, writeMemoryFile } from '../storage';
import { ensureDirectory } from '../storage/paths';
import type { Logger } from '../utils';
import { addBacklinks, updateRelatedField } from './related';

const logger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

describe('related fs helpers', () => {
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

  function createFixture(
    memoryType: string,
    fileName: string,
    content: string,
  ): string {
    const typeDir = path.join(mnemonicsRoot, memoryType);
    ensureDirectory(typeDir);

    const filePath = path.join(typeDir, `${fileName}.md`);
    const memory = createMemoryFile(content, memoryType, []);
    writeMemoryFile(filePath, memory);
    return filePath;
  }

  describe('updateRelatedField', () => {
    it('adds related field to frontmatter of an existing memory file', async () => {
      const sourcePath = createFixture('context', 'source', 'source content');
      const relatedPath = createFixture('context', 'target', 'target content');

      await updateRelatedField(sourcePath, [relatedPath], projectRoot, logger);

      const updated = await parseMemoryFile(sourcePath);
      expect(updated.data.related).toEqual([path.resolve(relatedPath)]);
    });

    it('stores related paths as absolute normalized filesystem paths', async () => {
      const sourcePath = createFixture('context', 'source', 'source content');
      const relatedPath = createFixture('context', 'target', 'target content');
      const absolute = path.resolve(relatedPath);

      await updateRelatedField(sourcePath, [absolute], projectRoot, logger);

      const updated = await parseMemoryFile(sourcePath);
      expect(updated.data.related).toEqual([absolute]);
    });

    it('merges with existing related field and deduplicates values', async () => {
      const sourcePath = createFixture('context', 'source', 'source content');
      const firstTarget = createFixture('context', 'first', 'first content');
      const secondTarget = createFixture('context', 'second', 'second content');

      await updateRelatedField(sourcePath, [firstTarget], projectRoot, logger);
      await updateRelatedField(
        sourcePath,
        [firstTarget, secondTarget],
        projectRoot,
        logger,
      );

      const updated = await parseMemoryFile(sourcePath);
      expect(updated.data.related).toEqual([
        path.resolve(firstTarget),
        path.resolve(secondTarget),
      ]);
    });

    it('handles empty relatedPaths array without throwing', async () => {
      const sourcePath = createFixture('context', 'source', 'source content');

      await updateRelatedField(sourcePath, [], projectRoot, logger);

      const updated = await parseMemoryFile(sourcePath);
      expect(updated.data.related).toEqual([]);
    });
  });

  describe('addBacklinks', () => {
    it('adds backlink to related files', async () => {
      const sourcePath = createFixture('context', 'source', 'source content');
      const relatedPath = createFixture('context', 'target', 'target content');

      await addBacklinks(sourcePath, [relatedPath], projectRoot, logger);

      const target = await parseMemoryFile(relatedPath);
      expect(target.data.related).toEqual([path.resolve(sourcePath)]);
    });

    it('does not duplicate existing backlinks', async () => {
      const sourcePath = createFixture('context', 'source', 'source content');
      const relatedPath = createFixture('context', 'target', 'target content');

      await addBacklinks(sourcePath, [relatedPath], projectRoot, logger);
      await addBacklinks(sourcePath, [relatedPath], projectRoot, logger);

      const target = await parseMemoryFile(relatedPath);
      expect(target.data.related).toEqual([path.resolve(sourcePath)]);
    });

    it('creates related field when not present in target file', async () => {
      const sourcePath = createFixture('context', 'source', 'source content');
      const typeDir = path.join(mnemonicsRoot, 'context');
      ensureDirectory(typeDir);
      const targetPath = path.join(typeDir, 'target-no-related.md');

      const targetMemory = createMemoryFile('target content', 'context', []);
      delete targetMemory.data.related;
      writeMemoryFile(targetPath, targetMemory);

      await addBacklinks(sourcePath, [targetPath], projectRoot, logger);

      const updatedTarget = await parseMemoryFile(targetPath);
      expect(updatedTarget.data.related).toEqual([path.resolve(sourcePath)]);
    });

    it('handles missing target file without throwing', async () => {
      const sourcePath = createFixture('context', 'source', 'source content');
      const missingPath = path.join(mnemonicsRoot, 'context', 'missing.md');

      await addBacklinks(sourcePath, [missingPath], projectRoot, logger);
    });
  });
});
