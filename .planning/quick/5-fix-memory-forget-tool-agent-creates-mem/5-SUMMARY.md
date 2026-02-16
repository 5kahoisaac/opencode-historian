---
quick_task: 5
description: Fix memory_forget tool - agent creates memories when asked to forget
completed: 2026-02-16
commit: f4917de
---

# Quick Task 5: Summary

## Problem

When users ask the historian agent to "forget" or "delete" a memory, the agent incorrectly creates new memories instead of using the `memory_forget` tool.

## Root Cause

Vague guideline in `src/agents/historian.ts`:
```xml
<guideline id="5">When forgetting, confirm with the user before deletion</guideline>
```

This didn't explain:
1. The agent should use `memory_forget` tool
2. The two-step delete process
3. The `confirm` parameter on the tool

## Solution

Replaced the vague guideline with a detailed `<forget_workflow>` section:

```xml
<forget_workflow>
  <instruction>When user requests to forget or delete a memory, follow this exact process:</instruction>
  <step name="1">Call memory_forget with confirm=false to get candidate memories</step>
  <step name="2">Show candidates to user and confirm which to delete</step>
  <step name="3">Call memory_forget with confirm=true to perform deletion</step>
  <critical>NEVER create a new memory when user asks to forget/delete. ALWAYS use memory_forget tool.</critical>
</forget_workflow>
```

## Files Changed

- `src/agents/historian.ts` - Added explicit forget_workflow section

## Verification

- ✓ TypeScript typecheck passed
- ✓ Build successful
