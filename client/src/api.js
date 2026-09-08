const API = "";

export async function fetchDashboard() {
  const res = await fetch(`${API}/api/dashboard`);
  if (!res.ok) throw new Error("Failed to load dashboard");
  return res.json();
}

export async function fetchLeaderboard() {
  const res = await fetch(`${API}/api/leaderboard`);
  if (!res.ok) throw new Error("Failed to load leaderboard");
  return res.json();
}
