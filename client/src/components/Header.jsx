import { useEffect, useState } from "react";
import { Bell, CalendarDays, Menu } from "lucide-react";

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
}

export default function Header({ user, people, onMenu }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn" onClick={onMenu} aria-label="Toggle menu">
          <Menu size={18} />
        </button>
        <span className="live-pill">
          <span className="live-dot" />
          LIVE
        </span>
        <div className="people-row">
          {(people || []).map((p) => (
            <div className="people-chip" key={p.email}>
              <span className={`status-dot ${p.online ? "on" : ""}`} />
              <span className="people-avatar">{initials(p.name)}</span>
              <div>
                <strong>{p.name}</strong>
                <small>{p.email}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="topbar-right">
        <button className="icon-btn">
          <Bell size={18} />
          <span className="badge">3</span>
        </button>
        <button className="icon-btn">
          <CalendarDays size={18} />
        </button>
        <div className="clock">{now.toLocaleTimeString("en-IN")}</div>
        <div className="user-chip">
          <div className="user-avatar">{initials(user?.name)}</div>
          <div>
            <strong>{user?.name}</strong>
            <small>{user?.role}</small>
          </div>
        </div>
      </div>
    </header>
  );
}
