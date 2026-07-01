import React, { useState, useEffect } from "react";
import { User, Mail, IdCard, Building2, Shield, Lock, Activity } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { updateOwnProfile, fetchAllOrgs } from "../../../lib/supabaseService";
import { supabase } from "../../../lib/supabase";

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-neutral-100 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-500 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-neutral-400">{label}</div>
        <div className="text-[13px] text-neutral-800 font-['Lexend:Medium',_sans-serif] truncate">
          {value || "—"}
        </div>
      </div>
    </div>
  );
}

function formatRole(role: string): string {
  return (role || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ProfilePage() {
  const { userProfile } = useAuth();
  const [fullName, setFullName] = useState(userProfile?.fullName || "");
  const [orgName, setOrgName] = useState<string>("—");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    if (!userProfile?.departmentId) return;
    fetchAllOrgs().then((orgs) => {
      const org = orgs.find((o) => o.id === userProfile.departmentId);
      if (org) setOrgName(org.name);
    });
  }, [userProfile?.departmentId]);

  const initials = (userProfile?.fullName || "?")
    .split(" ")
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2);

  const handleSaveName = async () => {
    if (!userProfile?.uid || !fullName.trim()) return;
    setSaving(true);
    setSaveMsg("");
    try {
      await updateOwnProfile(userProfile.uid, { full_name: fullName.trim() });
      setSaveMsg("Saved.");
      setTimeout(() => setSaveMsg(""), 2500);
    } catch (err) {
      setSaveMsg("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError("");
    setPwMsg("");
    if (newPassword.length < 6) {
      setPwError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwMsg("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwMsg(""), 2500);
    } catch (err: any) {
      setPwError(err?.message || "Failed to update password.");
    } finally {
      setPwSaving(false);
    }
  };

  const workload = userProfile?.workload ?? 0;
  const burnout = userProfile?.burnoutLevel || "low";
  const burnoutColor =
    burnout === "high"
      ? "text-red-600 bg-red-50"
      : burnout === "medium"
        ? "text-amber-600 bg-amber-50"
        : "text-emerald-600 bg-emerald-50";

  return (
    <div className="p-8 h-full bg-neutral-50 overflow-y-auto">
      <div className="mb-6">
        <div className="text-[11px] tracking-widest text-neutral-400 uppercase mb-1">
          My Workspace · Account
        </div>
        <h1 className="text-[22px] text-neutral-900 font-['Lexend:SemiBold',_sans-serif]">
          Profile & Settings
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
        {/* Identity card */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 md:col-span-2">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[18px] font-['Lexend:SemiBold',_sans-serif]">
              {initials}
            </div>
            <div>
              <div className="text-[15px] text-neutral-900 font-['Lexend:SemiBold',_sans-serif]">
                {userProfile?.fullName}
              </div>
              <div className="inline-flex items-center gap-1 mt-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-600">
                <Shield size={10} /> {formatRole(userProfile?.role || "")}
              </div>
            </div>
          </div>

          <InfoRow icon={<Mail size={14} />} label="Email" value={userProfile?.email || ""} />
          <InfoRow
            icon={<IdCard size={14} />}
            label="Employee ID"
            value={userProfile?.employeeId || ""}
          />
          <InfoRow icon={<Building2 size={14} />} label="Office / Section" value={orgName} />
        </div>

        {/* Edit name */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800 mb-3 flex items-center gap-2">
            <User size={14} /> Display Name
          </div>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full h-9 rounded-lg border border-neutral-200 px-3 text-[13px] outline-none focus:border-neutral-400"
          />
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleSaveName}
              disabled={saving || !fullName.trim()}
              className="px-3 py-2 rounded-lg bg-neutral-900 text-white text-[12px] font-['Lexend:Medium',_sans-serif] disabled:opacity-40 hover:bg-neutral-800"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {saveMsg && <span className="text-[11px] text-neutral-500">{saveMsg}</span>}
          </div>
        </div>

        {/* Workload snapshot */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800 mb-3 flex items-center gap-2">
            <Activity size={14} /> Workload Snapshot
          </div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-neutral-500">Current load</span>
            <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-800">
              {workload}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden mb-3">
            <div
              className="h-full bg-neutral-800 transition-all"
              style={{ width: `${Math.min(workload, 100)}%` }}
            />
          </div>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${burnoutColor}`}
          >
            {burnout} burnout risk
          </span>
        </div>

        {/* Change password */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 md:col-span-2">
          <div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800 mb-3 flex items-center gap-2">
            <Lock size={14} /> Change Password
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-9 rounded-lg border border-neutral-200 px-3 text-[13px] outline-none focus:border-neutral-400"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-9 rounded-lg border border-neutral-200 px-3 text-[13px] outline-none focus:border-neutral-400"
            />
          </div>
          {pwError && <div className="text-[11px] text-red-600 mt-2">{pwError}</div>}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleChangePassword}
              disabled={pwSaving || !newPassword}
              className="px-3 py-2 rounded-lg bg-neutral-900 text-white text-[12px] font-['Lexend:Medium',_sans-serif] disabled:opacity-40 hover:bg-neutral-800"
            >
              {pwSaving ? "Updating…" : "Update Password"}
            </button>
            {pwMsg && <span className="text-[11px] text-emerald-600">{pwMsg}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
