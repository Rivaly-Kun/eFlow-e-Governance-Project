// ─── Super Admin: System Settings ────────────────────────────────
// Reads/writes system_config table in Supabase.

import { useState, useEffect } from "react";
import { fetchAllConfig, updateConfig } from "../../../lib/supabaseService";
import { useToast } from "../ui/Toast";

export function SystemSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAllConfig()
      .then((data) => {
        const formData: Record<string, string> = {};
        data.forEach((c) => { formData[c.key] = c.value; });
        setForm(formData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(form)) {
        await updateConfig(key, value);
      }
      toast("Settings saved successfully", "success");
    } catch (err: any) {
      toast(err?.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const appVersion = form["app_version"] || "2.0.0";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
        Super Admin <span className="mx-1.5">/</span> <span className="text-neutral-700">Settings</span>
      </div>

      <h2 className="font-['Lexend:SemiBold',_sans-serif] font-semibold text-[20px] text-neutral-900 mb-6">
        System Settings
      </h2>

      <div className="space-y-4 max-w-2xl">
        {/* AI Configuration Card */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50/50">
            <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-800">
              AI Configuration
            </span>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-600 mb-1.5">
                AI Endpoint URL
              </label>
              <input
                type="text"
                value={form["ai_endpoint"] || ""}
                onChange={(e) => setForm({ ...form, ai_endpoint: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-[12px] font-['Lexend:Regular',_sans-serif] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50"
                placeholder="http://localhost:8321"
              />
            </div>
            <div>
              <label className="block text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-600 mb-1.5">
                AI Model
              </label>
              <input
                type="text"
                value={form["ai_model"] || ""}
                onChange={(e) => setForm({ ...form, ai_model: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-[12px] font-['Lexend:Regular',_sans-serif] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50"
                placeholder="deepseek-r1:8b"
              />
            </div>
          </div>
        </div>

        {/* App Info Card */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50/50">
            <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-800">
              Application
            </span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600">
                App Version
              </span>
              <span className="text-[12px] font-mono text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">
                {appVersion}
              </span>
            </div>
            <div>
              <label className="block text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-600 mb-1.5">
                Version String
              </label>
              <input
                type="text"
                value={form["app_version"] || ""}
                onChange={(e) => setForm({ ...form, app_version: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-[12px] font-['Lexend:Regular',_sans-serif] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2.5 rounded-lg bg-neutral-900 text-white text-[12px] font-['Lexend:Medium',_sans-serif] font-medium hover:bg-neutral-800 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
