# eFlow — Phase 2: Auth & RBAC
## Claude Code Implementation Prompt

---

## CONTEXT

Continuing the eFlow rewrite from Firebase to Supabase. Phase 1 (org tree, Supabase schema, super admin org UI) is complete. Phase 2 replaces Firebase Auth + Firebase RTDB user logic with Supabase Auth + Supabase profiles table.

**Supabase credentials already in .env:**
```
VITE_SUPABASE_URL=https://ixnfphgjyelhckjwjkdv.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_s0LWw094r4gy5BoYqKFOSw_bU8qChg0
```

**Supabase client already exists at:** `src/lib/supabase.ts`

**Do NOT touch:**
- `src/firebase.ts` (FCM still needs it later)
- Anything in `server/` (FastAPI server)
- Any component outside of Auth, App.tsx, and AuthContext
- The visual design of LoginPage.tsx — keep it pixel-perfect

---

## WHAT CHANGES IN PHASE 2

### Old roles (Firebase) → New roles (Supabase)
```
OLD                    NEW
────────────────────────────────
super_admin        →   super_admin
department_head    →   dept_head
employee           →   employee
executive          →   REMOVED
legislative        →   REMOVED
hrmo               →   REMOVED
finance            →   REMOVED
councilor_pad      →   REMOVED
```

Add new role: `team_leader` (between dept_head and employee)

### New role routing
```
super_admin   → superadmin panel
dept_head     → depthead panel
team_leader   → teamleader panel (same as depthead for now)
employee      → employee panel
```

---

## USER CREATION SECURITY

`createManagedUser` in the old system used a hack — it signed in as the new user to create them, then re-authenticated as admin. **Do NOT do this in Supabase.**

The correct approach: add a FastAPI endpoint that holds the Supabase service role key server-side. The React client calls this endpoint (protected by the existing AUTHKEY from Firebase RTDB) to create users.

**Add to `server/main.py`:**
```python
import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

@app.post("/controlpanelEflow/api/admin/users/create")
async def create_managed_user(payload: dict, authorized: bool = Depends(verify_auth)):
    """
    Create a Supabase auth user + profile row.
    Only callable with valid AUTHKEY header.
    payload: { email, password, full_name, role, org_id, employee_id }
    """
    try:
        # Create auth user
        auth_response = supabase_admin.auth.admin.create_user({
            "email": payload["email"],
            "password": payload["password"],
            "email_confirm": True,  # auto-confirm, no email verification needed
        })
        uid = auth_response.user.id

        # Insert profile
        supabase_admin.table("profiles").insert({
            "id": uid,
            "full_name": payload["full_name"],
            "email": payload["email"],
            "role": payload.get("role", "employee"),
            "org_id": payload.get("org_id"),
            "employee_id": payload.get("employee_id", ""),
            "is_active": True,
        }).execute()

        return {"uid": uid, "email": payload["email"]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/controlpanelEflow/api/admin/users/{uid}")
async def delete_managed_user(uid: str, authorized: bool = Depends(verify_auth)):
    """Delete auth user + profile (cascade deletes profile via FK)"""
    try:
        supabase_admin.auth.admin.delete_user(uid)
        return {"deleted": uid}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

**Add to `server/.env`:**
```
SUPABASE_URL=https://ixnfphgjyelhckjwjkdv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Install in server venv:**
```bash
server\.venv\Scripts\pip.exe install supabase --break-system-packages
```

---

## FILES TO CREATE / MODIFY

### 1. `src/contexts/AuthContext.tsx`
Full rewrite. Keep the exact same exported interface so no other component breaks.

**Keep these exports identical:**
```ts
interface AuthContextValue {
  user: SupabaseUser | null;         // was Firebase User
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role: UserRole, orgId?: string) => Promise<void>;
  createManagedUser: (
    newEmail: string,
    newPassword: string,
    profile: { full_name: string; role: UserRole; org_id?: string; employee_id?: string }
  ) => Promise<string>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}
```

Note: `createManagedUser` signature simplified — no more admin re-auth hack, no adminEmail/adminPassword params.

**Implementation details:**

