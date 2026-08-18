export const PAGE_PERMISSION_KEYS = [
  "navigation.projects",
  "navigation.tasks",
  "navigation.reviews",
  "navigation.team_supervision",
  "navigation.team_intelligence",
  "navigation.reports",
  "navigation.announcements",
  "navigation.user_management",
  "navigation.organization",
  "navigation.audit",
  "navigation.system_settings",
  "navigation.data_tools",
] as const;

export const ACTION_PERMISSION_KEYS = [
  "projects.create",
  "projects.archive",
  "projects.delete",
  "tasks.assign",
  "tasks.verify",
  "reports.export",
  "announcements.publish",
  "users.manage",
  "audit.read",
  "settings.manage",
  "database.backup",
] as const;

export const PERMISSION_KEYS = [...PAGE_PERMISSION_KEYS, ...ACTION_PERMISSION_KEYS] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];
export type PagePermissionKey = (typeof PAGE_PERMISSION_KEYS)[number];

export const PERMISSIONS_CHANGED_EVENT = "eflow:permissions-changed";
export const PERMISSIONS_CHANGED_STORAGE_KEY = "eflow.permissions.changed";

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  "navigation.projects": "Open Projects",
  "navigation.tasks": "Open Tasks and Subtasks",
  "navigation.reviews": "Open Review Queues",
  "navigation.team_supervision": "Open Team Supervision",
  "navigation.team_intelligence": "Open Team Intelligence",
  "navigation.reports": "Open Reports",
  "navigation.announcements": "Open Announcements",
  "navigation.user_management": "Open User Management",
  "navigation.organization": "Open Organization Structure",
  "navigation.audit": "Open Audit Log",
  "navigation.system_settings": "Open System Settings",
  "navigation.data_tools": "Open Data Tools",
  "projects.create": "Create projects",
  "projects.archive": "Archive or restore projects",
  "projects.delete": "Permanently delete projects",
  "tasks.assign": "Assign and reassign tasks",
  "tasks.verify": "Review and verify submissions",
  "reports.export": "Export reports (CSV or PDF)",
  "announcements.publish": "Publish announcements",
  "users.manage": "Manage users and accounts",
  "audit.read": "Read the audit log",
  "settings.manage": "Manage system settings",
  "database.backup": "Generate database backups",
};

export const MANAGED_ROLES = [
  { key: "dept_head", label: "Head" },
  { key: "assistant_head", label: "Assistant Head" },
  { key: "employee", label: "Employee" },
  { key: "super_admin", label: "Super Admin" },
] as const;

export const FALLBACK_DEFAULTS: Record<string, readonly PermissionKey[]> = {
  super_admin: PERMISSION_KEYS,
  dept_head: [
    "navigation.projects", "navigation.tasks", "navigation.reviews",
    "navigation.team_supervision", "navigation.team_intelligence",
    "navigation.reports", "navigation.announcements", "projects.create",
    "projects.archive", "projects.delete", "tasks.assign", "tasks.verify", "reports.export",
  ],
  assistant_head: [
    "navigation.projects", "navigation.tasks", "navigation.reviews",
    "navigation.team_supervision", "navigation.team_intelligence",
    "navigation.reports", "navigation.announcements", "projects.create",
    "projects.archive", "projects.delete", "tasks.assign", "tasks.verify", "reports.export",
  ],
  employee: [
    "navigation.projects", "navigation.tasks", "navigation.reviews",
    "navigation.reports", "navigation.announcements", "reports.export",
  ],
};

export const ACCESS_LEVELS = [
  { value: "read", label: "Read", description: "View scoped work and reports." },
  { value: "review", label: "Review", description: "View and review routed work." },
  { value: "manage", label: "Manage", description: "Manage scoped projects and tasks." },
] as const;
