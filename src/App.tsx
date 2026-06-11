import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, RequirePermission, useAuth } from "./auth/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Sidebar } from "./components/layout/Sidebar";
import { ToastProvider } from "./components/Toast";
import { Landing } from "./pages/Landing";
import { RolesPage } from "./pages/admin/RolesPage";
import { UsersPage } from "./pages/admin/UsersPage";
import { SignInPage } from "./pages/auth/SignInPage";
import { ChangeDashboard } from "./pages/dashboard/ChangeDashboard";
import { RiskDashboard } from "./pages/dashboard/RiskDashboard";
import { ChangeDetail } from "./pages/changes/ChangeDetail";
import { AddChange, EditChange } from "./pages/changes/ChangeForm";
import { ChangeRegister } from "./pages/changes/ChangeRegister";
import { Reports } from "./pages/reports/Reports";
import { RiskDetail } from "./pages/risks/RiskDetail";
import { AddRisk, EditRisk } from "./pages/risks/RiskForm";
import { RiskRegister } from "./pages/risks/RiskRegister";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { AppDataProvider, useAppData } from "./store/AppData";
import { ThemeProvider } from "./theme/ThemeProvider";
import { T } from "./theme/tokens";
import type { Permission } from "./types/auth";

function Shell() {
  const { loading, error, refresh, config } = useAppData();
  const location = useLocation();

  if (loading || error) {
    return (
      <ThemeProvider branding={config.branding}>
        <Landing error={error} onRetry={() => void refresh()} />
      </ThemeProvider>
    );
  }

  /** Permission-gated route element. */
  const guarded = (permission: Permission, element: JSX.Element) => (
    <RequirePermission permission={permission}>{element}</RequirePermission>
  );

  return (
    <ThemeProvider branding={config.branding}>
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: T.font,
        background: T.bg,
        color: T.text,
        fontSize: 14,
      }}
    >
      <Sidebar />
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflow: "auto" }}>
          {/* Keyed by pathname so navigating away from a crashed view recovers. */}
          <ErrorBoundary key={location.pathname}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={guarded("risks:read", <RiskDashboard />)} />
              <Route path="/risks" element={guarded("risks:read", <RiskRegister />)} />
              <Route path="/risks/new" element={guarded("risks:create", <AddRisk />)} />
              <Route path="/risks/:ref" element={guarded("risks:read", <RiskDetail />)} />
              <Route path="/risks/:ref/edit" element={guarded("risks:update", <EditRisk />)} />
              <Route
                path="/changes/dashboard"
                element={guarded("changes:read", <ChangeDashboard />)}
              />
              <Route path="/changes" element={guarded("changes:read", <ChangeRegister />)} />
              <Route path="/changes/new" element={guarded("changes:create", <AddChange />)} />
              <Route path="/changes/:ref" element={guarded("changes:read", <ChangeDetail />)} />
              <Route
                path="/changes/:ref/edit"
                element={guarded("changes:update", <EditChange />)}
              />
              <Route path="/reports" element={guarded("reports:read", <Reports />)} />
              <Route path="/settings" element={guarded("settings:manage", <SettingsPage />)} />
              <Route path="/admin/users" element={guarded("users:manage", <UsersPage />)} />
              <Route path="/admin/roles" element={guarded("roles:manage", <RolesPage />)} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </div>
    </div>
    </ThemeProvider>
  );
}

/** Sign-in gate: data providers (and data fetching) only mount once a session
    exists, and unmount again on sign-out so no cached data leaks across users. */
function AuthGate() {
  const { initializing, session } = useAuth();

  if (initializing) {
    return <Landing error={null} onRetry={() => window.location.reload()} />;
  }
  if (!session) {
    return <SignInPage />;
  }
  return (
    <AppDataProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </AppDataProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
