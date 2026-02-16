import type { PluginConfig } from '../config';
import type { QmdClient } from '../qmd';
import type { Logger } from '../utils/logger';
import { createCompoundTool } from './memory-compound';
import { createForgetRequestTool } from './memory-forget';
import { createListTypesTool } from './memory-list-types';
import { createRecallTool } from './memory-recall';
import { createRememberTool } from './memory-remember';

export function createMemoryTools(
  qmdClient: QmdClient,
  config: PluginConfig,
  projectRoot: string,
  logger: Logger,
) {
  return [
    createListTypesTool(qmdClient, config, projectRoot),
    createRecallTool(qmdClient, config, projectRoot, logger),
    createRememberTool(qmdClient, config, projectRoot, logger),
    createCompoundTool(qmdClient, config, projectRoot, logger),
    createForgetRequestTool(qmdClient, config, projectRoot, logger),
  ];
}

export {
  createCompoundTool,
  createForgetRequestTool,
  createListTypesTool,
  createRecallTool,
  createRememberTool,
};
