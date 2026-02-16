import type { Plugin, ToolContext, ToolDefinition } from '@opencode-ai/plugin';
import { tool } from '@opencode-ai/plugin';
import { createHistorianAgent } from './agents';
import { loadPluginConfig } from './config';
import { createBuiltinMcps } from './mcp';
import { StubQmdClient } from './qmd/client';
import { createMemoryTools } from './tools';

const OpencodeHistorian: Plugin = async (ctx) => {
  // Load configuration
  const config = loadPluginConfig(ctx.directory);

  // Create historian agent
  const historianAgent = createHistorianAgent(config);

  // For now, use a stub QmdClient since MCP client is not provided by OpenCode
  // The qmd MCP server will be started via the mcp hook, and tools will
  // handle the gracefully degraded state until it's connected
  const qmdClient = new StubQmdClient();

  // Create memory tools using the stub QmdClient
  const memoryToolsArray = createMemoryTools(qmdClient, config, ctx.directory);

  // Convert internal tool format to Plugin ToolDefinition format
  const toolDefinitions: Record<string, ToolDefinition> = {};
  for (const toolDef of memoryToolsArray) {
    // The parameters is already a plain object with Zod types as values
    // We need to convert it to use the plugin's Zod instance
    const originalArgs = toolDef.parameters as Record<string, unknown>;

    // Re-create the schema using the plugin's Zod
    const args: Record<string, unknown> = {};
    for (const [key, _value] of Object.entries(originalArgs)) {
      // For now, use a simple approach - convert to string schema
      // This works for the basic types we use (string, optional, number, boolean, array)
      args[key] = tool.schema.string();
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
      Object.assign(opencodeConfig.agent, { historian: historianAgent });

      // Set default model if configured
      if (config.model) {
        opencodeConfig.model = config.model;
      }

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

    // Event hook: Minimal stub for Phase 1
    event: async (input) => {
      if (config.debug) {
        console.log(`[opencode-historian] Event: ${input.event.type}`);
      }
      // Phase 1: No-op, Phase 2 will implement auto-compound
    },
  };
};

export default OpencodeHistorian;
