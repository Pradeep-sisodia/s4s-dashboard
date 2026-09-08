import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Repeat,
  Trophy,
  BarChart3,
  FileText,
  Target,
  Bell,
  Settings
} from "lucide-react";
import CircularProgress from "./CircularProgress.jsx";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/fresh", label: "Fresh Team", icon: Users },
  { to: "/repeat", label: "Repeat Team", icon: Repeat },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/targets", label: "Targets", icon: Target },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings }
];

export default function Sidebar({ collapsed, mission }) {
  return (
    <aside className="sidebar">
      <div className="side-orbs" />
      <div className="brand">
        <motion.div className="brand-mark" whileHover={{ rotate: 8, scale: 1.06 }}>
          S4S
        </motion.div>
        {!collapsed && (
          <div>
            <div className="brand-name">S4S</div>
            <div className="brand-sub">SALARY 4 SURE</div>
          </div>
        )}
      </div>

      <nav className="side-nav">
        {links.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.4 }}
            >
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => `side-link ${isActive ? "active" : ""}`}
                title={item.label}
              >
                <Icon size={18} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      {!collapsed && mission && (
        <motion.div
          className="mission-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="mission-card-title">{mission.label}</div>
          <CircularProgress pct={mission.pct} />
          <div className="mission-card-meta">
            {mission.achievedLabel} / {mission.targetLabel}
          </div>
        </motion.div>
      )}
    </aside>
  );
}
