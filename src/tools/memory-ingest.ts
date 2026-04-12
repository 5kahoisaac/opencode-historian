import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ToolContext } from '@opencode-ai/plugin';
import type { OpencodeClient } from '@opencode-ai/sdk';
import { z } from 'zod';
import type { PluginConfig } from '../config';
import {
  convertFileWithMarkitdown,
  type MarkitdownConvertResult,
  type MarkitdownFailureReason,
  preflightMarkitdown,
} from '../ingest/markitdown';
import { resolveSourcePathsToFiles } from '../ingest/source-discovery';
import { getIndexName, type QmdOptions, updateIndex } from '../qmd';
import {
  generateFilename,
  getProjectMemoryPath,
  parseMemoryFile,
} from '../storage';
import { getBuiltinMemoryTypes, type Logger, toKebabCase } from '../utils';
import {
  addBacklinks,
  appendToLog,
  findRelatedMemories,
  updateRelatedField,
} from '../wiki';
import { createRememberTool } from './memory-remember';

export interface ContentIngestResult {
  success: boolean;
  mode: 'content';
  message: string;
  instruction: string;
}

type SourceMemoryAction = 'created' | 'updated' | 'skipped' | 'failed';
type SourceExtractionMethod =
  | 'markitdown'
  | 'text-fallback'
  | 'llm-fallback'
  | 'none';

type FallbackExecutionStatus =
  | 'not-needed'
  | 'deterministic'
  | 'llm-executed'
  | 'llm-skipped'
  | 'none';

export interface SourceFileIngestResult {
  sourcePath: string;
  methodAttempted: SourceExtractionMethod;
  status: SourceMemoryAction;
  outcome:
    | SourceMemoryAction
    | MarkitdownFailureReason
    | 'preflight-failed'
    | 'execution-failure';
  message: string;
  memories?: Array<{
    unitId: string;
    boundaryType: SourceSplitBoundaryType;
    title: string;
    memoryType: string;
    status: SourceMemoryAction;
    message: string;
    filePath?: string;
    sourceRelativePath: string;
  }>;
  memory?: {
    unitId?: string;
    boundaryType?: SourceSplitBoundaryType;
    title: string;
    memoryType: string;
    filePath?: string;
    sourceRelativePath: string;
  };
  extractionChars?: number;
  fallbackUsed: boolean;
  fallbackExecution: FallbackExecutionStatus;
  extractionError?: string;
  persistenceError?: string;
}

export interface SourcePathIngestResult {
  success: boolean;
  mode: 'source-paths';
  message: string;
  instruction?: string;
  reviewArtifact?: {
    path: string;
    entriesWritten: number;
    totalEntries: number;
  };
  files: SourceFileIngestResult[];
  summary: {
    configuredPatterns: string[];
    filesDiscovered: number;
    filesProcessed: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    fallbackUsed: number;
    llmFallbackExecuted: number;
    llmFallbackSkipped: number;
    memoryUnitsCreated: number;
    memoryUnitsUpdated: number;
    memoryUnitsSkipped: number;
    memoryUnitsFailed: number;
    memoryUnitsPersisted: number;
  };
}

type RememberHandler = ReturnType<typeof createRememberTool>['handler'];

interface IngestDependencies {
  preflight: typeof preflightMarkitdown;
  convert: typeof convertFileWithMarkitdown;
  extractFallback: typeof extractTextFallback;
  extractLlmFallback: typeof extractLlmFallback;
  remember: RememberHandler;
  appendLog: typeof appendToLog;
  findRelated: typeof findRelatedMemories;
  updateRelated: typeof updateRelatedField;
  addBacklinks: typeof addBacklinks;
}

interface PartialIngestDependencies {
  preflight?: IngestDependencies['preflight'];
  convert?: IngestDependencies['convert'];
  extractFallback?: IngestDependencies['extractFallback'];
  extractLlmFallback?: IngestDependencies['extractLlmFallback'];
  remember?: IngestDependencies['remember'];
  appendLog?: IngestDependencies['appendLog'];
  findRelated?: IngestDependencies['findRelated'];
  updateRelated?: IngestDependencies['updateRelated'];
  addBacklinks?: IngestDependencies['addBacklinks'];
}

interface IngestRuntime {
  client?: OpencodeClient;
  llmFallbackLimits?: Partial<LlmFallbackLimits>;
}

interface LlmFallbackLimits {
  maxFilesPerRun: number;
  maxFileBytes: number;
  maxOutputChars: number;
}

interface LlmFallbackBudget {
  remainingFiles: number;
}

interface LlmFallbackResult {
  success: boolean;
  method: 'llm-fallback';
  content?: string;
  message: string;
  executed: boolean;
  skipped: boolean;
}

const DEFAULT_LLM_FALLBACK_LIMITS: LlmFallbackLimits = {
  maxFilesPerRun: 3,
  maxFileBytes: 300_000,
  maxOutputChars: 24_000,
};

interface ExistingSourceMemoryRecord {
  filePath: string;
  sourcePath: string | null;
  sourceUnit: string | null;
  sourceLocator: string | null;
  sourceFingerprint: string | null;
  memoryType: string | null;
}

type SourceSplitBoundaryType = 'single' | 'heading' | 'horizontal-rule';

interface AmbiguousReviewEntry {
  timestamp: string;
  sourcePath: string;
  methodAttempted: SourceExtractionMethod;
  fallbackExecution: FallbackExecutionStatus;
  reasonCode:
    | 'ambiguous-source-unit-match'
    | 'ambiguous-fingerprint-match'
    | 'ambiguous-deterministic-target'
    | 'ambiguous-other';
  message: string;
  unitId?: string;
  boundaryType?: SourceSplitBoundaryType;
}

interface ExtractedContentUnit {
  unitId: string;
  boundaryType: SourceSplitBoundaryType;
  heading?: string;
  content: string;
}

const textFallbackExtensions = new Set([
  '.md',
  '.markdown',
  '.txt',
  '.jsonl',
  '.ndjson',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
  '.properties',
  '.csv',
  '.tsv',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.go',
  '.java',
  '.kt',
  '.sql',
  '.sh',
  '.xml',
  '.html',
  '.css',
  '.log',
  '.rst',
]);

const textFallbackBasenames = new Set([
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  'dockerfile',
  'makefile',
  'jenkinsfile',
  'compose.yaml',
  'compose.yml',
]);

const reviewArtifactRelativePath = path
  .join('.mnemonics', 'review', 'source-ingest-ambiguous.ndjson')
  .replace(/\\/g, '/');
const maxReviewArtifactLines = 500;
const trimReviewArtifactLinesTo = 400;

function isLikelyBinary(content: string): boolean {
  return content.includes('\u0000');
}

