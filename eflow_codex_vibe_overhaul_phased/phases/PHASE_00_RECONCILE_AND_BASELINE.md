# Phase 00 — Reconcile Local State & Establish Baseline

## Goal

Before any new overhaul work, determine what is actually in the local working tree.

The GitHub pack was authored against `origin/main` snapshot:

`508aabc8881630b37a62a973645ecb0bb386e99e`

Local work may contain later design experiments.

## Tasks

1. Run:
   - `git status`
   - `git branch --show-current`
   - `git rev-parse HEAD`
   - `git diff --stat`
   - `git diff`
   - compare current HEAD with `origin/main`

2. Classify local differences:
   - business logic
   - backend/data
   - tests
   - design-only
   - dependency experiments
   - generated/unrelated files

3. Do NOT discard functional/business changes.

4. If previous Vibe/Vaadin/dashboard experiments exist locally:
   - identify them
   - preserve useful business architecture
   - remove/revert only obsolete design experiments when safe
   - report before destructive cleanup

5. Run baseline:
   - install dependencies using repository lockfile/package manager
   - `npm run check`
   - `npm test`
   - `npm run build`

6. Record:
   - exact test file count
   - passed/failed/skipped tests
   - current known failures
   - current package versions
   - current UI dependencies

## Deliverable

A baseline report only.

Do not begin Phase 01 until approved.
