import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Sidebar } from "./components/layout/Sidebar";
import { ToastProvider } from "./components/Toast";
import { Landing } from "./pages/Landing";
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
              <Route path="/dashboard" element={<RiskDashboard />} />
              <Route path="/risks" element={<RiskRegister />} />
              <Route path="/risks/new" element={<AddRisk />} />
              <Route path="/risks/:ref" element={<RiskDetail />} />
              <Route path="/risks/:ref/edit" element={<EditRisk />} />
              <Route path="/changes/dashboard" element={<ChangeDashboard />} />
              <Route path="/changes" element={<ChangeRegister />} />
              <Route path="/changes/new" element={<AddChange />} />
              <Route path="/changes/:ref" element={<ChangeDetail />} />
              <Route path="/changes/:ref/edit" element={<EditChange />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </div>
    </div>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppDataProvider>
          <HashRouter>
            <Shell />
          </HashRouter>
        </AppDataProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
