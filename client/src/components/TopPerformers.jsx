import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import CountUp from "./CountUp.jsx";

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
}

function Podium({ title, people, accent }) {
  const order = [people[1], people[0], people[2]].filter(Boolean);
  const ranks = [2, 1, 3];

  return (
    <div className={`podium-block ${accent}`}>
      <h3>{title}</h3>
      <div className="podium-row">
        {order.map((p, i) => {
          const rank = ranks[i];
          return (
            <motion.article
              key={p.id}
              className={`podium-card rank-${rank} ${accent}`}
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, type: "spring", stiffness: 90, damping: 14 }}
              whileHover={{ y: -10, scale: 1.04 }}
            >
              {rank === 1 && (
                <span className="crown">
                  <Crown size={16} />
                </span>
              )}
              <div className={`podium-avatar rank-${rank}`}>{initials(p.name)}</div>
              <strong>{p.name}</strong>
              <div className="podium-amt">
                ₹<CountUp value={p.achievedAmount} duration={1600} />
              </div>
              <small>
                {p.achievedCount} cases · {p.pctAchievement.toFixed(1)}%
              </small>
              <em>#{rank}</em>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}

export default function TopPerformers({ fresh = [], repeat = [] }) {
  return (
    <section className={`performers ${!fresh.length || !repeat.length ? "single" : ""}`}>
      {fresh.length > 0 && <Podium title="FRESH TOP 3 PERFORMERS" people={fresh} accent="fresh" />}
      {repeat.length > 0 && <Podium title="REPEAT TOP 3 PERFORMERS" people={repeat} accent="repeat" />}
    </section>
  );
}
