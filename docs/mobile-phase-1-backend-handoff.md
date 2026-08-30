# eFlow mobile Phase 1: evidence-security fix and unblock checklist

Prepared: August 31, 2026. Audience: web/backend owner and mobile developer.

## Status — read this first

This package contains a **database-side evidence-security migration**, not a completed mobile Phase 1 release. It has **not been applied to the shared Supabase project by this task**. Do not report the blocker as cleared until the deployment and real-user tests below pass.

- Full SQL: [`20260831000001_task_evidence_security.sql`](../supabase/migrations/20260831000001_task_evidence_security.sql).
- Local database regression runner: [`verify-task-evidence-sql.mjs`](../scripts/verify-task-evidence-sql.mjs).
- This replaces the earlier chat-only hotfix. Use the entire migration; do not combine fragments from the chat.
- No mobile or web screen code, application routes, existing RPC signatures, or gateway endpoints are changed by this package.
- Source checkout inspected/tested: `7b072123a20876940be84217dbb6af3ad8d2700f`.
- SQL SHA-256: `38615808bf4cf6c7e6220ad4477d56155d5c25fedc0e2610823a8e4b5b184c4c`.
- The new migration is not committed by this task; record its eventual commit SHA separately before handoff/deployment. The source-checkout SHA above is not a migration deployment receipt.

The report dated August 29 correctly identifies a broad file-access policy. Other items in that report are unverified integration/acceptance gates, not demonstrated failures of every backend feature. UI/navigation development can continue while the security deployment is being validated.

### Observed deployment facts

Read-only Storage API checks against the web project's `ixnfphgjyelhckjwjkdv` configuration found:

| Bucket | Observed state |
| --- | --- |
| `task-attachments` | Exists; private; size limit 52,428,800 bytes (50 MiB); no MIME allowlist configured |
| `task-files` | Does not exist |

The mobile developer must confirm whether their linked non-production project is this same project. These observations are **bucket configuration checks**, not user authorization tests. Administrative credentials bypass RLS and cannot demonstrate that employee access is correct.

The earlier SQL failed because it incorrectly required both buckets. The new migration requires only `task-attachments`. It tolerates absent `task-files`; if that legacy bucket exists, it must be private. Do not create an unused legacy bucket merely to satisfy a check.

## 1. What the SQL fixes

1. Removes `taskfiles_rw` and both versions of the earlier chat policies.
2. Installs restrictive guards so another permissive Storage policy cannot reopen the evidence buckets for ordinary clients. Unrelated buckets are unaffected.
3. Allows new uploads only in `task-attachments`, using the authenticated uploader's identity and the existing task/subtask path formats. `task-files`, if present, is legacy read/controlled-cleanup only.
4. Checks the active profile, effective Task Leader or actual subtask assignment, and open work state. Malformed paths fail closed without UUID-cast errors.
5. Validates persisted evidence against a real Storage object, its uploader, task, subtask, and submission attempt. Fake paths and another person's upload cannot be attached. File size/type are taken from Storage metadata, not the submission JSON.
6. Limits new finalized evidence to the file types and sizes returned by `get_task_evidence_rules()`, and to ten files per submission. Subtask submissions require at least one validated file; parent-task evidence remains optional to preserve the existing contract.
7. Uses database triggers around the existing submission/progress RPCs, preserving their lifecycle, audit, notification, and prerequisite logic. It prevents appending attachments from a later transaction to an old submission.
8. Makes evidence bindings/history immutable to clients while allowing existing review-decision fields to change through the existing authorization layer.
9. Records durable seals for existing references. Files remain protected even if an administrator subsequently removes a workflow row. It does not delete, move, rename, or retroactively reject legacy files based on new MIME/size rules.
10. Adds a race-safe cleanup claim RPC. A permanent cleanup claim prevents later submission or path reuse; a finalized seal prevents cleanup. Both operations take the same per-path transaction lock.
11. Makes new subtask review/progress routing prefer `assigned_to`, with `recommendation_lead_id` used only when the assigned leader is null. Existing pending submissions retain their stored reviewer; they are not silently reassigned.

