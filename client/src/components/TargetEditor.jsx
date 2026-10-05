import { useEffect, useMemo, useState } from "react";
import { fetchTargets, saveMissionTarget, saveTargets } from "../api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useDashboard } from "../hooks/useDashboard.jsx";
import MissionBar from "./MissionBar.jsx";

export default function TargetEditor({ title = "Edit targets", showMission = true }) {
  const { data, range, applyRange } = useDashboard();
  const { user } = useAuth();
  const [date, setDate] = useState(range.from || data?.meta?.fromDate || "");
  const [rows, setRows] = useState([]);
  const [missionCr, setMissionCr] = useState(data?.mission?.targetCr || 27);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const canEdit =
    user?.isAdmin ||
    (user?.buckets || []).includes("targets") ||
    (user?.buckets || []).includes("settings");

  async function load(d = date) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetchTargets(d);
      setDate(res.date);
      setRows(
        (res.rows || []).map((r) => ({
          ...r,
          targetCount: Number(r.targetCount || 0),
          targetAmount: Number(r.targetAmount || 0)
        }))
      );
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load(date || data?.meta?.fromDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.name?.toLowerCase().includes(term) ||
        r.email?.toLowerCase().includes(term) ||
        r.team?.toLowerCase().includes(term)
    );
  }, [rows, q]);

  const freshRows = useMemo(() => filtered.filter((r) => r.team === "fresh"), [filtered]);
  const repeatRows = useMemo(() => filtered.filter((r) => r.team === "repeat"), [filtered]);

  function updateRow(id, team, field, value) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id && r.team === team
          ? { ...r, [field]: Number(value), dirty: true }
          : r
      )
    );
  }

  async function onSave() {
    if (!canEdit) return;
    setBusy(true);
    setMsg("");
    try {
      const dirty = rows.filter((r) => r.dirty);
      if (dirty.length) {
        await saveTargets({
          date,
          items: dirty.map((r) => ({
            id: r.id,
            team: r.team,
            targetCount: r.targetCount,
            targetAmount: r.targetAmount
          }))
        });
      }
      if (user?.isAdmin && showMission) {
        await saveMissionTarget(missionCr);
      }
      setMsg(dirty.length ? `Saved ${dirty.length} target(s)` : "Nothing changed");
      await load(date);
      if (applyRange) await applyRange(date, date);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  function TargetTable({ heading, list }) {
    return (
      <section className="table-card">
        <div className="table-head">
          <h3>{heading}</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Target Cases</th>
                <th>Target Amount (₹)</th>
                <th>Cases Done</th>
                <th>Sanction</th>
                <th>Manual</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={6}>No matching people</td>
                </tr>
              )}
              {list.map((r) => (
                <tr key={`${r.id}-${r.team}`} className={r.name === "AUTO" ? "row-auto" : ""}>
                  <td className="emp">
                    <b>{r.name}</b>
                    <small>{r.email}</small>
                  </td>
                  <td>
                    <input
                      className="target-input"
                      type="number"
                      min="0"
                      disabled={!canEdit || r.name === "AUTO"}
                      value={r.targetCount}
                      onChange={(e) => updateRow(r.id, r.team, "targetCount", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="target-input"
                      type="number"
                      min="0"
                      step="1000"
                      disabled={!canEdit || r.name === "AUTO"}
                      value={r.targetAmount}
                      onChange={(e) => updateRow(r.id, r.team, "targetAmount", e.target.value)}
                    />
                  </td>
                  <td>{r.achievedCount}</td>
                  <td>₹{Number(r.achievedAmount || 0).toLocaleString("en-IN")}</td>
                  <td>{r.isManual ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <div className="target-editor">
      <div className="page-head">
        <div>
          <p className="eyebrow">Anyone ka target</p>
          <h2 className="settings-subhead">{title}</h2>
        </div>
        <div className="filters">
          <form
            className="date-range"
            onSubmit={(e) => {
              e.preventDefault();
              load(date);
            }}
          >
            <label>
              <span>Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label>
              <span>Search</span>
              <input
                type="search"
                placeholder="Name / email"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <button type="submit" className="date-apply" disabled={busy}>
              Load
            </button>
            {canEdit && (
              <button type="button" className="date-apply" disabled={busy} onClick={onSave}>
                {busy ? "Saving…" : "Save Targets"}
              </button>
            )}
          </form>
        </div>
      </div>

      {!canEdit && (
        <p className="muted-note pad">
          Target edit ke liye ADMIN / SUPER ya settings/targets bucket chahiye.
        </p>
      )}

      {showMission && data?.mission && <MissionBar mission={data.mission} />}

      {showMission && user?.isAdmin && (
        <section className="table-card pad mission-edit">
          <h3>Monthly mission target (Cr)</h3>
          <div className="mission-edit-row">
            <input
              className="target-input"
              type="number"
              min="1"
              step="0.1"
              value={missionCr}
              onChange={(e) => setMissionCr(Number(e.target.value))}
            />
            <span>Cr</span>
          </div>
        </section>
      )}

      {msg && <p className="pad">{msg}</p>}

      <div className="tables-grid">
        <TargetTable heading="FRESH — Target Cases & Amount" list={freshRows} />
        <TargetTable heading="REPEAT — Target Cases & Amount" list={repeatRows} />
      </div>
    </div>
  );
}
