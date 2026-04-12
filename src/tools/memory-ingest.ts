import { z } from 'zod';
import type { PluginConfig } from '../config';
import { getIndexName, type QmdOptions, updateIndex } from '../qmd';
import type { Logger } from '../utils';

/**
 * Creates the memory_ingest tool for orchestrating multi-memory creation
 * from a single source input.
 */
export function createIngestTool(
  _config: PluginConfig,
  projectRoot: string,
  logger: Logger,
) {
  let updateIndexTimer: ReturnType<typeof setTimeout> | null = null;
  const debouncedUpdateIndex = (options: QmdOptions) => {
    if (updateIndexTimer !== null) {
      clearTimeout(updateIndexTimer);
    }
    updateIndexTimer = setTimeout(() => {
      updateIndexTimer = null;
      updateIndex(options).catch((err: unknown) =>
        logger.warn(
          `Background index update failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }, 500);
  };

  return {
    name: 'memory_ingest',
    description:
      'Validate source content and return instructions for orchestrating multi-memory creation with memory_remember.',
    parameters: {
      content: z
        .string()
        .describe('Source content to ingest and decompose into memories'),
      sourceType: z
        .string()
        .optional()
        .describe(
          'Type of source: conversation, document, code-review, meeting-notes, etc.',
        ),
      context: z
        .string()
        .optional()
        .describe('Additional context about the source'),
    },
    handler: async ({
      content,
      sourceType,
      context,
    }: {
      content: string;
      sourceType?: string;
      context?: string;
    }): Promise<{
      success: boolean;
      message: string;
      instruction: string;
    }> => {
      const trimmedContent = content.trim();
      if (trimmedContent.length === 0) {
        return {
          success: false,
          message: 'Content cannot be empty.',
          instruction:
            'Provide non-empty source content, then call memory_ingest again.',
        };
      }

      const indexName = getIndexName(projectRoot);
      debouncedUpdateIndex({ index: indexName, projectRoot, logger });

      const sourceTypeSection = sourceType
        ? `- sourceType: ${sourceType}`
        : '- sourceType: (not provided; infer from content)';
      const contextSection = context
        ? `- context: ${context}`
        : '- context: (not provided)';

      const instruction = [
        'You are performing memory ingest orchestration.',
        '',
        'SOURCE METADATA:',
        sourceTypeSection,
        contextSection,
        '',
        'SOURCE CONTENT TO ANALYZE:',
        '---',
        trimmedContent,
        '---',
        '',
        'GOAL:',
        'Analyze the source and orchestrate creation or update of multiple high-quality memories using memory_remember.',
        '',
        'REQUIRED PROCESS:',
        '1) Analyze the source content thoroughly.',
        '2) Extract distinct knowledge units (do not merge unrelated items).',
        '3) Classify each unit into the best memory type (for example: architectural-decision, design-decision, learning, issue, user-preference, project-preference, recurring-pattern, conventions-pattern, context).',
        '4) For each unit, decide update-vs-create before writing:',
        '   - Prefer updating existing memories when a unit clearly extends/corrects previous knowledge.',
        '   - Create a new memory when the knowledge is novel or materially different.',
        '   - Avoid duplicates and near-duplicates.',
        '5) For every selected unit, call memory_remember with:',
        '   - title: concise, searchable, specific',
        '   - memoryType: best-fit type',
        '   - content: complete, durable summary with key facts and rationale',
        '   - tags: 3-8 precise tags (domain, system/component, topic, status, time/context)',
        '   - filePath: include only when updating an existing memory',
        '6) Add cross-references between related memories using [[wikilinks]] inside memory content.',
        '   - Link causes to effects, decisions to issues, patterns to examples.',
        '   - Use stable, human-readable link targets matching memory titles where possible.',
        '7) Preserve factual fidelity: no invention, no speculative details.',
        '8) Keep each memory atomic, reusable, and future-oriented.',
        '',
        'QUALITY CRITERIA:',
        '- One memory per coherent knowledge unit.',
        '- Clear why/what/impact for decisions and learnings.',
        '- Issues include symptoms, impact, and current status if available.',
        '- Preferences include scope (who/where) and actionable guidance.',
        '- Patterns include trigger, approach, and trade-offs.',
        '',
        'OUTPUT EXECUTION EXPECTATION:',
        '- Execute multiple memory_remember calls as needed.',
        '- Prioritize precision over volume.',
        '- Ensure resulting memory graph is connected with meaningful [[wikilinks]].',
      ].join('\n');

      logger.info('Prepared memory ingest instruction payload');

      return {
        success: true,
        message:
          'Ingest instruction generated. Proceed by orchestrating memory_remember calls from extracted knowledge units.',
        instruction,
      };
    },
  };
}
