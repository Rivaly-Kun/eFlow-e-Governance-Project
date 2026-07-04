# eFlow — Phase 9: Standing Dept/Team Channels + Rich Submission Editor
## Implementation Directive — Single-Pass Execution

---

## NON-NEGOTIABLES — READ BEFORE ANYTHING ELSE

- **Hard prerequisite: Phase 8's SQL must already be running in Supabase** (`chat_channels`, `chat_channel_members`, `chat_messages`, the task-sync trigger). This phase builds directly on those tables — `channel_type IN ('task', 'org', 'direct')` already included `'org'` for exactly this phase. If Phase 8 hasn't been run, stop and do that first.
- Every edit below is anchored to an exact string, verified directly against the current codebase this session. If a target string doesn't exist verbatim, stop and report what you found.
- Make only the listed edits. Do not refactor or touch anything outside them.
- One intentional signature change is called out explicitly in Part A — it is not accidental scope creep, it's flagged and justified.
- Before reporting complete, run the SELF-VERIFICATION section at the end.

---

## PART A — STANDING DEPT/TEAM CHANNELS

### Context

Task channels (Phase 8) use a real `chat_channel_members` table because assignment is arbitrary — any employee could be assigned to any task. Standing org channels are different: membership is **entirely derivable from the org tree**, since it's just "everyone whose `org_id` is this node or a descendant of it." Materializing that into a synced membership table would mean re-deriving it every time anyone's `org_id` changes anywhere in the tree — fragile, and duplicates logic the org tree already expresses. Instead, membership for org-type channels is computed live via RLS using the `organizations.path` ltree column — no membership table needed for this channel type at all.

One deliberate scope limit, stated plainly rather than silently shipped: **org channels don't have per-user unread tracking in this version** (task channels still do, unchanged from Phase 8). Tracking "have I read this" per user per standing channel would need a small tracking table, reintroducing exactly the sync complexity being avoided here. If that's wanted later, it's a small, contained follow-up — not a blocker for a working standing channel today.

---

### STEP 0 — RUN THIS SQL IN SUPABASE

```sql
-- One standing channel per org node, auto-created when the org is created
CREATE UNIQUE INDEX idx_chat_channels_org_id ON chat_channels (org_id) WHERE org_id IS NOT NULL;

CREATE OR REPLACE FUNCTION create_org_chat_channel()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO chat_channels (channel_type, org_id, name)
  VALUES ('org', NEW.id, NEW.name || ' Chat')
  ON CONFLICT (org_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_create_chat_channel
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION create_org_chat_channel();

-- Backfill: org nodes created before this trigger existed (i.e. all of them so far)
INSERT INTO chat_channels (channel_type, org_id, name)
SELECT 'org', o.id, o.name || ' Chat'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM chat_channels c WHERE c.org_id = o.id AND c.channel_type = 'org'
);

-- ─── RLS: membership derived from the org tree, not a table ─────────
-- A user can read/post in an org channel if that channel's org is an
-- ancestor of (or equal to) their own org. `@>` on ltree means "is
-- ancestor of." These ADD to Phase 8's existing policies — Postgres
-- OR's multiple permissive policies together, so task-channel access
-- from Phase 8 is untouched.
CREATE POLICY "org_channels_ancestor_read" ON chat_channels FOR SELECT
  USING (
    channel_type = 'org' AND EXISTS (
      SELECT 1 FROM organizations c
      JOIN profiles p ON p.id = auth.uid()
      JOIN organizations u ON u.id = p.org_id
      WHERE c.id = chat_channels.org_id AND c.path @> u.path
    )
  );

CREATE POLICY "org_messages_ancestor_read" ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_channels ch
      JOIN organizations c ON c.id = ch.org_id
      JOIN profiles p ON p.id = auth.uid()
      JOIN organizations u ON u.id = p.org_id
      WHERE ch.id = chat_messages.channel_id AND ch.channel_type = 'org' AND c.path @> u.path
    )
  );

CREATE POLICY "org_messages_ancestor_insert" ON chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_channels ch
      JOIN organizations c ON c.id = ch.org_id
      JOIN profiles p ON p.id = auth.uid()
      JOIN organizations u ON u.id = p.org_id
      WHERE ch.id = chat_messages.channel_id AND ch.channel_type = 'org' AND c.path @> u.path
    )
  );
```

