import fs from 'node:fs';
import * as os from 'node:os';
import path from 'node:path';

export function getGlobalMemoryPath(): string {
  const userConfigDir =
    process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(userConfigDir, 'opencode', 'mnemonics');
}

export function getProjectMemoryPath(projectRoot: string): string {
  return path.join(projectRoot, '.mnemonics');
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
