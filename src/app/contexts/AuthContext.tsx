import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import type { UserProfile, UserRole } from '../types';

// ─── Error message mapper ────────────────────────────────────────
function mapSupabaseAuthError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Invalid email or password.';
  if (msg.includes('Email not confirmed')) return 'Email not confirmed. Contact your administrator.';
  if (msg.includes('Too many requests')) return 'Too many attempts. Please try again later.';
  if (msg.includes('User already registered')) return 'An account with this email already exists.';
  if (msg.includes('Password should be')) return 'Password must be at least 6 characters.';
  return msg;
}

// ─── Context Value ───────────────────────────────────────────────
interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    orgId?: string,
  ) => Promise<void>;
  createManagedUser: (
    newEmail: string,
    newPassword: string,
    profile: { full_name: string; role: UserRole; org_id?: string; employee_id?: string; skills?: Record<string, boolean> },
  ) => Promise<string>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Fetch auth key from LLM server ─────────────────────────────
const API_BASE = (import.meta.env.VITE_LLM_BASE_URL || '/api').replace(/\/$/, '');

async function fetchAuthKey(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/authkey`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.api_key === 'string' ? data.api_key.trim() : null;
  } catch {
    return null;
  }
}

// ─── Spread legacy compatibility aliases ─────────────────────────
function addCompatAliases(data: Record<string, unknown>): UserProfile {
  return {
    ...data,
    uid: data.id,
    fullName: data.full_name,
    employeeId: data.employee_id,
    departmentId: data.org_id,
    burnoutLevel: data.burnout_level,
    status: data.is_active ? 'active' : 'inactive',
    createdAt: typeof data.created_at === 'string' ? new Date(data.created_at).getTime() : 0,
    lastLogin: typeof data.updated_at === 'string' ? new Date(data.updated_at).getTime() : 0,
  } as unknown as UserProfile;
}

// ─── Provider ────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen to Supabase Auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (data) {
            setUserProfile(addCompatAliases(data));
          } else {
            setUserProfile(null);
          }
        } else {
          setUser(null);
          setUserProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ─── login ─────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {


      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw new Error(mapSupabaseAuthError(authError.message));

      // Verify profile exists and is active
      const { data: sessionData } = await supabase.auth.getUser();
      const userId = sessionData.user?.id;
      if (!userId) throw new Error('Login failed. Please try again.');

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('id', userId)
        .single();

      if (!profile) {
        await supabase.auth.signOut();
        throw new Error('No eFlow profile found. Contact your IT administrator.');
      }
      if (!profile.is_active) {
        await supabase.auth.signOut();
        throw new Error('Your account has been deactivated. Contact your IT administrator.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Login failed.';
      setError(msg);
      throw err;
    }
  }, []);

  // ─── register (first-time setup only) ──────────────────────────
  const register = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      role: UserRole,
      orgId = '',
    ) => {
      setError(null);
      try {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw new Error(mapSupabaseAuthError(authError.message));
        if (!data.user) throw new Error('Registration failed.');

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            full_name: fullName,
            email,
            role,
            org_id: orgId || null,
            employee_id: '',
            skills: {},
            workload: 0,
            burnout_level: 'low',
            is_active: true,
          });

        if (profileError) throw profileError;
      } catch (err: any) {
        setError(err?.message || 'Registration failed.');
        throw err;
      }
    },
    [],
  );

  // ─── createManagedUser (calls FastAPI server) ──────────────────
  const createManagedUser = useCallback(
    async (
      newEmail: string,
      newPassword: string,
      profileData: { full_name: string; role: UserRole; org_id?: string; employee_id?: string; skills?: Record<string, boolean> },
    ): Promise<string> => {
      setError(null);
      try {
        const apiKey = await fetchAuthKey();

        const res = await fetch(`${API_BASE}/admin/users/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({
            email: newEmail,
            password: newPassword,
            full_name: profileData.full_name,
            role: profileData.role,
            org_id: profileData.org_id || null,
            employee_id: profileData.employee_id || '',
            skills: profileData.skills || {},
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || 'Failed to create user.');
        }

        const { uid } = await res.json();
        return uid;
      } catch (err: any) {
        const msg = err?.message || 'Failed to create user.';
        setError(msg);
        throw err;
      }
    },
    [],
  );

  // ─── resetPassword ─────────────────────────────────────────────
  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err?.message || 'Failed to send password reset email.');
      throw err;
    }
  }, []);

  // ─── logout ────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      if (userProfile?.id === 'SuperAdmin') {
        setUser(null);
        setUserProfile(null);
        return;
      }
      await supabase.auth.signOut();
    } catch (err: any) {
      setError('Failed to sign out. Please try again.');
    }
  }, [userProfile]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        error,
        login,
        register,
        createManagedUser,
        resetPassword,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

// Re-export types for convenience
export type { UserProfile, UserRole };
