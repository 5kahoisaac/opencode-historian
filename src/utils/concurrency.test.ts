import { describe, expect, it } from 'bun:test';
import { batchedPromiseAll, DEFAULT_CONCURRENCY } from './concurrency';

describe('batchedPromiseAll', () => {
  it('returns empty array for empty input', async () => {
    const result = await batchedPromiseAll([]);
    expect(result).toEqual([]);
  });

  it('resolves all factories in order', async () => {
    const factories = [1, 2, 3].map((n) => () => Promise.resolve(n));
    const result = await batchedPromiseAll(factories);
    expect(result).toEqual([1, 2, 3]);
  });

  it('respects concurrency limit', async () => {
    let maxConcurrent = 0;
    let current = 0;

    const factories = Array.from({ length: 10 }, (_, i) => async () => {
      current++;
      if (current > maxConcurrent) maxConcurrent = current;
      await new Promise((r) => setTimeout(r, 10));
      current--;
      return i;
    });

    const result = await batchedPromiseAll(factories, 3);
    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });

  it('handles single item', async () => {
    const result = await batchedPromiseAll([() => Promise.resolve('only')]);
    expect(result).toEqual(['only']);
  });

  it('handles concurrency larger than input', async () => {
    const factories = [1, 2].map((n) => () => Promise.resolve(n));
    const result = await batchedPromiseAll(factories, 100);
    expect(result).toEqual([1, 2]);
  });

  it('throws on concurrency < 1', async () => {
    expect(batchedPromiseAll([() => Promise.resolve(1)], 0)).rejects.toThrow(
      'Concurrency must be at least 1',
    );
  });

  it('propagates factory errors', async () => {
    const factories = [
      () => Promise.resolve(1),
      () => Promise.reject(new Error('boom')),
      () => Promise.resolve(3),
    ];
    expect(batchedPromiseAll(factories, 5)).rejects.toThrow('boom');
  });

  it('uses DEFAULT_CONCURRENCY when not specified', async () => {
    expect(DEFAULT_CONCURRENCY).toBe(10);

    let maxConcurrent = 0;
    let current = 0;

    const factories = Array.from({ length: 15 }, (_, i) => async () => {
      current++;
      if (current > maxConcurrent) maxConcurrent = current;
      await new Promise((r) => setTimeout(r, 5));
      current--;
      return i;
    });

    await batchedPromiseAll(factories);
    expect(maxConcurrent).toBeLessThanOrEqual(DEFAULT_CONCURRENCY);
  });
});
