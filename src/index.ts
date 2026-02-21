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

  // Convert internal tool format to Plugin ToolDefinition format
  const toolDefinitions: Record<string, ToolDefinition> = {};
  for (const toolDef of memoryToolsArray) {
    // The parameters is already a plain object with Zod types as values
    // We need to convert it to use the plugin's Zod instance
    const originalArgs = toolDef.parameters as Record<string, unknown>;

    // Handle tools with no parameters
    const args: Record<string, unknown> = {};
    if (originalArgs && Object.keys(originalArgs).length > 0) {
      for (const [key, value] of Object.entries(originalArgs)) {
        // Check if the zod type is an array or union containing array
        const zodType = value as {
          _def?: { typeName?: string; innerType?: unknown };
        };
        const typeName = zodType?._def?.typeName;

        // Handle different zod types
        if (typeName === 'ZodArray') {
          args[key] = tool.schema.array(tool.schema.string());
        } else if (typeName === 'ZodUnion') {
          // For union types (like string | array), use array schema
          // The handler will normalize single strings to arrays
          args[key] = tool.schema.array(tool.schema.string());
        } else if (typeName === 'ZodOptional') {
          // Check inner type
          const innerType = zodType._def?.innerType as {
            _def?: { typeName?: string };
          };
          const innerTypeName = innerType?._def?.typeName;
          if (innerTypeName === 'ZodArray' || innerTypeName === 'ZodUnion') {
            args[key] = tool.schema.optional(
              tool.schema.array(tool.schema.string()),
            );
          } else {
            args[key] = tool.schema.optional(tool.schema.string());
          }
        } else if (typeName === 'ZodDefault') {
          const innerType = zodType._def?.innerType as {
            _def?: { typeName?: string };
          };
          const innerTypeName = innerType?._def?.typeName;
          if (innerTypeName === 'ZodArray' || innerTypeName === 'ZodUnion') {
            args[key] = tool.schema.array(tool.schema.string());
          } else {
            args[key] = tool.schema.string();
          }
        } else if (typeName === 'ZodPipe') {
          // ZodPipe (from .transform()) - check the input type
          const innerType = zodType._def?.innerType as {
            _def?: { typeName?: string };
          };
          const innerTypeName = innerType?._def?.typeName;
          if (innerTypeName === 'ZodUnion' || innerTypeName === 'ZodArray') {
            args[key] = tool.schema.array(tool.schema.string());
          } else {
            args[key] = tool.schema.string();
          }
        } else {
          args[key] = tool.schema.string();
        }
      }
    }

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
    event: async ({ event }) => {
      switch (event.type) {
        case 'session.created': {
          const promptPath = join(
            dirname(fileURLToPath(import.meta.url)),
            'prompts',
            'session.created.md',
          );
          const content = readFileSync(promptPath, 'utf-8');
          await ctx.client.tui.appendPrompt({
            body: {
              text: content.trim(),
            },
          });
          break;
        }
      }
    },

    // Inject additional compound-engineering handling into the compaction prompt
    'experimental.session.compacting': async (_, output) => {
      if (config.autoCompound) {
        const promptPath = join(
          dirname(fileURLToPath(import.meta.url)),
          'prompts',
          'experimental.session.compacting.md',
        );
        const content = readFileSync(promptPath, 'utf-8');
        output.context.push(content.trim());
      }
    },
  };
};

export default OpencodeHistorian;