### What this does not claim to solve

- It does not prove every deployed RLS policy, workflow RPC, notification, or Realtime publication is correct.
- It does not reconcile migration history, provide test credentials, implement missing mobile screens, or certify Android/iOS behavior.
- It does not schedule an orphan-cleanup worker or change existing client cleanup calls. Those small integration tasks are described below.
- MIME metadata is a declared media type, not malware scanning or byte-level content verification. If content scanning is required, add a separate trusted scanning/quarantine workflow.
- Short signed URLs are a client/backend signing contract. SQL policies cannot enforce the `expiresIn` value passed to Supabase's signing API. Use a trusted signing endpoint if a hard maximum is required.
- File read access follows the existing `can_see_task` contract plus the actual subtask assignee/reviewer. Existing authorized project/organization oversight is preserved. Excluding those already-authorized readers would be a separate access-policy decision; do not silently redefine it on mobile.

## 2. Backend owner: deployment sequence

1. Confirm the exact shared **non-production** project reference with mobile. Do not guess from a local `.env` or a report.
2. Take an appropriate backup and compare the deployed evidence tables, RPCs, helper functions, triggers, and policies with the agreed source baseline. Empty migration history is not proof of an empty database.
3. Inspect existing `task-attachments` configuration. Keep it private. Configure its size limit at **50 MiB or lower** and its MIME allowlist to match `get_task_evidence_rules()` using Supabase Storage settings/API. Do not widen a stricter existing limit without an explicit decision.
4. Review the migration's new limits and the compatibility work in section 4. Coordinate a short evidence-upload rollout window if users are actively uploading/submitting while clients are being updated.
5. Apply the **whole** SQL migration through the agreed deployment process. It is transactional and rerunnable. Do not run `fresh_schema.sql` over the existing database; do not blindly push all unrecorded migrations or reset the project.
6. If the migration reports one evidence path referenced by multiple tasks, or a reference that contradicts its canonical task/subtask path, stop and audit those references. Do not remove the check or assign ownership arbitrarily. Example diagnostic for cross-task duplicates:

   ```sql
   with refs as (
     select file_path as path, task_id from public.task_attachments
     union all
     select file_path, task_id from public.subtask_submission_attachments
     union all
     select attachment_path, task_id from public.subtask_progress_updates
   )
   select path, array_agg(distinct task_id) as task_ids
   from refs
   where nullif(path, '') is not null
   group by path having count(distinct task_id) > 1;
   ```

7. Inspect the results without using service-role reads as proof of employee access:

   ```sql
   select id, public, file_size_limit, allowed_mime_types
   from storage.buckets where id in ('task-attachments', 'task-files');

   select policyname, permissive, roles, cmd, qual, with_check
   from pg_policies where schemaname = 'storage' and tablename = 'objects'
     and (policyname like 'eflow_evidence_%' or policyname = 'taskfiles_rw');

   select public.get_task_evidence_rules();

   -- Existing references with missing physical-object metadata need a separate
   -- retention/repair decision; this migration does not invent replacement files.
   select bucket_id, object_name, task_id
   from eflow_evidence.objects
   where legacy and object_id is null;
   ```

8. Perform the real-user tests in section 6 against the actual Storage API and existing RPCs. Record project reference, migration filename, commit SHA, deployment time, identities/relationships (not passwords), and test outcomes.
9. Reconcile migration history only after matching actual deployed definitions to source. Keep the resulting deployment record in the backend repository. Do not blindly use `migration repair`, `db push`, or `db reset`.

The migration introduces private `eflow_evidence.objects` and `eflow_evidence.attempts` tables. Do not expose that schema through PostgREST. It is an internal sealing/cleanup ledger, not a mobile query surface. New public RPCs are `get_task_evidence_rules()` and `claim_task_evidence_cleanup(text,text)`; regenerate mobile database types after applying the migration.

