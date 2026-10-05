import { motion } from "framer-motion";
import CountUp from "./CountUp.jsx";

function money(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

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
              <th>Target Cases</th>
              <th>Cases</th>
              <th>Target Amount</th>
              <th>Sanction Amount</th>
              <th>Total Repay Amount</th>
              <th>Total Rec. Repay Amount</th>
              <th>Repay %</th>
              <th>% Achievement</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <motion.tr
                key={`${row.id}-${row.team}`}
                className={row.isAuto ? "row-auto" : ""}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.035 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.7)" }}
              >
                <td>
                  <span className={`rank-pill ${row.rank <= 3 ? "hot" : ""}`}>{row.rank}</span>
                </td>
                <td className="emp">
                  <b>{row.isAuto ? "AUTO" : row.name}</b>
                  <small>{row.isAuto ? "workflow automated" : row.email}</small>
                </td>
                <td>{row.isAuto ? "—" : row.targetCount ?? row.totalCount ?? 0}</td>
                <td>{row.achievedCount}</td>
                <td>{row.isAuto ? "—" : money(row.targetAmount)}</td>
                <td>{money(row.achievedAmount)}</td>
                <td>{money(row.rawRepayAmount)}</td>
                <td>{money(row.receivedRepayAmount)}</td>
                <td>
                  <span className={`ach ${row.repayPct >= 100 ? "up" : row.repayPct > 0 ? "up" : "down"}`}>
                    {row.repayPct.toFixed(2)}%
                  </span>
                </td>
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
                <CountUp value={totals.targetCount || 0} />
              </td>
              <td>
                <CountUp value={totals.achievedCount} />
              </td>
              <td>
                ₹
                <CountUp value={totals.targetAmount || 0} />
              </td>
              <td>
                ₹
                <CountUp value={totals.achievedAmount} />
              </td>
              <td>
                ₹
                <CountUp value={totals.rawRepayAmount || 0} />
              </td>
              <td>
                ₹
                <CountUp value={totals.receivedRepayAmount || 0} />
              </td>
              <td>{(totals.repayPct || 0).toFixed(2)}%</td>
              <td>{totals.achievementPct.toFixed(2)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
