import { Button, IconButton, Tooltip } from "@vibe/core";
import { Collapse, Expand, NavigationChevronDown } from "@vibe/icons";
import { useEffect, useMemo, useState } from "react";
import type { RoleNavItem } from "../../navigation";
import { getEflowNavigationIcon } from "../eflowNavigationIcons";

export interface ShellPage {
  label: string;
}

export interface ShellNavigationItem extends RoleNavItem {
  group: string;
  pages: ShellPage[];
}

interface ProductivitySidebarProps {
  activePage?: string;
  activeSection: string;
  collapsed: boolean;
  mobile?: boolean;
  navigationItems: ShellNavigationItem[];
  onCollapsedChange: (collapsed: boolean) => void;
  onPageSelect: (section: string, page: string) => void;
}

function groupNavigationItems(items: ShellNavigationItem[]) {
  const groups: Array<{ title: string; items: ShellNavigationItem[] }> = [];
  for (const item of items) {
    const existingGroup = groups.find((group) => group.title === item.group);
    if (existingGroup) {
      existingGroup.items.push(item);
    } else {
      groups.push({ title: item.group, items: [item] });
    }
  }
  return groups;
}

export function ProductivitySidebar({
  activePage,
  activeSection,
  collapsed,
  mobile = false,
  navigationItems,
  onCollapsedChange,
  onPageSelect,
}: ProductivitySidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set([activeSection]),
  );
  const navigationGroups = useMemo(
    () => groupNavigationItems(navigationItems),
    [navigationItems],
  );
  const isCompact = collapsed && !mobile;

  useEffect(() => {
    setExpandedSections((current) => new Set(current).add(activeSection));
  }, [activeSection]);

  const selectSection = (item: ShellNavigationItem) => {
    if (isCompact) onCollapsedChange(false);
    if (item.pages.length > 1) {
      setExpandedSections((current) => new Set(current).add(item.id));
    }
    onPageSelect(item.id, item.pages[0]?.label ?? item.label);
  };

  return (
    <aside
      aria-label="Primary navigation"
      data-tour-id="primary-navigation"
      className={`eflow-productivity-sidebar ${isCompact ? "eflow-productivity-sidebar--compact" : ""}`}
    >
      <div className="eflow-productivity-sidebar__brand" data-tour-id="brand">
        <div className="eflow-productivity-sidebar__mark" aria-hidden="true">e</div>
        {!isCompact && (
          <div className="min-w-0">
            <p className="eflow-productivity-sidebar__wordmark">eFlow</p>
            <p className="eflow-productivity-sidebar__workspace">Government workspace</p>
          </div>
        )}
        {!mobile && (
          <Tooltip content={isCompact ? "Expand navigation" : "Collapse navigation"}>
            <IconButton
              aria-label={isCompact ? "Expand navigation" : "Collapse navigation"}
              icon={isCompact ? Expand : Collapse}
              kind="tertiary"
              onClick={() => onCollapsedChange(!collapsed)}
              size="small"
            />
          </Tooltip>
        )}
      </div>

      <nav className="eflow-productivity-sidebar__nav" aria-label="Workspace destinations">
        {navigationGroups.map((group) => (
          <section className="eflow-productivity-sidebar__group" key={group.title} aria-label={group.title}>
            {!isCompact && <p className="eflow-productivity-sidebar__group-label">{group.title}</p>}
            <div className="eflow-productivity-sidebar__items">
              {group.items.map((item) => {
                const Icon = getEflowNavigationIcon(item.id);
                const isCurrentSection = activeSection === item.id;
                const hasSubpages = item.pages.length > 1;
                const isExpanded = expandedSections.has(item.id);
                const navigationButton = (
                  <Button
                    aria-label={isCompact ? item.label : undefined}
                    aria-pressed={isCurrentSection}
                    className={`eflow-productivity-sidebar__item ${isCurrentSection ? "eflow-productivity-sidebar__item--active" : ""}`}
                    key={item.id}
                    kind="tertiary"
                    leftIcon={Icon}
                    onClick={() => selectSection(item)}
                  >
                    {!isCompact && (
                      <>
                        <span className="eflow-productivity-sidebar__item-label">{item.label}</span>
                        {hasSubpages && (
                          <span
                            aria-hidden="true"
                            className={`eflow-productivity-sidebar__chevron ${isExpanded ? "eflow-productivity-sidebar__chevron--expanded" : ""}`}
                          >
                            <NavigationChevronDown size={14} />
                          </span>
                        )}
                      </>
                    )}
                  </Button>
                );

                return (
                  <div className="eflow-productivity-sidebar__item-wrap" data-tour-section={item.id} key={item.id}>
                    {isCompact ? <Tooltip content={item.label}>{navigationButton}</Tooltip> : navigationButton}
                    {!isCompact && hasSubpages && isCurrentSection && isExpanded && (
                      <div className="eflow-productivity-sidebar__subpages" aria-label={`${item.label} pages`}>
                        {item.pages.map((page) => (
                          <Button
                            aria-pressed={activePage === page.label}
                            className={`eflow-productivity-sidebar__subpage ${activePage === page.label ? "eflow-productivity-sidebar__subpage--active" : ""}`}
                            key={`${item.id}-${page.label}`}
                            kind="tertiary"
                            onClick={() => onPageSelect(item.id, page.label)}
                          >
                            {page.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}
