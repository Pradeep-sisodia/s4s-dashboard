import { motion } from "framer-motion";
import { useDashboard } from "../hooks/useDashboard.jsx";

export default function Reports() {
  const { data } = useDashboard();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-head">
        <h1>REPORTS</h1>
      </div>
      <div className="kpi-grid">
        <article className="kpi-card">
          <p>Fresh achieved</p>
          <h3>₹{data.freshTotals.achievedAmount.toLocaleString("en-IN")}</h3>
        </article>
        <article className="kpi-card">
          <p>Repeat achieved</p>
          <h3>₹{data.repeatTotals.achievedAmount.toLocaleString("en-IN")}</h3>
        </article>
        <article className="kpi-card">
          <p>Combined achievement</p>
          <h3>{data.kpis.achievementPct.toFixed(2)}%</h3>
        </article>
      </div>
    </motion.div>
  );
}
