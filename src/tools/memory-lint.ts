import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PluginConfig } from '../config';
import {
  getProjectMemoryPath,
  type MemoryMetadata,
  parseMemoryFile,
} from '../storage';
import {
  getBuiltinMemoryTypes,
  isValidMemoryType,
  type Logger,
} from '../utils';

type IssueType =
  | 'orphan'
  | 'stale'
  | 'broken-wikilink'
  | 'missing-frontmatter'
  | 'invalid-type'
  | 'empty-content'
  | 'duplicate-title';

type IssueSeverity = 'error' | 'warning' | 'info';

export interface LintIssue {
  type: IssueType;
  severity: IssueSeverity;
  file: string;
  message: string;
  suggestion?: string;
}

interface ParsedMemory {
  filePath: string;
  mtimeMs: number;
  content: string;
  data: Partial<MemoryMetadata>;
}

const EXCLUDED_FILES = new Set(['index.md', 'log.md', 'SCHEMA.md']);
const WIKILINK_REGEX = /\[\[([^\]]+)\]\]/g;
const STALE_DAYS = 90;

/**
 * Creates a memory health-check tool that audits the .mnemonics collection.
 */
export function createLintTool(
  config: PluginConfig,
  projectRoot: string,
  logger: Logger,
) {
  return {
    name: 'memory_lint',
    description:
      'Audit memory collection health for stale entries, broken links, metadata issues, and duplicates.',
    parameters: {},
    handler: async () => {
      try {
        const mnemonicsRoot = getProjectMemoryPath(projectRoot);
        const allFiles = await getMarkdownFiles(mnemonicsRoot);
        const issues: LintIssue[] = [];
        const memories: ParsedMemory[] = [];

        for (const filePath of allFiles) {
          try {
            const stat = await fs.promises.stat(filePath);
            const parsed = await parseMemoryFile(filePath);
            memories.push({
              filePath,
              mtimeMs: stat.mtimeMs,
              content: parsed.content,
              data: {
                id: parsed.data.id,
                created: parsed.data.created,
                modified: parsed.data.modified,
                memory_type: parsed.data.memory_type,
                related: parsed.data.related,
              },
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            issues.push({
              type: 'missing-frontmatter',
              severity: 'error',
              file: path.relative(projectRoot, filePath),
              message: `Failed to parse memory file: ${errorMessage}`,
              suggestion:
                'Ensure valid YAML frontmatter with id, created, modified, and memory_type.',
            });
            logger.warn(
              `Failed parsing memory file ${filePath}: ${errorMessage}`,
            );
          }
        }

        const existingFiles = new Set(allFiles);
        const titleGroups = new Map<
          string,
          { filePath: string; type: string }[]
        >();
        const now = Date.now();
        const staleThresholdMs = STALE_DAYS * 24 * 60 * 60 * 1000;

        for (const memory of memories) {
          const relativeFilePath = path.relative(projectRoot, memory.filePath);
          const memoryType = memory.data.memory_type;

          const hasRequiredFrontmatter = hasRequiredFields(memory.data);
          if (!hasRequiredFrontmatter) {
            issues.push({
              type: 'missing-frontmatter',
              severity: 'error',
              file: relativeFilePath,
              message:
                'Missing required frontmatter fields (id, created, modified, memory_type).',
              suggestion:
                'Add all required frontmatter fields with valid string values.',
            });
          }

          if (
            memoryType &&
            !isValidMemoryType(memoryType, config.memoryTypes)
          ) {
            const builtinTypeNames = getBuiltinMemoryTypes().map((t) => t.name);
            const customTypeNames = (config.memoryTypes || []).map(
              (t) => t.name,
            );
            issues.push({
              type: 'invalid-type',
              severity: 'error',
              file: relativeFilePath,
              message: `Invalid memory_type "${memoryType}".`,
              suggestion: `Use a valid type: ${[...builtinTypeNames, ...customTypeNames].join(', ')}.`,
            });
          }

          if (!memory.data.related || memory.data.related.length === 0) {
            issues.push({
              type: 'orphan',
              severity: 'info',
              file: relativeFilePath,
              message:
                'Memory has no related links (related field is empty or missing).',
              suggestion:
                'Add related memory references to improve discoverability and context.',
            });
          }

          if (now - memory.mtimeMs > staleThresholdMs) {
            issues.push({
              type: 'stale',
              severity: 'warning',
              file: relativeFilePath,
              message: `Memory file has not been modified in over ${STALE_DAYS} days.`,
              suggestion:
                'Review and refresh this memory if the information is still relevant.',
            });
          }

          if (memory.content.trim().length === 0) {
            issues.push({
              type: 'empty-content',
              severity: 'warning',
              file: relativeFilePath,
              message: 'Memory has frontmatter but no meaningful content.',
              suggestion:
                'Add useful content, or remove the file if it is no longer needed.',
            });
          }

          const brokenWikilinks = findBrokenWikilinks(
            memory.content,
            memory.filePath,
            mnemonicsRoot,
            existingFiles,
          );

          for (const target of brokenWikilinks) {
            issues.push({
              type: 'broken-wikilink',
              severity: 'warning',
              file: relativeFilePath,
              message: `Broken wikilink target: [[${target}]].`,
              suggestion:
                'Create the target memory file or update the wikilink to an existing memory.',
            });
          }

          const title = path.basename(memory.filePath, '.md').toLowerCase();
          const group = titleGroups.get(title) || [];
          group.push({
            filePath: relativeFilePath,
            type: memoryType || 'unknown',
          });
          titleGroups.set(title, group);
        }

        for (const [title, files] of titleGroups.entries()) {
          const distinctTypes = new Set(files.map((f) => f.type));
          if (files.length > 1 && distinctTypes.size > 1) {
            for (const file of files) {
              issues.push({
                type: 'duplicate-title',
                severity: 'warning',
                file: file.filePath,
                message: `Duplicate title "${title}" exists across memory types.`,
                suggestion:
                  'Rename one of the files to make titles unique and reduce ambiguity.',
              });
            }
          }
        }

        issues.sort(
          (a, b) => severityRank(a.severity) - severityRank(b.severity),
        );

        const issueFileSet = new Set(issues.map((issue) => issue.file));
        const totalMemories = memories.length;
        const healthyMemories = Math.max(totalMemories - issueFileSet.size, 0);
        const healthScore =
          totalMemories === 0
            ? 100
            : Math.round((healthyMemories / totalMemories) * 100);

        logger.info(
          `Memory lint completed: scanned ${totalMemories} memories, found ${issues.length} issues`,
        );

        return {
          success: issues.length === 0,
          summary: {
            totalMemories,
            issuesFound: issues.length,
            healthScore,
          },
          issues,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`Memory lint failed: ${errorMessage}`);

        return {
          success: false,
          summary: {
            totalMemories: 0,
            issuesFound: 1,
            healthScore: 0,
          },
          issues: [
            {
              type: 'missing-frontmatter' as const,
              severity: 'error' as const,
              file: path.relative(
                projectRoot,
                getProjectMemoryPath(projectRoot),
              ),
              message: `Failed to run memory lint: ${errorMessage}`,
              suggestion:
                'Check .mnemonics directory accessibility and file permissions.',
            },
          ],
        };
      }
    },
  };
}

async function getMarkdownFiles(rootDir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (!entry.name.endsWith('.md')) {
        continue;
      }

      if (EXCLUDED_FILES.has(entry.name)) {
        continue;
      }

      files.push(fullPath);
    }
  }

  await walk(rootDir);
  return files;
}

