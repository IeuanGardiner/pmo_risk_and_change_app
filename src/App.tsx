import { lazy, Suspense, useRef } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, RequirePermission, useAuth } from "./auth/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageSkeleton } from "./components/PageSkeleton";
import { Sidebar } from "./components/layout/Sidebar";
import { ToastProvider } from "./components/Toast";
import { Landing } from "./pages/Landing";
import { SignInPage } from "./pages/auth/SignInPage";
import { AppDataProvider, useAppData } from "./store/AppData";
import { ThemeProvider } from "./theme/ThemeProvider";
import { T } from "./theme/tokens";
import type { Permission } from "./types/auth";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import type { GlobalSearchHandle } from "./components/GlobalSearch";

// Route-level code splitting — keeps the initial bundle lean. Each chunk is
// loaded on first navigation to that route and cached thereafter.
const RiskDashboard = lazy(() =>
  import("./pages/dashboard/RiskDashboard").then((m) => ({ default: m.RiskDashboard })),
);
const ChangeDashboard = lazy(() =>
  import("./pages/dashboard/ChangeDashboard").then((m) => ({ default: m.ChangeDashboard })),
);
const RiskRegister = lazy(() =>
  import("./pages/risks/RiskRegister").then((m) => ({ default: m.RiskRegister })),
);
const RiskDetail = lazy(() =>
  import("./pages/risks/RiskDetail").then((m) => ({ default: m.RiskDetail })),
);
const AddRisk = lazy(() =>
  import("./pages/risks/RiskForm").then((m) => ({ default: m.AddRisk })),
);
const EditRisk = lazy(() =>
  import("./pages/risks/RiskForm").then((m) => ({ default: m.EditRisk })),
);
const ChangeRegister = lazy(() =>
  import("./pages/changes/ChangeRegister").then((m) => ({ default: m.ChangeRegister })),
);
const ChangeDetail = lazy(() =>
  import("./pages/changes/ChangeDetail").then((m) => ({ default: m.ChangeDetail })),
);
const AddChange = lazy(() =>
  import("./pages/changes/ChangeForm").then((m) => ({ default: m.AddChange })),
);
const EditChange = lazy(() =>
  import("./pages/changes/ChangeForm").then((m) => ({ default: m.EditChange })),
);
const ProjectsPage = lazy(() =>
  import("./pages/admin/ProjectsPage").then((m) => ({ default: m.ProjectsPage })),
);
const Reports = lazy(() =>
  import("./pages/reports/Reports").then((m) => ({ default: m.Reports })),
);
const SettingsPage = lazy(() =>
  import("./pages/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const UsersPage = lazy(() =>
  import("./pages/admin/UsersPage").then((m) => ({ default: m.UsersPage })),
);
const RolesPage = lazy(() =>
  import("./pages/admin/RolesPage").then((m) => ({ default: m.RolesPage })),
);
const IssueRegister = lazy(() =>
  import("./pages/issues/IssueRegister").then((m) => ({ default: m.IssueRegister })),
);
const IssueDetail = lazy(() =>
  import("./pages/issues/IssueDetail").then((m) => ({ default: m.IssueDetail })),
);
const AddIssue = lazy(() =>
  import("./pages/issues/IssueForm").then((m) => ({ default: m.AddIssue })),
);
const EditIssue = lazy(() =>
  import("./pages/issues/IssueForm").then((m) => ({ default: m.EditIssue })),
);

function Shell() {
  const { loading, error, refresh, config } = useAppData();
  const location = useLocation();
  const searchRef = useRef<GlobalSearchHandle>(null);
  useGlobalShortcuts(searchRef);

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
      <Sidebar searchRef={searchRef} />
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflow: "auto" }}>
          {/* Keyed by pathname so navigating away from a crashed view recovers. */}
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<PageSkeleton />}>
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
              <Route path="/issues" element={guarded("risks:read", <IssueRegister />)} />
              <Route path="/issues/new" element={guarded("risks:update", <AddIssue />)} />
              <Route path="/issues/:ref" element={guarded("risks:read", <IssueDetail />)} />
              <Route path="/issues/:ref/edit" element={guarded("risks:update", <EditIssue />)} />
              <Route path="/projects" element={guarded("projects:manage", <ProjectsPage />)} />
              <Route path="/reports" element={guarded("reports:read", <Reports />)} />
              <Route path="/settings" element={guarded("settings:manage", <SettingsPage />)} />
              <Route path="/admin/users" element={guarded("users:manage", <UsersPage />)} />
              <Route path="/admin/roles" element={guarded("roles:manage", <RolesPage />)} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            </Suspense>
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
