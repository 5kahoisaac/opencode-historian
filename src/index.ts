import type { Plugin, ToolContext, ToolDefinition } from '@opencode-ai/plugin';
import { tool } from '@opencode-ai/plugin';
import { createHistorianAgent } from './agents';
import { loadPluginConfig } from './config';
import { createBuiltinMcps } from './mcp';
import { addExternalPathsToIndex, getIndexName, updateIndex } from './qmd';
import { createMemoryTools } from './tools';
import { createLogger } from './utils';

const OpencodeHistorian: Plugin = async (ctx) => {
  // Load configuration
  const config = loadPluginConfig(ctx.directory);

  // Create logger with config
  const logger = createLogger(config);

  // Create historian agent
  const historianAgent = createHistorianAgent(config);

  // Initialize external paths into "context" collection (non-blocking)
  if (config.externalPaths && config.externalPaths.length > 0) {
    const indexName = getIndexName(ctx.directory);
    // Run asynchronously without blocking plugin initialization
    addExternalPathsToIndex(config.externalPaths, { index: indexName, logger })
      .then(() =>
        updateIndex({ index: indexName, projectRoot: ctx.directory, logger }),
      )
      .catch((error) => {
        logger.warn(
          `Failed to initialize external paths: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
  }

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
      // Historian can ONLY use memory tools - deny all other tools
      opencodeConfig.agent.historian = {
        ...historianAgent,
        permission: {
          edit: 'deny',
          bash: 'deny',
          webfetch: 'deny',
          doom_loop: 'deny',
          external_directory: 'deny',
        },
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
  };
};

export default OpencodeHistorian;
