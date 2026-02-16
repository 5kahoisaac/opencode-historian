import * as fs from 'node:fs';
import stripJsonComments from 'strip-json-comments';
import { createLogger } from '../utils/logger';
import {
  DEFAULT_CONFIG,
  getProjectConfigPath,
  getUserConfigPath,
} from './constants';
import { type PluginConfig, PluginConfigSchema } from './schema';

/**
 * Find a config file by checking for .jsonc first, then .json
 * @param basePath - Base path without extension
 * @param log - Optional log function for debug output
 * @returns Full path to config file, or null if neither exists
 */
export function findConfigPath(
  basePath: string,
  log?: (message: string) => void,
): string | null {
  const jsoncPath = `${basePath}.jsonc`;
  const jsonPath = `${basePath}.json`;

  const jsoncExists = fs.existsSync(jsoncPath);
  const jsonExists = fs.existsSync(jsonPath);

  if (log) {
    log(`Checking: ${jsoncPath} - exists: ${jsoncExists}`);
    log(`Checking: ${jsonPath} - exists: ${jsonExists}`);
  }

  if (jsoncExists) {
    return jsoncPath;
  }
  if (jsonExists) {
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
  const userConfigBasePath = getUserConfigPath();
  const projectConfigBasePath = getProjectConfigPath(directory);

  const userConfigPath = findConfigPath(userConfigBasePath);
  const projectConfigPath = findConfigPath(projectConfigBasePath);

  let config: Partial<PluginConfig> = { ...DEFAULT_CONFIG };

  const userConfig = userConfigPath ? loadConfigFromPath(userConfigPath) : null;
  if (userConfig) {
    config = deepMerge(config, userConfig);
  }

  const projectConfig = projectConfigPath
    ? loadConfigFromPath(projectConfigPath)
    : null;
  if (projectConfig) {
    config = deepMerge(config, projectConfig);
  }

  // Apply defaults and validate final config
  const finalConfig = PluginConfigSchema.parse(config);

  // Create logger with final config - it respects both debug and logLevel
  const logger = createLogger(finalConfig);

  logger.debug('Config loading:');
  logger.debug(`  User config path: ${userConfigBasePath}.{jsonc,json}`);
  logger.debug(`  Project config path: ${projectConfigBasePath}.{jsonc,json}`);
  logger.debug(`  User config found: ${userConfigPath || 'none'}`);
  logger.debug(`  Project config found: ${projectConfigPath || 'none'}`);
  if (userConfig) {
    logger.debug(`  User config loaded: ${JSON.stringify(userConfig)}`);
  }
  if (projectConfig) {
    logger.debug(`  Project config loaded: ${JSON.stringify(projectConfig)}`);
  }
  logger.debug(`  Final merged config: ${JSON.stringify(finalConfig)}`);

  return finalConfig;
}
