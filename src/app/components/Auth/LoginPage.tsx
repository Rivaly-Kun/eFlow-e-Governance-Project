import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import type { UserRole } from "../../types";
import { supabase } from "../../../lib/supabase";

// ─── Ormoc City seal SVG (simplified shield) ─────────────────────
function OrmocSeal() {
  return (
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0085FF] to-[#0066CC] flex items-center justify-center shadow-lg shadow-blue-500/20">
      <svg viewBox="0 0 40 40" className="w-9 h-9" fill="none">
        <path
          d="M20 4L6 12v10c0 8.5 6 14.5 14 18 8-3.5 14-9.5 14-18V12L20 4z"
          fill="white"
          fillOpacity="0.2"
          stroke="white"
          strokeWidth="1.5"
        />
        <path
          d="M20 10l-8 4.5v6c0 5 3.5 8.5 8 10.5 4.5-2 8-5.5 8-10.5v-6L20 10z"
          fill="white"
          fillOpacity="0.15"
        />
        <text
          x="20"
          y="24"
          textAnchor="middle"
          fill="white"
          fontSize="11"
          fontWeight="700"
          fontFamily="Lexend, sans-serif"
        >
          eF
        </text>
      </svg>
    </div>
  );
}

// ─── Loading dots animation ──────────────────────────────────────
function LoadingDots() {
  return (
    <span className="inline-flex gap-1 items-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white"
          style={{
            animation: "eflow-dot 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes eflow-dot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </span>
  );
}

// ─── Toast ───────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "error" | "success"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed top-6 right-6 z-50 max-w-md px-4 py-3 rounded-xl shadow-2xl border flex items-start gap-3 animate-[eflow-slide-in_0.3s_ease-out] ${
        type === "error"
          ? "bg-red-50 border-red-200 text-red-900"
          : "bg-emerald-50 border-emerald-200 text-emerald-900"
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          type === "error" ? "bg-red-500" : "bg-emerald-500"
        }`}
      >
        <svg viewBox="0 0 16 16" className="w-3 h-3" fill="white">
          {type === "error" ? (
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
          ) : (
            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
          )}
        </svg>
      </div>
      <div className="flex-1 text-[13px] font-['Lexend:Regular',_sans-serif]">{message}</div>
      <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 shrink-0">
        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
        </svg>
      </button>
      <style>{`
        @keyframes eflow-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Main Login Page ─────────────────────────────────────────────
export function LoginPage() {
  const { login, register, error, clearError } = useAuth();

  const [mode, setMode] = useState<"login" | "setup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "error" | "success" } | null>(null);
  const [canSetupAdmin, setCanSetupAdmin] = useState<boolean | null>(null);

  // Check if any super_admin exists — if not, show "First-Time Setup" option
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'super_admin')
          .eq('is_active', true)
          .limit(1);

        if (error) {
          setCanSetupAdmin(true);
          return;
        }

        setCanSetupAdmin(!data || data.length === 0);
      } catch {
        setCanSetupAdmin(false);
      }
    })();
  }, []);

  // Show auth error as toast
  useEffect(() => {
    if (error) {
      setToast({ msg: error, type: "error" });
      clearError();
    }
  }, [error, clearError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setToast({ msg: "Please enter both email and password.", type: "error" });
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch {
      // error is handled via toast
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // error handled via context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#F5F6F8]">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute -top-[300px] -left-[200px] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-[#0085FF]/8 to-transparent blur-3xl" />
        <div className="absolute -bottom-[200px] -right-[300px] w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-[#00CA72]/6 to-transparent blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-[#0085FF]/3 to-[#00CA72]/3 blur-[100px]" />

        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.3) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Card */}
      <div className="relative z-10 w-full max-w-[420px] mx-4">
        {/* Logo + Title */}
        <div className="flex flex-col items-center mb-8">
          <OrmocSeal />
          <h1 className="mt-4 text-[24px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-[#323338]">
            eFlow
          </h1>
          <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-[#676879] mt-1">
            Ormoc City LGU · e-Governance Platform
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl shadow-black/5 p-8">
          {mode === "login" ? (
            <>
              <h2 className="text-[17px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-[#323338] mb-1">
                Sign in to your account
              </h2>
              <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-[#676879] mb-6">
                Enter your credentials to access the dashboard
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-[#676879] uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@eflow.gov.ph"
                    autoComplete="email"
                    className="w-full h-11 px-3.5 rounded-lg border border-neutral-200 bg-[#F5F6F8] text-[13px] font-['Lexend:Regular',_sans-serif] text-[#323338] placeholder:text-neutral-400 focus:outline-none focus:border-[#0085FF] focus:ring-2 focus:ring-[#0085FF]/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-[#676879] uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full h-11 px-3.5 rounded-lg border border-neutral-200 bg-[#F5F6F8] text-[13px] font-['Lexend:Regular',_sans-serif] text-[#323338] placeholder:text-neutral-400 focus:outline-none focus:border-[#0085FF] focus:ring-2 focus:ring-[#0085FF]/10 transition-all"
                  />
                </div>

                <button
                  id="login-submit"
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-lg bg-[#0085FF] hover:bg-[#006FD6] active:bg-[#005CB8] text-white text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? (
                    <>
                      Signing in <LoadingDots />
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#00CA72] animate-pulse" />
                <h2 className="text-[17px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-[#323338]">
                  First-Time Setup
                </h2>
              </div>
              <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-[#676879] mb-6">
                Create the Super Admin account for eFlow
              </p>

              <form onSubmit={handleSetup} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-[#676879] uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="setup-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Juan Dela Cruz"
                    className="w-full h-11 px-3.5 rounded-lg border border-neutral-200 bg-[#F5F6F8] text-[13px] font-['Lexend:Regular',_sans-serif] text-[#323338] placeholder:text-neutral-400 focus:outline-none focus:border-[#0085FF] focus:ring-2 focus:ring-[#0085FF]/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-[#676879] uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="setup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@eflow.gov.ph"
                    autoComplete="email"
                    className="w-full h-11 px-3.5 rounded-lg border border-neutral-200 bg-[#F5F6F8] text-[13px] font-['Lexend:Regular',_sans-serif] text-[#323338] placeholder:text-neutral-400 focus:outline-none focus:border-[#0085FF] focus:ring-2 focus:ring-[#0085FF]/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-[#676879] uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <input
                    id="setup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                    className="w-full h-11 px-3.5 rounded-lg border border-neutral-200 bg-[#F5F6F8] text-[13px] font-['Lexend:Regular',_sans-serif] text-[#323338] placeholder:text-neutral-400 focus:outline-none focus:border-[#0085FF] focus:ring-2 focus:ring-[#0085FF]/10 transition-all"
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
                  <svg viewBox="0 0 16 16" className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="currentColor">
                    <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM6.5 7h3l-.5 5h-2L6.5 7z" />
                  </svg>
                  <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-amber-800">
                    This creates the <strong>first Super Admin</strong>. This option disappears once a super_admin account exists.
                  </p>
                </div>

                <button
                  id="setup-submit"
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-lg bg-[#00CA72] hover:bg-[#00B563] active:bg-[#009E56] text-white text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? (
                    <>
                      Creating Account <LoadingDots />
                    </>
                  ) : (
                    "Create Super Admin Account"
                  )}
                </button>
              </form>
            </>
          )}

      
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] font-['Lexend:Regular',_sans-serif] text-[#676879] mt-6">
          © 2026 Ormoc City Local Government Unit · eFlow Platform
        </p>
      </div>
    </div>
  );
}
