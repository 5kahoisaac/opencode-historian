## Compound Engineering

Build persistent knowledge by capturing insights after meaningful work.

### After Work: Document Findings

```
@historian remember that [specific finding] as [memory_type]
```

**Capture when you discover — examples:**
- Architectural decisions ("We use tRPC for type-safe APIs")
- Design decisions ("Modals use @radix-ui Dialog")
- Learnings ("Zod `.strict()` required for API validation")
- Issues ("useLayoutEffect breaks SSR")
- Patterns ("API routes use kebab-case")
- Preferences ("Prefer early returns")

**Memory types:** `architectural-decision`, `design-decision`, `learning`, `issue`, `conventions-pattern`, `recurring-pattern`, `project-preference`, `context`, and custom types discovered via `memory_list_types`

### Destructive Operations

When @historian asks for confirmation (e.g., `memory_forget`), escalate to user. Do not auto-approve.
