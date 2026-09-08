import { motion } from "framer-motion";
import { useDashboard } from "../hooks/useDashboard.jsx";
import MissionBar from "../components/MissionBar.jsx";

export default function Targets() {
  const { data } = useDashboard();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-head">
        <h1>TARGETS</h1>
      </div>
      <MissionBar mission={data.mission} />
      <section className="table-card">
        <div className="table-head">
          <h3>Monthly mission</h3>
        </div>
        <p className="pad">
          Target {data.sidebarMission.targetLabel} · Current {data.sidebarMission.achievedLabel} ·{" "}
          {data.sidebarMission.pct}% complete
        </p>
      </section>
    </motion.div>
  );
}
