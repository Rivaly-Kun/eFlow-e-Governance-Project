# eFlow — Super Admin: Org Tree Builder & User Management
## Claude Code Prompt

---

## PROJECT CONTEXT

You are building the **Super Admin panel** of **eFlow** — a web-based e-governance project and task management system for LEDIPO (Local Economic Development and Investment Promotion Office) under the BPLO department of LGU Ormoc City, Philippines.

This is a **rewrite from Firebase RTDB to Supabase (PostgreSQL)**. The existing codebase uses Firebase — you are replacing the data layer entirely with Supabase while keeping all UI patterns, fonts, and component styles identical.

**Do not touch:** `src/firebase.ts`, the LLM server connection (`llmService`), or any components outside of SuperAdmin.

---

## TECH STACK

- React 18 + Vite + TypeScript
- Tailwind CSS v4
- shadcn/ui components (already installed)
- `@xyflow/react` (React Flow v12) — for the org tree builder
- `@dagrejs/dagre` — for auto top-down tree layout
- `@supabase/supabase-js` v2
- Font: `Lexend` (already loaded) — use `font-['Lexend:Regular',_sans-serif]`, `font-['Lexend:Medium',_sans-serif]`, `font-['Lexend:SemiBold',_sans-serif]`
- Neutral color palette: neutral-50 through neutral-900 (Tailwind)
- Existing UI components to reuse: `DataTable`, `Modal`, `ModalButton`, `FormField`, `TextInput`, `SelectInput`, `Toast/useToast` — all in `src/app/components/ui/`

---

## STEP 0 — RUN THIS SQL IN SUPABASE FIRST

```sql
-- Enable ltree extension for hierarchical paths
CREATE EXTENSION IF NOT EXISTS ltree;

-- ─── Organizations (the dynamic org tree) ────────────────────────
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  parent_id   UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  path        LTREE UNIQUE NOT NULL,
  org_type    TEXT NOT NULL CHECK (org_type IN ('lgu','department','division','section','unit')),
  description TEXT DEFAULT '',
  head_user_id UUID,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON organizations USING GIST(path);
CREATE INDEX ON organizations (parent_id);
CREATE INDEX ON organizations (is_active);

-- ─── Profiles (replaces Firebase /users) ─────────────────────────
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  email        TEXT NOT NULL UNIQUE,
  employee_id  TEXT UNIQUE,
  org_id       UUID REFERENCES organizations(id),
  role         TEXT NOT NULL DEFAULT 'employee' CHECK (role IN (
                 'super_admin','dept_head','team_leader','employee'
               )),
  skills       JSONB DEFAULT '{}',
  workload     INTEGER DEFAULT 0 CHECK (workload >= 0 AND workload <= 100),
  burnout_level TEXT DEFAULT 'low' CHECK (burnout_level IN ('low','medium','high')),
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON profiles (org_id);
CREATE INDEX ON profiles (role);

-- ─── System Config ────────────────────────────────────────────────
CREATE TABLE system_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_config (key, value) VALUES
  ('ai_endpoint', 'http://localhost:8321'),
  ('ai_model',    'deepseek-r1:8b'),
  ('app_version', '2.0.0');

-- ─── Seed root organization ───────────────────────────────────────
INSERT INTO organizations (name, slug, parent_id, path, org_type, description)
VALUES ('Ormoc City Government', 'lgu_ormoc', NULL, 'lgu_ormoc', 'lgu', 'Root LGU node');

-- ─── RLS Policies ────────────────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read organizations
CREATE POLICY "orgs_read_all" ON organizations FOR SELECT USING (TRUE);
-- Only super_admin can write organizations
CREATE POLICY "orgs_write_super_admin" ON organizations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Users can read all profiles
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT USING (TRUE);
-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
-- Super admin can do everything with profiles
CREATE POLICY "profiles_super_admin" ON profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Only super admin can read/write system_config
CREATE POLICY "config_super_admin" ON system_config FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
```

---

## FILES TO CREATE / MODIFY

### 1. `src/lib/supabase.ts`
Supabase client singleton.

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
```

---

### 2. `src/app/types.ts`
Replace existing types with these. Keep existing Task, Project, TaskSubmission types but update UserProfile and add Organization.

```ts
export type UserRole = 'super_admin' | 'dept_head' | 'team_leader' | 'employee';

