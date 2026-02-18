import path from 'node:path';
import { z } from 'zod';
import { type PluginConfig, PROJECT_MEMORY_DIR } from '../config';
import type { SearchResult, SearchType } from '../qmd';
import { getIndexName, search } from '../qmd';
import { parseMemoryFile } from '../storage';
import { type Logger, toKebabCase } from '../utils';

/**
 * Converts a qmd:// URI to a real filesystem path.
 * qmd returns paths like "qmd://conventions-pattern/file.md"
 * but we need ".mnemonics/conventions-pattern/file.md"
 */
function qmdPathToFsPath(qmdPath: string, projectRoot: string): string {
  if (qmdPath.startsWith('qmd://')) {
    // Remove "qmd://" prefix and prepend .mnemonics directory
    const relativePath = qmdPath.slice(6); // "conventions-pattern/file.md"
    return path.join(projectRoot, PROJECT_MEMORY_DIR, relativePath);
  }
  // If it's already a filesystem path, return as-is
  return qmdPath;
}

export interface MemoryRecallResult {
  path: string;
  score: number;
  title: string;
  memoryType: string;
  tags: string[];
  created: string;
  modified: string;
  content: string;
}

export function createRecallTool(
  _config: PluginConfig,
  projectRoot: string,
  logger: Logger,
) {
  return {
    name: 'memory_recall',
    description: 'Search memories using semantic similarity',
    parameters: {
      query: z.string(),
      memoryType: z.string().optional(),
      limit: z.number().optional(),
      type: z
        .enum(['search', 'vsearch', 'query'])
        .optional()
        .default('vsearch'),
    },
    handler: async ({
      query,
      memoryType,
      limit,
      type = 'vsearch',
    }: {
      query: string;
      memoryType?: string;
      limit?: number;
      type?: SearchType;
    }): Promise<{
      memories: MemoryRecallResult[];
      count: number;
      message?: string;
      error?: string;
    }> => {
      const normalizedMemoryType = memoryType
        ? toKebabCase(memoryType)
        : undefined;

      try {
        // Search project memories
        const projectIndex = getIndexName(projectRoot);
        let searchResults: SearchResult[] = [];
        try {
          const searchOptions = {
            index: projectIndex,
            collection: normalizedMemoryType,
            n: limit || 10,
            type,
          };

          searchResults = await search(query, searchOptions);
        } catch (searchError) {
          logger.warn(
            `Search failed: ${searchError instanceof Error ? searchError.message : String(searchError)}`,
          );
        }

        // Filter for .md files only
        const mdResults = searchResults.filter((r) => r.path.endsWith('.md'));

        if (!mdResults || mdResults.length === 0) {
          logger.info(`No memory files found for query: "${query}"`);
          return {
            memories: [],
            count: 0,
            message:
              'No memory files found matching your query. Try creating a memory first with memory_remember.',
          };
        }

        // Fetch full content for each search result
        const memories: MemoryRecallResult[] = [];
        for (const result of mdResults) {
          try {
            // Convert qmd:// URI to real filesystem path
            const fsPath = qmdPathToFsPath(result.path, projectRoot);
            const memoryFile = parseMemoryFile(fsPath);
            // Extract title from filename (e.g., "my-memory.md" -> "My Memory")
            const filename = result.path.split('/').pop() || '';
            const title = filename
              .replace('.md', '')
              .replace(/-/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase());

            memories.push({
              path: result.path,
              score: result.score,
              title,
              memoryType: memoryFile.data.memory_type,
              tags: memoryFile.data.tags || [],
              created: memoryFile.data.created,
              modified: memoryFile.data.modified,
              content: memoryFile.content,
            });
          } catch (readError) {
            logger.warn(
              `Failed to read memory file ${result.path}: ${readError instanceof Error ? readError.message : String(readError)}`,
            );
          }
        }

        logger.info(
          `Found ${memories.length} memory files for query: "${query}"`,
        );

        return {
          memories,
          count: memories.length,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`Error recalling memories: ${errorMessage}`);

        return {
          memories: [],
          count: 0,
          error: `Failed to search memories: ${errorMessage}. QMD service may not be available or properly configured.`,
        };
      }
    },
  };
}
