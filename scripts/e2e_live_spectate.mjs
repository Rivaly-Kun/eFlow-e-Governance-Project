import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const BASE_URL = process.env.EFLOW_BASE_URL || "http://localhost:5173";
const HEADLESS = process.env.EFLOW_SPECTATE_HEADLESS === "1";
const RUN_DELIVERY = process.env.EFLOW_RUN_DELIVERY !== "0";
const SLOW_MO = Number(process.env.EFLOW_SPECTATE_SLOW_MO || 450);
const HOLD_MS = Number(process.env.EFLOW_SPECTATE_HOLD_MS || 10_000);
const ARTIFACT_DIR = path.resolve(process.env.EFLOW_SPECTATE_ARTIFACTS || "artifacts/e2e-live-spectate");
const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
const PLAN_TITLE = process.env.EFLOW_DEMO_TITLE || `E2E Inter-Department Delivery ${runStamp}`;
const TASK_TITLE = process.env.EFLOW_DEMO_TASK_TITLE || `Joint service delivery ${runStamp}`;
const SUBTASK_TITLE = process.env.EFLOW_DEMO_SUBTASK_TITLE || `Prepare delivery evidence ${runStamp}`;
const TASK_DEADLINE = process.env.EFLOW_DEMO_DEADLINE || futureDate(45);
const BUDGET_AMOUNT = process.env.EFLOW_PROPOSAL_BUDGET || "1000";
const PARTICIPANT_ORG = process.env.EFLOW_PARTICIPANT_ORG || "BPLO";
const TEAM_LEAD_NAME = process.env.EFLOW_TASK_LEAD_NAME || "Gabriel Cahiyang";
const OPTIONAL_TEAM_MEMBER_NAMES = csv(process.env.EFLOW_TASK_MEMBER_NAMES || "Tasya Salcedo");

const ACCOUNTS = {
  owner: {
    email: process.env.EFLOW_OWNER_EMAIL || "bplo.head@gmail.com",
    password: process.env.EFLOW_OWNER_PASSWORD || "123456",
    label: process.env.EFLOW_OWNER_LABEL || "proposal owner Head",
  },
  participant: {
    email: process.env.EFLOW_PARTICIPANT_EMAIL || "zoning.leader@gmail.com",
    password: process.env.EFLOW_PARTICIPANT_PASSWORD || "123456",
    label: `${PARTICIPANT_ORG} approver`,
  },
  teamLead: {
    email: process.env.EFLOW_TEAM_LEAD_EMAIL || "gabzcah@gmail.com",
    password: process.env.EFLOW_TEAM_LEAD_PASSWORD || "123456",
    label: `${TEAM_LEAD_NAME} (Task Leader)`,
  },
  admin: {
    email: process.env.EFLOW_ADMIN_EMAIL || "admin@gmail.com",
    password: process.env.EFLOW_ADMIN_PASSWORD || "admin123",
    label: "Super Admin observer",
  },
};

const governance = governanceConfiguration();
const events = [];

