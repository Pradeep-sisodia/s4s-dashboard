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

function formatToday(iso) {
  if (!iso) {
    return new Date().toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }
  return new Date(`${iso}T12:00:00+05:30`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export default function Header({ user, asOnDate, onMenu, onLogout }) {
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
        <span className="today-pill">
          <CalendarDays size={14} />
          TODAY
          <strong>{formatToday(asOnDate)}</strong>
        </span>
      </div>
      <div className="topbar-right">
        <button className="icon-btn" type="button" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <div className="clock">{now.toLocaleTimeString("en-IN")}</div>
        <div className="user-chip">
          <div className="user-avatar">{initials(user?.name)}</div>
          <div>
            <strong>{user?.name}</strong>
            <small>{user?.role}</small>
          </div>
        </div>
        {onLogout && (
          <button type="button" className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
