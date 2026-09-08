import { motion } from "framer-motion";
import { useDashboard } from "../hooks/useDashboard.jsx";
import KpiCards from "../components/KpiCards.jsx";
import PerformanceTable from "../components/PerformanceTable.jsx";
import TopPerformers from "../components/TopPerformers.jsx";

export default function TeamPage({ kind }) {
  const { data } = useDashboard();
  const isFresh = kind === "fresh";
  const rows = isFresh ? data.freshTeam : data.repeatTeam;
  const totals = isFresh ? data.freshTotals : data.repeatTotals;
  const top = isFresh ? data.topFresh : data.topRepeat;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-head">
        <h1>{isFresh ? "FRESH TEAM" : "REPEAT TEAM"} PERFORMANCE</h1>
      </div>
      <KpiCards kpis={totals} />
      <TopPerformers
        fresh={isFresh ? top : []}
        repeat={isFresh ? [] : top}
      />
      <PerformanceTable
        title={`${isFresh ? "FRESH" : "REPEAT"} TEAM PERFORMANCE`}
        rows={rows}
        totals={totals}
        variant={kind}
      />
    </motion.div>
  );
}
