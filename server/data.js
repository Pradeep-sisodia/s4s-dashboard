import { ensureNeonSchema, neonPool } from "./db.js";
import { syncDateRange, istDateString } from "./sync.js";

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function enrich(rows, team) {
  const totalTarget = rows.reduce((s, r) => s + Number(r.targetAmount || 0), 0);
  return rows
    .map((r) => {
      const targetCount = Number(r.targetCount ?? r.totalCount ?? 0);
      const targetAmount = Number(r.targetAmount || 0);
      const rawRepayAmount = Number(r.rawRepayAmount || 0);
      const receivedRepayAmount = Number(r.receivedRepayAmount || 0);
      return {
        ...r,
        team,
        targetCount,
        targetAmount,
        isAuto: r.id === "__auto__" || r.name === "AUTO",
        rawRepayAmount,
        receivedRepayAmount,
        repayPct: rawRepayAmount ? (receivedRepayAmount / rawRepayAmount) * 100 : 0,
        pctOfTotal: totalTarget ? (targetAmount / totalTarget) * 100 : 0,
        pctAchievement: targetAmount ? (r.achievedAmount / targetAmount) * 100 : 0
      };
    })
    .sort((a, b) => b.achievedAmount - a.achievedAmount)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

function totals(rows) {
  const targetCount = rows.reduce((s, r) => s + Number(r.targetCount || r.totalCount || 0), 0);
  const targetAmount = rows.reduce((s, r) => s + Number(r.targetAmount || 0), 0);
  const achievedCount = rows.reduce((s, r) => s + r.achievedCount, 0);
  const achievedAmount = rows.reduce((s, r) => s + r.achievedAmount, 0);
  const rawRepayAmount = rows.reduce((s, r) => s + r.rawRepayAmount, 0);
  const receivedRepayAmount = rows.reduce((s, r) => s + r.receivedRepayAmount, 0);
  return {
    targetCount,
    targetAmount,
    achievedCount,
    achievedAmount,
    rawRepayAmount,
    receivedRepayAmount,
    repayPct: rawRepayAmount ? (receivedRepayAmount / rawRepayAmount) * 100 : 0,
    achievementPct: targetAmount ? (achievedAmount / targetAmount) * 100 : 0
  };
}

function cr(amount) {
  return Math.round((Number(amount) / 10_000_000) * 100) / 100;
}

function inrCr(amount) {
  return `₹${cr(amount).toFixed(2)} Cr`;
}

function normalizeDate(v) {
  if (!v) return null;
  const s = String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

async function getConfigNumber(key, fallback) {
  const { rows } = await neonPool.query(
    `SELECT value FROM dashboard_config WHERE key = $1`,
    [key]
  );
  if (!rows.length) return fallback;
  const v = rows[0].value;
  return Number(typeof v === "object" ? v : v);
}

async function buildTeamRows(fromDate, toDate, team) {
  const { rows } = await neonPool.query(
    `
    SELECT
      m.partner_user_id AS id,
      m.name,
      m.email,
      COALESCE(SUM(t.target_count), 0)::int AS "targetCount",
      COALESCE(SUM(t.target_count), 0)::int AS "totalCount",
      COALESCE(SUM(t.target_amount), 0)::float8 AS "targetAmount",
      COALESCE(SUM(p.achieved_count), 0)::int AS "achievedCount",
      COALESCE(SUM(p.achieved_amount), 0)::float8 AS "achievedAmount",
      COALESCE(SUM(p.raw_repay_amount), 0)::float8 AS "rawRepayAmount",
      COALESCE(SUM(p.received_repay_amount), 0)::float8 AS "receivedRepayAmount"
    FROM dashboard_performance p
    JOIN dashboard_members m ON m.partner_user_id = p.partner_user_id
    LEFT JOIN dashboard_targets t
      ON t.partner_user_id = p.partner_user_id
     AND t.period_date = p.period_date
     AND t.team = p.team
    WHERE p.period_date >= $1::date
      AND p.period_date <= $2::date
      AND p.team = $3
      AND p.achieved_count > 0
    GROUP BY m.partner_user_id, m.name, m.email
    `,
    [fromDate, toDate, team]
  );

  return enrich(rows, team);
}

let lastSyncKey = "";
let lastSyncAt = 0;
const SYNC_TTL_MS = 45_000;
const syncInFlight = new Map();

function startSync(from, to) {
  const key = `${from}:${to}`;
  if (syncInFlight.has(key)) return syncInFlight.get(key);
  const job = syncDateRange(from, to)
    .then((result) => {
      lastSyncKey = key;
      lastSyncAt = Date.now();
      return result;
    })
    .catch((err) => {
      console.error("background sync failed", err.message);
      return { ok: false, error: err.message, from, to };
    })
    .finally(() => {
      syncInFlight.delete(key);
    });
  syncInFlight.set(key, job);
  return job;
}

export async function ensureFreshData(force = false, fromDate, toDate) {
  await ensureNeonSchema();
  const today = istDateString();
  const from = normalizeDate(fromDate) || today;
  const to = normalizeDate(toDate) || from;
  const key = `${from}:${to}`;
  const now = Date.now();

  if (!force && key === lastSyncKey && now - lastSyncAt < SYNC_TTL_MS) {
    return { skipped: true, from, to };
  }

  if (!force) {
    const [{ rows: perfRows }, { rows: syncRows }] = await Promise.all([
      neonPool.query(
        `SELECT 1 FROM dashboard_performance
         WHERE period_date >= $1::date AND period_date <= $2::date
         LIMIT 1`,
        [from, to]
      ),
      neonPool.query(
        `SELECT 1 FROM dashboard_sync_log
         WHERE status = 'ok'
           AND message = $1
           AND finished_at > NOW() - INTERVAL '12 hours'
         LIMIT 1`,
        [`Synced ${from}..${to}`]
      )
    ]);

    // Serve Neon immediately (even if today is still empty) and refresh in background
    if (perfRows.length || syncRows.length || key === lastSyncKey) {
      startSync(from, to);
      return { skipped: true, background: true, from, to };
    }
  }

  // First cold load for this range — wait once so UI gets real data
  const result = await startSync(from, to);
  if (result?.ok === false) {
    throw new Error(result.error || "Sync failed");
  }
  return result;
}

export async function getDashboard(opts = {}) {
  const today = istDateString();
  let from = normalizeDate(opts.from) || today;
  let to = normalizeDate(opts.to) || from;
  if (from > to) [from, to] = [to, from];

  await ensureFreshData(Boolean(opts.force), from, to);

  const now = new Date(`${to}T12:00:00+05:30`);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const [freshAll, repeatAll, missionTargetCr, missionAgg] = await Promise.all([
    buildTeamRows(from, to, "fresh"),
    buildTeamRows(from, to, "repeat"),
    getConfigNumber("mission_target_cr", 27),
    neonPool.query(
      `
      SELECT
        COALESCE(SUM(fresh_amount + repeat_amount), 0)::float8 AS achieved_amount,
        COALESCE(SUM(fresh_count + repeat_count), 0)::int AS achieved_count
      FROM dashboard_mission_daily
      WHERE period_date >= date_trunc('month', $1::date)
        AND period_date <= $1::date
      `,
      [to]
    )
  ]);
  const autoFresh = freshAll.find((r) => r.isAuto) || null;
  const autoRepeat = repeatAll.find((r) => r.isAuto) || null;
  // Keep AUTO inside same ranking as humans (by sanction/disbursed amount)
  const fresh = freshAll;
  const repeat = repeatAll;

  const freshTotals = totals(freshAll);
  const repeatTotals = totals(repeatAll);
  const autoRows = [autoFresh, autoRepeat].filter(Boolean);
  const autoTotals = totals(autoRows);

  const combined = {
    targetCount: freshTotals.targetCount + repeatTotals.targetCount,
    targetAmount: freshTotals.targetAmount + repeatTotals.targetAmount,
    achievedCount: freshTotals.achievedCount + repeatTotals.achievedCount,
    achievedAmount: freshTotals.achievedAmount + repeatTotals.achievedAmount,
    rawRepayAmount: freshTotals.rawRepayAmount + repeatTotals.rawRepayAmount,
    receivedRepayAmount: freshTotals.receivedRepayAmount + repeatTotals.receivedRepayAmount
  };
  combined.repayPct = combined.rawRepayAmount
    ? (combined.receivedRepayAmount / combined.rawRepayAmount) * 100
    : 0;
  combined.achievementPct = combined.targetAmount
    ? (combined.achievedAmount / combined.targetAmount) * 100
    : 0;

  const monthAchieved = Number(missionAgg.rows[0]?.achieved_amount || 0);
  const monthAchievedCr = cr(monthAchieved);
  const missionPct = missionTargetCr
    ? Math.min(100, Math.round((monthAchievedCr / missionTargetCr) * 100))
    : 0;

  const headerUsers = [...fresh, ...repeat]
    .filter((r) => r.achievedCount > 0 && !r.isAuto)
    .sort((a, b) => b.achievedAmount - a.achievedAmount)
    .slice(0, 6)
    .map((r) => ({ name: r.name, email: r.email, online: true }));

  const currentUser = {
    name: "BAMBAM KUMAR RAY",
    role: "Team Leader",
    email: "bambamkumarray@salary4sure.com"
  };

  const rangeLabel = from === to ? from : `${from} → ${to}`;

  return {
    currentUser,
    headerUsers,
    kpis: combined,
    freshTotals,
    repeatTotals,
    autoTotals,
    freshTeam: freshAll,
    repeatTeam: repeatAll,
    topFresh: freshAll.slice(0, 3),
    topRepeat: repeatAll.slice(0, 3),
    topAuto: autoRows,
    autoFresh,
    autoRepeat,
    mission: {
      title: `Mission ₹${missionTargetCr} Cr — ${monthNames[now.getMonth()]} ${now.getFullYear()}`,
      targetCr: missionTargetCr,
      achievedCr: monthAchievedCr,
      milestones: [
        missionTargetCr * 0.25,
        missionTargetCr * 0.5,
        missionTargetCr * 0.75,
        missionTargetCr
      ].map((n) => Math.round(n * 100) / 100),
      day: now.getDate(),
      daysInMonth
    },
    sidebarMission: {
      label: `MISSION PROGRESS ${monthNames[now.getMonth()].toUpperCase()} ${now.getFullYear()}`,
      pct: missionPct,
      achievedLabel: inrCr(monthAchieved),
      targetLabel: `₹${missionTargetCr} Cr`
    },
    alerts: [
      {
        id: 1,
        type: "success",
        text: `${rangeLabel}: ${combined.achievedCount} cases · ₹${(combined.achievedAmount / 100000).toFixed(2)} L.`,
        time: "live"
      },
      {
        id: 2,
        type: "info",
        text: `AUTO — Fresh ${autoFresh?.achievedCount || 0} · Repeat ${autoRepeat?.achievedCount || 0}.`,
        time: "live"
      },
      {
        id: 3,
        type: "warning",
        text: `Repay received ${combined.repayPct.toFixed(2)}% of raw obligation.`,
        time: "range"
      }
    ],
    meta: {
      source: "neon",
      periodDate: from,
      fromDate: from,
      toDate: to,
      syncedFrom: "s4s"
    }
  };
}

export async function getLeaderboard(opts = {}) {
  const dash = await getDashboard(opts);
  return [...dash.freshTeam, ...dash.repeatTeam]
    .sort((a, b) => b.achievedAmount - a.achievedAmount)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