```ts
// Auth state listener
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        // fetch profile from profiles table
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUserProfile(data);
      } else {
        // Check hardcoded super admin bypass
        if (/* bypass active */ false) return;
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    }
  );
  return () => subscription.unsubscribe();
}, []);

// login()
const login = async (email, password) => {
  // ─── HARDCODED BYPASS FOR TESTING (keep this) ───
  if (
    (email === 'admin' || email === 'admin@gmail.com' || email === 'admin@eflow.gov.ph') &&
    password === 'admin123'
  ) {
    const mockProfile: UserProfile = {
      id: 'SuperAdmin',
      full_name: 'Super Admin',
      email: 'admin@eflow.gov.ph',
      employee_id: 'ADMIN-000',
      org_id: null,
      role: 'super_admin',
      skills: {},
      workload: 0,
      burnout_level: 'low',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setUser({ id: 'SuperAdmin', email: 'admin@eflow.gov.ph' } as any);
    setUserProfile(mockProfile);
    setLoading(false);
    return;
  }
  // ─────────────────────────────────────────────────

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(mapSupabaseAuthError(error.message));

  // Check profile exists and is active
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', (await supabase.auth.getUser()).data.user!.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    throw new Error('No eFlow profile found. Contact your IT administrator.');
  }
  if (!profile.is_active) {
    await supabase.auth.signOut();
    throw new Error('Your account has been deactivated. Contact your IT administrator.');
  }
};

// createManagedUser() — calls FastAPI server
const createManagedUser = async (newEmail, newPassword, profileData) => {
  // Fetch auth key from LLM server (reuse existing pattern)
  const authKeyRes = await fetch(`${import.meta.env.VITE_LLM_BASE_URL}/authkey`);
  const { api_key } = await authKeyRes.json();

  const res = await fetch(`${import.meta.env.VITE_LLM_BASE_URL}/api/admin/users/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${api_key}`,
    },
    body: JSON.stringify({
      email: newEmail,
      password: newPassword,
      full_name: profileData.full_name,
      role: profileData.role,
      org_id: profileData.org_id || null,
      employee_id: profileData.employee_id || '',
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create user.');
  }

  const { uid } = await res.json();
  return uid;
};

// logout()
const logout = async () => {
  // Handle hardcoded bypass
  if (userProfile?.id === 'SuperAdmin') {
    setUser(null);
    setUserProfile(null);
    return;
  }
  await supabase.auth.signOut();
};

// resetPassword()
const resetPassword = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
};

// register() — only used in first-time setup
const register = async (email, password, fullName, role, orgId?) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(mapSupabaseAuthError(error.message));

  await supabase.from('profiles').insert({
    id: data.user!.id,
    full_name: fullName,
    email,
    role,
    org_id: orgId || null,
    is_active: true,
  });
};

// Error message mapper
function mapSupabaseAuthError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Invalid email or password.';
  if (msg.includes('Email not confirmed')) return 'Email not confirmed. Contact your administrator.';
  if (msg.includes('Too many requests')) return 'Too many attempts. Please try again later.';
  if (msg.includes('User already registered')) return 'An account with this email already exists.';
  if (msg.includes('Password should be')) return 'Password must be at least 6 characters.';
  return msg;
}
```

---

### 2. `src/app/components/Auth/LoginPage.tsx`

**One change only** — the first-time setup check.

Replace this Firebase RTDB check:
```ts
// OLD — reads Firebase RTDB
const snap = await get(ref(database, 'users'));
const hasSuperAdmin = Object.values(users).some(u => u.role === 'super_admin');
```

With this Supabase check:
```ts
// NEW — reads Supabase profiles
const { count } = await supabase
  .from('profiles')
  .select('*', { count: 'exact', head: true })
  .eq('role', 'super_admin')
  .eq('is_active', true);

setCanSetupAdmin(count === 0);
```

Remove the Firebase import from this file. Everything else stays identical — same design, same animations, same copy.

---

### 3. `src/app/App.tsx`

Update `mapFirebaseRoleToSidebar` → rename to `mapRoleToPanel` and update role map:

