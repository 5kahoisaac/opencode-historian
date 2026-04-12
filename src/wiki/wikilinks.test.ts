import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMemoryFile, writeMemoryFile } from '../storage/files';
import { ensureDirectory } from '../storage/paths';
import type { Logger } from '../utils';
import {
  findBrokenWikilinks,
  parseWikilinks,
  resolveWikilink,
} from './wikilinks';

describe('wikilinks', () => {
  describe('parseWikilinks', () => {
    it('parses a single wikilink', () => {
      expect(parseWikilinks('See [[foo]]')).toEqual(['foo']);
    });

    it('parses multiple wikilinks', () => {
      expect(parseWikilinks('[[a]] and [[b]]')).toEqual(['a', 'b']);
    });

    it('does not incorrectly parse nested bracket pattern', () => {
      expect(parseWikilinks('[[[foo]]]')).toEqual(['[foo']);
    });

    it('returns empty array when there are no wikilinks', () => {
      expect(parseWikilinks('plain text only')).toEqual([]);
    });

    it('returns empty array for empty content', () => {
      expect(parseWikilinks('')).toEqual([]);
    });

    it('deduplicates duplicate wikilinks', () => {
      expect(parseWikilinks('[[dup]] and [[dup]]')).toEqual(['dup']);
    });

    it('parses wikilinks with spaces', () => {
      expect(parseWikilinks('[[my note]]')).toEqual(['my note']);
    });

    it('parses wikilinks with paths', () => {
      expect(parseWikilinks('[[context/my-note]]')).toEqual([
        'context/my-note',
      ]);
    });
  });

  describe('resolveWikilink', () => {
    let projectRoot: string;

    beforeEach(() => {
      projectRoot = path.join(os.tmpdir(), crypto.randomUUID());
      ensureDirectory(path.join(projectRoot, '.mnemonics'));
    });

    afterEach(() => {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    });

    it('resolves exact stem match without extension', () => {
      const contextDir = path.join(projectRoot, '.mnemonics', 'context');
      ensureDirectory(contextDir);

      const filePath = path.join(contextDir, 'my-note.md');
      const memory = createMemoryFile('memory body', 'context', []);
      writeMemoryFile(filePath, memory);

      expect(resolveWikilink('my-note', projectRoot)).toBe(
        path.resolve(filePath),
      );
    });

    it('does not resolve when target includes explicit .md extension', () => {
      const contextDir = path.join(projectRoot, '.mnemonics', 'context');
      ensureDirectory(contextDir);

      const filePath = path.join(contextDir, 'my-note.md');
      writeMemoryFile(filePath, createMemoryFile('memory body', 'context', []));

      expect(resolveWikilink('my-note.md', projectRoot)).toBeNull();
    });

    it('resolves typed path targets', () => {
      const contextDir = path.join(projectRoot, '.mnemonics', 'context');
      ensureDirectory(contextDir);

      const filePath = path.join(contextDir, 'my-note.md');
      writeMemoryFile(filePath, createMemoryFile('memory body', 'context', []));

      expect(resolveWikilink('context/my-note', projectRoot)).toBe(
        path.resolve(filePath),
      );
    });

    it('returns null for non-existent links', () => {
      expect(resolveWikilink('does-not-exist', projectRoot)).toBeNull();
    });

    it('follows underlying filesystem case-sensitivity behavior', () => {
      const contextDir = path.join(projectRoot, '.mnemonics', 'context');
      ensureDirectory(contextDir);

      const filePath = path.join(contextDir, 'my-note.md');
      writeMemoryFile(filePath, createMemoryFile('memory body', 'context', []));

      const directCasePath = path.join(contextDir, 'MY-NOTE.md');
      const expected = fs.existsSync(directCasePath)
        ? path.resolve(directCasePath)
        : null;

      expect(resolveWikilink('MY-NOTE', projectRoot)).toBe(expected);
    });
  });

  describe('findBrokenWikilinks', () => {
    let projectRoot: string;
    const logger: Logger = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    };

    beforeEach(() => {
      projectRoot = path.join(os.tmpdir(), crypto.randomUUID());
      ensureDirectory(path.join(projectRoot, '.mnemonics'));
    });

    afterEach(() => {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    });

    it('reports broken links with source file info', async () => {
      const contextDir = path.join(projectRoot, '.mnemonics', 'context');
      ensureDirectory(contextDir);

      const validPath = path.join(contextDir, 'alpha-note.md');
      writeMemoryFile(
        validPath,
        createMemoryFile('valid note body', 'context', []),
      );

      const sourcePath = path.join(contextDir, 'source.md');
      writeMemoryFile(
        sourcePath,
        createMemoryFile(
          'Links: [[alpha-note]] [[missing-note]]',
          'context',
          [],
        ),
      );

      const reports = await findBrokenWikilinks(projectRoot, logger);

      expect(reports).toEqual([
        {
          sourceFile: sourcePath,
          brokenLink: '[[missing-note]]',
          suggestion: undefined,
        },
      ]);
    });

    it('suggests closest match for typoed links', async () => {
      const contextDir = path.join(projectRoot, '.mnemonics', 'context');
      ensureDirectory(contextDir);

      writeMemoryFile(
        path.join(contextDir, 'alpha-note.md'),
        createMemoryFile('valid note body', 'context', []),
      );
      writeMemoryFile(
        path.join(contextDir, 'source.md'),
        createMemoryFile('Possible typo: [[alpah-note]]', 'context', []),
      );

      const reports = await findBrokenWikilinks(projectRoot, logger);

      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({
        brokenLink: '[[alpah-note]]',
        suggestion: 'alpha-note',
      });
    });

    it('returns empty array when all links resolve', async () => {
      const contextDir = path.join(projectRoot, '.mnemonics', 'context');
      ensureDirectory(contextDir);

      const validPath = path.join(contextDir, 'ok.md');
      writeMemoryFile(
        validPath,
        createMemoryFile('valid note body', 'context', []),
      );

      const sourcePath = path.join(contextDir, 'source.md');
      writeMemoryFile(
        sourcePath,
        createMemoryFile('Reference [[ok]]', 'context', []),
      );

      const reports = await findBrokenWikilinks(projectRoot, logger);
      expect(reports).toEqual([]);
    });

    it('skips excluded files during scan', async () => {
      const contextDir = path.join(projectRoot, '.mnemonics', 'context');
      ensureDirectory(contextDir);

      writeMemoryFile(
        path.join(contextDir, 'real-note.md'),
        createMemoryFile('body', 'context', []),
      );

      writeMemoryFile(
        path.join(projectRoot, '.mnemonics', 'index.md'),
        createMemoryFile('[[missing-from-index]]', 'context', []),
      );
      writeMemoryFile(
        path.join(projectRoot, '.mnemonics', 'log.md'),
        createMemoryFile('[[missing-from-log]]', 'context', []),
      );
      writeMemoryFile(
        path.join(projectRoot, '.mnemonics', 'SCHEMA.md'),
        createMemoryFile('[[missing-from-schema]]', 'context', []),
      );

      const reports = await findBrokenWikilinks(projectRoot, logger);
      expect(reports).toEqual([]);
    });
  });
});