---

### 1. `src/lib/supabaseService.ts` — NEW EXPORT

Add near `getDescendantOrgIds` (Phase 6) — this is its natural sibling, walking the tree in the opposite direction:

```ts
// ─── getAncestorOrgIds ───────────────────────────────────────────────
// Given a user's own org, returns that org's id plus every ancestor's
// id — the opposite direction from getDescendantOrgIds. Used to find
// which standing channels (own section, parent office, department...)
// a user should see.
export function getAncestorOrgIds(
  orgs: Organization[],
  orgId: string | null | undefined,
): string[] {
  if (!orgId) return [];
  const org = orgs.find((o) => o.id === orgId);
  if (!org) return [orgId];
  const parts = org.path.split(".");
  const ancestorPaths = parts.map((_, i) => parts.slice(0, i + 1).join("."));
  return orgs.filter((o) => ancestorPaths.includes(o.path)).map((o) => o.id);
}
```

---

### 2. `src/app/services/chatService.ts` — INTENTIONAL SIGNATURE CHANGE

**This is a deliberate, flagged change to a function from Phase 8** — `subscribeToMyChannels` now needs a second parameter so it can also resolve standing channels, which have no membership table to query directly.

Find the current signature:
```ts
export function subscribeToMyChannels(
  userId: string,
  callback: (channels: ChatChannelSummary[]) => void,
): () => void {
```

Replace the whole function with:

```ts
export interface ChatChannelSummary {
  channelId: string;
  taskId?: string;
  orgId?: string;
  name: string;
  lastMessage?: string;
  lastMessageAt?: number;
  unread: boolean;
}

export function subscribeToMyChannels(
  userId: string,
  ancestorOrgIds: string[],
  callback: (channels: ChatChannelSummary[]) => void,
): () => void {
  const load = async () => {
    // Task channels — unchanged from Phase 8
    const { data: memberships } = await supabase
      .from("chat_channel_members")
      .select("channel_id, last_read_at, chat_channels(id, name, task_id)")
      .eq("user_id", userId);

    const taskSummaries: ChatChannelSummary[] = await Promise.all(
      (memberships || []).map(async (m: any) => {
        const { data: lastMsg } = await supabase
          .from("chat_messages")
          .select("content, created_at")
          .eq("channel_id", m.channel_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return {
          channelId: m.channel_id,
          taskId: m.chat_channels?.task_id || undefined,
          name: m.chat_channels?.name || "Untitled",
          lastMessage: lastMsg?.content,
          lastMessageAt: lastMsg?.created_at ? new Date(lastMsg.created_at).getTime() : undefined,
          unread: lastMsg?.created_at
            ? new Date(lastMsg.created_at) > new Date(m.last_read_at)
            : false,
        };
      }),
    );

    // Org (standing) channels — NEW. No membership table to query;
    // resolve directly from the ancestor org ids the caller computed.
    let orgSummaries: ChatChannelSummary[] = [];
    if (ancestorOrgIds.length > 0) {
      const { data: orgChannels } = await supabase
        .from("chat_channels")
        .select("id, name, org_id")
        .eq("channel_type", "org")
        .in("org_id", ancestorOrgIds);

      orgSummaries = await Promise.all(
        (orgChannels || []).map(async (ch) => {
          const { data: lastMsg } = await supabase
            .from("chat_messages")
            .select("content, created_at")
            .eq("channel_id", ch.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          return {
            channelId: ch.id,
            orgId: ch.org_id,
            name: ch.name,
            lastMessage: lastMsg?.content,
            lastMessageAt: lastMsg?.created_at ? new Date(lastMsg.created_at).getTime() : undefined,
            unread: false, // no per-user read tracking for standing channels — see Context note
          };
        }),
      );
    }

    const all = [...orgSummaries, ...taskSummaries];
    all.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
    callback(all);
  };
  load();

  const channel = supabase
    .channel(`my-channels-${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => load())
    .subscribe();

  return () => supabase.removeChannel(channel);
}
```

Remove the old standalone `ChatChannelSummary` interface definition (from Phase 8) — it's now defined inline above, with the added `orgId?` field.

---

### 3. `src/app/components/ui/ChatListDrawer.tsx` — TARGETED EDITS

**3a. Update the caller** to match the new signature. Find:
```ts
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToMyChannels(userId, setChannels);
    return unsub;
  }, [userId]);
