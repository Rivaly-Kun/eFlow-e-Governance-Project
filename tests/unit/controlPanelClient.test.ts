import { describe, expect, it } from "vitest";

import {
  AiServiceUnavailableError,
  ControlPanelUnavailableError,
  isAiHeartbeatFresh,
  normalizeControlPanelBase,
} from "../../src/app/shared/controlPanelClient";


describe("normalizeControlPanelBase", () => {
  it("keeps the published Quick Tunnel API endpoint stable", () => {
    expect(
      normalizeControlPanelBase(
        "https://sample-node.trycloudflare.com/controlpanelEflow/api/",
      ),
    ).toBe("https://sample-node.trycloudflare.com/controlpanelEflow/api");
  });

  it("adds the eFlow API prefix to an origin-only endpoint", () => {
    expect(normalizeControlPanelBase("http://127.0.0.1:8322")).toBe(
      "http://127.0.0.1:8322/controlpanelEflow/api",
    );
  });

  it("preserves the local compatibility proxy", () => {
    expect(normalizeControlPanelBase("/api")).toBe("/api");
  });

  it("does not invent a local endpoint when Supabase has not published one", () => {
    expect(normalizeControlPanelBase("")).toBe("");
    expect(new AiServiceUnavailableError().message).toContain(
      "automatically restarting",
    );
    expect(new ControlPanelUnavailableError().message).not.toContain("AI service");
  });
});

describe("isAiHeartbeatFresh", () => {
  const now = Date.parse("2026-08-12T00:00:00.000Z");

  it("accepts a recent server heartbeat", () => {
    expect(isAiHeartbeatFresh("2026-08-11T23:59:30.000Z", now)).toBe(true);
  });

  it("rejects missing, invalid, and expired heartbeats", () => {
    expect(isAiHeartbeatFresh(null, now)).toBe(false);
    expect(isAiHeartbeatFresh("invalid", now)).toBe(false);
    expect(isAiHeartbeatFresh("2026-08-11T23:59:00.000Z", now)).toBe(false);
  });
});
