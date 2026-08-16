import { describe, expect, it } from "vitest";
import { getRoleNavigation } from "../../src/app/features/navigation/roleNavigation";

describe("role navigation compatibility", () => {
  it("keeps active workflow section identifiers and defaults stable", () => {
    const departmentHead = getRoleNavigation("depthead");
    expect(departmentHead.defaultSection).toBe("dashboard");
    expect(departmentHead.navItems.map((item) => item.id)).toEqual([
      "dashboard", "projects", "tasks", "leading", "subtasks", "reviews",
      "team", "intelligence", "reports", "announcements",
    ]);
    expect(departmentHead.navItems.find((item) => item.id === "leading")?.requiresLeadership).toBe(true);

    const employee = getRoleNavigation("employee");
    expect(employee.defaultSection).toBe("tasks");
    expect(employee.navItems.map((item) => item.id)).toEqual([
      "tasks", "projects", "leading", "subtasks", "reviews", "deadlines", "history",
      "performance", "reports", "announcements",
    ]);
    expect(employee.navItems.find((item) => item.id === "reviews")?.requiresLeadership).toBe(true);
  });

  it("preserves specialist and administration destinations", () => {
    expect(getRoleNavigation("superadmin").defaultSection).toBe("dashboard");
    expect(getRoleNavigation("executive").navItems.map((item) => item.id)).toEqual([
      "portfolio", "transform", "financial", "audit",
    ]);
    expect(getRoleNavigation("legislative").navItems.map((item) => item.id)).toEqual([
      "legdash", "session", "committee", "councilor",
    ]);
    expect(getRoleNavigation("hrmo").navItems.map((item) => item.id)).toEqual([
      "workforce", "wellness", "compliance",
    ]);
    expect(getRoleNavigation("finance").navItems.map((item) => item.id)).toEqual([
      "projfin", "liquidation", "crypto",
    ]);
    expect(getRoleNavigation("councilor_pad").defaultSection).toBe("councilor");
    expect(getRoleNavigation("finance").defaultPages?.liquidation).toBe("Receipt Verification");
    expect(getRoleNavigation("missing").defaultSection).toBe("dashboard");
  });
});
