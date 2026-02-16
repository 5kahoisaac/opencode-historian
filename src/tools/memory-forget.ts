import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import type { PluginConfig } from '../config';
import type { QmdClient } from '../qmd';
import { updateIndex } from '../qmd';
import { isWithinProjectMnemonics } from '../storage';
import type { Logger } from '../utils/logger';
import { toKebabCase } from '../utils/validation';

export function createForgetRequestTool(
  qmdClient: QmdClient,
  _config: PluginConfig,
  projectRoot: string,
  logger: Logger,
) {
  return {
    name: 'memory_forget',
    description:
      'Delete an existing memory by searching and removing it from the filesystem',
    parameters: {
      query: z.string(),
      memoryType: z.string().optional(),
      confirm: z.boolean().default(false),
    },
    handler: async ({
      query,
      memoryType,
      confirm = false,
    }: {
      query: string;
      memoryType?: string;
      confirm?: boolean;
    }) => {
      const normalizedMemoryType = memoryType
        ? toKebabCase(memoryType)
        : undefined;
      // Search memories
      const indexName = qmdClient.getIndexName(projectRoot);
      const searchResults = await qmdClient.search(query, {
        index: indexName,
        collection: normalizedMemoryType,
        n: 10,
      });

      // Filter for .md files only (CRUD-05)
      const mdResults = searchResults.filter((r) => r.path.endsWith('.md'));

      if (!mdResults || mdResults.length === 0) {
        throw new Error('No memory files (.md) found matching the query');
      }

      // Return confirmation options if not confirmed
      if (!confirm) {
        return {
          confirmRequired: true,
          candidates: mdResults.map((r) => ({
            path: r.path,
            score: r.score,
          })),
        };
      }

      // Delete all matching memories
      const deletedFiles: string[] = [];
      for (const result of mdResults) {
        const filePath = result.path;

        // Validate scope
        if (!isWithinProjectMnemonics(filePath, projectRoot)) {
          throw new Error('Write operations only allowed within .mnemonics/');
        }

        // Delete file using async unlink
        try {
          await fs.promises.unlink(filePath);

          // Verify file no longer exists
          if (fs.existsSync(filePath)) {
            throw new Error(
              `Failed to delete memory file: ${filePath}. File still exists after deletion.`,
            );
          }

          deletedFiles.push(filePath);
          logger.info(`Deleted memory file: ${filePath}`);
        } catch (error) {
          throw new Error(
            `Error deleting file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // Update index
      await updateIndex({ index: indexName });

      return {
        success: true,
        deletedFiles: deletedFiles.length,
        files: deletedFiles,
      };
    },
  };
}