function normalizeUtfText(content: string): string {
  return content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

function normalizeLines(content: string): string {
  return content
    .split('\n')
    .map((line) => line.replace(/[\t ]+$/g, ''))
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n');
}

function decodeBasicEntities(content: string): string {
  return content
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripMarkupToText(content: string): string {
  return decodeBasicEntities(
    content
      .replace(/<script[\s\S]*?<\/script>/gi, '\n')
      .replace(/<style[\s\S]*?<\/style>/gi, '\n')
      .replace(/<!--[\s\S]*?-->/g, '\n')
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\s*\/?\s*(p|div|li|tr|h[1-6]|section|article)\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  );
}

function collapseRepeatedNeighborLines(content: string): string {
  const lines = content.split('\n');
  const output: string[] = [];
  let lastLine: string | null = null;
  let repeatCount = 0;

  for (const line of lines) {
    if (line === lastLine && line.trim().length > 0) {
      repeatCount += 1;
      if (repeatCount > 1) {
        continue;
      }
      output.push(line);
      continue;
    }

    lastLine = line;
    repeatCount = 0;
    output.push(line);
  }

  return output.join('\n');
}

type TextFallbackHeuristic =
  | 'plain'
  | 'json-pretty'
  | 'csv-tsv-normalized'
  | 'markup-to-text'
  | 'log-normalized'
  | 'code-config-normalized';

function resolveTextFallbackKind(sourcePath: string): {
  extension: string;
  basename: string;
} {
  return {
    extension: path.extname(sourcePath).toLowerCase(),
    basename: path.basename(sourcePath).toLowerCase(),
  };
}

function applyDeterministicTextHeuristics(
  sourcePath: string,
  content: string,
): {
  heuristic: TextFallbackHeuristic;
  content: string;
} {
  const kind = resolveTextFallbackKind(sourcePath);
  const normalized = normalizeLines(content);

  if (kind.extension === '.json') {
    try {
      const parsed = JSON.parse(normalized) as unknown;
      return {
        heuristic: 'json-pretty',
        content: `${JSON.stringify(parsed, null, 2)}\n`,
      };
    } catch {
      return {
        heuristic: 'code-config-normalized',
        content: normalized,
      };
    }
  }

  if (kind.extension === '.csv' || kind.extension === '.tsv') {
    return {
      heuristic: 'csv-tsv-normalized',
      content: normalizeLines(normalized),
    };
  }

  if (
    kind.extension === '.html' ||
    kind.extension === '.xml' ||
    kind.extension === '.svg'
  ) {
    const stripped = stripMarkupToText(normalized);
    if (stripped.length >= 120 && stripped.length >= normalized.length * 0.2) {
      return {
        heuristic: 'markup-to-text',
        content: normalizeLines(stripped),
      };
    }
  }

  if (kind.extension === '.log') {
    return {
      heuristic: 'log-normalized',
      content: collapseRepeatedNeighborLines(normalized),
    };
  }

  if (
    [
      '.yaml',
      '.yml',
      '.toml',
      '.ini',
      '.cfg',
      '.conf',
      '.properties',
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.mjs',
      '.cjs',
      '.py',
      '.go',
      '.java',
      '.kt',
      '.sql',
      '.sh',
      '.css',
      '.rst',
    ].includes(kind.extension) ||
    textFallbackBasenames.has(kind.basename)
  ) {
    return {
      heuristic: 'code-config-normalized',
      content: normalized,
    };
  }

  return {
    heuristic: 'plain',
    content: normalized,
  };
}

async function extractTextFallback(sourcePath: string): Promise<{
  success: boolean;
  method: 'text-fallback';
  content?: string;
  message: string;
}> {
  const kind = resolveTextFallbackKind(sourcePath);
  if (
    !textFallbackExtensions.has(kind.extension) &&
    !textFallbackBasenames.has(kind.basename)
  ) {
    return {
      success: false,
      method: 'text-fallback',
      message:
        'Text fallback extractor supports only known text file extensions.',
    };
  }

  try {
    const text = normalizeUtfText(
      await fs.promises.readFile(sourcePath, 'utf-8'),
    );
    if (text.trim().length === 0) {
      return {
        success: false,
        method: 'text-fallback',
        message: 'Text fallback extraction produced empty content.',
      };
    }

    if (isLikelyBinary(text)) {
      return {
        success: false,
        method: 'text-fallback',
        message: 'Text fallback extraction detected binary-like content.',
      };
    }

    const transformed = applyDeterministicTextHeuristics(sourcePath, text);
    const bounded = transformed.content.trim();
    if (bounded.length === 0) {
      return {
        success: false,
        method: 'text-fallback',
        message: 'Text fallback extraction became empty after normalization.',
      };
    }

    return {
      success: true,
      method: 'text-fallback',
      content: bounded,
      message: `Extracted with deterministic text fallback (${transformed.heuristic}).`,
    };
  } catch (error) {
    return {
      success: false,
      method: 'text-fallback',
      message: `Text fallback extraction failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function resolveLlmFallbackLimits(
  overrides?: Partial<LlmFallbackLimits>,
): LlmFallbackLimits {
  return {
    maxFilesPerRun:
      overrides?.maxFilesPerRun && overrides.maxFilesPerRun > 0
        ? Math.floor(overrides.maxFilesPerRun)
        : DEFAULT_LLM_FALLBACK_LIMITS.maxFilesPerRun,
    maxFileBytes:
      overrides?.maxFileBytes && overrides.maxFileBytes > 0
        ? Math.floor(overrides.maxFileBytes)
        : DEFAULT_LLM_FALLBACK_LIMITS.maxFileBytes,
    maxOutputChars:
      overrides?.maxOutputChars && overrides.maxOutputChars > 0
        ? Math.floor(overrides.maxOutputChars)
        : DEFAULT_LLM_FALLBACK_LIMITS.maxOutputChars,
  };
}

function pickAssistantText(parts: unknown[]): string {
  const text = parts
    .filter(
      (part): part is { type: 'text'; text: string } =>
        typeof part === 'object' &&
        part !== null &&
        'type' in part &&
        'text' in part &&
        (part as { type?: string }).type === 'text' &&
        typeof (part as { text?: unknown }).text === 'string',
    )
    .map((part) => part.text)
    .join('\n')
    .trim();

  return text;
}

function unwrapSingleMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```[\w-]*\n([\s\S]*?)\n```$/);
  return match?.[1]?.trim() ?? trimmed;
}

function unwrapWrappedQuotes(text: string): string {
  const trimmed = text.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

const leadingBoilerplatePatterns = [
  /^here(?:'s| is)\b/i,
  /^below is\b/i,
  /^i (?:have )?extracted\b/i,
  /^extracted (?:text|content)\b/i,
  /^output:?$/i,
  /^note:?$/i,
  /^sure[,.!]?$/i,
];

const trailingBoilerplatePatterns = [
  /^let me know\b/i,
  /^if you need\b/i,
  /^i can help\b/i,
  /^hope this helps\b/i,
  /^extraction complete\.?$/i,
  /^end of extracted text\.?$/i,
  /^confidence[:\s]/i,
];

function stripBoilerplateLine(line: string): string {
  return line
    .replace(
      /^here(?:'s| is)\s+(the\s+)?(?:cleaned\s+)?(?:extracted\s+)?(?:text|content)[:\s-]*/i,
      '',
    )
    .replace(/^extracted (?:text|content)[:\s-]*/i, '')
    .replace(/^source file[:\s-].*$/i, '')
    .trim();
}

function normalizeLlmFallbackOutput(
  content: string,
  maxOutputChars: number,
): string {
  const normalized = unwrapWrappedQuotes(unwrapSingleMarkdownFence(content))
    .replace(/\r\n/g, '\n')
    .trim();
  if (!normalized) {
    return '';
  }

  const lines = normalized
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .map(stripBoilerplateLine);

  while (lines.length > 0) {
    const first = lines[0]?.trim();
    if (!first) {
      lines.shift();
      continue;
    }
    if (
      first.startsWith('#') ||
      first.startsWith('- ') ||
      /^\d+\.\s/.test(first)
    ) {
      break;
    }
    if (leadingBoilerplatePatterns.some((pattern) => pattern.test(first))) {
      lines.shift();
      continue;
    }
    break;
  }

  while (lines.length > 0) {
    const last = lines[lines.length - 1]?.trim();
    if (!last) {
      lines.pop();
      continue;
    }
    if (trailingBoilerplatePatterns.some((pattern) => pattern.test(last))) {
      lines.pop();
      continue;
    }
    break;
  }

  const collapsed = lines
    .join('\n')
    .replace(/\n\s*[-=]{20,}\s*\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const postFence = collapseRepeatedNeighborLines(
    unwrapSingleMarkdownFence(collapsed),
  );
  if (!postFence) {
    return '';
  }

  if (postFence.length <= maxOutputChars) {
    return postFence;
  }

  return postFence.slice(0, maxOutputChars).trimEnd();
}

async function extractLlmFallback(params: {
  sourcePath: string;
  sourceRelativePath: string;
  reason: string;
  client?: OpencodeClient;
  toolContext?: ToolContext;
  limits: LlmFallbackLimits;
  budget: LlmFallbackBudget;
}): Promise<LlmFallbackResult> {
  if (!params.client || !params.toolContext) {
    return {
      success: false,
      method: 'llm-fallback',
      message:
        'LLM fallback skipped: no active OpenCode tool runtime context available.',
      executed: false,
      skipped: true,
    };
  }

  if (params.budget.remainingFiles <= 0) {
    return {
      success: false,
      method: 'llm-fallback',
      message: `LLM fallback skipped: run budget exceeded (max ${params.limits.maxFilesPerRun} files).`,
      executed: false,
      skipped: true,
    };
  }

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(params.sourcePath);
  } catch (error) {
    return {
      success: false,
      method: 'llm-fallback',
      message: `LLM fallback skipped: failed to stat source file: ${error instanceof Error ? error.message : String(error)}`,
      executed: false,
      skipped: true,
    };
  }

  if (stat.size > params.limits.maxFileBytes) {
    return {
      success: false,
      method: 'llm-fallback',
      message: `LLM fallback skipped: file size ${stat.size} bytes exceeds limit ${params.limits.maxFileBytes} bytes.`,
      executed: false,
      skipped: true,
    };
  }

  params.budget.remainingFiles -= 1;

  const systemPrompt = [
    'You are a strict extraction engine for one attached source file.',
    'Return only extracted content, not commentary or analysis.',
    'Never include framing text such as "Here is the extracted text".',
    'Preserve useful headings, lists, code blocks, and concrete facts.',
    'Prefer signal over noise by removing repeated navigation/legal chrome when obvious.',
    'Do not invent, infer, or summarize content that is not present in the file.',
    'Do not wrap output in code fences.',
    `Keep output under ${params.limits.maxOutputChars} characters.`,
    'If unreadable or non-textual, return an empty response.',
  ].join(' ');

  const userPrompt = [
    `Extract readable text from attached file: ${params.sourceRelativePath}`,
    `Extraction trigger: ${params.reason}`,
    'Output requirements:',
    '- Keep key headings and concrete facts with original wording.',
    '- Keep tables as plain lines if markdown table rendering is unclear.',
    '- Preserve code/config snippets when they carry key meaning.',
    '- Remove framing phrases and assistant meta text.',
    '- Return only cleaned extracted content.',
  ].join('\n');

  const response = await params.client.session.prompt({
    path: { id: params.toolContext.sessionID },
    query: { directory: params.toolContext.directory },
    body: {
      messageID: params.toolContext.messageID,
      noReply: false,
      tools: {},
      system: systemPrompt,
      parts: [
        {
          type: 'text',
          text: userPrompt,
        },
        {
          type: 'file',
          mime: 'application/octet-stream',
          filename: path.basename(params.sourcePath),
          url: `file://${params.sourcePath}`,
        },
      ],
    },
  });

  if (response.error || !response.data) {
    return {
      success: false,
      method: 'llm-fallback',
      message: `LLM fallback failed: ${response.error ? JSON.stringify(response.error) : 'empty response'}`,
      executed: true,
      skipped: false,
    };
  }

  const extracted = pickAssistantText(response.data.parts);

  if (!extracted) {
    return {
      success: false,
      method: 'llm-fallback',
      message: 'LLM fallback returned no extractable text.',
      executed: true,
      skipped: false,
    };
  }

  const bounded = normalizeLlmFallbackOutput(
    extracted,
    params.limits.maxOutputChars,
  );
  if (!bounded) {
    return {
      success: false,
      method: 'llm-fallback',
      message: 'LLM fallback output became empty after normalization.',
      executed: true,
      skipped: false,
    };
  }

  return {
    success: true,
    method: 'llm-fallback',
    content: bounded,
    message: 'Extracted with LLM fallback.',
    executed: true,
    skipped: false,
  };
}

