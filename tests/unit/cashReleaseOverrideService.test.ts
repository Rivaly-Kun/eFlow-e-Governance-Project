import { beforeEach, describe, expect, it, vi } from "vitest";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("../../src/lib/supabase", () => ({ supabase: { rpc } }));
import { markPettyCashReleased, overridePettyCashReleaseSchedule } from "../../src/app/features/budget/services/budgetService";
beforeEach(() => rpc.mockReset().mockResolvedValue({ error: null }));
describe("release RPC compatibility", () => {
  it("preserves the existing normal release payload", async () => {
    await markPettyCashReleased("release-1");
    expect(rpc).toHaveBeenCalledWith("mark_petty_cash_released", { p_release_id: "release-1" });
  });
  it("sends an explicit reason to the dedicated override RPC", async () => {
    await overridePettyCashReleaseSchedule("release-1", "  Supplier needs payment today  ");
    expect(rpc).toHaveBeenCalledWith("override_petty_cash_release_schedule", { p_release_id: "release-1", p_reason: "Supplier needs payment today" });
  });
  it("does not send blank or short reasons", async () => {
    await expect(overridePettyCashReleaseSchedule("release-1", " ")).rejects.toThrow("10 characters");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("explains a missing live migration without falling back to an unsafe release", async () => {
    rpc.mockResolvedValue({ error: { code: "PGRST202", message: "Missing RPC" } });
    await expect(overridePettyCashReleaseSchedule("release-1", "Supplier needs payment today")).rejects.toThrow("20260831000002_cash_release_schedule_override.sql");
    expect(rpc).toHaveBeenCalledOnce();
  });
});
