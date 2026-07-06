# eFlow — AI Recommendation Pipeline Fix
## Implementation Directive — Single-Pass Execution
## (Patches Phase 4's proposalDecompositionService.ts — not a new roadmap phase)

---

## NON-NEGOTIABLES — READ BEFORE ANYTHING ELSE

- Parts A and C below are anchored to exact strings verified directly against the current codebase this session — confident, no hedging needed.
- Part B is new architecture, not a patch to existing lines — the new code is complete and correct, but the exact splice point into the current `decomposeProposal` export needs a quick verify-first look, flagged explicitly where it matters. Do not guess past a mismatch — report what you find instead.
- Part D is genuinely optional. Do Parts A, B, C first. Only continue to D if those three are working and verified.
- Do not touch `extractPartSections`, `repairFlatStructure`, or `hasHierarchyContent` — this fix reuses them as-is, it doesn't change what they do.
- Before reporting complete, run the SELF-VERIFICATION section at the end.

---

## CONTEXT

Confirmed by direct code inspection, not guesswork: `applyLocalRecommendations` unconditionally overwrites every task's recommendation with a deterministic scorer, regardless of whether the LLM already answered — there's no guard clause. Separately, `shouldUseStructuredFallback` triggers whenever a document has `"Part N"` section headers AND the LLM returned fewer than 4 tasks — which is every single run on the OCEDSIPP-style PDF, because the LLM is being asked to decompose all 8 parts in one call and never manages more than 1-2 tasks before stopping. The result: the LLM's real reasoning gets computed, logged to console, and discarded every time. What reaches the screen is 100% deterministic scoring — which is why identical assignments repeat run after run, and why generic-skill people (Cheryl, Basilio) keep winning regardless of the specific task.

Three duplicate skill sets in the mock data compound this — no algorithm can differentiate between two people with byte-identical tags.

Priority order matters here: A is a 5-minute safety net, B is the actual architectural fix, C removes a confound that would otherwise make B's results look worse than they are, D is a genuine improvement but not required for correctness.

---

## PART A — GUARD CLAUSE (do this first, 5 minutes, zero risk)

### `src/app/services/proposalDecompositionService.ts` — TARGETED EDIT

Find this exact block inside `applyLocalRecommendations`:
```ts
        activity.tasks.forEach((task) => {
          const taskForScoring: Task = {
```
Replace with:
```ts
        activity.tasks.forEach((task) => {
          if (task.recommendedEmployeeIds && task.recommendedEmployeeIds.length > 0) {
            return; // Already has a real recommendation — don't overwrite it
          }
          const taskForScoring: Task = {
```

That's the entire change for Part A. On its own this doesn't fix the root cause — a task only has `recommendedEmployeeIds` set if the LLM path actually ran and populated it before this function fires — but it means Part B's per-part LLM answers will now actually survive instead of being clobbered.

---

## PART B — PER-PART LLM ORCHESTRATION (the real fix)

### Why this specific approach

Every debug log from this PDF shows the same pattern: the LLM successfully handles one Activity worth of content (1-2 tasks, real reasoning, correct JSON) — it has never once failed at that. It only fails at doing all 8 parts in a single call. `extractPartSections` already splits the document into exactly the right-sized chunks. The fix is calling the LLM once per part instead of once for the whole document, so each call only has to do the thing it's already proven it can do.

### `src/app/services/proposalDecompositionService.ts` — NEW CODE + ONE VERIFY-FIRST SPLICE

**B1. Add this new function.** Place it near `buildStructuredDecomposition` (same file, same general area — both build activities from parts):

