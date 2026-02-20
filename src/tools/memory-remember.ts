import * as fs from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';
import type { PluginConfig } from '../config';
import {
  addToCollection,
  getIndexName,
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

export function createRememberTool(
  config: PluginConfig,
  projectRoot: string,
  logger: Logger,
) {
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
        const existingMemory = parseMemoryFile(resolvedPath);

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

        // Verify file was created
        if (!fs.existsSync(targetFilePath)) {
          throw new Error(
            `Failed to create memory file: ${targetFilePath}. File does not exist after write.`,
          );
        }

        // Add to collection (pass directory, not file - qmd watches directories)
        await addToCollection(mnemonicsDir, normalizedMemoryType, {
          index: indexName,
          logger,
        });

        logger.info(`Created memory file: ${targetFilePath}`);
      }

      // Update index and embeddings
      const builtinTypes = getBuiltinMemoryTypes();
      const allMemoryTypes = [...builtinTypes, ...(config.memoryTypes || [])];
      await updateIndex({
        index: indexName,
        projectRoot,
        logger,
        memoryTypes: allMemoryTypes.map((t) => t.name),
      });
      await updateEmbeddings({ index: indexName });

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
