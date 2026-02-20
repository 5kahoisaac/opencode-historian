import type { PluginConfig } from '../config';
import type { Logger } from '../utils';
import { createForgetTool } from './memory-forget';
import { createListTypesTool } from './memory-list-types';
import { createRecallTool } from './memory-recall';
import { createRememberTool } from './memory-remember';
import { createSyncTool } from './memory-sync';

export function createMemoryTools(
  config: PluginConfig,
  projectRoot: string,
  logger: Logger,
) {
  return [
    createListTypesTool(config),
    createRecallTool(config, projectRoot, logger),
    createRememberTool(config, projectRoot, logger),
    createForgetTool(config, projectRoot, logger),
    createSyncTool(config, projectRoot, logger),
  ];
}

export {
  createForgetTool,
  createListTypesTool,
  createRecallTool,
  createRememberTool,
  createSyncTool,
};
