/**
 * Default concurrency limit for batched promise execution.
 * Limits the number of simultaneous subprocess calls to prevent
 * overwhelming the system.
 */
export const DEFAULT_CONCURRENCY = 10;

/**
 * Executes an array of async factory functions with a concurrency limit.
 * Each factory is a zero-argument function that returns a Promise.
 * Results are returned in the same order as the input factories.
 *
 * @param factories - Array of zero-argument async functions to execute
 * @param concurrency - Maximum number of concurrent executions (default: 10)
 * @returns Array of resolved values in input order
 *
 * @example
 * ```ts
 * const results = await batchedPromiseAll(
 *   files.map((f) => () => fetchFile(f)),
 *   5,
 * );
 * ```
 */
export async function batchedPromiseAll<T>(
  factories: Array<() => Promise<T>>,
  concurrency: number = DEFAULT_CONCURRENCY,
): Promise<T[]> {
  if (factories.length === 0) {
    return [];
  }

  if (
    !Number.isFinite(concurrency) ||
    !Number.isInteger(concurrency) ||
    concurrency < 1
  ) {
    throw new Error('Concurrency must be a positive integer');
  }

  const results: T[] = new Array(factories.length);

  for (let i = 0; i < factories.length; i += concurrency) {
    const batch = factories.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((fn) => fn()));

    for (let j = 0; j < batchResults.length; j++) {
      results[i + j] = batchResults[j];
    }
  }

  return results;
}