## 3. Shared evidence contract

### Upload paths and fields

| Workflow | Bucket | Object name |
| --- | --- | --- |
| Parent submission | `task-attachments` | `<task-uuid>/<submission-uuid>/<unique-filename>` |
| Subtask submission | `task-attachments` | `subtasks/<subtask-uuid>/<submission-uuid>/<unique-filename>` |
| Subtask progress | `task-attachments` | `subtasks/<subtask-uuid>/progress/<unique-filename>` |

Generate the submission UUID **before** uploading, and pass that same UUID as `p_submission.id`. Generate a fresh unique object name for every file; use `upsert: false`. The current web timestamp/sanitized-name convention remains accepted; mobile should prefer a random UUID prefix to avoid collisions. Display filenames may be retained separately in `fileName`.

Submission payload fields remain `id`, `note`, and `attachments`; attachment fields remain `fileName`, `filePath`, `fileSize`, and `mimeType`. Progress still uses `p_attachment_path` and `p_attachment_name`. Do not send a signed URL as `filePath`. Do not reuse a progress file path as submission evidence: upload a new object under the submission UUID.

`get_task_evidence_rules()` is the source of the new acceptance limits:

- Nonempty files, maximum 52,428,800 bytes each (50 MiB).
- Maximum ten files per submission; at least one for a subtask submission.
- Allowed formats include PDF, selected raster images/HEIC/HEIF, plain text/CSV, Word/Excel/PowerPoint formats, and the explicitly listed audio/video types. Read the exact MIME strings from the RPC. HTML, SVG, executables, and arbitrary `application/octet-stream` are not accepted.
- Recommended signed-link lifetime: 300 seconds. Current web readers use 300 and 600 seconds; align them before claiming a uniform lifetime. Do not persist signed URLs as canonical evidence references.

An empty/incorrect native picker MIME type must be normalized from a supported file format or rejected with a useful message. Do not simply label arbitrary files as PDF to bypass validation. Keep bearer tokens and signed URLs out of logs and analytics.

## 4. Small client integration required — web owner AND mobile developer

This migration keeps the main upload/progress/submission calls, but deliberately changes the cleanup contract. Existing direct `Storage.remove()` calls will no longer delete an unclaimed object. Update the failure-cleanup helper in both clients:

```ts
async function cleanUpOwnUnsubmittedEvidence(path: string) {
  const { data: claimed, error: claimError } = await supabase.rpc(
    'claim_task_evidence_cleanup',
    { p_object_name: path, p_bucket_id: 'task-attachments' },
  );
  if (claimError) throw claimError;
  if (!claimed) return; // Object already absent; no removal needed.

  const { error: removeError } = await supabase.storage
    .from('task-attachments')
    .remove([path]);
  if (removeError) throw removeError;
}
```

The claim and removal are intentionally **two sequential requests**. Never fire them in parallel. Never remove first. A successful claim is permanent even if the network fails before removal; retry removal at the same path, and use a new path for any future upload.

If a submission request times out, its outcome is unknown. First reconcile using its submission UUID. If it actually committed, preserve the evidence. The cleanup RPC also rejects finalized files, protecting against a concurrent submission. Do not mask the original workflow error with a secondary cleanup error; show the workflow error and record a non-sensitive cleanup failure for retry.

Existing web cleanup callers to update during integration:

- `src/app/features/tasks/services/taskReviewLifecycleService.ts` (`submitTaskForReview`).
- `src/app/features/subtasks/services/subtaskWorkflowService.ts` (`saveSubtaskProgress`, `submitSubtaskForReview`).

Also add client size/type/count validation using the rules RPC, align signed-link lifetime, and test the retained HTTP/RPC payloads. These are bounded upload-helper changes, not new screens or a new approval process. They are documented here but **not implemented by this SQL/documentation package**.

