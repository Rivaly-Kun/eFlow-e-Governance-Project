# eFlow — Phase 10: User Skills Management + AI Skill-Aware Recommendations
## Implementation Directive — Single-Pass Execution

---

## NON-NEGOTIABLES — READ BEFORE ANYTHING ELSE

- Every edit below is anchored to an exact string, verified directly against the current codebase. If a target string does not exist verbatim, stop and output what you actually found instead of guessing.
- Make only the edits listed in this document. Do not refactor, rename, or touch anything outside the listed changes.
- Do not change any exported function signature unless explicitly shown here.
- The `skills` column in `profiles` is already a `JSONB` field typed as `Record<string, boolean>` — no SQL migration is needed. This phase is 100% frontend + server changes only.
- Before reporting this phase complete, run the SELF-VERIFICATION section at the end.

---

## CONTEXT

The `profiles` table already has a `skills` JSONB column (confirmed: `skills: Record<string, boolean>` in `types.ts` line 59, also initialised as `skills: {}` in `AuthContext.tsx` line 180 and `supabaseService.ts` line 289).

The `employeeService.ts` `profileToEmployee` function already reads `skills` from the profile row and converts it to a comma-separated `skillList`. However it falls back to `${formatRole(role)} at ${orgName || 'LEDIPO'}` when `skillList` is empty. This `skillList` string lands in `employee.jobDescription`, which is what the LLM prompt currently labels as `Description:` — not `Skills:`.

Two problems to fix:

**Problem 1:** The Create/Edit User modals in `UserManagement.tsx` have no way to add or edit skills on a user. Skills are never populated, so the AI always sees empty data.

**Problem 2:** `buildEmployeesContext` in `llmService.ts` uses the label `Description:` in the prompt for the `employee.jobDescription` field, which is a fallback string — not a clearly labelled skills list. The prompt should instead label it `Skills:` so the LLM knows what it is reading.

---

## PART A — SKILLS TAB IN CREATE USER MODAL

### What needs to change in `UserManagement.tsx`

**File:** `src/app/components/SuperAdmin/UserManagement.tsx`

---

#### A1 — Add skills state to `CreateUserModal`

Locate the existing `useState` for the form in `CreateUserModal`. The exact current code is:

```typescript
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "employee" as UserRole,
    orgId: "",
    workload: 0,
  });
```

Replace it with:

```typescript
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "employee" as UserRole,
    orgId: "",
    workload: 0,
  });
  // Skills tab state
  const [activeTab, setActiveTab] = useState<"basic" | "skills">("basic");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<Record<string, boolean>>({});
```

---

#### A2 — Add skill helper functions inside `CreateUserModal`

Add these two helper functions inside the `CreateUserModal` function body, directly after the `resetForm` function block (i.e. after the closing `};` of `resetForm`):

```typescript
  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed || skills[trimmed]) return;
    setSkills((prev) => ({ ...prev, [trimmed]: true }));
    setSkillInput("");
  };

  const removeSkill = (key: string) => {
    setSkills((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
```

---

#### A3 — Reset skills on `resetForm`

The current `resetForm` function body is:

```typescript
  const resetForm = () => {
    setForm({ fullName: "", email: "", password: "", role: "employee", orgId: "", workload: 0 });
    setErrors({});
  };
```

Replace it with:

```typescript
  const resetForm = () => {
    setForm({ fullName: "", email: "", password: "", role: "employee", orgId: "", workload: 0 });
    setErrors({});
    setActiveTab("basic");
    setSkillInput("");
    setSkills({});
  };
```

---

#### A4 — Pass `skills` to `createManagedUser` in `handleSubmit`

The current `handleSubmit` calls `createManagedUser` with this exact object:

```typescript
      await createManagedUser(
        form.email.trim(),
        form.password,
        {
          full_name: form.fullName.trim(),
          role: form.role,
          org_id: form.orgId,
          employee_id: "",
        },
      );
```

Replace it with:

```typescript
      await createManagedUser(
        form.email.trim(),
        form.password,
        {
          full_name: form.fullName.trim(),
          role: form.role,
          org_id: form.orgId,
          employee_id: "",
          skills,
        },
      );
```

---

#### A5 — Replace the modal's JSX body with a tabbed version

