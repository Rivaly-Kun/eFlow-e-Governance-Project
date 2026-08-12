import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useUserPreferences } from "../../contexts/UserPreferencesContext";
import { LoginPage } from "../../components/Auth/LoginPage";
import { Frame760 } from "../../components/Layout/SidebarDemo";
import { LoadingScreen } from "./LoadingScreen";
import { mapRoleToPanel } from "./role";
import { runTaskMaintenance } from "../tasks";

export function AuthenticatedApp() {
  const { user, userProfile, loading } = useAuth();
  const { loading: preferencesLoading } = useUserPreferences();

  useEffect(() => {
    if (!user) return;
    void runTaskMaintenance().catch((error) => {
      console.warn("Task maintenance could not run:", error);
    });
  }, [user]);

  if (loading || (user && preferencesLoading)) return <LoadingScreen />;
  if (!user || !userProfile) return <LoginPage />;

  return (
    <>
      <Frame760 role={mapRoleToPanel(userProfile.role)} />
    </>
  );
}