```ts
// ─── decomposeSinglePart ─────────────────────────────────────────────
// Sends ONE part's content to the LLM — a much smaller ask than the
// whole document, matching what every debug log shows the model
// actually succeeding at. Falls back to the deterministic scorer only
// for THIS part if its own call fails, not the whole document.
async function decomposeSinglePart(
  part: { title: string; description: string; schedule?: string; tasks: ProposalDecompositionTask[] },
  employees?: Employee[],
  employeeNotes?: EmployeeNotesMap,
): Promise<ProposalDecompositionActivity> {
  const employeeList = (employees || [])
    .map((e) => `- ${e.name} (${e.id}): ${Object.keys(e.skills || {}).join(", ") || "no listed skills"}`)
    .join("\n");

  const prompt = `Break down ONE section of a government project proposal into actionable tasks.

Section title: "${part.title}"
Details: "${part.description}"
Schedule: "${part.schedule || "not specified"}"

Available team:
${employeeList || "No employees provided — omit recommendedEmployeeIds."}

Respond with JSON only, no preamble, no markdown fences:
{
  "tasks": [{
    "title": "...", "description": "...",
    "estimatedDuration": "2 days",
    "requiredSkills": ["skill1", "skill2"],
    "priority": "high",
    "recommendedEmployeeIds": ["exact-id-from-list-above"],
    "recommendationReasoning": "Why this person fits, referencing their actual listed skills.",
    "subtasks": ["step 1", "step 2", "step 3"]
  }]
}

Produce 1-4 tasks for this section only. Do not attempt to cover the whole proposal — only this section.`;

  try {
    // Reuse whatever function currently sends a chat completion request to
    // VITE_LLM_BASE_URL and returns the raw response string — locate it in
    // the existing whole-document path (referenced around the code that
    // builds `contentString` / `jsonMatch` in this file) rather than
    // duplicating a second HTTP-calling implementation here.
    const rawResponse = await callDecompositionLLM(prompt);
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in LLM response");

    const parsed = JSON.parse(jsonMatch[0]) as { tasks: ProposalDecompositionTask[] };
    if (!parsed.tasks || parsed.tasks.length === 0) throw new Error("Empty tasks array");

    return {
      title: part.title,
      description: part.description,
      schedule: part.schedule,
      methodology: [],
      tasks: parsed.tasks,
    };
  } catch (err) {
    console.warn(`[Per-Part LLM] Failed for "${part.title}", using local scoring for this part only:`, err);
    const fallbackActivity: ProposalDecompositionActivity = {
      title: part.title,
      description: part.description,
      schedule: part.schedule,
      methodology: [],
      tasks: part.tasks, // the regex-extracted tasks for this part, unscored
    };
    const wrapper: ProposalDecompositionResult = {
      proposal: { title: part.title, description: part.description },
      programs: [{ title: part.title, description: part.description, projects: [{ title: part.title, description: part.description, activities: [fallbackActivity] }] }],
    };
    applyLocalRecommendations(wrapper, employees, employeeNotes);
    return fallbackActivity;
  }
}

// ─── decomposeProposalByPart ─────────────────────────────────────────
// Orchestrates the per-part calls sequentially (not Promise.all — a
// local Ollama server holds one model in memory and processes one
// request at a time; concurrent calls would just queue behind each
// other while holding open connections for no benefit).
async function decomposeProposalByPart(
  proposalText: string,
  proposalTitle: string,
  employees?: Employee[],
  employeeNotes?: EmployeeNotesMap,
): Promise<ProposalDecompositionResult> {
  const parts = extractPartSections(proposalText);
  if (!parts || parts.length === 0) {
    throw new Error("No parts extracted — caller should fall back to whole-document path");
  }

  const activities: ProposalDecompositionActivity[] = [];
  for (const part of parts) {
    const activity = await decomposeSinglePart(part, employees, employeeNotes);
    activities.push(activity);
  }

  return {
    proposal: { title: proposalTitle, description: proposalText.substring(0, 200) },
    programs: activities.map((activity, index) => ({
      title: activity.title || `Program ${index + 1}`,
      description: activity.description,
      projects: [
        {
          title: `${activity.title} Implementation`,
          description: activity.description,
          activities: [activity],
        },
      ],
    })),
  };
}
```

