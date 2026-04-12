import fs from 'node:fs';
import path from 'node:path';
import { getIndexName, type SearchType, search } from '../qmd';
import {
  getProjectMemoryPath,
  isWithinProjectMnemonics,
  parseMemoryFile,
  writeMemoryFile,
} from '../storage';
import { type Logger, qmdPathToFsPath } from '../utils';

const DEFAULT_MAX_RELATED = 5;
const DEFAULT_MIN_SCORE = 0.3;
const DEFAULT_SEARCH_TYPE: SearchType = 'vsearch';
const SEARCH_RESULT_MULTIPLIER = 4;

export interface RelatedOptions {
  maxRelated?: number;
  minScore?: number;
  searchType?: SearchType;
}

function normalizePath(filePath: string): string {
  return path.resolve(filePath);
}

function normalizeQuery(content: string): string {
  return content.replace(/\s+/g, ' ').trim();
}

/**
 * Finds related memories for a source memory via QMD semantic search.
 */
export async function findRelatedMemories(
  filePath: string,
  projectRoot: string,
  logger: Logger,
  options: RelatedOptions = {},
): Promise<string[]> {
  const maxRelated = options.maxRelated ?? DEFAULT_MAX_RELATED;
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  const searchType = options.searchType ?? DEFAULT_SEARCH_TYPE;

  if (maxRelated <= 0) {
    return [];
  }

  try {
    const sourcePath = normalizePath(filePath);
    const sourceMemory = await parseMemoryFile(sourcePath);
    const query = normalizeQuery(sourceMemory.content);

    if (!query) {
      return [];
    }

    const index = getIndexName(projectRoot);
    const resultLimit = Math.max(maxRelated * SEARCH_RESULT_MULTIPLIER, 10);
    const projectMemoryRoot = normalizePath(getProjectMemoryPath(projectRoot));
    const searchResults = await search(query, {
      index,
      n: resultLimit,
      type: searchType,
    });

    const uniqueRelated = new Set<string>();

    for (const result of searchResults) {
      if (result.score < minScore || !result.path) {
        continue;
      }

      const relatedPath = normalizePath(
        qmdPathToFsPath(result.path, projectRoot),
      );

      if (relatedPath === sourcePath) {
        continue;
      }

      if (!relatedPath.startsWith(projectMemoryRoot + path.sep)) {
        continue;
      }

      uniqueRelated.add(relatedPath);

      if (uniqueRelated.size >= maxRelated) {
        break;
      }
    }

    return [...uniqueRelated];
  } catch (error: unknown) {
    logger.warn(
      `Failed to find related memories for ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}

/**
 * Updates a memory file's `related` frontmatter field.
 */
export async function updateRelatedField(
  filePath: string,
  relatedPaths: string[],
  projectRoot: string,
  logger: Logger,
): Promise<void> {
  const sourcePath = normalizePath(filePath);

  if (!isWithinProjectMnemonics(sourcePath, projectRoot)) {
    logger.warn(
      `Skipping related update for non-mnemonics file: ${sourcePath}`,
    );
    return;
  }

  const memory = await parseMemoryFile(sourcePath);
  const existingRelated = (memory.data.related ?? []).map(normalizePath);
  const nextRelated = [
    ...new Set([...existingRelated, ...relatedPaths.map(normalizePath)]),
  ];

  memory.data = {
    ...memory.data,
    modified: new Date().toISOString(),
    related: nextRelated,
  };

  writeMemoryFile(sourcePath, memory);
}

/**
 * Adds reciprocal backlink references from related memories to the source.
 */
export async function addBacklinks(
  sourceFilePath: string,
  relatedPaths: string[],
  projectRoot: string,
  logger: Logger,
): Promise<void> {
  const sourcePath = normalizePath(sourceFilePath);

  if (!isWithinProjectMnemonics(sourcePath, projectRoot)) {
    logger.warn(`Skipping backlinks for non-mnemonics source: ${sourcePath}`);
    return;
  }

  const uniqueRelated = [...new Set(relatedPaths.map(normalizePath))];

  for (const relatedPath of uniqueRelated) {
    if (relatedPath === sourcePath) {
      continue;
    }

    if (!isWithinProjectMnemonics(relatedPath, projectRoot)) {
      logger.warn(`Skipping backlink for non-mnemonics file: ${relatedPath}`);
      continue;
    }

    if (!fs.existsSync(relatedPath)) {
      logger.warn(`Skipping backlink for missing file: ${relatedPath}`);
      continue;
    }

    try {
      const memory = await parseMemoryFile(relatedPath);
      const existingRelated = (memory.data.related ?? []).map(normalizePath);

      if (existingRelated.includes(sourcePath)) {
        continue;
      }

      memory.data = {
        ...memory.data,
        modified: new Date().toISOString(),
        related: [...existingRelated, sourcePath],
      };

      writeMemoryFile(relatedPath, memory);
    } catch (error: unknown) {
      logger.warn(
        `Failed to add backlink from ${relatedPath} to ${sourcePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