The current JSX body of `CreateUserModal` — the entire `<div className="space-y-4">` block that is the direct child of `<Modal ...>` — is this exact content:

```tsx
      <div className="space-y-4">
        <FormField label="Full Name" error={errors.fullName} required>
          <TextInput
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="Juan Dela Cruz"
            hasError={!!errors.fullName}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email" error={errors.email} required>
            <TextInput
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="j.delacruz@eflow.gov.ph"
              hasError={!!errors.email}
            />
          </FormField>
          <FormField label="Password" error={errors.password} required>
            <TextInput
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min. 6 characters"
              hasError={!!errors.password}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Role" required>
            <SelectInput
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              options={ROLE_OPTIONS}
            />
          </FormField>
          <FormField label="Organization" error={errors.orgId} required>
            <SelectInput
              value={form.orgId}
              onChange={(e) => setForm({ ...form, orgId: e.target.value })}
              options={orgOptions}
              placeholder="Select organization"
              hasError={!!errors.orgId}
            />
          </FormField>
        </div>

        <FormField label="Initial Workload (%)">
          <TextInput
            type="number"
            min={0}
            max={100}
            value={form.workload}
            onChange={(e) => setForm({ ...form, workload: Math.min(100, Math.max(0, Number(e.target.value))) })}
          />
        </FormField>
      </div>
```

Replace this entire block with:

```tsx
      <>
        {/* Tab bar */}
        <div className="flex border-b border-neutral-200 mb-4 -mt-1">
          <button
            onClick={() => setActiveTab("basic")}
            className={`px-4 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "basic"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-400 hover:text-neutral-700"
            }`}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab("skills")}
            className={`px-4 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "skills"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-400 hover:text-neutral-700"
            }`}
          >
            Skills
            {Object.keys(skills).length > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-neutral-900 text-white text-[9px] font-['Lexend:SemiBold',_sans-serif]">
                {Object.keys(skills).length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "basic" && (
          <div className="space-y-4">
            <FormField label="Full Name" error={errors.fullName} required>
              <TextInput
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Juan Dela Cruz"
                hasError={!!errors.fullName}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Email" error={errors.email} required>
                <TextInput
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="j.delacruz@eflow.gov.ph"
                  hasError={!!errors.email}
                />
              </FormField>
              <FormField label="Password" error={errors.password} required>
                <TextInput
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 6 characters"
                  hasError={!!errors.password}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Role" required>
                <SelectInput
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  options={ROLE_OPTIONS}
                />
              </FormField>
              <FormField label="Organization" error={errors.orgId} required>
                <SelectInput
                  value={form.orgId}
                  onChange={(e) => setForm({ ...form, orgId: e.target.value })}
                  options={orgOptions}
                  placeholder="Select organization"
                  hasError={!!errors.orgId}
                />
              </FormField>
            </div>

            <FormField label="Initial Workload (%)">
              <TextInput
                type="number"
                min={0}
                max={100}
                value={form.workload}
                onChange={(e) => setForm({ ...form, workload: Math.min(100, Math.max(0, Number(e.target.value))) })}
              />
            </FormField>
          </div>
        )}

        {activeTab === "skills" && (
          <div className="space-y-3">
            <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
              Add skills that the AI recommendation engine will use to match this employee to tasks. Each skill is a keyword (e.g. "data analysis", "coordination", "budgeting").
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                placeholder="Type a skill and press Enter or +"
                className="flex-1 px-3 py-2 text-[12px] font-['Lexend:Regular',_sans-serif] border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white text-neutral-900 placeholder:text-neutral-400"
              />
              <button
                onClick={addSkill}
                disabled={!skillInput.trim()}
                className="px-3 py-2 rounded-lg bg-neutral-900 text-white text-[12px] font-['Lexend:Medium',_sans-serif] font-medium hover:bg-neutral-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                +
              </button>
            </div>
            {Object.keys(skills).length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-[12px] font-['Lexend:Regular',_sans-serif]">
                No skills added yet. Skills help the AI recommend the right employee for each task.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {Object.keys(skills).map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-['Lexend:Medium',_sans-serif] font-medium"
                  >
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="text-neutral-400 hover:text-neutral-700 cursor-pointer transition-colors leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </>
```

---

## PART B — SKILLS TAB IN EDIT USER MODAL

