# eFlow — Phase 4: Dept Head Board + Subtask Layer
## Claude Code Implementation Prompt

---

## CONTEXT

Phase 1 (org tree), Phase 2 (Auth/RBAC), Phase 3 (data layer — tasks, notifications, employee notes all on Supabase) are complete and working.

Phase 4 has two goals:
1. Confirm/finish wiring `MondayBoard` + `ProposalImport` to the Supabase `tasks` table (largely already done by Phase 3's `taskService.ts` rewrite — this phase fills any gaps).
2. **Add the subtask/checklist layer** — a new `subtasks` table, generated automatically during PDF proposal import (from the document's own methodology text, with a keyword-template fallback), editable afterward.

This is shared infrastructure. Phase 5 (Employee) and Phase 6 (Team Leader) will build their own UI on top of what this phase ships — **do not build Employee-facing or Team-Leader-facing screens in this phase.**

---

## CRITICAL RULES

1. **Do not change the `tasks` table.** No `parent_task_id`, no new hierarchy columns. The existing denormalized `proposal_id`/`program_id`/`project_id`/`activity_id` breadcrumb fields stay exactly as Phase 3 defined them. Subtasks live in their own table.
2. **Do not change any exported function signature** in `taskService.ts`, `proposalDecompositionService.ts`, or `employeeService.ts` unless explicitly instructed below. Other components depend on these.
3. **Do not touch** `extractPartSections`, `buildStructuredDecomposition`, `shouldUseStructuredFallback`, or the regex-based PDF parsing logic in `proposalDecompositionService.ts` beyond what's explicitly specified — this logic is already tuned against real LEDIPO proposal PDFs (OCEDSIPP) and is fragile.

---

## STEP 0 — RUN THIS SQL IN SUPABASE FIRST

```sql
-- ─── Subtask progress columns on tasks ────────────────────────────
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subtask_count INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subtask_completed_count INTEGER DEFAULT 0;

-- ─── Subtasks ──────────────────────────────────────────────────────
CREATE TABLE subtasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  is_completed    BOOLEAN DEFAULT FALSE,
  completed_by    UUID REFERENCES profiles(id),
  completed_at    TIMESTAMPTZ,
  assigned_to     UUID REFERENCES profiles(id),
  position        INTEGER DEFAULT 0,
  source          TEXT DEFAULT 'manual' CHECK (source IN ('ai_extracted','template','manual')),
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON subtasks (task_id, position);

-- ─── Keep tasks.subtask_count / subtask_completed_count in sync ──
CREATE OR REPLACE FUNCTION sync_task_subtask_counts()
RETURNS TRIGGER AS $$
DECLARE affected_task_id UUID;
BEGIN
  affected_task_id := COALESCE(NEW.task_id, OLD.task_id);
  UPDATE tasks SET
    subtask_count = (SELECT COUNT(*) FROM subtasks WHERE task_id = affected_task_id),
    subtask_completed_count = (SELECT COUNT(*) FROM subtasks WHERE task_id = affected_task_id AND is_completed)
  WHERE id = affected_task_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subtasks_sync_counts
  AFTER INSERT OR UPDATE OR DELETE ON subtasks
  FOR EACH ROW EXECUTE FUNCTION sync_task_subtask_counts();

CREATE TRIGGER subtasks_updated_at
  BEFORE UPDATE ON subtasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();  -- reuses Phase 3's function

-- ─── RLS ───────────────────────────────────────────────────────────
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subtasks_all_auth" ON subtasks FOR ALL USING (auth.uid() IS NOT NULL);

-- ─── Realtime ──────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE subtasks;
```

---

## FILES TO CREATE / MODIFY

---

### 1. `src/app/services/subtaskService.ts` — NEW FILE

```ts
// ─── Subtask Service ──────────────────────────────────────────────
// CRUD + realtime for the subtasks table.

import { supabase } from '../../lib/supabase';

export type SubtaskSource = 'ai_extracted' | 'template' | 'manual';

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  completedBy?: string;
  completedAt?: number;
  assignedTo?: string;
  position: number;
  source: SubtaskSource;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
}

function rowToSubtask(row: Record<string, unknown>): Subtask {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    title: row.title as string,
    isCompleted: (row.is_completed as boolean) || false,
    completedBy: (row.completed_by as string) || undefined,
    completedAt: row.completed_at ? new Date(row.completed_at as string).getTime() : undefined,
    assignedTo: (row.assigned_to as string) || undefined,
    position: (row.position as number) || 0,
    source: (row.source as SubtaskSource) || 'manual',
    createdBy: (row.created_by as string) || undefined,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  };
}

// ─── subscribeToSubtasks ───────────────────────────────────────────
export function subscribeToSubtasks(
  taskId: string,
  callback: (subtasks: Subtask[]) => void,
): () => void {
  const load = async () => {
    const { data } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('position', { ascending: true });
    if (data) callback(data.map(rowToSubtask));
  };
  load();

  const channel = supabase
    .channel(`subtasks-${taskId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'subtasks', filter: `task_id=eq.${taskId}` },
      () => load(),
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ─── createSubtask (single, manual add) ────────────────────────────
export async function createSubtask(
  taskId: string,
  title: string,
  opts?: { source?: SubtaskSource; position?: number; createdBy?: string },
): Promise<Subtask> {
  const { data, error } = await supabase
    .from('subtasks')
    .insert({
      task_id: taskId,
      title,
      source: opts?.source || 'manual',
      position: opts?.position ?? 0,
      created_by: opts?.createdBy || null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToSubtask(data);
}

// ─── createSubtasksBatch (used by ProposalImport right after createTask) ──
export async function createSubtasksBatch(
  taskId: string,
  titles: string[],
  source: SubtaskSource = 'ai_extracted',
): Promise<Subtask[]> {
  if (!titles || titles.length === 0) return [];
  const rows = titles
    .filter((t) => t && t.trim().length > 0)
    .map((title, idx) => ({
      task_id: taskId,
      title: title.trim(),
      source,
      position: idx,
    }));
  if (rows.length === 0) return [];
  const { data, error } = await supabase.from('subtasks').insert(rows).select();
  if (error) throw error;
  return (data || []).map(rowToSubtask);
}

// ─── toggleSubtask ──────────────────────────────────────────────────
export async function toggleSubtask(
  subtaskId: string,
  isCompleted: boolean,
  actorId?: string,
): Promise<void> {
  await supabase
    .from('subtasks')
    .update({
      is_completed: isCompleted,
      completed_by: isCompleted ? actorId || null : null,
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq('id', subtaskId);
}

// ─── updateSubtask ──────────────────────────────────────────────────
export async function updateSubtask(
  subtaskId: string,
  updates: { title?: string; position?: number; assignedTo?: string },
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.position !== undefined) row.position = updates.position;
  if (updates.assignedTo !== undefined) row.assigned_to = updates.assignedTo || null;
  await supabase.from('subtasks').update(row).eq('id', subtaskId);
}

// ─── deleteSubtask ──────────────────────────────────────────────────
export async function deleteSubtask(subtaskId: string): Promise<void> {
  await supabase.from('subtasks').delete().eq('id', subtaskId);
}

// ─── reorderSubtasks ────────────────────────────────────────────────
export async function reorderSubtasks(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from('subtasks').update({ position: idx }).eq('id', id),
    ),
  );
}
```

---

### 2. `src/app/services/proposalDecompositionService.ts` — TARGETED EDITS

Do not rewrite this file. Make these specific additions only.

**2a. Extend the task interface** — find:
```ts
export interface ProposalDecompositionTask {
  title: string;
  description: string;
  estimatedDuration?: string;
  requiredSkills?: string[];
  priority?: "low" | "medium" | "high";
  recommendedEmployeeIds?: string[];
  recommendationReasoning?: string;
  burnoutWarning?: boolean;
}
```
Add one field:
```ts
export interface ProposalDecompositionTask {
  title: string;
  description: string;
  estimatedDuration?: string;
  requiredSkills?: string[];
  priority?: "low" | "medium" | "high";
  recommendedEmployeeIds?: string[];
  recommendationReasoning?: string;
  burnoutWarning?: boolean;
  subtasks?: string[];   // ← NEW: checklist items, AI-extracted or template-filled
}
```

**2b. Add a keyword → template subtask map.** Insert near the top of the file, alongside `inferSkillsFromText`:

```ts
// ─── Keyword → Subtask Template Fallback ──────────────────────────
const SUBTASK_TEMPLATES: Record<string, string[]> = {
  meeting: ["Prepare agenda", "Send invitations", "Book venue", "Prepare minutes", "Post-meeting report"],
  kickoff: ["Prepare agenda", "Send invitations", "Book venue", "Prepare minutes", "Post-meeting report"],
  workshop: ["Prepare materials", "Confirm facilitators", "Register participants", "Document outputs"],
  procurement: ["Prepare BAC documents", "Canvass suppliers", "Submit purchase request", "Receive items"],
  seminar: ["Prepare materials", "Confirm speakers", "Register participants", "Document outputs"],
  benchmarking: ["Identify benchmark sites", "Coordinate site visit", "Document findings", "Prepare report"],
  validation: ["Prepare validation materials", "Schedule presentation", "Collect feedback", "Incorporate revisions"],
  consultation: ["Identify stakeholders", "Schedule sessions", "Facilitate discussion", "Document inputs"],
  draft: ["Outline structure", "Write first draft", "Internal review", "Revise based on feedback"],
  presentation: ["Prepare slides", "Rehearse presentation", "Deliver presentation", "Collect feedback"],
};

function generateTemplateSubtasks(title: string, description: string): string[] {
  const haystack = `${title} ${description}`.toLowerCase();
  for (const [keyword, templates] of Object.entries(SUBTASK_TEMPLATES)) {
    if (haystack.includes(keyword)) return templates;
  }
  // Generic fallback — always give the task SOME checklist
  return ["Plan and prepare", "Execute", "Review and finalize"];
}

// Extracts numbered/bulleted checklist-like lines from a methodology
// block or task description, so real document content is used over
// generic templates whenever the PDF actually specifies steps.
function extractExplicitSubtasks(methodology?: string[], description?: string): string[] {
  const items: string[] = [];
  if (methodology && methodology.length > 0) {
    methodology.forEach((m) => {
      const cleaned = m.replace(/^[Ø•\-\d.\s]+/, "").trim();
      if (cleaned.length > 3 && cleaned.length < 100) items.push(cleaned);
    });
  }
  return Array.from(new Set(items)).slice(0, 6);
}
```

**2c. Populate subtasks wherever tasks are constructed.** There are three places `ProposalDecompositionTask` objects get built — add subtask generation to each:

In `extractPartSections` (inside the `.map((line, idx) => ({ ... }))` that builds each task), add after `priority: "medium" as const,`:
```ts
subtasks: extractExplicitSubtasks(undefined, normalizedLine).length > 0
  ? extractExplicitSubtasks(undefined, normalizedLine)
  : generateTemplateSubtasks(normalizedLine, normalizedLine),
```

In `buildFallbackDecomposition` (inside the `.map((sentence, tIdx) => ({ ... }))` that builds each task), add after `priority: "medium" as const,`:
```ts
subtasks: generateTemplateSubtasks(sentence, sentence),
```

In the main `decomposeProposal` LLM path — after the existing block that does:
```ts
if (employees && employees.length > 0) {
  parsed.programs.forEach((program) => {
    program.projects.forEach((project) => {
      project.activities.forEach((activity) => {
        activity.tasks.forEach((task) => {
          // ... existing recommendation logic
        });
      });
    });
  });
}
```
Add a **separate** pass (runs regardless of whether `employees` exists) right after it, before `return parsed;`:
```ts
// Ensure every task has subtasks — prefer activity methodology, then templates
parsed.programs.forEach((program) => {
  program.projects.forEach((project) => {
    project.activities.forEach((activity) => {
      activity.tasks.forEach((task) => {
        if (!task.subtasks || task.subtasks.length === 0) {
          const explicit = extractExplicitSubtasks(activity.methodology, task.description);
          task.subtasks = explicit.length > 0
            ? explicit
            : generateTemplateSubtasks(task.title, task.description);
        }
      });
    });
  });
});
```

**2d. Update the LLM prompt** to ask for subtasks directly (better quality than always falling back to templates). Find the `recommendationSchema` block:
```ts
const recommendationSchema =
  employees && employees.length > 0
    ? `,\n          "recommendedEmployeeIds": ["employee_id_1"],\n          "recommendationReasoning": "Why this employee fits"`
    : "";
```
Add a new constant right after it:
```ts
const subtaskSchema = `,\n          "subtasks": ["Checklist step 1", "Checklist step 2", "Checklist step 3"]`;
```
Then find where `recommendationSchema` is interpolated into the final JSON shape template (in the big `prompt` template literal, inside the `tasks` array shape):
```ts
        "tasks": [{
          "title": "...", "description": "...",
          "estimatedDuration": "2 days",
          "requiredSkills": ["facilitation", "data gathering"],
          "priority": "high"${recommendationSchema}
        }]
```
Change to:
```ts
        "tasks": [{
          "title": "...", "description": "...",
          "estimatedDuration": "2 days",
          "requiredSkills": ["facilitation", "data gathering"],
          "priority": "high"${recommendationSchema}${subtaskSchema}
        }]
```
And add one line to the numbered `Instructions:` list in the prompt (after instruction 6, renumber subsequent ones):
```
6b. For each task, include a "subtasks" array of 3-6 short, actionable checklist items. Pull these from the activity's methodology/details text where available (e.g. "Technical Presentations", "Document Review and Gap Analysis"). Only invent generic steps if the source text gives no usable detail.
```

---

### 3. `src/app/components/DeptHead/ProposalImport.tsx` — TARGETED EDITS

**3a. Import the new service.** Add to imports:
```ts
import { createSubtasksBatch } from "../../services/subtaskService";
```

**3b. Track subtasks alongside payloads.** Find:
```ts
const [taskPayloads, setTaskPayloads] = useState<
  Record<string, CreateTaskPayload>
>({});
```
Add right after:
```ts
const [taskSubtasksByKey, setTaskSubtasksByKey] = useState<
  Record<string, string[]>
>({});
const [subtasksCreatedByKey, setSubtasksCreatedByKey] = useState<
  Record<string, number>
>({});
```

**3c. Capture subtasks when building payloads.** Inside `buildTaskPayloads`, find where `payloads[key] = { ... }` is assigned (the big object literal). Right before that assignment, capture the subtasks list:
```ts
const subtaskTitles = task.subtasks || [];
```
And after the function builds `payloads`, also return/set the subtasks map. Modify the function to additionally populate a second map declared at the top of `buildTaskPayloads`:
```ts
const subtasksMap: Record<string, string[]> = {};
```
(declared alongside `const payloads: Record<string, CreateTaskPayload> = {};` at the top of the function)
and inside the `activity.tasks.forEach((task, ti) => { ... })` loop, add:
```ts
subtasksMap[key] = task.subtasks || [];
```
Then change the function's return to:
```ts
return { payloads, subtasksMap };
```
Update the call site:
```ts
const buildTaskPayloads = useCallback(
  (decomposed: ProposalDecompositionResult) => {
    // ... existing body ...
    return { payloads, subtasksMap };
  },
  [employeeById, fileName, userProfile?.departmentId],
);
```

**3d. Update `autoCreateTasks` and `retryFailedTasks` to create subtasks after each successful task creation.**

Find:
```ts
const autoCreateTasks = useCallback(
  async (decomposed: ProposalDecompositionResult) => {
    const payloadMap = buildTaskPayloads(decomposed);
    setTaskPayloads(payloadMap);

    const entries = Object.entries(payloadMap);
    if (entries.length === 0) {
      setAutoCreateStatus("done");
      setAutoCreateMessage("No tasks found to create.");
      return;
    }

    const created = new Set<string>();
    const failed = new Set<string>();

    await Promise.all(
      entries.map(async ([key, payload]) => {
        try {
          await createTask(payload);
          created.add(key);
        } catch (err) {
          console.error("Failed to auto-create task:", err);
          failed.add(key);
        }
      }),
    );
```

Replace with:
```ts
const autoCreateTasks = useCallback(
  async (decomposed: ProposalDecompositionResult) => {
    const { payloads: payloadMap, subtasksMap } = buildTaskPayloads(decomposed);
    setTaskPayloads(payloadMap);
    setTaskSubtasksByKey(subtasksMap);

    const entries = Object.entries(payloadMap);
    if (entries.length === 0) {
      setAutoCreateStatus("done");
      setAutoCreateMessage("No tasks found to create.");
      return;
    }

    const created = new Set<string>();
    const failed = new Set<string>();
    const subtaskCounts: Record<string, number> = {};

    await Promise.all(
      entries.map(async ([key, payload]) => {
        try {
          const createdTask = await createTask(payload);
          created.add(key);

          const subtaskTitles = subtasksMap[key] || [];
          if (subtaskTitles.length > 0) {
            try {
              const createdSubtasks = await createSubtasksBatch(
                createdTask.id,
                subtaskTitles,
                "ai_extracted",
              );
              subtaskCounts[key] = createdSubtasks.length;
            } catch (subErr) {
              console.error("Failed to create subtasks for task:", key, subErr);
            }
          }
        } catch (err) {
          console.error("Failed to auto-create task:", err);
          failed.add(key);
        }
      }),
    );

    setSubtasksCreatedByKey(subtaskCounts);
```

(Keep the rest of the function — `setCreatedTaskKeys(created)`, the status messages — unchanged.)

Apply the equivalent `{ payloads, subtasksMap }` destructure anywhere else `buildTaskPayloads` is called.

**3e. Show subtask count on each task card in the results board.** Find the task card render block (inside `activity.tasks.map((task, ti) => { ... })`), specifically where the priority badge renders:
```tsx
{task.priority && (
  <span className={`rounded-full px-2 py-0.5 text-[9px] uppercase ${...}`}>
    {task.priority}
  </span>
)}
```
Add a subtask count badge right after it, still inside the same flex row:
```tsx
{task.subtasks && task.subtasks.length > 0 && (
  <span className="rounded-full px-2 py-0.5 text-[9px] bg-violet-100 text-violet-700 inline-flex items-center gap-1">
    <Layers size={9} /> {task.subtasks.length} steps
  </span>
)}
```
(`Layers` is already imported in this file.)

---

### 4. `src/app/components/ui/MondayBoard.tsx` — TARGETED EDITS

**4a. Import the subtask service and icon.** Add to the existing imports:
```ts
import {
  Subtask,
  subscribeToSubtasks,
  createSubtask,
  toggleSubtask,
  updateSubtask,
  deleteSubtask,
} from "../../services/subtaskService";
```
Add `ListChecks` and `GripVertical` to the existing `lucide-react` import block.

**4b. Add a reusable subtask progress chip.** Insert this new component near the top of the file, alongside the other small helpers (`getInitials`, `slugifyFragment`, etc., around line 236-300):

```tsx
function SubtaskProgressChip({ task }: { task: Task }) {
  const total = (task as any).subtaskCount ?? 0;
  const done = (task as any).subtaskCompletedCount ?? 0;
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[9px] text-neutral-600">
      <ListChecks size={10} className={done === total ? "text-emerald-600" : "text-neutral-400"} />
      {done}/{total}
    </span>
  );
}
```

Note: `subtaskCount`/`subtaskCompletedCount` need to be added to the `Task` type and to `rowToTask` in `taskService.ts` (see section 5 below) — this chip reads them once that's done.

**4c. Drop `<SubtaskProgressChip task={task} />` into each card view** — `ListBoardView`, `KanbanBoardView`, and `HierarchyBoardView` — next to wherever the existing priority or deadline badge renders on a task row/card. Match the existing badge styling conventions already in each view (small uppercase pill, same gap spacing as neighboring badges).

**4d. Add a Subtasks section to `TaskEditorModal`.** This is the main piece of UI work in this phase. Inside `TaskEditorModal`, after the existing form fields (title, description, due date, etc.) and before the modal's footer/action buttons, add:

```tsx
<TaskSubtasksSection taskId={task.id} />
```

Define `TaskSubtasksSection` as a new component in this file (place it right above `TaskEditorModal`):

```tsx
function TaskSubtasksSection({ taskId }: { taskId: string }) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const unsub = subscribeToSubtasks(taskId, setSubtasks);
    return unsub;
  }, [taskId]);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await createSubtask(taskId, newTitle.trim(), {
        source: "manual",
        position: subtasks.length,
      });
      setNewTitle("");
    } finally {
      setAdding(false);
    }
  };

  const completedCount = subtasks.filter((s) => s.isCompleted).length;

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
          Subtasks {subtasks.length > 0 && `(${completedCount}/${subtasks.length})`}
        </label>
        {subtasks.length > 0 && (
          <div className="flex-1 mx-3 h-1.5 rounded-full bg-neutral-100 overflow-hidden max-w-[140px]">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${subtasks.length ? (completedCount / subtasks.length) * 100 : 0}%` }}
            />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {subtasks.map((st) => (
          <div
            key={st.id}
            className="flex items-center gap-2 rounded-lg border border-neutral-100 bg-neutral-50/60 px-2.5 py-2 group"
          >
            <input
              type="checkbox"
              checked={st.isCompleted}
              onChange={(e) => toggleSubtask(st.id, e.target.checked)}
              className="h-3.5 w-3.5 rounded border-neutral-300 accent-emerald-600 cursor-pointer"
            />
            <span
              className={`flex-1 text-[12px] ${
                st.isCompleted ? "text-neutral-400 line-through" : "text-neutral-700"
              }`}
            >
              {st.title}
            </span>
            {st.source === "ai_extracted" && (
              <span className="text-[8px] uppercase tracking-wider text-violet-500 shrink-0">AI</span>
            )}
            <button
              onClick={() => deleteSubtask(st.id)}
              className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-red-500 transition shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add a subtask…"
          className="flex-1 h-[34px] rounded-lg border border-neutral-200 bg-white px-2.5 text-[12px] text-neutral-900 outline-none focus:border-neutral-400"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newTitle.trim()}
          className="h-[34px] px-3 rounded-lg bg-neutral-900 text-white text-[11px] font-['Lexend:Medium',_sans-serif] disabled:opacity-40 hover:bg-neutral-800"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}
```

(`useEffect`, `Plus`, `X` are already imported in this file.)

---

### 5. `src/app/services/taskService.ts` — SMALL ADDITION

In `rowToTask`, add two fields to the returned object (find where `createdAt`/`updatedAt` are set, add alongside):
```ts
subtaskCount: (row.subtask_count as number) || 0,
subtaskCompletedCount: (row.subtask_completed_count as number) || 0,
```

In the `Task` interface, add:
```ts
subtaskCount?: number;
subtaskCompletedCount?: number;
```

Do not add these to `taskToRow` — they're trigger-managed, never written from the client.

---

## TESTING CHECKLIST

- [ ] Run Step 0 SQL — `subtasks` table exists, `tasks.subtask_count`/`subtask_completed_count` columns exist
- [ ] Upload the OCEDSIPP PDF via ProposalImport → 8 activities (Part 1-8) decompose into tasks as before
- [ ] Each created task also has subtasks in Supabase — check that Part 1's "Kick Off Meeting" task pulled real methodology text (Technical Presentations, Facilitated Discussions, etc.) rather than the generic template
- [ ] A task with no matching methodology content (or pure-fallback path) still gets template-based subtasks, never zero
- [ ] Task card in ProposalImport results board shows "N steps" badge
- [ ] Open any task in MondayBoard → TaskEditorModal → Subtasks section loads, shows checklist with progress bar
- [ ] Check a subtask checkbox → `is_completed` flips in Supabase, `tasks.subtask_completed_count` increments automatically (verify via trigger, not client code)
- [ ] Add a manual subtask via the input field → appears immediately, `source = 'manual'`
- [ ] Delete a subtask → count decrements, progress bar updates
- [ ] SubtaskProgressChip renders correctly on task cards in List, Kanban, and Hierarchy views
- [ ] A task with zero subtasks shows no chip (not a "0/0" badge)
- [ ] Two browser tabs open on the same task → toggling a subtask in one updates the other in real time