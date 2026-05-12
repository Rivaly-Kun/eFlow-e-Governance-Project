Because we are dealing with a massive municipal workforce operating under strict data privacy regulations, this section must prioritize foolproof Role-Based Access Control (RBAC) and Row-Level Security (RLS). The UI must make it impossible for an IT admin to accidentally grant a regular employee access to the city's financial ledgers.

Based on the sidebar hierarchy provided in your image, here is the exhaustive UI/UX blueprint for the Access Control menus.

1. Global RBAC Configuration
This sub-menu manages the "who can do what" across the entire eFlow system. It translates abstract permissions into clear, visual role assignments.

1.1 Role Assignment (CRUD & Matrix View)

Page Header & Actions: The header reads "Role & Permission Matrix." Top-right actions include the primary CRUD buttons: + Create Custom Role, Edit Permissions, and Bulk Assign Users.

Main Content Area (The Permission Matrix): Instead of endless scrolling lists, we use a dense, visual matrix board.

The Rows (Items): Represent the specific job roles (e.g., "City Engineer Admin," "BPLO Inspector," "Regular Employee").

The Columns (Resources): Represent the system modules (e.g., "Project Portfolios," "Budget Ledgers," "HR Analytics").

The Cells: Inside the intersecting cells are highly visual "Status Pills" denoting the exact CRUD permissions: Read, Write, Update, Delete, or Full Access.

Interaction (Inverted Tree Hierarchy): Clicking on a senior role like "City Administrator" opens a split-screen side drawer. This drawer displays a visual "Inverted Tree" graph, proving exactly which read-only permissions this senior role automatically inherits from the junior roles beneath them.

Widgets/Visualizations: A "Least Privilege Index" gauge. If the system detects that too many users hold "Full Access" or "Super Admin" roles, this gauge turns red, warning the IT team of a severe security risk.

1.2 HRMO Integration

Page Header & Actions: "HRIS Active Sync." Actions include Force Manual Sync and Review Sync Conflicts.

Main Content Area (Automated Update Board): This board visualizes the automated pipeline between the Human Resource Management Office database and the eFlow system.

The Groups: Categorized by HR Events: "New Hires," "Promotions/Transfers," and "Suspensions."

The Columns: Display the Employee Name, their Old Department, their New Department, the "Proposed Role Change," and a strict "Sync Status" pill (e.g., Pending HR Approval, Successfully Synced, Role Mismatch).

Interaction: If a user is promoted from "Staff" to "Project Leader," a row appears here automatically. The Super Admin simply clicks a Validate Change button in the final column to instantly provision their new dashboard access.

Widgets/Visualizations: A real-time timeline widget (Gantt-style) tracking the onboarding speed of new municipal hires, proving how fast IT provisions their digital workspaces.

1.3 Offboarding Automation

Page Header & Actions: "Automated Access Revocation." The primary action is a high-contrast, red Trigger Emergency Lockout button for hostile terminations.

Main Content Area (The Revocation Kanban): A critical security board designed to ensure no former employee retains access to city data.

The Columns (Pipeline): "Notice Received," "Access Throttled" (e.g., preventing mass downloads prior to departure), "Fully Revoked," and "Data Reassigned."

The Cards: Represent departing employees. Clicking a card uses progressive disclosure to open a checklist of all connected systems (e.g., eFlow DB, Viber integration, shared folders). As the system automatically revokes access to each, a green checkmark appears.

Widgets/Visualizations: An "Orphaned Account Risk" battery widget. This widget continuously scans the database and flags any active eFlow accounts that no longer have a corresponding active profile in the HR database, allowing IT to immediately delete ghost accounts.

2. Tenant Isolation Controls
Because all departments in Ormoc City Hall share the same underlying eFlow software (the "Pool Model"), this sub-menu ensures strict data isolation so departments cannot see each other's private records without permission.

2.1 Data Partitioning

Page Header & Actions: "Row-Level Security (RLS) Manager." Actions include Audit Tenant Boundaries and Re-index Databases.

Main Content Area (Security Policy Board): This board allows Super Admins to manage database isolation without writing raw SQL code.

The Groups: Categorized by City Hall Departments (the "Tenants").

The Columns: List the core database tables (e.g., "Project_Tasks," "Liquidations"). The most critical column is the "RLS Enforced" toggle. Next to it is a formula column displaying the specific tenant_id assigned to that department.

Interaction: If an admin attempts to toggle off Row-Level Security for a highly sensitive table like "Employee_Health_Records," the system triggers a mandatory Multi-Signature approval modal, requiring another Admin to authorize the weakened security.

Widgets/Visualizations: A stacked bar chart visualizing database storage consumption broken down by Department Tenant, helping IT manage cloud hosting costs.

2.2 Privacy Compliance

Page Header & Actions: "Data Privacy Act Conformance." Actions include Run PII Scan (Personally Identifiable Information) and Export Compliance Log.

Main Content Area (Data Masking Board): A board dedicated to protecting sensitive citizen and employee data.

The Items: Represent specific data fields across the software (e.g., "Salary Grade," "Home Address," "Contact Number").

The Columns: "Data Type" (Public, Internal, Confidential), "Encryption Status" (AES-256), and "Masking Rule."

Interaction: Admins can use a dropdown in the "Masking Rule" column to set parameters like "Show only last 4 digits" for phone numbers unless the user has the HR role.

Widgets/Visualizations: A "Compliance Score" donut chart (e.g., 99% Secure). If any sensitive columns are detected without encryption or RLS applied, the score drops and pulses red to demand immediate attention.

2.3 Cross-Dept Isolation

Page Header & Actions: "Inter-Department Boundary Log." Actions include Approve Data Sharing Exception and Block Origin IP.

Main Content Area (Intrusion Detection List): A specialized, dark-themed log board that records every instance where data isolation boundaries were tested.

The Rows: Represent specific query attempts.

The Columns: "Requesting User," "Origin Department" (e.g., City Planning), "Target Department" (e.g., City Treasurer), "Data Requested," and a strict "Action Taken" pill (Blocked by RLS, Flagged, or Approved Exception).

Widgets/Visualizations: An interactive, node-based network graph mapping the data flows between city departments. Approved cross-departmental sharing (e.g., Engineering legally querying Finance for budget clearance) is shown with thick blue lines. Any unauthorized query attempts are highlighted as flashing red lines connecting the department nodes, allowing the Super Admin to instantly spot internal espionage or broken API calls.