import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import {
  Bell,
  Building2,
  Camera,
  Check,
  ChevronRight,
  CircleAlert,
  IdCard,
  KeyRound,
  Laptop,
  LockKeyhole,
  Mail,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import {
  clearProfileAvatar,
  getProfileAvatarUrl,
  replaceProfileAvatar,
  updateEmailPreference,
  updateOwnProfile,
} from '../../services/userSettingsService';
import { fetchAllOrgs } from '../../../lib/supabaseService';
import { supabase } from '../../../lib/supabase';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import type { ThemePreference } from '../../types';

type Result = { tone: 'success' | 'error'; text: string } | null;

const inputClass = 'h-11 rounded-xl border-neutral-200 bg-white px-3.5 text-[13px] text-neutral-900 shadow-sm placeholder:text-neutral-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ResultMessage({ result }: { result: Result }) {
  if (!result) return null;
  const isSuccess = result.tone === 'success';
  return (
    <div className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[12px] ${isSuccess ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300'}`}>
      {isSuccess ? <Check size={15} className="mt-0.5 shrink-0" /> : <CircleAlert size={15} className="mt-0.5 shrink-0" />}
      <span>{result.text}</span>
    </div>
  );
}

function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950 ${className}`}>{children}</section>;
}

function SectionHeading({ icon, eyebrow, title, description }: { icon: ReactNode; eyebrow: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{icon}</div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">{eyebrow}</p>
        <h2 className="mt-0.5 text-[16px] font-semibold text-neutral-900 dark:text-slate-100">{title}</h2>
        <p className="mt-1 text-[12px] leading-5 text-neutral-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function ProfileSettingsPage() {
  const { userProfile, updateUserProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.full_name ?? '');
  const [nameDirty, setNameDirty] = useState(false);
  const [office, setOffice] = useState('Loading office…');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nameSaving, setNameSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [nameResult, setNameResult] = useState<Result>(null);
  const [avatarResult, setAvatarResult] = useState<Result>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!nameDirty) setDisplayName(userProfile?.full_name ?? '');
  }, [nameDirty, userProfile?.full_name]);

  useEffect(() => {
    let active = true;
    if (!userProfile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      getProfileAvatarUrl(userProfile.avatar_path),
      fetchAllOrgs(),
    ])
      .then(([url, organizations]) => {
        if (!active) return;
        setAvatarUrl(url);
        const currentOffice = organizations.find((organization) => organization.id === userProfile.org_id)?.name;
        setOffice(currentOffice ?? userProfile.org_name ?? 'Not assigned');
      })
      .catch(() => {
        if (!active) return;
        setAvatarUrl(null);
        setOffice(userProfile.org_name ?? 'Unavailable');
        setAvatarResult({ tone: 'error', text: 'We could not load your private profile photo.' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userProfile?.avatar_path, userProfile?.id, userProfile?.org_id, userProfile?.org_name]);

  const saveName = async () => {
    const nextName = displayName.trim();
    if (!userProfile) return;
    if (!nextName) {
      setNameResult({ tone: 'error', text: 'Display name cannot be empty.' });
      return;
    }

    setNameSaving(true);
    setNameResult(null);
    try {
      const saved = await updateOwnProfile(userProfile.id, { full_name: nextName });
      updateUserProfile({ full_name: saved.full_name ?? nextName });
      setDisplayName(saved.full_name ?? nextName);
      setNameDirty(false);
      setNameResult({ tone: 'success', text: 'Display name saved across your account.' });
    } catch {
      setNameResult({ tone: 'error', text: 'We could not save your display name. Please try again.' });
    } finally {
      setNameSaving(false);
    }
  };

  const onChoosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !userProfile) return;

    setAvatarSaving(true);
    setAvatarResult(null);
    try {
      const saved = await replaceProfileAvatar(userProfile.id, file, userProfile.avatar_path);
      const savedPath = saved.avatar_path ?? null;
      const signedUrl = await getProfileAvatarUrl(savedPath);
      updateUserProfile({ avatar_path: savedPath });
      setAvatarUrl(signedUrl);
      setAvatarResult({ tone: 'success', text: 'Profile photo updated.' });
    } catch (error) {
      setAvatarResult({ tone: 'error', text: error instanceof Error ? error.message : 'We could not update your profile photo.' });
    } finally {
      setAvatarSaving(false);
    }
  };

  const removePhoto = async () => {
    if (!userProfile?.avatar_path) return;
    setAvatarSaving(true);
    setAvatarResult(null);
    try {
      await clearProfileAvatar(userProfile.id, userProfile.avatar_path);
      updateUserProfile({ avatar_path: null });
      setAvatarUrl(null);
      setAvatarResult({ tone: 'success', text: 'Profile photo removed. Your initials are now shown.' });
    } catch {
      setAvatarResult({ tone: 'error', text: 'We could not remove your profile photo. Please try again.' });
    } finally {
      setAvatarSaving(false);
    }
  };

  if (!userProfile || loading) {
    return <SettingsLoading label="Loading your personal profile…" />;
  }

  return (
    <div className="space-y-5">
      <Surface className="overflow-hidden">
        <div className="relative overflow-hidden bg-[#0c1c3d] px-5 pb-5 pt-6 sm:px-7 sm:pt-7">
          <div className="absolute -right-12 -top-16 size-56 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 size-36 rounded-full bg-cyan-300/10 blur-2xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/25 bg-gradient-to-br from-blue-400 to-indigo-600 text-[22px] font-semibold text-white shadow-xl shadow-blue-950/30">
                {avatarUrl ? <img src={avatarUrl} alt="Your profile" className="size-full object-cover" /> : initials(userProfile.full_name)}
                <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/15" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200">Personal workspace</p>
                <h2 className="mt-1 text-[20px] font-semibold text-white">{userProfile.full_name}</h2>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-blue-50">
                  <ShieldCheck size={12} /> {formatRole(userProfile.role)}
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-[11px] text-blue-100 backdrop-blur-sm">
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-blue-300">Account identity</span>
              <span className="mt-0.5 block truncate font-medium text-white">{userProfile.email}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 divide-y divide-neutral-100 px-5 py-1 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-7 dark:divide-slate-800">
          <IdentityItem icon={<Mail size={15} />} label="Email" value={userProfile.email} />
          <IdentityItem icon={<IdCard size={15} />} label="Employee ID" value={userProfile.employee_id || '—'} />
          <IdentityItem icon={<Building2 size={15} />} label="Office / section" value={office} />
        </div>
      </Surface>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.78fr)]">
        <Surface className="p-5 sm:p-6">
          <SectionHeading icon={<UserRound size={19} />} eyebrow="Profile" title="How your name appears" description="Use a clear display name for assignments, messages, and activity." />
          <div className="mt-5 max-w-xl">
            <label htmlFor="display-name" className="mb-2 block text-[12px] font-medium text-neutral-700 dark:text-slate-200">Display name</label>
            <Input id="display-name" value={displayName} onChange={(event) => { setDisplayName(event.target.value); setNameDirty(true); }} className={inputClass} maxLength={100} />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" onClick={saveName} disabled={nameSaving || !displayName.trim()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-[12px] font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                {nameSaving ? 'Saving…' : <><Check size={15} /> Save name</>}
              </button>
              {nameDirty && !nameSaving && <span className="text-[11px] text-amber-600 dark:text-amber-400">Unsaved changes</span>}
            </div>
            <ResultMessage result={nameResult} />
          </div>
        </Surface>

        <Surface className="p-5 sm:p-6">
          <SectionHeading icon={<Camera size={19} />} eyebrow="Profile photo" title="A recognizable account" description="JPEG, PNG, or WebP. Up to 2 MB. Your photo stays private." />
          <div className="mt-5 flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-600 text-[17px] font-semibold text-white dark:from-slate-700 dark:to-slate-900">
              {avatarUrl ? <img src={avatarUrl} alt="Current profile" className="size-full object-cover" /> : initials(userProfile.full_name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => fileInput.current?.click()} disabled={avatarSaving} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[11px] font-semibold text-neutral-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-blue-500/10">
                  {avatarSaving ? 'Working…' : <><Upload size={14} /> {userProfile.avatar_path ? 'Replace' : 'Upload'}</>}
                </button>
                {userProfile.avatar_path && <button type="button" onClick={removePhoto} disabled={avatarSaving} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"><Trash2 size={14} /> Remove</button>}
              </div>
              <p className="mt-2 text-[10px] leading-4 text-neutral-500 dark:text-slate-400">A signed link is generated only for your active session.</p>
            </div>
          </div>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onChoosePhoto} />
          <ResultMessage result={avatarResult} />
        </Surface>
      </div>
    </div>
  );
}

function IdentityItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 py-3.5 sm:px-4 first:pl-0 last:pr-0">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-slate-900 dark:text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-neutral-400 dark:text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-[12px] font-medium text-neutral-800 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}

function AppearanceSettingsPage() {
  const { theme, loading, error: preferenceError, setTheme } = useUserPreferences();
  const [pendingTheme, setPendingTheme] = useState<ThemePreference | null>(null);
  const [result, setResult] = useState<Result>(null);
  const options: Array<{ value: ThemePreference; title: string; description: string; icon: ReactNode; tint: string }> = [
    { value: 'system', title: 'System', description: 'Follow your device setting.', icon: <Laptop size={19} />, tint: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
    { value: 'light', title: 'Light', description: 'A clear, focused workspace.', icon: <Sun size={19} />, tint: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300' },
    { value: 'dark', title: 'Dark', description: 'A quieter interface for late work.', icon: <Moon size={19} />, tint: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300' },
  ];

  const chooseTheme = async (nextTheme: ThemePreference) => {
    if (nextTheme === theme || pendingTheme) return;
    setPendingTheme(nextTheme);
    setResult(null);
    try {
      await setTheme(nextTheme);
      setResult({ tone: 'success', text: `${nextTheme[0].toUpperCase()}${nextTheme.slice(1)} appearance saved.` });
    } catch {
      setResult({ tone: 'error', text: 'We could not save your appearance. Your previous theme has been restored.' });
    } finally {
      setPendingTheme(null);
    }
  };

  if (loading) return <SettingsLoading label="Loading appearance preference…" />;

  return (
    <div className="max-w-3xl space-y-5">
      <Surface className="p-5 sm:p-6">
        <SectionHeading icon={<Palette size={19} />} eyebrow="Appearance" title="Set the tone for your workspace" description="Choose one appearance. System automatically tracks your device’s light or dark mode." />
        <div role="radiogroup" aria-label="Appearance preference" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {options.map((option) => {
            const selected = theme === option.value || pendingTheme === option.value;
            return (
              <button key={option.value} type="button" role="radio" aria-checked={selected} onClick={() => chooseTheme(option.value)} disabled={Boolean(pendingTheme)} className={`group relative min-h-36 rounded-2xl border p-4 text-left transition ${selected ? 'border-blue-500 bg-blue-50/70 shadow-sm dark:border-blue-400 dark:bg-blue-500/10' : 'border-neutral-200 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-600'} disabled:cursor-not-allowed`}>
                <span className={`flex size-9 items-center justify-center rounded-xl ${option.tint}`}>{option.icon}</span>
                <span className="mt-4 block text-[13px] font-semibold text-neutral-900 dark:text-slate-100">{option.title}</span>
                <span className="mt-1 block text-[11px] leading-4 text-neutral-500 dark:text-slate-400">{option.description}</span>
                <span className={`absolute right-3 top-3 flex size-4 items-center justify-center rounded-full border ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-neutral-300 bg-white dark:border-slate-600 dark:bg-slate-900'}`}>{selected && <Check size={11} strokeWidth={3} />}</span>
              </button>
            );
          })}
        </div>
        <ResultMessage result={result ?? (preferenceError ? { tone: 'error', text: preferenceError } : null)} />
      </Surface>

      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3.5 text-[12px] text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/25 dark:text-blue-200">
        <Laptop size={17} className="mt-0.5 shrink-0" />
        <p><span className="font-semibold">System is the default.</span> It only listens for device changes while System is selected; Light and Dark stay exactly as you set them.</p>
      </div>
    </div>
  );
}

