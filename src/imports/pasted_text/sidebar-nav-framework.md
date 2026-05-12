Architectural and UI/UX Framework for Role-Based Sidebar Navigation in the Ormoc City eFlow E-Governance System
The transition of local government units from analog, paper-based operations to interconnected digital ecosystems represents a fundamental requirement for modern public sector efficiency. Within the specific context of Ormoc City, the local government has demonstrated a robust commitment to digital transformation, sustainable development, and environmental resilience. Furthermore, under "Project Transform," the municipality has pioneered data-driven environmental stewardship, encompassing solid waste management, single-use plastic regulation, and sustainable energy transitions.
However, a persistent operational challenge in maximizing these developmental initiatives is the reliance on fragmented legacy systems, manual trackers, and frequent status meetings that consume thousands of valuable administrative hours annually. While commercial off-the-shelf task management platforms like monday.com provide excellent baseline project and portfolio tracking capabilities, they are not inherently optimized for the unique socio-technical constraints, budget liquidation requirements, and regulatory frameworks of a Philippine local government unit. Empirical assessments highlight severe limitations, such as varying levels of digital literacy among municipal employees, structural resistance to abandoning traditional physical meetings, and infrastructural constraints regarding internet connectivity in rural barangays.
To transcend these barriers, the proposed eFlow system synthesizes advanced technologies—including Genetic Algorithms for intelligent workload allocation, AI process mining for workflow optimization, Nudge Theory for user engagement, and Blockchain technology for immutable audit trails of project funds. The interface through which human operators interact with this complex backend must be meticulously engineered. The primary navigation structure, specifically the sidebar, serves as the critical anchor for user experience. If the navigation is overwhelming, adoption will fail; if it is too simplistic, it will not support the required enterprise functionalities. This comprehensive report delineates the precise, principled sidebar navigation structure required for the multi-departmental Ormoc City Hall eFlow system, focused strictly on internal project execution and categorized by a Role-Based Access Control framework.
Foundational UI/UX and Architectural Principles
Designing an enterprise-grade sidebar for a municipal government requires balancing extreme feature density with the need for cognitive clarity. The architecture must adhere to several core user interface and user experience principles tailored specifically for complex, project-driven public sector environments.
The physical dimensions and responsiveness of the sidebar are paramount. The optimal width for a desktop-class enterprise sidebar ranges between 240 to 300 pixels in its expanded state, allowing sufficient horizontal space for highly descriptive labels that align with familiar bureaucratic terminology. In its collapsed state, the sidebar must compress to 48 to 64 pixels, relying entirely on universally recognizable iconography accompanied by tooltips upon hover. This collapsibility is critical because enterprise dashboards—particularly those visualizing AI process mining graphs or dense financial project arrays—require maximum screen real estate. For field workers, such as infrastructure inspectors operating in remote barangays, the navigation must seamlessly transition into a mobile-friendly off-canvas drawer or integrate completely with conversational mobile interfaces like Viber.
The information architecture must actively mitigate cognitive overload. Navigation depth must be strictly restricted to a maximum of three levels (Parent Menu > Sub-menu > Page) to prevent users from becoming disoriented within the system's hierarchy. Utilizing the principle of progressive disclosure, complex configurations—such as blockchain smart contract parameters or algorithmic tuning sliders—should remain hidden until explicitly required by an authorized user. Parent categories must group related features based on actual governmental workflows, project hierarchies (Portfolio > Project > Program > Task), and legislative mandates.
The navigation interface itself functions as a digital nudge. Nudge theory, a behavioral economics concept, proposes that subtle changes in the "choice architecture" of an environment can predictability influence behavior without restricting autonomy. By strategically placing critical compliance actions—such as pending budget liquidations or urgent process bottleneck alerts—at the top of the visual hierarchy, the system subtly influences civil servants toward maximum data-entry compliance. Visual cues, such as progress indicators for departmental project goals or subtle color shifts indicating an active state, guide the user naturally through their mandated municipal workflows, transforming passive navigation into an active driver of productivity.
Multi-Tenant Architecture and Role-Based Access Control
The City Hall of Ormoc comprises numerous distinct entities, including the City Engineering Office, the City Planning and Development Office, and the City Social Welfare Department. In a unified e-governance system, treating the platform as a multi-tenant architecture is highly effective. While the local government unit is a single overarching organization, its departments function as logical tenants with strict data isolation requirements.
Role-Based Access Control (RBAC) operates on the principle of least privilege, ensuring civil servants only view the navigation items and datasets necessary for their specific statutory duties. The eFlow sidebar dynamically renders its hierarchy based on the authenticated user's assigned role and departmental tenancy. The system employs a Hierarchical RBAC model, specifically utilizing an inverted tree structure. In this model, senior roles (such as the City Administrator or Mayor) inherit read-only overview permissions from the junior roles beneath them across all departments, while horizontal access between peer departments remains strictly segregated.
When a user authenticates, the central policy engine evaluates their identity, organizational unit, and assigned roles before generating the sidebar. If a user switches between dual roles, the sidebar adapts instantly, revealing the dynamic context panes relevant only to the active role. This reduces the need for multiple logins, prevents interface clutter, and maintains fluid workflow momentum.
Sidebar Hierarchy: Super Administrators (IT / System Level)
Super Administrators, situated within the Information Technology Office of Ormoc City , require unfettered access to the system's underlying infrastructure, artificial intelligence health, and cryptographic security protocols. Their navigation is not centered on municipal service delivery, but rather on system maintenance, compliance auditing, and algorithmic tuning. The interface must prioritize dense data presentation and rapid troubleshooting.
Parent Menu
Sub-menu
UI/UX Rationale and Implementation Details
Iconography
System Command Center
Infrastructure Health
Provides real-time monitoring of server loads, database latency, and API connection statuses. Placed at the very top of the hierarchy for immediate incident response.
A layered server stack or data center rack.


