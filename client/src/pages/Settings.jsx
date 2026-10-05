import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth.jsx";
import { useDashboard } from "../hooks/useDashboard.jsx";
import TargetEditor from "../components/TargetEditor.jsx";

export default function Settings() {
  const { data } = useDashboard();
  const { user, logout } = useAuth();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-head">
        <h1>SETTINGS</h1>
      </div>
      <section className="table-card pad">
        <h3>Logged in as</h3>
        <p>
          <strong>{user?.name || data.currentUser?.name}</strong>
          <br />
          {user?.role || data.currentUser?.role} · {user?.email || data.currentUser?.email}
        </p>
        <p className="muted-note">
          Buckets: {(user?.buckets || []).join(", ") || "—"}
        </p>
        <button type="button" className="date-apply" onClick={logout}>
          Logout
        </button>
      </section>

      <section className="settings-targets">
        <TargetEditor title="Change anyone's target" showMission />
      </section>
    </motion.div>
  );
}
