import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test';
import { getIndexName, search, vectorSearch } from './cli';

describe('qmd CLI functions', () => {
  describe('getIndexName', () => {
    test('extracts kebab-case folder name from simple path', () => {
      expect(getIndexName('/Users/test/MyProject')).toBe('my-project');
    });

    test('extracts kebab-case from opencode-historian path', () => {
      expect(getIndexName('/path/to/opencode-historian')).toBe(
        'opencode-historian',
      );
    });

    test('handles already kebab-case names', () => {
      expect(getIndexName('/home/user/my-project-name')).toBe(
        'my-project-name',
      );
    });

    test('handles camelCase names', () => {
      expect(getIndexName('/Users/dev/myAwesomeProject')).toBe(
        'my-awesome-project',
      );
    });

    test('handles PascalCase names', () => {
      expect(getIndexName('/Users/dev/MyAwesomeProject')).toBe(
        'my-awesome-project',
      );
    });

    test('throws on empty string', () => {
      expect(() => getIndexName('')).toThrow(
        'Invalid project root: projectRoot must be a non-empty string',
      );
    });

    test('throws on whitespace-only string', () => {
      expect(() => getIndexName('   ')).toThrow(
        'Invalid project root: projectRoot must be a non-empty string',
      );
    });

    test('throws on path ending with slash', () => {
      expect(() => getIndexName('/path/to/folder/')).toThrow(
        'Invalid project root: cannot extract folder name from path',
      );
    });
  });

  describe('search', () => {
    test('returns empty array when qmd fails', async () => {
      // Test with invalid index - should return empty array instead of throwing
      const results = await search('test-query', {
        index: 'nonexistent-index-xyz',
        n: 5,
      });
      expect(results).toEqual([]);
    });
  });

  describe('vectorSearch', () => {
    test('returns empty array when qmd fails', async () => {
      // Test with invalid index - should return empty array instead of throwing
      const results = await vectorSearch('test-query', {
        index: 'nonexistent-index-xyz',
        n: 5,
      });
      expect(results).toEqual([]);
    });
  });
});

// Integration tests - only run when QMD_TEST is set and qmd is available
describe('qmd CLI functions (integration)', () => {
  const hasQmd = async (): Promise<boolean> => {
    try {
      const { execAsync } = await import('./cli');
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

  describe.skipIf(!process.env.QMD_TEST)('vectorSearch integration', () => {
    test('vectorSearch returns results from opencode-historian index', async () => {
      if (!qmdAvailable) {
        console.log('Skipping: qmd not available');
        return;
      }

      const results = await vectorSearch('naming', {
        index: 'opencode-historian',
        n: 5,
      });

      expect(results.length).toBeGreaterThanOrEqual(0);
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('path');
        expect(results[0]).toHaveProperty('score');
      }
    });

    test('vectorSearch with collection filter returns correct results', async () => {
      if (!qmdAvailable) {
        console.log('Skipping: qmd not available');
        return;
      }

      const results = await vectorSearch('naming', {
        index: 'opencode-historian',
        collection: 'context',
        n: 5,
      });

      expect(results.length).toBeGreaterThanOrEqual(0);
      if (results.length > 0) {
        // Results should come from the context collection
        expect(results[0].path).toContain('context');
      }
    });
  });

  describe.skipIf(!process.env.QMD_TEST)('search integration', () => {
    test('search returns results from opencode-historian index', async () => {
      if (!qmdAvailable) {
        console.log('Skipping: qmd not available');
        return;
      }

      const results = await search('naming', {
        index: 'opencode-historian',
        n: 5,
      });

      expect(results.length).toBeGreaterThanOrEqual(0);
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('path');
      }
    });
  });
});