Global Error Logs
Aggregates system-wide error reports across all LGU departments. Features robust filtering mechanisms by department, time, and severity.
A terminal window with an alert symbol.
AI Operations
Genetic Algorithm Tuning
The interface used to adjust the mathematical fitness function variables that govern automated task allocation. Administrators can manipulate the weighting of historical velocity, active workload, and specific employee competencies. This is critical for preventing algorithmic stagnation (local optima) during high-volume periods like peak infrastructure deployment season.
A DNA helix or intersecting neural nodes.


Predictive Analytics Engine
Monitors the Random Forest classifiers and deep Neural Networks responsible for predicting employee burnout and project forecasting. Displays model confidence intervals and feature importance weights.
A scatter plot with a predictive trend line.


NLP Engine Diagnostics
Health checks for the Natural Language Processing pipelines that ingest daily stand-up inputs and transcribe voice-to-text messages from the Viber chatbot integrations.
A chat bubble containing a waveform.
Blockchain & Cryptography
Ledger Diagnostics
Monitors the distributed ledger's consensus health, block confirmation times, and node synchronization. Because blockchain requires complex visual representations, this section utilizes interactive, hexagon-based network graphs.
A cryptographic chain or interconnected hex-nodes.


Smart Contract Management
The deployment interface for the programmable logic that governs project budget allocations and automated fund returns. Allows IT staff to update mathematical parameters for financial auditing.
A digital document featuring a cryptographic seal.
Identity & Access Management
Global RBAC Configuration
Interfaces for creating, modifying, and assigning roles to civil servants. Integrates directly with the Human Resource Management Office database to ensure that offboarded employees automatically lose system access.
A security badge or key granting access.


Tenant Isolation Controls
Manages the logical partitioning of data between the various City Hall departments, ensuring strict adherence to data privacy laws and preventing cross-departmental data leakage.
A segmented database cylinder.
Process Mining Integration
Discovery Visualizations
Displays the heuristic algorithmic graphs that reconstruct actual project execution paths from raw event log data across the entire LGU.
A complex workflow flowchart with highlighted transition nodes.


Global Compliance Alerts
A centralized feed of real-time flags indicating any deviations from mandated bureaucratic procedures, utilized by system auditors to identify software manipulation or circumvention.
A shield with a warning exclamation point.

Sidebar Hierarchy: Mayoral & Executive Staff
The Office of the City Mayor and the City Administrator require macro-level visibility into the operations of the entire municipality. They are not concerned with individual task execution, but rather with strategic oversight, financial health, and the progress of flagship initiatives. Their navigation is designed to cut through bureaucratic noise, utilizing predictive insight cards to surface critical information immediately.
Parent Menu
Sub-menu
UI/UX Rationale and Implementation Details
Iconography
Executive Portfolio
City Project Pulse
A high-level compilation of critical Key Performance Indicators (KPIs), including overall portfolio completion rates, budget burn-down trajectories, and critical project bottlenecks. Utilizes adaptive layouts to highlight the most pressing issues.
A multi-line trend chart showing upward momentum.


