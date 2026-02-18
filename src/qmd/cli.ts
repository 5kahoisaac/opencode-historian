import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { Logger } from '../utils/logger';
import { toKebabCase } from '../utils/validation';

const execAsync = promisify(exec);

export type SearchType = 'search' | 'vsearch' | 'query';

export interface QmdOptions {
  index: string;
  logger?: Logger;
}

export interface SearchOptions {
  index: string;
  collection?: string;
  n?: number;
  type?: SearchType;
}

export interface SearchResult {
  path: string;
  score: number;
  content?: string;
  docid?: string;
  title?: string;
  snippet?: string;
}

/**
 * Raw result from qmd CLI output.
 */
interface RawSearchResult {
  file?: string;
  path?: string;
  score?: number;
  snippet?: string;
  content?: string;
  docid?: string;
  title?: string;
}

/**
 * Maps qmd CLI output to SearchResult format.
 * qmd returns 'file' property, we normalize to 'path'.
 */
function mapToSearchResult(raw: RawSearchResult): SearchResult {
  return {
    path: raw.file || raw.path || '',
    score: raw.score || 0,
    content: raw.snippet || raw.content,
    docid: raw.docid,
    title: raw.title,
    snippet: raw.snippet,
  };
}

/**
 * Extracts the index name from a project root path.
 * Uses the folder name converted to kebab-case.
 */
export function getIndexName(projectRoot: string): string {
  if (!projectRoot || projectRoot.trim() === '') {
    throw new Error(
      'Invalid project root: projectRoot must be a non-empty string',
    );
  }

  const folderName = projectRoot.split('/').pop();

  if (!folderName || folderName.trim() === '') {
    throw new Error(
      'Invalid project root: cannot extract folder name from path',
    );
  }

  return toKebabCase(folderName);
}

/**
 * Performs a search using qmd CLI.
 * Type determines the search method:
 * - 'search': Exact keyword/BM25 matches
 * - 'vsearch': Semantic/vector search (default)
 * - 'query': Hybrid deep search for complex queries
 */
export async function search(
  query: string,
  options: SearchOptions,
): Promise<SearchResult[]> {
  const searchType = options.type || 'vsearch';
  let command: string;

  switch (searchType) {
    case 'search':
      command = `qmd search "${query}" --index ${options.index}`;
      break;
    case 'query':
      command = `qmd query "${query}" --index ${options.index}`;
      break;
    default:
      command = `qmd vsearch "${query}" --index ${options.index}`;
  }

  command += ` -n ${options.n || 10} --json`;
  if (options.collection) {
    command += ` -c ${options.collection}`;
  }

  try {
    const { stdout } = await execAsync(command);
    const results = JSON.parse(stdout);
    return Array.isArray(results) ? results.map(mapToSearchResult) : [];
  } catch (_error) {
    // If qmd fails or returns invalid JSON, return empty array
    return [];
  }
}

/**
 * Add a directory to a qmd collection.
 * qmd collection add expects a directory to watch, not a single file.
 */
export async function addToCollection(
  directoryPath: string,
  collectionName: string,
  options: QmdOptions,
): Promise<void> {
  const command = `qmd --index ${options.index} collection list | grep -q "${collectionName}" || qmd --index ${options.index} collection add ${directoryPath} --name ${collectionName}`;
  await execAsync(command);
}

export async function updateEmbedings(options: QmdOptions): Promise<void> {
  const command = `qmd --index ${options.index} embed`;
  await execAsync(command);
}

export async function updateIndex(options: QmdOptions): Promise<void> {
  const command = `qmd --index ${options.index} update`;
  await execAsync(command);
}

/**
 * Add external paths to the index under the "context" collection.
 * Used to index external folders configured in externalPaths.
 */
export async function addExternalPathsToIndex(
  paths: string[],
  options: QmdOptions,
): Promise<void> {
  for (const path of paths) {
    try {
      // Add to "context" collection for external paths
      const command = `qmd --index ${options.index} collection list | grep -q "context" || qmd --index ${options.index} collection add ${path} --name context`;
      await execAsync(command);
      options.logger?.info(
        `Added external path to context collection: ${path}`,
      );
    } catch (error) {
      options.logger?.warn(
        `Failed to add external path ${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export { execAsync };
