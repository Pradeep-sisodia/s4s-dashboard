import { neonPool } from "./db.js";
import { s4sBusinessDate } from "./sync.js";

export async function listEditableTargets(date) {
  const day = date || (await s4sBusinessDate());
  const { rows } = await neonPool.query(
    `
    SELECT
      m.partner_user_id AS id,
      m.name,
      m.email,
      m.team,
      COALESCE(t.target_count, 0)::int AS "targetCount",
      COALESCE(t.target_amount, 0)::float8 AS "targetAmount",
      COALESCE(t.is_manual, FALSE) AS "isManual",
      COALESCE(p.achieved_count, 0)::int AS "achievedCount",
      COALESCE(p.achieved_amount, 0)::float8 AS "achievedAmount"
    FROM dashboard_members m
    LEFT JOIN dashboard_targets t
      ON t.partner_user_id = m.partner_user_id
     AND t.period_date = $1::date
     AND t.team = m.team
    LEFT JOIN dashboard_performance p
      ON p.partner_user_id = m.partner_user_id
     AND p.period_date = $1::date
     AND p.team = m.team
    WHERE m.is_active = TRUE
      AND m.partner_user_id <> '__auto__'
    ORDER BY m.team, m.name
    `,
    [day]
  );

  // Also include AUTO rows if performance exists
  const auto = await neonPool.query(
    `
    SELECT
      p.partner_user_id AS id,
      'AUTO' AS name,
      'auto@salary4sure.com' AS email,
      p.team,
      COALESCE(t.target_count, 0)::int AS "targetCount",
      COALESCE(t.target_amount, 0)::float8 AS "targetAmount",
      COALESCE(t.is_manual, FALSE) AS "isManual",
      COALESCE(p.achieved_count, 0)::int AS "achievedCount",
      COALESCE(p.achieved_amount, 0)::float8 AS "achievedAmount"
    FROM dashboard_performance p
    LEFT JOIN dashboard_targets t
      ON t.partner_user_id = p.partner_user_id
     AND t.period_date = p.period_date
     AND t.team = p.team
    WHERE p.period_date = $1::date
      AND p.partner_user_id = '__auto__'
    `,
    [day]
  );

  return { date: day, rows: [...rows, ...auto.rows] };
}

export async function upsertTarget({ partnerUserId, team, date, targetCount, targetAmount }) {
  if (!["fresh", "repeat"].includes(team)) {
    const err = new Error("team must be fresh or repeat");
    err.status = 400;
    throw err;
  }
  const day = date || (await s4sBusinessDate());
  const count = Math.max(0, Number(targetCount) || 0);
  const amount = Math.max(0, Number(targetAmount) || 0);

  await neonPool.query(
    `
    INSERT INTO dashboard_targets (
      partner_user_id, period_date, team, target_count, target_amount, is_manual, updated_at
    ) VALUES ($1, $2::date, $3, $4, $5, TRUE, NOW())
    ON CONFLICT (partner_user_id, period_date, team) DO UPDATE SET
      target_count = EXCLUDED.target_count,
      target_amount = EXCLUDED.target_amount,
      is_manual = TRUE,
      updated_at = NOW()
    `,
    [partnerUserId, day, team, count, amount]
  );

  return { ok: true, date: day, partnerUserId, team, targetCount: count, targetAmount: amount };
}

export async function upsertManyTargets(date, items = []) {
  const day = date || (await s4sBusinessDate());
  const saved = [];
  for (const item of items) {
    saved.push(
      await upsertTarget({
        partnerUserId: item.id || item.partnerUserId,
        team: item.team,
        date: day,
        targetCount: item.targetCount,
        targetAmount: item.targetAmount
      })
    );
  }
  return { ok: true, date: day, saved: saved.length };
}

export async function updateMissionTarget(cr) {
  const value = Number(cr);
  if (!Number.isFinite(value) || value <= 0) {
    const err = new Error("Invalid mission target");
    err.status = 400;
    throw err;
  }
  await neonPool.query(
    `
    INSERT INTO dashboard_config (key, value, updated_at)
    VALUES ('mission_target_cr', to_jsonb($1::numeric), NOW())
    ON CONFLICT (key) DO UPDATE SET value = to_jsonb($1::numeric), updated_at = NOW()
    `,
    [value]
  );
  return { ok: true, mission_target_cr: value };
}