Strategic AI Insights
Generates predictive insight cards directly on the dashboard (e.g., "Procurement delays in Engineering Project A projected to rise by 12% next week"). This delivers immediate, actionable intelligence to executives suffering from severe time constraints.
A lightbulb overlaid on a bar graph.
Project Transform
Sustainable Tourism & Eco-Resorts
Tracks macro-level progress and revenue projections for high-value projects, such as the ₱503M Eco-Resort development, monitoring sub-components like infrastructure (₱450M) and environmental protection (₱170M).
A leaf overlaid on a smart city grid.


Marine Litter & Circular Economy
Tracks the specific interventions of the #SHInEOrmoc initiative, including waste-to-resource systems, plastic regulation compliance, and trash trap interception rates in riverways.
A recycling symbol integrated with a water wave.
Financial Oversight
Master Budget Execution
Real-time tracking of actual municipal project expenditures against the approved budget, highlighting departments at risk of overspending or underutilization.
A pie chart partitioned into distinct segments.


Unliquidated Cash Advances
A critical oversight tool monitoring outstanding funds assigned to project leaders that have not yet been liquidated with exact spent amounts, ensuring city funds are not stalled.
A shield with a currency symbol.
Immutable Audit Review
Cryptographic Ledger
Read-only access to the blockchain ledger for large-scale financial disbursements, project liquidations, and returned funds. Provides cryptographic assurance to the executive branch that all project expenses are mathematically verifiable and tamper-proof.
A document secured with a cryptographic hash chain.









Sidebar Hierarchy: Sangguniang Panlungsod (Legislative Branch)
The City Council, headed by the Vice Mayor and composed of elected Councilors, operates on a highly specific workflow centered around parliamentary procedures, committee hearings, and the drafting of ordinances. The user interface must reflect the distinct stages of the legislative lifecycle, ensuring that the creation of local laws is efficient, transparent, and properly archived.
Parent Menu
Sub-menu
UI/UX Rationale and Implementation Details
Iconography
Legislative Dashboard
Active Measures Pipeline
A kanban-style or list view of all pending ordinances and resolutions. Items are categorized by their reading stage (First Reading, Committee Level, Second Reading, Third Reading, Mayoral Approval). Visualizing the pipeline in this manner drastically reduces administrative friction.
A traditional government pillar or a judge's gavel.


Adopted Ordinances Archive
A fully searchable, indexed database of all successfully passed legislation. Utilizes AI to allow semantic searching (e.g., "ordinances related to plastic bans in 2024") rather than relying solely on exact title matches.
A bound legal book or scroll.
Session Management
Order of Business
Tools for the City Council Secretariat to prepare and produce the agenda prior to weekly regular sessions.
A structured clipboard.


Minutes & Transcripts
Utilizes the system's Natural Language Processing (NLP) engine to assist in the transcription, summarization, and archiving of session minutes.
A microphone adjacent to a text document.
Committee Affairs
Appropriations & Finance
Specific tracking for the critical budget legislation process, allowing Councilors to review the proposed municipal budget for upcoming projects.
A ledger with a magnifying glass.


Sectoral Committees
Dynamic sub-menus that only render based on the specific committee chairmanships held by the authenticated Councilor. This context-aware layout reduces clutter, ensuring a Councilor only sees internal working documents relevant to their assigned committees.
A group of users sitting around a table.

Sidebar Hierarchy: Human Resource Management Office (HRMO)
The Human Resource Management Office requires a dedicated, highly specialized interface. In the Philippine public sector, persistent employee burnout directly correlates with decreased service quality, increased absenteeism, and high turnover rates. The eFlow system's predictive analytics shift human capital management from a reactive discipline into a proactive science. The HRMO sidebar focuses entirely on employee well-being, workload balance, and civil service compliance.
Parent Menu
Sub-menu
UI/UX Rationale and Implementation Details
Iconography
Workforce Analytics
Burnout Prediction Radar
The primary interface for the machine learning models forecasting burnout probability. Analyzes metadata such as cumulative work experience, communication response latencies, and total logged project hours to flag individuals or entire departments at risk.
A heart-rate monitor line stabilizing.


