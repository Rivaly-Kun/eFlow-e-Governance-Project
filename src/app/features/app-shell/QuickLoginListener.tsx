import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { SESSION_NOTICE_KEY } from "../session-security/constants";
import { clearAllSessionActivity } from "../session-security/services/sessionActivityStorage";
import { getQuickLoginAccount } from "../../shared/quickLoginAccounts";

export function QuickLoginListener() {
  const { login, logout } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const account = getQuickLoginAccount(event.key);
      if (!account) return;
      event.preventDefault();
      toast("Quick switching to " + account.label + "...", "info");
      try {
        await logout();
        clearAllSessionActivity(localStorage);
        localStorage.removeItem(SESSION_NOTICE_KEY);
        await login(account.email, account.password);
        toast("Logged in as " + account.label, "success");
      } catch (error: unknown) {
        toast(error instanceof Error ? error.message : "Failed to switch to " + account.email, "error");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [login, logout, toast]);

  return null;
}