const defaultDependencies = {
  preflight: preflightMarkitdown,
  convert: convertFileWithMarkitdown,
  extractFallback: extractTextFallback,
  extractLlmFallback,
  appendLog: appendToLog,
  findRelated: findRelatedMemories,
  updateRelated: updateRelatedField,
  addBacklinks,
};

function formatSourceIngestSummaryLog(
  summary: SourcePathIngestResult['summary'],
): string {
  return (
    `source-path ingest: ${summary.filesProcessed}/${summary.filesDiscovered} processed; ` +
    `created=${summary.created}, updated=${summary.updated}, skipped=${summary.skipped}, failed=${summary.failed}, ` +
    `fallback=${summary.fallbackUsed}, llm_executed=${summary.llmFallbackExecuted}, llm_skipped=${summary.llmFallbackSkipped}, ` +
    `units_created=${summary.memoryUnitsCreated}, units_updated=${summary.memoryUnitsUpdated}, units_skipped=${summary.memoryUnitsSkipped}, units_failed=${summary.memoryUnitsFailed}`
  );
}

async function appendSourceIngestRunLog(params: {
  projectRoot: string;
  summary: SourcePathIngestResult['summary'];
  dependencies: IngestDependencies;
  logger: Logger;
}): Promise<void> {
  try {
    await params.dependencies.appendLog(params.projectRoot, {
      action: 'ingest',
      summary: formatSourceIngestSummaryLog(params.summary),
    });
  } catch (error) {
    params.logger.warn(
      `Ingest run log append failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function classifyAmbiguityReasonCode(
  message: string,
): AmbiguousReviewEntry['reasonCode'] {
  if (message.includes('source_path + source_unit')) {
    return 'ambiguous-source-unit-match';
  }
  if (message.includes('source_fingerprint')) {
    return 'ambiguous-fingerprint-match';
  }
  if (message.includes('deterministic target exists')) {
    return 'ambiguous-deterministic-target';
  }
  return 'ambiguous-other';
}

function collectAmbiguousReviewEntries(
  files: SourceFileIngestResult[],
): AmbiguousReviewEntry[] {
  const timestamp = new Date().toISOString();
  const entries: AmbiguousReviewEntry[] = [];

  for (const file of files) {
    for (const unit of file.memories ?? []) {
      if (
        unit.status !== 'skipped' ||
        !unit.message.toLowerCase().includes('ambigu')
      ) {
        continue;
      }
      entries.push({
        timestamp,
        sourcePath: unit.sourceRelativePath,
        unitId: unit.unitId,
        boundaryType: unit.boundaryType,
        methodAttempted: file.methodAttempted,
        fallbackExecution: file.fallbackExecution,
        reasonCode: classifyAmbiguityReasonCode(unit.message),
        message: unit.message,
      });
    }

    if (
      file.status === 'skipped' &&
      (!file.memories || file.memories.length === 0) &&
      file.message.toLowerCase().includes('ambigu')
    ) {
      entries.push({
        timestamp,
        sourcePath: file.sourcePath,
        methodAttempted: file.methodAttempted,
        fallbackExecution: file.fallbackExecution,
        reasonCode: classifyAmbiguityReasonCode(file.message),
        message: file.message,
      });
    }
  }

  return entries;
}

async function appendAmbiguousReviewArtifact(params: {
  projectRoot: string;
  files: SourceFileIngestResult[];
  logger: Logger;
}): Promise<
  | {
      path: string;
      entriesWritten: number;
      totalEntries: number;
    }
  | undefined
> {
  const entries = collectAmbiguousReviewEntries(params.files);
  if (entries.length === 0) {
    return undefined;
  }

  const artifactPath = path.join(
    params.projectRoot,
    reviewArtifactRelativePath,
  );
  const artifactDir = path.dirname(artifactPath);

  try {
    await fs.promises.mkdir(artifactDir, { recursive: true });
    const existing = fs.existsSync(artifactPath)
      ? await fs.promises.readFile(artifactPath, 'utf-8')
      : '';
    const existingLines = existing
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const nextLines = [
      ...existingLines,
      ...entries.map((entry) => JSON.stringify(entry)),
    ];
    const bounded =
      nextLines.length > maxReviewArtifactLines
        ? nextLines.slice(-trimReviewArtifactLinesTo)
        : nextLines;

    await fs.promises.writeFile(
      artifactPath,
      `${bounded.join('\n')}\n`,
      'utf-8',
    );

    return {
      path: reviewArtifactRelativePath,
      entriesWritten: entries.length,
      totalEntries: bounded.length,
    };
  } catch (error) {
    params.logger.warn(
      `Failed to append ambiguous review artifact: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
}

async function enrichRelatedForPersistedMemories(params: {
  files: SourceFileIngestResult[];
  projectRoot: string;
  logger: Logger;
  dependencies: IngestDependencies;
}): Promise<void> {
  for (const fileResult of params.files) {
    const persistedFilePaths = new Set<string>();
    for (const unit of fileResult.memories ?? []) {
      if (
        (unit.status === 'created' || unit.status === 'updated') &&
        unit.filePath
      ) {
        persistedFilePaths.add(unit.filePath);
      }
    }
    if (
      persistedFilePaths.size === 0 &&
      (fileResult.status === 'created' || fileResult.status === 'updated') &&
      fileResult.memory?.filePath
    ) {
      persistedFilePaths.add(fileResult.memory.filePath);
    }

    for (const filePath of persistedFilePaths) {
      try {
        const related = await params.dependencies.findRelated(
          filePath,
          params.projectRoot,
          params.logger,
          {
            maxRelated: 3,
            minScore: 0.45,
          },
        );

        if (related.length === 0) {
          continue;
        }

        await Promise.all([
          params.dependencies.updateRelated(
            filePath,
            related,
            params.projectRoot,
            params.logger,
          ),
          params.dependencies.addBacklinks(
            filePath,
            related,
            params.projectRoot,
            params.logger,
          ),
        ]);
      } catch (error) {
        params.logger.warn(
          `Post-persist related enrichment failed for ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}

function extractSourcePathMetadata(content: string): string | null {
  const match = content.match(/^- source_path: (.+)$/m);
  return match?.[1] ?? null;
}

function extractSourceUnitMetadata(content: string): string | null {
  const match = content.match(/^- source_unit: (.+)$/m);
  return match?.[1] ?? null;
}

function extractSourceLocatorMetadata(content: string): string | null {
  const match = content.match(/^- source_locator: (.+)$/m);
  return match?.[1] ?? null;
}

function extractSourceFingerprintMetadata(content: string): string | null {
  const match = content.match(/^- source_fingerprint: ([a-f0-9]{64})$/m);
  return match?.[1] ?? null;
}

function normalizeContentForFingerprint(content: string): string {
  return content.replace(/\r\n/g, '\n').trim();
}

function buildSourceFingerprint(extractedContent: string): string {
  return crypto
    .createHash('sha256')
    .update(normalizeContentForFingerprint(extractedContent))
    .digest('hex');
}

function slugifyHeading(heading: string): string {
  const kebab = toKebabCase(heading)
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return kebab || 'section';
}

const MIN_SPLIT_UNIT_CHARS = 200;
const MAX_SPLIT_UNITS = 6;

function splitByStrongHeadings(content: string): ExtractedContentUnit[] | null {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const headingIndexes: Array<{ index: number; heading: string }> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? '';
    const match = line.match(/^##\s+(.{3,})$/);
    if (!match) {
      continue;
    }
    headingIndexes.push({ index, heading: match[1].trim() });
  }

  if (headingIndexes.length < 2 || headingIndexes.length > MAX_SPLIT_UNITS) {
    return null;
  }

  const units = headingIndexes
    .map((current, idx) => {
      const nextIndex = headingIndexes[idx + 1]?.index ?? lines.length;
      const contentSlice = lines
        .slice(current.index, nextIndex)
        .join('\n')
        .trim();
      return {
        unitId: `u${String(idx + 1).padStart(2, '0')}`,
        boundaryType: 'heading' as const,
        heading: current.heading,
        content: contentSlice,
      };
    })
    .filter((unit) => unit.content.length > 0);

  if (
    units.length < 2 ||
    units.some((unit) => unit.content.length < MIN_SPLIT_UNIT_CHARS)
  ) {
    return null;
  }

  return units;
}

function splitByHorizontalRules(
  content: string,
): ExtractedContentUnit[] | null {
  const normalized = content.replace(/\r\n/g, '\n');
  const separatorCount = normalized.match(/^-{3,}\s*$/gm)?.length ?? 0;
  if (separatorCount < 2) {
    return null;
  }

  const rawSections = normalized
    .split(/\n-{3,}\s*\n/g)
    .map((section) => section.trim())
    .filter((section) => section.length > 0);

  if (rawSections.length < 2 || rawSections.length > MAX_SPLIT_UNITS) {
    return null;
  }

  const hasStructure = (section: string): boolean =>
    /^#{1,6}\s+/m.test(section) ||
    /^-\s+/m.test(section) ||
    /^\d+\.\s+/m.test(section) ||
    /^[A-Z][A-Za-z0-9 _-]{2,40}:\s+/m.test(section);

  if (
    rawSections.some((section) => section.length < MIN_SPLIT_UNIT_CHARS) ||
    rawSections.filter((section) => hasStructure(section)).length !==
      rawSections.length
  ) {
    return null;
  }

  return rawSections.map((section, idx) => ({
    unitId: `u${String(idx + 1).padStart(2, '0')}`,
    boundaryType: 'horizontal-rule',
    heading: `section ${idx + 1}`,
    content: section,
  }));
}

function splitExtractedContentConservatively(
  content: string,
): ExtractedContentUnit[] {
  const normalized = content.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const headingSplit = splitByStrongHeadings(normalized);
  if (headingSplit) {
    return headingSplit;
  }

  const horizontalRuleSplit = splitByHorizontalRules(normalized);
  if (horizontalRuleSplit) {
    return horizontalRuleSplit;
  }

  return [
    {
      unitId: 'u01',
      boundaryType: 'single',
      heading: undefined,
      content: normalized,
    },
  ];
}

function scoreTypeSignal(
  pattern: RegExp,
  input: string,
  score: number,
): number {
  return pattern.test(input) ? score : 0;
}

function getAllowedMemoryTypeNames(config: PluginConfig): Set<string> {
  const builtIn = getBuiltinMemoryTypes().map((type) => toKebabCase(type.name));
  const custom = (config.memoryTypes ?? []).map((type) =>
    toKebabCase(type.name),
  );
  return new Set([...builtIn, ...custom]);
}

function inferMemoryType(params: {
  sourceRelativePath: string;
  extractedContent: string;
  sourceType?: string;
  context?: string;
  config: PluginConfig;
}): string {
  const allowedTypes = getAllowedMemoryTypeNames(params.config);
  const fallbackType = allowedTypes.has('context')
    ? 'context'
    : (Array.from(allowedTypes)[0] ?? 'context');

  const sourceTypeCandidate = params.sourceType
    ? toKebabCase(params.sourceType)
    : null;
  if (sourceTypeCandidate && allowedTypes.has(sourceTypeCandidate)) {
    return sourceTypeCandidate;
  }

  const pathText = params.sourceRelativePath.replace(/\\/g, '/').toLowerCase();
  const contentText = params.extractedContent.toLowerCase();
  const contextText = (params.context ?? '').toLowerCase();
  const combined = `${pathText}\n${contextText}\n${contentText}`;

  const scores = new Map<string, number>();
  const addScore = (memoryType: string, value: number) => {
    if (!allowedTypes.has(memoryType) || value <= 0) {
      return;
    }
    scores.set(memoryType, (scores.get(memoryType) ?? 0) + value);
  };

  addScore(
    'architectural-decision',
    scoreTypeSignal(
      /(\/adr\/|architecture|system-design|decision-record|rfc|architecture decision)/,
      combined,
      5,
    ) +
      scoreTypeSignal(
        /\btrade[- ]?off\b|\brationale\b|\bwe decided\b/,
        combined,
        2,
      ),
  );

  addScore(
    'design-decision',
    scoreTypeSignal(
      /\b(ui|ux|wireframe|figma|mockup|design review)\b/,
      combined,
      5,
    ),
  );

  addScore(
    'issue',
    scoreTypeSignal(
      /\b(bug|incident|outage|error|stack trace|regression|failing|failure|root cause)\b/,
      combined,
      5,
    ),
  );

  addScore(
    'learning',
    scoreTypeSignal(
      /\b(lesson learned|learned that|retrospective|postmortem|takeaway|insight)\b/,
      combined,
      5,
    ),
  );

  addScore(
    'user-preference',
    scoreTypeSignal(
      /\b(i prefer|user prefers|my preference|i like|my workflow)\b/,
      combined,
      5,
    ),
  );

  addScore(
    'project-preference',
    scoreTypeSignal(
      /\b(team prefers|project preference|repository convention|repo convention|standard for this project)\b/,
      combined,
      5,
    ),
  );

  addScore(
    'recurring-pattern',
    scoreTypeSignal(
      /\b(repeatedly|recurring|common pattern|we usually|pattern observed)\b/,
      combined,
      5,
    ),
  );

  addScore(
    'conventions-pattern',
    scoreTypeSignal(
      /\b(coding standard|style guide|lint rule|naming convention|convention)\b/,
      combined,
      5,
    ),
  );

  if (scores.size === 0) {
    return fallbackType;
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const best = ranked[0];
  const second = ranked[1];

  if (!best) {
    return fallbackType;
  }

  const bestScore = best[1];
  const secondScore = second?.[1] ?? 0;

  if (bestScore >= 5 && bestScore - secondScore >= 2) {
    return best[0];
  }

  return fallbackType;
}

function buildSourceMemoryTitle(params: {
  sourceRelativePath: string;
  unitId: string;
  heading?: string;
}): string {
  const sourceRelativePath = params.sourceRelativePath;
  const normalizedPath = sourceRelativePath.replace(/\\/g, '/');
  const baseName = normalizedPath
    .replace(/\.[^/.]+$/, '')
    .replace(/[/]+/g, ' ')
    .trim();
  const headingSuffix = params.heading
    ? ` ${slugifyHeading(params.heading)}`
    : '';
  const stableHash = crypto
    .createHash('sha1')
    .update(`${normalizedPath}::${params.unitId}`)
    .digest('hex')
    .slice(0, 8);
  return `source ingest ${baseName}${headingSuffix} ${stableHash}`;
}

function buildSourceMemoryContent(params: {
  sourceRelativePath: string;
  sourceUnit: string;
  sourceLocator: string;
  sourceFingerprint: string;
  extractionMethod: SourceExtractionMethod;
  fallbackUsed: boolean;
  extractedContent: string;
}): string {
  const normalizedPath = params.sourceRelativePath.replace(/\\/g, '/');
  return [
    '# Source Ingest Record',
    '',
    `- source_path: ${normalizedPath}`,
    `- source_unit: ${params.sourceUnit}`,
    `- source_locator: ${params.sourceLocator}`,
    `- source_fingerprint: ${params.sourceFingerprint}`,
    `- extraction_method: ${params.extractionMethod}`,
    `- fallback_used: ${params.fallbackUsed ? 'yes' : 'no'}`,
    '',
    '## Extracted Content',
    '',
    params.extractedContent.trim(),
  ].join('\n');
}

function buildSourceMemoryPath(
  projectRoot: string,
  memoryType: string,
  title: string,
): string {
  const filename = generateFilename(title);
  return path.join(getProjectMemoryPath(projectRoot), memoryType, filename);
}

function buildSourceLocator(params: {
  sourceRelativePath: string;
  unit: ExtractedContentUnit;
}): string {
  const base = params.sourceRelativePath.replace(/\\/g, '/');
  const headingPart = params.unit.heading
    ? `:${slugifyHeading(params.unit.heading)}`
    : '';
  return `${base}#${params.unit.unitId}${headingPart}`;
}

function deriveFileStatusFromUnitStatuses(
  units: SourceFileIngestResult['memories'],
): SourceMemoryAction {
  const statuses = units?.map((unit) => unit.status) ?? [];
  if (statuses.length === 0) {
    return 'failed';
  }
  if (statuses.every((status) => status === 'created')) {
    return 'created';
  }
  if (statuses.every((status) => status === 'updated')) {
    return 'updated';
  }
  if (statuses.some((status) => status === 'failed')) {
    return 'failed';
  }
  if (statuses.some((status) => status === 'created')) {
    return 'created';
  }
  if (statuses.some((status) => status === 'updated')) {
    return 'updated';
  }
  return 'skipped';
}

function buildSourceSummary(
  configuredPatterns: string[],
  filesDiscovered: number,
  files: SourceFileIngestResult[],
): SourcePathIngestResult['summary'] {
  const created = files.filter((file) => file.status === 'created').length;
  const updated = files.filter((file) => file.status === 'updated').length;
  const skipped = files.filter((file) => file.status === 'skipped').length;
  const failed = files.filter((file) => file.status === 'failed').length;
  const fallbackUsed = files.filter((file) => file.fallbackUsed).length;
  const llmFallbackExecuted = files.filter(
    (file) => file.fallbackExecution === 'llm-executed',
  ).length;
  const llmFallbackSkipped = files.filter(
    (file) => file.fallbackExecution === 'llm-skipped',
  ).length;
  const memoryUnits = files.flatMap((file) => file.memories ?? []);
  const memoryUnitsCreated = memoryUnits.filter(
    (unit) => unit.status === 'created',
  ).length;
  const memoryUnitsUpdated = memoryUnits.filter(
    (unit) => unit.status === 'updated',
  ).length;
  const memoryUnitsSkipped = memoryUnits.filter(
    (unit) => unit.status === 'skipped',
  ).length;
  const memoryUnitsFailed = memoryUnits.filter(
    (unit) => unit.status === 'failed',
  ).length;
  const memoryUnitsPersisted = memoryUnitsCreated + memoryUnitsUpdated;

  return {
    configuredPatterns,
    filesDiscovered,
    filesProcessed: files.length,
    created,
    updated,
    skipped,
    failed,
    fallbackUsed,
    llmFallbackExecuted,
    llmFallbackSkipped,
    memoryUnitsCreated,
    memoryUnitsUpdated,
    memoryUnitsSkipped,
    memoryUnitsFailed,
    memoryUnitsPersisted,
  };
}

async function listMarkdownFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          return listMarkdownFiles(fullPath);
        }
        return entry.isFile() && entry.name.endsWith('.md') ? [fullPath] : [];
      }),
    );
    return files.flat();
  } catch {
    return [];
  }
}

