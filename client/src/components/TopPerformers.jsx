import { motion } from "framer-motion";
import { Bot, Crown } from "lucide-react";
import CountUp from "./CountUp.jsx";

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
}

function money(n) {
  return Number(n || 0).toLocaleString("en-IN");
}

/** Top 3 by sanction amount — AUTO included in same ranking. */
function top3(rows = []) {
  return [...(rows || [])]
    .filter((r) => (r.achievedAmount || 0) > 0 || (r.achievedCount || 0) > 0)
    .sort((a, b) => b.achievedAmount - a.achievedAmount)
    .slice(0, 3)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

function Podium({ title, people, accent }) {
  if (!people?.length) return null;

  let layoutPeople;
  let layoutRanks;
  if (people.length === 1) {
    layoutPeople = [people[0]];
    layoutRanks = [1];
  } else if (people.length === 2) {
    layoutPeople = [people[1], people[0]];
    layoutRanks = [2, 1];
  } else {
    layoutPeople = [people[1], people[0], people[2]];
    layoutRanks = [2, 1, 3];
  }

  return (
    <div className={`podium-block ${accent}`}>
      <h3>{title}</h3>
      <div className={`podium-row ${people.length === 1 ? "one" : people.length === 2 ? "two" : ""}`}>
        {layoutPeople.map((p, i) => {
          const rank = layoutRanks[i];
          const isAuto = p.isAuto || p.id === "__auto__" || p.name === "AUTO";
          return (
            <motion.article
              key={`${p.id}-${p.team || accent}-${rank}`}
              className={`podium-card rank-${rank} ${accent} ${isAuto ? "is-auto" : ""}`}
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
              <div className={`podium-avatar rank-${rank} ${isAuto ? "auto-av" : ""}`}>
                {isAuto ? <Bot size={20} /> : initials(p.name)}
              </div>
              <strong>{isAuto ? "AUTO" : p.name}</strong>
              {isAuto && <div className="auto-team-tag">WORKFLOW</div>}
              <div className="podium-amt">
                ₹<CountUp value={p.achievedAmount} duration={1600} />
              </div>
              <small>
                {p.achievedCount} cases · {(p.pctAchievement || 0).toFixed(1)}%
              </small>
              {isAuto && (
                <div className="podium-repay">
                  <span>Raw ₹{money(p.rawRepayAmount)}</span>
                  <span>Recv ₹{money(p.receivedRepayAmount)}</span>
                  <span className={(p.repayPct || 0) > 0 ? "up" : ""}>
                    {(p.repayPct || 0).toFixed(2)}%
                  </span>
                </div>
              )}
              <em>#{rank}</em>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}

export default function TopPerformers({ fresh = [], repeat = [], freshTeam = [], repeatTeam = [] }) {
  // Prefer full team lists so AUTO stays in the same Fresh/Repeat top-3 by amount
  const freshTop = top3(freshTeam.length ? freshTeam : fresh);
  const repeatTop = top3(repeatTeam.length ? repeatTeam : repeat);

  return (
    <section className={`performers ${!freshTop.length || !repeatTop.length ? "single" : ""}`}>
      {freshTop.length > 0 && <Podium title="FRESH TOP 3 PERFORMERS" people={freshTop} accent="fresh" />}
      {repeatTop.length > 0 && <Podium title="REPEAT TOP 3 PERFORMERS" people={repeatTop} accent="repeat" />}
    </section>
  );
}