## 5. Backend owner: orphan-cleanup worker

Interrupted apps can leave uploads behind without ever running client cleanup. A scheduled trusted worker is still needed for the complete handoff:

1. Enumerate candidate objects only in the evidence bucket, with a conservative age cutoff of at least 24 hours. Paginate and use small batches.
2. For each exact path, call `claim_task_evidence_cleanup` with server-only service credentials. The RPC enforces the minimum age for worker calls and rejects finalized/referenced files.
3. Only after a successful claim, delete that exact path through the Storage API. Keep the tombstone; do not clear it to recycle names.
4. If deletion fails, retry the same claimed path. Do not let one failure stop the entire batch. Alert on unexpected identity mismatches or repeated failures.
5. Never delete directly from `storage.objects`, never blanket-empty a bucket, and never put the service-role key in web/mobile code. A cleanup RPC result is an authorization decision, not evidence that the actual file was removed.

No cleanup schedule or worker is installed by this migration. The existing trusted backend or an Edge Function can host it; a new standalone API server is not inherently required.

## 6. Joint acceptance tests — actual user JWTs, not service-role access

Provide non-production identities for an assigned contributor, effective Task Leader, primary reviewer, backup reviewer, unrelated employee, stale recommended lead, inactive profile, missing profile, and a self-review collision. Seed real task/subtask relationships. Transfer credentials securely, never in this Markdown file or source control.

| Case | Required outcome |
| --- | --- |
| Assigned contributor uploads and saves progress | Success; evidence readable by authorized readers; original notification behavior retained |
| Assigned contributor submits subtask | Success with real evidence; correct assigned Task Leader receives review notice |
| Effective Task Leader submits parent | Allowed after all subtasks are approved; existing reviewer route retained |
| Stale `recommendation_lead_id` differs from `assigned_to` | Does not grant upload/parent-submit authority or supersede the assigned lead |
| Unrelated employee lists/downloads/signs another task's evidence | Denied, including direct Storage API calls |
| Inactive/missing-profile/anonymous access | Denied |
| Forged path, foreign task/attempt, other uploader, nonexistent object | Submission rejected and all workflow writes rolled back |
| Unsupported MIME, empty/oversized file, 11 files | Rejected; valid files within limits still work |
| Attempt appended to in a later request | Rejected |
| Overwrite/move submitted evidence | Denied |
| Delete submitted file or change its evidence binding | Denied |
| Cleanup owned temporary upload | Claim succeeds, then API removal succeeds; other users denied |
| Submit races with cleanup | Exactly one may claim the path; no finalized evidence is removed |
| Claim succeeds but removal request fails | Retry safe; tombstoned path cannot be reused |
| Submission commits but client loses response | Reconciliation finds the attempt; cleanup cannot delete finalized files |
| Retained legacy evidence | Still readable by authorized users; not overwritten/rebound/deleted by clients |
| Unrelated bucket operations | Existing behavior unchanged |
| Primary/backup review, wrong reviewer, self-review | Existing RPCs enforce the intended allowed/denied matrix |

For Realtime, verify deployed publication membership separately and perform a live two-client probe: employee submits on mobile, leader sees the notification/review update on web, and the unrelated account sees neither protected row nor event. Check notifications, announcements/audiences/expiry, comments, and related-project access with their actual policies. Source definitions or generated types alone are not proof.

## 7. Mobile developer: work that can continue now

The report says only the P1.1 data/contract foundation is delivered. These remain mobile responsibilities, not SQL fixes:

- P1.2: Work, Reviews, Inbox, and guarded detail routes.
- P1.3: My Tasks, My Subtasks, Work I Am Leading, deadlines, and details.
- P1.4: Progress forms, native file normalization, uploads/cleanup, submission and error handling.
- P1.5–P1.6: Subtask and parent reviewer inboxes and decisions.
- P1.7: Notifications, announcements, task comments, and foreground Realtime.
- P1.8: End-to-end, accessibility/privacy, offline/reconnect, and Android/iOS acceptance.

