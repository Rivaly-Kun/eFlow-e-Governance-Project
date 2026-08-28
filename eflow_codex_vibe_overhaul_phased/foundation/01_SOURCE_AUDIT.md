# Source Audit — GitHub Baseline

## eFlow repository

Repository:

`Rivaly-Kun/eFlow-e-Governance-Project`

Baseline tree:

`508aabc8881630b37a62a973645ecb0bb386e99e`

## Product architecture observed

eFlow is already a large role-based work-management application with:

- React
- TypeScript
- Vite
- Supabase
- FastAPI gateway
- feature-owned modules under `src/app/features/`
- role-specific workspaces
- Projects / Project Command Workspace
- Tasks / Subtasks
- Reviews
- Team management
- Reports
- Announcements
- Administration
- AI proposal decomposition
- interdepartment governance
- budget flows
- specialist role workspaces

This is not a greenfield frontend.

## Existing presentation stack observed

The GitHub baseline includes multiple presentation systems and libraries:

- Tailwind CSS v4
- a shadcn-like CSS variable theme
- Radix UI packages
- CVA / clsx / tailwind-merge
- MUI / Emotion dependencies
- Carbon icons
- Lucide icons
- custom `src/app/components/ui/*`
- custom workflow primitives
- generated/imported Figma-oriented styling
- direct Tailwind styling in many feature components

`src/styles/index.css` currently imports:

- Tailwind
- `tw-animate-css`
- `default_theme.css`
- `globals.css`

`globals.css` currently owns generic application variables such as:
- background
- foreground
- primary
- secondary
- card
- popover
- radius
- sidebar
- chart colors
- dark-mode compatibility overrides

## Existing shell

`AuthenticatedApp` renders the shared application frame through the current `SidebarDemo`/`Frame760` shell.

That shell contains significant custom visual implementation:
- custom logo handling
- custom collapsible sidebar
- direct Tailwind styling
- Carbon icons
- hardcoded/custom typography classes
- notification/chat/tour/profile composition

The shell behavior and navigation contracts are valuable.
The shell appearance is not sacred.

## Current design-system guideline file

`guidelines/Guidelines.md` is still effectively a template in the GitHub baseline.

This overhaul pack should become the actual source of UX/UI direction for Codex.

## Vibe repository

Official repository:

`mondaycom/vibe`

Vibe is the official monday.com React design system.

Official installation:

`npm install @vibe/core`

Root token import:

`import "@vibe/core/tokens";`

Components are imported from:

`@vibe/core`

Icons are available through:

`@vibe/icons`

The current Vibe repository also provides:
- ThemeProvider
- Table
- Tabs
- Buttons
- IconButton
- Chips
- Labels
- Menus
- Tooltips
- Dialogs
- Empty State
- Layout primitives
- Skeletons/loaders
- typography
- virtualized grids/lists
- many other work-management primitives

## Vibe version guidance

At the time this pack was generated, Vibe's `master` package reports `@vibe/core` 4.5.22 and React peer support `>=16.9.0`.

Do not blindly pin this historical number.

At implementation time:
1. inspect current `package.json`
2. check the current maintained Vibe 4 release
3. install the current compatible Vibe 4 version
4. record the exact installed version in the phase report

## Vibe MCP

The official Vibe repository provides `@vibe/mcp`.

When the Codex environment supports MCP, prefer connecting the official Vibe MCP because it can provide:
- public component discovery
- component metadata
- examples
- accessibility guidance
- icons
- tokens

If MCP is unavailable, inspect the installed package and official repository/docs directly.
