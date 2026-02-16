#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PluginConfig } from '../config';
import { getUserConfigPath } from '../config';
import { ensureDirectory } from '../storage';
import { createLogger } from '../utils/logger';

const DEFAULT_CONFIG: PluginConfig = {
  model: 'opencode/kimi-k2.5-free',
  temperature: 0.3,
  autoCompound: true,
  logLevel: 'info',
  debug: false,
};

const logger = createLogger(DEFAULT_CONFIG);

async function install(): Promise<void> {
  logger.info('Installing...');

  // Create user config directory
  const userConfigPath = getUserConfigPath();
  const userConfigDir = path.dirname(userConfigPath);
  ensureDirectory(userConfigDir);

  // Create default config if it doesn't exist
  const configFile = `${userConfigPath}.json`;
  if (!fs.existsSync(configFile)) {
    fs.writeFileSync(configFile, JSON.stringify(DEFAULT_CONFIG, null, 2));
    logger.info(`Created default config: ${configFile}`);
  }

  logger.info('Installation complete!');
}

async function doctor(): Promise<void> {
  logger.info('Running doctor...');
  const issues: string[] = [];

  // Check qmd is installed
  try {
    const { execSync } = await import('node:child_process');
    execSync('qmd --version', { encoding: 'utf-8' });
    logger.info('✓ qmd is installed');
  } catch {
    issues.push('✗ qmd is not installed. Run: npm install -g qmd');
  }

  // Check config files
  const userConfigPath = getUserConfigPath();
  if (
    fs.existsSync(`${userConfigPath}.json`) ||
    fs.existsSync(`${userConfigPath}.jsonc`)
  ) {
    logger.info('✓ User config exists');
  } else {
    logger.warn('⚠ User config not found. Run: opencode-historian install');
  }

  if (issues.length > 0) {
    logger.info('\nIssues found:');
    issues.forEach((issue) => {
      logger.info(issue);
    });
    process.exit(1);
  } else {
    logger.info('\n✓ All checks passed!');
  }
}

async function main(): Promise<void> {
  const command = process.argv[2];

  switch (command) {
    case 'install':
      await install();
      break;
    case 'doctor':
      await doctor();
      break;
    default:
      logger.info('Usage: opencode-historian <install|doctor>');
      process.exit(1);
  }
}

main().catch((error) => {
  logger.error(
    `Error: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
