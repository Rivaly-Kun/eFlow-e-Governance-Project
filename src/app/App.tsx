import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { UserPreferencesProvider, useUserPreferences } from "./contexts/UserPreferencesContext";
import { LoginPage } from "./components/Auth/LoginPage";
import { Frame760 } from "./components/Layout/SidebarDemo";
import { useEffect } from "react";
import { ToastProvider, useToast } from "./components/ui/Toast";

const QUICK_ACCOUNTS: Record<string, { email: string; pass: string; label: string }> = {
  "1": { email: "admin@gmail.com", pass: "admin123", label: "Super Admin (admin@gmail.com)" },
  "2": { email: "bplo.head@gmail.com", pass: "123456", label: "Dept Head (bplo.head@gmail.com)" },
  "3": { email: "tdfro.staff1@gmail.com", pass: "123456", label: "Employee (tdfro.staff1@gmail.com)" },
  "4": { email: "gabzcah@gmail.com", pass: "123456", label: "Gabriel (gabzcah@gmail.com)" },
};

function QuickLoginListener() {
  const { login, logout } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["1", "2", "3", "4"].includes(e.key)) {
        const acc = QUICK_ACCOUNTS[e.key];
        if (!acc) return;

        e.preventDefault();
        toast(`Quick switching to ${acc.label}…`, "info");

        try {
          await logout();
          await login(acc.email, acc.pass);
          toast(`Logged in as ${acc.label}`, "success");
        } catch (err: any) {
          toast(err?.message || `Failed to switch to ${acc.email}`, "error");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [login, logout, toast]);

  return null;
}

// ─── App wrapper with AuthProvider + ToastProvider ────────────────
function mapRoleToPanel(role: string): string {
  switch (role) {
    case 'super_admin':
      return 'superadmin';
    case 'dept_head':
    case 'department_head':
      return 'depthead';
    case 'team_leader':
    case 'teamleader':
      return 'teamleader';
    case 'employee':
      return 'employee';
    default:
      return 'employee';
  }
}

// ─── Loading skeleton ────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F5F6F8]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0085FF] to-[#0066CC] flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">
          <svg viewBox="0 0 40 40" className="w-9 h-9" fill="none">
            <path
              d="M20 4L6 12v10c0 8.5 6 14.5 14 18 8-3.5 14-9.5 14-18V12L20 4z"
              fill="white"
              fillOpacity="0.2"
              stroke="white"
              strokeWidth="1.5"
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
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-neutral-300 border-t-[#0085FF] rounded-full animate-spin" />
          <span className="text-[13px] font-['Lexend:Regular',_sans-serif] text-[#676879]">
            Loading eFlow...
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Auth-gated main content ─────────────────────────────────────
function AppContent() {
  const { user, userProfile, loading } = useAuth();
  const { loading: preferencesLoading } = useUserPreferences();

  // Still resolving auth state
  if (loading || (user && preferencesLoading)) return <LoadingSkeleton />;

  // Not authenticated → show login
  if (!user || !userProfile) return <LoginPage />;

  // Map role and render dashboard
  const panel = mapRoleToPanel(userProfile.role);

  return <Frame760 role={panel} />;
}

// ─── App wrapper with AuthProvider + ToastProvider ────────────────
export default function App() {
  return (
    <AuthProvider>
      <UserPreferencesProvider>
        <ToastProvider>
          <QuickLoginListener />
          <AppContent />
        </ToastProvider>
      </UserPreferencesProvider>
    </AuthProvider>
  );
}
