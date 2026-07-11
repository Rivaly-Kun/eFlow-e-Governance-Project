# Implementation Plan: Fully Functional Personal Settings

## Goal

Replace the current display-only Settings sidebar with one working, role-independent personal settings area. Every setting in scope must load from Supabase for the signed-in user, apply immediately where appropriate, and persist after refresh and a new login.

This is personal account settings only. It must not let a user change their role, organization, employee ID, workload, or another user's data.

## Scope and explicit exclusions

Build these four settings pages:

1. **Profile** — display name and profile photo.
2. **Appearance** — Light, Dark, or System theme.
3. **Notifications** — opt in/out of task-related email notifications.
4. **Security** — change password after re-entering the current password.

Do **not** add, retain, or leave empty navigation for:

- Integrations
- Time zone
- Default notifications

Do not add speculative controls that have no visible behavior or database persistence.

## Current-state findings

- The global Settings icon in `SidebarDemo.tsx` changes `activeSection` to `settings`, but role content components do not render a real Settings page for that section.
- `ProfilePage.tsx` currently renders one long profile screen. It can save `full_name`, update a password without re-authentication, and toggle email notifications, but it initializes that toggle to `true` instead of loading the stored preference.
- `profiles.email_notifications_enabled` is already used by the frontend and FastAPI notification sender. It should be retained and made reliable rather than replaced.
- The existing `profiles` table does not currently have a profile-photo path, and there is no persisted appearance preference.

## UX and routing

### 1. Replace the Settings sidebar content

In `src/app/components/Layout/SidebarDemo.tsx`, replace the current Settings content with exactly these direct items, in this order:

| Label | Settings route key | Purpose |
| --- | --- | --- |
| Profile | `Profile` | Name and photo |
| Appearance | `Appearance` | Light/Dark/System theme |
| Notifications | `Notifications` | Task email preference |
| Security | `Security` | Password change |

Remove the `Workspace` settings section, its dropdown, and the Integration item entirely. In particular, remove the visible labels **Theme settings**, **Time zone**, **Default notifications**, and **Integrations**.

### 2. Add a single settings dispatcher

Create `src/app/components/Settings/SettingsContent.tsx` as the canonical settings surface for every role. It receives `activePage?: string`, resolves `Profile` as the default, and renders one of four small page components.

Update `TwoLevelSidebar` so that `activeSection === "settings"` renders `SettingsContent` before the normal role-specific content branching. This is what prevents the global Settings icon from opening an empty pane for Department Heads, Employees, and other roles.

Update the Employee dashboard's `Profile & Settings` route to render `SettingsContent` with Profile selected. Remove or refactor `Employee/ProfilePage.tsx` so there is only one implementation of profile settings.

### 3. Shared settings behavior

- Use a page-level loading state while profile and preference data are fetched.
- Use per-action saving states; disable only the control currently saving.
- Show an inline success or error result next to the relevant form, never a false success.
- Keep unsaved form values intact when an unrelated realtime profile update arrives.
- Do not use `localStorage` as the source of truth. It may cache the last-applied theme to avoid a flash, but Supabase remains authoritative and reconciles after login.

## Functional settings pages

### Profile

**Fields and actions**

- Editable display name (`profiles.full_name`), trimmed and validated as non-empty.
- Profile-photo preview with initials as the fallback.
- Upload photo action: JPEG, PNG, or WebP only; maximum 2 MB; crop is explicitly out of scope unless an existing cropper is already available.
- Replace photo action and Remove photo action, both persisted.
- Read-only identity information: email, employee ID, office/section, and role.

**Avatar handling**

- Store only the object path in the database, not a public or signed URL.
- Use one deterministic object path per user: `user-id/avatar.<extension>`. Replacing a photo overwrites or first removes the previous object.
- Generate a short-lived signed URL only when rendering the current user's image.
- On removal, delete the storage object and set `profiles.avatar_path` to `NULL`. The initials fallback must reappear immediately.
- Validate MIME type and file size in the browser, then rely on Storage policies as the authorization boundary.

### Appearance

Provide exactly three radio-button choices:

- **System** (default): follow `prefers-color-scheme`.
- **Light**: force the light palette.
- **Dark**: force the dark palette.

On selection:

1. Apply the selected theme immediately to `document.documentElement` using the existing `dark` class convention.
2. Persist the selected value in `user_preferences.theme`.
3. Update the in-memory settings state only after a successful database save; if saving fails, restore the previous applied theme and show an error.

Implement a small `ThemeProvider` or `UserPreferencesProvider` mounted inside the authenticated app. It loads once per signed-in user, applies the stored preference on app entry, listens to OS preference changes only while the stored choice is `system`, and resets on logout.

Ensure the main app shell, sidebars, cards, inputs, and settings components have dark-mode tokens/classes; a toggle that only changes the root class but leaves major UI areas white is incomplete.

### Notifications

Retain one concrete per-user preference only: **Task email notifications**.

- Load the switch from `profiles.email_notifications_enabled` rather than defaulting it to `true`.
- Save it immediately with an optimistic UI only if errors are rolled back correctly; otherwise disable while saving.
- The existing FastAPI notification sender must continue to read this same field before sending task emails.
- In-app notifications remain part of the product and are not a user setting in this scope; do not add a duplicate default-notification configuration page.

### Security

Implement a password form with Current password, New password, and Confirm new password.

- Require the current password and re-authenticate with `supabase.auth.signInWithPassword` before calling `supabase.auth.updateUser`.
- Require a minimum of 8 characters and a confirmation match. If the project has a password policy configured in Supabase, surface its returned validation error as well.
- Clear all password fields after success or a failed submission; never save passwords in React state beyond the active form and never log them.
- Show a precise, non-sensitive error for an incorrect current password or expired session.
- Keep password changes in Supabase Auth only; do not create a passwords column or table.

