Since the Super Administrator and compliance auditors need to instantly spot bottlenecks and legal deviations, we will heavily utilize dynamic node graphs, variant analysis boards, and split-view comparison layouts.

Here is the exact, Monday.com-inspired UI/UX blueprint for the Process Mining menus based on the structure you provided.

1. Discovery Visualizations
This section focuses on "Process Discovery"—taking raw system data and using heuristic algorithms to automatically draw a map of how city hall employees are actually executing their work, rather than how they are "supposed" to be doing it.

1.1 Heuristic Graphs

Page Header & Actions: "Process Discovery & Topology." Top-right actions include an "Adjust Heuristic Threshold" slider (to filter out rare, noisy paths) and an "Export to BPMN" button.

Main Content Area (The Interactive Canvas): Instead of a grid, the main workspace is a massive, interactive, panning canvas. It displays a directed node graph. The nodes (rectangles) represent specific activities (e.g., "Purchase Request Filed," "Mayor's Approval"). The edges (arrows connecting the nodes) represent the transition of the project.

Interaction: The thickness of the arrows visually indicates the frequency of that path. If a specific transition is causing severe delays (e.g., documents sitting at the Budget Office for 14 days), that specific arrow pulses in a high-contrast red. Clicking a node opens a side-drawer showing the average wait time and the specific personnel involved.

Widgets/Visualizations: A top-anchored "Process Standardization" battery widget showing the percentage of cases that follow the "Happy Path" (the ideal workflow) versus those that take chaotic, undocumented detours.

1.2 Execution Paths

Page Header & Actions: "Variant Analysis." Actions include "Filter by Department Tenant" and a "Compare Selected Variants" button.

Main Content Area (The Variant Board): A Monday.com-style board that groups projects by the specific path they took.

Rows (Items): Represent a "Process Variant" (a unique sequence of steps).

Columns: Include "Variant ID", "Frequency" (a numbers column showing how many projects took this exact path), "Average Duration" , and a highly visual "Path Sequence" column. This sequence column uses sequential mini-status pills (e.g., ➡️ ➡️ ➡️) so the admin can read the workflow like a sentence.

Widgets/Visualizations: A horizontal bar chart showing the "Top 5 Most Common Execution Paths," allowing IT to quickly see the standard operating behavior of the municipality.

1.3 Event Log Analysis

Page Header & Actions: "Raw Telemetry & Event Logs." Actions include "Upload XES/CSV Log" and "Trigger Database Sync."

Main Content Area (The Telemetry Grid): A high-density, highly sortable data table acting as the foundational data layer for the AI.

Columns: "Case ID" (the specific project), "Activity Name", "Timestamp", "Resource" (the user who performed the action), and "Lifecycle" (Start/Complete).

Widgets/Visualizations: A "Cases Over Time" timeline chart. This visualizes event volume across the day, week, or month, helping the Super Admin identify peak operational hours or system stress points where server loads might need to be increased.

2. Global Compliance Alerts
This section focuses on "Conformance Checking." It continuously compares the real-world execution paths (discovered above) against the strict legal models (like the New Government Procurement Act) to instantly catch fraud, skipped steps, or severe violations.

2.1 Procedure Deviations

Page Header & Actions: "Conformance & Deviation Tracking." Actions include "Update Normative Legal Model" and "Acknowledge Alerts."

Main Content Area (Split-View Comparison): A dual-pane layout designed for rapid auditing.

Left Pane: An inbox-style list of flagged projects that deviated from the mandated legal process (e.g., a project that bypassed public bidding).

Right Pane: When an admin clicks a flagged project, this pane overlays the "Expected BPMN Path" (in gray) with the "Actual Executed Path" (in blue). Any legally mandated step that was skipped is highlighted with a glaring orange "Missing" warning icon.

Widgets/Visualizations: A Donut Chart categorizing the deviations: "Skipped Approvals" (40%), "Out-of-Order Execution" (35%), and "Unauthorized Resource" (25%).

2.2 Circumvention Flags

Page Header & Actions: "Fraud & Anomaly Detection." A prominent, red "Escalate to City Legal/COA" button.

Main Content Area (The Escalation Kanban): A high-priority triage board for severe anomalies.

Columns: "New Flags," "Under Investigation," "Escalated," and "Cleared."

Cards: Represent suspicious user activities (e.g., the AI detecting a user splitting a large Purchase Order into multiple smaller ones to avoid the ₱500,000 public bidding threshold). Cards feature an AI-generated "Risk Score" pill (0-100) and the avatar of the user involved.

Widgets/Visualizations: A Departmental Risk Heatmap. The X-axis lists the City Hall Departments, and the Y-axis lists the types of circumventions. Hotspots glow dark red where suspicious activities cluster, immediately directing the auditor's attention to problematic offices.

2.3 Audit Feed

Page Header & Actions: "Real-Time Compliance Ledger." Actions include "Filter by Violation Type" and "Export to PDF/Excel".

Main Content Area (The Streaming Log): A chronological, read-only feed. It is designed to look like an immutable terminal or ticker. Each entry details a background compliance check performed by the AI.

Format:  - - Evaluated against - Result: followed by a stark green or red pill.

Widgets/Visualizations: A massive "Global Compliance Score" gauge widget at the very top of the page (e.g., 98.5% LGU-wide compliance rate) that ticks up or down in real-time as municipal workers process their tasks throughout the day.