### What needs to change in `UserManagement.tsx` (continued)

**File:** `src/app/components/SuperAdmin/UserManagement.tsx`

---

#### B1 — Add skills state to `EditUserModal`

Locate the existing `useState` for the form in `EditUserModal`. The exact current code is:

```typescript
  const [form, setForm] = useState({
    fullName: "",
    role: "employee" as UserRole,
    orgId: "",
    workload: 0,
  });
  const [saving, setSaving] = useState(false);
```

Replace it with:

```typescript
  const [form, setForm] = useState({
    fullName: "",
    role: "employee" as UserRole,
    orgId: "",
    workload: 0,
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "skills">("basic");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<Record<string, boolean>>({});
```

---

#### B2 — Load skills when `editUser` changes

The current `React.useEffect` block in `EditUserModal` is:

```typescript
  React.useEffect(() => {
    if (editUser) {
      setForm({
        fullName: editUser.full_name,
        role: editUser.role,
        orgId: editUser.org_id || "",
        workload: editUser.workload,
      });
    }
  }, [editUser]);
```

Replace it with:

```typescript
  React.useEffect(() => {
    if (editUser) {
      setForm({
        fullName: editUser.full_name,
        role: editUser.role,
        orgId: editUser.org_id || "",
        workload: editUser.workload,
      });
      setSkills(editUser.skills || {});
      setActiveTab("basic");
      setSkillInput("");
    }
  }, [editUser]);
```

---

#### B3 — Add skill helpers inside `EditUserModal`

Add these two helper functions inside the `EditUserModal` function body, directly after the `React.useEffect` closing block:

```typescript
  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed || skills[trimmed]) return;
    setSkills((prev) => ({ ...prev, [trimmed]: true }));
    setSkillInput("");
  };

  const removeSkill = (key: string) => {
    setSkills((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
```

---

#### B4 — Pass `skills` to `updateProfile` in `handleSave`

The current `handleSave` call to `updateProfile` passes this exact object:

```typescript
      await updateProfile(editUser.id, {
        full_name: form.fullName,
        role: form.role,
        org_id: form.orgId || null,
        workload: form.workload,
        burnout_level: form.workload >= 80 ? "high" : form.workload >= 50 ? "medium" : "low",
      });
```

Replace it with:

```typescript
      await updateProfile(editUser.id, {
        full_name: form.fullName,
        role: form.role,
        org_id: form.orgId || null,
        workload: form.workload,
        burnout_level: form.workload >= 80 ? "high" : form.workload >= 50 ? "medium" : "low",
        skills,
      });
```

---

#### B5 — Replace `EditUserModal` JSX body with tabbed version

The current JSX body of `EditUserModal` — the entire `<div className="space-y-4">` block that is the direct child of `<Modal ...>` — is this exact content:

```tsx
      <div className="space-y-4">
        <FormField label="Full Name" required>
          <TextInput
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Role">
            <SelectInput
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              options={ROLE_OPTIONS}
            />
          </FormField>
          <FormField label="Organization">
            <SelectInput
              value={form.orgId}
              onChange={(e) => setForm({ ...form, orgId: e.target.value })}
              options={orgOptions}
              placeholder="Select organization"
            />
          </FormField>
        </div>
        <FormField label="Workload (%)">
          <TextInput
            type="number"
            min={0}
            max={100}
            value={form.workload}
            onChange={(e) => setForm({ ...form, workload: Math.min(100, Math.max(0, Number(e.target.value))) })}
          />
        </FormField>
        <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
          Email: {editUser.email} · ID: {editUser.id.slice(0, 12)}...
        </div>
      </div>
```

Replace this entire block with:

