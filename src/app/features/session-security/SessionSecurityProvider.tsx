import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  INACTIVITY_NOTICE,
  SESSION_ACTIVITY_WRITE_THROTTLE_MS,
  SESSION_CHANNEL_PREFIX,
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_NOTICE_KEY,
  SESSION_WARNING_LEAD_MS,
} from "./constants";
import { InactivityWarningDialog } from "./components/InactivityWarningDialog";
import { clearSessionActivity, getSessionActivityStorageKey } from "./services/sessionActivityStorage";
import { getInactivityState, isMeaningfulKeyboardEvent, readActivityTimestamp } from "./services/sessionTimeline";

type SessionMessage = { type: "activity"; at: number } | { type: "logout"; at: number };

export function SessionSecurityProvider({ children, timeoutMs = SESSION_IDLE_TIMEOUT_MS, warningLeadMs = SESSION_WARNING_LEAD_MS }: { children: ReactNode; timeoutMs?: number; warningLeadMs?: number }) {
  const { user, logout } = useAuth();
  const userId = user?.id;
  const storageKey = userId ? getSessionActivityStorageKey(userId) : "";
  const lastActivityRef = useRef(Date.now());
  const lastWriteRef = useRef(0);
  const trailingWriteRef = useRef<number | undefined>(undefined);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const logoutStartedRef = useRef(false);
  const [remainingMs, setRemainingMs] = useState(timeoutMs);
  const [warningOpen, setWarningOpen] = useState(false);

  const publishActivity = useCallback((at: number) => {
    if (!storageKey) return;
    lastWriteRef.current = at;
    localStorage.setItem(storageKey, String(at));
    channelRef.current?.postMessage({ type: "activity", at } satisfies SessionMessage);
  }, [storageKey]);

  const recordActivity = useCallback((force = false) => {
    if (!userId || logoutStartedRef.current) return;
    const now = Date.now();
    lastActivityRef.current = now;
    setWarningOpen(false);
    setRemainingMs(timeoutMs);
    window.clearTimeout(trailingWriteRef.current);
    if (force || now - lastWriteRef.current >= SESSION_ACTIVITY_WRITE_THROTTLE_MS) {
      publishActivity(now);
      return;
    }
    trailingWriteRef.current = window.setTimeout(() => publishActivity(lastActivityRef.current), SESSION_ACTIVITY_WRITE_THROTTLE_MS - (now - lastWriteRef.current));
  }, [publishActivity, timeoutMs, userId]);

  const expireSession = useCallback(async () => {
    if (logoutStartedRef.current) return;
    logoutStartedRef.current = true;
    window.clearTimeout(trailingWriteRef.current);
    if (userId) clearSessionActivity(localStorage, userId);
    localStorage.setItem(SESSION_NOTICE_KEY, INACTIVITY_NOTICE);
    channelRef.current?.postMessage({ type: "logout", at: Date.now() } satisfies SessionMessage);
    await logout();
  }, [logout, userId]);

  useEffect(() => {
    if (!userId || !storageKey) return;
    logoutStartedRef.current = false;
    const now = Date.now();
    const stored = readActivityTimestamp(localStorage.getItem(storageKey), now);
    lastActivityRef.current = stored;
    lastWriteRef.current = stored;
    if (!localStorage.getItem(storageKey)) publishActivity(now);

    if (typeof BroadcastChannel !== "undefined") {
      channelRef.current = new BroadcastChannel(`${SESSION_CHANNEL_PREFIX}:${userId}`);
      channelRef.current.onmessage = (event: MessageEvent<SessionMessage>) => {
        const message = event.data;
        if (message?.type === "activity" && message.at > lastActivityRef.current) {
          lastActivityRef.current = message.at;
          setWarningOpen(false);
        }
        if (message?.type === "logout") void expireSession();
      };
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey && event.newValue) {
        const timestamp = readActivityTimestamp(event.newValue, lastActivityRef.current);
        if (timestamp > lastActivityRef.current) { lastActivityRef.current = timestamp; setWarningOpen(false); }
      }
      if (event.key === SESSION_NOTICE_KEY && event.newValue) void expireSession();
    };
    const onPointer = (event: PointerEvent) => { if (event.isTrusted) recordActivity(); };
    const onTouch = (event: TouchEvent) => { if (event.isTrusted) recordActivity(); };
    const onKeyboard = (event: KeyboardEvent) => { if (event.isTrusted && isMeaningfulKeyboardEvent(event)) recordActivity(); };
    const onNavigation = (event: PopStateEvent) => { if (event.isTrusted) recordActivity(); };
    const check = () => {
      const state = getInactivityState(lastActivityRef.current, Date.now(), timeoutMs, warningLeadMs);
      setRemainingMs(state.remainingMs);
      setWarningOpen(state.phase === "warning");
      if (state.phase === "expired") void expireSession();
    };
    const onVisibility = () => { if (document.visibilityState === "visible") check(); };

    window.addEventListener("storage", onStorage);
    window.addEventListener("pointerdown", onPointer, { capture: true, passive: true });
    window.addEventListener("touchstart", onTouch, { capture: true, passive: true });
    window.addEventListener("keydown", onKeyboard, { capture: true });
    window.addEventListener("popstate", onNavigation);
    document.addEventListener("visibilitychange", onVisibility);
    const ticker = window.setInterval(check, 1000);
    check();

    return () => {
      window.clearInterval(ticker);
      window.clearTimeout(trailingWriteRef.current);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pointerdown", onPointer, { capture: true });
      window.removeEventListener("touchstart", onTouch, { capture: true });
      window.removeEventListener("keydown", onKeyboard, { capture: true });
      window.removeEventListener("popstate", onNavigation);
      document.removeEventListener("visibilitychange", onVisibility);
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [expireSession, publishActivity, recordActivity, storageKey, timeoutMs, userId, warningLeadMs]);

  return <>{children}{warningOpen && <InactivityWarningDialog remainingMs={remainingMs} onStaySignedIn={() => recordActivity(true)} onSignOut={() => void expireSession()} />}</>;
}
