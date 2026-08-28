# Phase 02 — App Shell, Navigation & Authentication

## Goal

Replace the current visible application shell so the entire app immediately feels like a modern productivity product.

## Primary targets

- `src/app/features/app-shell/`
- `src/app/features/navigation/`
- compatibility shell under `src/app/components/Layout/SidebarDemo.tsx`
- login/loading/auth presentation
- notification/chat/tour/profile shell surfaces

## Product direction

Build a monday-like productivity shell:

- strong workspace/product identity
- left workspace navigation
- clear current section/page
- optional collapse
- global search entry
- notifications
- chat
- help/walkthrough
- user/account menu
- responsive shell behavior

Do not copy monday.com pixel-for-pixel.

## Vibe use

Prefer real Vibe components and Vibe icons.

## Preserve

- navigation section IDs
- current role visibility
- default destinations
- route/content dispatch
- quick login development behavior
- guided-tour entry points
- notification/chat/call behavior
- settings/profile/logout
- session security

## Remove/retire

After migration and repository search:
- old shell visual code
- old Carbon icon use in shell
- custom Lexend shell styling
- generated decorative shell artifacts with no remaining consumer

Do not remove business/navigation helpers.

## Responsive

Desktop:
- productivity sidebar + broad work canvas

Tablet:
- collapsible navigation

Mobile:
- intentional navigation drawer/sheet
- no crushed desktop sidebar

## Acceptance

The shell alone should visibly signal:

> This is a modern work-management product.

STOP before Projects.
