import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboard } from "../hooks/useDashboard.jsx";
import KpiCards from "../components/KpiCards.jsx";
import MissionBar from "../components/MissionBar.jsx";
import TopPerformers from "../components/TopPerformers.jsx";
import PerformanceTable from "../components/PerformanceTable.jsx";

export default function Dashboard() {
  const { data } = useDashboard();
  const [mode, setMode] = useState("all");
  const [when, setWhen] = useState("Today");

  const kpis = useMemo(() => {
    if (mode === "fresh") return data.freshTotals;
    if (mode === "repeat") return data.repeatTotals;
    return data.kpis;
  }, [mode, data]);

  const asOn = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="eyebrow">Live DRR command center</p>
          <h1>Today DRR Sanction Team Performance</h1>
          <div className="status-bar">
            <span>AS ON {asOn}</span>
            <span>DATE {asOn}</span>
            <span>VIEW {when.toUpperCase()}</span>
          </div>
        </div>
        <div className="filters">
          <div className="seg">
            {["all", "fresh", "repeat"].map((key) => (
              <button key={key} className={mode === key ? "on" : ""} onClick={() => setMode(key)}>
                {key === "all" ? "ALL" : key.toUpperCase()}
              </button>
            ))}
          </div>
          <select value={when} onChange={(e) => setWhen(e.target.value)}>
            <option>Today</option>
            <option>This Week</option>
            <option>This Month</option>
          </select>
        </div>
      </div>

      <KpiCards kpis={kpis} />
      <MissionBar mission={data.mission} />
      <TopPerformers fresh={data.topFresh} repeat={data.topRepeat} />

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          className="tables-grid"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {(mode === "all" || mode === "fresh") && (
            <PerformanceTable
              title="FRESH TEAM PERFORMANCE"
              rows={data.freshTeam}
              totals={data.freshTotals}
              variant="fresh"
            />
          )}
          {(mode === "all" || mode === "repeat") && (
            <PerformanceTable
              title="REPEAT TEAM PERFORMANCE"
              rows={data.repeatTeam}
              totals={data.repeatTotals}
              variant="repeat"
            />
          )}
        </motion.div>
      </AnimatePresence>

      <footer className="thanks">★ THANK YOU & KEEP UP THE GOOD WORK! ★</footer>
    </div>
  );
}
