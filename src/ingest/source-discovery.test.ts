import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveSourcePathsToFiles } from './source-discovery';

function writeFile(filePath: string, content = 'content'): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

describe('resolveSourcePathsToFiles', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = path.join(
      os.tmpdir(),
      `historian-source-discovery-${crypto.randomUUID()}`,
    );
    fs.mkdirSync(projectRoot, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('returns empty list for empty sourcePaths', () => {
    expect(resolveSourcePathsToFiles([], projectRoot)).toEqual([]);
    expect(resolveSourcePathsToFiles(undefined, projectRoot)).toEqual([]);
  });

  it('resolves directory input to files only', () => {
    writeFile(path.join(projectRoot, 'sources', 'a.md'));
    writeFile(path.join(projectRoot, 'sources', 'nested', 'b.md'));
    fs.mkdirSync(path.join(projectRoot, 'sources', 'nested', 'empty-dir'), {
      recursive: true,
    });

    const result = resolveSourcePathsToFiles(['./sources/'], projectRoot);

    expect(result).toEqual([
      path.join(projectRoot, 'sources', 'a.md'),
      path.join(projectRoot, 'sources', 'nested', 'b.md'),
    ]);
  });

  it('resolves glob input to files only', () => {
    writeFile(path.join(projectRoot, 'docs', 'a.md'));
    writeFile(path.join(projectRoot, 'docs', 'nested', 'b.md'));
    writeFile(path.join(projectRoot, 'docs', 'nested', 'notes.txt'));

    const result = resolveSourcePathsToFiles(['./docs/**/*.md'], projectRoot);

    expect(result).toEqual([
      path.join(projectRoot, 'docs', 'a.md'),
      path.join(projectRoot, 'docs', 'nested', 'b.md'),
    ]);
  });

  it('deduplicates files across overlapping sources', () => {
    writeFile(path.join(projectRoot, 'docs', 'a.md'));
    writeFile(path.join(projectRoot, 'docs', 'nested', 'b.md'));

    const result = resolveSourcePathsToFiles(
      ['./docs/**/*.md', './docs/', './docs/a.md'],
      projectRoot,
    );

    expect(result).toEqual([
      path.join(projectRoot, 'docs', 'a.md'),
      path.join(projectRoot, 'docs', 'nested', 'b.md'),
    ]);
  });

  it('returns deterministic sorted ordering', () => {
    writeFile(path.join(projectRoot, 'docs', 'z.md'));
    writeFile(path.join(projectRoot, 'docs', 'a.md'));
    writeFile(path.join(projectRoot, 'docs', 'm.md'));

    const resultA = resolveSourcePathsToFiles(['./docs/'], projectRoot);
    const resultB = resolveSourcePathsToFiles(['./docs/'], projectRoot);

    expect(resultA).toEqual([
      path.join(projectRoot, 'docs', 'a.md'),
      path.join(projectRoot, 'docs', 'm.md'),
      path.join(projectRoot, 'docs', 'z.md'),
    ]);
    expect(resultB).toEqual(resultA);
  });
});
