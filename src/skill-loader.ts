import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface LoadedSkill {
  name: string;
  description: string;
  content: string;
  path: string;
}

/**
 * Load built-in skills from the bundled dist/skills/ directory.
 * Skills are bundled during build (cp -r src/skills dist/).
 */
export function loadBuiltinSkills(): LoadedSkill[] {
  // Get skills directory relative to this module (dist/skills/)
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
