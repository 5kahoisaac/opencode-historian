import { spawn } from 'node:child_process';

const MISSING_BINARY_PATTERNS = [
  /command not found/i,
  /not recognized as an internal or external command/i,
  /enoent/i,
];

const UNSUPPORTED_INPUT_PATTERNS = [
  /unsupported/i,
  /not support(?:ed)?/i,
  /cannot (?:convert|process|read)/i,
  /unknown format/i,
  /no converter/i,
];

const MISSING_DEPENDENCY_PATTERNS = [
  /modulenotfounderror/i,
  /no module named/i,
  /importerror/i,
  /missing (?:optional )?dependency/i,
  /please install/i,
];

export interface ProcessRunResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  spawnError?: NodeJS.ErrnoException;
}

export type ProcessRunner = (
  command: string,
  args: string[],
) => Promise<ProcessRunResult>;

export type MarkitdownFailureReason =
  | 'missing-binary'
  | 'unsupported-input'
  | 'missing-dependency'
  | 'conversion-failure';

interface MarkitdownBaseResult {
  method: 'markitdown';
  inputPath: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface MarkitdownSuccessResult extends MarkitdownBaseResult {
  success: true;
  markdown: string;
}

export interface MarkitdownFailureResult extends MarkitdownBaseResult {
  success: false;
  reason: MarkitdownFailureReason;
  message: string;
}

export type MarkitdownConvertResult =
  | MarkitdownSuccessResult
  | MarkitdownFailureResult;

export interface MarkitdownPreflightResult {
  available: boolean;
  method: 'markitdown';
  reason?: 'missing-binary' | 'execution-failure';
  message?: string;
  stdout?: string;
  stderr?: string;
}

function defaultProcessRunner(
  command: string,
  args: string[],
): Promise<ProcessRunResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let spawnError: NodeJS.ErrnoException | undefined;

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      spawnError = error;
    });

    child.on('close', (exitCode) => {
      resolve({
        exitCode,
        stdout,
        stderr,
        spawnError,
      });
    });
  });
}

function classifyFailure(result: ProcessRunResult): MarkitdownFailureReason {
  const combined = `${result.stderr}\n${result.stdout}\n${result.spawnError?.message ?? ''}`;

  if (
    result.spawnError?.code === 'ENOENT' ||
    MISSING_BINARY_PATTERNS.some((pattern) => pattern.test(combined))
  ) {
    return 'missing-binary';
  }

  if (MISSING_DEPENDENCY_PATTERNS.some((pattern) => pattern.test(combined))) {
    return 'missing-dependency';
  }

  if (UNSUPPORTED_INPUT_PATTERNS.some((pattern) => pattern.test(combined))) {
    return 'unsupported-input';
  }

  return 'conversion-failure';
}

function buildFailureMessage(reason: MarkitdownFailureReason): string {
  switch (reason) {
    case 'missing-binary':
      return 'MarkItDown binary is not available in PATH.';
    case 'missing-dependency':
      return 'MarkItDown is installed but missing optional conversion dependencies.';
    case 'unsupported-input':
      return 'MarkItDown cannot convert this input format.';
    default:
      return 'MarkItDown conversion failed.';
  }
}

export async function preflightMarkitdown(
  runner: ProcessRunner = defaultProcessRunner,
): Promise<MarkitdownPreflightResult> {
  const result = await runner('markitdown', ['--help']);
  const reason = classifyFailure(result);

  if (reason === 'missing-binary') {
    return {
      available: false,
      method: 'markitdown',
      reason: 'missing-binary',
      message: buildFailureMessage('missing-binary'),
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  if (result.exitCode !== 0) {
    return {
      available: false,
      method: 'markitdown',
      reason: 'execution-failure',
      message: 'MarkItDown preflight failed to execute successfully.',
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  return {
    available: true,
    method: 'markitdown',
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

export async function convertFileWithMarkitdown(
  inputPath: string,
  runner: ProcessRunner = defaultProcessRunner,
): Promise<MarkitdownConvertResult> {
  const result = await runner('markitdown', [inputPath]);

  if (result.exitCode === 0 && result.stdout.trim().length > 0) {
    return {
      success: true,
      method: 'markitdown',
      inputPath,
      markdown: result.stdout,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  }

  const reason = classifyFailure(result);
  return {
    success: false,
    method: 'markitdown',
    inputPath,
    reason,
    message: buildFailureMessage(reason),
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
  };
}