```tsx
      <>
        {/* Tab bar */}
        <div className="flex border-b border-neutral-200 mb-4 -mt-1">
          <button
            onClick={() => setActiveTab("basic")}
            className={`px-4 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "basic"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-400 hover:text-neutral-700"
            }`}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab("skills")}
            className={`px-4 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "skills"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-400 hover:text-neutral-700"
            }`}
          >
            Skills
            {Object.keys(skills).length > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-neutral-900 text-white text-[9px] font-['Lexend:SemiBold',_sans-serif]">
                {Object.keys(skills).length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "basic" && (
          <div className="space-y-4">
            <FormField label="Full Name" required>
              <TextInput
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Role">
                <SelectInput
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  options={ROLE_OPTIONS}
                />
              </FormField>
              <FormField label="Organization">
                <SelectInput
                  value={form.orgId}
                  onChange={(e) => setForm({ ...form, orgId: e.target.value })}
                  options={orgOptions}
                  placeholder="Select organization"
                />
              </FormField>
            </div>
            <FormField label="Workload (%)">
              <TextInput
                type="number"
                min={0}
                max={100}
                value={form.workload}
                onChange={(e) => setForm({ ...form, workload: Math.min(100, Math.max(0, Number(e.target.value))) })}
              />
            </FormField>
            <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
              Email: {editUser.email} · ID: {editUser.id.slice(0, 12)}...
            </div>
          </div>
        )}

        {activeTab === "skills" && (
          <div className="space-y-3">
            <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
              Add or remove skills for this employee. The AI recommendation engine uses these to match tasks. Each skill is a keyword (e.g. "data analysis", "coordination", "budgeting").
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                placeholder="Type a skill and press Enter or +"
                className="flex-1 px-3 py-2 text-[12px] font-['Lexend:Regular',_sans-serif] border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white text-neutral-900 placeholder:text-neutral-400"
              />
              <button
                onClick={addSkill}
                disabled={!skillInput.trim()}
                className="px-3 py-2 rounded-lg bg-neutral-900 text-white text-[12px] font-['Lexend:Medium',_sans-serif] font-medium hover:bg-neutral-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                +
              </button>
            </div>
            {Object.keys(skills).length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-[12px] font-['Lexend:Regular',_sans-serif]">
                No skills added yet. Skills help the AI recommend the right employee for each task.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {Object.keys(skills).map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-['Lexend:Medium',_sans-serif] font-medium"
                  >
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="text-neutral-400 hover:text-neutral-700 cursor-pointer transition-colors leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </>
```

---

## PART C — WIRE `skills` THROUGH `createManagedUser` IN `AuthContext.tsx`

**File:** `src/app/contexts/AuthContext.tsx`

#### C1 — Extend the `profileData` type to accept `skills`

The current `createManagedUser` function signature (starting at the `async (` line inside `useCallback`) has this exact `profileData` type:

```typescript
      profileData: { full_name: string; role: UserRole; org_id?: string; employee_id?: string },
```

Replace it with:

```typescript
      profileData: { full_name: string; role: UserRole; org_id?: string; employee_id?: string; skills?: Record<string, boolean> },
```

#### C2 — Forward `skills` in the fetch body

The current JSON body sent to the FastAPI endpoint is:

```typescript
          body: JSON.stringify({
            email: newEmail,
            password: newPassword,
            full_name: profileData.full_name,
            role: profileData.role,
            org_id: profileData.org_id || null,
            employee_id: profileData.employee_id || '',
          }),
```

Replace it with:

```typescript
          body: JSON.stringify({
            email: newEmail,
            password: newPassword,
            full_name: profileData.full_name,
            role: profileData.role,
            org_id: profileData.org_id || null,
            employee_id: profileData.employee_id || '',
            skills: profileData.skills || {},
          }),
```

---

## PART D — ACCEPT `skills` IN THE FASTAPI ENDPOINT

**File:** `server/main.py`

#### D1 — Extend `CreateUserPayload`

The current `CreateUserPayload` Pydantic model is:

```python
class CreateUserPayload(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "employee"
    org_id: Optional[str] = None
    employee_id: str = ""
```

Replace it with:

```python
class CreateUserPayload(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "employee"
    org_id: Optional[str] = None
    employee_id: str = ""
    skills: dict = {}
```

#### D2 — Include `skills` in the `profiles` insert

The current `profiles` insert inside `create_managed_user` is:

```python
        supabase_admin.table("profiles").insert({
            "id": uid,
            "full_name": payload.full_name,
            "email": payload.email,
            "role": payload.role,
            "org_id": payload.org_id,
            "employee_id": payload.employee_id,
            "is_active": True,
        }).execute()
```

Replace it with:

```python
        supabase_admin.table("profiles").insert({
            "id": uid,
            "full_name": payload.full_name,
            "email": payload.email,
            "role": payload.role,
            "org_id": payload.org_id,
            "employee_id": payload.employee_id,
            "is_active": True,
            "skills": payload.skills,
        }).execute()
```

