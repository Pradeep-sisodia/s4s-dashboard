import { motion } from "framer-motion";
import { useDashboard } from "../hooks/useDashboard.jsx";

export default function Alerts() {
  const { data } = useDashboard();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-head">
        <h1>ALERTS</h1>
      </div>
      <div className="alert-list">
        {data.alerts.map((a, i) => (
          <motion.article
            key={a.id}
            className={`alert-item ${a.type}`}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <b>{a.text}</b>
            <small>{a.time}</small>
          </motion.article>
        ))}
      </div>
    </motion.div>
  );
}
