import type { PluginConfig } from '../config';
import { getBuiltinMemoryTypes } from '../utils';

export function createListTypesTool(config: PluginConfig) {
  return {
    name: 'memory_list_types',
    description:
      'List all available memory types (built-in and custom). Use this tool when you need to determine what memory type to use before creating a memory. If unsure which type fits best, use "context" as the fallback.',
    parameters: {},
    handler: async () => {
      const builtInTypes = getBuiltinMemoryTypes();
      const customTypes = config.memoryTypes || [];

      // Combine built-in and custom types
      const allTypes = [...builtInTypes, ...customTypes];

      return {
        types: allTypes,
        fallbackType: 'context',
        fallbackDescription:
          'General context information - use when no other type fits',
      };
    },
  };
}
