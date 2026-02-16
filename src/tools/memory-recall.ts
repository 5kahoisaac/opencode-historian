import { z } from 'zod';
import type { PluginConfig } from '../config';
import type { QmdClient } from '../qmd';
import { toKebabCase } from '../utils/validation';

export function createRecallTool(
  qmdClient: QmdClient,
  _config: PluginConfig,
  projectRoot: string,
) {
  return {
    name: 'memory_recall',
    description: 'Search memories using semantic similarity',
    parameters: {
      query: z.string(),
      memoryType: z.string().optional(),
      limit: z.number().optional(),
    },
    handler: async ({
      query,
      memoryType,
      limit,
    }: {
      query: string;
      memoryType?: string;
      limit?: number;
    }) => {
      const normalizedMemoryType = memoryType
        ? toKebabCase(memoryType)
        : undefined;

      try {
        const indexName = qmdClient.getIndexName(projectRoot);
        const results = await qmdClient.vectorSearch(query, {
          index: indexName,
          collection: normalizedMemoryType,
          n: limit || 10,
        });

        // Filter for .md files only
        const mdResults = results.filter((r) => r.path.endsWith('.md'));

        if (!mdResults || mdResults.length === 0) {
          console.log(
            `[opencode-historian] No memory files found for query: "${query}"`,
          );
          return {
            memories: [],
            message:
              'No memory files found matching your query. Try creating a memory first with memory_remember.',
          };
        }

        console.log(
          `[opencode-historian] Found ${mdResults.length} memory files for query: "${query}"`,
        );

        return { memories: mdResults };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[opencode-historian] Error recalling memories: ${errorMessage}`,
        );

        // Return helpful error message instead of throwing
        return {
          memories: [],
          error: `Failed to search memories: ${errorMessage}. QMD service may not be available or properly configured.`,
        };
      }
    },
  };
}
