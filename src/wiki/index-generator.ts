import * as fs from 'node:fs';
import * as path from 'node:path';
import { PROJECT_MEMORY_DIR } from '../config';
import { getProjectMemoryPath, parseMemoryFile } from '../storage';
import { getBuiltinMemoryTypes, type Logger } from '../utils';

interface IndexedMemory {
  title: string;
  relativePath: string;
  tags: string[];
  modified: string;
  modifiedTime: number;
}

const EXCLUDED_FILENAMES = new Set(['index.md', 'log.md', 'SCHEMA.md']);

async function collectMemoryFiles(directory: string): Promise<string[]> {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectMemoryFiles(fullPath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!entry.name.endsWith('.md')) {
      continue;
    }

    if (EXCLUDED_FILENAMES.has(entry.name)) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function formatMemoryTypeHeading(memoryType: string): string {
  return memoryType
    .split(/[-_]/g)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function getFallbackTitle(filePath: string): string {
  const filename = path.basename(filePath, '.md');
  return filename
    .split('-')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

/**
 * Generates `.mnemonics/index.md` from all memory markdown files.
 *
 * The index contains aggregate stats and grouped memory listings by
 * `memory_type`, ordered by last modified date (newest first).
 */
export async function generateIndex(
  projectRoot: string,
  logger: Logger,
): Promise<void> {
  const mnemonicsPath = getProjectMemoryPath(projectRoot);
  const indexPath = path.join(mnemonicsPath, 'index.md');

  try {
    await fs.promises.mkdir(mnemonicsPath, { recursive: true });
  } catch (error) {
    logger.warn(
      `Failed to ensure ${PROJECT_MEMORY_DIR} directory exists: ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }

  let memoryFiles: string[] = [];
  try {
    memoryFiles = await collectMemoryFiles(mnemonicsPath);
  } catch (error) {
    logger.warn(
      `Failed to scan ${PROJECT_MEMORY_DIR} directory: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const groupedMemories = new Map<string, IndexedMemory[]>();
  let parsedCount = 0;

  for (const filePath of memoryFiles) {
    try {
      const memory = await parseMemoryFile(filePath);
      const memoryType = memory.data.memory_type || 'context';
      const modified = memory.data.modified || '';
      const modifiedTime = Number.isNaN(Date.parse(modified))
        ? 0
        : Date.parse(modified);
      const relativePath = path
        .relative(mnemonicsPath, filePath)
        .split(path.sep)
        .join('/');
      const title = getFallbackTitle(filePath);
      const indexedMemory: IndexedMemory = {
        title,
        relativePath,
        tags: memory.data.tags ?? [],
        modified,
        modifiedTime,
      };

      const existing = groupedMemories.get(memoryType) ?? [];
      existing.push(indexedMemory);
      groupedMemories.set(memoryType, existing);
      parsedCount += 1;
    } catch (error) {
      logger.warn(
        `Skipping unparseable memory file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  for (const memories of groupedMemories.values()) {
    memories.sort((a, b) => b.modifiedTime - a.modifiedTime);
  }

  const generatedAt = new Date().toISOString();
  const lines: string[] = [
    '# Memory Index',
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Statistics',
    '',
    `- Total memories: ${parsedCount}`,
  ];

  if (parsedCount === 0) {
    lines.push('', 'No memories yet.');
  }

  if (groupedMemories.size > 0) {
    lines.push('', '| Memory Type | Count |', '| --- | ---: |');
  }

  const builtinOrder = new Map<string, number>(
    getBuiltinMemoryTypes().map((memoryType, index) => [
      memoryType.name,
      index,
    ]),
  );

  const sortedTypes = [...groupedMemories.keys()].sort((a, b) => {
    const aIndex = builtinOrder.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = builtinOrder.get(b) ?? Number.MAX_SAFE_INTEGER;

    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }

    return a.localeCompare(b);
  });

  for (const memoryType of sortedTypes) {
    const memories = groupedMemories.get(memoryType) ?? [];
    lines.push(`| ${escapeTableCell(memoryType)} | ${memories.length} |`);
  }

  for (const memoryType of sortedTypes) {
    const memories = groupedMemories.get(memoryType) ?? [];
    lines.push('', `## ${formatMemoryTypeHeading(memoryType)}`, '');
    lines.push('| Title | Tags | Modified |', '| --- | --- | --- |');

    for (const memory of memories) {
      const titleCell = `[${escapeTableCell(memory.title)}](./${memory.relativePath})`;
      const tagsCell =
        memory.tags.length > 0 ? escapeTableCell(memory.tags.join(', ')) : '—';
      const modifiedCell = memory.modified
        ? escapeTableCell(memory.modified)
        : '—';

      lines.push(`| ${titleCell} | ${tagsCell} | ${modifiedCell} |`);
    }
  }

  const indexContent = `${lines.join('\n')}\n`;

  try {
    await fs.promises.writeFile(indexPath, indexContent, 'utf-8');
    logger.info(
      `Generated memory index at ${indexPath} (${parsedCount} memories).`,
    );
  } catch (error) {
    logger.warn(
      `Failed to write ${PROJECT_MEMORY_DIR}/index.md: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
