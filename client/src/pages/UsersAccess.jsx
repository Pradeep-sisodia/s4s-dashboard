import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createUserRequest, fetchUsers, updateUserRequest } from "../api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { Navigate } from "react-router-dom";

const EMPTY = {
  name: "",
  email: "",
  password: "",
  app_role: "USER",
  buckets: ["dashboard"]
};

export default function UsersAccess() {
  const { user, canAccess, firstAllowedPath } = useAuth();
  const [users, setUsers] = useState([]);
  const [buckets, setBuckets] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const res = await fetchUsers();
      setUsers(res.users || []);
      setBuckets(res.buckets || []);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (canAccess("users") || user?.isAdmin) load();
  }, [canAccess, user?.isAdmin]);

  if (!canAccess("users") && !user?.isAdmin) {
    return <Navigate to={firstAllowedPath} replace />;
  }

  function toggleBucket(key) {
    setForm((f) => {
      const has = f.buckets.includes(key);
      return {
        ...f,
        buckets: has ? f.buckets.filter((b) => b !== key) : [...f.buckets, key]
      };
    });
  }

  async function onCreate(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await createUserRequest(form);
      setForm(EMPTY);
      setMsg("User created");
      await load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEdit(e) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setMsg("");
    try {
      await updateUserRequest(editing.id, {
        name: editing.name,
        app_role: editing.role,
        is_active: editing.is_active !== false,
        buckets: editing.buckets,
        password: editing.password || undefined
      });
      setEditing(null);
      setMsg("Access updated");
      await load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin only</p>
          <h1>USERS & BUCKET ACCESS</h1>
        </div>
      </div>

      {msg && <p className="pad">{msg}</p>}

      <section className="table-card pad">
        <h3>Create user + assign buckets</h3>
        <p className="muted-note">Only SUPER / ADMIN can create users and give bucket access.</p>
        <form className="user-form" onSubmit={onCreate}>
          <label>
            <span>Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            <span>Email</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              required
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          <label>
            <span>Role</span>
            <select
              value={form.app_role}
              onChange={(e) => setForm({ ...form, app_role: e.target.value })}
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
              {user?.role === "SUPER" && <option value="SUPER">SUPER</option>}
            </select>
          </label>

          <div className="bucket-grid">
            {buckets.map((b) => (
              <label key={b.key} className="bucket-chip">
                <input
                  type="checkbox"
                  checked={form.app_role !== "USER" || form.buckets.includes(b.key)}
                  disabled={form.app_role !== "USER"}
                  onChange={() => toggleBucket(b.key)}
                />
                {b.label}
              </label>
            ))}
          </div>

          <button className="date-apply" disabled={busy} type="submit">
            Create User
          </button>
        </form>
      </section>

      <section className="table-card">
        <div className="table-head">
          <h3>All users</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Buckets</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <div className="bucket-tags">
                      {(u.buckets || []).map((b) => (
                        <span key={b}>{b}</span>
                      ))}
                    </div>
                  </td>
                  <td>{u.is_active === false ? "No" : "Yes"}</td>
                  <td>
                    <button
                      className="linkish"
                      type="button"
                      onClick={() =>
                        setEditing({
                          ...u,
                          is_active: u.is_active !== false,
                          password: ""
                        })
                      }
                    >
                      Edit access
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing && (
        <section className="table-card pad">
          <h3>Edit access — {editing.email}</h3>
          <form className="user-form" onSubmit={onSaveEdit}>
            <label>
              <span>Name</span>
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </label>
            <label>
              <span>Role</span>
              <select
                value={editing.role}
                onChange={(e) => setEditing({ ...editing, role: e.target.value })}
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
                {user?.role === "SUPER" && <option value="SUPER">SUPER</option>}
              </select>
            </label>
            <label>
              <span>New password (optional)</span>
              <input
                type="password"
                value={editing.password || ""}
                onChange={(e) => setEditing({ ...editing, password: e.target.value })}
              />
            </label>
            <label className="bucket-chip">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
              />
              Active
            </label>

            <div className="bucket-grid">
              {buckets.map((b) => (
                <label key={b.key} className="bucket-chip">
                  <input
                    type="checkbox"
                    checked={editing.role !== "USER" || (editing.buckets || []).includes(b.key)}
                    disabled={editing.role !== "USER"}
                    onChange={() => {
                      const has = (editing.buckets || []).includes(b.key);
                      setEditing({
                        ...editing,
                        buckets: has
                          ? editing.buckets.filter((x) => x !== b.key)
                          : [...(editing.buckets || []), b.key]
                      });
                    }}
                  />
                  {b.label}
                </label>
              ))}
            </div>

            <div className="row-actions">
              <button className="date-apply" type="submit" disabled={busy}>
                Save
              </button>
              <button type="button" className="linkish" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
    </motion.div>
  );
}
