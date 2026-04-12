import fs from 'node:fs';
import path from 'node:path';
import { ensureDirectory, getProjectMemoryPath } from '../storage';

const LOG_FILE_NAME = 'log.md';
const LOG_HEADER =
  '# Activity Log\n\nChronological record of memory operations.\n\n';

export type LogAction =
  | 'remember'
  | 'forget'
  | 'sync'
  | 'ingest'
  | 'lint'
  | 'update';

export interface LogEntry {
  action: LogAction;
  memoryType?: string;
  filePath?: string;
  title?: string;
  summary?: string;
}

function getLogPath(projectRoot: string): string {
  return path.join(getProjectMemoryPath(projectRoot), LOG_FILE_NAME);
}

function getEntryTarget(entry: LogEntry): string {
  const fileStem = entry.filePath
    ? path.basename(entry.filePath, path.extname(entry.filePath))
    : undefined;

  if (entry.memoryType && fileStem) {
    return `${entry.memoryType}/${fileStem}`;
  }

  if (entry.memoryType) {
    return entry.memoryType;
  }

  if (fileStem) {
    return fileStem;
  }

  return 'general';
}

function getEntryDescription(entry: LogEntry): string {
  return entry.title ?? entry.summary ?? 'No details provided';
}

function formatLogLine(timestamp: string, entry: LogEntry): string {
  const action = entry.action.toUpperCase();
  const target = getEntryTarget(entry);
  const description = getEntryDescription(entry);
  return `- [${timestamp}] ${action} ${target} — "${description}"\n`;
}

async function ensureLogFile(logPath: string): Promise<void> {
  try {
    await fs.promises.access(logPath);
  } catch {
    await fs.promises.writeFile(logPath, LOG_HEADER, 'utf8');
  }
}

/**
 * Appends a single memory operation entry to `.mnemonics/log.md`.
 */
export async function appendToLog(
  projectRoot: string,
  entry: LogEntry,
): Promise<void> {
  const memoryDirPath = getProjectMemoryPath(projectRoot);
  ensureDirectory(memoryDirPath);

  const logPath = getLogPath(projectRoot);
  await ensureLogFile(logPath);

  const timestamp = new Date().toISOString();
  const logLine = formatLogLine(timestamp, entry);
  await fs.promises.appendFile(logPath, logLine, 'utf8');
}

/**
 * Rotates `.mnemonics/log.md` when entry count exceeds `maxEntries`.
 */
export async function rotateLogIfNeeded(
  projectRoot: string,
  maxEntries: number = 500,
): Promise<void> {
  const memoryDirPath = getProjectMemoryPath(projectRoot);
  ensureDirectory(memoryDirPath);

  const logPath = getLogPath(projectRoot);

  try {
    await fs.promises.access(logPath);
  } catch {
    return;
  }

  const content = await fs.promises.readFile(logPath, 'utf8');
  const entryCount = content.match(/^- \[/gm)?.length ?? 0;

  if (entryCount <= maxEntries) {
    return;
  }

  const timestamp = new Date().toISOString().replace(/[.:]/g, '-');
  const rotatedLogPath = path.join(memoryDirPath, `log.${timestamp}.md`);

  await fs.promises.rename(logPath, rotatedLogPath);
  await fs.promises.writeFile(logPath, LOG_HEADER, 'utf8');
}
