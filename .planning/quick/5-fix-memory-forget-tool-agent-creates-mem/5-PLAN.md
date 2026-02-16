---
description: Fix memory_forget tool - agent creates memories when asked to forget
mode: quick
created: 2026-02-16
---

# Quick Task 5: Fix memory_forget Tool Agent Guidance

## Problem

When users ask the historian agent to "forget" or "delete" a memory, the agent incorrectly creates/remembers new memories instead of using the `memory_forget` tool.

## Root Cause

The historian agent instructions in `src/agents/historian.ts` have a vague guideline:
```
<guideline id="5">When forgetting, confirm with the user before deletion</guideline>
```

This doesn't explain:
1. The agent should use `memory_forget` tool
2. The two-step delete process (confirm=false → show candidates → confirm=true → delete)
3. The `confirm` parameter on the tool

## Tasks

### Task 1: Update Historian Agent Instructions

**File:** `src/agents/historian.ts`

Replace the vague guideline with explicit forget workflow instructions:

```xml
<forget_workflow>
  <step>When user requests to forget/delete a memory, use memory_forget tool</step>
  <step>First call: memory_forget(query, memoryType, confirm=false) - returns candidates</step>
  <step>Show candidates to user and ask which to delete</step>
  <step>Second call: memory_forget(query, memoryType, confirm=true) - performs deletion</step>
  <step>NEVER create a new memory when user asks to forget/delete</step>
</forget_workflow>
```

Also update the guidelines section to reference this workflow.

### Task 2: Verify Fix

Run typecheck and build to ensure no regressions.
