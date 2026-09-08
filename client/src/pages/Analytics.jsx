import { motion } from "framer-motion";
import { useDashboard } from "../hooks/useDashboard.jsx";

export default function Analytics() {
  const { data } = useDashboard();
  const fresh = data.freshTeam.slice(0, 8);
  const max = Math.max(...fresh.map((r) => r.achievedAmount));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-head">
        <h1>ANALYTICS</h1>
      </div>
      <section className="table-card">
        <div className="table-head">
          <h3>Fresh team achieved amount</h3>
        </div>
        <div className="bars">
          {fresh.map((r, i) => (
            <div className="bar-row" key={r.id}>
              <span>{r.name.split(" ")[0]}</span>
              <div className="bar-track">
                <motion.div
                  className="bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${(r.achievedAmount / max) * 100}%` }}
                  transition={{ delay: 0.08 * i, duration: 0.8 }}
                />
              </div>
              <em>₹{(r.achievedAmount / 100000).toFixed(2)} L</em>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
