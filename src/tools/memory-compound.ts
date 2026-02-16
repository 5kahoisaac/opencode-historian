import * as fs from 'node:fs';
import * as matter from 'gray-matter';
import { z } from 'zod';
import type { PluginConfig } from '../config';
import { getIndexName, search, updateEmbedings, updateIndex } from '../qmd';
import { isWithinProjectMnemonics, parseMemoryFile } from '../storage';
import { isValidMemoryType, toKebabCase } from '../utils';
import type { Logger } from '../utils/logger';
import { createRememberTool } from './memory-remember';

export function createCompoundTool(
  _config: PluginConfig,
  projectRoot: string,
  logger: Logger,
) {
  return {
    name: 'memory_compound',
    description:
      'Update an existing memory by searching, reading, modifying, and writing back',
    parameters: {
      query: z.string(),
      modifications: z.string(),
      memoryType: z.string().optional(),
    },
    handler: async ({
      query,
      modifications,
      memoryType,
    }: {
      query: string;
      modifications: string;
      memoryType?: string;
    }) => {
      // Search existing memories
      const indexName = getIndexName(projectRoot);
      const searchResults = await search(query, {
        index: indexName,
        n: 1,
      });

      // Filter for .md files only (CRUD-04)
      const mdResults = searchResults.filter((r) => r.path.endsWith('.md'));

      if (!mdResults || mdResults.length === 0) {
        // No existing memory found - create new memory instead
        logger.info(
          `No existing memory found for query "${query}", creating new memory`,
        );

        // Create remember tool and call it
        const rememberTool = createRememberTool(_config, projectRoot, logger);
        const rememberResult = await rememberTool.handler({
          title: query, // Use query as title
          content: modifications,
          memoryType: memoryType || 'context', // Default to context if no type specified
          tags: [],
        });

        return {
          success: true,
          filePath: rememberResult.filePath,
          memoryType: rememberResult.memoryType,
          createdNew: true, // Indicate this was a new creation, not update
        };
      }

      const result = mdResults[0];
      const filePath = result.path;

      // Validate scope
      if (!isWithinProjectMnemonics(filePath, projectRoot)) {
        throw new Error('Write operations only allowed within .mnemonics/');
      }

      // Read existing memory
      const memoryFile = parseMemoryFile(filePath);

      // Normalize and validate memory type if provided
      const normalizedMemoryType = memoryType
        ? toKebabCase(memoryType)
        : undefined;
      if (
        normalizedMemoryType &&
        !isValidMemoryType(normalizedMemoryType, _config.memoryTypes)
      ) {
        throw new Error(
          `Invalid memory type: "${memoryType}". Must be one of the built-in types or configured custom types.`,
        );
      }

      // Modify content
      memoryFile.content = modifications;
      if (normalizedMemoryType) {
        memoryFile.data.memory_type = normalizedMemoryType;
      }
      memoryFile.data.modified = new Date().toISOString();

      // Write back using fs.writeFile
      const fileContent = matter.stringify(memoryFile.content, memoryFile.data);
      await fs.promises.writeFile(filePath, fileContent, 'utf-8');

      // Verify changes were saved
      const updatedFile = matter.read(filePath);
      if (updatedFile.content !== modifications) {
        throw new Error(
          `Failed to update memory file: ${filePath}. Content verification failed.`,
        );
      }

      logger.info(`Updated memory file: ${filePath}`);

      // Update index and embedings
      await updateIndex({ index: indexName });
      await updateEmbedings({ index: indexName });

      return {
        success: true,
        filePath,
        memoryType: memoryFile.data.memory_type,
        createdNew: false, // Indicate this was an update, not creation
      };
    },
  };
}