export type OrgType = 'lgu' | 'department' | 'division' | 'section' | 'unit';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  path: string;            // ltree path e.g. "lgu_ormoc.bplo.ledipo"
  org_type: OrgType;
  description: string;
  head_user_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed client-side:
  children?: Organization[];
  member_count?: number;
}

export interface UserProfile {
  id: string;             // UUID from auth.users
  full_name: string;
  email: string;
  employee_id: string;
  org_id: string | null;
  role: UserRole;
  skills: Record<string, boolean>;
  workload: number;
  burnout_level: 'low' | 'medium' | 'high';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined:
  org_name?: string;
}

export interface SystemConfig {
  key: string;
  value: string;
}
```

---

### 3. `src/lib/supabaseService.ts`
All Supabase reads/writes. Components never import supabase directly.

Implement these functions:

**Organizations:**
```ts
// Fetch entire org tree (flat list, client builds tree)
fetchAllOrgs(): Promise<Organization[]>

// Add new org node — auto-computes path from parent
createOrg(data: {
  name: string;
  slug: string;        // auto-generated from name if not provided: name.toLowerCase().replace(/\s+/g, '_')
  parent_id: string | null;
  org_type: OrgType;
  description?: string;
}): Promise<Organization>

// Path computation logic:
// If parent is null: path = slug
// If parent exists: fetch parent.path, then path = parent.path + '.' + slug
// Ensure slug is unique: if slug exists append _2, _3 etc

updateOrg(id: string, data: Partial<Organization>): Promise<void>
deleteOrg(id: string): Promise<void>  // block if has children OR has assigned users
assignOrgHead(orgId: string, userId: string | null): Promise<void>

// Realtime subscription to organizations
subscribeToOrgs(callback: (orgs: Organization[]) => void): () => void
```

**Profiles:**
```ts
fetchAllProfiles(): Promise<UserProfile[]>

createProfile(data: {
  full_name: string;
  email: string;
  password: string;     // use supabase.auth.admin.createUser
  role: UserRole;
  org_id?: string;
  employee_id?: string;
}): Promise<UserProfile>

updateProfile(id: string, data: Partial<UserProfile>): Promise<void>
assignUserToOrg(userId: string, orgId: string | null): Promise<void>
toggleUserActive(id: string, is_active: boolean): Promise<void>

