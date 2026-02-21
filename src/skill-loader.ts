import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Logger } from './utils/index.js';

export interface LoadedSkill {
  name: string;
  description: string;
  content: string;
  path: string;
}

export function loadBuiltinSkills(): LoadedSkill[] {
  // Get skills directory relative to this module
  const skillsDir = join(dirname(fileURLToPath(import.meta.url)), 'skills');

  if (!existsSync(skillsDir)) {
    return [];
  }

  const skills: LoadedSkill[] = [];
  const entries = readdirSync(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillPath = join(skillsDir, entry.name, 'SKILL.md');
    if (!existsSync(skillPath)) continue;

    const content = readFileSync(skillPath, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    skills.push({
      name: frontmatter.name || entry.name,
      description: frontmatter.description || '',
      content,
      path: skillPath,
    });
  }

  return skills;
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontmatter: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      frontmatter[key.trim()] = valueParts
        .join(':')
        .trim()
        .replace(/^["']|["']$/g, '');
    }
  }

  return frontmatter;
}

/**
 * Registers built-in skills in OpenCode's skill directory for discoverability.
 * Copies skill files to .opencode/skills/ so they appear in /skills command.
 * Skips if skill already exists to preserve user customizations.
 */
export function registerSkillsInOpenCode(
  projectRoot: string,
  logger: Logger,
): void {
  // Define target paths for skills to register
  const skillsToRegister = [
    {
      name: 'mnemonics',
      sourceDir: 'skills',
    },
  ];

  for (const skill of skillsToRegister) {
    const targetDir = join(projectRoot, '.opencode', 'skills', skill.name);
    const targetPath = join(targetDir, 'SKILL.md');

    // Check if skill already exists - preserve user customizations
    if (existsSync(targetPath)) {
      logger.info(
        `Skill '${skill.name}' already registered, preserving existing file`,
      );
      continue;
    }

    // Get source skill path (relative to this module's dist location)
    const sourcePath = join(
      dirname(fileURLToPath(import.meta.url)),
      skill.sourceDir,
      skill.name,
      'SKILL.md',
    );

    if (!existsSync(sourcePath)) {
      logger.warn(`Source skill not found: ${sourcePath}`);
      continue;
    }

    // Ensure target directory exists
    mkdirSync(targetDir, { recursive: true });

    // Copy skill content
    const content = readFileSync(sourcePath, 'utf-8');
    writeFileSync(targetPath, content, 'utf-8');

    logger.info(`Registered skill '${skill.name}' in .opencode/skills/`);
  }
}
