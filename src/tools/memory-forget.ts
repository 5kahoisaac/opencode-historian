import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import type { PluginConfig } from '../config';
import {
  getIndexName,
  type QmdOptions,
  updateEmbeddings,
  updateIndex,
} from '../qmd';
import { isWithinProjectMnemonics } from '../storage';
import { getBuiltinMemoryTypes, type Logger, qmdPathToFsPath } from '../utils';
import { appendToLog, generateIndex } from '../wiki';

export function createForgetTool(
  config: PluginConfig,
  projectRoot: string,
  logger: Logger,
) {
  let updateIndexTimer: ReturnType<typeof setTimeout> | null = null;
  const debouncedUpdateIndex = (options: QmdOptions) => {
    if (updateIndexTimer !== null) {
      clearTimeout(updateIndexTimer);
    }
    updateIndexTimer = setTimeout(() => {
      updateIndexTimer = null;
      updateIndex(options).catch((err: unknown) =>
        logger.warn(
          `Background index update failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }, 500);
  };

  return {
    name: 'memory_forget',
    description:
      'Delete memory files by their paths. Pass filePaths from memory_recall results.',
    parameters: {
      filePaths: z
        .union([z.array(z.string()), z.string()])
        .describe(
          'File paths to delete. Accepts a single path string or an array of path strings.',
        ),
    },
    handler: async ({ filePaths }: { filePaths: string | string[] }) => {
      // Normalize to array (handles both string and array input)
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

          // Fire-and-forget: log deletion to activity log
          const filename = path.basename(resolvedPath, '.md');
          const memoryType = path.basename(path.dirname(resolvedPath));
          appendToLog(projectRoot, {
            action: 'forget',
            memoryType,
            filePath: resolvedPath,
            title: filename,
            summary: `Deleted memory: ${filename}`,
          }).catch((err: unknown) =>
            logger.warn(
              `Activity log update failed: ${err instanceof Error ? err.message : String(err)}`,
            ),
          );
        } catch (error) {
          errors.push(
            `Error deleting ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // Fire-and-forget: update index and embeddings in the background
      const indexName = getIndexName(projectRoot);
      const builtinTypes = getBuiltinMemoryTypes();
      const allMemoryTypes = [...builtinTypes, ...(config.memoryTypes || [])];
      debouncedUpdateIndex({
        index: indexName,
        projectRoot,
        logger,
        memoryTypes: allMemoryTypes.map((t) => t.name),
      });
      updateEmbeddings({ index: indexName }).catch((err: unknown) =>
        logger.warn(
          `Background embeddings update failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

      // Fire-and-forget: regenerate wiki index after deletions
      if (deletedFiles.length > 0) {
        generateIndex(projectRoot, logger).catch((err: unknown) =>
          logger.warn(
            `Index generation failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
      }

      return {
        success: deletedFiles.length > 0,
        deletedCount: deletedFiles.length,
        deletedFiles,
        errors: errors.length > 0 ? errors : undefined,
      };
    },
  };
}
