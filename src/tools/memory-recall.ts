import { z } from 'zod';
import type { PluginConfig } from '../config';
import type { SearchResult, SearchType } from '../qmd';
import { getIndexName, multiGet, search } from '../qmd';
import { parseMemoryFile } from '../storage';
import { type Logger, qmdPathToFsPath, toKebabCase } from '../utils';

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
    description:
      'Search memories by query, or get all memories with isAll flag',
    parameters: {
      query: z.string().optional(),
      memoryType: z.string().optional(),
      limit: z.number().optional(),
      type: z
        .enum(['search', 'vsearch', 'query'])
        .optional()
        .default('vsearch'),
      isAll: z.boolean().optional().default(false),
    },
    handler: async ({
      query,
      memoryType,
      limit,
      type = 'vsearch',
      isAll = false,
    }: {
      query?: string;
      memoryType?: string;
      limit?: number;
      type?: SearchType;
      isAll?: boolean;
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
        const projectIndex = getIndexName(projectRoot);
        let searchResults: SearchResult[] = [];

        if (isAll) {
          // Get all memories, optionally filtered by type
          try {
            searchResults = await multiGet({
              index: projectIndex,
              collection: normalizedMemoryType,
              n: limit || 100, // Higher default for "all" queries
            });
          } catch (searchError) {
            logger.warn(
              `Multi-get failed: ${searchError instanceof Error ? searchError.message : String(searchError)}`,
            );
          }
        } else {
          // Query-based search
          if (!query) {
            return {
              memories: [],
              count: 0,
              error:
                'query is required when isAll is false. Either provide a query or set isAll=true.',
            };
          }

          try {
            searchResults = await search(query, {
              index: projectIndex,
              collection: normalizedMemoryType,
              n: limit || 10,
              type,
            });
          } catch (searchError) {
            logger.warn(
              `Search failed: ${searchError instanceof Error ? searchError.message : String(searchError)}`,
            );
          }
        }

        // Filter for .md files only
        const mdResults = searchResults.filter((r) => r.path.endsWith('.md'));

        if (!mdResults || mdResults.length === 0) {
          const searchDesc = isAll
            ? `${normalizedMemoryType || 'all'} memories`
            : `query: "${query}"`;
          logger.info(`No memory files found for ${searchDesc}`);
          return {
            memories: [],
            count: 0,
            message: `No memory files found for ${searchDesc}. Try creating a memory first with memory_remember.`,
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
              path: fsPath,
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

        const searchDesc = isAll
          ? `${normalizedMemoryType || 'all'} memories`
          : `query: "${query}"`;
        logger.info(`Found ${memories.length} memory files for ${searchDesc}`);

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