Workload Velocity Metrics
Displays aggregated data on the historical task completion velocity of project teams. Used to ensure the Genetic Algorithm is distributing work equitably across the municipality without overburdening specific individuals.
A speedometer gauge.
Employee Wellness
Preemptive Interventions
A secure, highly confidential portal where HR supervisors receive automated alerts regarding flagged employees, enabling them to initiate targeted wellness interventions or mandate stress-debriefing sessions before a critical loss in productivity occurs.
A shielded user profile with a medical cross.


Leave & Attendance Management
Tracking of terminal leave credits, monetization, and overtime claims, directly linked to the payroll pre-audit systems.
A calendar clock.
Civil Service Compliance
Performance Evaluations
Tracking of regular performance appraisals mandated by the Civil Service Commission, utilizing data pulled directly from the employee's task completion rates within the eFlow system.
A clipboard with checkmarks.

Sidebar Hierarchy: Finance & Budget Operations
This role manages the lifeblood of the municipality's projects. Their navigation structure is engineered specifically to handle the complexities of project-based budgeting, cash advances, and the strict liquidation rules of the Commission on Audit (COA). The UI must enforce extreme accuracy, prevent the manual usage of fragmented Excel files, and support comprehensive blockchain auditability.
Parent Menu
Sub-menu
UI/UX Rationale and Implementation Details
Iconography
Project Financials
Master Budget Allocation
The interface where overarching project budgets (e.g., a ₱600M Eco-Tourism Project) are structurally broken down and allocated into specific programmatic buckets (e.g., ₱300M for Facilities, ₱50M for Marketing, ₱10M for Community Engagement). Eliminates the need for manual Excel tracking.
A blueprint or architectural drafting compass.


Program Fund Distribution
Manages the release of specific funds down to the assigned Program Leaders. Tracks the Obligation Requests and Status (ORS) to ensure funds are properly earmarked before tasks begin.
A hand securely holding a coin.
Expense & Liquidation Audit
Pending Liquidations
A centralized queue for Finance officers to review the exact spent amounts submitted by project leaders and members. Leaders upload their receipts (e.g., for task materials or non-task food budgets), and Finance verifies the exact costs against the issued cash advance.
A scale of justice balancing documents.


Budget Reconciliation & Returns
The interface for managing unspent funds. If a team was advanced ₱50,000 for an activity and only spent ₱42,000, this module handles the cryptographic verification of the ₱8,000 return to the LGU's project pool.
A curved arrow returning to a vault.
Cryptographic Accountability
Immutable Expense Ledger
The interface for reviewing project liquidations that have been cryptographically hashed and permanently recorded on the blockchain. Ensures absolute non-repudiation, meaning once a leader submits their exact expenses and it is approved, the record cannot be altered without a mathematical trace.
A highly detailed vault door or locked ledger.


Real-Time Conformance Alerts
Integrates with AI process mining to ensure that no project bypasses mandatory public bidding phases or COA liquidation timelines (e.g., flagging cash advances not liquidated within 30 days).
An alert triangle positioned over a ledger.

Sidebar Hierarchy: Department Admins/Heads
Department Heads—such as the City Engineer or the Head of Planning—are the operational commanders. They sit between the strategic vision of the Mayor and the daily execution of the staff. Their interfaces require dense, actionable data regarding portfolio progress, workforce productivity, and the financial burn-rate of their assigned projects.
Parent Menu
Sub-menu
UI/UX Rationale and Implementation Details
Iconography
Project Portfolio
Portfolio Overview
A macro-level view of all active projects under the department's jurisdiction (similar to monday.com's high-level boards). Shows the aggregated health, budget status, and timeline of massive initiatives.
A briefcase or folder collection.


Programs & Activities
A drilled-down view categorizing the specific programs within a project. Allows the Head to assign specific Teams and Leaders to each activity, establishing a clear chain of command and financial responsibility.
A hierarchical organizational chart.
Department Command
AI Bottleneck Detection
Direct output from the AI process mining algorithms. If a specific program is causing severe delays in an infrastructure deployment, the specific node on the graphical workflow pulses red, demanding immediate managerial intervention.
An alert triangle positioned over an intersecting workflow node.


