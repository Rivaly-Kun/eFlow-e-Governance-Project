We will adopt the Jmix logic entirely but wrap it in the modern, frictionless "Monday.com aesthetic" to ensure it remains highly usable for the Super Administrators.

Here is the exhaustive UI/UX blueprint for the Global RBAC Configuration menu, focusing strictly on how roles are listed, created, and managed with granular CRUD capabilities.

1. Global RBAC Configuration: The Main Directory (List View)
UX Rationale: This is the entry point (similar to Image 5 in your references). It must clearly separate design-time roles (hardcoded by developers) from runtime roles (created dynamically by the IT admin in the database).

Page Header & Actions:

A clean title: "Access Control Directory".

Top right primary button: A split-dropdown button reading "+ Create Role". Clicking the arrow drops down two strict options: "Resource Role" and "Row-Level Role".

Secondary actions: "Assign to Users", "Export as JSON", and "Import".

Main Content Area (DataGrid):

A sleek, searchable DataGrid listing all active roles in the system.

Columns:

Name: The user-friendly label (e.g., "Full Access" or "Same Region").

Code: The system identifier (e.g., system-full-access).

Type: A high-contrast status pill indicating "Resource" (Blue) or "Row-Level" (Purple).

Source: A pill indicating "Database" (Runtime) or "Annotated Class" (Design-time). Design-time roles have a small "lock" icon next to them indicating they cannot be deleted via the UI.

Scope: Tags indicating if the role applies to the "UI", "API", or both.

Widgets (Top of Page): Quick stat cards showing "Total Active Roles", "Total Row-Level Policies", and a list of "Recently Modified Roles" for quick auditing.

2. Resource Role Designer (CRUD & UI Permissions)
UX Rationale: This interface (inspired by Images 3 and 4) is where the admin defines exact CRUD (Create, Read, Update, Delete) permissions for system entities and UI views.

Trigger: The admin clicks "+ Create Role -> Resource Role". A full-page, slide-out drawer opens from the right side of the screen.

Top Section (Role Definition):

Clean input fields for Name, Code, and Description.

A toggle switch for Scope (UI vs. API).

Workspace Tabs: Below the definition, the UI splits into two main tabs: "Base Roles" and "Resource Policies".

Tab 1: Base Roles (Combining Roles):

Instead of building every role from scratch, admins use this tab to build coarse-grained roles by inheriting fine-grained ones.

UI: A drag-and-drop zone or a multi-select table where the admin can add existing roles (e.g., combining "Basic Employee Role" with "Manager Role" to create a new "System Owner" role).

Tab 2: Resource Policies (The CRUD Grid):

This is a highly structured Split-View layout.

Left Pane (Role Hierarchy Tree): A visual, inverted-tree directory showing the current role being edited, and branching down to show the "Ancestor roles" it inherits from.

Right Pane (Entity Permissions Grid): A dense, highly actionable table listing all database entities (e.g., Customer, Order, Project_Budget).

The Grid Columns: Instead of generic "Read/Write" text, the columns are specific checkboxes: Allow All, Create, Read, Update, Delete, and Attributes.

Attributes Progressive Disclosure: The "Attributes" column contains a clickable gear icon. Clicking it opens a modal (Entity Attribute Policy) allowing the admin to restrict access down to the specific field level (e.g., allowing "Update" on the Customer entity, but explicitly setting the credit_limit attribute to "View Only").

Bottom Section (Specific & UI Policies):

Below the entity grid are expandable accordion sections for View Policy (which UI screens they can open), Menu Policy (which sidebar items render for them), and Specific Policy (custom application functions like rest.enabled or customer.notify).

3. Row-Level Role Designer (Data Isolation & Security)
UX Rationale: This interface (inspired by Image 2) is the most critical for multi-tenant government software. Even if a user has "Read" access to the Project_Budget entity via a Resource Role, this Row-Level Role ensures they only see the budget rows belonging to their specific department.

Trigger: The admin clicks "+ Create Role -> Row-Level Role".

Top Section (Role Definition):

Inputs for Name (e.g., "See Data of Their Region"), Code, and Description.

Workspace Tabs: "Base Roles" and "Row-Level Policies".

Tab 1: Row-Level Policies (The Engine):

A list view of all active row-level filters applied to this role.

Action: Clicking "+ Add" opens the Policy Configuration Modal.

The Modal UI:

Target Entity: A dropdown to select which database table this filter applies to (e.g., Order.class).

Policy Type Toggle: The admin chooses between a JPQL Policy (filters data directly at the database SQL level for performance) or a Predicate Policy (filters data in-memory for nested collections).

The Code Editor Block: If JPQL is selected, a sleek, dark-themed code editor block appears with syntax highlighting.

Join Clause Input (Optional): An input for complex relations (e.g., join {E}.customer c).

Where Clause Input (Required): The core logic input where admins use placeholders and session attributes (e.g., {E}.region = :current_user_region or {E}.createdBy = :current_user_username).

If Predicate Policy is selected, the editor switches to accept Groovy scripts or Java lambda expressions with access to Spring beans for complex, real-time boolean evaluations (e.g., !{E}.confidential).