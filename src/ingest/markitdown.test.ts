import { describe, expect, it } from 'bun:test';
import {
  convertFileWithMarkitdown,
  type ProcessRunner,
  preflightMarkitdown,
} from './markitdown';

describe('markitdown adapter', () => {
  it('returns success result with markdown when cli exits zero', async () => {
    const runner: ProcessRunner = async (_command, _args) => ({
      exitCode: 0,
      stdout: '# Title\n\nBody',
      stderr: '',
    });

    const result = await convertFileWithMarkitdown('/tmp/input.pdf', runner);

    expect(result.success).toBe(true);
    expect(result.method).toBe('markitdown');
    expect(result.inputPath).toBe('/tmp/input.pdf');
    if (result.success) {
      expect(result.markdown).toContain('# Title');
    }
  });

  it('classifies missing binary from spawn ENOENT in conversion', async () => {
    const runner: ProcessRunner = async (_command, _args) => ({
      exitCode: null,
      stdout: '',
      stderr: '',
      spawnError: Object.assign(new Error('spawn markitdown ENOENT'), {
        code: 'ENOENT',
      }),
    });

    const result = await convertFileWithMarkitdown('/tmp/input.docx', runner);

    expect(result.success).toBe(false);
    expect(result.method).toBe('markitdown');
    if (!result.success) {
      expect(result.reason).toBe('missing-binary');
      expect(result.message).toContain('not available in PATH');
    }
  });

  it('classifies unsupported input conversion failures', async () => {
    const runner: ProcessRunner = async (_command, _args) => ({
      exitCode: 2,
      stdout: '',
      stderr: 'Unsupported file format for this converter',
    });

    const result = await convertFileWithMarkitdown('/tmp/input.xyz', runner);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('unsupported-input');
      expect(result.exitCode).toBe(2);
    }
  });

  it('classifies missing optional dependency errors', async () => {
    const runner: ProcessRunner = async (_command, _args) => ({
      exitCode: 1,
      stdout: '',
      stderr: "ModuleNotFoundError: No module named 'pdfminer'",
    });

    const result = await convertFileWithMarkitdown('/tmp/input.pdf', runner);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('missing-dependency');
      expect(result.message).toContain(
        'missing optional conversion dependencies',
      );
    }
  });

  it('handles non-zero exit with generic conversion failure', async () => {
    const runner: ProcessRunner = async (_command, _args) => ({
      exitCode: 1,
      stdout: '',
      stderr: 'Conversion failed for unknown reason',
    });

    const result = await convertFileWithMarkitdown('/tmp/input.txt', runner);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('conversion-failure');
      expect(result.exitCode).toBe(1);
    }
  });

  it('preflight reports unavailable when binary is missing', async () => {
    const runner: ProcessRunner = async (_command, _args) => ({
      exitCode: null,
      stdout: '',
      stderr: 'command not found: markitdown',
    });

    const result = await preflightMarkitdown(runner);

    expect(result.available).toBe(false);
    expect(result.method).toBe('markitdown');
    expect(result.reason).toBe('missing-binary');
  });
});
