import { z } from 'zod';

export const MemoryTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  template: z.string().optional(),
});

export const PluginConfigSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.3),
  appendPrompt: z.string().optional(),
  memoryTypes: z.array(MemoryTypeSchema).optional(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  debug: z.boolean().default(false),
  autoCompound: z.boolean().default(true),
  disabledMcps: z.array(z.string()).optional(),
});

export type MemoryType = z.infer<typeof MemoryTypeSchema>;
export type PluginConfig = z.infer<typeof PluginConfigSchema>;
