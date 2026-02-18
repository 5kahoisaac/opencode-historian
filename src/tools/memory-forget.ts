import * as fs from 'node:fs';
import { z } from 'zod';
import type { PluginConfig } from '../config';
import type { SearchType } from '../qmd';
import { getIndexName, search, updateIndex } from '../qmd';
import { isWithinProjectMnemonics } from '../storage';
import { type Logger, toKebabCase } from '../utils';

export function createForgetRequestTool(
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
      type: z
        .enum(['search', 'vsearch', 'query'])
        .optional()
        .default('vsearch'),
    },
    handler: async ({
      query,
      memoryType,
      confirm = false,
      type = 'vsearch',
    }: {
      query: string;
      memoryType?: string;
      confirm?: boolean;
      type?: SearchType;
    }) => {
      const normalizedMemoryType = memoryType
        ? toKebabCase(memoryType)
        : undefined;
      // Search memories
      const indexName = getIndexName(projectRoot);
      const searchResults = await search(query, {
        index: indexName,
        collection: normalizedMemoryType,
        n: 10,
        type,
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
