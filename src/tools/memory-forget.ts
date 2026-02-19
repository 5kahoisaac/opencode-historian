import * as fs from 'node:fs';
import { z } from 'zod';
import type { PluginConfig } from '../config';
import { getIndexName, updateEmbeddings, updateIndex } from '../qmd';
import { isWithinProjectMnemonics } from '../storage';
import { type Logger, qmdPathToFsPath } from '../utils';

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
        // Convert qmd:// path to filesystem path if needed
        const resolvedPath = qmdPathToFsPath(filePath, projectRoot);

        // Validate scope - only allow .mnemonics .md files
        if (!isWithinProjectMnemonics(resolvedPath, projectRoot)) {
          errors.push(
            `Skipped ${resolvedPath}: not within .mnemonics/ directory`,
          );
          continue;
        }

        if (!resolvedPath.endsWith('.md')) {
          errors.push(`Skipped ${resolvedPath}: not a .md file`);
          continue;
        }

        // Check file exists
        if (!fs.existsSync(resolvedPath)) {
          errors.push(`Skipped ${resolvedPath}: file not found`);
          continue;
        }

        // Delete file
        try {
          await fs.promises.unlink(resolvedPath);

          // Verify file no longer exists
          if (fs.existsSync(resolvedPath)) {
            errors.push(
              `Failed to delete ${resolvedPath}: file still exists after deletion`,
            );
            continue;
          }

          deletedFiles.push(resolvedPath);
          logger.info(`Deleted memory file: ${resolvedPath}`);
        } catch (error) {
          errors.push(
            `Error deleting ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`,
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
