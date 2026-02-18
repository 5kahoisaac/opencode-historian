import { z } from 'zod';
import type { PluginConfig } from '../config';
import type { SearchResult, SearchType } from '../qmd';
import { getIndexName, search } from '../qmd';
import { type Logger, toKebabCase } from '../utils';

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
    }) => {
      const normalizedMemoryType = memoryType
        ? toKebabCase(memoryType)
        : undefined;

      try {
        // Search project memories
        const projectIndex = getIndexName(projectRoot);
        let projectResults: SearchResult[] = [];
        try {
          // If no memoryType specified, search all collections by omitting collection parameter
          const searchOptions = {
            index: projectIndex,
            collection: normalizedMemoryType,
            n: limit || 10,
            type,
          };

          projectResults = await search(query, searchOptions);
        } catch (projectError) {
          logger.warn(
            `Project search failed: ${projectError instanceof Error ? projectError.message : String(projectError)}`,
          );
        }

        // Filter for .md files only
        const memories = projectResults.filter((r) => r.path.endsWith('.md'));

        if (!memories || memories.length === 0) {
          logger.info(`No memory files found for query: "${query}"`);
          return {
            memories: [],
            count: 0,
            message:
              'No memory files found matching your query. Try creating a memory first with memory_remember.',
          };
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

        // Return helpful error message instead of throwing
        return {
          memories: [],
          count: 0,
          error: `Failed to search memories: ${errorMessage}. QMD service may not be available or properly configured.`,
        };
      }
    },
  };
}