NLP Stand-Up Synthesis
Replaces synchronous, time-consuming physical meetings. The Natural Language Processing engine synthesizes inputs from the entire department, automatically extracting critical action items, filtering out redundant information, and presenting a highly structured daily summary.
An organized list with an AI sparkle indicator.
Intelligent Workforce
Algorithmic Task Allocation
The primary interface for the Genetic Algorithm. The system proposes an optimal workload distribution matrix to minimize idle time. The Head can manually override assignments if undocumented real-world constraints exist, ensuring human-in-the-loop oversight.
A network graph connecting various user avatars.
Financial Management
Program Budget Burn-down
Allows the Department Head to monitor the exact amount of money spent by their assigned Leaders in real-time, preventing budget overruns before they happen and eliminating reliance on end-of-month Excel reports.
A line graph tracking downward against a baseline.

Sidebar Hierarchy: Regular Employees (Department Staff & Project Leaders)
The vast majority of the municipal workforce interacts with this specific sidebar structure. Traditional task management platforms fail at this level because they require excessive manual data entry and lack integrated financial accountability. The primary objective of this UI is to drastically reduce cognitive friction, ensure high-fidelity task updates, and facilitate the strict, exact reporting of project expenses.
Parent Menu
Sub-menu
UI/UX Rationale and Implementation Details
Iconography
My Workspace
Active Tasks
The primary queue of project assignments delegated by the Genetic Algorithm or the Program Leader. Employs digital nudging with context-aware reminders and a frictionless, one-tap interface to mark tasks as "Complete."
A prioritized, interactive checklist.


Daily Stand-Up Input
A multimodal interface allowing the employee to submit their daily accomplishments, active blockers, and priorities for the next day. Users can type a brief unstructured text update or record a voice note, which the system automatically transcribes.
A microphone adjacent to a text entry field.


Mobile & Viber Integration
Configuration settings for the mobile chatbot interface. Field workers can link their Viber accounts, allowing them to receive automated notifications and reply using predefined keywords to update the central database without logging into a web portal.
A mobile phone interacting with a database icon.
Project Financials
Expense & Liquidation Submission
The critical interface where Program Leaders and assigned members report the exact financial costs incurred during a task or activity (including non-task budgets like food or transportation). Users input the exact spent amount, upload photographic evidence of receipts (Official Receipts/Acknowledgment Receipts), and the system automatically calculates the remaining budget to be returned.
A receipt or an expense voucher icon.


Cash Advance Requests
A streamlined form for leaders to request the initial operational budget required to execute a specific assigned program or activity within a project.
A currency symbol with a plus sign.
Collaborative Achievement
Departmental Goals
Progress bars detailing the entire team's trajectory toward collective milestones. Utilizes ethical gamification and social norming. Displaying a metric like, "85% of the Engineering Department has submitted their weekly task updates," encourages compliance without micromanagement.
A collaborative shield or a rising progress bar.


Agentic AI Coaching
Access to a multimodal on-screen assistant designed to guide users with low digital literacy through complex new workflows (like submitting a Liquidation Report).
A stylized robot assistant or an interactive question mark.

