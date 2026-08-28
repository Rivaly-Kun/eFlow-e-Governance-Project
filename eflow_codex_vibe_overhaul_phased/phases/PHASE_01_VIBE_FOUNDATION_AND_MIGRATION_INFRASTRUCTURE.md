# Phase 01 — Vibe Foundation & Migration Infrastructure

## Goal

Make real Vibe the new primary UI system without prematurely breaking unmigrated screens.

## Tasks

### 1. Install Vibe

Install the current compatible Vibe 4 packages:

- `@vibe/core`
- `@vibe/icons`

Do not install Vaadin for this overhaul.

If Vaadin was introduced only by abandoned design experiments and has no required product consumer, remove it after verifying the diff.

### 2. Root Vibe setup

Import Vibe tokens from the application root following official Vibe docs.

Ensure global `box-sizing: border-box`.

### 3. Typography

Adopt Figtree as the primary product font using a reliable loading strategy.

Remove new hardcoded Lexend use from migrated surfaces.

Do not break legacy screens purely to force typography before they are migrated.

### 4. ThemeProvider

Add Vibe ThemeProvider at the appropriate application-provider boundary.

Define a restrained eFlow product theme using supported Vibe theming APIs.

Do not recreate a second full token system.

Use Vibe tokens as the main presentation foundation.

### 5. Migration inventory

Create a code inventory of:
- old custom UI primitives
- Radix wrappers
- MUI imports
- Carbon icons
- Lucide icons
- old theme CSS
- generated Figma components/styles
- custom table/card/button/dialog systems

Classify:
- migrate now
- migrate with feature phase
- keep because not presentation
- final cleanup

### 6. Vibe proof

Create a development/test proof using real Vibe components such as:
- Button
- IconButton
- Table
- Label/Chips
- TextInput
- Tooltip
- Dialog
- EmptyState
- Tabs
- Avatar

Verify tokens, theme, keyboard behavior, and build.

Remove temporary proof UI from production if not needed.

## Do not

- redesign all pages
- delete legacy CSS yet
- uninstall all old UI dependencies yet
- change routes/business logic

## Acceptance

- real Vibe installed
- ThemeProvider/tokens active
- Figtree strategy established
- no runtime conflict
- migration inventory complete
- tests/build pass

STOP.
