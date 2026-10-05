import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth.jsx";

export default function Login() {
  const { login, isAuthenticated, firstAllowedPath, pathForUser, booting } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (booting) {
    return (
      <div className="boot-screen">
        <div className="boot-logo">S4S</div>
        <p>Checking session…</p>
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to={firstAllowedPath} replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await login(email.trim(), password);
      navigate(pathForUser(user));
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-glow" />
      <motion.form
        className="login-card"
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="login-mark">S4S</div>
        <h1>Salary 4 Sure</h1>
        <p className="login-sub">Sign in to open your allowed buckets</p>

        <label>
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <div className="login-error">{error}</div>}

        <button type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Login"}
        </button>
      </motion.form>
    </div>
  );
}
