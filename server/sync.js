import { ensureNeonSchema, neonPool, s4sPool } from "./db.js";

const CREDIT_ROLES = ["CREDIT_EXECUTIVE", "SANCTION_MANAGER", "SANCTION_HEAD"];

function istDateString(d = new Date()) {
  // Asia/Kolkata calendar date (YYYY-MM-DD) — always "today", no lag day
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
}

/** Live business day = IST calendar today. Never fall back to yesterday. */
async function s4sBusinessDate() {
  return istDateString();
}

function classifyTeam(row) {
  // Role-group names are the live fresh/repeat signal. partner_users has no
  // is_fresh_loan_support / isReloanSupport columns.
  const repeat = Boolean(row.is_repeat_support);
  const fresh = Boolean(row.is_fresh_support);
  if (repeat && !fresh) return "repeat";
  if (fresh && !repeat) return "fresh";
  if (repeat) return "repeat";
  if (fresh) return "fresh";
  return "fresh";
}

function teamFromPerformance(performance, id) {
  const rows = performance.filter((p) => String(p.partner_user_id) === String(id));
  if (!rows.length) return null;
  rows.sort((a, b) => (b.achieved_count || 0) - (a.achieved_count || 0));
  return rows[0].team;
}

async function fetchMembers() {
  const { rows } = await s4sPool.query(
    `
    SELECT
      pu.id,
      pu.name,
      pu.email,
      BOOL_OR(prg.name ILIKE '%repeat%') AS is_repeat_support,
      BOOL_OR(prg.name ILIKE '%fresh%') AS is_fresh_support,
      pu."isActive",
      pu."reportsToId",
      mgr.name AS reports_to,
      array_agg(DISTINCT pr.name) FILTER (WHERE pr.name IS NOT NULL) AS roles
    FROM partner_users pu
    JOIN partner_user_brand_roles pubr ON pubr."partnerUserId" = pu.id
    JOIN partner_roles pr ON pr.id = pubr."roleId"
    LEFT JOIN partner_users mgr ON mgr.id = pu."reportsToId"
    LEFT JOIN partner_user_role_groups purg ON purg."partnerUserId" = pu.id
    LEFT JOIN partner_role_groups prg ON prg.id = purg."roleGroupId"
    WHERE pu."deletedAt" IS NULL
      AND pu."isActive" = TRUE
      AND COALESCE(pu.is_disabled, FALSE) = FALSE
      AND pr.name = ANY($1::text[])
    GROUP BY pu.id, mgr.name
    ORDER BY pu.name
    `,
    [CREDIT_ROLES]
  );

  return rows.map((r) => ({
    partner_user_id: r.id,
    name: r.name,
    email: (r.email || "").toLowerCase(),
    team: classifyTeam(r),
    role: (r.roles || []).join(","),
    is_active: true,
    reports_to: r.reports_to || null
  }));
}

const AUTO_USER_ID = "__auto__";

// CRM sanction total is loans.amount on disbursementDate.
// loan_applied_amount is the customer request and runs higher than CRM.
// approvalDate drops loans disbursed this month and keeps loans not yet disbursed.
const EXCLUDED_LOAN_STATUSES = [
  "REJECTED",
  "CANCELLED",
  "DELETED",
  "BRE_REJECTED",
  "HARD_REJECTED",
  "SOFT_REJECTED",
  "PENDING",
  "ONBOARDING"
];

