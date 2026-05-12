import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User,
} from "firebase/auth";
import { ref, onValue, set, get, update } from "firebase/database";
import { auth, database } from "../../firebase";
import type { UserProfile, UserRole } from "../types";

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
    departmentId?: string
  ) => Promise<void>;
  /** Create a user on behalf of admin — re-authenticates admin after */
  createManagedUser: (
    adminEmail: string,
    adminPassword: string,
    newEmail: string,
    newPassword: string,
    profile: Omit<UserProfile, "uid" | "createdAt" | "lastLogin">
  ) => Promise<string>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser((prevUser) => {
        if (prevUser?.uid === "bypass-admin-uid") return prevUser;
        return firebaseUser;
      });
      if (!firebaseUser) {
        setUserProfile((prevProfile) => {
          if (prevProfile?.uid === "bypass-admin-uid") return prevProfile;
          return null;
        });
        setLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  // When user changes, subscribe to their /users/{uid} profile
  useEffect(() => {
    if (!user) return;

    if (user.uid === "bypass-admin-uid") {
      setLoading(false);
      return;
    }

    const profileRef = ref(database, `users/${user.uid}`);
    const unsub = onValue(
      profileRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          setUserProfile({
            uid: user.uid,
            employeeId: val.employeeId || "",
            fullName: val.fullName || val.name || "",
            email: val.email || "",
            role: val.role || "employee",
            departmentId: val.departmentId || val.department || "",
            skills: val.skills || {},
            workload: typeof val.workload === "number" ? val.workload : 0,
            burnoutLevel: val.burnoutLevel || "low",
            status: val.status || "active",
            createdAt: val.createdAt || 0,
            lastLogin: val.lastLogin || 0,
          });
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Failed to read user profile:", err);
        setError("Failed to load user profile. Please try again.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      // ─── HARDCODED BYPASS FOR TESTING ───
      if ((email === "admin" || email === "admin@gmail.com" || email === "admin@eflow.gov.ph") && password === "admin123") {
        const mockProfile: UserProfile = {
          uid: "bypass-admin-uid",
          employeeId: "ADMIN-000",
          fullName: "Super Admin",
          email: "admin@gmail.com",
          role: "super_admin",
          departmentId: "",
          skills: {},
          workload: 0,
          burnoutLevel: "low",
          status: "active",
          createdAt: Date.now(),
          lastLogin: Date.now(),
        };
        setUser({ uid: "bypass-admin-uid", email: "admin@gmail.com" } as User);
        setUserProfile(mockProfile);
        setLoading(false);
        return;
      }
      // ─────────────────────────────────────

      const cred = await signInWithEmailAndPassword(auth, email, password);

      // Verify the user has a profile
      const profileSnap = await get(ref(database, `users/${cred.user.uid}`));
      if (!profileSnap.exists()) {
        await signOut(auth);
        throw new Error("No eFlow profile found for this account. Contact your IT administrator.");
      }

      const profile = profileSnap.val();
      if (profile.status === "inactive") {
        await signOut(auth);
        throw new Error("Your account has been deactivated. Contact your IT administrator.");
      }

      // Update lastLogin
      await update(ref(database, `users/${cred.user.uid}`), { lastLogin: Date.now() });
    } catch (err: any) {
      const msg =
        err?.code === "auth/user-not-found" || err?.code === "auth/wrong-password"
          ? "Invalid email or password."
          : err?.code === "auth/invalid-credential"
            ? "Invalid email or password."
            : err?.code === "auth/too-many-requests"
              ? "Too many attempts. Please try again later."
              : err?.message || "Login failed.";
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
      departmentId = ""
    ) => {
      setError(null);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);

        const profileData: Omit<UserProfile, "uid"> = {
          employeeId: "",
          fullName,
          email,
          role,
          departmentId,
          skills: {},
          workload: 0,
          burnoutLevel: "low",
          status: "active",
          createdAt: Date.now(),
          lastLogin: Date.now(),
        };

        await set(ref(database, `users/${cred.user.uid}`), profileData);
      } catch (err: any) {
        const msg =
          err?.code === "auth/email-already-in-use"
            ? "An account with this email already exists."
            : err?.code === "auth/weak-password"
              ? "Password must be at least 6 characters."
              : err?.message || "Registration failed.";
        setError(msg);
        throw err;
      }
    },
    []
  );

  const createManagedUser = useCallback(
    async (
      adminEmail: string,
      adminPassword: string,
      newEmail: string,
      newPassword: string,
      profile: Omit<UserProfile, "uid" | "createdAt" | "lastLogin">
    ): Promise<string> => {
      setError(null);
      try {
        // Create the new user (this signs us in as that user)
        const cred = await createUserWithEmailAndPassword(auth, newEmail, newPassword);
        const newUid = cred.user.uid;

        // Write their profile
        const profileData = {
          ...profile,
          createdAt: Date.now(),
          lastLogin: 0,
        };
        await set(ref(database, `users/${newUid}`), profileData);

        // Re-authenticate as admin
        if ((adminEmail === "admin" || adminEmail === "admin@gmail.com" || adminEmail === "admin@eflow.gov.ph") && adminPassword === "admin123") {
          await signOut(auth);
        } else {
          await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        }

        return newUid;
      } catch (err: any) {
        // Try to re-authenticate admin even on error
        try {
          if ((adminEmail === "admin" || adminEmail === "admin@gmail.com" || adminEmail === "admin@eflow.gov.ph") && adminPassword === "admin123") {
            await signOut(auth);
          } else {
            await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
          }
        } catch {
          // Best effort
        }
        const msg =
          err?.code === "auth/email-already-in-use"
            ? "An account with this email already exists."
            : err?.code === "auth/weak-password"
              ? "Password must be at least 6 characters."
              : err?.message || "Failed to create user.";
        setError(msg);
        throw err;
      }
    },
    []
  );

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setError(err?.message || "Failed to send password reset email.");
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setUser((prevUser) => {
        if (prevUser?.uid === "bypass-admin-uid") return null;
        return prevUser;
      });
      setUserProfile((prevProfile) => {
        if (prevProfile?.uid === "bypass-admin-uid") return null;
        return prevProfile;
      });
      await signOut(auth);
    } catch (err: any) {
      setError("Failed to sign out. Please try again.");
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
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

// Re-export types for convenience
export type { UserProfile, UserRole };