```
Replace with:
```ts
  const { orgs } = useOrgs();
  const ancestorOrgIds = useMemo(
    () => getAncestorOrgIds(orgs, userOrgId),
    [orgs, userOrgId],
  );

  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToMyChannels(userId, ancestorOrgIds, setChannels);
    return unsub;
  }, [userId, ancestorOrgIds]);
```
Add imports:
```ts
import { useMemo } from "react";
import { useOrgs } from "../../hooks/useSupabaseData";
import { getAncestorOrgIds } from "../../../lib/supabaseService";
```
Add a new prop `userOrgId?: string` to the component's props type, alongside the existing `userId`/`userName`.

**3b. Visually group standing channels separate from task chats.** Find where the channel list renders (the `.map((c) => (...))` over `channels` inside the `!activeChannelId` branch). Split it into two labeled groups instead of one flat list:

```tsx
{channels.filter((c) => c.orgId).length > 0 && (
  <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-neutral-400 bg-neutral-50">
    Standing Channels
  </div>
)}
{channels
  .filter((c) => c.orgId)
  .map((c) => (
    /* same button JSX already used for channel rows */
  ))}
{channels.filter((c) => !c.orgId).length > 0 && (
  <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-neutral-400 bg-neutral-50">
    Task Chats
  </div>
)}
{channels
  .filter((c) => !c.orgId)
  .map((c) => (
    /* same button JSX already used for channel rows */
  ))}
```
Reuse the exact same row markup that already exists — this is a filter/grouping change, not a new row design.

---

### 4. `src/app/components/Layout/SidebarDemo.tsx` — ONE PROP ADDITION

Find the `ChatListDrawer` mount added in Phase 8:
```tsx
        {user?.id && <ChatListDrawer userId={user.id} userName={userProfile?.fullName} />}
```
Add the new prop:
```tsx
        {user?.id && (
          <ChatListDrawer
            userId={user.id}
            userName={userProfile?.fullName}
            userOrgId={userProfile?.departmentId}
          />
        )}
```

---

## PART B — RICH SUBMISSION EDITOR

### Context

Confirmed directly: the submission note field (`SubmitForReviewModal` in `MondayBoard.tsx`) is a plain `<textarea>` bound to `note`/`onNoteChange` props. Those props don't change — `note` stays a string, `onNoteChange` still takes a string. What changes is **what kind of string** — HTML from a rich text editor instead of plain text — so this is a self-contained swap of what renders inside the modal, not a data-model change. The `latest_submission.note` field from Phase 5 already accepts any string; no SQL changes needed for this part at all.

Two authoring modes, matching what was actually asked for: a formatting toolbar (bold/italic/lists) for normal notes, and a simple editable grid for quick tabular data — not real spreadsheet functionality, just rows and cells. Both modes ultimately produce an HTML string through the same `onNoteChange` callback, so `SubmissionDetails` (which renders the note back) only needs one rendering path for both.

---

### 5. PACKAGES TO INSTALL

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/pm dompurify
npm install -D @types/dompurify
```

---

### 6. `src/app/components/ui/RichTextEditor.tsx` — NEW FILE

