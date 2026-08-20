import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const client = readFileSync(new URL("../../src/app/features/administration/services/backupService.ts", import.meta.url), "utf8");
const router = readFileSync(new URL("../../server/routers/backups.py", import.meta.url), "utf8");
const main = readFileSync(new URL("../../server/main.py", import.meta.url), "utf8");
const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { scripts: Record<string, string> };

describe("Backup & Export gateway contract", () => {
  it("keeps the frontend and FastAPI route prefixes aligned", () => {
    expect(client).toContain('controlPanelFetch("admin/backups"');
    expect(router).toContain('prefix="/controlpanelEflow/api/admin/backups"');
    expect(main).toContain("app.include_router(backups_router)");
  });

  it("reloads Python gateway routes during npm development", () => {
    expect(packageJson.scripts["dev:gateway"]).toContain("--reload");
    expect(packageJson.scripts["restart:gateway"]).toContain("server/start.py --reload");
  });
});