async function fetchPerformance(fromDate, toDate = fromDate) {
  const { rows } = await s4sPool.query(
    `
    WITH scoped AS (
      SELECT
        l.id,
        l."disbursementDate",
        l.is_repeat_loan,
        l.is_workflow_automated,
        l.amount,
        l.loan_cx_approved_by_partner_user_id,
        l.loan_sm_sh_approved_by_partner_user_id,
        l.loan_cx_assigned_partner_user_id,
        l.loan_sm_sh_assigned_partner_user_id,
        l.partner_user_id
      FROM loans l
      WHERE l."disbursementDate" >= $1::date
        AND l."disbursementDate" <= $2::date
        AND l.status::text <> ALL($3::text[])
    ),
    latest_allot AS (
      SELECT DISTINCT ON (log."loanId")
        log."loanId" AS loan_id,
        log."partnerUserId" AS partner_user_id
      FROM loan_allotted_partner_user_logs log
      JOIN scoped s ON s.id = log."loanId"
      ORDER BY log."loanId", log."allottedAt" DESC NULLS LAST, log.id DESC
    )
    SELECT
      COALESCE(
        lat.partner_user_id,
        l.loan_cx_approved_by_partner_user_id,
        l.loan_sm_sh_approved_by_partner_user_id,
        l.loan_cx_assigned_partner_user_id,
        l.loan_sm_sh_assigned_partner_user_id,
        l.partner_user_id,
        CASE WHEN COALESCE(l.is_workflow_automated, FALSE) THEN '${AUTO_USER_ID}' END
      ) AS partner_user_id,
      CASE WHEN COALESCE(l.is_repeat_loan, FALSE) THEN 'repeat' ELSE 'fresh' END AS team,
      l."disbursementDate"::text AS period_date,
      COUNT(*)::int AS achieved_count,
      COALESCE(SUM(COALESCE(l.amount, 0)), 0)::float8 AS achieved_amount,
      COALESCE(SUM(r."totalObligation"), 0)::float8 AS raw_repay_amount,
      COALESCE(SUM(recv.received), 0)::float8 AS received_repay_amount
    FROM scoped l
    LEFT JOIN latest_allot lat ON lat.loan_id = l.id
    LEFT JOIN repayments r ON r."loanId" = l.id
    LEFT JOIN (
      SELECT pr."loanId" AS loan_id, COALESCE(SUM(pct.amount), 0)::float8 AS received
      FROM payment_request pr
      JOIN payment_collection_transaction pct ON pct."paymentRequestId" = pr.id
      WHERE pr."loanId" IN (SELECT id FROM scoped)
        AND (
          pct.status::text ILIKE '%SUCCESS%'
          OR pct."isPaymentComplete" = TRUE
        )
      GROUP BY pr."loanId"
    ) recv ON recv.loan_id = l.id
    GROUP BY 1, 2, 3
    `,
    [fromDate, toDate, EXCLUDED_LOAN_STATUSES]
  );
  return rows
    .filter((r) => r.partner_user_id)
    .map((r) => ({
      ...r,
      partner_user_id: String(r.partner_user_id)
    }));
}

async function fetchMonthMission(year, month) {
  const { rows } = await s4sPool.query(
    `
    SELECT
      l."disbursementDate"::date AS period_date,
      COUNT(*) FILTER (WHERE COALESCE(l.is_repeat_loan, FALSE) = FALSE)::int AS fresh_count,
      COUNT(*) FILTER (WHERE COALESCE(l.is_repeat_loan, FALSE) = TRUE)::int AS repeat_count,
      COALESCE(
        SUM(COALESCE(l.amount, 0)) FILTER (WHERE COALESCE(l.is_repeat_loan, FALSE) = FALSE),
        0
      )::float8 AS fresh_amount,
      COALESCE(
        SUM(COALESCE(l.amount, 0)) FILTER (WHERE COALESCE(l.is_repeat_loan, FALSE) = TRUE),
        0
      )::float8 AS repeat_amount
    FROM loans l
    WHERE l."disbursementDate" >= make_date($1::int, $2::int, 1)
      AND l."disbursementDate" < (make_date($1::int, $2::int, 1) + INTERVAL '1 month')
      AND l."disbursementDate" <= (NOW() AT TIME ZONE 'Asia/Kolkata')::date
      AND l.status::text <> ALL($3::text[])
    GROUP BY 1
    ORDER BY 1
    `,
    [year, month, EXCLUDED_LOAN_STATUSES]
  );
  return rows;
}