Deep Integration of Advanced Technologies within the UI/UX
To elevate the eFlow system beyond a standard task tracker, the user interface must seamlessly translate highly complex algorithmic processes into intuitive, actionable visual paradigms. The success of the software depends entirely on how these technologies are presented to the end-user.
Visualizing AI Process Mining and Genetic Algorithms
Process mining algorithms reconstruct reality from raw event logs. In the Department Head sidebar, the "AI Bottleneck Detection" interface utilizes dynamic, interactive process graphs. When the algorithm calculates the throughput time between every step of a municipal project and detects a severe delay—for instance, an infrastructure project consistently stalling at the procurement or liquidation approval phase—the specific node on the graphical workflow pulses with a high-contrast red indicator. This transforms abstract data into a clear visual mandate for action.
Similarly, for the Genetic Algorithm handling workload allocation, the UI relies heavily on comparative data visualization. When an administrator views the proposed assignment matrix for a new city program, the dashboard displays dual bar charts: one illustrating the projected average idle time under the algorithmic model, versus the historical average under manual assignment. By making the algorithmic benefits visually explicit, the UI builds trust between the human operator and the machine intelligence.
Cryptographic Semantics for Budget Liquidation and Audit Trails
In public administration, managing project budgets, cash advances, and liquidations requires absolute data integrity to prevent graft and ensure compliance with the Commission on Audit. The eFlow system solves the tedious reliance on Excel files by integrating expense tracking directly into the blockchain.
The visual language of blockchain integration within the UI is distinct from standard database entries. It is represented by connected hexagonal nodes, conveying the decentralized nature of the ledger. When a Project Leader submits an Expense & Liquidation Report detailing the exact amount of money spent and the exact amount to be returned, and Finance approves it, the record is committed to the blockchain. Tamper-proof verification is indicated by a persistent green checkmark accompanied by a cryptographic hash string, intentionally displayed in a monospace font to emphasize its technical immutability. When an executive views this financial record, the UI displays the digital signature and the exact timestamp of the block commitment, confirming that the expense report cannot be altered, deleted, or retroactively modified to hide missing funds.
Behavioral Economics: Executing Choice Architecture
The most sophisticated data architecture is rendered useless if human operators do not consistently and accurately input data. The "My Workspace" sidebars designed for Regular Employees are entirely architected around behavioral economics, specifically Nudge Theory.
Nudge theory posits that human behavior can be predictably influenced by making subtle changes to the "choice architecture" of an environment. In the eFlow UI, this manifests in several ways. The system utilizes predictive analytics to pre-fill standard parameters on Liquidation Reports based on the assigned program budget; users simply adjust the numbers to match their exact receipts, drastically reducing the physical and mental effort required for financial data entry. Furthermore, by utilizing "Social Norming" metrics, the UI leverages the innate human desire to conform to positive group behaviors, driving higher compliance in both task updates and budget returns.
Conversational UI: Bridging the Infrastructural Divide
Recognizing the steep adoption curve for complex enterprise software in the Philippines, the system extends its UI entirely beyond the desktop environment. For field personnel—such as teams deploying environmental assets for Project Transform—the sidebar effectively lives inside their mobile messaging applications.
The "Viber Integration" allows users to map natural language triggers directly to the eFlow backend. When a project member types "TASK COMPLETE" into Viber, or sends a voice note regarding an activity, the system's NLP engine transcodes the regional dialects, converts the audio into structured data entries, and instantly updates the central database. The desktop UI subsequently reflects this change in real-time, removing the necessity of logging into a complex web portal just to update a project board.
Final Architectural Synthesis
The design of the sidebar navigation for the Ormoc City Hall eFlow system is a complex socio-technical framework where hierarchical project management, strict financial accountability, and advanced computational algorithms intersect.
By replacing disjointed tasks with a rigid Portfolio > Project > Program > Task hierarchy, the system mirrors the realities of enterprise operations (akin to monday.com) while tailoring the experience to the Philippine local government context. The integration of a dedicated Expense & Liquidation workflow ensures that leaders and members can easily report exact expenditures and return unused funds, completely eliminating the bottleneck of manual Excel tracking. Furthermore, by securing these financial returns on an immutable blockchain ledger, employing AI to detect project delays, and utilizing Viber for frictionless field updates, the UI proactively dismantles the barriers of technological inertia.
Ultimately, this highly specific, role-based structure guarantees that Super Administrators, Executives, Legislators, HR Officers, Finance Personnel, Department Heads, and Regular Employees interact exclusively with the data pertinent to their mandate. It transforms the eFlow platform into an active, intelligent management assistant, directly supporting Ormoc City's strategic mandates for transparent, highly responsive, and financially accountable project delivery.
Works cited
1. 2025 RLGUP COLLOQUIUM PROJECT TRANSFORM: Ormoc Story, https://resiliencecouncil.ph/2025-rlgup-colloquium-project-transform-ormoc-story/ 2. Project TRANSFORM Colloquium Brings Together Stakeholders for Inclusive Development, https://region8.mgb.gov.ph/en/featured-news/press-release/919-project-transform-colloquium-brings-together-stakeholders-for-inclusive-development.html 3. UI/UX in Government: Designing Digital Futures | Fuselab Creative, https://fuselabcreative.com/user-centric-government-design-strategies/ 4. Best Practices for ERP App Navigation Design - AorBorC Technologies, https://www.aorborc.com/best-practices-for-erp-app-navigation-design/ 5. Enterprise UI Design in 2026: Principles, Trends & Best Practices - Hashbyt, https://hashbyt.com/blog/enterprise-ui-design 6. Navigation and Information Architecture - UI/UX Guidelines - User Experience Design & Technology, https://www.uxdt.nic.in/guidelines/ux-design-guidelines/navigation-and-information-architecture/ 7. Mastering navigation sidebars in product design. | by Paul Wallas | Bootcamp - Medium, https://medium.com/design-bootcamp/mastering-navigation-sidebars-in-product-design-1248f140f4b2 8. Best UX Practices for Designing a Sidebar | by Dmitry Sergushkin | UX Planet, https://uxplanet.org/best-ux-practices-for-designing-a-sidebar-9174ee0ecaa2 9. 20 Best Dashboard UI/UX Design Principles You Need in 2025 - Medium, https://medium.com/@allclonescript/20-best-dashboard-ui-ux-design-principles-you-need-in-2025-30b661f2f795 10. 8+ Best Sidebar Menu Design Examples of 2026 (With UI Inspiration) - Navbar Gallery, https://www.navbar.gallery/blog/best-side-bar-navigation-menu-design-examples 11. Blockchain UX: How to Design User-Friendly Decentralized Apps - Purrweb, https://www.purrweb.com/blog/blockchain-ux-design/ 12. 10 Website Navigation Best Practices for 2025, https://blog.soloist.ai/website-navigation-best-practices/ 13. Enterprise UX Design: 6 Strategies for Complex Workflows and Decision-Making - Traust, https://traust.com/blog/enterprise-ux-design-for-complex-workflows/ 14. AI Design Patterns Enterprise Dashboards | UX Leaders Guide - Aufait UX, https://www.aufaitux.com/blog/ai-design-patterns-enterprise-dashboards/ 15. The Nudge Theory: Definition and Examples - Octet Design Studio, https://octet.design/journal/nudge-theory/ 16. Design the Nudges | UX Planet, https://uxplanet.org/design-the-nudges-48086f16595c 17. UX and Nudge theory - by Yashasvini Raghuvanshi - Medium, https://medium.com/@yashu02raghuwanshi/ux-and-nudge-theory-56827093e3c8 18. How to leverage nudge theory and gamification to motivate your learners to train, https://www.learningtechnologies.co.uk/exhibitor-news/leverage-nudge-theory-gamification-motivate-learners-train 19. City of Ormoc | Departments, Divisions, & Offices, https://ormoc.gov.ph/pages/departments.php 20. Tenant hierarchy - Cumulocity Release 2026 documentation, https://cumulocity.com/docs/2026/concepts/tenant-hierarchy/ 21. The Enterprise Browser's Approach to Multi-Tenancy Architecture, https://www.island.io/blog/the-enterprise-browsers-approach-to-multi-tenancy-architecture 22. Multi-Tenant Architecture: How It Works, Pros, and Cons | Frontegg, https://frontegg.com/guides/multi-tenant-architecture 23. Role-Based Access Control in ERP Systems - Procuzy | Cloud based ERP software for Manufacturers, https://procuzy.com/blog/role-based-access-control-in-erp-systems/ 24. Role-Based Access Control: RBAC Guide for Modern Data Security | Aerospike, https://aerospike.com/blog/role-based-access-control-rbac-guide/ 25. What Is Role-Based Access Control (RBAC)? A Complete Guide - Frontegg, https://frontegg.com/guides/rbac 26. How to Design an RBAC (Role-Based Access Control) System | by NocoBase | Medium, https://medium.com/@nocobase/how-to-design-an-rbac-role-based-access-control-system-3b57ca9c6826 27. How to Build a Role-Based Access Control Layer - Oso, https://www.osohq.com/learn/rbac-role-based-access-control 28. Tasks and Responsibilities Checklist: The Sangguniang Panlungsod - Local Government Academy, https://cdn.lga.gov.ph/publication/attachments/1590688730.pdf 29. Designing for AI Engineers: UI patterns you need to know | by Eve Weinberg | UX Collective, https://uxdesign.cc/designing-for-ai-engineers-what-ui-patterns-and-principles-you-need-to-know-8b16a5b62a61 30. Departments - Quezon City Government, https://quezoncity.gov.ph/departments/ 31. CitY CounCiL / sAnGGuniAnG pAnLunGsod - Cloudfront.net, https://d27gr9t9vsogta.cloudfront.net/uploads/files/council_original.pdf 32. The Local Legislative Process: Powers and Functions of the Sanggunian | PDF - Slideshare, https://www.slideshare.net/slideshow/the-local-legislative-process-powers-and-functions-of-the-sanggunian/106575086 33. Best ERP System for Government Agencies in 2026 Guide | VNMT, https://www.vnmtsolutions.com/best-erp-for-government-agencies/ 34. Blockchain Ui royalty-free images - Shutterstock, https://www.shutterstock.com/search/blockchain-ui 35. Audit Trail Icons vectors - Shutterstock, https://www.shutterstock.com/search/audit-trail-icons?image_type=vector