```ts
// OLD
import { seedRolesIfEmpty } from './services/seedRoles';
// Remove this import — no seeding needed in Supabase

function mapRoleToPanel(role: string): string {
  switch (role) {
    case 'super_admin':   return 'superadmin';
    case 'dept_head':     return 'depthead';
    case 'team_leader':   return 'teamleader'; // NEW
    case 'employee':      return 'employee';
    default:              return 'employee';
  }
}
```

Remove the `useEffect` that calls `seedRolesIfEmpty`.

Update `AppContent`:
```ts
function AppContent() {
  const { user, userProfile, loading } = useAuth();

  if (loading) return <LoadingSkeleton />;
  if (!user || !userProfile) return <LoginPage />;

  const panel = mapRoleToPanel(userProfile.role);
  return <Frame760 role={panel} />;
}
```

---

### 4. `src/app/components/Layout/SidebarDemo.tsx` (or wherever Frame760 is)

Add `teamleader` as a valid role that maps to the depthead panel content for now:

```ts
// In the role → content map, add:
teamleader: DeptHeadContent, // temporary until Team Leader panel is built in Phase 6
```

This means team leaders see the same board as dept heads currently. Phase 6 builds their dedicated panel.

---

### 5. `src/app/types.ts`

Update `UserProfile` to match the Supabase profiles table exactly:

```ts
export type UserRole = 'super_admin' | 'dept_head' | 'team_leader' | 'employee';

export interface UserProfile {
  id: string;                    // was uid
  full_name: string;             // was fullName
  email: string;
  employee_id: string;           // was employeeId
  org_id: string | null;         // was departmentId
  role: UserRole;
  skills: Record<string, boolean>;
  workload: number;
  burnout_level: 'low' | 'medium' | 'high';  // was burnoutLevel
  is_active: boolean;            // was status: 'active' | 'inactive'
  created_at: string;            // was createdAt: number
  updated_at: string;            // was lastLogin: number
  // Joined fields (not in DB, computed client-side):
  org_name?: string;
}
```

---

## IMPORTANT: BACKWARD COMPATIBILITY

The existing components (DeptHeadContent, EmployeeContent, MondayBoard, etc.) still reference old field names like `userProfile.uid`, `userProfile.fullName`, `userProfile.departmentId`, `userProfile.burnoutLevel`, `userProfile.status`.

**Do NOT refactor those components in Phase 2** — that's Phase 3's job.

Instead, add compatibility aliases to the UserProfile object when it's set in AuthContext:

```ts
// In AuthContext, after fetching profile from Supabase,
// spread compatibility shims so old components don't break:
const compatProfile = {
  ...data,
  // Shims for old field names
  uid: data.id,
  fullName: data.full_name,
  departmentId: data.org_id,
  burnoutLevel: data.burnout_level,
  status: data.is_active ? 'active' : 'inactive',
  createdAt: new Date(data.created_at).getTime(),
  lastLogin: new Date(data.updated_at).getTime(),
};
setUserProfile(compatProfile);
```

This way old components keep working, Phase 3 cleans them up properly.

---

## TESTING CHECKLIST

After implementation, verify:

- [ ] `admin@eflow.gov.ph` / `admin123` → logs in as super_admin, sees org tree panel
- [ ] First-time setup: if no super_admin in profiles → shows green "First-Time Setup" button
- [ ] First-time setup: creates real Supabase auth user + profile row
- [ ] Real user login: email + password → Supabase auth → fetches profile → routes to correct panel
- [ ] Inactive user: `is_active = false` in profiles → blocked with correct error message
- [ ] Logout: clears session, returns to login screen
- [ ] Loading state: shows skeleton while auth resolves
- [ ] Role routing: dept_head → depthead panel, team_leader → depthead panel (temp), employee → employee panel
- [ ] `createManagedUser` from SuperAdmin user management → calls FastAPI → creates user in Supabase Auth + profiles

---

## PACKAGES TO ADD TO SERVER

```bash
server\.venv\Scripts\pip.exe install supabase --break-system-packages
```

No new npm packages needed for Phase 2.