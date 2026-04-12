import fs from 'node:fs';
import path from 'node:path';

function collectFilesFromDirectory(directoryPath: string): string[] {
  const entries = fs
    .readdirSync(directoryPath, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));

  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFilesFromDirectory(entryPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

export function resolveSourcePathsToFiles(
  sourcePaths: readonly string[] | undefined,
  projectRoot: string,
): string[] {
  if (!sourcePaths || sourcePaths.length === 0) {
    return [];
  }

  const matches = new Set<string>();

  for (const rawSourcePath of sourcePaths) {
    const sourcePath = rawSourcePath.trim();
    if (sourcePath.length === 0) {
      continue;
    }

    const resolvedPath = path.resolve(projectRoot, sourcePath);

    if (fs.existsSync(resolvedPath)) {
      const stats = fs.statSync(resolvedPath);

      if (stats.isFile()) {
        matches.add(resolvedPath);
        continue;
      }

      if (stats.isDirectory()) {
        for (const filePath of collectFilesFromDirectory(resolvedPath)) {
          matches.add(filePath);
        }
      }

      continue;
    }

    const glob = new Bun.Glob(sourcePath);
    for (const matchedPath of glob.scanSync({ cwd: projectRoot })) {
      const absoluteMatchedPath = path.resolve(projectRoot, matchedPath);
      if (!fs.existsSync(absoluteMatchedPath)) {
        continue;
      }

      const stats = fs.statSync(absoluteMatchedPath);
      if (stats.isFile()) {
        matches.add(absoluteMatchedPath);
      }
    }
  }

  return [...matches].sort((left, right) => left.localeCompare(right));
}