async function ensureTargets(performance) {
  const cfg = await neonPool.query(
    `SELECT key, value FROM dashboard_config
     WHERE key IN (
       'fresh_daily_target_count',
       'fresh_daily_target_amount',
       'repeat_daily_target_count',
       'repeat_daily_target_amount'
     )`
  );
  const map = Object.fromEntries(cfg.rows.map((r) => [r.key, Number(r.value)]));
  const freshCount = map.fresh_daily_target_count || 12;
  const freshAmount = map.fresh_daily_target_amount || 350_000;
  const repeatCount = map.repeat_daily_target_count || 100;
  const repeatAmount = map.repeat_daily_target_amount || 2_500_000;

  if (!performance.length) return;

  const ids = [];
  const days = [];
  const teams = [];
  const counts = [];
  const amounts = [];
  for (const p of performance) {
    const day =
      typeof p.period_date === "string"
        ? p.period_date.slice(0, 10)
        : p.period_date?.toISOString?.().slice(0, 10) || p.period_date;
    const repeat = p.team === "repeat";
    ids.push(p.partner_user_id);
    days.push(day);
    teams.push(p.team);
    counts.push(repeat ? repeatCount : freshCount);
    amounts.push(repeat ? repeatAmount : freshAmount);
  }

  await neonPool.query(
    `
    INSERT INTO dashboard_targets (
      partner_user_id, period_date, team, target_count, target_amount
    )
    SELECT * FROM UNNEST(
      $1::text[], $2::date[], $3::text[], $4::int[], $5::float8[]
    ) AS t(partner_user_id, period_date, team, target_count, target_amount)
    ON CONFLICT (partner_user_id, period_date, team) DO UPDATE SET
      target_count = CASE
        WHEN dashboard_targets.is_manual THEN dashboard_targets.target_count
        ELSE EXCLUDED.target_count
      END,
      target_amount = CASE
        WHEN dashboard_targets.is_manual THEN dashboard_targets.target_amount
        ELSE EXCLUDED.target_amount
      END,
      updated_at = CASE
        WHEN dashboard_targets.is_manual THEN dashboard_targets.updated_at
        ELSE NOW()
      END
    `,
    [ids, days, teams, counts, amounts]
  );
}

function toDateStr(v) {
  if (!v) return null;
  if (typeof v === "string") return v.slice(0, 10);
  if (v instanceof Date) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(v);
  }
  return String(v).slice(0, 10);
}

