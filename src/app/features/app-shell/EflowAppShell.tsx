import { Modal } from "@vibe/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  canOpenNavigationSection,
  getRoleNavigationCandidates,
  getSidebarContent,
  isRoleNavigationItemVisible,
  RoleContent,
  useRoleNavigationState,
} from "../navigation";
import { GuidedTourProvider } from "../guided-tours";
import { useTasksData } from "../../hooks/useSupabaseData";
import { isTaskLead } from "../../services/taskSelectors";
import { EflowTopBar } from "./components/EflowTopBar";
import { ProductivitySidebar, type ShellNavigationItem } from "./components/ProductivitySidebar";
import "./eflowAppShell.css";

interface EflowAppShellProps {
  role: string;
}

function getSectionPages(role: string, section: string) {
  const content = getSidebarContent(role, section);
  return content.sections.flatMap((contentSection) =>
    contentSection.items.map((item) => ({ label: item.label })),
  );
}

export function EflowAppShell({ role }: EflowAppShellProps) {
  const { can, user, userProfile } = useAuth();
  const { tasks } = useTasksData();
  const userId = user?.id;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const getInitialPage = useCallback(
    (section: string) => {
      const content = getSidebarContent(role, section);
      return content.sections[0]?.items[0]?.label;
    },
    [role],
  );
  const { activePage, activeSection, selectPage } = useRoleNavigationState(role, getInitialPage);
  const hasLeadingWork = Boolean(userId) && tasks.some((task) => isTaskLead(task, userId));
  const visibleNavigationItems = getRoleNavigationCandidates(role).filter(
    (item) =>
      isRoleNavigationItemVisible(item, hasLeadingWork) &&
      canOpenNavigationSection(
        role,
        item.id,
        can,
        Boolean(item.requiresLeadership && hasLeadingWork),
      ),
  );
  const navigationItems = useMemo<ShellNavigationItem[]>(
    () =>
      visibleNavigationItems.map((item) => {
        const content = getSidebarContent(role, item.id);
        const pages = getSectionPages(role, item.id);
        return {
          ...item,
          group: content.sections[0]?.title || "Workspace",
          pages: pages.length > 0
            ? pages
            : [{ label: item.label }],
        };
      }),
    [role, visibleNavigationItems],
  );

  useEffect(() => {
    if (visibleNavigationItems.some((item) => item.id === activeSection)) return;
    const fallback = visibleNavigationItems[0];
    if (fallback) selectPage(fallback.id, getInitialPage(fallback.id) || fallback.label);
  }, [activeSection, getInitialPage, selectPage, visibleNavigationItems]);

  const handlePageSelect = useCallback(
    (section: string, page: string) => {
      selectPage(section, page);
      setMobileNavigationOpen(false);
    },
    [selectPage],
  );

  const tourSections = visibleNavigationItems.map((item) => ({
    id: item.id,
    label: item.label,
    page: getInitialPage(item.id) || item.label,
  }));

  return (
    <GuidedTourProvider
      activePage={activePage}
      activeSection={activeSection}
      onNavigate={handlePageSelect}
      role={userProfile?.role || role}
      sections={tourSections}
      userId={user?.id || ""}
    >
      <div className="eflow-app-shell" data-tour-id="application-shell">
        <EflowTopBar
          activePage={activePage}
          activeSection={activeSection}
          onOpenMobileNavigation={() => setMobileNavigationOpen(true)}
          onPageSelect={handlePageSelect}
          role={role}
        />
        <div className="eflow-app-shell__body">
          <div className="eflow-app-shell__desktop-navigation">
            <ProductivitySidebar
              activePage={activePage}
              activeSection={activeSection}
              collapsed={isCollapsed}
              navigationItems={navigationItems}
              onCollapsedChange={setIsCollapsed}
              onPageSelect={handlePageSelect}
            />
          </div>
          <main className="eflow-app-shell__workspace" aria-label="Active workspace">
            <RoleContent
              activePage={activePage}
              activeSection={activeSection}
              hasLeadingWork={hasLeadingWork}
              role={role}
            />
          </main>
        </div>
      </div>

      <Modal
        closeButtonAriaLabel="Close navigation"
        id="eflow-mobile-navigation"
        onClose={() => setMobileNavigationOpen(false)}
        show={isMobileNavigationOpen}
        size="full-view"
      >
        <div className="eflow-mobile-navigation">
          <ProductivitySidebar
            activePage={activePage}
            activeSection={activeSection}
            collapsed={false}
            mobile
            navigationItems={navigationItems}
            onCollapsedChange={() => undefined}
            onPageSelect={handlePageSelect}
          />
        </div>
      </Modal>
    </GuidedTourProvider>
  );
}
