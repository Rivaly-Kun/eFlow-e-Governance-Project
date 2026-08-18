import { describe, expect, it } from "vitest";

import { getRoleNavigation } from "../../src/app/features/navigation/roleNavigation";
import { superadminSidebar } from "../../src/app/features/navigation/sidebarRoles/superadminSidebar";

describe("Super Admin Data Tools compatibility", () => {
  it("keeps the migration section id while presenting Backup & Export", () => {
    const navigation = getRoleNavigation("superadmin");
    expect(navigation.navItems.find((item) => item.id === "migration")?.label).toBe("Data Tools");
    expect(superadminSidebar.migration.title).toBe("Data Tools");
    expect(superadminSidebar.migration.sections[0].items[0].label).toBe("Backup & Export");
  });
});
