export const BUCKETS = [
  { key: "dashboard", path: "/", label: "Dashboard" },
  { key: "fresh", path: "/fresh", label: "Fresh Team" },
  { key: "repeat", path: "/repeat", label: "Repeat Team" },
  { key: "leaderboard", path: "/leaderboard", label: "Leaderboard" },
  { key: "analytics", path: "/analytics", label: "Analytics" },
  { key: "reports", path: "/reports", label: "Reports" },
  { key: "targets", path: "/targets", label: "Targets" },
  { key: "alerts", path: "/alerts", label: "Alerts" },
  { key: "settings", path: "/settings", label: "Settings" },
  { key: "users", path: "/users", label: "Users & Access" }
];

export const ALL_BUCKET_KEYS = BUCKETS.map((b) => b.key);

export function pathToBucket(pathname = "/") {
  const clean = pathname.split("?")[0] || "/";
  if (clean === "/") return "dashboard";
  const hit = BUCKETS.find((b) => b.path !== "/" && clean.startsWith(b.path));
  return hit?.key || null;
}

export function isAdminRole(role) {
  return role === "SUPER" || role === "ADMIN";
}
