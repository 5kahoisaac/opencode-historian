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
      filePaths: z.union([z.array(z.string()), z.string()]).transform((v) => {
        // If it's already an array, return as-is
        if (Array.isArray(v)) return v;
        // If it's a string that looks like a JSON array, parse it
        if (typeof v === 'string' && v.startsWith('[')) {
          try {
            const parsed = JSON.parse(v);
            return Array.isArray(parsed) ? parsed : [v];
          } catch {
            return [v];
          }
        }
        // Otherwise, wrap in array
        return [v];
      }),
    },
    handler: async ({ filePaths }: { filePaths: string | string[] }) => {
      // Normalize to array (handles both string and array input)
      // The transform above should have handled this, but double-check
      let paths: string[];
      if (Array.isArray(filePaths)) {
        paths = filePaths;
      } else if (typeof filePaths === 'string' && filePaths.startsWith('[')) {
        try {
          const parsed = JSON.parse(filePaths);
          paths = Array.isArray(parsed) ? parsed : [filePaths];
        } catch {
          paths = [filePaths];
        }
      } else {
        paths = [filePaths as string];
      }

      if (!paths || paths.length === 0) {
        throw new Error('filePaths is required and cannot be empty');
      }

      const deletedFiles: string[] = [];
      const errors: string[] = [];

      for (const filePath of paths) {
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
      await updateIndex({ index: indexName, projectRoot, logger });
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
