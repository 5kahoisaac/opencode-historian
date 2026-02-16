import * as fs from 'node:fs';
import stripJsonComments from 'strip-json-comments';
import {
  DEFAULT_CONFIG,
  getProjectConfigPath,
  getUserConfigPath,
} from './constants';
import { type PluginConfig, PluginConfigSchema } from './schema';

/**
 * Find a config file by checking for .jsonc first, then .json
 * @param basePath - Base path without extension
 * @returns Full path to config file, or null if neither exists
 */
export function findConfigPath(basePath: string): string | null {
  const jsoncPath = `${basePath}.jsonc`;
  const jsonPath = `${basePath}.json`;

  if (fs.existsSync(jsoncPath)) {
    return jsoncPath;
  }
  if (fs.existsSync(jsonPath)) {
    return jsonPath;
  }
  return null;
}

/**
 * Load and parse a config file from the given path
 * @param filePath - Path to config file (.json or .jsonc)
 * @returns Partial config object, or null if file doesn't exist or is invalid
 */
export function loadConfigFromPath(
  filePath: string,
): Partial<PluginConfig> | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const jsonContent = stripJsonComments(content);
    const rawConfig = JSON.parse(jsonContent);
    return PluginConfigSchema.partial().parse(rawConfig);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    console.warn(
      `[opencode-historian] Error reading config from ${filePath}:`,
      error,
    );
    return null;
  }
}

/**
 * Deep merge two objects, handling arrays by concatenating for memoryTypes
 * @param base - Base object to merge into
 * @param override - Object with override values
 * @returns Merged object
 */
function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Partial<T>,
): T {
  const result = { ...base };

  for (const [key, overrideValue] of Object.entries(override)) {
    if (overrideValue === undefined) {
      continue;
    }

    const baseValue = result[key];

    // Special handling for memoryTypes array
    if (
      key === 'memoryTypes' &&
      Array.isArray(baseValue) &&
      Array.isArray(overrideValue)
    ) {
      (result as Record<string, unknown>)[key] = [
        ...baseValue,
        ...overrideValue,
      ];
      continue;
    }

    // Deep merge for objects
    if (
      baseValue !== null &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue) &&
      overrideValue !== null &&
      typeof overrideValue === 'object' &&
      !Array.isArray(overrideValue)
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        baseValue as Record<string, unknown>,
        overrideValue as Partial<Record<string, unknown>>,
      );
      continue;
    }

    // Direct assignment for primitives
    (result as Record<string, unknown>)[key] = overrideValue;
  }

  return result;
}

/**
 * Load the complete plugin configuration with hierarchical merging
 * Priority (highest to lowest): project config -> user config -> defaults
 * @param directory - Project directory to load config from
 * @returns Complete plugin configuration
 */
export function loadPluginConfig(directory: string): PluginConfig {
  const userConfigPath = findConfigPath(getUserConfigPath());
  const projectConfigPath = findConfigPath(getProjectConfigPath(directory));

  let config: Partial<PluginConfig> = { ...DEFAULT_CONFIG };

  if (userConfigPath) {
    const userConfig = loadConfigFromPath(userConfigPath);
    if (userConfig) {
      config = deepMerge(config, userConfig);
    }
  }

  if (projectConfigPath) {
    const projectConfig = loadConfigFromPath(projectConfigPath);
    if (projectConfig) {
      config = deepMerge(config, projectConfig);
    }
  }

  // Apply defaults and validate final config
  return PluginConfigSchema.parse(config);
}
