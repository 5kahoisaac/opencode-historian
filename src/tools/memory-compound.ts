import * as fs from 'node:fs';
import * as matter from 'gray-matter';
import { z } from 'zod';
import type { PluginConfig } from '../config';
import type { QmdClient } from '../qmd';
import { updateIndex } from '../qmd';
import { isWithinProjectMnemonics, parseMemoryFile } from '../storage';
import { isValidMemoryType, toKebabCase } from '../utils';

export function createCompoundTool(
  qmdClient: QmdClient,
  _config: PluginConfig,
  projectRoot: string,
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
      const indexName = qmdClient.getIndexName(projectRoot);
      const searchResults = await qmdClient.search(query, {
        index: indexName,
        n: 1,
      });

      // Filter for .md files only (CRUD-04)
      const mdResults = searchResults.filter((r) => r.path.endsWith('.md'));

      if (!mdResults || mdResults.length === 0) {
        throw new Error('No memory files (.md) found matching the query');
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

      console.log(`[opencode-historian] Updated memory file: ${filePath}`);

      // Update index
      await updateIndex({ index: indexName });

      return {
        success: true,
        filePath,
        memoryType: memoryFile.data.memory_type,
      };
    },
  };
}
