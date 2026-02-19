import * as os from 'node:os';
import * as path from 'node:path';
import type { PluginConfig } from './schema';

export const PROJECT_MEMORY_DIR = '.mnemonics';

export const DEFAULT_CONFIG: Partial<PluginConfig> = {
  temperature: 0.3,
  logLevel: 'info',
  debug: false,
};

export function getUserConfigDir(): string {
  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
}

export function getUserConfigPath(): string {
  return path.join(getUserConfigDir(), 'opencode', 'opencode-historian');
}

export function getProjectConfigPath(projectRoot: string): string {
  return path.join(projectRoot, '.opencode', 'opencode-historian');
}
