import express from "express";
import cors from "cors";
import { getDashboard, getLeaderboard } from "./data.js";

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "s4s-dashboard-api" });
});

app.get("/api/dashboard", (_req, res) => {
  res.json(getDashboard());
});

app.get("/api/leaderboard", (_req, res) => {
  res.json({ rows: getLeaderboard() });
});

app.listen(PORT, () => {
  console.log(`S4S API running on http://localhost:${PORT}`);
});