function csv(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function futureDate(days) {
  const result = new Date();
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

function governanceConfiguration() {
  const org = process.env.EFLOW_GOVERNANCE_ORG?.trim();
  const email = process.env.EFLOW_GOVERNANCE_EMAIL?.trim();
  const password = process.env.EFLOW_GOVERNANCE_PASSWORD?.trim();
  if ([org, email, password].some(Boolean) && ![org, email, password].every(Boolean)) {
    throw new Error("Governance is optional, but EFLOW_GOVERNANCE_ORG, EFLOW_GOVERNANCE_EMAIL, and EFLOW_GOVERNANCE_PASSWORD must be supplied together.");
  }
  return org && email && password ? { org, account: { email, password, label: `${org} governance approver` } } : null;
}

function banner(message) {
  console.log(`\n${"=".repeat(72)}\n${message}\n${"=".repeat(72)}`);
}

function note(message) {
  events.push({ at: new Date().toISOString(), message });
  console.log(`  • ${message}`);
}

async function expectVisible(locator, label, timeout = 12_000) {
  try {
    await locator.waitFor({ state: "visible", timeout });
    return locator;
  } catch {
    throw new Error(`Could not find ${label}. Current page: ${locator.page().url()}`);
  }
}

async function clickVisible(locator, label, timeout) {
  const target = await expectVisible(locator.first(), label, timeout);
  await target.click();
  return target;
}

async function appText(page) {
  return (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 1_500);
}

async function ensureEnabled(locator, label) {
  const target = await expectVisible(locator.first(), label);
  if (!(await target.isEnabled())) {
    throw new Error(`${label} is disabled. Visible page state: ${await appText(target.page())}`);
  }
  return target;
}

async function dismissInterruptions(page) {
  const candidates = [
    page.getByRole("button", { name: /maybe later/i }),
    page.getByRole("button", { name: /close welcome/i }),
    page.getByRole("button", { name: /skip tour/i }),
  ];
  for (const candidate of candidates) {
    if (await candidate.first().isVisible().catch(() => false)) await candidate.first().click();
  }
}

async function waitForAppShell(page, timeout = 45_000) {
  const ready = () => page.waitForFunction(() => {
    const text = document.body?.innerText || "";
    const stillLoading = /Loading eFlow/i.test(text);
    const hasRoleNavigation = /(Plans & Projects|Proposals & Projects|Projects|Dashboard|Overview|My Tasks|Task Board)/i.test(text);
    return !stillLoading && hasRoleNavigation;
  }, undefined, { timeout });

  try {
    await ready();
  } catch (firstError) {
    const loading = /Loading eFlow/i.test(await page.locator("body").innerText().catch(() => ""));
    if (!loading) throw firstError;
    note("eFlow profile resolution is still loading; reloading once and waiting for the app shell");
    await page.reload({ waitUntil: "domcontentloaded" });
    await ready();
  }
}

async function login(page, account) {
  banner(`LOGIN · ${account.label}`);
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await dismissInterruptions(page);
  const email = page.locator("#login-email, input[type='email']").first();
  if (await email.isVisible().catch(() => false)) {
    await email.fill(account.email);
    await page.locator("#login-password, input[type='password']").first().fill(account.password);
    await clickVisible(page.locator("#login-submit, button[type='submit']"), "Sign In button");
  }
  await page.waitForFunction(() => !document.querySelector("input[type='password']"), undefined, { timeout: 15_000 });
  await waitForAppShell(page);
  await dismissInterruptions(page);
  note(`Authenticated as ${account.email}`);
}

async function logout(page) {
  const button = page.locator("button[title='Log out'], button[aria-label='Log out']").first();
  if (await button.isVisible().catch(() => false)) {
    await button.click();
    await page.waitForTimeout(700);
  } else {
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  }
}

async function openSidebarDestination(page, names) {
  for (const name of names) {
    const exact = page.getByText(name, { exact: true }).first();
    if (await exact.isVisible().catch(() => false)) {
      await exact.click();
      await page.waitForTimeout(800);
      return;
    }
  }
  throw new Error(`No sidebar destination matched: ${names.join(" / ")}. Visible page state: ${await appText(page)}`);
}

async function openPlans(page) {
  await openSidebarDestination(page, ["Plans & Projects", "Proposals & Projects", "Projects"]);
  await expectVisible(page.getByText(/Proposals & Projects|Projects/, { exact: true }).first(), "Plans & Projects workspace");
}

async function chooseOrganization(page, organizationName, role = "participant") {
  const picker = await expectVisible(page.getByTestId("organization-scope-picker"), "organization scope picker");
  const select = picker.getByTestId("organization-scope-candidate");
  const options = await select.locator("option").evaluateAll((nodes) => nodes.map((node) => ({ value: node.value, label: node.textContent || "" })));
  const option = options.find((item) => item.label.toLowerCase().includes(organizationName.toLowerCase()));
  if (!option) throw new Error(`Organization “${organizationName}” is unavailable. Options: ${options.map((item) => item.label.trim()).filter(Boolean).join(", ")}`);
  await select.selectOption(option.value);
  await clickVisible(picker.getByTestId("organization-scope-add"), `Add ${organizationName}`);
  const row = picker.locator(`[data-testid="organization-scope-row"][data-organization-name="${organizationName}"]`).first();
  await expectVisible(row, `${organizationName} scope row`);
  const roleSelect = row.locator("select").first();
  if (await roleSelect.count()) await roleSelect.selectOption(role);
  if (role === "participant") {
    const staffing = row.locator("input[type='checkbox']").first();
    if (await staffing.count() && !(await staffing.isChecked())) await staffing.check();
  }
  note(`${organizationName} added as ${role}`);
}

async function configureBudget(page) {
  const editor = await expectVisible(page.getByTestId("proposal-budget-editor"), "proposal budget editor");
  await editor.locator("input[aria-label^='Category 1']").first().fill("Joint service delivery");
  await editor.locator("input[aria-label^='Particular 1 for']").first().fill("Shared implementation materials and evidence preparation");
  await editor.locator("input[aria-label^='Amount for particular 1']").first().fill(BUDGET_AMOUNT);
  note(`Proposal budget set to ₱${Number(BUDGET_AMOUNT).toLocaleString("en-PH")}`);
}

async function editDefaultTask(page) {
  const row = await expectVisible(page.getByTestId("manual-task-row").first(), "default New Task row");
  await clickVisible(row.getByTestId("manual-task-edit"), "Edit task button");
  await row.getByTestId("manual-task-title").fill(TASK_TITLE);
  await row.getByTestId("manual-task-description").fill("Coordinate the owner and participant offices, produce the joint deliverable, and submit evidence for independent review.");
  await row.getByTestId("manual-task-deadline").fill(TASK_DEADLINE);
  await clickVisible(row.getByTestId("manual-task-finish-editing"), "Done editing task button");
  note(`Default task completed: ${TASK_TITLE}, due ${TASK_DEADLINE}`);
}

async function selectAssignmentMember(dialog, name, required) {
  const member = dialog.locator(`[data-testid="team-assignment-member"][data-employee-name="${name}"]`).first();
  if (!(await member.isVisible().catch(() => false))) {
    const available = await dialog.locator("[data-testid='team-assignment-member']").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-employee-name")).filter(Boolean));
    if (required) throw new Error(`Required Task Leader “${name}” is not eligible. Available people: ${available.join(", ")}`);
    note(`Optional team member ${name} is not eligible and was skipped`);
    return false;
  }
  await member.click();
  return true;
}

async function assignDraftTeam(page) {
  const row = page.getByTestId("manual-task-row").first();
  await clickVisible(row.getByTestId("manual-task-assignment"), "Assign team and leader button");
  const dialog = await expectVisible(page.getByTestId("team-assignment-dialog"), "team assignment dialog");
  await selectAssignmentMember(dialog, TEAM_LEAD_NAME, true);
  for (const memberName of OPTIONAL_TEAM_MEMBER_NAMES.filter((name) => name !== TEAM_LEAD_NAME)) {
    await selectAssignmentMember(dialog, memberName, false);
  }
  await clickVisible(dialog.getByTestId("team-assignment-confirm"), "Confirm team assignment");
  await expectVisible(row.getByText(new RegExp(`Lead:.*${TEAM_LEAD_NAME.split(" ")[0]}`, "i")), `${TEAM_LEAD_NAME} assignment summary`);
  note(`${TEAM_LEAD_NAME} assigned as Task Leader`);
}

async function assertNoManualValidation(page) {
  const alert = page.getByRole("alert").filter({ hasText: "Complete these items before creating the work plan" });
  if (await alert.isVisible().catch(() => false)) throw new Error(await alert.innerText());
}

async function openDraft(page, view, title = PLAN_TITLE) {
  await clickVisible(page.getByTestId(`projects-view-${view}`), `${view} workspace tab`);
  const card = page.locator(`[data-testid="collaboration-draft-card"][data-draft-title="${title}"]`).first();
  await clickVisible(card, `draft “${title}”`, 15_000);
  await expectVisible(page.getByRole("heading", { name: title, exact: true }), `draft heading “${title}”`);
}

async function createAndRequestReview(page) {
  banner("STEP 1 · OWNER CREATES A COMPLETE INTER-DEPARTMENT DRAFT");
  await openPlans(page);
  await clickVisible(page.getByTestId("build-work-plan"), "Build work plan button");
  await expectVisible(page.getByTestId("manual-plan-builder"), "manual plan builder");
  await page.getByTestId("manual-plan-title").fill(PLAN_TITLE);
  await page.getByTestId("manual-plan-description").fill("Live spectator test of proposal drafting, external approval, atomic publication, delivery evidence, and final task review.");
  await chooseOrganization(page, PARTICIPANT_ORG, "participant");
  if (governance) await chooseOrganization(page, governance.org, "governance");
  await configureBudget(page);
  await clickVisible(page.getByTestId("manual-plan-add-first-program"), "Add first Program button");
  await editDefaultTask(page);
  await assignDraftTeam(page);
  await assertNoManualValidation(page);
  const done = await ensureEnabled(page.getByTestId("manual-plan-done-editing"), "Done editing button");
  await done.click();
  await page.getByTestId("manual-plan-builder").waitFor({ state: "hidden", timeout: 15_000 });
  note("Draft saved without validation errors");
  await openDraft(page, "drafts");
  const request = await ensureEnabled(page.getByTestId("request-collaboration-review"), "Request collaboration review button");
  await request.click();
  await page.waitForTimeout(1_200);
  note("Revision sent for external approval");
}

async function approveRevision(page, account, expectedOrg) {
  banner(`EXTERNAL APPROVAL · ${expectedOrg}`);
  await login(page, account);
  await openPlans(page);
  await openDraft(page, "incoming");
  await clickVisible(page.getByText("Approvals", { exact: true }), "Approvals tab");
  const actingFor = page.getByText(new RegExp(`Acting for\\s+${expectedOrg}`, "i"));
  await expectVisible(actingFor, `${expectedOrg} decision authority`);
  await clickVisible(page.getByTestId("approve-collaboration-revision"), "Approve current revision button");
  await clickVisible(page.getByTestId("confirm-collaboration-decision"), "Confirm approval button");
  await page.waitForTimeout(1_000);
  note(`${expectedOrg} approved the current revision`);
  await logout(page);
}

async function publishProposal(page) {
  banner("STEP 3 · OWNER PUBLISHES OPERATIONAL WORK");
  await login(page, ACCOUNTS.owner);
  await openPlans(page);
  await openDraft(page, "drafts");
  const publish = await ensureEnabled(page.getByTestId("publish-proposal"), "Publish proposal button");
  await publish.click();
  await expectVisible(page.getByText(PLAN_TITLE, { exact: true }).first(), "published proposal in the operational portfolio", 20_000);
  note("Proposal published; operational project and task records were created");
  await logout(page);
}

async function createAndSubmitSubtask(page, evidencePath) {
  banner("STEP 4 · TASK LEADER CREATES, ASSIGNS, AND SUBMITS A SUBTASK");
  await login(page, ACCOUNTS.teamLead);
  await openSidebarDestination(page, ["Pinned — You're Leading", "Work I'm Leading", "Leading Work"]);
  await expectVisible(page.getByText(TASK_TITLE, { exact: true }), `leading task “${TASK_TITLE}”`, 15_000);
  const addInput = await expectVisible(page.locator("input[placeholder='Add a subtask for team members…']").first(), "Add subtask input");
  await addInput.fill(SUBTASK_TITLE);
  const createRow = addInput.locator("xpath=..");
  const due = createRow.locator("input[aria-label='New subtask due date']");
  if (!(await due.inputValue())) await due.fill(TASK_DEADLINE);
  await clickVisible(createRow.getByRole("button", { name: /^Add$/ }), "Add subtask button");
  const subtaskLabel = await expectVisible(page.getByText(SUBTASK_TITLE, { exact: true }), `subtask “${SUBTASK_TITLE}”`, 15_000);
  const subtaskRow = subtaskLabel.locator("xpath=ancestor::div[contains(@class,'group')][1]");
  await clickVisible(subtaskRow.locator("button[title^='Assign subtask to team members']"), "subtask assignment picker");
  await clickVisible(subtaskRow.getByRole("button", { name: new RegExp(TEAM_LEAD_NAME, "i") }), `${TEAM_LEAD_NAME} assignment option`);
  await page.keyboard.press("Escape");
  note(`Subtask created and assigned to ${TEAM_LEAD_NAME}`);

  await openSidebarDestination(page, ["My Subtasks"]);
  await clickVisible(page.getByText(SUBTASK_TITLE, { exact: true }), `My Subtasks row for “${SUBTASK_TITLE}”`, 15_000);
  const drawer = await expectVisible(page.getByRole("heading", { name: SUBTASK_TITLE, exact: true }).locator("xpath=ancestor::aside"), "subtask work drawer");
  await drawer.locator("input[type='range']").fill("100");
  await drawer.locator("textarea[placeholder^='Explain what was completed']").fill("Joint delivery evidence is complete and ready for independent review.");
  await drawer.locator("input[type='file']").setInputFiles(evidencePath);
  const submit = await ensureEnabled(drawer.getByRole("button", { name: /Submit for review/i }), "Submit subtask for review button");
  await submit.click();
  await expectVisible(drawer.getByText("Waiting for the assigned reviewer"), "subtask review waiting state", 15_000);
  note("Subtask evidence submitted for review");
  await logout(page);
}

async function approveSubtask(page) {
  banner("STEP 5 · OWNER APPROVES SUBTASK EVIDENCE");
  await login(page, ACCOUNTS.owner);
  await openSidebarDestination(page, ["Reviews", "Leader Reviews"]);
  const subtaskSwitch = page.getByRole("button", { name: /^Subtasks$/ });
  if (await subtaskSwitch.isVisible().catch(() => false)) await subtaskSwitch.click();
  await expectVisible(page.getByText(SUBTASK_TITLE, { exact: true }), `subtask review “${SUBTASK_TITLE}”`, 15_000);
  await clickVisible(page.getByRole("button", { name: /Approve evidence/i }), "Approve evidence button");
  await page.waitForTimeout(1_000);
  note("Subtask evidence approved");
  await logout(page);
}

async function submitParentTask(page, evidencePath) {
  banner("STEP 6 · TASK LEADER SUBMITS THE COMPLETED PARENT TASK");
  await login(page, ACCOUNTS.teamLead);
  await openSidebarDestination(page, ["Pinned — You're Leading", "Work I'm Leading", "Leading Work"]);
  await expectVisible(page.getByText(TASK_TITLE, { exact: true }), `leading task “${TASK_TITLE}”`, 15_000);
  await clickVisible(page.getByRole("button", { name: /View Details/i }).first(), "View task details button");
  const drawer = await expectVisible(page.getByRole("heading", { name: TASK_TITLE, exact: true }).locator("xpath=ancestor::div[contains(@class,'fixed')][1]"), "task detail drawer");
  const noteField = drawer.locator("textarea[placeholder^='Summarize the result']");
  await expectVisible(noteField, "parent-task completion note", 15_000);
  await noteField.fill("All assigned subtasks were independently approved; the joint deliverable is ready for final Head review.");
  await drawer.locator("input[type='file']").last().setInputFiles(evidencePath);
  await clickVisible(drawer.getByRole("button", { name: /^Submit for review$/i }), "Submit parent task for review button");
  await page.waitForTimeout(1_200);
  note("Parent task submitted for final review");
  await logout(page);
}

async function approveParentTask(page) {
  banner("STEP 7 · OWNER APPROVES THE PARENT TASK");
  await login(page, ACCOUNTS.owner);
  await openSidebarDestination(page, ["Reviews", "Leader Reviews"]);
  const taskSwitch = page.getByRole("button", { name: /^Tasks$/ });
  if (await taskSwitch.isVisible().catch(() => false)) await taskSwitch.click();
  await clickVisible(page.getByText(TASK_TITLE, { exact: true }).first(), `task review “${TASK_TITLE}”`, 15_000);
  await clickVisible(page.getByRole("button", { name: /^Approve$/ }), "Approve task button");
  await clickVisible(page.getByRole("button", { name: /Confirm approval/i }), "Confirm task approval button");
  await page.waitForTimeout(1_200);
  note("Parent task approved and completed");
  await logout(page);
}

async function verifyAsAdmin(page) {
  banner("FINAL OVERSIGHT · SUPER ADMIN READ-ONLY VERIFICATION");
  await login(page, ACCOUNTS.admin);
  await openPlans(page);
  const search = page.locator("input[placeholder*='Search proposals']").first();
  if (await search.isVisible().catch(() => false)) await search.fill(PLAN_TITLE);
  await expectVisible(page.getByText(PLAN_TITLE, { exact: true }).first(), `published proposal “${PLAN_TITLE}”`, 15_000);
  note("Super Admin can see the published proposal in the operational portfolio");
}

async function launchBrowser() {
  const requestedChannel = process.env.EFLOW_BROWSER_CHANNEL?.trim();
  const channels = Array.from(new Set([requestedChannel, "chrome", "msedge"].filter(Boolean)));
  const failures = [];
  for (const channel of channels) {
    try {
      note(`Launching installed ${channel} browser`);
      return await chromium.launch({ headless: HEADLESS, channel, slowMo: SLOW_MO });
    } catch (error) {
      failures.push(`${channel}: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
    }
  }
  try {
    note("Installed Chrome/Edge was unavailable; trying Playwright Chromium");
    return await chromium.launch({ headless: HEADLESS, slowMo: SLOW_MO });
  } catch (error) {
    failures.push(`playwright chromium: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
  }
  throw new Error(`No compatible browser could be launched. Install Chrome or Edge, or run “npx playwright install chromium”. Attempts: ${failures.join(" | ")}`);
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log("Run with: npm run spectate:interdept\nOptional: EFLOW_RUN_DELIVERY=0, EFLOW_SPECTATE_HEADLESS=1, EFLOW_DEMO_TITLE=..., EFLOW_*_EMAIL/PASSWORD. Governance requires EFLOW_GOVERNANCE_ORG/EMAIL/PASSWORD together.");
    return;
  }

  await mkdir(ARTIFACT_DIR, { recursive: true });
  const evidencePath = path.join(ARTIFACT_DIR, `delivery-evidence-${runStamp}.txt`);
  await writeFile(evidencePath, `eFlow live workflow evidence\nProposal: ${PLAN_TITLE}\nTask: ${TASK_TITLE}\nCreated: ${new Date().toISOString()}\n`, "utf8");
  const response = await fetch(BASE_URL).catch(() => null);
  if (!response?.ok) throw new Error(`eFlow is not reachable at ${BASE_URL}. Start it with npm run dev before running this spectator.`);

  banner("EFLOW LIVE INTER-DEPARTMENT SPECTATOR");
  note(`Proposal: ${PLAN_TITLE}`);
  note(`Participant: ${PARTICIPANT_ORG}`);
  note(governance ? `Governance: ${governance.org}` : "Governance: not configured (department Head review routing applies)");

  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await login(page, ACCOUNTS.owner);
    await createAndRequestReview(page);
    await logout(page);
    await approveRevision(page, ACCOUNTS.participant, PARTICIPANT_ORG);
    if (governance) await approveRevision(page, governance.account, governance.org);
    await publishProposal(page);
    if (RUN_DELIVERY) {
      await createAndSubmitSubtask(page, evidencePath);
      await approveSubtask(page);
      await submitParentTask(page, evidencePath);
      await approveParentTask(page);
    } else {
      note("Delivery phases skipped because EFLOW_RUN_DELIVERY=0");
    }
    await verifyAsAdmin(page);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `success-${runStamp}.png`), fullPage: true });
    banner("LIVE FLOW COMPLETED SUCCESSFULLY");
    if (!HEADLESS && HOLD_MS > 0) await page.waitForTimeout(HOLD_MS);
  } catch (error) {
    process.exitCode = 1;
    const message = error instanceof Error ? error.stack || error.message : String(error);
    console.error(`\nFAILED\n${message}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `failure-${runStamp}.png`), fullPage: true }).catch(() => undefined);
    await writeFile(path.join(ARTIFACT_DIR, `failure-${runStamp}.txt`), `${message}\n\nPAGE\n${await appText(page)}\n`, "utf8");
  } finally {
    await writeFile(path.join(ARTIFACT_DIR, `run-${runStamp}.json`), JSON.stringify({ planTitle: PLAN_TITLE, taskTitle: TASK_TITLE, subtaskTitle: SUBTASK_TITLE, baseUrl: BASE_URL, runDelivery: RUN_DELIVERY, governance: governance?.org || null, events }, null, 2), "utf8");
    await context.close();
    await browser.close();
  }
}

await main().catch((error) => {
  process.exitCode = 1;
  console.error(`\nSPECTATOR COULD NOT START\n${error instanceof Error ? error.message : String(error)}`);
});
