# Vibe Implementation Standard

## Real library usage

Use the official Vibe Design System as an actual dependency.

Do not create fake "monday-like" CSS while keeping the previous component system as the primary UI.

Expected dependencies:

- `@vibe/core`
- `@vibe/icons`

Optional when supported by the development environment:
- `@vibe/mcp`

## Required root setup

Follow the installed Vibe version's official requirements.

At minimum verify:

```ts
import "@vibe/core/tokens";
```

and global:

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

## Typography

Vibe's official documentation recommends Figtree, Poppins, and Roboto.

For this overhaul, prefer **Figtree** as the primary application font unless repository constraints or visual testing reveal a concrete problem.

Do not mix Lexend, system fonts, Vibe defaults, and arbitrary feature-specific fonts.

One app = one primary type family.

## ThemeProvider

Use Vibe's real `ThemeProvider` when product theming is required.

eFlow may customize eligible Vibe product-theme tokens for:
- eFlow primary/brand accents
- semantic government/workflow colors
- light/dark system themes if dark mode remains supported

Do not override random internal selectors when a supported Vibe token/theme API exists.

## Direct component usage

Prefer direct imports from `@vibe/core`.

Exact component names and exports must be verified against the installed Vibe version.

## Do not create pointless wrappers

Avoid:
- `VibeButton`
- `VibeTable`
- `MondayCard`
- `MondayBadge`
- `EFlowVibeButton`

when they only rename a Vibe primitive.

Create an eFlow component only when it adds real domain meaning or a stable product contract.

Good custom examples:
- `TaskStatus`
- `ProjectHealth`
- `ReviewState`
- `TaskWorkRow`
- `ProjectWorkspaceHeader`
- `EvidenceSubmissionPanel`

## eFlow semantics over Vibe primitives

Vibe owns presentation primitives.

eFlow owns meaning.

Example:

`TaskStatus`
→ maps persisted eFlow status
→ renders a Vibe `Label` / `Chips`
→ exposes accessible human-readable state

The semantic component must not decide authorization.

## Table standard

Use Vibe's real Table family for productivity tables where suitable.

Vibe Table supports:
- row sizes
- borders
- header functionality
- loading
- horizontal/vertical scroll
- virtualized scroll
- sticky columns
- highlighted rows

The table is a major foundation for:
- Projects
- Task Board
- My Work
- Reviews
- Users
- Audit
- Reports
- specialist records

## Layout code

Tailwind may remain temporarily for:
- layout
- spacing
- responsive composition

but should stop acting as an independent visual design system.

Prefer Vibe tokens and component APIs for product appearance.

## Icons

Prefer `@vibe/icons` for migrated product UI.

Do not mix Carbon, Lucide, MUI icons, and Vibe icons in the same migrated surface unless a specific icon is genuinely missing.

## Accessibility

Use Vibe's documented accessibility behavior.

If a Vibe component already implements accessible focus/keyboard behavior, do not replace it with a custom clickable div.

## Design-system removal target

By the end of the overhaul:
- Vibe is the primary UI component system.
- eFlow retains domain/workflow components.
- old generated/shadcn/Radix/MUI presentation primitives are removed when no longer consumed.
