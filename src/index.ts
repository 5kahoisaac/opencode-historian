import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, ToolContext, ToolDefinition } from '@opencode-ai/plugin';
import { tool } from '@opencode-ai/plugin';
import { createHistorianAgent } from './agents';
import { loadPluginConfig } from './config';
import { createBuiltinMcps } from './mcp';
import { getIndexName, updateIndex } from './qmd';
import { createMemoryTools } from './tools';
import { createLogger, getBuiltinMemoryTypes } from './utils';

const PROMPTS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'prompts');
const SYSTEM_TRANSFORM_PROMPT = readFileSync(
  join(PROMPTS_DIR, 'experimental.chat.system.transform.md'),
  'utf-8',
).trim();
const SESSION_COMPACTING_PROMPT = readFileSync(
  join(PROMPTS_DIR, 'experimental.session.compacting.md'),
  'utf-8',
).trim();

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
  const memoryToolsArray = createMemoryTools(config, ctx.directory, logger);

  // Static parameter schemas — replaces runtime Zod _def.typeName introspection.
  // Tools not listed here (memory_list_types, memory_sync) have no parameters
  // and fall through to the `?? {}` default below.
  const TOOL_PARAM_SCHEMAS: Record<string, Record<string, unknown>> = {
    memory_recall: {
      query: tool.schema.optional(tool.schema.string()),
      memoryType: tool.schema.optional(tool.schema.string()),
      limit: tool.schema.optional(tool.schema.string()),
      type: tool.schema.string(),
      isAll: tool.schema.string(),
    },
    memory_remember: {
      title: tool.schema.string(),
      content: tool.schema.string(),
      memoryType: tool.schema.string(),
      tags: tool.schema.optional(tool.schema.array(tool.schema.string())),
      filePath: tool.schema.optional(tool.schema.string()),
    },
    memory_forget: {
      filePaths: tool.schema.array(tool.schema.string()),
    },
  };

  // Convert internal tool format to Plugin ToolDefinition format
  const toolDefinitions: Record<string, ToolDefinition> = {};
  for (const toolDef of memoryToolsArray) {
    const args = TOOL_PARAM_SCHEMAS[toolDef.name] ?? {};

    toolDefinitions[toolDef.name] = {
      description: toolDef.description,
      args: args as ToolDefinition['args'],
      execute: async (args: Record<string, unknown>, _context: ToolContext) => {
        // Call the internal handler and convert result to string
        const result = await (
          toolDef.handler as (args: Record<string, unknown>) => Promise<unknown>
        )(args);
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
