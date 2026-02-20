import fs from 'node:fs';
import matter from 'gray-matter';

export interface MemoryMetadata {
  id: string;
  created: string;
  modified: string;
  memory_type: string;
  tags?: string[];
  related?: string[];
}

export interface MemoryFile {
  content: string;
  data: MemoryMetadata;
}

export function createMemoryFile(
  content: string,
  memoryType: string,
  tags?: string[],
): MemoryFile {
  const now = new Date().toISOString();
  return {
    content,
    data: {
      id: crypto.randomUUID(),
      created: now,
      modified: now,
      memory_type: memoryType,
      tags,
    },
  };
}

export function parseMemoryFile(filePath: string): MemoryFile {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(fileContent);
  return {
    content: parsed.content,
    data: parsed.data as MemoryMetadata,
  };
}

export function writeMemoryFile(filePath: string, memory: MemoryFile): void {
  const fileContent = matter.stringify(memory.content, memory.data);
  fs.writeFileSync(filePath, fileContent, 'utf-8');
}

export function generateFilename(title: string): string {
  const kebabCase = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  return `${kebabCase}.md`;
}
