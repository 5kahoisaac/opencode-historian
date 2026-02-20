import type { PluginConfig } from '../config';
import { getIndexName, updateEmbeddings, updateIndex } from '../qmd';
import { getBuiltinMemoryTypes, type Logger } from '../utils';

export function createSyncTool(
  config: PluginConfig,
  projectRoot: string,
  logger: Logger,
) {
  return {
    name: 'memory_sync',
    description:
      'Sync the qmd index and embeddings after manual memory file changes. Use when user has created or modified memory files outside the memory tools.',
    parameters: {},
    handler: async () => {
      try {
        const indexName = getIndexName(projectRoot);

        logger.info('Syncing qmd index...');
        const builtinTypes = getBuiltinMemoryTypes();
        const allMemoryTypes = [...builtinTypes, ...(config.memoryTypes || [])];
        await updateIndex({
          index: indexName,
          projectRoot,
          logger,
          memoryTypes: allMemoryTypes.map((t) => t.name),
        });

        logger.info('Updating embeddings...');
        await updateEmbeddings({ index: indexName });

        logger.info('Memory sync complete');

        return {
          success: true,
          message: 'Index and embeddings updated successfully',
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`Memory sync failed: ${errorMessage}`);

        return {
          success: false,
          error: `Failed to sync: ${errorMessage}`,
        };
      }
    },
  };
}
