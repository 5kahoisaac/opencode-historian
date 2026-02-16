import type { PluginConfig } from '../config';
import type { Logger } from '../utils/logger';
import { createCompoundTool } from './memory-compound';
import { createForgetRequestTool } from './memory-forget';
import { createListTypesTool } from './memory-list-types';
import { createRecallTool } from './memory-recall';
import { createRememberTool } from './memory-remember';

export function createMemoryTools(
  config: PluginConfig,
  projectRoot: string,
  logger: Logger,
) {
  return [
    createListTypesTool(config),
    createRecallTool(config, projectRoot, logger),
    createRememberTool(config, projectRoot, logger),
    createCompoundTool(config, projectRoot, logger),
    createForgetRequestTool(config, projectRoot, logger),
  ];
}

export {
  createCompoundTool,
  createForgetRequestTool,
  createListTypesTool,
  createRecallTool,
  createRememberTool,
};