export async function syncFromS4S(periodDate, toDate) {
  await ensureNeonSchema();

  const fromStr =
    typeof periodDate === "string" && periodDate ? periodDate : istDateString();
  const toStr = toDate ? toDateStr(toDate) || fromStr : fromStr;
  const log = await neonPool.query(
    `INSERT INTO dashboard_sync_log (status, message) VALUES ('running', $1) RETURNING id`,
    [`Sync for ${fromStr}..${toStr}`]
  );
  const logId = log.rows[0].id;
  let upserted = 0;

  try {
    const [yy, mm] = toStr.split("-").map(Number);
    const [members, performance, missionDays] = await Promise.all([
      fetchMembers(),
      fetchPerformance(fromStr, toStr),
      fetchMonthMission(yy, mm)
    ]);

    if (members.length) {
      const ids = members.map((m) => m.partner_user_id);
      const names = members.map((m) => m.name);
      const emails = members.map((m) => m.email);
      const teams = members.map((m) => m.team);
      const roles = members.map((m) => m.role);
      const actives = members.map((m) => m.is_active);
      const reports = members.map((m) => m.reports_to);
      await neonPool.query(
        `
        INSERT INTO dashboard_members (
          partner_user_id, name, email, team, role, is_active, reports_to, updated_at
        )
        SELECT *, NOW() FROM UNNEST(
          $1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::bool[], $7::text[]
        ) AS t(partner_user_id, name, email, team, role, is_active, reports_to)
        ON CONFLICT (partner_user_id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          team = EXCLUDED.team,
          role = EXCLUDED.role,
          is_active = EXCLUDED.is_active,
          reports_to = EXCLUDED.reports_to,
          updated_at = NOW()
        `,
        [ids, names, emails, teams, roles, actives, reports]
      );
      upserted += members.length;
    }

    await neonPool.query(
      `
      INSERT INTO dashboard_members (
        partner_user_id, name, email, team, role, is_active, updated_at
      ) VALUES ($1, 'AUTO', 'auto@salary4sure.com', 'fresh', 'AUTO', TRUE, NOW())
      ON CONFLICT (partner_user_id) DO UPDATE SET
        name = 'AUTO',
        email = EXCLUDED.email,
        role = 'AUTO',
        is_active = TRUE,
        updated_at = NOW()
      `,
      [AUTO_USER_ID]
    );

    const missingIds = [
      ...new Set(
        performance
          .filter((p) => p.partner_user_id && p.partner_user_id !== AUTO_USER_ID)
          .map((p) => p.partner_user_id)
      )
    ];
    if (missingIds.length) {
      const existing = await neonPool.query(
        `SELECT partner_user_id FROM dashboard_members WHERE partner_user_id = ANY($1::text[])`,
        [missingIds]
      );
      const have = new Set(existing.rows.map((r) => r.partner_user_id));
      const need = missingIds.filter((id) => !have.has(id));
      if (need.length) {
        const { rows: users } = await s4sPool.query(
          `
          SELECT
            u.id::text AS id,
            u.name,
            u.email,
            BOOL_OR(prg.name ILIKE '%repeat%') AS is_repeat_support,
            BOOL_OR(prg.name ILIKE '%fresh%') AS is_fresh_support
          FROM partner_users u
          LEFT JOIN partner_user_role_groups purg ON purg."partnerUserId" = u.id
          LEFT JOIN partner_role_groups prg ON prg.id = purg."roleGroupId"
          WHERE u.id::text = ANY($1::text[])
          GROUP BY u.id
          `,
          [need.map(String)]
        );
        for (const u of users) {
          const team = teamFromPerformance(performance, u.id) || classifyTeam(u);
          await neonPool.query(
            `
            INSERT INTO dashboard_members (
              partner_user_id, name, email, team, role, is_active, updated_at
            ) VALUES ($1,$2,$3,$4,'CREDIT_EXECUTIVE',TRUE,NOW())
            ON CONFLICT (partner_user_id) DO NOTHING
            `,
            [String(u.id), u.name, (u.email || "").toLowerCase(), team]
          );
          upserted += 1;
        }
      }
    }

    await neonPool.query(
      `DELETE FROM dashboard_performance
       WHERE period_date >= $1::date AND period_date <= $2::date`,
      [fromStr, toStr]
    );

    if (performance.length) {
      const pIds = [];
      const pDays = [];
      const pTeams = [];
      const pCounts = [];
      const pAmounts = [];
      const pRaw = [];
      const pRecv = [];
      for (const p of performance) {
        pIds.push(p.partner_user_id);
        pDays.push(toDateStr(p.period_date) || fromStr);
        pTeams.push(p.team);
        pCounts.push(p.achieved_count);
        pAmounts.push(p.achieved_amount);
        pRaw.push(p.raw_repay_amount);
        pRecv.push(p.received_repay_amount);
      }
      await neonPool.query(
        `
        INSERT INTO dashboard_performance (
          partner_user_id, period_date, team,
          achieved_count, achieved_amount,
          raw_repay_amount, received_repay_amount, updated_at
        )
        SELECT *, NOW() FROM UNNEST(
          $1::text[], $2::date[], $3::text[], $4::int[], $5::float8[], $6::float8[], $7::float8[]
        ) AS t(
          partner_user_id, period_date, team,
          achieved_count, achieved_amount,
          raw_repay_amount, received_repay_amount
        )
        ON CONFLICT (partner_user_id, period_date, team) DO UPDATE SET
          achieved_count = EXCLUDED.achieved_count,
          achieved_amount = EXCLUDED.achieved_amount,
          raw_repay_amount = EXCLUDED.raw_repay_amount,
          received_repay_amount = EXCLUDED.received_repay_amount,
          updated_at = NOW()
        `,
        [pIds, pDays, pTeams, pCounts, pAmounts, pRaw, pRecv]
      );
      upserted += performance.length;
    }

    await ensureTargets(performance);

    await neonPool.query(
      `DELETE FROM dashboard_mission_daily
       WHERE period_date >= make_date($1::int, $2::int, 1)
         AND period_date < (make_date($1::int, $2::int, 1) + INTERVAL '1 month')`,
      [yy, mm]
    );

    if (missionDays.length) {
      const mDays = missionDays.map((d) => d.period_date);
      const mFreshA = missionDays.map((d) => d.fresh_amount);
      const mRepeatA = missionDays.map((d) => d.repeat_amount);
      const mFreshC = missionDays.map((d) => d.fresh_count);
      const mRepeatC = missionDays.map((d) => d.repeat_count);
      await neonPool.query(
        `
        INSERT INTO dashboard_mission_daily (
          period_date, fresh_amount, repeat_amount, fresh_count, repeat_count, updated_at
        )
        SELECT *, NOW() FROM UNNEST(
          $1::date[], $2::float8[], $3::float8[], $4::int[], $5::int[]
        ) AS t(period_date, fresh_amount, repeat_amount, fresh_count, repeat_count)
        ON CONFLICT (period_date) DO UPDATE SET
          fresh_amount = EXCLUDED.fresh_amount,
          repeat_amount = EXCLUDED.repeat_amount,
          fresh_count = EXCLUDED.fresh_count,
          repeat_count = EXCLUDED.repeat_count,
          updated_at = NOW()
        `,
        [mDays, mFreshA, mRepeatA, mFreshC, mRepeatC]
      );
      upserted += missionDays.length;
    }

    await neonPool.query(
      `UPDATE dashboard_sync_log
       SET status='ok', finished_at=NOW(), rows_upserted=$2, message=$3
       WHERE id=$1`,
      [logId, upserted, `Synced ${fromStr}..${toStr}`]
    );

    return { ok: true, periodDate: fromStr, toDate: toStr, upserted };
  } catch (err) {
    await neonPool.query(
      `UPDATE dashboard_sync_log SET status='error', finished_at=NOW(), message=$2 WHERE id=$1`,
      [logId, err.message]
    );
    throw err;
  }
}

