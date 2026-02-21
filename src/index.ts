import type { Plugin, ToolContext, ToolDefinition } from '@opencode-ai/plugin';
import { tool } from '@opencode-ai/plugin';
import { createHistorianAgent } from './agents';
import { loadPluginConfig } from './config';
import { createBuiltinMcps } from './mcp';
import { getIndexName, updateIndex } from './qmd';
import { loadBuiltinSkills, registerSkillsInOpenCode } from './skill-loader.js';
import { createMemoryTools } from './tools';
import { createLogger, getBuiltinMemoryTypes } from './utils';

const OpencodeHistorian: Plugin = async (ctx) => {
  // Load configuration
  const config = loadPluginConfig(ctx.directory);

  // Create logger with config
  const logger = createLogger(config);

  // Load built-in skills
  const builtinSkills = loadBuiltinSkills();
  logger.info(
    `Loaded ${builtinSkills.length} built-in skill(s): ${builtinSkills.map((s) => s.name).join(', ')}`,
  );

  // Register skills with OpenCode (for /skills discovery)
  registerSkillsInOpenCode(ctx.directory, logger);

  // Create historian agent
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

    // Inject built-in skills into system prompt
    'experimental.chat.system.transform': async (_input, output) => {
      if (builtinSkills.length === 0) return;

      // Inject skill content wrapped in tags for visibility
      const skillContent = builtinSkills
        .map(
          (skill) => `<skill name="${skill.name}">\n${skill.content}\n</skill>`,
        )
        .join('\n\n');

      output.system.push(
        `<available-skills>\n${skillContent}\n</available-skills>`,
      );
    },
  };
};

export default OpencodeHistorian;
