import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarRange } from "lucide-react";
import { useDashboard } from "../hooks/useDashboard.jsx";
import KpiCards from "../components/KpiCards.jsx";
import MissionBar from "../components/MissionBar.jsx";
import TopPerformers from "../components/TopPerformers.jsx";
import PerformanceTable from "../components/PerformanceTable.jsx";

function formatLabel(iso) {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00+05:30`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function monthValueFromIso(iso) {
  if (!iso || iso.length < 7) return "";
  return iso.slice(0, 7);
}

function monthBounds(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return null;
  const [y, m] = ym.split("-").map(Number);
  const from = `${ym}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${ym}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export default function Dashboard() {
  const { data, range, applyRange, refreshing } = useDashboard();
  const [mode, setMode] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [month, setMonth] = useState("");

  useEffect(() => {
    if (range.from) setFrom(range.from);
    if (range.to) setTo(range.to);
    if (range.from) setMonth(monthValueFromIso(range.from));
  }, [range.from, range.to]);

  const activeFrom = range.from || data?.meta?.fromDate || "";
  const activeTo = range.to || data?.meta?.toDate || activeFrom;

  const kpis = useMemo(() => {
    if (mode === "fresh") return data.freshTotals;
    if (mode === "repeat") return data.repeatTotals;
    if (mode === "auto") return data.autoTotals || data.kpis;
    return data.kpis;
  }, [mode, data]);

  const isRange = Boolean(activeFrom && activeTo && activeFrom !== activeTo);
  const title = isRange
    ? "DRR Sanction Team Performance"
    : "Today DRR Sanction Team Performance";

  function onApply(e) {
    e?.preventDefault?.();
    const start = from || activeFrom;
    if (!start) return;
    const end = to || start;
    applyRange(start, end < start ? start : end, { force: true });
  }

  function onMonthChange(ym) {
    setMonth(ym);
    const bounds = monthBounds(ym);
    if (!bounds) return;
    setFrom(bounds.from);
    setTo(bounds.to);
  }

  function applyMonth() {
    const bounds = monthBounds(month) || monthBounds(monthValueFromIso(from));
    if (!bounds) return;
    setFrom(bounds.from);
    setTo(bounds.to);
    applyRange(bounds.from, bounds.to, { force: true });
  }

  function applyToday() {
    const d = todayIso();
    setFrom(d);
    setTo(d);
    setMonth(monthValueFromIso(d));
    applyRange(d, d, { force: true });
  }

  const emptyTotals = {
    achievedCount: 0,
    achievedAmount: 0,
    rawRepayAmount: 0,
    receivedRepayAmount: 0,
    repayPct: 0,
    achievementPct: 0,
    targetCount: 0,
    targetAmount: 0
  };

  return (
    <div className="dash-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{isRange ? "Date range view" : "Today DRR command center"}</p>
          <h1>{title}</h1>
          <div className="status-bar">
            <span>{isRange ? "RANGE" : "TODAY"} · AS ON {formatLabel(activeTo)}</span>
            <span>
              {formatLabel(activeFrom)}
              {activeFrom !== activeTo ? ` → ${formatLabel(activeTo)}` : ""}
            </span>
            <span>VIEW {mode.toUpperCase()}</span>
          </div>
        </div>

        <div className="filters">
          <div className="seg">
            {["all", "fresh", "repeat", "auto"].map((key) => (
              <button key={key} className={mode === key ? "on" : ""} onClick={() => setMode(key)}>
                {key.toUpperCase()}
              </button>
            ))}
          </div>

          <form className="date-range" onSubmit={onApply}>
            <div className="date-range-label">
              <CalendarRange size={16} />
              <span>Month / Range</span>
            </div>
            <label>
              <span>Month</span>
              <input
                type="month"
                value={month}
                onChange={(e) => onMonthChange(e.target.value)}
              />
            </label>
            <label>
              <span>From</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              <span>To</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <button type="button" className="date-apply ghost" disabled={refreshing} onClick={applyToday}>
              Today
            </button>
            <button type="button" className="date-apply ghost" disabled={refreshing || !month} onClick={applyMonth}>
              Full Month
            </button>
            <button type="submit" className="date-apply" disabled={refreshing}>
              {refreshing ? "Loading…" : "Apply Range"}
            </button>
          </form>
        </div>
      </div>

      {refreshing && (
        <p className="range-loading">Range data load ho raha hai — pehli baar month sync thoda time le sakta hai…</p>
      )}

      <KpiCards kpis={kpis} />
      <MissionBar mission={data.mission} />
      <TopPerformers
        fresh={data.topFresh}
        repeat={data.topRepeat}
        freshTeam={data.freshTeam}
        repeatTeam={data.repeatTeam}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={mode + activeFrom + activeTo}
          className={`tables-grid ${mode === "auto" ? "single-table" : ""}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {(mode === "all" || mode === "fresh") && (
            <PerformanceTable
              title="FRESH TEAM PERFORMANCE"
              rows={data.freshTeam}
              totals={data.freshTotals}
              variant="fresh"
            />
          )}
          {(mode === "all" || mode === "repeat") && (
            <PerformanceTable
              title="REPEAT TEAM PERFORMANCE"
              rows={data.repeatTeam}
              totals={data.repeatTotals}
              variant="repeat"
            />
          )}
          {mode === "auto" && (
            <PerformanceTable
              title="AUTO PERFORMANCE"
              rows={[data.autoFresh, data.autoRepeat].filter(Boolean)}
              totals={data.autoTotals || emptyTotals}
              variant="auto"
            />
          )}
        </motion.div>
      </AnimatePresence>

      <footer className="thanks">★ THANK YOU & KEEP UP THE GOOD WORK! ★</footer>
    </div>
  );
}
