import { motion } from "framer-motion";
import CountUp from "./CountUp.jsx";

export default function PerformanceTable({ title, rows, totals, variant = "fresh", extra }) {
  return (
    <section className={`table-card ${variant}`}>
      <div className="table-head">
        <h3>{title}</h3>
        {extra}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Employee</th>
              <th>Total Count</th>
              <th>Target Amount</th>
              {variant === "fresh" && <th>% of Total</th>}
              <th>Achieved Count</th>
              <th>Achieved Amount</th>
              <th>% Achievement</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.035 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.7)" }}
              >
                <td>
                  <span className={`rank-pill ${row.rank <= 3 ? "hot" : ""}`}>{row.rank}</span>
                </td>
                <td className="emp">
                  <b>{row.name}</b>
                  <small>{row.email}</small>
                </td>
                <td>{row.totalCount}</td>
                <td>₹{row.targetAmount.toLocaleString("en-IN")}</td>
                {variant === "fresh" && <td>{row.pctOfTotal.toFixed(2)}%</td>}
                <td>{row.achievedCount}</td>
                <td>₹{row.achievedAmount.toLocaleString("en-IN")}</td>
                <td>
                  <div className="ach-cell">
                    <span className={`ach ${row.pctAchievement >= 100 ? "up" : "down"}`}>
                      {row.pctAchievement.toFixed(2)}%
                    </span>
                    <span className="mini-track">
                      <span
                        className="mini-fill"
                        style={{ width: `${Math.min(row.pctAchievement, 140)}%` }}
                      />
                    </span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>TOTAL</td>
              <td>
                <CountUp value={totals.targetCount} />
              </td>
              <td>
                ₹<CountUp value={totals.targetAmount} />
              </td>
              {variant === "fresh" && <td>100%</td>}
              <td>
                <CountUp value={totals.achievedCount} />
              </td>
              <td>
                ₹<CountUp value={totals.achievedAmount} />
              </td>
              <td>{totals.achievementPct.toFixed(2)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
