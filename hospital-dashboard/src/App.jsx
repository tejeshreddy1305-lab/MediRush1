import { useState, useEffect } from "react"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import "./index.css"

export default function App() {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem("medirush_auth")
    return saved ? JSON.parse(saved) : null
  })

  const handleLogin = (data) => {
    localStorage.setItem("medirush_auth", JSON.stringify(data))
    setAuth(data)
  }

  const handleLogout = () => {
    localStorage.removeItem("medirush_auth")
    setAuth(null)
  }

  if (!auth) return <Login onLogin={handleLogin} />
  return <Dashboard auth={auth} onLogout={handleLogout} />
}