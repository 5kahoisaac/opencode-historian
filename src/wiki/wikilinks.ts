import fs from 'node:fs';
import path from 'node:path';
import { getProjectMemoryPath, parseMemoryFile } from '../storage';
import type { Logger } from '../utils';

const WIKILINK_REGEX = /\[\[([^\]]+)\]\]/g;
const MARKDOWN_EXTENSION = '.md';
const EXCLUDED_FILENAMES = new Set(['index.md', 'log.md', 'SCHEMA.md']);

interface MemoryCandidate {
  fullPath: string;
  stem: string;
  typedTarget: string;
}

export interface BrokenWikilinkReport {
  sourceFile: string;
  brokenLink: string;
  suggestion?: string;
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function normalizeLinkTarget(linkTarget: string): string {
  return linkTarget.trim().replace(/^\/+|\/+$/g, '');
}

function collectTypedTarget(filePath: string, memoryRoot: string): string {
  const relativePath = path.relative(memoryRoot, filePath);
  const withoutExtension = relativePath.replace(/\.md$/i, '');
  return toPosixPath(withoutExtension);
}

function collectMemoryCandidates(memoryRoot: string): MemoryCandidate[] {
  const candidates: MemoryCandidate[] = [];
  const stack: string[] = [memoryRoot];

  while (stack.length > 0) {
    const currentDir = stack.pop();

    if (!currentDir) {
      continue;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (!entry.name.endsWith(MARKDOWN_EXTENSION)) {
        continue;
      }

      if (EXCLUDED_FILENAMES.has(entry.name)) {
        continue;
      }

      const stem = path.basename(entry.name, MARKDOWN_EXTENSION);
      candidates.push({
        fullPath,
        stem,
        typedTarget: collectTypedTarget(fullPath, memoryRoot),
      });
    }
  }

  return candidates;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  if (a.length === 0) {
    return b.length;
  }

  if (b.length === 0) {
    return a.length;
  }

  const previousRow: number[] = Array.from(
    { length: b.length + 1 },
    (_, i) => i,
  );

  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previousRow[0];
    previousRow[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const temp = previousRow[j];
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;

      previousRow[j] = Math.min(
        previousRow[j] + 1,
        previousRow[j - 1] + 1,
        diagonal + substitutionCost,
      );

      diagonal = temp;
    }
  }

  return previousRow[b.length];
}

function findClosestMatch(
  target: string,
  knownTargets: string[],
): string | undefined {
  const normalizedTarget = normalizeLinkTarget(target).toLowerCase();

  if (!normalizedTarget || knownTargets.length === 0) {
    return undefined;
  }

  let bestMatch: string | undefined;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of knownTargets) {
    const normalizedCandidate = candidate.toLowerCase();
    let score = levenshteinDistance(normalizedTarget, normalizedCandidate);

    if (
      normalizedCandidate.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedCandidate)
    ) {
      score = Math.max(0, score - 1);
    }

    if (score < bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  const maxReasonableDistance = Math.max(
    2,
    Math.floor(normalizedTarget.length / 2),
  );
  if (bestScore > maxReasonableDistance) {
    return undefined;
  }

  return bestMatch;
}

function buildKnownTargets(candidates: MemoryCandidate[]): string[] {
  const known = new Set<string>();

  for (const candidate of candidates) {
    known.add(candidate.stem);
    known.add(candidate.typedTarget);
  }

  return [...known];
}

async function collectMarkdownFilesRecursive(
  directory: string,
): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFilesRecursive(fullPath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!entry.name.endsWith(MARKDOWN_EXTENSION)) {
      continue;
    }

    if (EXCLUDED_FILENAMES.has(entry.name)) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

/**
 * Extracts unique wikilink targets from markdown content.
 */
export function parseWikilinks(content: string): string[] {
  if (!content) {
    return [];
  }

  const uniqueTargets = new Set<string>();

  for (const match of content.matchAll(WIKILINK_REGEX)) {
    const rawTarget = match[1];
    if (!rawTarget) {
      continue;
    }

    const normalizedTarget = normalizeLinkTarget(rawTarget);
    if (!normalizedTarget) {
      continue;
    }

    uniqueTargets.add(normalizedTarget);
  }

  return [...uniqueTargets];
}

/**
 * Resolves a wikilink target to an absolute file path in `.mnemonics`.
 */
export function resolveWikilink(
  linkTarget: string,
  projectRoot: string,
): string | null {
  const memoryRoot = getProjectMemoryPath(projectRoot);
  const normalizedTarget = normalizeLinkTarget(linkTarget);

  if (!normalizedTarget) {
    return null;
  }

  if (normalizedTarget.includes('/')) {
    const directPath = path.join(
      memoryRoot,
      `${normalizedTarget}${MARKDOWN_EXTENSION}`,
    );
    return fs.existsSync(directPath) ? path.resolve(directPath) : null;
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(memoryRoot, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const candidatePath = path.join(
      memoryRoot,
      entry.name,
      `${normalizedTarget}${MARKDOWN_EXTENSION}`,
    );

    if (fs.existsSync(candidatePath)) {
      return path.resolve(candidatePath);
    }
  }

  return null;
}

/**
 * Scans all memories and reports wikilinks that cannot be resolved.
 */
export async function findBrokenWikilinks(
  projectRoot: string,
  logger: Logger,
): Promise<BrokenWikilinkReport[]> {
  const memoryRoot = getProjectMemoryPath(projectRoot);
  const reports: BrokenWikilinkReport[] = [];

  if (!fs.existsSync(memoryRoot)) {
    return reports;
  }

  const memoryCandidates = collectMemoryCandidates(memoryRoot);
  const knownTargets = buildKnownTargets(memoryCandidates);
  const memoryFiles = await collectMarkdownFilesRecursive(memoryRoot);

  for (const sourceFile of memoryFiles) {
    try {
      const memory = await parseMemoryFile(sourceFile);
      const links = parseWikilinks(memory.content);

      for (const linkTarget of links) {
        if (resolveWikilink(linkTarget, projectRoot)) {
          continue;
        }

        const suggestion = findClosestMatch(linkTarget, knownTargets);
        reports.push({
          sourceFile,
          brokenLink: `[[${linkTarget}]]`,
          suggestion,
        });
      }
    } catch (error: unknown) {
      logger.warn(
        `Failed to parse memory file for wikilink scan ${sourceFile}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  logger.debug(`Wikilink scan completed with ${reports.length} broken links.`);
  return reports;
}
