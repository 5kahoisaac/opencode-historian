import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { Logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface QmdOptions {
  index: string;
  logger?: Logger;
}

/**
 * Add a directory to a qmd collection.
 * qmd collection add expects a directory to watch, not a single file.
 */
export async function addToCollection(
  directoryPath: string,
  collectionName: string,
  options: QmdOptions,
): Promise<void> {
  const command = `qmd --index ${options.index} collection list | grep -q "${collectionName}" || qmd --index ${options.index} collection add ${directoryPath} --name ${collectionName}`;
  await execAsync(command);
}

export async function updateIndex(options: QmdOptions): Promise<void> {
  const command = `qmd --index ${options.index} update`;
  await execAsync(command);
}

/**
 * Add external paths to the index under the "context" collection.
 * Used to index external folders configured in externalPaths.
 */
export async function addExternalPathsToIndex(
  paths: string[],
  options: QmdOptions,
): Promise<void> {
  for (const path of paths) {
    try {
      // Add to "context" collection for external paths
      const command = `qmd --index ${options.index} collection list | grep -q "context" || qmd --index ${options.index} collection add ${path} --name context`;
      await execAsync(command);
      options.logger?.info(
        `Added external path to context collection: ${path}`,
      );
    } catch (error) {
      options.logger?.warn(
        `Failed to add external path ${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export { execAsync };
