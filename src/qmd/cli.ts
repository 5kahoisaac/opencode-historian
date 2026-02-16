import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface QmdOptions {
  index: string;
}

export async function addToCollection(
  filePath: string,
  collectionName: string,
  options: QmdOptions,
): Promise<void> {
  const command = `qmd collection add "${filePath}" --name "${collectionName}" --index ${options.index}`;
  await execAsync(command);
}

export async function updateIndex(options: QmdOptions): Promise<void> {
  const command = `qmd update --index ${options.index}`;
  await execAsync(command);
}

/**
 * Add external paths to the index under the "context" collection.
 * Used to index external files/folders configured in externalPaths.
 */
export async function addExternalPathsToIndex(
  paths: string[],
  options: QmdOptions,
): Promise<void> {
  for (const path of paths) {
    try {
      // Add to "context" collection for external paths
      const command = `qmd index add "${path}" --index ${options.index} --collection context`;
      await execAsync(command);
      console.log(
        `[opencode-historian] Added external path to context collection: ${path}`,
      );
    } catch (error) {
      console.warn(
        `[opencode-historian] Failed to add external path ${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export { execAsync };
