import express from "express";
import cors from "cors";
import { getDashboard, getLeaderboard, ensureFreshData } from "./data.js";
import { ensureNeonSchema } from "./db.js";
import { istDateString } from "./sync.js";
import { ALL_BUCKET_KEYS, BUCKETS, isAdminRole } from "./buckets.js";
import {
  ensureAuthSeed,
  authMiddleware,
  attachUser,
  requireAdmin,
  requireBucket,
  login,
  listUsers,
  createUser,
  updateUserAccess
} from "./auth.js";
import {
  listEditableTargets,
  upsertTarget,
  upsertManyTargets,
  updateMissionTarget
} from "./targetsApi.js";

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

async function boot() {
  await ensureNeonSchema();
  await ensureAuthSeed();
  const today = istDateString();
  // Warm IST today in background — dashboard won't wait on S4S after this
  ensureFreshData(true, today, today).catch((err) =>
    console.error("warmup sync failed", err.message)
  );
  setInterval(() => {
    const day = istDateString();
    ensureFreshData(false, day, day).catch((err) =>
      console.error("live sync failed", err.message)
    );
  }, 45_000);
}
boot().catch((err) => console.error("boot failed", err));

app.get("/api/health", async (_req, res) => {
  try {
    await ensureNeonSchema();
    res.json({ ok: true, service: "s4s-dashboard-api", db: "neon" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/buckets", (_req, res) => {
  res.json({ buckets: BUCKETS });
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }
    const result = await login(email, password);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get("/api/auth/me", authMiddleware, attachUser, async (req, res) => {
  res.json({ user: req.userPublic });
});

const authed = [authMiddleware, attachUser];

app.post("/api/sync", ...authed, requireAdmin, async (req, res) => {
  try {
    const from = req.body?.from || req.query.from;
    const to = req.body?.to || req.query.to;
    const result = await ensureFreshData(true, from, to);
    res.json(result);
  } catch (err) {
    console.error("sync failed", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

function requireAnyBucket(keys) {
  return (req, res, next) => {
    if (isAdminRole(req.user?.app_role)) return next();
    const buckets = req.userPublic?.buckets || [];
    if (keys.some((k) => buckets.includes(k))) return next();
    return res.status(403).json({ error: "No access to this data" });
  };
}

const DATA_BUCKETS = ALL_BUCKET_KEYS.filter((k) => k !== "users");

app.get(
  "/api/dashboard",
  ...authed,
  requireAnyBucket(DATA_BUCKETS),
  async (req, res) => {
  try {
    const dash = await getDashboard({
      from: req.query.from,
      to: req.query.to,
      force: req.query.force === "1"
    });
    dash.currentUser = {
      name: req.userPublic.name,
      role: req.userPublic.role,
      email: req.userPublic.email,
      buckets: req.userPublic.buckets,
      isAdmin: req.userPublic.isAdmin
    };
    res.json(dash);
  } catch (err) {
    console.error("dashboard failed", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/leaderboard", ...authed, requireBucket("leaderboard"), async (req, res) => {
  try {
    res.json({
      rows: await getLeaderboard({
        from: req.query.from,
        to: req.query.to
      })
    });
  } catch (err) {
    console.error("leaderboard failed", err);
    res.status(500).json({ error: err.message });
  }
});

// Team pages reuse dashboard payload pieces via client; protect by bucket when fetching dashboard-like data
app.get("/api/team/:kind", ...authed, async (req, res, next) => {
  const kind = req.params.kind;
  if (kind !== "fresh" && kind !== "repeat") {
    return res.status(400).json({ error: "kind must be fresh|repeat" });
  }
  return requireBucket(kind)(req, res, next);
}, async (req, res) => {
  try {
    const dash = await getDashboard({
      from: req.query.from,
      to: req.query.to
    });
    const kind = req.params.kind;
    res.json({
      kind,
      rows: kind === "fresh" ? dash.freshTeam : dash.repeatTeam,
      totals: kind === "fresh" ? dash.freshTotals : dash.repeatTotals,
      top: kind === "fresh" ? dash.topFresh : dash.topRepeat
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/targets", ...authed, requireAnyBucket(["targets", "settings"]), async (req, res) => {
  try {
    res.json(await listEditableTargets(req.query.date));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/targets", ...authed, requireAnyBucket(["targets", "settings"]), async (req, res) => {
  try {
    const { date, items, partnerUserId, team, targetCount, targetAmount } = req.body || {};
    if (Array.isArray(items)) {
      return res.json(await upsertManyTargets(date, items));
    }
    res.json(
      await upsertTarget({
        partnerUserId,
        team,
        date,
        targetCount,
        targetAmount
      })
    );
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.put("/api/config/mission", ...authed, requireAdmin, async (req, res) => {
  try {
    res.json(await updateMissionTarget(req.body?.mission_target_cr ?? req.body?.value));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get("/api/users", ...authed, requireAdmin, async (_req, res) => {
  try {
    res.json({ users: await listUsers(), buckets: BUCKETS, allBucketKeys: ALL_BUCKET_KEYS });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users", ...authed, requireAdmin, async (req, res) => {
  try {
    const user = await createUser(req.body || {}, req.user.id);
    res.status(201).json({ user });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.patch("/api/users/:id", ...authed, requireAdmin, async (req, res) => {
  try {
    const user = await updateUserAccess(req.params.id, req.body || {}, req.user);
    res.json({ user });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`S4S API running on http://localhost:${PORT}`);
});