```tsx
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered } from "lucide-react";

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none px-3 py-2.5 text-[13px] min-h-[100px] focus:outline-none",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      <div className="flex items-center gap-1 border-b border-neutral-100 px-2 py-1.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded ${editor.isActive("bold") ? "bg-neutral-200" : "hover:bg-neutral-100"}`}
        >
          <Bold size={13} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded ${editor.isActive("italic") ? "bg-neutral-200" : "hover:bg-neutral-100"}`}
        >
          <Italic size={13} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded ${editor.isActive("bulletList") ? "bg-neutral-200" : "hover:bg-neutral-100"}`}
        >
          <List size={13} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded ${editor.isActive("orderedList") ? "bg-neutral-200" : "hover:bg-neutral-100"}`}
        >
          <ListOrdered size={13} />
        </button>
      </div>
      <EditorContent editor={editor} />
      {!value && <div className="px-3 pb-2 text-[11px] text-neutral-300 pointer-events-none -mt-8">{placeholder}</div>}
    </div>
  );
}
```

---

### 7. `src/app/components/ui/SimpleTableEditor.tsx` — NEW FILE

```tsx
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export function SimpleTableEditor({ onChange }: { onChange: (html: string) => void }) {
  const [rows, setRows] = useState<string[][]>([
    ["", ""],
    ["", ""],
  ]);

  const emitHtml = (data: string[][]) => {
    const html = `<table style="border-collapse:collapse;width:100%">${data
      .map(
        (row) =>
          `<tr>${row.map((cell) => `<td style="border:1px solid #e5e5e5;padding:4px 8px;">${cell}</td>`).join("")}</tr>`,
      )
      .join("")}</table>`;
    onChange(html);
  };

  const updateCell = (r: number, c: number, value: string) => {
    const next = rows.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row));
    setRows(next);
    emitHtml(next);
  };

  const addRow = () => {
    const next = [...rows, rows[0].map(() => "")];
    setRows(next);
    emitHtml(next);
  };

  const addCol = () => {
    const next = rows.map((row) => [...row, ""]);
    setRows(next);
    emitHtml(next);
  };

  const removeRow = (idx: number) => {
    if (rows.length <= 1) return;
    const next = rows.filter((_, i) => i !== idx);
    setRows(next);
    emitHtml(next);
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-2">
      <table className="w-full border-collapse">
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c} className="border border-neutral-200 p-0">
                  <input
                    value={cell}
                    onChange={(e) => updateCell(r, c, e.target.value)}
                    className="w-full px-2 py-1.5 text-[12px] outline-none"
                  />
                </td>
              ))}
              <td className="w-6 text-center">
                <button onClick={() => removeRow(r)} className="text-neutral-300 hover:text-red-500">
                  <Trash2 size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-3 mt-2">
        <button onClick={addRow} className="text-[11px] flex items-center gap-1 text-neutral-500 hover:text-neutral-800">
          <Plus size={11} /> Row
        </button>
        <button onClick={addCol} className="text-[11px] flex items-center gap-1 text-neutral-500 hover:text-neutral-800">
          <Plus size={11} /> Column
        </button>
      </div>
    </div>
  );
}
```

---

### 8. `src/app/components/ui/MondayBoard.tsx` — TARGETED EDITS

**8a. Imports.** Add:
```ts
import DOMPurify from "dompurify";
import { RichTextEditor } from "./RichTextEditor";
import { SimpleTableEditor } from "./SimpleTableEditor";
```

**8b. Add mode state to `SubmitForReviewModal`.** Find:
```ts
  const fileRef = useRef<HTMLInputElement>(null);
```
Add directly after it:
```ts
  const [noteMode, setNoteMode] = useState<"write" | "table">("write");
```