/** Sync a date range in small chunks so full months (e.g. August) don't time out. */
export async function syncDateRange(periodDate, toDate) {
  const fromStr =
    typeof periodDate === "string" && periodDate ? periodDate : istDateString();
  const toStr = toDate ? toDateStr(toDate) || fromStr : fromStr;
  if (fromStr === toStr) return syncFromS4S(fromStr, toStr);

  const days = [];
  let cur = fromStr;
  while (cur <= toStr) {
    days.push(cur);
    const d = new Date(`${cur}T12:00:00+05:30`);
    d.setDate(d.getDate() + 1);
    cur = istDateString(d);
    if (days.length > 400) break;
  }

  const CHUNK = 5;
  if (days.length <= CHUNK) return syncFromS4S(fromStr, toStr);

  let upserted = 0;
  for (let i = 0; i < days.length; i += CHUNK) {
    const chunkFrom = days[i];
    const chunkTo = days[Math.min(i + CHUNK - 1, days.length - 1)];
    const result = await syncFromS4S(chunkFrom, chunkTo);
    upserted += result.upserted || 0;
  }

  await neonPool.query(
    `INSERT INTO dashboard_sync_log (status, finished_at, message, rows_upserted)
     VALUES ('ok', NOW(), $1, $2)`,
    [`Synced ${fromStr}..${toStr}`, upserted]
  );

  return { ok: true, periodDate: fromStr, toDate: toStr, upserted, chunked: true };
}

export { istDateString, s4sBusinessDate, AUTO_USER_ID };
