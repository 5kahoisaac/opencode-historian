import * as fs from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';
import type { PluginConfig } from '../config';
import {
  addToCollection,
  getIndexName,
  type QmdOptions,
  updateEmbeddings,
  updateIndex,
} from '../qmd';
import {
  createMemoryFile,
  generateFilename,
  getProjectMemoryPath,
  isWithinProjectMnemonics,
  parseMemoryFile,
} from '../storage';
import {
  getBuiltinMemoryTypes,
  isValidMemoryType,
  type Logger,
  qmdPathToFsPath,
  toKebabCase,
} from '../utils';
import {
  addBacklinks,
  appendToLog,
  findRelatedMemories,
  generateIndex,
  updateRelatedField,
} from '../wiki';

export function createRememberTool(
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
    name: 'memory_remember',
    description:
      'Create a new memory or update existing memory. Pass filePath from memory_recall result to update existing.',
    parameters: {
      title: z.string(),
      content: z.string(),
      memoryType: z.string(),
      tags: z.array(z.string()).optional(),
      filePath: z.string().optional(),
    },
    handler: async ({
      title,
      content,
      memoryType,
      tags = [],
      filePath,
    }: {
      title: string;
      content: string;
      memoryType: string;
      tags?: string[];
      filePath?: string;
    }) => {
      // Normalize memory type to kebab-case
      const normalizedMemoryType = toKebabCase(memoryType);

      // Validate memory type
      if (!isValidMemoryType(normalizedMemoryType, config.memoryTypes)) {
        throw new Error(
          `Invalid memory type: "${memoryType}". Must be one of the built-in types or configured custom types.`,
        );
      }

      const indexName = getIndexName(projectRoot);
      let targetFilePath: string;
      let isUpdate = false;

      if (filePath?.endsWith('.md')) {
        // UPDATE EXISTING FILE
        // Convert qmd:// path to filesystem path if needed
        const resolvedPath = qmdPathToFsPath(filePath, projectRoot);

        // Validate scope
        if (!isWithinProjectMnemonics(resolvedPath, projectRoot)) {
          throw new Error('Write operations only allowed within .mnemonics/');
        }

        // Check file exists
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(
            `File not found: ${resolvedPath}. Cannot update non-existent memory.`,
          );
        }

        // Read existing file to preserve metadata
        const existingMemory = await parseMemoryFile(resolvedPath);

        // Update the memory with new content and modified timestamp
        const updatedMemory = {
          content,
          data: {
            ...existingMemory.data,
            memory_type: normalizedMemoryType,
            tags: tags.length > 0 ? tags : existingMemory.data.tags,
            modified: new Date().toISOString(),
          },
        };

        // Write updated content
        const fileContent = matter.stringify(
          updatedMemory.content,
          updatedMemory.data,
        );
        await fs.promises.writeFile(resolvedPath, fileContent, 'utf-8');

        targetFilePath = resolvedPath;
        isUpdate = true;
        logger.info(`Updated memory file: ${resolvedPath}`);
      } else {
        // CREATE NEW FILE
        const memoryFile = createMemoryFile(
          content,
          normalizedMemoryType,
          tags,
        );
        const filename = generateFilename(title);
        const mnemonicsDir = path.join(
          getProjectMemoryPath(projectRoot),
          normalizedMemoryType,
        );
        targetFilePath = path.join(mnemonicsDir, filename);

        // Ensure subdirectory exists
        await fs.promises.mkdir(mnemonicsDir, { recursive: true });

        // Validate scope
        if (!isWithinProjectMnemonics(targetFilePath, projectRoot)) {
          throw new Error('Write operations only allowed within .mnemonics/');
        }

        // Write the file
        const fileContent = matter.stringify(
          memoryFile.content,
          memoryFile.data,
        );
        await fs.promises.writeFile(targetFilePath, fileContent, 'utf-8');

        // Add to collection (pass directory, not file - qmd watches directories)
        await addToCollection(mnemonicsDir, normalizedMemoryType, {
          index: indexName,
          logger,
        });

        logger.info(`Created memory file: ${targetFilePath}`);
      }

      // Fire-and-forget: update index (debounced) and embeddings
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

      // Fire-and-forget: wiki integration (index, log, related)
      const filename = path.basename(targetFilePath);
      generateIndex(projectRoot, logger).catch((err: unknown) =>
        logger.warn(
          `Wiki index update failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
      appendToLog(projectRoot, {
        action: isUpdate ? 'update' : 'remember',
        memoryType: normalizedMemoryType,
        filePath: filename,
        title,
      }).catch((err: unknown) =>
        logger.warn(
          `Activity log append failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
      findRelatedMemories(targetFilePath, projectRoot, logger)
        .then((relatedPaths) => {
          if (relatedPaths.length > 0) {
            return Promise.all([
              updateRelatedField(
                targetFilePath,
                relatedPaths,
                projectRoot,
                logger,
              ),
              addBacklinks(targetFilePath, relatedPaths, projectRoot, logger),
            ]);
          }
        })
        .catch((err: unknown) =>
          logger.warn(
            `Related memories update failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );

      return {
        success: true,
        filePath: targetFilePath,
        memoryType: normalizedMemoryType,
        tags,
        isUpdate,
      };
    },
  };
}
