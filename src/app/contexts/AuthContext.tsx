import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { fetchProfileById } from '../../lib/supabaseService';
import type { UserProfile, SupabaseUserProfile, UserRole } from '../types';

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
    adminEmail: string,
    adminPassword: string,
    newEmail: string,
    newPassword: string,
    profile: Omit<UserProfile, 'uid' | 'createdAt' | 'lastLogin'>,
  ) => Promise<string>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Convert Supabase profile to legacy UserProfile format ───────
function toUserProfile(sp: SupabaseUserProfile): UserProfile {
  return {
    uid: sp.id,
    employeeId: sp.employee_id,
    fullName: sp.full_name,
    email: sp.email,
    role: sp.role,
    departmentId: sp.org_id || '',
    skills: sp.skills,
    workload: sp.workload,
    burnoutLevel: sp.burnout_level,
    status: sp.is_active ? 'active' : 'inactive',
    createdAt: new Date(sp.created_at).getTime(),
    lastLogin: new Date(sp.updated_at).getTime(),
  };
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
        const currentUser = session?.user || null;
        setUser((prevUser) => {
          if (prevUser?.id === 'SuperAdmin' && !currentUser) return prevUser;
          return currentUser;
        });

        if (currentUser) {
          try {
            const sp = await fetchProfileById(currentUser.id);
            if (sp) {
              setUserProfile(toUserProfile(sp));
            } else {
              setUserProfile(null);
            }
          } catch {
            setUserProfile(null);
          }
        } else {
          setUserProfile((prevProfile) => {
            if (prevProfile?.uid === 'SuperAdmin') return prevProfile;
            return null;
          });
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      // ─── HARDCODED BYPASS FOR TESTING ───
      if (
        (email === 'admin' ||
          email === 'admin@gmail.com' ||
          email === 'admin@eflow.gov.ph') &&
        password === 'admin123'
      ) {
        const mockProfile: UserProfile = {
          uid: 'SuperAdmin',
          employeeId: 'ADMIN-000',
          fullName: 'Super Admin',
          email: 'admin@gmail.com',
          role: 'super_admin',
          departmentId: '',
          skills: {},
          workload: 0,
          burnoutLevel: 'low',
          status: 'active',
          createdAt: Date.now(),
          lastLogin: Date.now(),
        };
        setUser({ id: 'SuperAdmin', email: 'admin@gmail.com' } as User);
        setUserProfile(mockProfile);
        setLoading(false);
        return;
      }
      // ─────────────────────────────────────

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        const sp = await fetchProfileById(data.user.id);
        if (!sp) {
          await supabase.auth.signOut();
          throw new Error('No eFlow profile found for this account. Contact your IT administrator.');
        }
        if (!sp.is_active) {
          await supabase.auth.signOut();
          throw new Error('Your account has been deactivated. Contact your IT administrator.');
        }
      }
    } catch (err: any) {
      const msg =
        err?.message === 'Invalid login credentials'
          ? 'Invalid email or password.'
          : err?.message || 'Login failed.';
      setError(msg);
      throw err;
    }
  }, []);

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

        if (authError) throw authError;

        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              full_name: fullName,
              email,
              employee_id: '',
              org_id: orgId || null,
              role,
              skills: {},
              workload: 0,
              burnout_level: 'low',
              is_active: true,
            });

          if (profileError) throw profileError;
        }
      } catch (err: any) {
        const msg =
          err?.code === 'user_already_exists' || err?.message?.includes('already')
            ? 'An account with this email already exists.'
            : err?.message || 'Registration failed.';
        setError(msg);
        throw err;
      }
    },
    [],
  );

  const createManagedUser = useCallback(
    async (
      adminEmail: string,
      adminPassword: string,
      newEmail: string,
      newPassword: string,
      profile: Omit<UserProfile, 'uid' | 'createdAt' | 'lastLogin'>,
    ): Promise<string> => {
      setError(null);
      try {
        const { data, error: authError } = await supabase.auth.signUp({
          email: newEmail,
          password: newPassword,
        });

        if (authError) throw authError;
        if (!data.user) throw new Error('Failed to create user');

        const newUid = data.user.id;

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: newUid,
            full_name: profile.fullName,
            email: profile.email,
            employee_id: profile.employeeId || '',
            org_id: profile.departmentId || null,
            role: profile.role,
            skills: profile.skills || {},
            workload: profile.workload || 0,
            burnout_level: profile.burnoutLevel || 'low',
            is_active: profile.status !== 'inactive',
          });

        if (profileError) throw profileError;

        // Re-authenticate as admin
        if (
          (adminEmail === 'admin' ||
            adminEmail === 'admin@gmail.com' ||
            adminEmail === 'admin@eflow.gov.ph') &&
          adminPassword === 'admin123'
        ) {
          await supabase.auth.signOut();
        } else {
          await supabase.auth.signInWithPassword({
            email: adminEmail,
            password: adminPassword,
          });
        }

        return newUid;
      } catch (err: any) {
        try {
          if (
            (adminEmail === 'admin' ||
              adminEmail === 'admin@gmail.com' ||
              adminEmail === 'admin@eflow.gov.ph') &&
            adminPassword === 'admin123'
          ) {
            await supabase.auth.signOut();
          } else {
            await supabase.auth.signInWithPassword({
              email: adminEmail,
              password: adminPassword,
            });
          }
        } catch {
          // Best effort
        }
        const msg =
          err?.code === 'user_already_exists' || err?.message?.includes('already')
            ? 'An account with this email already exists.'
            : err?.message || 'Failed to create user.';
        setError(msg);
        throw err;
      }
    },
    [],
  );

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch (err: any) {
      setError(err?.message || 'Failed to send password reset email.');
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setUser((prevUser) => {
        if (prevUser?.id === 'SuperAdmin') return null;
        return prevUser;
      });
      setUserProfile((prevProfile) => {
        if (prevProfile?.uid === 'SuperAdmin') return null;
        return prevProfile;
      });
      await supabase.auth.signOut();
    } catch (err: any) {
      setError('Failed to sign out. Please try again.');
    }
  }, []);

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
