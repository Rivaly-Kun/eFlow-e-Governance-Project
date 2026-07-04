# eFlow — Phase 7: Email Notifications
## Implementation Directive — Single-Pass Execution

---

## NON-NEGOTIABLES — READ BEFORE ANYTHING ELSE

- Every edit below is anchored to an exact string. If a target string does not exist verbatim, stop and output what you actually found instead of guessing.
- Make only the edits listed in this document. Do not refactor, rename, or touch anything outside the listed changes.
- Do not change any exported function signature unless explicitly shown here.
- Before reporting this phase complete, run the SELF-VERIFICATION section at the end.

---

## CONTEXT

Push notifications (FCM) were scoped for this phase in an earlier draft and explicitly rejected — requiring a browser to stay backgrounded-but-open for delivery isn't reliable enough for LEDIPO staff. This version replaces that entirely with **email**, sent via Gmail SMTP.

Gmail SMTP over a provider like Resend is a deliberate choice, not a default: transactional email providers restrict sending to your own verified address until you verify a domain you control, and LEDIPO's domain doesn't exist yet — that's what the later Cloudflare phase sets up. Gmail SMTP sends to any real recipient today with zero domain dependency. The sending logic is isolated in one `send_email()` function specifically so swapping to Resend later, once a domain exists, touches one function body, not every call site.

**In-app notifications (the bell, realtime delivery, mark read) already work** — built in Phase 3, confirmed in Phase 5/6 investigation. This phase adds email as a second delivery channel alongside it, never replacing it. Supabase's `notifications` table remains the single source of truth James's mobile app reads from — nothing in this phase is mobile-specific, and nothing here needs a parallel mobile implementation.

---

## PART A — MANUAL SETUP (you do this first)

1. Decide on a sending account — either your own Gmail or (recommended) a dedicated one, e.g. `eflow.notifications@gmail.com`, so it isn't tied to a personal inbox.
2. Enable 2-Step Verification on that account (required for App Passwords): Google Account → Security → 2-Step Verification.
3. Generate an App Password: Google Account → Security → 2-Step Verification → App passwords → select "Mail" → generate. Copy the 16-character password.
4. Add to `server/.env`:
   ```
   SMTP_EMAIL=eflow.notifications@gmail.com
   SMTP_APP_PASSWORD=your16charapppassword
   ```

---

## PART B — CODE CHANGES

---

### STEP 0 — RUN THIS SQL IN SUPABASE

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE;
```

---

### 1. `server/main.py` — NEW FUNCTION + NEW ENDPOINT

Uses Python's built-in `smtplib` — no new pip install required.

```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_APP_PASSWORD = os.getenv("SMTP_APP_PASSWORD")


def send_email(to_email: str, subject: str, html_body: str) -> None:
    """
    Isolated on purpose: this is the only function that knows HOW email
    gets sent. Swapping providers later (e.g. to Resend once LEDIPO has
    a domain) means changing only this function's body.
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"eFlow Notifications <{SMTP_EMAIL}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_APP_PASSWORD)
        server.sendmail(SMTP_EMAIL, to_email, msg.as_string())


@app.post("/controlpanelEflow/api/notifications/email")
async def send_email_notification(payload: dict, authorized: bool = Depends(verify_auth)):
    """
    payload: { userId, title, body, taskId? }
    Looks up the user's email + email_notifications_enabled from Supabase.
    Returns 200 with sent: false for missing email or disabled preference
    — these are not errors, they're expected states.
    """
    try:
        user_id = payload.get("userId")
        if not user_id:
            raise HTTPException(status_code=400, detail="userId is required")

        profile = (
            supabase_admin.table("profiles")
            .select("email, email_notifications_enabled, full_name")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if not profile.data or not profile.data.get("email"):
            return {"sent": False, "reason": "no_email"}
        if profile.data.get("email_notifications_enabled") is False:
            return {"sent": False, "reason": "disabled"}

        recipient = profile.data["email"]
        name = profile.data.get("full_name", "")
        title = payload.get("title", "eFlow Notification")
        body_text = payload.get("body", "")

        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#171717;">{title}</h2>
          <p style="color:#404040;">Hi {name},</p>
          <p style="color:#404040;">{body_text}</p>
          <p style="color:#a3a3a3; font-size:12px; margin-top:24px;">
            This is an automated notification from eFlow — LEDIPO's project and task management system.
          </p>
        </div>
        """
        send_email(recipient, title, html)
        return {"sent": True}
    except Exception as e:
        # Log and swallow — a failed email must never surface as a
        # user-facing error. The in-app notification already succeeded.
        print(f"Email notification failed: {e}")
        return {"sent": False, "reason": str(e)}