async function findExistingSourceMemories(
  projectRoot: string,
): Promise<ExistingSourceMemoryRecord[]> {
  const memoryRoot = getProjectMemoryPath(projectRoot);
  const files = await listMarkdownFiles(memoryRoot);
  const records = await Promise.all(
    files.map(async (filePath) => {
      try {
        const parsed = await parseMemoryFile(filePath);
        const sourcePath = extractSourcePathMetadata(parsed.content);
        const sourceUnit = extractSourceUnitMetadata(parsed.content);
        const sourceLocator = extractSourceLocatorMetadata(parsed.content);
        const sourceFingerprint = extractSourceFingerprintMetadata(
          parsed.content,
        );
        if (!sourcePath && !sourceFingerprint) {
          return null;
        }
        return {
          filePath,
          sourcePath,
          sourceUnit,
          sourceLocator,
          sourceFingerprint,
          memoryType:
            typeof parsed.data.memory_type === 'string'
              ? parsed.data.memory_type
              : null,
        } satisfies ExistingSourceMemoryRecord;
      } catch {
        return null;
      }
    }),
  );
  return records.filter(
    (record): record is ExistingSourceMemoryRecord => record !== null,
  );
}

async function persistExtractedMemory(params: {
  sourcePath: string;
  sourceRelativePath: string;
  extractedContent: string;
  extractionMethod: SourceExtractionMethod;
  fallbackUsed: boolean;
  fallbackExecution: FallbackExecutionStatus;
  projectRoot: string;
  config: PluginConfig;
  sourceType?: string;
  context?: string;
  remember: IngestDependencies['remember'];
}): Promise<SourceFileIngestResult> {
  const extractedUnits = splitExtractedContentConservatively(
    params.extractedContent,
  );
  if (extractedUnits.length === 0) {
    return {
      sourcePath: params.sourcePath,
      methodAttempted: params.extractionMethod,
      status: 'failed',
      outcome: 'failed',
      message:
        'Persistence failed: extraction produced no usable content unit.',
      extractionChars: params.extractedContent.length,
      fallbackUsed: params.fallbackUsed,
      fallbackExecution: params.fallbackExecution,
      extractionError:
        'No extractable content units found after normalization.',
    };
  }

  const inferredMemoryType = inferMemoryType({
    sourceRelativePath: params.sourceRelativePath,
    extractedContent: params.extractedContent,
    sourceType: params.sourceType,
    context: params.context,
    config: params.config,
  });
  const existingSourceMemories = await findExistingSourceMemories(
    params.projectRoot,
  );

  const unitResults: NonNullable<SourceFileIngestResult['memories']> = [];

  for (const unit of extractedUnits) {
    const sourceFingerprint = buildSourceFingerprint(unit.content);
    const sourceLocator = buildSourceLocator({
      sourceRelativePath: params.sourceRelativePath,
      unit,
    });
    const title = buildSourceMemoryTitle({
      sourceRelativePath: params.sourceRelativePath,
      unitId: unit.unitId,
      heading: unit.heading,
    });
    const deterministicFilePath = buildSourceMemoryPath(
      params.projectRoot,
      inferredMemoryType,
      title,
    );

    const sourcePathMatches = existingSourceMemories.filter((record) => {
      if (record.sourcePath !== params.sourceRelativePath) {
        return false;
      }
      if (record.sourceUnit === unit.unitId) {
        return true;
      }
      return extractedUnits.length === 1 && record.sourceUnit === null;
    });
    const fingerprintMatches = existingSourceMemories.filter(
      (record) => record.sourceFingerprint === sourceFingerprint,
    );

    if (sourcePathMatches.length > 1) {
      unitResults.push({
        unitId: unit.unitId,
        boundaryType: unit.boundaryType,
        title,
        memoryType: inferredMemoryType,
        status: 'skipped',
        message:
          'Skipped due to ambiguity: multiple existing memories share the same source_path + source_unit marker.',
        sourceRelativePath: params.sourceRelativePath,
      });
      continue;
    }

    if (fingerprintMatches.length > 1) {
      unitResults.push({
        unitId: unit.unitId,
        boundaryType: unit.boundaryType,
        title,
        memoryType: inferredMemoryType,
        status: 'skipped',
        message:
          'Skipped due to ambiguity: multiple existing memories share the same source_fingerprint marker.',
        sourceRelativePath: params.sourceRelativePath,
      });
      continue;
    }

    const sourcePathMatch = sourcePathMatches[0];
    const fingerprintMatch = fingerprintMatches[0];

    let targetFilePath: string | undefined;
    let targetMemoryType = inferredMemoryType;

    if (sourcePathMatch) {
      targetFilePath = sourcePathMatch.filePath;
      if (sourcePathMatch.memoryType) {
        targetMemoryType = sourcePathMatch.memoryType;
      }
    } else if (fingerprintMatch) {
      targetFilePath = fingerprintMatch.filePath;
      if (fingerprintMatch.memoryType) {
        targetMemoryType = fingerprintMatch.memoryType;
      }
    }

    if (!targetFilePath && fs.existsSync(deterministicFilePath)) {
      const existing = await parseMemoryFile(deterministicFilePath);
      const existingSourcePath = extractSourcePathMetadata(existing.content);
      const existingSourceUnit = extractSourceUnitMetadata(existing.content);
      if (
        existingSourcePath !== params.sourceRelativePath ||
        existingSourceUnit !== unit.unitId
      ) {
        unitResults.push({
          unitId: unit.unitId,
          boundaryType: unit.boundaryType,
          title,
          memoryType: inferredMemoryType,
          status: 'skipped',
          message:
            'Skipped due to ambiguity: deterministic target exists with a different source_path/source_unit marker.',
          sourceRelativePath: params.sourceRelativePath,
        });
        continue;
      }
      targetFilePath = deterministicFilePath;
      if (typeof existing.data.memory_type === 'string') {
        targetMemoryType = existing.data.memory_type;
      }
    }

    const content = buildSourceMemoryContent({
      sourceRelativePath: params.sourceRelativePath,
      sourceUnit: unit.unitId,
      sourceLocator,
      sourceFingerprint,
      extractionMethod: params.extractionMethod,
      fallbackUsed: params.fallbackUsed,
      extractedContent: unit.content,
    });

    const tags = [
      'source-ingest',
      'source-path-mode',
      params.extractionMethod,
      `split-boundary-${unit.boundaryType}`,
      ...(params.sourceType ? [`source-type-${params.sourceType}`] : []),
      ...(params.context ? ['has-context'] : []),
    ];

    try {
      const rememberResult = await params.remember({
        title,
        content,
        memoryType: targetMemoryType,
        tags,
        filePath: targetFilePath,
      });

      const status: SourceMemoryAction = rememberResult.isUpdate
        ? 'updated'
        : 'created';

      unitResults.push({
        unitId: unit.unitId,
        boundaryType: unit.boundaryType,
        title,
        memoryType: targetMemoryType,
        status,
        message:
          status === 'updated'
            ? 'Updated persisted unit successfully.'
            : 'Created persisted unit successfully.',
        filePath: rememberResult.filePath,
        sourceRelativePath: params.sourceRelativePath,
      });

      const existingRecordIndex = existingSourceMemories.findIndex(
        (record) =>
          record.sourcePath === params.sourceRelativePath &&
          record.sourceUnit === unit.unitId,
      );
      const nextRecord: ExistingSourceMemoryRecord = {
        filePath: rememberResult.filePath,
        sourcePath: params.sourceRelativePath,
        sourceUnit: unit.unitId,
        sourceLocator,
        sourceFingerprint,
        memoryType: targetMemoryType,
      };
      if (existingRecordIndex >= 0) {
        existingSourceMemories[existingRecordIndex] = nextRecord;
      } else {
        existingSourceMemories.push(nextRecord);
      }
    } catch (error) {
      unitResults.push({
        unitId: unit.unitId,
        boundaryType: unit.boundaryType,
        title,
        memoryType: targetMemoryType,
        status: 'failed',
        message: `Persistence failed: ${error instanceof Error ? error.message : String(error)}`,
        filePath: targetFilePath ?? deterministicFilePath,
        sourceRelativePath: params.sourceRelativePath,
      });
    }
  }

  const status = deriveFileStatusFromUnitStatuses(unitResults);
  const persistedUnits = unitResults.filter(
    (unit) => unit.status === 'created' || unit.status === 'updated',
  );
  const primaryMemory =
    persistedUnits[0] ?? unitResults.find((unit) => unit.status !== 'failed');

  const messageBase =
    params.extractionMethod === 'markitdown'
      ? 'Converted and persisted successfully with MarkItDown.'
      : params.extractionMethod === 'llm-fallback'
        ? 'Persisted memory via LLM fallback extraction.'
        : 'Persisted memory via deterministic text fallback extraction.';

  const message =
    extractedUnits.length > 1
      ? `${messageBase} Units: ${persistedUnits.length}/${extractedUnits.length} persisted.`
      : messageBase;

  const firstFailure = unitResults.find((unit) => unit.status === 'failed');

  return {
    sourcePath: params.sourcePath,
    methodAttempted: params.extractionMethod,
    status,
    outcome: status,
    message,
    memory: primaryMemory
      ? {
          unitId: primaryMemory.unitId,
          boundaryType: primaryMemory.boundaryType,
          title: primaryMemory.title,
          memoryType: primaryMemory.memoryType,
          filePath: primaryMemory.filePath,
          sourceRelativePath: params.sourceRelativePath,
        }
      : undefined,
    memories: unitResults,
    extractionChars: params.extractedContent.length,
    fallbackUsed: params.fallbackUsed,
    fallbackExecution: params.fallbackExecution,
    persistenceError: firstFailure?.message,
  };
}

