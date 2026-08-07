import { describe, expect, it } from "vitest";
import { resolvePermissions } from "../../src/app/services/permissionService";

describe("permission resolution compatibility", () => {
  it("uses persisted role permissions and applies user overrides last", () => {
    const result = resolvePermissions(
      "dept_head",
      [
        { role: "dept_head", permission: "tasks.assign", allowed: true },
        { role: "dept_head", permission: "reports.export", allowed: false },
      ],
      [
        { userId: "user-1", permission: "tasks.assign", allowed: false },
        { userId: "user-1", permission: "reports.export", allowed: true },
      ],
    );
    expect([...result].sort()).toEqual(["reports.export"]);
  });
});
