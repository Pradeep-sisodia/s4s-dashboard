import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import AmbientBg from "./components/AmbientBg.jsx";
import { AuthProvider, useAuth } from "./hooks/useAuth.jsx";
import { DashboardProvider, useDashboard } from "./hooks/useDashboard.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import TeamPage from "./pages/TeamPage.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import Analytics from "./pages/Analytics.jsx";
import Reports from "./pages/Reports.jsx";
import Targets from "./pages/Targets.jsx";
import Alerts from "./pages/Alerts.jsx";
import Settings from "./pages/Settings.jsx";
import UsersAccess from "./pages/UsersAccess.jsx";
import Login from "./pages/Login.jsx";

const ease = [0.22, 1, 0.36, 1];

function RequireAuth({ children }) {
  const { isAuthenticated, booting, firstAllowedPath } = useAuth();
  const location = useLocation();
  if (booting) {
    return (
      <div className="boot-screen">
        <div className="boot-logo">S4S</div>
        <p>Loading…</p>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function RequireBucket({ bucket, children }) {
  const { canAccess, firstAllowedPath } = useAuth();
  if (!canAccess(bucket)) return <Navigate to={firstAllowedPath} replace />;
  return children;
}

function Shell() {
  const { data, loading, error } = useDashboard();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  // Only full-screen boot on first load — date filter must not unmount the page
  if (loading && !data) {
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

  if ((error && !data) || (!loading && !data)) {
    return (
      <div className="boot-screen">
        <div className="boot-logo">S4S</div>
        <p>{error || "API se data nahi mila."}</p>
        <button className="date-apply" type="button" onClick={logout}>
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
      <AmbientBg />
      <Sidebar
        collapsed={collapsed}
        mission={data.sidebarMission}
        buckets={user?.buckets || []}
        isAdmin={user?.isAdmin}
      />
      <div className="app-main">
        <Header
          user={data.currentUser}
          asOnDate={data.meta?.toDate || data.meta?.fromDate}
          onMenu={() => setCollapsed((v) => !v)}
          onLogout={logout}
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
                <Route
                  path="/"
                  element={
                    <RequireBucket bucket="dashboard">
                      <Dashboard />
                    </RequireBucket>
                  }
                />
                <Route
                  path="/fresh"
                  element={
                    <RequireBucket bucket="fresh">
                      <TeamPage kind="fresh" />
                    </RequireBucket>
                  }
                />
                <Route
                  path="/repeat"
                  element={
                    <RequireBucket bucket="repeat">
                      <TeamPage kind="repeat" />
                    </RequireBucket>
                  }
                />
                <Route
                  path="/leaderboard"
                  element={
                    <RequireBucket bucket="leaderboard">
                      <Leaderboard />
                    </RequireBucket>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <RequireBucket bucket="analytics">
                      <Analytics />
                    </RequireBucket>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <RequireBucket bucket="reports">
                      <Reports />
                    </RequireBucket>
                  }
                />
                <Route
                  path="/targets"
                  element={
                    <RequireBucket bucket="targets">
                      <Targets />
                    </RequireBucket>
                  }
                />
                <Route
                  path="/alerts"
                  element={
                    <RequireBucket bucket="alerts">
                      <Alerts />
                    </RequireBucket>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <RequireBucket bucket="settings">
                      <Settings />
                    </RequireBucket>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <RequireBucket bucket="users">
                      <UsersAccess />
                    </RequireBucket>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function AuthedApp() {
  const { isAuthenticated, booting } = useAuth();
  if (booting) {
    return (
      <div className="boot-screen">
        <div className="boot-logo">S4S</div>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            {isAuthenticated ? (
              <DashboardProvider>
                <Shell />
              </DashboardProvider>
            ) : (
              <Navigate to="/login" replace />
            )}
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthedApp />
    </AuthProvider>
  );
}
