this menu is built for the Mayor, Vice Mayor, and City Administrator. Executives do not do data entry; they consume data to make decisions. Therefore, the UI/UX language here shifts from "Grids and Forms" to "Batteries, Heatmaps, and Actionable Nudges."

Here is the high-fidelity content specification for the Executive Portfolio module.

2. Executive Portfolio (The Mayoral Cockpit)
Design Philosophy: Zero-friction visibility. Every metric on this screen is aggregated from the BPA engine, validated by Blockchain, and analyzed by the AI, giving city leadership an unshakeable single source of truth.

2.1 City Project Pulse
Focus: The macro-level view of Ormoc City's "Project Transform" initiatives.

A. Portfolio Completion Rates
Page Header & Actions: City-Wide Project Completion | [Filter: FY 2026] | [Export: DILG Transparency Report]

Main Content (Monday-style Battery Layout):

The "Pillar" Sunburst Chart: A massive, interactive ring chart breaking down projects by city pillars (e.g., Infrastructure, Health, Eco-Tourism). Clicking a slice filters the boards below.

Project Battery Boards: Each major project (e.g., Lake Danao Road Expansion) is represented not as a row, but as a large "Battery Widget".

Visuals: A segmented progress bar showing Planning (Green) ➔ Procurement (Blue) ➔ Execution (Amber) ➔ Liquidation (Grey).

Stats: Overall: 64% Complete | Active Workforce: 142 Staff.

Row-Level Security (RLS) Logic: Unlike Department Heads, the Executive role has the Global_Read policy. They see the aggregated data of all 20+ city departments combined.

B. Budget Burn-Down
Page Header & Actions: Fiscal Utilization & Liquidation | [View: Blockchain Ledger Summary]

Main Content (Financial Visualizations):

The "Advance vs. Return" Scale: A dual-axis line chart. The blue line shows funds advanced; the green line shows funds mathematically liquidated via the Return Portal.

Departmental Efficiency Grid: A table ranking departments by their "Liquidation Velocity" (how fast they return unused funds and submit receipts).

UI Nudge: Departments lagging behind have a Red Pill next to their name.

ROI / NPV Tracker: A summary widget pulling from the AI NPV calculations done during project creation. It proves to the Mayor that the city’s portfolio is maintaining a positive Net Present Value.

C. Critical Bottlenecks
Page Header & Actions: Systemic Stalls & SLA Breaches | [Action: Trigger All-Dept Alert]

Main Content (The "Red Flag" Board):

The Bottleneck Feed: A specialized Kanban board showing only process instances that have breached their Service Level Agreements (SLAs) in the BPA Engine.

Card Details: Project: Smart Clinic | Stuck At: Finance Scrutiny | Duration: 14 Days.

The "Executive Nudge": Every card has a Viber Icon. The Mayor can click it to instantly send a high-priority, automated message directly to the specific employee holding up the task: "The Office of the Mayor is requesting an immediate status update on this node."

2.2 Strategic AI Insights
Focus: Shifting the LGU from reactive management to proactive, predictive governance using the Random Forest and NLP engines.

A. Predictive Insight Cards
Page Header & Actions: AI Risk Forecasts | [Toggle: 30-Day / 90-Day Horizon]

Main Content (Masonry Grid of "Smart Cards"):

Instead of raw data, the AI generates "Plain English" insight cards.

Card 1 (Burnout Risk): "High Risk of Delay in Engineering." (Subtext: The GA Engine detects that 80% of Civil Engineers are at maximum task capacity. Consider delaying the start of Project B by 2 weeks.)

Card 2 (Budget Warning): "Projected 15% Overrun." (Subtext: Historical data suggests the current phase of the Eco-Park typically exceeds budget by 15%. Recommend a preemptive supplementary review.)

UX Benefit: The Mayor doesn't need to understand machine learning to benefit from it. The AI translates data into direct operational advice.

B. Procurement Delay Alerts
Page Header & Actions: NGPA Compliance & Bidding Radar

Main Content (Process Mining Heatmap):

The Bidding Pipeline: A visualization specifically tracking projects flowing through the Bids and Awards Committee (BAC).

Anomaly Detection: Highlights specific projects where the time between "Opening of Bids" and "Notice of Award" is statistically anomalous compared to the city's historical average.

Integration: Clicking an alert opens the BPMN Viewer we designed earlier, highlighting the exact node where the procurement paperwork is gathering dust.

C. Actionable Intelligence (The NLP Digest)
Page Header & Actions: Daily Ground-Level Briefing | [Button: Export as PDF Brief]

Main Content (The "Morning Paper" UI):

The Automated Digest: The NLP engine reads all the unstructured Viber "Voice Stand-ups" submitted by regular employees the previous day and synthesizes them into a clean, 3-bullet executive summary.

Example Output: 1. Roadworks in Brgy. Ipil are progressing fast but face minor cement shortages.
2. The BPLO inspection team cleared 45 renewals yesterday; no major blockers.
3. Health workers report a spike in requests for the new mobile clinic schedule.

UX Benefit: The Mayor instantly understands the "mood and movement" of the entire city workforce without reading 500 separate chat messages or waiting for weekly physical reports.