function hasRequiredFields(data: ParsedMemory['data']): boolean {
  return (
    typeof data.id === 'string' &&
    data.id.trim().length > 0 &&
    typeof data.created === 'string' &&
    data.created.trim().length > 0 &&
    typeof data.modified === 'string' &&
    data.modified.trim().length > 0 &&
    typeof data.memory_type === 'string' &&
    data.memory_type.trim().length > 0
  );
}

function findBrokenWikilinks(
  content: string,
  sourceFilePath: string,
  mnemonicsRoot: string,
  existingFiles: Set<string>,
): string[] {
  const brokenTargets: string[] = [];
  const sourceDir = path.dirname(sourceFilePath);
  const seen = new Set<string>();

  let match = WIKILINK_REGEX.exec(content);
  while (match) {
    const rawTarget = match[1].trim();
    if (rawTarget.length > 0) {
      const targetWithoutAlias = rawTarget.split('|')[0]?.trim() || '';
      const targetWithoutAnchor =
        targetWithoutAlias.split('#')[0]?.trim() || '';

      if (targetWithoutAnchor.length > 0 && !seen.has(targetWithoutAnchor)) {
        seen.add(targetWithoutAnchor);

        const candidatePaths = resolveWikilinkCandidates(
          targetWithoutAnchor,
          sourceDir,
          mnemonicsRoot,
        );

        const exists = candidatePaths.some((candidate) =>
          existingFiles.has(candidate),
        );

        if (!exists) {
          brokenTargets.push(targetWithoutAnchor);
        }
      }
    }

    match = WIKILINK_REGEX.exec(content);
  }

  WIKILINK_REGEX.lastIndex = 0;
  return brokenTargets;
}

function resolveWikilinkCandidates(
  target: string,
  sourceDir: string,
  mnemonicsRoot: string,
): string[] {
  const normalizedTarget = target.replace(/\\/g, '/').replace(/^\//, '');
  const withExtension = normalizedTarget.endsWith('.md')
    ? normalizedTarget
    : `${normalizedTarget}.md`;

  return [
    path.resolve(sourceDir, withExtension),
    path.resolve(mnemonicsRoot, withExtension),
  ];
}

function severityRank(severity: IssueSeverity): number {
  const rank: Record<IssueSeverity, number> = {
    error: 0,
    warning: 1,
    info: 2,
  };
  return rank[severity];
}
