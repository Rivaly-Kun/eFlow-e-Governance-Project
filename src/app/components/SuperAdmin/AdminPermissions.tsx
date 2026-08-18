// Temporary compatibility destination for the historical `permissions`
// section. The visible workspace now lives inside User Management.
import { UserManagement } from "../../features/administration/components/user-management";

export function AdminPermissions() {
  return <UserManagement initialTab="user-access" />;
}