async function fallbackAndPersist(params: {
  sourcePath: string;
  failureReason:
    | MarkitdownFailureReason
    | 'preflight-failed'
    | 'execution-failure';
  message: string;
  projectRoot: string;
  config: PluginConfig;
  sourceType?: string;
  context?: string;
  dependencies: IngestDependencies;
  runtime: IngestRuntime;
  toolContext?: ToolContext;
  llmBudget: LlmFallbackBudget;
}): Promise<SourceFileIngestResult> {
  const sourceRelativePath = path.relative(
    params.projectRoot,
    params.sourcePath,
  );
  const fallbackResult = await params.dependencies.extractFallback(
    params.sourcePath,
  );

  const llmLimits = resolveLlmFallbackLimits(params.runtime.llmFallbackLimits);

  if (!fallbackResult.success || !fallbackResult.content) {
    const llmResult = await params.dependencies.extractLlmFallback({
      sourcePath: params.sourcePath,
      sourceRelativePath,
      reason: `${params.failureReason}: ${params.message}`,
      client: params.runtime.client,
      toolContext: params.toolContext,
      limits: llmLimits,
      budget: params.llmBudget,
    });

    if (llmResult.success && llmResult.content) {
      return persistExtractedMemory({
        sourcePath: params.sourcePath,
        sourceRelativePath,
        extractedContent: llmResult.content,
        extractionMethod: 'llm-fallback',
        fallbackUsed: true,
        fallbackExecution: 'llm-executed',
        projectRoot: params.projectRoot,
        config: params.config,
        sourceType: params.sourceType,
        context: params.context,
        remember: params.dependencies.remember,
      });
    }

    return {
      sourcePath: params.sourcePath,
      methodAttempted: llmResult.executed ? 'llm-fallback' : 'none',
      status: 'failed',
      outcome: params.failureReason,
      message: `${params.message} ${fallbackResult.message} ${llmResult.message}`,
      fallbackUsed: false,
      fallbackExecution: llmResult.executed
        ? 'llm-executed'
        : llmResult.skipped
          ? 'llm-skipped'
          : 'none',
      extractionError: llmResult.executed
        ? `LLM fallback execution failed: ${llmResult.message}`
        : `Fallback extraction boundary reached: ${llmResult.message}`,
    };
  }

  return persistExtractedMemory({
    sourcePath: params.sourcePath,
    sourceRelativePath,
    extractedContent: fallbackResult.content,
    extractionMethod: 'text-fallback',
    fallbackUsed: true,
    fallbackExecution: 'deterministic',
    projectRoot: params.projectRoot,
    config: params.config,
    sourceType: params.sourceType,
    context: params.context,
    remember: params.dependencies.remember,
  });
}

