import * as fs from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';
import type { PluginConfig } from '../config';
import type { QmdClient } from '../qmd';
import { addToCollection, updateIndex } from '../qmd';
import {
  createMemoryFile,
  generateFilename,
  isWithinProjectMnemonics,
} from '../storage';
import { isValidMemoryType, toKebabCase } from '../utils';

export function createRememberTool(
  qmdClient: QmdClient,
  _config: PluginConfig,
  projectRoot: string,
) {
  return {
    name: 'memory_remember',
    description: 'Create a new memory with the given content',
    parameters: {
      title: z.string(),
      content: z.string(),
      memoryType: z.string(),
      tags: z.array(z.string()).optional(),
    },
    handler: async ({
      title,
      content,
      memoryType,
      tags = [],
    }: {
      title: string;
      content: string;
      memoryType: string;
      tags?: string[];
    }) => {
      // Normalize memory type to kebab-case
      const normalizedMemoryType = toKebabCase(memoryType);

      // Validate memory type
      if (!isValidMemoryType(normalizedMemoryType, _config.memoryTypes)) {
        throw new Error(
          `Invalid memory type: "${memoryType}". Must be one of the built-in types or configured custom types.`,
        );
      }

      // Create memory file
      const memoryFile = createMemoryFile(content, normalizedMemoryType, tags);
      const filename = generateFilename(title);
      const mnemonicsDir = path.join(projectRoot, '.mnemonics');
      const filePath = path.join(mnemonicsDir, filename);

      // Validate scope
      if (!isWithinProjectMnemonics(filePath, projectRoot)) {
        throw new Error('Write operations only allowed within .mnemonics/');
      }

      // Write the file using fs.writeFile
      const fileContent = matter.stringify(memoryFile.content, memoryFile.data);
      await fs.promises.writeFile(filePath, fileContent, 'utf-8');

      // Verify file was created
      if (!fs.existsSync(filePath)) {
        throw new Error(
          `Failed to create memory file: ${filePath}. File does not exist after write.`,
        );
      }

      console.log(`[opencode-historian] Created memory file: ${filePath}`);

      // Add to collection (normalizedMemoryType is guaranteed kebab-case)
      const indexName = qmdClient.getIndexName(projectRoot);
      await addToCollection(filePath, normalizedMemoryType, {
        index: indexName,
      });

      // Update index
      await updateIndex({ index: indexName });

      return {
        success: true,
        filePath,
        memoryType: normalizedMemoryType,
        tags,
      };
    },
  };
}
