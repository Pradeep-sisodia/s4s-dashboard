import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { neonPool } from "./db.js";
import { ALL_BUCKET_KEYS, isAdminRole } from "./buckets.js";

const JWT_SECRET = process.env.AUTH_SECRET || "s4s-dashboard-dev-secret-change-me";
const TOKEN_DAYS = 7;

export async function ensureAuthSeed() {
  const { rows } = await neonPool.query(
    `SELECT id FROM dashboard_app_users WHERE app_role = 'SUPER' LIMIT 1`
  );
  if (rows.length) return;

  const id = randomUUID();
  const hash = await bcrypt.hash("Super@123", 10);
  await neonPool.query(
    `
    INSERT INTO dashboard_app_users (
      id, name, email, password_hash, app_role, is_active
    ) VALUES ($1, $2, $3, $4, 'SUPER', TRUE)
    `,
    [id, "Super Admin", "super@s4s.in", hash]
  );
  for (const key of ALL_BUCKET_KEYS) {
    await neonPool.query(
      `INSERT INTO dashboard_user_buckets (user_id, bucket) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [id, key]
    );
  }
  console.log("Seeded SUPER user: super@s4s.in / Super@123");
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.app_role, email: user.email },
    JWT_SECRET,
    { expiresIn: `${TOKEN_DAYS}d` }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export async function getUserByEmail(email) {
  const { rows } = await neonPool.query(
    `SELECT * FROM dashboard_app_users WHERE lower(email) = lower($1) LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

export async function getUserById(id) {
  const { rows } = await neonPool.query(
    `SELECT id, name, email, app_role, is_active, created_at, updated_at
     FROM dashboard_app_users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function getUserBuckets(userId, role) {
  if (isAdminRole(role)) return [...ALL_BUCKET_KEYS];
  const { rows } = await neonPool.query(
    `SELECT bucket FROM dashboard_user_buckets WHERE user_id = $1 ORDER BY bucket`,
    [userId]
  );
  return rows.map((r) => r.bucket);
}

export async function publicUser(user) {
  if (!user) return null;
  const buckets = await getUserBuckets(user.id, user.app_role);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.app_role,
    buckets,
    isAdmin: isAdminRole(user.app_role),
    is_active: user.is_active !== false
  };
}

export async function login(email, password) {
  const user = await getUserByEmail(email);
  if (!user || !user.is_active) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }
  const token = signToken(user);
  return { token, user: await publicUser(user) };
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Login required" });
  }
  try {
    const payload = verifyToken(token);
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Session expired. Please login again." });
  }
}

export async function attachUser(req, res, next) {
  try {
    const user = await getUserById(req.auth.sub);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: "User inactive or missing" });
    }
    req.user = user;
    req.userPublic = await publicUser(user);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireBucket(bucketKey) {
  return (req, res, next) => {
    const buckets = req.userPublic?.buckets || [];
    if (isAdminRole(req.user.app_role) || buckets.includes(bucketKey)) {
      return next();
    }
    return res.status(403).json({ error: `No access to bucket: ${bucketKey}` });
  };
}

export function requireAdmin(req, res, next) {
  if (!isAdminRole(req.user?.app_role)) {
    return res.status(403).json({ error: "Only ADMIN or SUPER can do this" });
  }
  next();
}

export async function createUser({ name, email, password, app_role, buckets }, actorId) {
  if (!["SUPER", "ADMIN", "USER"].includes(app_role)) {
    const err = new Error("Invalid role");
    err.status = 400;
    throw err;
  }
  const existing = await getUserByEmail(email);
  if (existing) {
    const err = new Error("Email already exists");
    err.status = 409;
    throw err;
  }
  const id = randomUUID();
  const hash = await bcrypt.hash(password, 10);
  await neonPool.query(
    `
    INSERT INTO dashboard_app_users (
      id, name, email, password_hash, app_role, is_active, created_by
    ) VALUES ($1,$2,$3,$4,$5,TRUE,$6)
    `,
    [id, name, email.toLowerCase(), hash, app_role, actorId || null]
  );

  const list = isAdminRole(app_role)
    ? ALL_BUCKET_KEYS
    : [...new Set((buckets || []).filter((b) => ALL_BUCKET_KEYS.includes(b)))];

  for (const key of list) {
    await neonPool.query(
      `INSERT INTO dashboard_user_buckets (user_id, bucket) VALUES ($1,$2)
       ON CONFLICT DO NOTHING`,
      [id, key]
    );
  }
  return publicUser(await getUserById(id));
}

export async function updateUserAccess(userId, { buckets, app_role, is_active, name, password }, actor) {
  const user = await getUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  if (user.app_role === "SUPER" && actor.app_role !== "SUPER") {
    const err = new Error("Only SUPER can edit SUPER users");
    err.status = 403;
    throw err;
  }

  const fields = [];
  const vals = [];
  let i = 1;
  if (name) {
    fields.push(`name = $${i++}`);
    vals.push(name);
  }
  if (typeof is_active === "boolean") {
    fields.push(`is_active = $${i++}`);
    vals.push(is_active);
  }
  if (app_role && ["SUPER", "ADMIN", "USER"].includes(app_role)) {
    if (app_role === "SUPER" && actor.app_role !== "SUPER") {
      const err = new Error("Only SUPER can assign SUPER role");
      err.status = 403;
      throw err;
    }
    fields.push(`app_role = $${i++}`);
    vals.push(app_role);
  }
  if (password) {
    fields.push(`password_hash = $${i++}`);
    vals.push(await bcrypt.hash(password, 10));
  }
  if (fields.length) {
    fields.push(`updated_at = NOW()`);
    vals.push(userId);
    await neonPool.query(
      `UPDATE dashboard_app_users SET ${fields.join(", ")} WHERE id = $${i}`,
      vals
    );
  }

  if (Array.isArray(buckets)) {
    const role = app_role || user.app_role;
    await neonPool.query(`DELETE FROM dashboard_user_buckets WHERE user_id = $1`, [userId]);
    const list = isAdminRole(role)
      ? ALL_BUCKET_KEYS
      : [...new Set(buckets.filter((b) => ALL_BUCKET_KEYS.includes(b)))];
    for (const key of list) {
      await neonPool.query(
        `INSERT INTO dashboard_user_buckets (user_id, bucket) VALUES ($1,$2)`,
        [userId, key]
      );
    }
  }

  return publicUser(await getUserById(userId));
}

export async function listUsers() {
  const { rows } = await neonPool.query(
    `SELECT id, name, email, app_role, is_active, created_at, updated_at
     FROM dashboard_app_users
     ORDER BY
       CASE app_role WHEN 'SUPER' THEN 0 WHEN 'ADMIN' THEN 1 ELSE 2 END,
       name`
  );
  const out = [];
  for (const u of rows) {
    out.push(await publicUser(u));
  }
  return out;
}