async function processConvertedFile(params: {
  result: MarkitdownConvertResult;
  projectRoot: string;
  config: PluginConfig;
  sourceType?: string;
  context?: string;
  dependencies: IngestDependencies;
  runtime: IngestRuntime;
  toolContext?: ToolContext;
  llmBudget: LlmFallbackBudget;
}): Promise<SourceFileIngestResult> {
  if (!params.result.success) {
    return fallbackAndPersist({
      sourcePath: params.result.inputPath,
      failureReason: params.result.reason,
      message: params.result.message,
      projectRoot: params.projectRoot,
      config: params.config,
      sourceType: params.sourceType,
      context: params.context,
      dependencies: params.dependencies,
      runtime: params.runtime,
      toolContext: params.toolContext,
      llmBudget: params.llmBudget,
    });
  }

  const sourceRelativePath = path.relative(
    params.projectRoot,
    params.result.inputPath,
  );

  return persistExtractedMemory({
    sourcePath: params.result.inputPath,
    sourceRelativePath,
    extractedContent: params.result.markdown,
    extractionMethod: 'markitdown',
    fallbackUsed: false,
    fallbackExecution: 'not-needed',
    projectRoot: params.projectRoot,
    config: params.config,
    sourceType: params.sourceType,
    context: params.context,
    remember: params.dependencies.remember,
  });
}

