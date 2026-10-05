const API = "";
const TOKEN_KEY = "s4s_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function loginRequest(email, password) {
  return api("/api/auth/login", { method: "POST", body: { email, password }, auth: false });
}

export async function fetchMe() {
  return api("/api/auth/me");
}

export async function fetchDashboard({ from, to, force } = {}) {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  if (force) q.set("force", "1");
  const suffix = q.toString() ? `?${q}` : "";
  return api(`/api/dashboard${suffix}`);
}

export async function fetchLeaderboard({ from, to } = {}) {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  const suffix = q.toString() ? `?${q}` : "";
  return api(`/api/leaderboard${suffix}`);
}

export async function fetchTargets(date) {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  return api(`/api/targets${q}`);
}

export async function saveTargets(payload) {
  return api("/api/targets", { method: "PUT", body: payload });
}

export async function saveMissionTarget(mission_target_cr) {
  return api("/api/config/mission", { method: "PUT", body: { mission_target_cr } });
}

export async function fetchUsers() {
  return api("/api/users");
}

export async function createUserRequest(payload) {
  return api("/api/users", { method: "POST", body: payload });
}

export async function updateUserRequest(id, payload) {
  return api(`/api/users/${id}`, { method: "PATCH", body: payload });
}

export async function fetchBuckets() {
  return api("/api/buckets", { auth: false });
}
