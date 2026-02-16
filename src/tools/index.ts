import type { PluginConfig } from '../config';
import type { QmdClient } from '../qmd';
import { createCompoundTool } from './memory-compound';
import { createForgetRequestTool } from './memory-forget';
import { createListTypesTool } from './memory-list-types';
import { createRecallTool } from './memory-recall';
import { createRememberTool } from './memory-remember';

export function createMemoryTools(
  qmdClient: QmdClient,
  config: PluginConfig,
  projectRoot: string,
) {
  return [
    createListTypesTool(qmdClient, config, projectRoot),
    createRecallTool(qmdClient, config, projectRoot),
    createRememberTool(qmdClient, config, projectRoot),
    createCompoundTool(qmdClient, config, projectRoot),
    createForgetRequestTool(qmdClient, config, projectRoot),
  ];
}

export {
  createCompoundTool,
  createForgetRequestTool,
  createListTypesTool,
  createRecallTool,
  createRememberTool,
};
