import type { ReactNode } from "react";
import { AuthProvider } from "../../contexts/AuthContext";
import { UserPreferencesProvider } from "../../contexts/UserPreferencesContext";
import { ToastProvider } from "../../components/ui/Toast";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <UserPreferencesProvider>
        <ToastProvider>{children}</ToastProvider>
      </UserPreferencesProvider>
    </AuthProvider>
  );
}