---

## PART E — FIX THE AI PROMPT TO USE `Skills:` INSTEAD OF `Description:`

**File:** `src/app/services/llmService.ts`

#### E1 — Relabel `Description:` to `Skills:` in `buildEmployeesContext`

The current `return` statement inside `buildEmployeesContext` (the `.map()` callback) is this exact string (one long line, line 99):

```typescript
      return `- ID: ${employee.id}\n  Name: ${employee.name}\n  Team: ${employee.departmentName ?? employee.department ?? "Unassigned"}\n  Job: ${employee.jobTitle || "-"}\n  Description: ${employee.jobDescription || "-"}\n  Workload (0-100): ${employee.currentWorkload}${noteText}`;
```

Replace that line with:

```typescript
      return `- ID: ${employee.id}\n  Name: ${employee.name}\n  Team: ${employee.departmentName ?? employee.department ?? "Unassigned"}\n  Job: ${employee.jobTitle || "-"}\n  Skills: ${employee.jobDescription || "-"}\n  Workload (0-100): ${employee.currentWorkload}${noteText}`;
```

**Why this works without any other data changes:** `employee.jobDescription` is already the comma-separated skill list built in `employeeService.ts` `profileToEmployee` (the line `jobDescription: skillList || \`${formatRole(role)} at ${orgName || 'LEDIPO'}\``). The only change here is the label the LLM sees — from `Description:` to `Skills:` — so the model understands what it is evaluating.

#### E2 — Update the LLM instruction text to reference skills

The current prompt string inside `recommendTeam` (one long concatenated string on line 270) contains this exact instruction text:

```
2. Use job descriptions and manager notes (strengths/weaknesses/tags) to match skills.
```

(It appears inside the template literal as `\\n2. Use job descriptions and manager notes (strengths/weaknesses/tags) to match skills.\\n`)

The full current `const prompt = ` line is:

```typescript
  const prompt = `You are an AI assistant helping a Department Head assign tasks to employees using a Genetic Algorithm-like evaluation approach.\n\n${taskBlock}\n\nAvailable Employees:\n${employeesContext}\n\nInstructions:\n1. Select a team of 1 to N employees. You may choose as many as needed based on complexity.\n2. Use job descriptions and manager notes (strengths/weaknesses/tags) to match skills.\n3. Consider workload. Workload above 80 indicates burnout risk.\n4. Choose a lead candidate among the team (include them in the list).\n5. Output your response as strict JSON with no markdown.\n\nRequired JSON format:\n{\n  "recommendedEmployeeIds": ["id_1", "id_2"],\n  "reasoning": "Why this team and size were selected, plus workload assessment.",\n  "burnoutWarning": true/false\n}`;
```

Replace it with:

```typescript
  const prompt = `You are an AI assistant helping a Department Head assign tasks to employees using a Genetic Algorithm-like evaluation approach.\n\n${taskBlock}\n\nAvailable Employees:\n${employeesContext}\n\nInstructions:\n1. Select a team of 1 to N employees. You may choose as many as needed based on complexity.\n2. Use the Skills field and manager notes (strengths/weaknesses/tags) to match employee capabilities to the task.\n3. Consider workload. Workload above 80 indicates burnout risk.\n4. Choose a lead candidate among the team (include them in the list).\n5. Output your response as strict JSON with no markdown.\n\nRequired JSON format:\n{\n  "recommendedEmployeeIds": ["id_1", "id_2"],\n  "reasoning": "Why this team and size were selected, plus workload assessment.",\n  "burnoutWarning": true/false\n}`;
```

---

## SUMMARY OF ALL CHANGED FILES

| File | What changes |
|---|---|
| `src/app/components/SuperAdmin/UserManagement.tsx` | `CreateUserModal`: adds `activeTab`, `skillInput`, `skills` state; `addSkill`/`removeSkill` helpers; `resetForm` clears skills; `handleSubmit` passes `skills`; JSX replaced with tabbed layout (Basic Info + Skills). `EditUserModal`: same additions; `useEffect` loads `editUser.skills`; `handleSave` passes `skills`; JSX replaced with tabbed layout. |
| `src/app/contexts/AuthContext.tsx` | `createManagedUser` `profileData` type extended with optional `skills?: Record<string, boolean>`; JSON body extended with `skills: profileData.skills \|\| {}`. |
| `server/main.py` | `CreateUserPayload` extended with `skills: dict = {}`; `profiles` insert includes `"skills": payload.skills`. |
| `src/app/services/llmService.ts` | `buildEmployeesContext` return: label changed from `Description:` to `Skills:`. Prompt instruction text updated from "Use job descriptions" to "Use the Skills field". |

