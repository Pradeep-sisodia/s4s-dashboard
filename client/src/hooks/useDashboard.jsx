import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { fetchDashboard } from "../api.js";

const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [range, setRange] = useState({ from: "", to: "" });
  const hasDataRef = useRef(false);
  const rangeRef = useRef(range);
  rangeRef.current = range;

  const load = useCallback(async (nextRange = { from: "", to: "" }, force = false) => {
    if (hasDataRef.current) setRefreshing(true);
    else setLoading(true);

    try {
      const json = await fetchDashboard({
        from: nextRange.from || undefined,
        to: nextRange.to || undefined,
        force
      });
      setData(json);
      hasDataRef.current = true;
      setError(null);
      const from = nextRange.from || json?.meta?.fromDate || "";
      const to = nextRange.to || json?.meta?.toDate || from;
      if (from) setRange({ from, to });
    } catch (err) {
      if (err.status === 401) {
        localStorage.removeItem("s4s_token");
      }
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load({ from: "", to: "" }, false);
  }, [load]);

  // Soft live refresh for current range (no force)
  useEffect(() => {
    const id = setInterval(() => {
      if (!hasDataRef.current) return;
      const cur = rangeRef.current;
      load({ from: cur.from || "", to: cur.to || "" }, false);
    }, 45_000);
    return () => clearInterval(id);
  }, [load]);

  const applyRange = useCallback(
    (from, to, { force = true } = {}) => {
      const next = { from, to: to || from };
      setRange(next);
      return load(next, force);
    },
    [load]
  );

  return (
    <DashboardContext.Provider
      value={{
        data,
        loading,
        refreshing,
        error,
        range,
        applyRange,
        reload: load
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside provider");
  return ctx;
}
