import { useCallback, useState, useEffect } from "react";
import svgPaths from "../../imports/svg-svkvdgwod6";
import { useAuth } from "../../contexts/AuthContext";
import { NotificationBell } from "../ui/NotificationBell";
import { ChatListDrawer } from "../../features/chat-calls";
import { IncomingCallListener } from "../ui/IncomingCallListener";
import { getProfileAvatarUrl } from "../../services/userSettingsService";
import { getRoleLabel } from "../../shared/roles";
import {
  getRoleNavigation,
  getRoleNavigationCandidates,
  isRoleNavigationItemVisible,
  canOpenNavigationSection,
  RoleContent,
  useRoleNavigationState,
} from "../../features/navigation";
import {
  GuidedTourProvider,
  SystemWalkthroughButton,
} from "../../features/guided-tours";
import { useTasksData } from "../../hooks/useSupabaseData";
import { isTaskLead } from "../../services/taskSelectors";
import { getSidebarContent } from "../../features/navigation/sidebarContent";
import {
  Settings,
  ChevronLeft,
  Logout,
} from "@carbon/icons-react";

// Softer spring animation curve
const softSpringEasing = "cubic-bezier(0.25, 1.1, 0.4, 1)";

function InterfacesLogo1() {
  return (
    <div
      className="aspect-[24/24] basis-0 grow min-h-px min-w-px overflow-clip relative shrink-0"
      data-name="Interfaces Logo"
    >
      <div
        className="absolute aspect-[24/16] left-0 right-0 top-1/2 translate-y-[-50%]"
        data-name="Union"
      >
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          role="presentation"
          viewBox="0 0 24 16"
        >
          <g id="Union">
            <path d={svgPaths.p36880f80} fill="#171717" />
            <path d={svgPaths.p355df480} fill="#171717" />
            <path d={svgPaths.pfa0d600} fill="#171717" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function Avatar() {
  const { userProfile } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getProfileAvatarUrl(userProfile?.avatar_path)
      .then((url) => {
        if (active) setAvatarUrl(url);
      })
      .catch(() => {
        if (active) setAvatarUrl(null);
      });
    return () => {
      active = false;
    };
  }, [userProfile?.avatar_path]);

  const profileInitials = (userProfile?.full_name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="bg-neutral-100 relative rounded-[999px] shrink-0 size-8 overflow-hidden dark:bg-slate-800"
      data-name="Avatar"
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="Your profile" className="size-full object-cover" />
      ) : (
        <div className="box-border content-stretch flex flex-row items-center justify-center overflow-clip p-0 relative size-8 text-[10px] font-semibold text-neutral-700 dark:text-slate-200">
          {profileInitials}
        </div>
      )}
      <div
        aria-hidden="true"
        className="absolute border border-neutral-200 border-solid inset-0 pointer-events-none rounded-[999px]"
      />
    </div>
  );
}