subscribeToProfiles(callback: (profiles: UserProfile[]) => void): () => void
```

**System Config:**
```ts
fetchConfig(key: string): Promise<string | null>
updateConfig(key: string, value: string): Promise<void>
fetchAllConfig(): Promise<SystemConfig[]>
```

---

### 4. `src/hooks/useSupabaseData.ts`
React hooks wrapping the service subscriptions. Mirror the pattern of the old `useFirebaseData.ts`:

```ts
export function useOrgs(): { orgs: Organization[]; loading: boolean }
export function useProfiles(): { profiles: UserProfile[]; loading: boolean }
export function useDashboardMetrics(): { metrics: DashboardMetrics; loading: boolean }
```

The `useOrgs` hook returns a flat list. The tree builder component handles tree construction client-side.

---

### 5. `src/contexts/AuthContext.tsx`
Replace Firebase Auth with Supabase Auth. Keep the same interface the rest of the app expects:
- `user` — current user
- `userProfile` — fetched from profiles table
- `signIn(email, password)`
- `signOut()`
- `createManagedUser(email, password, profileData)` — creates auth user + profile row
- `resetPassword(email)`
- `loading`

---

### 6. `src/app/components/SuperAdmin/OrgTreeBuilder.tsx`
**This is the main deliverable.** A full-screen React Flow canvas for building the org tree visually.

#### Layout
```
┌─────────────────────────────────────────────┬────────────────────┐
│  TOOLBAR: [+ Add Root Dept] [Auto Layout]   │  USERS PANEL       │
│  [Zoom In] [Zoom Out] [Fit View]            │  ──────────────────│
├─────────────────────────────────────────────│  Search: [______]  │
│                                             │                    │
│   REACT FLOW CANVAS                         │  ┌──────────────┐  │
│                                             │  │ 👤 John Doe  │  │
│   ┌─────────────────┐                      │  │ Employee     │  │
│   │ 🏛 LGU Ormoc   │  ← root, no delete   │  │ Unassigned   │  │
│   └────────┬────────┘                      │  └──────────────┘  │
│            │                               │  ┌──────────────┐  │
│   ┌────────▼────────┐                      │  │ 👤 Jane Smith│  │
│   │ 🏢 BPLO         │                      │  │ Dept Head    │  │
│   └────────┬────────┘                      │  │ → LEDIPO     │  │
│            │                               │  └──────────────┘  │
│   ┌────────▼────────┐                      │                    │
│   │ 📂 LEDIPO       │  ← right-click menu  │  Unassigned: 3     │
│   └──────┬──────┬───┘                      │  Assigned: 12      │
│     ┌────▼┐  ┌──▼────┐                     │                    │
│     │SecA │  │ SecB  │                     │  [+ Create User]   │
│     └─────┘  └───────┘                     │                    │
└─────────────────────────────────────────────┴────────────────────┘
```

#### Custom Node Component `OrgNode`
Each node is a card with:
- **Icon** based on org_type: lgu=🏛 department=🏢 division=📂 section=📁 unit=📄
- **Name** in `font-['Lexend:SemiBold',_sans-serif]` text-[13px]
- **Type badge**: pill showing org_type with color:
  - lgu: bg-slate-800 text-white
  - department: bg-blue-600 text-white
  - division: bg-indigo-500 text-white
  - section: bg-violet-500 text-white
  - unit: bg-purple-400 text-white
- **Member count**: small neutral badge bottom-right e.g. "4 members"
- **Head name**: if head_user_id set, show name in text-[10px] text-neutral-500
- **Handle TOP**: target handle (receives connection from parent)
- **Handle BOTTOM**: source handle (connects to children)
- **Selected state**: ring-2 ring-blue-500
- **Min width**: 160px, rounded-xl, bg-white border border-neutral-200 shadow-sm p-3
- **Root node** (lgu type): bg-slate-900 text-white, cannot be deleted

#### Right-Click Context Menu
On right-click of a **node**, show a floating menu:
```
┌─────────────────────┐
│ + Add child dept    │
│ ✏ Edit              │
│ 👤 Assign head      │
│ ─────────────────── │
│ 🗑 Delete           │  ← disabled if has children or members
└─────────────────────┘
```

On right-click of **canvas (empty space)**:
```
┌─────────────────────┐
│ + Add department    │
└─────────────────────┘
```

Context menu is a fixed-position div that closes on click-outside or Escape.

#### Add/Edit Org Modal
Fields:
- Name (required)
- Org Type (select: department/division/section/unit — lgu is root-only)
- Description (optional textarea)
- Parent (auto-filled, but changeable via dropdown showing all orgs)

Slug is auto-generated from name: `name.toLowerCase().replace(/[^a-z0-9]+/g, '_')`

#### Auto Layout with Dagre
Use `@dagrejs/dagre` to layout nodes top-down (rankdir: 'TB', ranksep: 80, nodesep: 40).
Call auto-layout:
- On initial load
- After adding/deleting a node
- When user clicks "Auto Layout" button

#### Drag Users from Panel to Nodes
The right-side Users Panel shows all profiles as draggable cards.
When a user card is **dragged and dropped onto an org node**:
- Call `assignUserToOrg(userId, orgId)`
- Show toast: "John Doe assigned to LEDIPO"
- Update the node's member count badge immediately

Users Panel shows:
- Search input (filter by name/email/role)
- Each user: avatar initials, name, role badge, current org (or "Unassigned" in neutral-400)
- Counts at bottom: "Unassigned: X | Assigned: Y"
- [+ Create User] button opens create user modal

Use HTML5 drag-and-drop (`draggable`, `onDragStart`, `onDrop`). Pass userId via `dataTransfer.setData('userId', id)`.

---

### 7. `src/app/components/SuperAdmin/UserManagement.tsx`
Keep the same UI as existing — DataTable with columns: Name/Email, Role, Org, Workload, Status, Actions. 

**Changes from existing:**
- Replace `useUsers` / `useDepartments` with `useProfiles` / `useOrgs`
- `departmentId` → `org_id`, lookup org name from orgs list
- Role options: `super_admin`, `dept_head`, `team_leader`, `employee` only (remove executive/legislative/hrmo/finance/councilor_pad)
- Assign org via dropdown of all active organizations
- Keep same RoleBadge, StatusBadge, WorkloadBar visual components
- Same Lexend font patterns throughout

---

### 8. `src/app/components/SuperAdmin/SystemSettings.tsx`
Simple settings page for super admin:
- AI Endpoint URL field (reads/writes `system_config` key `ai_endpoint`)
- AI Model field (`ai_model`)
- [Save] button with toast feedback
- Show current app version

Same UI patterns: white card, Lexend, neutral palette.

---

### 9. `src/app/components/SuperAdmin/SuperAdminContent.tsx`
Update section map to include new pages:

```ts
const sections = {
  dashboard: DashboardOverview,
  org_tree: OrgTreeBuilder,       // NEW — rename "Departments" → "Org Structure"
  users: UserManagement,
  settings: SystemSettings,       // Update from placeholder
}
```

Sidebar label: rename "Departments" → "Org Structure", icon: sitemap or hierarchy icon.

---

## BEHAVIOR RULES

1. **Dynamic — no strict order**: Admin can create orgs first then add users, OR create users first then drag them into orgs. Both flows work independently and can be mixed.

2. **Delete protection**: Cannot delete an org node if it has child nodes OR has users assigned. Show error toast explaining why.

3. **Root node protection**: The LGU root node cannot be deleted, renamed org_type, or disconnected. It can only be renamed.

4. **Path integrity**: When an org is moved (parent changed), recalculate its ltree path AND all descendant paths recursively.

5. **Realtime**: Both the org tree canvas and the users panel update in realtime via Supabase subscriptions. If another admin adds a node, it appears on your canvas automatically.

6. **Loading states**: Show skeleton or spinner while initial data loads. Never show empty tree while loading.

7. **Error handling**: All Supabase errors caught and shown via `useToast`. Never let errors silently fail.

8. **Slug uniqueness**: Before inserting, check if slug exists. If collision, append `_2`, `_3` etc automatically.

---

## ENVIRONMENT VARIABLES NEEDED

Add to `.env`:
```
VITE_SUPABASE_URL=https://ixnfphgjyelhckjwjkdv.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_s0LWw094r4gy5BoYqKFOSw_bU8qChg0
```

⚠️ This is a **Vite** project — use `VITE_` prefix, NOT `NEXT_PUBLIC_`. Vite only exposes vars prefixed with `VITE_` to the client.

---

## PACKAGES TO INSTALL

```bash
npm install @supabase/supabase-js @xyflow/react @dagrejs/dagre
npm install -D @types/dagre
```

---

## EXISTING PATTERNS TO MATCH EXACTLY

**Font classes** (copy these exactly, do not use generic font-sans):
- Body: `font-['Lexend:Regular',_sans-serif]`
- Medium: `font-['Lexend:Medium',_sans-serif]`  
- SemiBold: `font-['Lexend:SemiBold',_sans-serif]`

**Text sizes**: text-[10px], text-[11px], text-[12px], text-[13px], text-[20px]

**Button pattern** (primary):
```
px-4 py-2.5 rounded-lg bg-neutral-900 text-white text-[12px] font-['Lexend:Medium',_sans-serif] font-medium hover:bg-neutral-800 cursor-pointer transition-colors
```

**Breadcrumb pattern**:
```tsx
<div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
  Super Admin <span className="mx-1.5">/</span> <span className="text-neutral-700">Org Structure</span>
</div>
```

**Card pattern**:
```
bg-white rounded-xl border border-neutral-200 overflow-hidden
```

**Section header with action**:
```
flex items-center justify-between mb-6
h2: font-['Lexend:SemiBold',_sans-serif] font-semibold text-[20px] text-neutral-900
```

---

## START HERE

1. Install packages
2. Create `src/lib/supabase.ts`
3. Create `src/app/types.ts` (updated)
4. Create `src/lib/supabaseService.ts` (full service layer)
5. Create `src/hooks/useSupabaseData.ts`
6. Update `src/contexts/AuthContext.tsx` for Supabase Auth
7. Build `OrgTreeBuilder.tsx` (this is the main feature)
8. Update `UserManagement.tsx`
9. Build `SystemSettings.tsx`
10. Update `SuperAdminContent.tsx`

Build in this order. Each step depends on the previous.
