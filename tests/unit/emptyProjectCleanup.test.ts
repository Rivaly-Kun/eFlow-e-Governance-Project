import { describe, expect, it, vi } from "vitest";
import { offerEmptyProjectCleanup } from "../../src/app/features/projects/services/emptyProjectCleanupService";

describe("empty project cleanup after task deletion", () => {
  it("does nothing while another task remains", async () => {
    const remove = vi.fn();
    const outcome = await offerEmptyProjectCleanup("project-1", vi.fn(), {
      find: vi.fn().mockResolvedValue(null),
      remove,
    });
    expect(outcome.status).toBe("not_empty");
    expect(remove).not.toHaveBeenCalled();
  });

  it("deletes the project container only after explicit confirmation", async () => {
    const project = { id: "project-1", title: "Implementation Project" };
    const remove = vi.fn().mockResolvedValue(undefined);
    const outcome = await offerEmptyProjectCleanup(
      project.id,
      vi.fn().mockReturnValue(true),
      { find: vi.fn().mockResolvedValue(project), remove },
    );
    expect(outcome).toEqual({ status: "deleted", project });
    expect(remove).toHaveBeenCalledWith(project);
  });
});
