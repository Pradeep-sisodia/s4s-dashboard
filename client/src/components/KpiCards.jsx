import { motion } from "framer-motion";
import { Target, IndianRupee, CircleCheck, Wallet, BarChart3 } from "lucide-react";
import CountUp from "./CountUp.jsx";

const ease = [0.22, 1, 0.36, 1];

const cards = [
  { key: "targetCount", label: "Total Target Count", tone: "purple", icon: Target, prefix: "", suffix: "", spark: [40, 48, 44, 62, 70, 66, 80] },
  { key: "targetAmount", label: "Total Target Amount", tone: "blue", icon: IndianRupee, prefix: "₹ ", suffix: "", spark: [30, 42, 38, 55, 60, 72, 78] },
  { key: "achievedCount", label: "Total Achieved Count", tone: "green", icon: CircleCheck, prefix: "", suffix: "", spark: [20, 35, 48, 46, 62, 74, 88] },
  { key: "achievedAmount", label: "Total Achieved Amount", tone: "orange", icon: Wallet, prefix: "₹ ", suffix: "", spark: [18, 28, 40, 52, 49, 71, 90] },
  { key: "achievementPct", label: "Overall Achievement", tone: "indigo", icon: BarChart3, prefix: "", suffix: "%", digits: 2, spark: [50, 58, 54, 70, 82, 95, 100] }
];

function Spark({ values, tone }) {
  const max = Math.max(...values);
  const d = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 28 - (v / max) * 24;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  return (
    <svg className="spark" viewBox="0 0 100 32" preserveAspectRatio="none">
      <path d={d} className={`spark-line ${tone}`} />
    </svg>
  );
}

export default function KpiCards({ kpis }) {
  return (
    <div className="kpi-grid">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.article
            key={card.key}
            className={`kpi-card tone-${card.tone}`}
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.07 * i, duration: 0.55, ease }}
            whileHover={{ y: -8, scale: 1.02 }}
          >
            <div className="kpi-top">
              <div className={`kpi-icon tone-${card.tone}`}>
                <Icon size={18} />
              </div>
              <Spark values={card.spark} tone={card.tone} />
            </div>
            <p>{card.label}</p>
            <h3>
              <CountUp
                value={kpis[card.key]}
                prefix={card.prefix}
                suffix={card.suffix}
                digits={card.digits || 0}
                duration={1700}
              />
            </h3>
          </motion.article>
        );
      })}
    </div>
  );
}
