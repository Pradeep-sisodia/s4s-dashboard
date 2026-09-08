import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function MissionBar({ mission }) {
  if (!mission) return null;
  const pct = Math.min(100, (mission.achievedCr / mission.targetCr) * 100);

  return (
    <motion.section
      className="mission-banner"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mission-glow" />
      <div className="mission-banner-head">
        <h3>
          <Sparkles size={16} /> {mission.title}
        </h3>
        <span className="day-chip">
          Day {mission.day} of {mission.daysInMonth}
        </span>
      </div>
      <div className="timeline">
        <div className="timeline-track">
          <motion.div
            className="timeline-fill"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="timeline-pointer"
            initial={{ left: 0, opacity: 0, y: 8 }}
            animate={{ left: `${pct}%`, opacity: 1, y: 0 }}
            transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
          >
            ₹{mission.achievedCr} Cr
          </motion.div>
        </div>
        <div className="timeline-marks">
          <span>₹0</span>
          {mission.milestones.map((m) => (
            <span key={m} style={{ left: `${(m / mission.targetCr) * 100}%` }}>
              ₹{m} Cr
            </span>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
