import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { type Logger, toKebabCase } from '../utils';

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

export async function updateEmbeddings(options: QmdOptions): Promise<void> {
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

/**
 * Gets all collection names from the index.
 * Parses output from `qmd collection list` command.
 */
export async function listCollections(options: QmdOptions): Promise<string[]> {
  const command = `qmd collection list --index ${options.index}`;

  try {
    const { stdout } = await execAsync(command);
    // Parse collection names from output like:
    // conventions-pattern (qmd://conventions-pattern/)
    //   Pattern:  **/*.md
    //   Files:    1
    // architectural-decision (qmd://architectural-decision/)
    const lines = stdout.split('\n');
    const collections: string[] = [];

    for (const line of lines) {
      // Match collection name at start of line (before the qmd:// part)
      const match = line.match(/^(\S+)\s+\(qmd:\/\//);
      if (match?.[1]) {
        collections.push(match[1]);
      }
    }

    return collections;
  } catch (_error) {
    return [];
  }
}

/**
 * Removes a collection from the qmd index.
 * Used to clean up stale collections that reference deleted directories.
 */
async function removeCollection(
  collectionName: string,
  options: QmdOptions,
): Promise<void> {
  const command = `qmd --index ${options.index} collection remove ${collectionName}`;
  await execAsync(command);
}

/**
 * Gets all documents from index, optionally filtered by collection.
 * Uses qmd ls to get file paths per collection, then fetches content.
 * When collection is specified, only gets from that collection.
 * When no collection, iterates all collections to get all documents.
 */
export async function multiGet(
  options: SearchOptions,
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  if (options.collection) {
    // Get from specific collection
    const collectionResults = await getFromCollection(
      options.index,
      options.collection,
      options.n || 100,
    );
    results.push(...collectionResults);
  } else {
    // Get from all collections
    const collections = await listCollections({ index: options.index });
    for (const collection of collections) {
      const collectionResults = await getFromCollection(
        options.index,
        collection,
        options.n || 100,
      );
      results.push(...collectionResults);
    }
  }

  return results;
}

/**
 * Lists files in a collection using qmd ls command.
 * Returns full qmd:// paths for each file.
 */
async function listFilesInCollection(
  index: string,
  collection: string,
): Promise<string[]> {
  const command = `qmd ls ${collection} --index ${index}`;

  try {
    const { stdout } = await execAsync(command);
    // Parse paths from output like:
    // 4.0 KB  Feb 20 06:05  qmd://conventions-pattern/file.md
    const lines = stdout.split('\n');
    const paths: string[] = [];

    for (const line of lines) {
      // Match qmd:// path at end of line
      const match = line.match(/(qmd:\/\/\S+\.md)$/);
      if (match?.[1]) {
        paths.push(match[1]);
      }
    }

    return paths;
  } catch (_error) {
    return [];
  }
}

/**
 * Gets all documents from a specific collection.
 * Uses qmd ls to get actual file paths, then qmd get for content.
 */
async function getFromCollection(
  index: string,
  collection: string,
  limit: number,
): Promise<SearchResult[]> {
  // Get actual file paths from the collection
  const filePaths = await listFilesInCollection(index, collection);

  if (filePaths.length === 0) {
    return [];
  }

  // Limit results
  const limitedPaths = filePaths.slice(0, limit);

  // Fetch content for each file
  const results: SearchResult[] = [];

  for (const qmdPath of limitedPaths) {
    try {
      const command = `qmd get "${qmdPath}" --index ${index}`;
      const { stdout } = await execAsync(command);

      // Extract title from path (filename without .md)
      const filename = qmdPath.split('/').pop()?.replace('.md', '') || '';

      results.push({
        path: qmdPath,
        score: 0,
        content: stdout,
        title: filename
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()),
      });
    } catch (_error) {
      // Skip files that fail to load
    }
  }

  return results;
}

export { execAsync };
