#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getUserConfigPath } from '../config';
import { ensureDirectory } from '../storage';

const DEFAULT_CONFIG = {
  model: 'opencode/kimi-k2.5-free',
  temperature: 0.3,
  autoCompound: true,
  logLevel: 'info',
  debug: false,
};

async function install(): Promise<void> {
  console.log('[opencode-historian] Installing...');

  // Create user config directory
  const userConfigPath = getUserConfigPath();
  const userConfigDir = path.dirname(userConfigPath);
  ensureDirectory(userConfigDir);

  // Create default config if it doesn't exist
  const configFile = `${userConfigPath}.json`;
  if (!fs.existsSync(configFile)) {
    fs.writeFileSync(configFile, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log(`[opencode-historian] Created default config: ${configFile}`);
  }

  console.log('[opencode-historian] Installation complete!');
}

async function doctor(): Promise<void> {
  console.log('[opencode-historian] Running doctor...');
  const issues: string[] = [];

  // Check qmd is installed
  try {
    const { execSync } = await import('node:child_process');
    execSync('qmd --version', { encoding: 'utf-8' });
    console.log('✓ qmd is installed');
  } catch {
    issues.push('✗ qmd is not installed. Run: npm install -g qmd');
  }

  // Check config files
  const userConfigPath = getUserConfigPath();
  if (
    fs.existsSync(`${userConfigPath}.json`) ||
    fs.existsSync(`${userConfigPath}.jsonc`)
  ) {
    console.log('✓ User config exists');
  } else {
    console.log('⚠ User config not found. Run: opencode-historian install');
  }

  if (issues.length > 0) {
    console.log('\nIssues found:');
    issues.forEach((issue) => {
      console.log(issue);
    });
    process.exit(1);
  } else {
    console.log('\n✓ All checks passed!');
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
      console.log('Usage: opencode-historian <install|doctor>');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('[opencode-historian] Error:', error);
  process.exit(1);
});
