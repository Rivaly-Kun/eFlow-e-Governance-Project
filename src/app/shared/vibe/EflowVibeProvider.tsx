import { ThemeProvider } from "@vibe/core";
import { useEffect, useState, type ReactElement } from "react";
import { useUserPreferences } from "../../contexts/UserPreferencesContext";
import type { ThemePreference } from "../../types";
import { eflowVibeTheme } from "./eflowVibeTheme";

type VibeSystemTheme = "light" | "dark";

function resolveSystemTheme(preference: ThemePreference): VibeSystemTheme {
  if (preference === "dark") return "dark";
  if (preference === "light") return "light";

  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function useResolvedVibeTheme(preference: ThemePreference): VibeSystemTheme {
  const [systemTheme, setSystemTheme] = useState(() => resolveSystemTheme(preference));

  useEffect(() => {
    setSystemTheme(resolveSystemTheme(preference));
    if (preference !== "system" || typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemTheme(resolveSystemTheme("system"));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  return systemTheme;
}

function useVibeSystemThemeClass(systemTheme: VibeSystemTheme) {
  useEffect(() => {
    // ThemeProvider initializes this documented system-theme class only when
    // one is absent. Keep it synchronized with eFlow's existing preference
    // changes without styling against Vibe internals.
    const classes = document.body.classList;
    classes.remove("light-app-theme", "dark-app-theme", "black-app-theme");
    classes.add(`${systemTheme}-app-theme`);
  }, [systemTheme]);
}

export function EflowVibeThemeProvider({
  children,
  preference,
}: {
  children: ReactElement;
  preference: ThemePreference;
}) {
  const systemTheme = useResolvedVibeTheme(preference);
  useVibeSystemThemeClass(systemTheme);
  return (
    <ThemeProvider themeConfig={eflowVibeTheme} systemTheme={systemTheme}>
      {children}
    </ThemeProvider>
  );
}

export function EflowVibeProvider({ children }: { children: ReactElement }) {
  const { theme } = useUserPreferences();
  return <EflowVibeThemeProvider preference={theme}>{children}</EflowVibeThemeProvider>;
}
