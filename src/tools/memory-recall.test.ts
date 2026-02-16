import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test';
import type { PluginConfig } from '../config';
import { createLogger } from '../utils/logger';
import { createRecallTool } from './memory-recall';

// Minimal mock config for testing
const mockConfig: PluginConfig = {
  temperature: 0.3,
  autoCompound: false,
  logLevel: 'info',
  debug: false,
};

describe('memory_recall tool', () => {
  const logger = createLogger(mockConfig);
  const projectRoot = process.cwd();
  const tool = createRecallTool(mockConfig, projectRoot, logger);

  test('tool has correct name', () => {
    expect(tool.name).toBe('memory_recall');
  });

  test('tool has description', () => {
    expect(tool.description).toContain('semantic');
  });

  test('tool has required parameters', () => {
    expect(tool.parameters).toHaveProperty('query');
    expect(tool.parameters.memoryType).toBeDefined();
    expect(tool.parameters.limit).toBeDefined();
  });

  test('handler returns object with memories array', async () => {
    const result = await tool.handler({ query: 'naming', limit: 5 });
    expect(result).toHaveProperty('memories');
    expect(Array.isArray(result.memories)).toBe(true);
  });

  test('handler returns count property', async () => {
    const result = await tool.handler({ query: 'naming', limit: 5 });
    expect(result).toHaveProperty('count');
    expect(typeof result.count).toBe('number');
  });

  // Skip: qmd semantic search takes variable time and may timeout
  test.skip('handler returns valid structure for any query', async () => {
    // Note: qmd semantic search may find results even for seemingly random queries
    // so we just verify the structure is correct
    const result = await tool.handler({
      query: 'zzzyyyxxxwwwvvvuuu',
      limit: 5,
    });
    expect(result).toHaveProperty('memories');
    expect(result).toHaveProperty('count');
    expect(Array.isArray(result.memories)).toBe(true);
    expect(typeof result.count).toBe('number');
  });

  test('handler accepts memoryType parameter', async () => {
    const result = await tool.handler({
      query: 'naming',
      memoryType: 'context',
      limit: 5,
    });
    // Should not throw, may return empty or results
    expect(result).toHaveProperty('memories');
    expect(result).toHaveProperty('count');
  });

  test('handler handles normalized memoryType', async () => {
    // Test with PascalCase input - should normalize to kebab-case
    const result = await tool.handler({
      query: 'naming',
      memoryType: 'Context',
      limit: 5,
    });
    expect(result).toHaveProperty('memories');
    expect(result).toHaveProperty('count');
  });
});

// Integration test - requires qmd and existing index
describe('memory_recall tool (integration)', () => {
  const hasQmd = async (): Promise<boolean> => {
    try {
      const { execAsync } = await import('../qmd/cli');
      await execAsync('which qmd');
      return true;
    } catch {
      return false;
    }
  };

  let qmdAvailable = false;

  beforeAll(async () => {
    qmdAvailable = await hasQmd();
  });

  describe.skipIf(!process.env.QMD_TEST)('with real qmd', () => {
    test('finds memories from opencode-historian index', async () => {
      if (!qmdAvailable) {
        console.log('Skipping: qmd not available');
        return;
      }

      const logger = createLogger(mockConfig);
      const projectRoot = process.cwd();
      const tool = createRecallTool(mockConfig, projectRoot, logger);

      const result = await tool.handler({ query: 'naming', limit: 5 });

      // If there are results, verify structure
      if (result.count > 0) {
        expect(result.memories[0]).toHaveProperty('path');
        expect(result.memories[0]).toHaveProperty('score');
        expect(result.memories[0].path).toMatch(/\.md$/);
      }
    });

    test('filters by collection when memoryType specified', async () => {
      if (!qmdAvailable) {
        console.log('Skipping: qmd not available');
        return;
      }

      const logger = createLogger(mockConfig);
      const projectRoot = process.cwd();
      const tool = createRecallTool(mockConfig, projectRoot, logger);

      const result = await tool.handler({
        query: 'naming',
        memoryType: 'context',
        limit: 5,
      });

      // If there are results, they should be from context collection
      if (result.count > 0) {
        expect(result.memories[0].path).toContain('context');
      }
    });
  });
});
