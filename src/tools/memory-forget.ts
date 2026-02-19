import * as fs from 'node:fs';
import { z } from 'zod';
import type { PluginConfig } from '../config';
import { getIndexName, updateEmbeddings, updateIndex } from '../qmd';
import { isWithinProjectMnemonics } from '../storage';
import type { Logger } from '../utils';

export function createForgetTool(
  _config: PluginConfig,
  projectRoot: string,
  logger: Logger,
) {
  return {
    name: 'memory_forget',
    description:
      'Delete memory files by their paths. Pass filePaths from memory_recall results.',
    parameters: {
      filePaths: z.array(z.string()),
    },
    handler: async ({ filePaths }: { filePaths: string[] }) => {
      if (!filePaths || filePaths.length === 0) {
        throw new Error('filePaths array is required and cannot be empty');
      }

      const deletedFiles: string[] = [];
      const errors: string[] = [];

      for (const filePath of filePaths) {
        // Validate scope - only allow .mnemonics .md files
        if (!isWithinProjectMnemonics(filePath, projectRoot)) {
          errors.push(`Skipped ${filePath}: not within .mnemonics/ directory`);
          continue;
        }

        if (!filePath.endsWith('.md')) {
          errors.push(`Skipped ${filePath}: not a .md file`);
          continue;
        }

        // Check file exists
        if (!fs.existsSync(filePath)) {
          errors.push(`Skipped ${filePath}: file not found`);
          continue;
        }

        // Delete file
        try {
          await fs.promises.unlink(filePath);

          // Verify file no longer exists
          if (fs.existsSync(filePath)) {
            errors.push(
              `Failed to delete ${filePath}: file still exists after deletion`,
            );
            continue;
          }

          deletedFiles.push(filePath);
          logger.info(`Deleted memory file: ${filePath}`);
        } catch (error) {
          errors.push(
            `Error deleting ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // Update index and embeddings
      const indexName = getIndexName(projectRoot);
      await updateIndex({ index: indexName });
      await updateEmbeddings({ index: indexName });

      return {
        success: deletedFiles.length > 0,
        deletedCount: deletedFiles.length,
        deletedFiles,
        errors: errors.length > 0 ? errors : undefined,
      };
    },
  };
}
