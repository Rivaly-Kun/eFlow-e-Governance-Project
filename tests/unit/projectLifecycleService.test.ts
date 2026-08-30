import { beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ rpc: vi.fn(), refresh: vi.fn(), from: vi.fn() }));
vi.mock("../../src/lib/supabase", () => ({ supabase: { rpc: api.rpc, from: api.from } }));
vi.mock("../../src/app/features/projects/services/projectQueryService", () => ({ notifyProjectListeners: api.refresh }));
import { archiveCompletedProject, completeProject, fetchProjectCompletionReadiness } from "../../src/app/features/projects/services/projectLifecycleService";
beforeEach(() => { vi.clearAllMocks(); api.rpc.mockReset().mockResolvedValue({ error: null }); });
describe("project lifecycle service", () => {
  it("uses the per-project endpoint, never proposal-wide completion", async () => {
    await completeProject("project-1", "  Delivered  ");
    expect(api.rpc).toHaveBeenCalledExactlyOnceWith("complete_project", { p_project_id: "project-1", p_note: "Delivered" });
    expect(api.refresh).toHaveBeenCalledOnce();
  });
  it("archives through the guarded server endpoint", async () => {
    await archiveCompletedProject("project-1");
    expect(api.rpc).toHaveBeenCalledExactlyOnceWith("archive_completed_project", { p_project_id: "project-1", p_reason: null });
    expect(api.from).not.toHaveBeenCalled();
  });
  it("does not fall back to a direct update when SQL is missing", async () => {
    api.rpc.mockResolvedValue({ error: { code: "PGRST202", message: "not found" } });
    await expect(completeProject("project-1")).rejects.toThrow("20260831000003_project_completion_lifecycle.sql");
    expect(api.from).not.toHaveBeenCalled();
    expect(api.refresh).not.toHaveBeenCalled();
  });
  it("keeps the actual blocker details on server rejection", async () => {
    api.rpc.mockResolvedValue({ error: { code: "22023", message: "Blocked", details: JSON.stringify([{ title: "FR-00006", detail: "Settle the receipt package" }]) } });
    await expect(archiveCompletedProject("project-1")).rejects.toThrow("FR-00006: Settle the receipt package");
  });
  it("fails closed on invalid readiness responses", async () => {
    api.rpc.mockResolvedValue({ error: null, data: null });
    await expect(fetchProjectCompletionReadiness("project-1")).rejects.toThrow("valid result");
  });
});
