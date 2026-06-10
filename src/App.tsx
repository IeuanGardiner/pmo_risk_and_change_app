import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
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
import { T } from "./theme/tokens";

function Shell() {
  const { loading, error, refresh } = useAppData();

  if (loading || error) {
    return <Landing error={error} onRetry={() => void refresh()} />;
  }

  return (
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
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppDataProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </AppDataProvider>
  );
}
