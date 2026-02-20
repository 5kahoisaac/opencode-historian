import { serena } from './serena';
import type { McpConfig, McpName } from './types';

export type { McpConfig, McpName } from './types';

const allBuiltinMcps: Record<McpName, McpConfig> = {
  serena,
};

export function createBuiltinMcps(
  disabledMcps: readonly string[] = [],
): Record<string, McpConfig> {
  return Object.fromEntries(
    Object.entries(allBuiltinMcps).filter(
      ([name]) => !disabledMcps.includes(name),
    ),
  );
}
