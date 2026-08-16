import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../components/ui/Toast";

const QUICK_ACCOUNTS: Record<string, { email: string; pass: string; label: string }> = {
  "1": { email: "admin@gmail.com", pass: "admin123", label: "Super Admin (admin@gmail.com)" },
  "2": { email: "bplo.head@gmail.com", pass: "123456", label: "Head (bplo.head@gmail.com)" },
  "3": { email: "tdfro.staff1@gmail.com", pass: "123456", label: "Employee (tdfro.staff1@gmail.com)" },
  "4": { email: "gabzcah@gmail.com", pass: "123456", label: "Gabriel (gabzcah@gmail.com)" },
};

export function QuickLoginListener() {
  const { login, logout } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || !(event.key in QUICK_ACCOUNTS)) return;
      const account = QUICK_ACCOUNTS[event.key];
      event.preventDefault();
      toast("Quick switching to " + account.label + "...", "info");
      try {
        await logout();
        await login(account.email, account.pass);
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
