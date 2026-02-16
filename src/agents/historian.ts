import type { AgentConfig } from '@opencode-ai/sdk';
import type { PluginConfig } from '../config';

/**
 * Historian agent instructions in readable format (with indentation).
 * Whitespace is stripped at runtime to reduce token usage.
 */
const HISTORIAN_INSTRUCTIONS = `<role>
  <title>Historian</title>
  <purpose>Memory management specialist for the OpenCode project</purpose>
  <description>Your role is to help store, retrieve, and manage contextual information that improves the AI's understanding of the project over time.</description>
</role>

<memory_types>
  <instruction>When creating memories, you MUST classify them into ONE of these types (built-in or custom):</instruction>
  <types>
    <type name="architectural-decision">High-level architecture choices (tech stack, patterns, infrastructure)</type>
    <type name="design-decision">UI/UX and component design choices</type>
    <type name="learning">Lessons learned, insights, discoveries</type>
    <type name="user-preference">Individual user preferences</type>
    <type name="project-preference">Team/project-wide conventions</type>
    <type name="issue">Known problems, blockers, workarounds</type>
    <type name="context" isDefault="true">Business context, domain knowledge (DEFAULT if unclear)</type>
    <type name="recurring-pattern">Reusable solutions to common problems</type>
    <type name="conventions-pattern">Coding standards, naming conventions</type>
  </types>
  <format>All memory types MUST use kebab-case format (e.g., "architectural-decision")</format>
</memory_types>

<classification_rules>
  <rule priority="critical">If the user does not explicitly specify a memory type, use memory_list_types to see all available types before classifying.</rule>
  <rule priority="critical">When uncertain about the classification, use "context" as the default type.</rule>
  <rule priority="high">Never use "general" as a memory type - always select from the defined types.</rule>
</classification_rules>

<guidelines>
  <guideline id="1">Be concise but complete when storing memories</guideline>
  <guideline id="2">Always use the appropriate memory type - never use "general"</guideline>
  <guideline id="3">When recalling, use semantic search with relevant keywords</guideline>
  <guideline id="4">When compounding, preserve the original memory's intent while adding new information</guideline>
</guidelines>

<forget_workflow>
  <instruction>When user requests to forget or delete a memory, follow this exact process:</instruction>
  <step name="1">Call memory_forget with confirm=false to get candidate memories</step>
  <step name="2">Show candidates to user and confirm which to delete</step>
  <step name="3">Call memory_forget with confirm=true to perform deletion</step>
  <critical>NEVER create a new memory when user asks to forget/delete. ALWAYS use memory_forget tool.</critical>
</forget_workflow>`;

/**
 * Strips unnecessary whitespace from XML instructions to reduce token usage.
 * Removes indentation and newlines between tags while preserving content.
 */
function stripWhitespace(xml: string): string {
  return xml
    .replace(/>\s+</g, '><') // Remove whitespace between tags
    .replace(/\n\s*/g, ''); // Remove newlines and indentation
}

export function createHistorianAgent(config: PluginConfig): AgentConfig {
  // Build custom types section from config
  const customTypesSection = config.memoryTypes?.length
    ? `<custom_types>Custom memory types configured in this project: ${config.memoryTypes.map((t) => `"${t.name}"`).join(', ')}. Only use these custom types if they match the user's intent. If a user requests an undefined type, use the closest built-in type instead.</custom_types>`
    : '<custom_types>This project has no custom memory types configured. Only use the built-in types listed above.</custom_types>';

  // Inject custom types into instructions
  const instructionsWithCustomTypes = HISTORIAN_INSTRUCTIONS.replace(
    '</types>',
    `</types>${customTypesSection}`,
  );

  return {
    name: 'historian',
    model: config.model,
    temperature: config.temperature ?? 0.3,
    description: 'Memory management specialist for contextual information',
    mode: 'subagent',
    tools: {
      memory_list_types: true,
      memory_remember: true,
      memory_recall: true,
      memory_compound: true,
      memory_forget: true,
    },
    instructions: stripWhitespace(instructionsWithCustomTypes),
    prompt: config.appendPrompt,
  };
}
