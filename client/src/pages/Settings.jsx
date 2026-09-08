import { motion } from "framer-motion";
import { useDashboard } from "../hooks/useDashboard.jsx";

export default function Settings() {
  const { data } = useDashboard();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-head">
        <h1>SETTINGS</h1>
      </div>
      <section className="table-card pad">
        <h3>Logged in as</h3>
        <p>
          <strong>{data.currentUser.name}</strong>
          <br />
          {data.currentUser.role} · {data.currentUser.email}
        </p>
      </section>
    </motion.div>
  );
}