export type MemoryIngestResult = ContentIngestResult | SourcePathIngestResult;

export function createIngestTool(
  config: PluginConfig,
  projectRoot: string,
  logger: Logger,
  providedDependencies: PartialIngestDependencies = {},
  runtime: IngestRuntime = {},
) {
  const dependencies: IngestDependencies = {
    preflight: providedDependencies.preflight ?? defaultDependencies.preflight,
    convert: providedDependencies.convert ?? defaultDependencies.convert,
    extractFallback:
      providedDependencies.extractFallback ??
      defaultDependencies.extractFallback,
    extractLlmFallback:
      providedDependencies.extractLlmFallback ??
      defaultDependencies.extractLlmFallback,
    remember:
      providedDependencies.remember ??
      createRememberTool(config, projectRoot, logger).handler,
    appendLog: providedDependencies.appendLog ?? defaultDependencies.appendLog,
    findRelated:
      providedDependencies.findRelated ?? defaultDependencies.findRelated,
    updateRelated:
      providedDependencies.updateRelated ?? defaultDependencies.updateRelated,
    addBacklinks:
      providedDependencies.addBacklinks ?? defaultDependencies.addBacklinks,
  };

  let updateIndexTimer: ReturnType<typeof setTimeout> | null = null;
  const debouncedUpdateIndex = (options: QmdOptions) => {
    if (updateIndexTimer !== null) {
      clearTimeout(updateIndexTimer);
    }
    updateIndexTimer = setTimeout(() => {
      updateIndexTimer = null;
      updateIndex(options).catch((err: unknown) =>
        logger.warn(
          `Background index update failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }, 500);
  };

  return {
    name: 'memory_ingest',
    description:
      'Ingest source content and persist deterministic memories automatically in source-path mode; content mode returns orchestration instructions.',
    parameters: {
      content: z
        .string()
        .optional()
        .describe('Source content to ingest and decompose into memories'),
      sourceType: z
        .string()
        .optional()
        .describe(
          'Type of source: conversation, document, code-review, meeting-notes, etc.',
        ),
      context: z
        .string()
        .optional()
        .describe('Additional context about the source'),
    },
    handler: async (
      {
        content,
        sourceType,
        context,
      }: {
        content?: string;
        sourceType?: string;
        context?: string;
      },
      toolContext?: ToolContext,
    ): Promise<MemoryIngestResult> => {
      const trimmedContent = content?.trim() ?? '';
      const configuredPatterns = config.sourcePaths ?? [];
      const llmBudget: LlmFallbackBudget = {
        remainingFiles: resolveLlmFallbackLimits(runtime.llmFallbackLimits)
          .maxFilesPerRun,
      };
      const sourceFiles = resolveSourcePathsToFiles(
        config.sourcePaths,
        projectRoot,
      );

      if (trimmedContent.length === 0 && configuredPatterns.length === 0) {
        const files: SourceFileIngestResult[] = [];
        const summary = buildSourceSummary(configuredPatterns, 0, files);
        await appendSourceIngestRunLog({
          projectRoot,
          summary,
          dependencies,
          logger,
        });
        return {
          success: true,
          mode: 'source-paths',
          message: 'No sourcePaths configured; nothing to ingest.',
          files,
          summary,
        };
      }

      if (trimmedContent.length === 0) {
        if (sourceFiles.length === 0) {
          const files: SourceFileIngestResult[] = [];
          const summary = buildSourceSummary(configuredPatterns, 0, files);
          await appendSourceIngestRunLog({
            projectRoot,
            summary,
            dependencies,
            logger,
          });
          return {
            success: true,
            mode: 'source-paths',
            message:
              'No source files resolved from configured sourcePaths; nothing to ingest.',
            files,
            summary,
          };
        }

        const preflight = await dependencies.preflight();
        const files: SourceFileIngestResult[] = [];

        for (const sourcePath of sourceFiles) {
          if (!preflight.available) {
            const reason = preflight.reason ?? 'preflight-failed';
            const preflightMessage =
              reason === 'missing-binary'
                ? 'MarkItDown is not installed or not on PATH.'
                : 'MarkItDown preflight failed.';
            files.push(
              await fallbackAndPersist({
                sourcePath,
                failureReason: reason,
                message: preflightMessage,
                projectRoot,
                config,
                sourceType,
                context,
                dependencies,
                runtime,
                toolContext,
                llmBudget,
              }),
            );
            continue;
          }

          const conversionResult = await dependencies.convert(sourcePath);
          files.push(
            await processConvertedFile({
              result: conversionResult,
              projectRoot,
              config,
              sourceType,
              context,
              dependencies,
              runtime,
              toolContext,
              llmBudget,
            }),
          );
        }

        const summary = buildSourceSummary(
          configuredPatterns,
          sourceFiles.length,
          files,
        );
        const reviewArtifact = await appendAmbiguousReviewArtifact({
          projectRoot,
          files,
          logger,
        });

        await enrichRelatedForPersistedMemories({
          files,
          projectRoot,
          logger,
          dependencies,
        });
        await appendSourceIngestRunLog({
          projectRoot,
          summary,
          dependencies,
          logger,
        });

        const message =
          `Processed ${summary.filesProcessed} source files: ` +
          `${summary.created} created, ${summary.updated} updated, ` +
          `${summary.skipped} skipped, ${summary.failed} failed` +
          `${summary.fallbackUsed > 0 ? `; fallback used for ${summary.fallbackUsed}` : ''}` +
          `${summary.llmFallbackExecuted > 0 ? `; LLM fallback executed for ${summary.llmFallbackExecuted}` : ''}` +
          `${summary.llmFallbackSkipped > 0 ? `; LLM fallback skipped for ${summary.llmFallbackSkipped}` : ''}` +
          `${reviewArtifact ? `; ambiguous skips logged to ${reviewArtifact.path}` : ''}` +
          `; ${summary.created + summary.updated} files persisted, ${summary.memoryUnitsPersisted} memory units persisted.`;

        const instruction =
          summary.failed > 0
            ? 'Failures are explicit per file. LLM fallback, when available, is bounded by strict per-run file count, file-size, and output-size limits.'
            : undefined;

        return {
          success: true,
          mode: 'source-paths',
          message,
          instruction,
          reviewArtifact,
          files,
          summary,
        };
      }

      const indexName = getIndexName(projectRoot);
      debouncedUpdateIndex({ index: indexName, projectRoot, logger });

      const sourceTypeSection = sourceType
        ? `- sourceType: ${sourceType}`
        : '- sourceType: (not provided; infer from content)';
      const contextSection = context
        ? `- context: ${context}`
        : '- context: (not provided)';
      const configuredSourcesSection =
        sourceFiles.length === 0
          ? '- configured source files: (none resolved from config.sourcePaths)'
          : [
              '- configured source files:',
              ...sourceFiles.map((p) => `  - ${p}`),
            ].join('\n');

      const instruction = [
        'You are performing memory ingest orchestration.',
        '',
        'SOURCE METADATA:',
        sourceTypeSection,
        contextSection,
        configuredSourcesSection,
        '',
        'SOURCE CONTENT TO ANALYZE:',
        '---',
        trimmedContent,
        '---',
        '',
        'GOAL:',
        'Analyze the source and orchestrate creation or update of multiple high-quality memories using memory_remember.',
        '',
        'REQUIRED PROCESS:',
        '1) Analyze the source content thoroughly.',
        '2) Extract distinct knowledge units (do not merge unrelated items).',
        '3) Classify each unit into the best memory type (for example: architectural-decision, design-decision, learning, issue, user-preference, project-preference, recurring-pattern, conventions-pattern, context).',
        '4) For each unit, decide update-vs-create before writing:',
        '   - Prefer updating existing memories when a unit clearly extends/corrects previous knowledge.',
        '   - Create a new memory when the knowledge is novel or materially different.',
        '   - Avoid duplicates and near-duplicates.',
        '5) For every selected unit, call memory_remember with:',
        '   - title: concise, searchable, specific',
        '   - memoryType: best-fit type',
        '   - content: complete, durable summary with key facts and rationale',
        '   - tags: 3-8 precise tags (domain, system/component, topic, status, time/context)',
        '   - filePath: include only when updating an existing memory',
        '6) Add cross-references between related memories using [[wikilinks]] inside memory content.',
        '   - Link causes to effects, decisions to issues, patterns to examples.',
        '   - Use stable, human-readable link targets matching memory titles where possible.',
        '7) Preserve factual fidelity: no invention, no speculative details.',
        '8) Keep each memory atomic, reusable, and future-oriented.',
        '',
        'QUALITY CRITERIA:',
        '- One memory per coherent knowledge unit.',
        '- Clear why/what/impact for decisions and learnings.',
        '- Issues include symptoms, impact, and current status if available.',
        '- Preferences include scope (who/where) and actionable guidance.',
        '- Patterns include trigger, approach, and trade-offs.',
        '',
        'OUTPUT EXECUTION EXPECTATION:',
        '- Execute multiple memory_remember calls as needed.',
        '- Prioritize precision over volume.',
        '- Ensure resulting memory graph is connected with meaningful [[wikilinks]].',
      ].join('\n');

      logger.info('Prepared memory ingest instruction payload');

      return {
        success: true,
        mode: 'content',
        message:
          'Ingest instruction generated. Proceed by orchestrating memory_remember calls from extracted knowledge units.',
        instruction,
      };
    },
  };
}