**Files explicitly NOT changed:**
- `src/app/services/employeeService.ts` — `profileToEmployee` already reads `skills` JSONB and formats it into `jobDescription` correctly. No change needed.
- `src/app/services/aiScoringEngine.ts` — `computeSkillMatch` already uses `employee.jobDescription` (which is the skill list) for keyword matching. No change needed.
- `src/app/types.ts` — `UserProfile.skills: Record<string, boolean>` already exists at line 59. No SQL or type change needed.
- `src/lib/supabaseService.ts` — `updateProfile` already accepts any partial profile object; `skills` flows through automatically.
- Any SQL / Supabase — the `skills JSONB` column already exists in `profiles`. No migration needed.

---

## SELF-VERIFICATION — RUN THIS BEFORE DECLARING THE PHASE COMPLETE

- [ ] Does `CreateUserModal` have exactly three new state variables: `activeTab`, `skillInput`, `skills`?
- [ ] Does clicking the **Skills** tab in `CreateUserModal` show the skill input + chips panel, not the Basic Info fields?
- [ ] Does pressing Enter in the skill input field add the chip (same behaviour as the `+` button)?
- [ ] Does the Skills tab label show a round badge with a count only when at least one skill exists?
- [ ] Does `resetForm` clear `skills` to `{}`, `skillInput` to `""`, and `activeTab` to `"basic"`?
- [ ] Is `skills` passed as part of the `createManagedUser` call inside `handleSubmit`?
- [ ] Does `EditUserModal` load existing skills from `editUser.skills` when the modal opens?
- [ ] Does `EditUserModal` pass the updated `skills` object to `updateProfile` on save?
- [ ] Does `createManagedUser` in `AuthContext.tsx` now accept `skills?: Record<string, boolean>` in the `profileData` type?
- [ ] Does the FastAPI `CreateUserPayload` now have `skills: dict = {}`?
- [ ] Does the `profiles` insert in `create_managed_user` now include `"skills": payload.skills`?
- [ ] In `llmService.ts` `buildEmployeesContext`, does the employee context string now say `Skills:` where it previously said `Description:`?
- [ ] Does the LLM prompt instruction now say "Use the Skills field" instead of "Use job descriptions"?
- [ ] Did you touch `employeeService.ts`? (Should be NO.)
- [ ] Did you touch `aiScoringEngine.ts`? (Should be NO.)
- [ ] Did you touch `types.ts`? (Should be NO.)
- [ ] Does the project still compile / type-check with no new TypeScript errors introduced?

---

## TESTING CHECKLIST

- [ ] Open the admin **User Management** page → click **Create User** → confirm two tabs appear: **Basic Info** and **Skills**
- [ ] Fill in Basic Info, switch to Skills → type `"data analysis"` → press Enter → chip appears; type `"budgeting"` → click `+` → second chip appears; tab badge shows `2`
- [ ] Click the `×` on a chip → chip disappears; badge count decreases to `1`
- [ ] Click **Create User** → user is created successfully (toast shows) → open that user via **Edit** → Skills tab shows the chips you added, pre-populated from the database
- [ ] Edit a user's skills (add one, remove one) → click **Save Changes** → re-open the user → changes are reflected correctly
- [ ] As a Dept Head, open a task → click **Recommend Team** (AI button) → check the browser console for the `[LLM] Recommendation prompt:` log — confirm it now says `Skills:` for each employee instead of `Description:`
- [ ] For an employee with no skills set (empty `skills: {}`), confirm the AI prompt shows `Skills: Employee at LEDIPO` (or whatever the role+org fallback is) — not a crash, not blank
- [ ] (Regression) Basic Info tab still creates/saves users correctly when no skills are added
- [ ] (Regression) Opening Edit modal for a user with `skills: {}` shows the empty-state message on the Skills tab without any error

