import { useCallback, useEffect, useState } from "react";
import { getDefaultSection } from "./roleNavigation";

export function useRoleNavigationState(
  role: string,
  getInitialPage: (section: string) => string | undefined,
) {
  const [activeSection, setActiveSection] = useState(() => getDefaultSection(role));
  const [activePage, setActivePage] = useState<string | undefined>(() =>
    getInitialPage(getDefaultSection(role)),
  );

  useEffect(() => {
    const nextSection = getDefaultSection(role);
    setActiveSection(nextSection);
    setActivePage(getInitialPage(nextSection));
  }, [getInitialPage, role]);

  const selectPage = useCallback((section: string, page: string) => {
    setActiveSection(section);
    setActivePage(page);
  }, []);

  return { activePage, activeSection, selectPage };
}
