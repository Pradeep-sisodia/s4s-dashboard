import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchLeaderboard } from "../api.js";

export default function Leaderboard() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetchLeaderboard().then((d) => setRows(d.rows || []));
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-head">
        <h1>COMBINED LEADERBOARD</h1>
      </div>
      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Employee</th>
                <th>Team</th>
                <th>Achieved Amount</th>
                <th>% Achievement</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <td>
                    <span className={`rank-pill ${r.rank <= 3 ? "hot" : ""}`}>{r.rank}</span>
                  </td>
                  <td className="emp">
                    <b>{r.name}</b>
                    <small>{r.email}</small>
                  </td>
                  <td>{r.team.toUpperCase()}</td>
                  <td>₹{r.achievedAmount.toLocaleString("en-IN")}</td>
                  <td>
                    <span className={`ach ${r.pctAchievement >= 100 ? "up" : "down"}`}>
                      {r.pctAchievement.toFixed(2)}%
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