Build layouts, navigation, loading/error states, and mocked workflows while backend validation proceeds. Do not ship unsafe evidence integration or claim end-to-end completion before the gate passes.

Native acceptance must include sign-in, cold-session restoration, token refresh, sign-out/account-switch cache clearing, invalid profiles failing closed, protected deep links, picker URI/MIME handling, keyboard/safe areas, and reconnect behavior. Successful export builds and unit tests are not device acceptance.

Review upstream changes from the recorded `508aabc` baseline to the teammate's reported `7b07212` snapshot before updating the mobile compatibility baseline. The report's seven-commit drift is an as-of observation, not a claim about today's remote HEAD. Record relevant contract changes; do not treat unrelated web styling changes as automatic mobile blockers.

## 8. Completion record

Before calling the backend blocker cleared, attach a short record containing:

- [ ] Exact non-production project confirmed by both developers.
- [ ] Migration filename and committed SHA; actual application confirmed.
- [ ] Existing schema/history reconciled or explicitly documented with verified definitions.
- [ ] Private bucket and upload limits confirmed through Storage configuration.
- [ ] Mobile types regenerated; paths/payloads/rules aligned.
- [ ] Web/mobile cleanup helpers updated to claim-before-remove.
- [ ] Worker owner, schedule, retry/alert behavior, and deletion tests recorded.
- [ ] Real-user allow/deny, immutability, and race tests passed.
- [ ] Web-to-mobile/mobile-to-web notification and Realtime probes passed.
- [ ] Remaining mobile screens and native acceptance tracked separately.

### Validation of this package

Run `node scripts/verify-task-evidence-sql.mjs` for the isolated PostgreSQL harness. It starts its own temporary **localhost-only** cluster, uses synthetic identities and Storage metadata, loads the repository's actual submission/progress RPC definitions, and tests the new migration. It never reads `.env` or connects to the shared Supabase database. `EFLOW_TEST_PG_BIN` can select an installed PostgreSQL binary directory.

This proves database behavior in that fixture, not the deployed schema or the actual Storage service. The live API/device tests above remain required. Repository checks: `npm run check`, `npm test`, `npm run build`. Record actual results rather than assuming success.

Results recorded while preparing this package (August 31, 2026):

| Check | Result |
| --- | --- |
| Isolated PostgreSQL 17 migration and RPC tests | Passed, including rerun with absent `task-files`, file ownership/bindings, limits, immutable history, cleanup claims, and two-connection cleanup/finalization races in both orders |
| `npm run check` | Failed in unchanged app code: missing `@vibe/core`, `@vibe/icons`, `frappe-gantt` declarations and associated type errors |
| `npm test` | 56 test files passed, 32 failed; 169 tests passed and one failed. Most failed suites could not import existing UI/font dependencies. The executed failure was the existing `financialReviewSwitch` test expecting lowercase `budget` when the button is `Budget`. |
| `npm run build` | Failed resolving the existing `@vibe/core/tokens` import in `src/main.tsx` |
| Live Supabase Storage/RPC authorization and mobile device tests | Not run; migration not deployed by this task |
| Playwright smoke | Not run; `EFLOW_E2E`/an authenticated test environment was not configured, and the frontend dependency/build failures remain |

No existing application source, package manifest, or lockfile was changed for this package. The UI dependency/test failures are separate checkout issues, not evidence that the SQL regression suite failed. They still need resolution before an overall web release can be certified.

## References

- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control): policies control Storage operations; service credentials bypass RLS.
- [Supabase object ownership](https://supabase.com/docs/guides/storage/security/ownership): use `owner_id`; administrative uploads may have no user owner.
- [Supabase Storage schema](https://supabase.com/docs/guides/storage/schema/design) and [object deletion](https://supabase.com/docs/guides/storage/management/delete-objects): delete real files through the Storage API, not metadata-only SQL deletion.
