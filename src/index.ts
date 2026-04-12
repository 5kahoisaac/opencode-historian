import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, ToolContext, ToolDefinition } from '@opencode-ai/plugin';
import { createHistorianAgent } from './agents';
import { loadPluginConfig } from './config';
import { createBuiltinMcps } from './mcp';
import { getIndexName, updateIndex } from './qmd';
import { createMemoryTools } from './tools';
import { createLogger, getBuiltinMemoryTypes } from './utils';

const PROMPTS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'prompts');

function readPromptFile(filename: string): string {
  try {
    return readFileSync(join(PROMPTS_DIR, filename), 'utf-8').trim();
  } catch {
    return '';
  }
}

const SYSTEM_TRANSFORM_PROMPT = readPromptFile(
  'experimental.chat.system.transform.md',
);
const SESSION_COMPACTING_PROMPT = readPromptFile(
  'experimental.session.compacting.md',
);

const OpencodeHistorian: Plugin = async (ctx) => {
  // Load configuration
  const config = loadPluginConfig(ctx.directory);

  // Create logger with config
  const logger = createLogger(config);

  // Create historian agent/exit
  const historianAgent = createHistorianAgent(config);

  // Initialize qmd index with memory types (non-blocking)
  const indexName = getIndexName(ctx.directory);
  const builtinTypes = getBuiltinMemoryTypes();
  const allMemoryTypes = [...builtinTypes, ...(config.memoryTypes || [])];
  updateIndex({
    index: indexName,
    projectRoot: ctx.directory,
    logger,
    memoryTypes: allMemoryTypes.map((t) => t.name),
  }).catch((error) => {
    logger.warn(
      `Failed to initialize index: ${error instanceof Error ? error.message : String(error)}`,
    );
  });

  // Create memory tools using CLI-based functions
  const memoryToolsArray = createMemoryTools(
    config,
    ctx.directory,
    logger,
    ctx.client,
  );

  // Convert internal tool format to Plugin ToolDefinition format.
  // Pass through the actual Zod parameter schemas from each tool
  // rather than duplicating them in a static map.
  const toolDefinitions: Record<string, ToolDefinition> = {};
  for (const toolDef of memoryToolsArray) {
    toolDefinitions[toolDef.name] = {
      description: toolDef.description,
      args: (toolDef.parameters ?? {}) as ToolDefinition['args'],
      execute: async (args: Record<string, unknown>, context: ToolContext) => {
        const result = await (
          toolDef.handler as (
            args: Record<string, unknown>,
            context?: ToolContext,
          ) => Promise<unknown>
        )(args, context);
        return JSON.stringify(result);
      },
    };
  }

  return {
    name: 'opencode-historian',

    // Register historian agent
    agent: { historian: historianAgent },

    // Register memory tools
    tool: toolDefinitions,

    // Register MCP configurations
    mcp: createBuiltinMcps(config.disabledMcps),

    // Config hook: Register historian agent
    config: async (opencodeConfig) => {
      // Merge agent config
      if (!opencodeConfig.agent) {
        opencodeConfig.agent = {};
      }

      // Block memory tools from other agents (only historian can use them)
      const memoryTools = [
        'memory_remember',
        'memory_recall',
        'memory_forget',
        'memory_list_types',
        'memory_sync',
        'memory_ingest',
        'memory_lint',
      ];

      for (const [agentName, agentConfig = {}] of Object.entries(
        opencodeConfig.agent,
      )) {
        if (agentName === 'historian') continue;

        // Start with existing permissions and add deny for each memory tool
        const permissions = {
          ...(agentConfig?.permission ?? {}),
        } as Record<string, unknown>;
        for (const tool of memoryTools) {
          permissions[tool] = 'deny';
        }

        opencodeConfig.agent[agentName] = {
          ...agentConfig,
          permission: permissions,
        };
      }

      // Ensure historian agent is registered with restricted tool access
      // Historian can ONLY use memory tools - deny/ask all other tools
      opencodeConfig.agent.historian = {
        ...historianAgent,
      };

      // Merge MCP configs
      if (!opencodeConfig.mcp) {
        opencodeConfig.mcp = { ...createBuiltinMcps(config.disabledMcps) };
      } else {
        Object.assign(
          opencodeConfig.mcp,
          createBuiltinMcps(config.disabledMcps),
        );
      }
    },

    // Event: Instruct agent to clarify serena and historian usages
    'experimental.chat.system.transform': async (_, output) => {
      if (!config.disabledMcps?.includes('serena')) {
        output.system.push(SYSTEM_TRANSFORM_PROMPT);
      }
    },

    // Inject additional compound-engineering handling into the compaction prompt
    'experimental.session.compacting': async (_, output) => {
      if (config.autoCompound) {
        output.context.push(SESSION_COMPACTING_PROMPT);
      }
    },
  };
};

export default OpencodeHistorian;

export {
  convertFileWithMarkitdown,
  type MarkitdownConvertResult,
  type MarkitdownFailureReason,
  type MarkitdownFailureResult,
  type MarkitdownPreflightResult,
  type MarkitdownSuccessResult,
  type ProcessRunner,
  type ProcessRunResult,
  preflightMarkitdown,
} from './ingest';
