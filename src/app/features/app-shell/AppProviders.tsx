import type { ReactNode } from "react";
import { AuthProvider } from "../../contexts/AuthContext";
import { UserPreferencesProvider } from "../../contexts/UserPreferencesContext";
import { ToastProvider } from "../../components/ui/Toast";
import { EflowVibeProvider } from "../../shared/vibe";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <UserPreferencesProvider>
        <EflowVibeProvider>
          <ToastProvider>{children}</ToastProvider>
        </EflowVibeProvider>
      </UserPreferencesProvider>
    </AuthProvider>
  );
}
