import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_MEMORY_DIR } from '../config';

export function getProjectMemoryPath(projectRoot: string): string {
  return path.join(projectRoot, PROJECT_MEMORY_DIR);
}

export function ensureDirectory(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function isWithinProjectMnemonics(
  filePath: string,
  projectRoot: string,
): boolean {
  const projectMnemonicsPath = path.resolve(getProjectMemoryPath(projectRoot));
  const resolvedFilePath = path.resolve(filePath);
  return resolvedFilePath.startsWith(projectMnemonicsPath + path.sep);
}
