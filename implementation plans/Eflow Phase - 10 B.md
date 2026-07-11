    # eFlow — Phase 10B: Cleanup + Team Leader Power Features
    ## Implementation Directive — Single-Pass Execution

    ---

    ## NON-NEGOTIABLES — READ BEFORE ANYTHING ELSE

    - **Executive, Legislative, HRMO, Finance, and Councilor roles/components/routes are completely out of scope.** Do not touch, trim, hide, or "blank out" anything under those roles. They're being preserved for future use — leave every file, every registry entry, every route exactly as it is today.
    - Every removal in Part A must be verified reachable/traced before deletion — this file flags exactly where three overlapping navigation registries need tracing, not guessing.
    - Do not touch `EmployeeTaskBoard`'s task-filtering logic, `DeptHeadContent`'s page map, or anything already confirmed clean in this document.
    - Before reporting complete, run the SELF-VERIFICATION section at the end.

    ---

    ## CONTEXT

    Investigation this session resolved the "employees see everything, no filter" report: it's not a regression. `EmployeeTaskBoard`'s filter (`assigneeId === userProfile.uid || teamMemberIds.includes(uid)`) is intact and correct, verified directly. The actual cause: 10 of 12 tabs under the Employee "Workspace" section, plus the entire "empfin" and "achievement" sections, are Figma-era mockups running on a hardcoded `TASKS_SEED` array with zero Supabase connection — sitting right next to the real, correctly-scoped "Active Tasks" tab with plausible-sounding names ("Context-Aware Reminders," "One-Tap Complete"). Anyone clicking one of those sees fake, unfiltered placeholder data and reasonably concludes something's broken. `DeptHeadContent`'s page map was checked too and is completely clean — all 4 entries map to real components, nothing to remove there.

    One wrinkle worth knowing before touching anything: `roleNavConfigs.employee` (the top icon-rail registry) currently has exactly ONE nav item — `workspace`. That means `empfin`, `achievement`, and possibly `settings` may not be reachable through the icon rail at all today, which would make them already-orphaned rather than actively-misleading. Part A below requires tracing this precisely rather than assuming.

    ---

    ## PART A — REMOVE DEAD UI (Admin, DeptHead, Employee only)

    ### A1. `src/app/components/Employee/EmployeeContent.tsx`

    **Trace before deleting.** Before removing anything, confirm the actual current reachability of each `employeePages` top-level key (`workspace`, `empfin`, `achievement`, `settings`) by checking:
    1. Does `roleNavConfigs.employee.navItems` (in `SidebarDemo.tsx`) have an entry for each key? Confirmed: it currently only has `workspace`.
    2. Is there a second, more detailed sidebar-section registry (also in `SidebarDemo.tsx`, structured with `title`/`sections`/`items` rather than a flat nav list) that provides an alternate path to `empfin`/`achievement`/`settings`? Trace this before assuming any of these three are unreachable.
    3. **`settings` (Profile & Account) must remain reachable after this cleanup, however it currently gets there.** This is real, working Phase 5 functionality — don't let it become orphaned as a side effect of removing the decoy sections around it. If tracing reveals it's ONLY reachable via some mechanism tied to `empfin`/`achievement`'s continued existence, that mechanism needs to be preserved or re-pointed, not deleted along with them.

    **Remove these entries from `employeePages.workspace`:**
    - `"Context-Aware Reminders"` → `ActiveTasks`
    - `"One-Tap Complete"` → `ActiveTasks`
    - `"Daily Stand-Up Input"` → `DailyStandUp`
    - `"Text Update"` → `DailyStandUp`
    - `"Voice Note"` → `DailyStandUp`
    - `"Auto-Transcription"` → `DailyStandUp`
    - `"Mobile & Viber Integration"` → `ViberIntegration`
    - `"Viber Account Linking"` → `ViberIntegration`
    - `"Keyword Notifications"` → `ViberIntegration`
    - `"Remote DB Updates"` → `ViberIntegration`

    Consolidate `"Active Tasks"` and `"GA-Delegated Assignments"` (both currently point to the same `EmployeeTaskBoard` component) down to just `"Active Tasks"` — remove the duplicate entry.

    **Remove the entire `empfin` key** and its 5 entries (all pointing to `LiquidationPortal` or `CashAdvanceRequests`) — confirmed never part of any real phase, no Supabase connection.

    **Remove the entire `achievement` key** and its 8 entries (all pointing to `TeamProgress` or `AICoaching`) — same status, confirmed decorative.

    **After removing these keys, also remove the now-dead component function definitions** (`ActiveTasks`, `DailyStandUp`, `ViberIntegration`, `LiquidationPortal`, `CashAdvanceRequests`, `TeamProgress`, `AICoaching`) from this file — but only after confirming via search that nothing else in the codebase imports or references them. Do not delete a component definition if anything else still points to it.

    **Update `employeeDefaultPages`** to remove the now-deleted `empfin`/`achievement` default-page entries, and confirm `workspace`'s default still correctly points to `"Active Tasks"`.

    ### A2. `src/app/components/Layout/SidebarDemo.tsx`

    Once A1's trace is complete, update `roleNavConfigs.employee` and the detailed sidebar-section registry to match the cleaned-up `employeePages` — remove any nav item or detailed-section entry that pointed to something just deleted, and confirm `settings` has a working path in whichever registry actually provides it.

    ### A3. Super Admin — apply the same audit, don't assume the same findings

    `DeptHeadContent` was checked directly and is clean. Employee was checked directly and had extensive decoy content. **Super Admin has not been checked this session** — apply the identical method (compare `superAdminPages`'-equivalent map against what's actually wired to real Supabase-backed components vs. static/seed-backed placeholders) before writing any removal list for it. Do not assume it mirrors either DeptHead (clean) or Employee (extensive decoys) without checking.

    ---

    ## PART B — TASKS TO LEAD + PINNED CHANNELS + MENTIONS

    ### Context

    Confirmed via the assignment modal's own logic (`isLead = draftLead === emp.id` → `assigneeId: resolvedLeadId`): `assigned_to` already IS "the lead," `team_member_ids` is the full roster including the lead. No schema change needed for the filter itself.

    ### B1. `src/app/components/TeamLeader/TeamLeaderContent.tsx` — NEW TAB

    Add a fourth tab alongside Task Board / Import Proposal / Team Workload:

    ```tsx
    const tasksTheyLead = useMemo(
    () => scopedTasks.filter((t) => t.assigneeId === userProfile?.uid),
    [scopedTasks, userProfile?.uid],
    );
    ```

    New tab button:
    ```tsx
    <TabButton
    active={tab === "leading"}
    onClick={() => setTab("leading")}
    icon={<Star size={14} />}
    label="Tasks to Lead"
    />
    ```

    Render the same `MondayBoard` component for this tab, but pass `tasks={tasksTheyLead}` instead of `scopedTasks` — everything else (role, employees, currentUserId) stays identical to the existing board tab.

    ### B2. Pinned channels — `src/app/services/chatService.ts`

    Extend `ChatChannelSummary`:
    ```ts
    export interface ChatChannelSummary {
    channelId: string;
    taskId?: string;
    orgId?: string;
    name: string;
    lastMessage?: string;
    lastMessageAt?: number;
    unread: boolean;
    isLeadOf?: boolean; // NEW — true if current user is assigned_to on this channel's task
    }
    ```

    In `subscribeToMyChannels`'s task-channel query, join through to the task's `assigned_to` and set `isLeadOf: task.assigned_to === userId` for each task-type channel summary. Org-type channels always get `isLeadOf: false` — leadership doesn't apply to standing channels.

    ### B3. `src/app/components/ui/ChatListDrawer.tsx` — Pinned section

    Add a third group above "Standing Channels" and "Task Chats":
    ```tsx
    {channels.filter((c) => c.isLeadOf).length > 0 && (
    <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-amber-600 bg-amber-50">
        Pinned — You're Leading
    </div>
    )}
    {channels.filter((c) => c.isLeadOf).map((c) => ( /* existing row markup */ ))}
    ```
    Exclude `isLeadOf` channels from the existing "Task Chats" group below so they don't render twice.

    ### B4. Mentions — `src/app/services/chatService.ts`

    New function:
    ```ts
    export async function sendMessageWithMentions(
    channelId: string,
    senderId: string,
    senderName: string,
    content: string,
    ): Promise<void> {
    await sendMessage(channelId, senderId, senderName, content);

    const mentionPattern = /@(\w+)/g;
    const mentioned = [...content.matchAll(mentionPattern)].map((m) => m[1]);
    if (mentioned.length === 0) return;

    const { data: members } = await supabase
        .from("chat_channel_members")
        .select("user_id, profiles(full_name)")
        .eq("channel_id", channelId);

    for (const name of mentioned) {
        const match = (members || []).find((m: any) =>
        m.profiles?.full_name?.toLowerCase().startsWith(name.toLowerCase()),
        );
        if (match && match.user_id !== senderId) {
        await createNotification(match.user_id, {
            type: "comment",
            title: "You were mentioned",
            message: `${senderName} mentioned you: "${content.slice(0, 80)}"`,
        });
        }
    }
    }
    ```

    Wire both `TaskChatSection` and `ChatListDrawer`'s send handlers to call this instead of the plain `sendMessage` — reuses the existing `createNotification` function from Phase 3, no new notification infrastructure needed.

    ---

    ## PART C — SUBTASK ASSIGNEE PICKER + UI POLISH

    Backend already supports this — `subtasks.assigned_to` column and `updateSubtask`'s `assignedTo` param have existed since Phase 4. Only the UI is missing.

    ### `src/app/components/ui/MondayBoard.tsx` — `TaskSubtasksSection`

    Add an employees prop (this component needs access to the same employee list already available elsewhere in the task editor):
    ```tsx
    function TaskSubtasksSection({ taskId, employees }: { taskId: string; employees: Employee[] }) {
    ```

    Add an assignee avatar/picker to each subtask row, next to the existing checkbox and delete button:
    ```tsx
    <div className="relative">
    <button
        onClick={() => setPickerOpenFor(st.id === pickerOpenFor ? null : st.id)}
        className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-500 text-[9px] flex items-center justify-center hover:bg-neutral-300 shrink-0"
    >
        {st.assignedTo
        ? employees.find((e) => e.id === st.assignedTo)?.initials || "?"
        : "+"}
    </button>
    {pickerOpenFor === st.id && (
        <div className="absolute z-10 top-6 right-0 bg-white rounded-lg border border-neutral-200 shadow-lg py-1 w-40 max-h-48 overflow-y-auto">
        {employees.map((e) => (
            <button
            key={e.id}
            onClick={() => {
                updateSubtask(st.id, { assignedTo: e.id });
                setPickerOpenFor(null);
            }}
            className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-neutral-50"
            >
            {e.name}
            </button>
        ))}
        </div>
    )}
    </div>
    ```

    Add `const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null);` near the component's other state. Pass `employees` in from wherever `<TaskSubtasksSection taskId={task.id} />` currently renders — the surrounding `TaskEditorModal` already has this list available.

    ---

    ## PART D — CHAT IDENTITY

    Confirmed still missing: sender names render as barely-visible text, zero avatar element anywhere.

    ### `src/app/components/ui/MondayBoard.tsx` (`TaskChatSection`) and `src/app/components/ui/ChatListDrawer.tsx` (thread view)

    In both message-rendering loops, add an avatar circle before non-mine messages, matching the initials-circle pattern already used everywhere else in the app (ProfilePage, TeamWorkloadView):

    ```tsx
    {!mine && (
    <div className="flex items-end gap-1.5">
        <div className="w-5 h-5 rounded-full bg-neutral-300 text-neutral-700 text-[8px] flex items-center justify-center shrink-0 font-['Lexend:SemiBold',_sans-serif]">
        {m.senderName?.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?"}
        </div>
        <div className="flex flex-col">
        <span className="text-[9px] text-neutral-400 mb-0.5">{m.senderName}</span>
        <div className={/* existing bubble classes */}>{m.content}</div>
        </div>
    </div>
    )}
    ```

    ---

    ## SELF-VERIFICATION — RUN THIS BEFORE DECLARING THE PHASE COMPLETE

    - [ ] Did you touch anything under Executive, Legislative, HRMO, Finance, or Councilor? (Must be no.)
    - [ ] Did you trace `settings`/Profile & Account's actual reachability before removing `empfin`/`achievement`, confirming it still works afterward?
    - [ ] Did you verify no other file imports `ActiveTasks`/`DailyStandUp`/`ViberIntegration`/`LiquidationPortal`/`CashAdvanceRequests`/`TeamProgress`/`AICoaching` before deleting their definitions?
    - [ ] Does the Super Admin audit exist as its own finding, not copy-pasted from Employee's or DeptHead's results?
    - [ ] Does "Tasks to Lead" filter strictly on `assigneeId === userProfile.uid`, not accidentally including team-member-only tasks?
    - [ ] Do pinned channels correctly exclude themselves from the regular "Task Chats" list below (no duplicate rendering)?
    - [ ] Does the mention-notification skip the case where someone mentions themselves?
    - [ ] Does the subtask assignee picker call the EXISTING `updateSubtask` function, not a new duplicate one?
    - [ ] Does the project still build with no new errors introduced?

    ---

    ## TESTING CHECKLIST

    - [ ] Log in as Employee → confirm the Workspace sidebar now shows only real, working tabs — no decoy content reachable anywhere
    - [ ] Confirm Profile & Account is still reachable and functional after the empfin/achievement removal
    - [ ] Log in as Team Leader assigned as lead on one task and support-only on another → "Tasks to Lead" shows only the first
    - [ ] That same lead task's GC appears in "Pinned — You're Leading"; the support-only task's GC appears in the regular list, not pinned
    - [ ] Send a message with `@FirstName` in a group channel → that person gets a real notification
    - [ ] Mention yourself in a message → confirm no self-notification fires
    - [ ] Open any task's subtasks → assign one to a specific employee → their initials show on that row, `updateSubtask` call confirmed in Supabase
    - [ ] Open any chat thread → every message from someone else now shows an avatar circle with their initials, not just a name label