function NotificationSettingsPage() {
  const { userProfile, updateUserProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const enabled = userProfile?.email_notifications_enabled ?? true;

  const toggleEmail = async (nextEnabled: boolean) => {
    if (!userProfile) return;
    setSaving(true);
    setResult(null);
    try {
      const saved = await updateEmailPreference(userProfile.id, nextEnabled);
      updateUserProfile({ email_notifications_enabled: saved.email_notifications_enabled ?? nextEnabled });
      setResult({ tone: 'success', text: nextEnabled ? 'Task email notifications are on.' : 'Task email notifications are off.' });
    } catch {
      setResult({ tone: 'error', text: 'We could not update email notifications. Your previous setting is unchanged.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <Surface className="overflow-hidden">
        <div className="border-b border-neutral-100 bg-gradient-to-r from-blue-50 to-cyan-50 px-5 py-5 dark:border-slate-800 dark:from-blue-950/35 dark:to-cyan-950/20 sm:px-6">
          <SectionHeading icon={<Bell size={19} />} eyebrow="Notifications" title="Keep task work moving" description="Choose whether eFlow may email you about tasks that need your attention." />
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ${enabled ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300' : 'bg-neutral-100 text-neutral-400 dark:bg-slate-900 dark:text-slate-500'}`}><Mail size={18} /></span>
              <div>
                <h3 className="text-[13px] font-semibold text-neutral-900 dark:text-slate-100">Task email notifications</h3>
                <p className="mt-1 max-w-lg text-[12px] leading-5 text-neutral-500 dark:text-slate-400">Receive email when work is assigned to you, updated, or needs your review. In-app notifications remain available either way.</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
              <span className={`text-[11px] font-semibold ${enabled ? 'text-blue-700 dark:text-blue-300' : 'text-neutral-500 dark:text-slate-400'}`}>{saving ? 'Saving…' : enabled ? 'On' : 'Off'}</span>
              <Switch checked={enabled} onCheckedChange={toggleEmail} disabled={saving} aria-label="Task email notifications" className="data-[state=checked]:bg-blue-600" />
            </div>
          </div>
          <ResultMessage result={result} />
        </div>
      </Surface>
    </div>
  );
}

function SecuritySettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Result>(null);

  const clearPasswords = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmation('');
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setResult(null);

    if (!currentPassword) {
      clearPasswords();
      setResult({ tone: 'error', text: 'Enter your current password to continue.' });
      return;
    }
    if (newPassword.length < 8) {
      clearPasswords();
      setResult({ tone: 'error', text: 'Your new password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmation) {
      clearPasswords();
      setResult({ tone: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    if (!user?.email) {
      clearPasswords();
      setResult({ tone: 'error', text: 'Your session has expired. Please sign in again.' });
      return;
    }

    setSaving(true);
    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthError) throw new Error('Your current password could not be verified.');

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setResult({ tone: 'success', text: 'Password changed. Use your new password next time you sign in.' });
    } catch (error) {
      const message = error instanceof Error && error.message && error.message !== 'Your current password could not be verified.'
        ? error.message
        : 'Your current password could not be verified, or your session has expired.';
      setResult({ tone: 'error', text: message });
    } finally {
      clearPasswords();
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <Surface className="p-5 sm:p-6">
        <SectionHeading icon={<LockKeyhole size={19} />} eyebrow="Security" title="Change your password" description="For your protection, confirm your current password before choosing a new one." />
        <form onSubmit={changePassword} className="mt-6 max-w-xl space-y-4">
          <div>
            <label htmlFor="current-password" className="mb-2 block text-[12px] font-medium text-neutral-700 dark:text-slate-200">Current password</label>
            <Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClass} disabled={saving} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="new-password" className="mb-2 block text-[12px] font-medium text-neutral-700 dark:text-slate-200">New password</label>
              <Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={inputClass} disabled={saving} />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-[12px] font-medium text-neutral-700 dark:text-slate-200">Confirm new password</label>
              <Input id="confirm-password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={inputClass} disabled={saving} />
            </div>
          </div>
          <p className="text-[11px] leading-5 text-neutral-500 dark:text-slate-400">Use at least 8 characters. Any additional password policy configured for your account will be checked before saving.</p>
          <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-neutral-900 px-4 text-[12px] font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500">
            <KeyRound size={15} /> {saving ? 'Updating password…' : 'Update password'}
          </button>
          <ResultMessage result={result} />
        </form>
      </Surface>
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-[12px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200">
        <ShieldCheck size={17} className="mt-0.5 shrink-0" />
        <p>Your password is never stored in eFlow profile data and is cleared from this form after every submission.</p>
      </div>
    </div>
  );
}

function SettingsLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-72 items-center justify-center">
      <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[12px] text-neutral-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        <span className="size-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
        {label}
      </div>
    </div>
  );
}

export function SettingsContent({ activePage }: { activePage?: string }) {
  const selectedPage = ['Profile', 'Appearance', 'Notifications', 'Security'].includes(activePage ?? '') ? activePage : 'Profile';
  const page: Record<string, ReactNode> = {
    Profile: <ProfileSettingsPage />,
    Appearance: <AppearanceSettingsPage />,
    Notifications: <NotificationSettingsPage />,
    Security: <SecuritySettingsPage />,
  };

  return (
    <div className="min-h-full bg-[#f7f8fc] px-5 py-6 dark:bg-[#0b1120] sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400"><Palette size={13} /> Personal settings</div>
            <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-neutral-900 dark:text-slate-100">{selectedPage}</h1>
          </div>
          <div className="hidden items-center gap-1 text-[11px] text-neutral-400 sm:flex"><span>Account</span><ChevronRight size={13} /><span className="font-medium text-neutral-600 dark:text-slate-300">{selectedPage}</span></div>
        </div>
        {page[selectedPage]}
      </div>
    </div>
  );
}

export default SettingsContent;
