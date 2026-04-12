import fs from 'node:fs';
import path from 'node:path';
import type { PluginConfig } from '../config';
import {
  ensureDirectory,
  getProjectMemoryPath,
  type MemoryMetadata,
} from '../storage';
import { getBuiltinMemoryTypes, type Logger, toKebabCase } from '../utils';

const SCHEMA_FILE_NAME = 'SCHEMA.md';

interface SchemaField {
  key: keyof MemoryMetadata;
  type: string;
  required: 'yes' | 'no';
  description: string;
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function formatInlineCode(value: string): string {
  return `\`${value.replace(/`/g, '\\`')}\``;
}

function getAllMemoryTypes(
  config: PluginConfig,
): Array<{ name: string; description: string; template?: string }> {
  const memoryTypes = new Map<
    string,
    { name: string; description: string; template?: string }
  >();

  for (const builtinType of getBuiltinMemoryTypes()) {
    const normalizedName = toKebabCase(builtinType.name);
    memoryTypes.set(normalizedName, {
      name: normalizedName,
      description: builtinType.description,
      template: builtinType.template,
    });
  }

  for (const customType of config.memoryTypes ?? []) {
    const normalizedName = toKebabCase(customType.name);
    memoryTypes.set(normalizedName, {
      name: normalizedName,
      description: customType.description,
      template: customType.template,
    });
  }

  return [...memoryTypes.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function buildSchemaMarkdown(config: PluginConfig): string {
  const generatedAt = new Date().toISOString();
  const memoryTypes = getAllMemoryTypes(config);
  const customTypes = (config.memoryTypes ?? []).map((type) => ({
    ...type,
    name: toKebabCase(type.name),
  }));
  const sourcePaths = config.sourcePaths ?? [];

  const schemaFields: SchemaField[] = [
    {
      key: 'id',
      type: 'string',
      required: 'yes',
      description: 'UUID identifier, auto-generated for each memory file.',
    },
    {
      key: 'created',
      type: 'string',
      required: 'yes',
      description: 'Creation timestamp in ISO-8601 format.',
    },
    {
      key: 'modified',
      type: 'string',
      required: 'yes',
      description: 'Last-modified timestamp in ISO-8601 format.',
    },
    {
      key: 'memory_type',
      type: 'string',
      required: 'yes',
      description:
        'Kebab-case memory type; must match a valid built-in or custom type.',
    },
    {
      key: 'tags',
      type: 'string[]',
      required: 'no',
      description: 'Optional tag list used for filtering and semantic recall.',
    },
    {
      key: 'related',
      type: 'string[]',
      required: 'no',
      description: 'Optional related memory file paths within `.mnemonics/`.',
    },
  ];

  const lines: string[] = [
    '# Memory Schema',
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Overview',
    '',
    'Historian stores persistent memory as Markdown files under the project',
    '`.mnemonics/` directory. Each memory file uses YAML frontmatter for',
    'structured metadata and Markdown body content for narrative context.',
    '',
    '- Storage location: `.mnemonics/` at the project root',
    '- File format: Markdown with YAML frontmatter + Markdown body',
    '- Primary governance files: `index.md`, `log.md`, and `SCHEMA.md`',
    '',
    '## Memory Types',
    '',
    '| Name | Description | Template |',
    '| --- | --- | --- |',
  ];

  for (const memoryType of memoryTypes) {
    const template = memoryType.template
      ? formatInlineCode(memoryType.template)
      : '—';
    lines.push(
      `| ${escapeTableCell(memoryType.name)} | ${escapeTableCell(memoryType.description)} | ${escapeTableCell(template)} |`,
    );
  }

  lines.push(
    '',
    '## File Format',
    '',
    'Each memory file uses frontmatter compatible with the `MemoryMetadata`',
    'interface:',
    '',
    '| Field | Type | Required | Description |',
    '| --- | --- | --- | --- |',
  );

  for (const field of schemaFields) {
    lines.push(
      `| ${formatInlineCode(field.key)} | ${formatInlineCode(field.type)} | ${field.required} | ${escapeTableCell(field.description)} |`,
    );
  }

  lines.push(
    '',
    '## Conventions',
    '',
    '- File naming: use kebab-case `.md` filenames (for example,',
    '  `database-migration-plan.md`).',
    '- Directory structure: `.mnemonics/{memory-type}/{filename}.md`.',
    '- Wikilinks: use `[[memory-title]]` or `[[type/memory-title]]` syntax.',
    '- Special files:',
    '  - `index.md`: generated catalog of all memory entries.',
    '  - `log.md`: chronological memory activity log.',
    '  - `SCHEMA.md`: governance document for types, metadata, and rules.',
    '',
    '## Tagging Guidelines',
    '',
    '- Prefer short, stable tags in kebab-case (for example, `auth`,',
    '  `deployment`, `postmortem`).',
    '- Use 2-6 tags per memory to balance discoverability and noise.',
    '- Reuse existing tags when possible to keep retrieval consistent.',
    '- Avoid redundant tags that only repeat the memory type.',
    '',
    '## Configuration',
    '',
    `- Model: ${config.model ? formatInlineCode(config.model) : 'not set'}`,
    `- Temperature: ${config.temperature}`,
    `- Auto Compound: ${config.autoCompound ? 'enabled' : 'disabled'}`,
    `- Custom Types: ${customTypes.length}`,
    `- Source Paths: ${sourcePaths.length}`,
  );

  if (sourcePaths.length > 0) {
    lines.push('', '### Source Paths', '');
    for (const sourcePath of sourcePaths) {
      lines.push(`- ${formatInlineCode(sourcePath)}`);
    }
  }

  if (customTypes.length > 0) {
    lines.push('', '### Custom Types', '', '| Name | Description | Template |');
    lines.push('| --- | --- | --- |');

    for (const customType of customTypes) {
      const template = customType.template
        ? formatInlineCode(customType.template)
        : '—';
      lines.push(
        `| ${escapeTableCell(customType.name)} | ${escapeTableCell(customType.description)} | ${escapeTableCell(template)} |`,
      );
    }
  }

  return `${lines.join('\n')}\n`;
}

/**
 * Generates `.mnemonics/SCHEMA.md` documenting memory types, metadata,
 * conventions, and active configuration for the current project.
 */
export async function generateSchema(
  projectRoot: string,
  config: PluginConfig,
  logger: Logger,
): Promise<void> {
  const mnemonicsPath = getProjectMemoryPath(projectRoot);
  const schemaPath = path.join(mnemonicsPath, SCHEMA_FILE_NAME);
  const tempPath = `${schemaPath}.tmp-${process.pid}-${Date.now()}`;

  try {
    ensureDirectory(mnemonicsPath);
    const schemaContent = buildSchemaMarkdown(config);
    await fs.promises.writeFile(tempPath, schemaContent, 'utf-8');
    await fs.promises.rename(tempPath, schemaPath);
    logger.info(`Generated memory schema at ${schemaPath}.`);
  } catch (error) {
    try {
      await fs.promises.unlink(tempPath);
    } catch {}

    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to generate ${SCHEMA_FILE_NAME}: ${errorMessage}`);
    throw error;
  }
}
