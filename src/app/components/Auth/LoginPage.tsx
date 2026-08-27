import { Avatar, Button, Dialog, DialogContentContainer, IconButton, Menu, MenuItem, TextField } from "@vibe/core";
import { Close, Dropdown, Info, Person, Workspace } from "@vibe/icons";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { SESSION_NOTICE_KEY } from "../../features/session-security/constants";
import { clearAllSessionActivity } from "../../features/session-security/services/sessionActivityStorage";
import { QUICK_LOGIN_ACCOUNTS, type QuickLoginAccount } from "../../shared/quickLoginAccounts";
import type { UserRole } from "../../types";
import "./loginPage.css";

function Toast({ message, type, onClose }: { message: string; type: "error" | "success"; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 5000);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  return (
    <div aria-live="polite" className={`eflow-auth-toast eflow-auth-toast--${type}`} role="status">
      <Info aria-hidden="true" size={18} />
      <span className="eflow-auth-toast__message">{message}</span>
      <IconButton aria-label="Dismiss message" icon={Close} kind="tertiary" onClick={onClose} size="small" />
    </div>
  );
}

export function LoginPage() {
  const { login, register, error, clearError } = useAuth();
  const [mode, setMode] = useState<"login" | "setup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "error" | "success" } | null>(null);
  const [canSetupAdmin, setCanSetupAdmin] = useState<boolean | null>(null);
  const [isQuickLoginOpen, setQuickLoginOpen] = useState(false);
  const [sessionNotice] = useState(() => {
    const notice = localStorage.getItem(SESSION_NOTICE_KEY) || "";
    if (notice) {
      clearAllSessionActivity(localStorage);
      localStorage.removeItem(SESSION_NOTICE_KEY);
    }
    return notice;
  });

  useEffect(() => {
    void (async () => {
      try {
        const { count, error: profileError } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "super_admin")
          .eq("is_active", true);

        setCanSetupAdmin(profileError ? true : count === 0);
      } catch {
        setCanSetupAdmin(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!error) return;
    setToast({ msg: error, type: "error" });
    clearError();
  }, [error, clearError]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setToast({ msg: "Please enter both email and password.", type: "error" });
      return;
    }
    setSubmitting(true);
    try {
      clearAllSessionActivity(localStorage);
      localStorage.removeItem(SESSION_NOTICE_KEY);
      await login(email.trim(), password);
    } catch {
      // AuthContext supplies the user-facing error toast.
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (account: QuickLoginAccount) => {
    setQuickLoginOpen(false);
    setEmail(account.email);
    setPassword(account.password);
    setSubmitting(true);
    try {
      clearError();
      clearAllSessionActivity(localStorage);
      localStorage.removeItem(SESSION_NOTICE_KEY);
      await login(account.email, account.password);
    } catch {
      // AuthContext supplies the user-facing error toast.
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim() || !name.trim()) {
      setToast({ msg: "All fields are required.", type: "error" });
      return;
    }
    if (password.length < 6) {
      setToast({ msg: "Password must be at least 6 characters.", type: "error" });
      return;
    }
    setSubmitting(true);
    try {
      await register(email.trim(), password, name.trim(), "super_admin" as UserRole);
      setToast({ msg: "Super Admin account created successfully!", type: "success" });
    } catch {
      // AuthContext supplies the user-facing error toast.
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    clearError();
    setMode((current) => (current === "login" ? "setup" : "login"));
  };

  return (
    <main className="eflow-auth-page" aria-labelledby="eflow-auth-title">
      {toast && <Toast message={toast.msg} onClose={() => setToast(null)} type={toast.type} />}
      <section className="eflow-auth-card" aria-label="eFlow sign in">
        <header className="eflow-auth-card__header">
          <Avatar aria-hidden icon={Workspace} size="large" square type="icon" />
          <div>
            <h1 id="eflow-auth-title">eFlow</h1>
            <p>Government work, connected.</p>
          </div>
        </header>

        {mode === "login" ? (
          <section aria-labelledby="sign-in-heading">
            <h2 id="sign-in-heading">Sign in</h2>
            <p className="eflow-auth-card__intro">Use your eFlow account to continue to your workspace.</p>
            {sessionNotice && <p className="eflow-auth-notice" role="status">{sessionNotice}</p>}

            <form className="eflow-auth-form" onSubmit={handleLogin}>
              <TextField
                autoComplete="email"
                controlled
                id="login-email"
                inputAriaLabel="Email address"
                onChange={setEmail}
                placeholder="you@eflow.gov.ph"
                required
                title="Email address"
                value={email}
              />
              <TextField
                autoComplete="current-password"
                controlled
                id="login-password"
                inputAriaLabel="Password"
                onChange={setPassword}
                placeholder="Enter your password"
                required
                title="Password"
                type="password"
                value={password}
              />
              <Button className="eflow-auth-submit" id="login-submit" loading={submitting} type="submit">
                Sign in
              </Button>
            </form>

            <div className="eflow-auth-card__development">
              <span>Development access</span>
              <Dialog
                content={(
                  <DialogContentContainer>
                    <Menu id="quick-login-accounts">
                      {QUICK_LOGIN_ACCOUNTS.map((account) => (
                        <MenuItem
                          icon={Person}
                          key={account.email}
                          onClick={() => void handleQuickLogin(account)}
                          title={`${account.label} — ${account.email}`}
                        />
                      ))}
                    </Menu>
                  </DialogContentContainer>
                )}
                hideTrigger={[]}
                onDialogDidHide={() => setQuickLoginOpen(false)}
                open={isQuickLoginOpen}
                position="bottom-end"
                showTrigger={[]}
              >
                <Button
                  aria-expanded={isQuickLoginOpen}
                  aria-haspopup="menu"
                  aria-label="Choose a development account"
                  id="quick-login-picker"
                  kind="tertiary"
                  leftIcon={Dropdown}
                  onClick={() => setQuickLoginOpen(true)}
                  size="small"
                  disabled={submitting}
                >
                  Quick login
                </Button>
              </Dialog>
            </div>
          </section>
        ) : (
          <section aria-labelledby="setup-heading">
            <h2 id="setup-heading">Set up eFlow</h2>
            <p className="eflow-auth-card__intro">Create the first Super Admin account for this workspace.</p>
            <form className="eflow-auth-form" onSubmit={handleSetup}>
              <TextField
                controlled
                id="setup-name"
                inputAriaLabel="Full name"
                onChange={setName}
                placeholder="Juan Dela Cruz"
                required
                title="Full name"
                value={name}
              />
              <TextField
                autoComplete="email"
                controlled
                id="setup-email"
                inputAriaLabel="Email address"
                onChange={setEmail}
                placeholder="admin@eflow.gov.ph"
                required
                title="Email address"
                type="email"
                value={email}
              />
              <TextField
                autoComplete="new-password"
                controlled
                id="setup-password"
                inputAriaLabel="Password"
                onChange={setPassword}
                placeholder="At least 6 characters"
                required
                title="Password"
                type="password"
                value={password}
              />
              <p className="eflow-auth-notice eflow-auth-notice--warning">
                <Info aria-hidden="true" size={16} /> This creates the first Super Admin. The option disappears once an active Super Admin account exists.
              </p>
              <Button className="eflow-auth-submit" id="setup-submit" loading={submitting} type="submit">
                Create Super Admin account
              </Button>
            </form>
          </section>
        )}

        {canSetupAdmin && (
          <Button className="eflow-auth-submit" kind="tertiary" onClick={toggleMode}>
            {mode === "login" ? "Set up the first Super Admin" : "Back to sign in"}
          </Button>
        )}
      </section>
      <p className="eflow-auth-page__footer">© 2026 Ormoc City Local Government Unit</p>
    </main>
  );
}
