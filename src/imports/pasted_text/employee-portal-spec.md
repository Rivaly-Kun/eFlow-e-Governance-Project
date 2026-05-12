# Employee Desktop Workspace — eFlow LGU Spec

> Context reference for Sections 19–21. The Employee "Basecamp" is the
> desktop counterpart to the mobile field app. Field workers spend ~80% of
> their time on the ground and ~20% in the office submitting reports and
> checking their schedule. This portal restricts features to avoid
> overwhelm and focuses on two jobs: **Focus** (tell them what to do) and
> **Feed** (collect their field notes into the Dept. Head AI).

Role: `employee`
Sections: `workspace`, `empfin`, `achievement`

---

## 19. My Workspace (The Employee Desktop Portal)

**Design Philosophy:** "Focus and Feed."

### 19.1 Active Tasks (The Execution Board)

Read-only list of assignments; highly interactive for status updates.

**A. GA-Delegated Assignments — Main Table (Monday.com-style)**

Columns:
- Task Name (e.g., "Inspect Market Drainage")
- Origin — tagged with purple bot icon: 🤖 Assigned by Genetic Algorithm
- Status — clickable pills: `To Do | In Progress | Stuck | Done`
- Location / Asset
- SLA Countdown (e.g., "Due in 4 Hours")

Constraint: employees cannot add new columns or delete the board. They
can only change Status and upload files.

**B. Context-Aware Reminders**

Side-panel / banner. If "Fix Pothole" is marked Done on mobile but the
"After" photo is not uploaded yet:

> Pending Action: Upload completion photo for Task #402 to unlock your
> next assignment.

**C. One-Tap Complete**

Minimalist checklist for repetitive tasks ("Check truck oil", "Log into
shift"). No forms, no photos — instant DB update.

### 19.2 Daily Stand-Up Input (The NLP Feeder)

Feeds directly into the Department Head's NLP Stand-Up Synthesis.

**A. Text Update & Auto-Transcription — Smart Diary**

Large input box with prominent `[🎤 Dictate Voice Note]`. Worker speaks
in Tagalog or Bisaya:

> "We finished paving the road, but the cement delivery for tomorrow is
> delayed."

AI processing:
1. Transcribe audio.
2. Translate to formal English for the official record.
3. Extract signals (e.g., "Cement Delay" → critical blocker alert to
   Dept. Head).

### 19.3 Mobile & Viber Integration (The Comms Bridge)

**A. Viber Account Linking & Keyword Notifications**

- Settings page with a QR code to link the employee's LGU profile to the
  official eFlow Viber Bot.
- GA can push urgent tasks via Viber: "🚨 URGENT: Broken pipe at Plaza.
  Do you accept?" → reply `YES` → dashboard updates.

**B. Remote DB Updates (Offline Sync Status)**

Sync hub listing files captured offline (e.g., "3 Photos taken offline").
When the worker connects to City Hall Wi-Fi, a green progress bar shows
files securely syncing to the main blockchain ledger.

---

## 20. Employee Financials (The Liquidation Portal)

**Design Philosophy:** "Frictionless Accountability." Employees are not
accountants. Hide the ledger, present guided step-by-step forms that do
the math.

> Context: Unliquidated Cash Advances are the #1 cause of COA Audit
> Observation Memorandums in LGUs. Goal: make it **mathematically
> impossible** for an employee to mess up a liquidation.

### 20.1 Expense & Liquidation Submission

Kanban-style board of active cash advances the employee must clear to
avoid salary deductions.

**A. Active Advance Card**

Opens a Monday.com-style card, not a blank form.

Example: `CA-2026-041: Travel to Cebu | Amount: ₱5,000 | Deadline: 5
Days Left`

**B. Exact Spent Amount & Remaining Budget Calc — Auto-Math Engine**

Side panel on card click:
- `Original Advance: ₱5,000` field is **locked**.
- Employee types into `Exact Spent Amount`.
- `Amount to Return to Treasury` updates instantly in large bold text
  (e.g., `₱800`). Zero human math error.

**C. Receipt Upload (OR/AR) — AI Assistant**

Click `[📸 Scan Official Receipt]`. OCR (same engine as Finance Audit)
auto-fills Vendor / TIN / OR number / amount. Employee verifies and
clicks `[Match & Attach]`.

### 20.2 Cash Advance Requests (The Front Door)

**A. Contextual Request Form**

Modal form. Employee cannot just type "I need ₱10,000". Form forces
linking the request to an active GA-assigned Project/Task (e.g.,
`Linked Task: Eco-Park Site Survey`).

**B. Eligibility Blocker — COA Shield**

Rule: employee cannot receive a new advance if they have an unliquidated
advance >30 days old.

UI enforcement:
- `[+ Cash Advance Requests]` button is greyed out and disabled.
- Hover tooltip (red): *"Access Locked: You have an overdue liquidation
  (CA-2026-012). Clear your previous advance to unlock new requests."*

---

## 21. Collaborative Achievement (The Culture Builder)

**Design Philosophy:** "Support and Uplift." Strip punitive metrics,
replace with gamified team goals and an AI mentor.

> Traditional LGU software often surveils and punishes, causing
> resistance. This module flips the script using behavioral psychology
> (Social Norming) and Agentic AI.

### 21.1 Team Progress (The Motivation Engine)

**A. Departmental Goals & Team Milestones**

A street sweeper doesn't know they're part of the "City-Wide Eco-Tourism
Initiative" — they just sweep. Fix with a visual dashboard:

- Massive progress ring for **"Ormoc Eco-Park Launch."**
- Personal connection line beneath: *"Your Team's Contribution: 145
  Tasks Completed."* Connects micro-tasks → macro milestone → civic
  pride.

**B. Compliance Metrics & Social Norming Stats**

No toxic leaderboards. Focus on collective compliance.

Instead of: *"You are late on your liquidation."*

Say:
> 🏆 92% of the Engineering Department has cleared their cash advances
> this week! You are one of the last 3 people needed to help your
> department reach 100% compliance.

Subtle copy change → dramatically higher compliance without resentment.

### 21.2 Agentic AI Coaching (The Digital Mentor)

Many LGU workers are older and struggle with digital literacy. The AI
does the heavy lifting for them.

**A. Workflow Guidance & Digital Literacy Support**

Always-on floating `[✨ AI Help]` button. If the user stares at "Form 6
- Leave Request" for 3 min without typing:

> Hi, Kuya Arnel. Are you trying to file for sick leave? Just click the
> microphone button below, tell me what days you need off in Bisaya or
> Tagalog, and I will fill out the entire form for you.

**B. Liquidation Report Help**

Guided step-by-step wizard. On a blurry receipt, no cold "Error 404":

> I can't quite read the Vendor TIN number on this receipt. Can you hold
> the camera a little steadier and snap it one more time? The TIN is
> usually at the top right.

The wizard highlights the blurry region on the receipt preview.

---

## Route & component map

| Section       | Default page                       | Component            |
|---------------|------------------------------------|----------------------|
| `workspace`   | Active Tasks                       | `ActiveTasks`        |
| `workspace`   | Daily Stand-Up Input               | `DailyStandUp`       |
| `workspace`   | Mobile & Viber Integration         | `ViberIntegration`   |
| `empfin`      | Expense & Liquidation Submission   | `LiquidationPortal`  |
| `empfin`      | Cash Advance Requests              | `CashAdvanceRequests`|
| `achievement` | Departmental Goals                 | `TeamProgress`       |
| `achievement` | Agentic AI Coaching                | `AICoaching`         |

All implemented in `src/app/components/EmployeeContent.tsx`.
