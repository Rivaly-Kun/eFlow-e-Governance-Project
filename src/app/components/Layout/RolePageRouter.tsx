import type { ComponentType, ReactNode } from "react";

export type RolePageSections = Record<
  string,
  Record<string, ComponentType>
>;

export function RolePageRouter({
  sections,
  defaults,
  activeSection,
  activePage,
  fallback,
}: {
  sections: RolePageSections;
  defaults: Record<string, string>;
  activeSection: string;
  activePage?: string;
  fallback?: (section: string, page?: string) => ReactNode;
}) {
  const section = sections[activeSection];
  if (!section) {
    return <>{fallback?.(activeSection, activePage) ?? null}</>;
  }

  const resolvedPage =
    activePage || defaults[activeSection] || Object.keys(section)[0];
  const Page = section[resolvedPage] || section[Object.keys(section)[0]];

  return Page ? (
    <Page />
  ) : (
    <>{fallback?.(activeSection, resolvedPage) ?? null}</>
  );
}
