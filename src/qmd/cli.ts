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

export async function removeFromIndex(
  filePath: string,
  options: QmdOptions,
): Promise<void> {
  await updateIndex(options);
}

export { execAsync };
