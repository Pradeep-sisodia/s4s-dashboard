import { motion } from "framer-motion";
import { Trophy } from "lucide-react";

function monthParts(title = "") {
  const after = String(title).split("—")[1]?.trim() || "";
  const [month = "MONTH", year = ""] = after.split(/\s+/);
  return { month, year, label: after || "This month" };
}

function formatCr(value) {
  const n = Math.max(0, Number(value) || 0);
  if (n >= 100 || Math.abs(n - Math.round(n)) < 0.001) return String(Math.round(n));
  return n.toFixed(2);
}

function digitSlots(value) {
  const [whole, frac = "00"] = Number(value || 0).toFixed(2).split(".");
  const padded = whole.padStart(2, "0");
  return [...padded, ".", ...frac];
}

export default function MissionBar({ mission }) {
  if (!mission) return null;

  const { month, label } = monthParts(mission.title);
  const target = Number(mission.targetCr) || 0;
  const achieved = Number(mission.achievedCr) || 0;
  const pct = target ? Math.min(100, (achieved / target) * 100) : 0;
  const left = Math.max(0, target - achieved);
  const days = Number(mission.daysInMonth) || 31;
  const day = Math.min(days, Number(mission.day) || 1);
  const dayPct = days ? day / days : 0;

  const size = 86;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = circ * dayPct;

  return (
    <motion.section
      className="lb-board"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="lb-pill">
        <Trophy size={14} />
        {month.toUpperCase()} - LEADERBOARD
      </div>

      <div className="lb-body">
        <div className="lb-mission">
          <span>MISSION</span>
          <strong>₹{formatCr(target)} Cr</strong>
          <small>{label}</small>
        </div>

        <div className="lb-score">
          <div className="lb-digits" aria-label={`₹${achieved} Cr`}>
            <em className="lb-currency">₹</em>
            {digitSlots(achieved).map((ch, i) => (
              <span key={`${ch}-${i}`} className={ch === "." ? "lb-dot" : "lb-digit"}>
                {ch}
              </span>
            ))}
            <em className="lb-unit">Cr</em>
          </div>
          <p>
            {pct.toFixed(1)}% of mission · ₹{formatCr(left)} Cr to go
          </p>
        </div>

        <div className="lb-day" aria-label={`Day ${day} of ${days}`}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#f5a524"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ - dash}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </svg>
          <div className="lb-day-copy">
            <b>{day}</b>
            <span>OF {days} DAYS</span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
