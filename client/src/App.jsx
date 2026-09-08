import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import AmbientBg from "./components/AmbientBg.jsx";
import { DashboardProvider, useDashboard } from "./hooks/useDashboard.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import TeamPage from "./pages/TeamPage.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import Analytics from "./pages/Analytics.jsx";
import Reports from "./pages/Reports.jsx";
import Targets from "./pages/Targets.jsx";
import Alerts from "./pages/Alerts.jsx";
import Settings from "./pages/Settings.jsx";

const ease = [0.22, 1, 0.36, 1];

function Shell() {
  const { data, loading, error } = useDashboard();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="boot-screen">
        <div className="boot-glow" />
        <div className="boot-logo">S4S</div>
        <p>Loading Salary 4 Sure…</p>
        <div className="boot-bar">
          <span />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="boot-screen">
        <div className="boot-logo">S4S</div>
        <p>API se data nahi mila. Node server start karein (`npm run dev`).</p>
      </div>
    );
  }

  return (
    <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
      <AmbientBg />
      <Sidebar collapsed={collapsed} mission={data.sidebarMission} />
      <div className="app-main">
        <Header
          user={data.currentUser}
          people={data.headerUsers}
          onMenu={() => setCollapsed((v) => !v)}
        />
        <div className="app-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
              transition={{ duration: 0.45, ease }}
            >
              <Routes location={location}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/fresh" element={<TeamPage kind="fresh" />} />
                <Route path="/repeat" element={<TeamPage kind="repeat" />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/targets" element={<Targets />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DashboardProvider>
      <Shell />
    </DashboardProvider>
  );
}
