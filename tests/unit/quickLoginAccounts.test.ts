import { describe, expect, it } from "vitest";
import { QUICK_LOGIN_ACCOUNTS, getQuickLoginAccount } from "../../src/app/shared/quickLoginAccounts";

describe("quick-login account registry", () => {
  it("keeps the picker and keyboard shortcuts on the same unique account registry", () => {
    expect(QUICK_LOGIN_ACCOUNTS.length).toBeGreaterThan(0);
    expect(new Set(QUICK_LOGIN_ACCOUNTS.map((account) => account.shortcut)).size)
      .toBe(QUICK_LOGIN_ACCOUNTS.length);
    expect(new Set(QUICK_LOGIN_ACCOUNTS.map((account) => account.email)).size)
      .toBe(QUICK_LOGIN_ACCOUNTS.length);
  });

  it("resolves configured Ctrl shortcut accounts and ignores unrelated keys", () => {
    expect(getQuickLoginAccount("1")?.email).toBe("admin@gmail.com");
    expect(getQuickLoginAccount("0")).toBeUndefined();
  });
});
