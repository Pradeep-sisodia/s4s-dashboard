import "dotenv/config";
import pg from "pg";

function makePool(prefix) {
  const ssl = String(process.env[`${prefix}_SSL`] || "").toLowerCase() === "true";
  return new pg.Pool({
    host: process.env[`${prefix}_HOST`],
    port: Number(process.env[`${prefix}_PORT`] || 5432),
    database: process.env[`${prefix}_NAME`],
    user: process.env[`${prefix}_USER`],
    password: process.env[`${prefix}_PASSWORD`],
    ssl: ssl ? { rejectUnauthorized: false } : false,
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 30_000
  });
}

export const s4sPool = makePool("S4S_DB");
export const neonPool = makePool("NEON_DB");

let schemaReady = false;

export async function ensureNeonSchema() {
  if (schemaReady) return;
  await neonPool.query(`
    CREATE TABLE IF NOT EXISTS dashboard_config (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS dashboard_members (
      partner_user_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      team TEXT NOT NULL CHECK (team IN ('fresh', 'repeat')),
      role TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      reports_to TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS dashboard_targets (
      partner_user_id TEXT NOT NULL,
      period_date DATE NOT NULL,
      team TEXT NOT NULL CHECK (team IN ('fresh', 'repeat')),
      target_count INTEGER NOT NULL DEFAULT 0,
      target_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (partner_user_id, period_date, team)
    );

    CREATE TABLE IF NOT EXISTS dashboard_performance (
      partner_user_id TEXT NOT NULL,
      period_date DATE NOT NULL,
      team TEXT NOT NULL CHECK (team IN ('fresh', 'repeat')),
      achieved_count INTEGER NOT NULL DEFAULT 0,
      achieved_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      raw_repay_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      received_repay_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (partner_user_id, period_date, team)
    );

    CREATE TABLE IF NOT EXISTS dashboard_mission_daily (
      period_date DATE PRIMARY KEY,
      fresh_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      repeat_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      fresh_count INTEGER NOT NULL DEFAULT 0,
      repeat_count INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS dashboard_sync_log (
      id BIGSERIAL PRIMARY KEY,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      status TEXT NOT NULL,
      message TEXT,
      rows_upserted INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS dashboard_app_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      app_role TEXT NOT NULL CHECK (app_role IN ('SUPER', 'ADMIN', 'USER')),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS dashboard_user_buckets (
      user_id TEXT NOT NULL REFERENCES dashboard_app_users(id) ON DELETE CASCADE,
      bucket TEXT NOT NULL,
      PRIMARY KEY (user_id, bucket)
    );
  `);

  await neonPool.query(`
    ALTER TABLE dashboard_performance
      ADD COLUMN IF NOT EXISTS raw_repay_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS received_repay_amount DOUBLE PRECISION NOT NULL DEFAULT 0
  `);

  await neonPool.query(`
    ALTER TABLE dashboard_targets
      ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await neonPool.query(
    `INSERT INTO dashboard_config (key, value)
     VALUES ('mission_target_cr', '27'::jsonb),
            ('default_daily_target_count', '30'::jsonb),
            ('default_daily_target_amount', '1000000'::jsonb)
     ON CONFLICT (key) DO NOTHING`
  );

  await neonPool.query(
    `INSERT INTO dashboard_config (key, value)
     VALUES ('fresh_daily_target_count', '12'::jsonb),
            ('fresh_daily_target_amount', '350000'::jsonb),
            ('repeat_daily_target_count', '100'::jsonb),
            ('repeat_daily_target_amount', '2500000'::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`
  );
  schemaReady = true;
}
