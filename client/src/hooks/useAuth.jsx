import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchMe, getToken, loginRequest, setToken } from "../api.js";

const AuthContext = createContext(null);

const PATH_BUCKET = {
  "/": "dashboard",
  "/fresh": "fresh",
  "/repeat": "repeat",
  "/leaderboard": "leaderboard",
  "/analytics": "analytics",
  "/reports": "reports",
  "/targets": "targets",
  "/alerts": "alerts",
  "/settings": "settings",
  "/users": "users"
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setBooting(false);
      return null;
    }
    try {
      const { user: me } = await fetchMe();
      setUser(me);
      return me;
    } catch {
      setToken("");
      setUser(null);
      return null;
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const result = await loginRequest(email, password);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    setToken("");
    setUser(null);
  }, []);

  const canAccess = useCallback(
    (bucketOrPath) => {
      if (!user) return false;
      if (user.isAdmin) return true;
      const bucket = PATH_BUCKET[bucketOrPath] || bucketOrPath;
      return (user.buckets || []).includes(bucket);
    },
    [user]
  );

  const pathForUser = useCallback((u) => {
    if (!u) return "/login";
    const order = [
      ["dashboard", "/"],
      ["fresh", "/fresh"],
      ["repeat", "/repeat"],
      ["leaderboard", "/leaderboard"],
      ["analytics", "/analytics"],
      ["reports", "/reports"],
      ["targets", "/targets"],
      ["alerts", "/alerts"],
      ["settings", "/settings"],
      ["users", "/users"]
    ];
    if (u.isAdmin) return "/";
    for (const [key, path] of order) {
      if ((u.buckets || []).includes(key)) return path;
    }
    return "/settings";
  }, []);

  const firstAllowedPath = useMemo(() => pathForUser(user), [user, pathForUser]);

  const value = {
    user,
    booting,
    login,
    logout,
    refresh,
    canAccess,
    pathForUser,
    firstAllowedPath,
    isAuthenticated: Boolean(user)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

export { PATH_BUCKET };
