import type { MemoryType } from '../config';

/**
 * Built-in memory types that are always available.
 * These match the types defined in the Historian agent instructions.
 *
 * FORMAT: Kebab-case lowercase (e.g., "architectural-decision")
 * - Used in YAML frontmatter as 'memory_type' field
 * - Used in agent instructions for classification
 * - Used directly as qmd collection names (no conversion needed)
 */
const BUILTIN_MEMORY_TYPES = [
  'architectural-decision',
  'design-decision',
  'learning',
  'user-preference',
  'project-preference',
  'issue',
  'context',
  'recurring-pattern',
  'conventions-pattern',
] as const;

/**
 * Built-in memory types with descriptions.
 * Used by memory_list_types tool to show available types to the LLM.
 */
const BUILTIN_MEMORY_TYPES_WITH_DESCRIPTIONS: MemoryType[] = [
  {
    name: 'architectural-decision',
    description:
      'High-level system architecture choices and their rationale (e.g., technology stack, system design)',
  },
  {
    name: 'design-decision',
    description: 'UI/UX or component-level design choices and their reasoning',
  },
  {
    name: 'learning',
    description:
      'Insights, lessons learned, or discoveries made during development',
  },
  {
    name: 'user-preference',
    description:
      'Personal preferences of the user (coding style, workflow, tools)',
  },
  {
    name: 'project-preference',
    description:
      'Project-specific conventions and preferences (patterns, libraries used)',
  },
  {
    name: 'issue',
    description: 'Known issues, bugs, or problems encountered and their status',
  },
  {
    name: 'context',
    description:
      'General context information, background knowledge, or miscellaneous memories (DEFAULT fallback type)',
  },
  {
    name: 'recurring-pattern',
    description:
      'Patterns that occur repeatedly in the codebase or development process',
  },
  {
    name: 'conventions-pattern',
    description:
      'Coding conventions, naming patterns, and style guidelines for the project',
  },
];

/**
 * Returns all built-in memory types with their descriptions.
 */
export function getBuiltinMemoryTypes(): MemoryType[] {
  return BUILTIN_MEMORY_TYPES_WITH_DESCRIPTIONS;
}

/**
 * Converts a string to kebab-case.
 * Handles camelCase, PascalCase, spaces, underscores, and slashes.
 * Examples:
 *   "architectural decision" -> "architectural-decision"
 *   "architectural_decision" -> "architectural-decision"
 *   "architecturalDecision" -> "architectural-decision"
 *   "ArchitecturalDecision" -> "architectural-decision"
 *   "architectural/decision" -> "architectural-decision"
 */
export function toKebabCase(str: string): string {
  // Convert camelCase to kebab-case
  const camelToKebab = str
    .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2')
    .toLowerCase();

  // Replace spaces, underscores, and slashes with hyphens
  // Also strip leading/trailing hyphens and collapse multiple hyphens
  const result = camelToKebab
    .replace(/[\s_/]/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  return result;
}

/**
 * Checks if a memory type is valid.
 * Accepts built-in types or any custom types provided.
 * Normalizes the input before checking.
 */
export function isValidMemoryType(
  type: string,
  customTypes?: MemoryType[],
): boolean {
  const normalized = toKebabCase(type);

  // Check built-in types
  if (
    BUILTIN_MEMORY_TYPES.includes(
      normalized as (typeof BUILTIN_MEMORY_TYPES)[number],
    )
  ) {
    return true;
  }

  // Check custom types (also normalize for comparison)
  if (customTypes?.some((t) => toKebabCase(t.name) === normalized)) {
    return true;
  }

  return false;
}