**8c. Replace the note field.** Find this exact block:
```tsx
          <div>
            <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
              Completion Note (required)
            </label>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Summarize what was completed, results, or evidence details..."
              className="mt-1 w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-[13px] text-neutral-900 outline-none focus:border-neutral-400"
            />
          </div>
```
Replace with:
```tsx
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                Completion Note (required)
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setNoteMode("write")}
                  className={`text-[10px] px-2 py-0.5 rounded-full ${noteMode === "write" ? "bg-neutral-900 text-white" : "text-neutral-400 hover:bg-neutral-100"}`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setNoteMode("table")}
                  className={`text-[10px] px-2 py-0.5 rounded-full ${noteMode === "table" ? "bg-neutral-900 text-white" : "text-neutral-400 hover:bg-neutral-100"}`}
                >
                  Table
                </button>
              </div>
            </div>
            {noteMode === "write" ? (
              <RichTextEditor
                value={note}
                onChange={onNoteChange}
                placeholder="Summarize what was completed, results, or evidence details..."
              />
            ) : (
              <SimpleTableEditor onChange={onNoteChange} />
            )}
          </div>
```

**8d. Render the note as HTML in `SubmissionDetails`.** Find this exact block:
```tsx
      {submission.note && (
        <div className="text-[11px] text-neutral-700 mt-0.5">
          Note: {submission.note}
        </div>
      )}
```
Replace with:
```tsx
      {submission.note && (
        <div
          className="text-[11px] text-neutral-700 mt-0.5 [&_p]:m-0 [&_table]:text-[10px] [&_ul]:pl-4 [&_ol]:pl-4"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(submission.note) }}
        />
      )}
```

---

## SELF-VERIFICATION — RUN THIS BEFORE DECLARING THE PHASE COMPLETE

- [ ] Did you confirm Phase 8's tables/trigger actually exist in Supabase before running this phase's SQL?
- [ ] Does every organization (existing ones via backfill, new ones via trigger) have exactly one `chat_channels` row with `channel_type = 'org'`?
- [ ] Can a user in a section read/post in their own section's channel AND their parent department's channel, without a `chat_channel_members` row existing for either — verified by actually testing it, not just reading the RLS policy?
- [ ] Does `subscribeToMyChannels` now take three arguments everywhere it's called, and does `ChatListDrawer` compute `ancestorOrgIds` via `getAncestorOrgIds` before calling it?
- [ ] Does the channel list visually separate Standing Channels from Task Chats?
- [ ] Does `SubmitForReviewModal`'s `note`/`onNoteChange` prop interface remain completely unchanged — is the swap entirely internal to what renders?
- [ ] Does switching between Write and Table mode not lose data typed in the other mode in a way that breaks submission — reasonable behavior is fine either way (e.g., last mode's content wins), verify it doesn't crash or submit empty content instead.
- [ ] Is `DOMPurify.sanitize()` actually applied before `dangerouslySetInnerHTML`, not just imported and unused?
- [ ] Does the project still build with no new errors introduced?

---

## TESTING CHECKLIST

- [ ] Log in as an employee in a section under LEDIPO → open the chat icon → confirm you see both a "Section" standing channel AND a "LEDIPO" standing channel under "Standing Channels"
- [ ] Send a message in the section channel → log in as a different employee in a DIFFERENT section (same LEDIPO parent) → confirm they do NOT see that section's channel, but DO see the shared LEDIPO channel with the message
- [ ] Log in as the BPLO-level dept head → confirm they see BPLO's own channel plus every LEDIPO/section channel beneath it
- [ ] Create a brand new organization via the Super Admin org tree builder → confirm a standing channel for it appears immediately without needing a manual step
- [ ] Open a task submission modal → Write mode shows a formatting toolbar, bold/italic actually work
- [ ] Switch to Table mode → add a row and a column, type into cells → switch back to Write mode and back to Table → confirm no crash (data loss on mode-switch is acceptable, a crash is not)
- [ ] Submit with Table mode active → open the task as the reviewer → the submission note renders as an actual HTML table, not raw `<table>` tag text
- [ ] Submit with bold/italic text in Write mode → reviewer sees it rendered bold/italic, not literal `<strong>` tags as text