## Database and Supabase migration

Create a dated migration under the repository's Supabase migration location (or establish `supabase/migrations/` if the project has none). Do not run these statements manually against production without applying the migration through the normal deployment process.

```sql
-- 1. Profile photo metadata. The storage object is private; only its path is stored.
alter table public.profiles
  add column if not exists avatar_path text;

-- Existing code already uses this column. Keep the migration safe for older databases.
alter table public.profiles
  add column if not exists email_notifications_enabled boolean not null default true;

-- 2. One personal preference row per profile.
create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme text not null default 'system'
    check (theme in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill existing users before the UI depends on a row being present.
insert into public.user_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- Keep future rows available without relying on a first settings save.
create or replace function public.create_default_user_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_default_user_preferences_after_profile_insert on public.profiles;
create trigger create_default_user_preferences_after_profile_insert
after insert on public.profiles
for each row execute function public.create_default_user_preferences();

create or replace function public.set_user_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row execute function public.set_user_preferences_updated_at();

alter table public.user_preferences enable row level security;

create policy "users read own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "users insert own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "users update own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Before applying the migration, inspect existing profile RLS policies and the `guard_self_profile_update` trigger. Extend the allowed self-service field list to `full_name`, `avatar_path`, and `email_notifications_enabled` only. It must still reject `role`, `org_id`, `employee_id`, `workload`, `burnout_level`, and `is_active` updates by the user.

## Supabase Storage setup

Create a **private** `profile-avatars` bucket. Define Storage policies that allow an authenticated user to select, insert, update, and delete only objects whose first path segment equals `auth.uid()`. For this scope, only the owner needs to read their avatar; team-directory avatars can continue using initials until a separate authorized sharing requirement exists.

Use a migration or an idempotent provisioning script to create the bucket and policies. Confirm the project’s existing Storage policies before adding policy names so migrations do not fail on duplicate names.

## Frontend data layer

### Types

Update `src/app/types.ts`:

- Add `avatar_path: string | null` to `UserProfile` plus the existing app’s camelCase compatibility alias if the auth context uses one.
- Add a `UserPreferences` interface with `user_id`, `theme`, `created_at`, and `updated_at`.
- Add a `ThemePreference` union: `'light' | 'dark' | 'system'`.

### Services

Add `src/app/services/userSettingsService.ts` (or extend `src/lib/supabaseService.ts` consistently) with narrowly scoped functions:

- `fetchUserPreferences(userId)`
- `upsertUserPreferences(userId, { theme })`
- `updateOwnProfile(userId, { full_name?, avatar_path? })` — preserve the server-side whitelist.
- `updateEmailPreference(userId, enabled)` — retain and reuse the existing backend column.
- `uploadProfileAvatar(userId, file)`
- `removeProfileAvatar(userId, avatarPath)`
- `getProfileAvatarUrl(avatarPath)` returning a signed URL or `null`.

Every Supabase call must check and throw its `error`. Avatar upload must clean up a newly uploaded object if the subsequent profile update fails.

### Auth and preference state

- Extend the authenticated profile mapping in `AuthContext.tsx` so `avatar_path` and `email_notifications_enabled` from Supabase are exposed correctly.
- Introduce a provider/hook that owns the loaded `UserPreferences`, `theme`, `setTheme`, loading state, and save errors. It must refetch when the signed-in user changes and clear on logout.
- Update the current profile in memory after a name, avatar, or notification save so all visible header/avatar instances refresh without a full page reload.

## Implementation sequence

1. Add and apply the database migration, then create the private avatar bucket and validate RLS with a normal employee account.
2. Add types and the settings/profile-avatar service functions, including full error handling.
3. Add the preference/theme provider and confirm the root `dark` class is applied before rendering the authenticated shell as far as practical.
4. Build `SettingsContent` and its Profile, Appearance, Notifications, and Security pages.
5. Replace the settings sidebar navigation and dispatch `activeSection === 'settings'` to `SettingsContent` for every role.
6. Refactor the Employee `Profile & Settings` entry to use the same component; remove duplicate/unused profile settings code.
7. Update shared avatar display components to use the signed URL with initials fallback where the signed-in user's avatar is shown.
8. Run formatting, `npm run build`, and the manual verification checklist below.

## Verification checklist

### Profile and storage

- Upload a valid JPEG/PNG/WebP under 2 MB; confirm the preview updates and survives refresh and relogin.
- Reject an oversized or unsupported file without uploading it.
- Replace and remove the avatar; confirm the old storage object is inaccessible/deleted and initials return after removal.
- Change display name; confirm it updates in the settings page and sidebar/account UI after refresh.
- Attempt a direct client update of `role` or `org_id` as a normal user; verify RLS/trigger denies it.

### Appearance

- Choose Light, Dark, and System; verify each changes the whole app, not only the settings page.
- Refresh and sign out/in; verify the stored choice returns from Supabase.
- With System selected, change the OS color preference and verify the app follows it.
- Simulate a failed preference save and verify the previous theme is restored with an error message.

### Notifications and security

- Verify the email toggle initially reflects `profiles.email_notifications_enabled` and persists after refresh.
- Confirm the FastAPI sender skips emails when that preference is off and sends them when it is on.
- Try a wrong current password, a short password, and mismatched confirmation; each must fail safely.
- Change a password with valid current credentials; sign out and verify the new password works.

### Navigation and build

- Log in with Employee, Department Head, and Super Admin accounts. The global Settings icon must open the same functional settings UI for all three.
- Confirm the only settings items are Profile, Appearance, Notifications, and Security.
- Confirm no visible Time zone, Default notifications, Integrations, or empty settings pane remains.
- Run `npm run build` with no compilation errors.
