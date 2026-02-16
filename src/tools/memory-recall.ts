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
        // Search project memories
        const projectIndex = qmdClient.getIndexName(projectRoot);
        let projectResults: any[] = [];
        try {
          projectResults = await qmdClient.vectorSearch(query, {
            index: projectIndex,
            collection: normalizedMemoryType,
            n: limit || 10,
          });
        } catch (projectError) {
          console.warn(
            `[opencode-historian] Project search failed: ${projectError instanceof Error ? projectError.message : String(projectError)}`,
          );
        }

        // Search global memories - collection only, no index
        // Global memories are searched by collection (memory type) directly
        let globalResults: any[] = [];
        try {
          globalResults = await qmdClient.vectorSearch(query, {
            collection: normalizedMemoryType,
            n: limit || 10,
          });
        } catch (globalError) {
          // Global search may fail if no memories exist yet
          console.log(
            `[opencode-historian] Global search failed (may be first run): ${globalError instanceof Error ? globalError.message : String(globalError)}`,
          );
        }

        // Filter for .md files only and mark scope
        const projectMemories = projectResults
          .filter((r) => r.path.endsWith('.md'))
          .map((r) => ({ ...r, scope: 'project' as const }));

        const globalMemories = globalResults
          .filter((r) => r.path.endsWith('.md'))
          .map((r) => ({ ...r, scope: 'global' as const }));

        // Combine results
        const allMemories = [...projectMemories, ...globalMemories];

        if (!allMemories || allMemories.length === 0) {
          console.log(
            `[opencode-historian] No memory files found for query: "${query}"`,
          );
          return {
            memories: [],
            projectCount: 0,
            globalCount: 0,
            message:
              'No memory files found matching your query. Try creating a memory first with memory_remember.',
          };
        }

        console.log(
          `[opencode-historian] Found ${allMemories.length} memory files for query: "${query}" (project: ${projectMemories.length}, global: ${globalMemories.length})`,
        );

        return {
          memories: allMemories,
          projectCount: projectMemories.length,
          globalCount: globalMemories.length,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[opencode-historian] Error recalling memories: ${errorMessage}`,
        );

        // Return helpful error message instead of throwing
        return {
          memories: [],
          projectCount: 0,
          globalCount: 0,
          error: `Failed to search memories: ${errorMessage}. QMD service may not be available or properly configured.`,
        };
      }
    },
  };
}