**B2. The verify-first splice.** Locate the current exported `decomposeProposal` function. Confirm what its current top-level structure looks like — specifically, confirm the name of the function that actually sends the HTTP request to `VITE_LLM_BASE_URL` and returns the raw completion text (referenced as `callDecompositionLLM` above as a placeholder — use whatever it's actually called). Once confirmed:

- Rename the current whole-document logic (the existing body of `decomposeProposal`) to a private helper `decomposeWholeDocument` — same signature, same behavior, untouched internals.
- Make `decomposeProposal` itself the new entry point:

```ts
export async function decomposeProposal(
  proposalText: string,
  proposalTitle: string,
  employees?: Employee[],
  employeeNotes?: EmployeeNotesMap,
): Promise<ProposalDecompositionResult> {
  const hasParts = /Part\s+\d+/i.test(proposalText);

  if (hasParts) {
    try {
      return await decomposeProposalByPart(proposalText, proposalTitle, employees, employeeNotes);
    } catch (err) {
      console.warn("[Decomposition] Per-part path failed, falling back to whole-document:", err);
      // fall through to whole-document path below
    }
  }

  return decomposeWholeDocument(proposalText, proposalTitle, employees, employeeNotes);
}
```

This is fully additive for any proposal that *doesn't* have `"Part N"` headers — those go through the exact same whole-document path as today, completely unchanged. Only `"Part N"`-structured documents (like OCEDSIPP) get the new per-part treatment.

**B3. UI: show progress across parts.** In `ProposalImport.tsx`, wherever the "decomposing…" status message currently renders a single static string, add a way to show which part is currently processing. Simplest approach: have `decomposeProposalByPart` accept an optional `onProgress?: (current: number, total: number, partTitle: string) => void` callback, call it before each `decomposeSinglePart` call, and wire that to update the existing status message to something like `"Processing part 3 of 8: Economic Diagnostic…"`. This isn't required for correctness, but total import time is going up (8 smaller sequential calls instead of 1 large one) — telling the user what's happening prevents it from looking hung.

---

## PART C — DATA FIX (differentiate the duplicate skill sets)

Three pairs of employees currently have byte-identical `skills` JSON, confirmed directly from your data export — no scoring method can ever meaningfully choose between identical twins. Run this in Supabase:

```sql
-- Maria Clara (LEDIPO) — currently identical to Juan Dela Cruz
UPDATE profiles SET skills = '{
  "Data analysis": true,
  "Investment promotion": true,
  "Public relations": true,
  "Report writing": true
}'::jsonb
WHERE id = '309c5592-0dde-42da-9274-d588d9921404';

-- Crispin Santos (CPDO/Planning) — currently identical to Basilio Santos
UPDATE profiles SET skills = '{
  "Budgeting": true,
  "Data gathering": true,
  "Land use planning": true,
  "Report writing": true
}'::jsonb
WHERE id = 'e322bf91-1d86-49d3-b6c8-243b80ab66bd';

-- Gabriel Cahiyang (BPLO head) — currently identical to Raul E. Cam
UPDATE profiles SET skills = '{
  "Investment promotion": true,
  "Public relations": true,
  "Regulatory compliance": true,
  "Strategic planning": true
}'::jsonb
WHERE id = '4a02c2d4-e4f3-49da-8ce1-8b4df53228f0';
```

Verify afterward — this should return zero rows if the fix worked:
```sql
SELECT full_name, skills, COUNT(*) OVER (PARTITION BY skills) as dupes
FROM profiles
WHERE role != 'super_admin'
ORDER BY dupes DESC;
```

---

## PART D — OPTIONAL: RARITY-WEIGHTED SCORING + SOURCE BADGES

Only do this after A, B, and C are verified working.

### D1. Rarity weighting

**[Verify-first]** — locate `scoreEmployees` (referenced from `aiScoringEngine.ts` in earlier phase work; confirm the actual current file/function name before editing). Add a rarity-weighting step so a skill only 2 of 13 people have (like GIS mapping) counts for more than a skill 8 of 13 people have (like strategic planning):

```ts
// Add near scoreEmployees, or in a shared utils location it already imports from
export function computeSkillRarity(employees: Employee[]): Record<string, number> {
  const counts: Record<string, number> = {};
  employees.forEach((e) => {
    Object.keys(e.skills || {}).forEach((skill) => {
      counts[skill] = (counts[skill] || 0) + 1;
    });
  });
  const total = employees.length || 1;
  const rarity: Record<string, number> = {};
  Object.entries(counts).forEach(([skill, count]) => {
    rarity[skill] = Math.log(total / count); // classic IDF — rarer skill, higher weight
  });
  return rarity;
}
```

Inside `scoreEmployees`'s existing skill-matching loop, multiply each matched skill's contribution by `rarity[skill] || 1` instead of counting every match equally. Do not change the function's exported signature — this is an internal weighting change only.

### D2. Surface recommendation source

The `recommendationSource: 'llm' | 'fallback' | 'import'` field already exists on `Task` from Phase 4 — it's just never actually been set. Set it in two places:

In `decomposeSinglePart` (Part B above), on the success path, tag each returned task: `task.recommendationSource = "llm"`. On the catch/fallback path, tag them `"fallback"` instead.

In `applyLocalRecommendations`, right after `task.recommendedEmployeeIds = team.map(...)`, add `task.recommendationSource = "fallback";`.

Then in `MondayBoard.tsx`, wherever a task card renders its recommendation (same general area as the existing subtask "AI" badge from Phase 4), add a small badge matching that pattern:
```tsx
{task.recommendationSource === "llm" && (
  <span className="text-[8px] uppercase tracking-wider text-violet-500">AI Reasoned</span>
)}
{task.recommendationSource === "fallback" && (
  <span className="text-[8px] uppercase tracking-wider text-neutral-400">Auto-Matched</span>
)}
```

This lets a dept head glance at any recommendation and know instantly whether it came from real reasoning worth trusting, or the safety net worth double-checking before committing.

---

## SELF-VERIFICATION — RUN THIS BEFORE DECLARING COMPLETE

- [ ] Part A: does `applyLocalRecommendations` now skip any task that already has `recommendedEmployeeIds`?
- [ ] Part B: does a `"Part N"`-structured document now make 8 separate LLM calls (visible in server logs as 8 distinct chat completions) instead of 1?
- [ ] Part B: does a non-`"Part N"` document still go through the exact same whole-document path as before this fix — zero behavior change for that case?
- [ ] Part B: if one part's LLM call fails, do the OTHER 7 parts still get real LLM recommendations — confirm the failure is isolated, not cascading?
- [ ] Part C: does the duplicate-check query return zero rows after running the UPDATEs?
- [ ] Part D (if done): does the badge correctly distinguish LLM-sourced vs fallback-sourced recommendations on an actual test import?
- [ ] Did you touch `extractPartSections`, `repairFlatStructure`, or `hasHierarchyContent`? (Should be no.)
- [ ] Does the project still build with no new errors introduced?

---

## TESTING CHECKLIST

- [ ] Import the OCEDSIPP PDF fresh → server logs show 8 separate chat completion calls, not 1
- [ ] Check each task's reasoning text in the final board — it should read like natural LLM prose ("Basilio Santos has expertise in...") rather than the templated "Team of N: Lead X, support Y" format, for parts where the LLM succeeded
- [ ] Run the same import 2-3 times → some variation between runs in who gets recommended is now expected and fine — that's genuine LLM judgment, not a bug (contrast with the old behavior, where identical output every time was actually a sign the LLM's answer was being discarded)
- [ ] Confirm Tasya Salcedo (Zoning, GIS mapping) can now appear for the Final Outputs task at least some of the time
- [ ] Confirm Maria Clara, Crispin Santos, and Gabriel Cahiyang no longer share identical skill sets with their former twins
- [ ] Total import time — confirm it's noticeably longer than before (expected, roughly 3-5 minutes for 8 sequential calls) and that the progress indicator (if implemented) makes this feel intentional, not broken