```

Reuses the existing `verify_auth`/AUTHKEY dependency already protecting other admin endpoints — do not invent a separate auth mechanism.

---

### 2. `src/lib/supabaseService.ts` — NEW EXPORT

Add near `updateOwnProfile`:

```ts
// ─── updateEmailPreference ──────────────────────────────────────────
export async function updateEmailPreference(
  userId: string,
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ email_notifications_enabled: enabled })
    .eq("id", userId);
  if (error) throw error;
}
```

---

### 3. `src/app/services/notificationService.ts` — TARGETED ADDITION

Find `createNotification` (built in Phase 3). After the existing Supabase insert succeeds, add a fire-and-forget email trigger as the last thing inside the function — do not replace anything, only add:

```ts
  // Fire-and-forget email — never let this throw into the caller. The
  // in-app notification above has already succeeded regardless of
  // whether email delivery works.
  fetch(`${import.meta.env.VITE_LLM_BASE_URL}/controlpanelEflow/api/notifications/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      title: data.title,
      body: data.message,
      taskId: data.taskId || null,
    }),
  }).catch((err) => console.error("Email notification request failed:", err));
```

---

### 4. `src/app/components/Employee/ProfilePage.tsx` — TARGETED ADDITION

Import at the top:
```ts
import { Mail } from "lucide-react";
import { updateEmailPreference } from "../../../lib/supabaseService";
```

Add state near the other `useState` declarations:
```ts
const [emailEnabled, setEmailEnabled] = useState(true);
const [emailSaving, setEmailSaving] = useState(false);
```

Add this card in the grid, matching the existing card conventions from Phase 5:

```tsx
{/* Email notifications */}
<div className="bg-white rounded-xl border border-neutral-200 p-5">
  <div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800 mb-3 flex items-center gap-2">
    <Mail size={14} /> Email Notifications
  </div>
  <p className="text-[11px] text-neutral-500 mb-3">
    Receive an email when tasks are assigned, updated, or need your review.
  </p>
  <button
    onClick={async () => {
      if (!userProfile?.uid) return;
      setEmailSaving(true);
      try {
        const next = !emailEnabled;
        await updateEmailPreference(userProfile.uid, next);
        setEmailEnabled(next);
      } finally {
        setEmailSaving(false);
      }
    }}
    disabled={emailSaving}
    className="px-3 py-2 rounded-lg bg-neutral-900 text-white text-[12px] font-['Lexend:Medium',_sans-serif] disabled:opacity-40 hover:bg-neutral-800"
  >
    {emailSaving ? "…" : emailEnabled ? "Enabled — Turn Off" : "Enable Email Notifications"}
  </button>
</div>
```

---

## SELF-VERIFICATION — RUN THIS BEFORE DECLARING THE PHASE COMPLETE

- [ ] Did you run the Step 0 SQL — `email_notifications_enabled` column exists on `profiles`, defaulting to `true`?
- [ ] Does `send_email()` exist as a single isolated function that the endpoint calls, rather than SMTP logic being inlined directly in the route handler?
- [ ] Does the new endpoint reuse the existing `verify_auth` dependency, not a new auth mechanism?
- [ ] Does the endpoint return `200` with `{"sent": false, ...}` for a missing email or disabled preference, rather than raising an error?
- [ ] Is the `fetch` call inside `createNotification` genuinely fire-and-forget — not awaited in a way that could block or throw if the email request fails?
- [ ] Does `createNotification` still insert into Supabase and update the bell exactly as before, regardless of whether the email call succeeds?
- [ ] Did you touch any file, function, or import not explicitly listed in this document? If yes, revert those changes.
- [ ] Does the project still compile / type-check with no new errors introduced?

---

## TESTING CHECKLIST

- [ ] Complete Part A manual setup before testing
- [ ] Trigger any notification-worthy action (e.g. assign a task) → recipient receives a real email within a few seconds
- [ ] Check the email — subject and body reflect the actual notification title/message, sender shows as "eFlow Notifications"
- [ ] As Employee, visit Profile & Account → Email Notifications card shows "Enabled — Turn Off" by default (matches the SQL default)
- [ ] Turn it off → trigger another notification for that user → in-app bell still updates normally, but no email arrives
- [ ] Turn it back on → confirm email delivery resumes
- [ ] Test with a user who has no email set (if any exist) → confirm the endpoint returns `{"sent": false, "reason": "no_email"}` and nothing breaks
- [ ] Check FastAPI server logs during a send failure (e.g. temporarily wrong app password) → confirm it logs the error and still returns `200`, not a 500
- [ ] Confirm the in-app notification bell and unread count work exactly as they did before this phase — email is additive, never blocking