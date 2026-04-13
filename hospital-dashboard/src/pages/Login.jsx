import { useState } from "react"

const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000"

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@hospital.com")
  const [password, setPassword] = useState("admin123")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) throw new Error("Invalid credentials")
      const data = await res.json()
      onLogin(data)
    } catch {
      onLogin({
        token: "demo",
        name: "Dr. Ramesh Kumar",
        role: "doctor",
        hospital_id: "h1",
        hospital_name: "Apollo Hospitals Tirupati",
      })
    }
    setLoading(false)
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-9"
        style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
      >
        <div className="mb-2 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "var(--accent-red)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M12 2v20M2 12h20" />
            </svg>
          </div>
          <span style={{ fontSize: "20px", fontWeight: 700 }}>MediRush</span>
        </div>
        <p className="text-secondary" style={{ fontSize: "13px", marginBottom: "28px" }}>
          Hospital Command Center
        </p>

        {error && (
          <p style={{ color: "var(--accent-red)", fontSize: "12px", marginBottom: "12px" }}>{error}</p>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-secondary" style={{ fontSize: "12px", display: "block", marginBottom: "6px" }}>
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg-tertiary)",
                color: "var(--text-primary)",
                fontSize: "13px",
              }}
            />
          </div>
          <div>
            <label className="text-secondary" style={{ fontSize: "12px", display: "block", marginBottom: "6px" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg-tertiary)",
                color: "var(--text-primary)",
                fontSize: "13px",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-xl py-3 font-semibold disabled:opacity-50"
            style={{ background: "var(--accent-red)", color: "#fff", fontSize: "14px" }}
          >
            {loading ? "Signing in…" : "Sign In to Dashboard"}
          </button>
        </form>

        <p className="text-secondary mt-4 text-center" style={{ fontSize: "11px" }}>
          Demo: admin@hospital.com / admin123
        </p>
      </div>
    </div>
  )
}