function UnifiedSidebar({
  role,
  activeSection,
  activePage,
  onPageSelect,
  navigationItems,
}: {
  role: string;
  activeSection: string;
  activePage?: string;
  onPageSelect: (section: string, page: string) => void;
  navigationItems: ReturnType<typeof getRoleNavigation>["navItems"];
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([activeSection]));
  const { user, userProfile, logout } = useAuth();
  const visibleNavItems = navigationItems;

  useEffect(() => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.add(activeSection);
      return next;
    });
  }, [activeSection]);

  const toggleSectionExpand = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleSectionClick = (sectionId: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setExpandedSections((prev) => new Set([...prev, sectionId]));
    }
    const content = getSidebarContent(role, sectionId);
    let firstPage = undefined;
    if (content.sections.length > 0 && content.sections[0].items.length > 0) {
      firstPage = content.sections[0].items[0].label;
    }
    onPageSelect(sectionId, sectionId === "settings" ? "Profile" : (firstPage || ""));
  };

  return (
    <div
      data-tour-id="primary-navigation"
      className={`bg-white box-border flex flex-col h-full relative shrink-0 transition-all duration-300 border-r border-neutral-200 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
      style={{ transitionTimingFunction: softSpringEasing }}
    >
      {/* Header: Logo & Toggle */}
      <div data-tour-id="brand" className="flex items-center justify-between p-4 h-16 shrink-0 border-b border-neutral-100">
        {!isCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="size-6 shrink-0">
              <InterfacesLogo1 />
            </div>
            <span className="font-['Lexend:Bold',_sans-serif] font-bold text-[15px] text-neutral-900 truncate">
              eFlow Console
            </span>
          </div>
        )}
        {isCollapsed && (
          <div className="mx-auto size-7 flex items-center justify-center">
            <InterfacesLogo1 />
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hover:bg-neutral-50 rounded-lg text-neutral-500 p-1.5 transition-colors ${
            isCollapsed ? "mx-auto" : ""
          }`}
        >
          <ChevronLeft
            size={16}
            className={`transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1 select-none">
        {visibleNavItems.map((item) => {
          const sectionContent = getSidebarContent(role, item.id);
          const isCurrentSection = activeSection === item.id;
          const isExpanded = expandedSections.has(item.id);
          
          const pages: { label: string; icon?: React.ReactNode }[] = [];
          sectionContent.sections.forEach((sec) => {
            sec.items.forEach((page) => {
              pages.push({ label: page.label, icon: page.icon });
            });
          });

          const hasMultiplePages = pages.length > 1;

          return (
            <div key={item.id} className="flex flex-col gap-0.5">
              {/* Section Header Button */}
              <button
                data-tour-section={item.id}
                onClick={() => {
                  if (hasMultiplePages) {
                    toggleSectionExpand(item.id);
                  }
                  handleSectionClick(item.id);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-['Lexend:Medium',_sans-serif] transition-colors ${
                  isCurrentSection && !hasMultiplePages
                    ? "bg-neutral-100 text-neutral-900"
                    : isCurrentSection
                    ? "text-neutral-900 bg-neutral-50"
                    : "text-neutral-600 hover:bg-neutral-50"
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="shrink-0 size-4 flex items-center justify-center text-neutral-900">
                  {item.icon}
                </div>
                {!isCollapsed && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}
                {!isCollapsed && hasMultiplePages && (
                  <ChevronLeft
                    size={12}
                    className={`text-neutral-400 transition-transform duration-200 ${
                      isExpanded ? "-rotate-90" : ""
                    }`}
                  />
                )}
              </button>

              {/* Sub-pages list */}
              {!isCollapsed && isExpanded && hasMultiplePages && (
                <div className="pl-6 pr-1 py-0.5 flex flex-col gap-0.5 border-l border-neutral-100 ml-5">
                  {pages.map((page) => {
                    const isCurrentPage = activePage === page.label;
                    return (
                      <button
                        key={page.label}
                        onClick={() => onPageSelect(item.id, page.label)}
                        className={`w-full text-left px-3 py-1.5 rounded-md text-[12.5px] font-['Lexend:Regular',_sans-serif] truncate transition-colors ${
                          isCurrentPage
                            ? "bg-neutral-100 text-neutral-900 font-semibold"
                            : "text-neutral-600 hover:bg-neutral-50"
                        }`}
                      >
                        {page.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Area */}
      <div className="p-3 shrink-0 border-t border-neutral-100 flex flex-col gap-2 bg-white">
        {/* Quick action buttons (bell, chat) */}
        {user?.id && (
          <div data-tour-id="communications" className={`flex items-center ${isCollapsed ? "flex-col gap-2 justify-center" : "gap-4 px-2"}`}>
            <NotificationBell
              userId={user.id}
              role={role}
              onNavigate={onPageSelect}
              compact
            />
            <ChatListDrawer
              userId={user.id}
              userName={userProfile?.fullName}
              userOrgId={userProfile?.departmentId}
            />
            <IncomingCallListener userId={user.id} />
          </div>
        )}

        <SystemWalkthroughButton collapsed={isCollapsed} onBeforeStart={() => setIsCollapsed(false)} />

        {/* Settings button */}
        <button
          data-tour-id="settings"
          onClick={() => handleSectionClick("settings")}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-['Lexend:Medium',_sans-serif] transition-colors ${
            activeSection === "settings"
              ? "bg-neutral-100 text-neutral-900"
              : "text-neutral-600 hover:bg-neutral-50"
          }`}
          title={isCollapsed ? "Settings" : undefined}
        >
          <Settings size={16} className="shrink-0 text-neutral-900" />
          {!isCollapsed && <span className="flex-1 text-left truncate">Settings</span>}
        </button>

        {/* User profile info & Logout */}
        <div data-tour-id="profile" className={`flex items-center gap-2 p-1 rounded-lg ${isCollapsed ? "justify-center" : ""}`}>
          <div className="size-8 shrink-0">
            <Avatar />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-neutral-900 truncate">
                {userProfile?.fullName || "User"}
              </p>
              <p className="text-[10px] text-neutral-400 truncate">
                {getRoleLabel(userProfile?.role || role)}
              </p>
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={logout}
              className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-neutral-400 transition-colors"
              title="Log out"
            >
              <Logout size={16} />
            </button>
          )}
        </div>
        {isCollapsed && (
          <button
            onClick={logout}
            className="w-full flex items-center justify-center p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
            title="Log out"
          >
            <Logout size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function TwoLevelSidebar({ role }: { role: string }) {
  const getInitialPage = useCallback((sec: string) => {
    const content = getSidebarContent(role, sec);
    if (content.sections.length > 0 && content.sections[0].items.length > 0) {
      return content.sections[0].items[0].label;
    }
    return undefined;
  }, [role]);
  const { activePage, activeSection, selectPage } = useRoleNavigationState(role, getInitialPage);
  const { user, userProfile, can } = useAuth();
  const { tasks } = useTasksData();
  const hasLeadingWork = !!user?.id && tasks.some((task) => isTaskLead(task, user.id));
  const visibleNavItems = getRoleNavigationCandidates(role).filter(
    (item) => isRoleNavigationItemVisible(item, hasLeadingWork)
      && canOpenNavigationSection(
        role,
        item.id,
        can,
        Boolean(item.requiresLeadership && hasLeadingWork),
      ),
  );

  useEffect(() => {
    if (visibleNavItems.some((item) => item.id === activeSection)) return;
    const fallback = visibleNavItems[0];
    if (fallback) selectPage(fallback.id, getInitialPage(fallback.id) || fallback.label);
  }, [activeSection, getInitialPage, selectPage, visibleNavItems]);

  const tourSections = visibleNavItems.map((item) => ({
    id: item.id,
    label: item.label,
    page: getInitialPage(item.id) || item.label,
  }));

  return (
    <GuidedTourProvider
      userId={user?.id || ""}
      role={userProfile?.role || role}
      activeSection={activeSection}
      activePage={activePage}
      sections={tourSections}
      onNavigate={selectPage}
    >
      <div data-tour-id="application-shell" className="flex flex-row h-full min-h-0">
        <UnifiedSidebar
          role={role}
          activeSection={activeSection}
          activePage={activePage}
          onPageSelect={selectPage}
          navigationItems={visibleNavItems}
        />
        <RoleContent
          role={role}
          activeSection={activeSection}
          activePage={activePage}
          hasLeadingWork={hasLeadingWork}
        />
      </div>
    </GuidedTourProvider>
  );
}

// === FRAME (role from auth â€” no tabs) ===

export function Frame760({ role }: { role: string }) {
  return (
    <div className="bg-neutral-50 box-border content-stretch flex flex-col items-center justify-start relative size-full min-h-screen">
      <div className="flex-1 w-full min-h-0">
        <TwoLevelSidebar role={role} />
      </div>
    </div>
  );
}
