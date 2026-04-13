import { useEffect, useMemo, useRef, useState } from "react"
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api"
import { motion } from "framer-motion"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import AlertCard from "../components/AlertCard"

const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000"
const WS_BASE = import.meta.env.VITE_WS_BASE || "ws://localhost:8000"

function HospitalMap({ apiKey, patientPos, hospitalPos }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "medirush-hospital-map",
    googleMapsApiKey: apiKey,
    libraries: ["places"],
  })
  if (loadError || !isLoaded) {
    return (
      <iframe
        title="map"
        className="h-full w-full border-0"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${patientPos.lng - 0.02},${patientPos.lat - 0.02},${patientPos.lng + 0.02},${patientPos.lat + 0.02}&layer=mapnik&marker=${patientPos.lat},${patientPos.lng}`}
      />
    )
  }
  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={patientPos}
      zoom={13}
      options={{ disableDefaultUI: true, gestureHandling: "greedy" }}
    >
      <Marker position={patientPos} />
      <Marker position={hospitalPos} />
    </GoogleMap>
  )
}

export default function Dashboard({ auth, onLogout }) {
  const key = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim()

  const [alerts, setAlerts] = useState([])
  const [active, setActive] = useState(null)
  const [accepted, setAccepted] = useState({})
  const [wsConnected, setWsConnected] = useState(false)
  const [patientPos, setPatientPos] = useState({ lat: 13.6288, lng: 79.4192 })
  const [beds, setBeds] = useState({ er_total: 200, er_occ: 155, icu_total: 28, icu_occ: 21 })
  const [staff, setStaff] = useState({ doctors: 4, nurses: 12, paramedics: 6 })
  const [doctorPick, setDoctorPick] = useState("Dr. Ramesh Kumar")
  const [stats, setStats] = useState(null)
  const [feedbackSummary, setFeedbackSummary] = useState(null)
  const [staffList, setStaffList] = useState([])
  const [bloodRows, setBloodRows] = useState([])
  const [bays, setBays] = useState([
    { id: "1", status: "occupied", label: "Ravi Kumar" },
    { id: "2", status: "available", label: "" },
    { id: "3", status: "cleaning", label: "" },
  ])
  const wsRef = useRef(null)

  const hospitalPos = useMemo(
    () => ({ lat: 13.6213, lng: 79.4091 }),
    []
  )

  const hid = auth.hospital_id || "h1"

  const loadAux = async () => {
    try {
      const [s, f, st, bb] = await Promise.all([
        fetch(`${BASE}/api/dashboard/stats/${hid}`).then((r) => r.json()),
        fetch(`${BASE}/api/feedback/hospital/${hid}/summary`).then((r) => r.json()),
        fetch(`${BASE}/api/staff/${hid}`).then((r) => r.json()),
        fetch(`${BASE}/api/blood-bank/hospital/${hid}`).then((r) => r.json()),
      ])
      setStats(s)
      setFeedbackSummary(f)
      setStaffList(Array.isArray(st) ? st : [])
      setBloodRows(Array.isArray(bb) ? bb : [])
      if (s?.bays?.length) setBays(s.bays)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadAux()
  }, [hid])

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(`${WS_BASE}/ws/hospital/${hid}`)
      ws.onopen = () => setWsConnected(true)
      ws.onclose = () => {
        setWsConnected(false)
        window.setTimeout(connect, 3000)
      }
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === "EMERGENCY_ALERT") {
            const etaSec = msg.eta_seconds || 600
            const newAlert = {
              id: `${Date.now()}`,
              name: msg.patient?.name || "Unknown",
              age: msg.patient?.age || "—",
              sex: msg.patient?.sex || "—",
              condition: msg.condition,
              severity: msg.severity,
              score: msg.priority_score,
              eta_seconds: etaSec,
              etaLabel: `${Math.floor(etaSec / 60)}:${String(etaSec % 60).padStart(2, "0")}`,
              token: msg.token,
              timestamp: "Just now",
              symptoms: msg.patient?.symptoms || [],
              allergies: msg.patient?.allergies || "None",
              bloodType: msg.patient?.blood_type || "—",
              conditions: msg.patient?.conditions || "None",
              meds: msg.patient?.medications || "None",
              lat: msg.patient?.lat || 13.628,
              lng: msg.patient?.lng || 79.419,
            }
            setAlerts((a) => [newAlert, ...a])
            setActive(newAlert)
          }
          if (msg.type === "LOCATION_UPDATE") {
            setPatientPos({ lat: msg.lat, lng: msg.lng })
          }
          if (msg.type === "STATS_UPDATE" && msg.stats) {
            setStats(msg.stats)
            if (msg.stats.bays?.length) setBays(msg.stats.bays)
          }
          if (msg.type === "AMBULANCE_DISPATCHED") {
            setAlerts((a) => [
              {
                id: `amb-${Date.now()}`,
                name: "Ambulance",
                age: "—",
                sex: "—",
                condition: `Dispatched · ETA ${Math.round((msg.eta_seconds || 0) / 60)} min`,
                severity: "CRITICAL",
                score: 10,
                eta_seconds: msg.eta_seconds || 0,
                etaLabel: `${Math.floor((msg.eta_seconds || 0) / 60)}:${String((msg.eta_seconds || 0) % 60).padStart(2, "0")}`,
                token: msg.token || "—",
                timestamp: "CAD",
                symptoms: [msg.registration || ""],
                allergies: "—",
                bloodType: "—",
                conditions: "—",
                meds: "—",
                lat: 13.628,
                lng: 79.419,
              },
              ...a,
            ])
          }
        } catch {
          // ignore
        }
      }
      wsRef.current = ws
    }
    connect()
    return () => wsRef.current?.close()
  }, [hid])

  const assignStaff = async (staffId) => {
    if (!active?.token) return
    try {
      await fetch(`${BASE}/api/staff/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id: staffId,
          token: active.token,
          hospital_id: hid,
        }),
      })
      loadAux()
    } catch {
      /* ignore */
    }
  }

  const persistBays = async (next) => {
    setBays(next)
    try {
      await fetch(`${BASE}/api/dashboard/bay-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospital_id: hid, bays: next }),
      })
    } catch {
      /* ignore */
    }
  }

  const toggleBay = (idx) => {
    const order = ["available", "occupied", "cleaning"]
    const next = bays.map((b, i) => {
      if (i !== idx) return b
      const ni = (order.indexOf(b.status) + 1) % order.length
      return { ...b, status: order[ni] }
    })
    persistBays(next)
  }

  const handleAccept = async (alert) => {
    try {
      await fetch(`${BASE}/api/accept_case`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: alert.token,
          doctor_name: doctorPick,
          hospital_name: auth.hospital_name || "Apollo Hospitals Tirupati",
        }),
      })
    } catch {
      // ignore
    }
    setAccepted((a) => ({ ...a, [alert.id]: true }))
  }

  const chartData = (stats?.cases_by_hour || []).map((v, h) => ({ h, v }))

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]"
      style={{ color: "var(--text-primary)" }}
    >
      <aside className="h-dash-sidebar flex flex-col px-4 py-6">
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "var(--accent-red)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M12 2v20M2 12h20" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: "15px", fontWeight: 600 }}>MediRush</p>
            <p className="text-secondary" style={{ fontSize: "12px" }}>
              {auth.hospital_name || "Hospital"}
            </p>
          </div>
        </div>
        <nav className="mt-8 space-y-2 text-secondary" style={{ fontSize: "14px" }}>
          <div className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
            Dashboard
          </div>
          <div className="px-3 py-2">Patients</div>
          <div className="px-3 py-2">Resources</div>
        </nav>
        <div className="mt-6 space-y-2 text-secondary" style={{ fontSize: "11px" }}>
          <p className="mr-caption text-secondary">BAY STATUS</p>
          {bays.map((b, idx) => (
            <button
              key={b.id}
              type="button"
              className="w-full rounded-lg border border-[var(--border)] px-2 py-2 text-left"
              onClick={() => toggleBay(idx)}
            >
              Bay {b.id}: {b.status.toUpperCase()}
              {b.label ? ` — ${b.label}` : ""}
            </button>
          ))}
        </div>
        <div className="mt-6 max-h-40 overflow-y-auto text-secondary" style={{ fontSize: "11px" }}>
          <p className="mr-caption text-secondary">STAFF</p>
          {(staffList || []).map((s) => (
            <div key={s.id} className="mb-2 rounded-lg border border-[var(--border)] px-2 py-1">
              <div className="font-semibold text-primary" style={{ fontSize: "12px" }}>
                {s.name}
              </div>
              <div>{s.role}</div>
              <div style={{ fontSize: "10px", color: "var(--accent-amber)" }}>{s.status}</div>
              {s.status === "available" && active?.token && (
                <button
                  type="button"
                  className="mt-1 w-full rounded py-1 text-[11px]"
                  style={{ background: "var(--accent-blue)", color: "#fff" }}
                  onClick={() => assignStaff(s.id)}
                >
                  Assign to case
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 max-h-36 overflow-y-auto text-secondary" style={{ fontSize: "11px" }}>
          <p className="mr-caption text-secondary">FEEDBACK</p>
          {feedbackSummary && (
            <>
              <p style={{ fontSize: "13px", color: "var(--accent-amber)" }}>
                ★ {feedbackSummary.avg_rating} ({feedbackSummary.total_responses})
              </p>
              <p>{feedbackSummary.would_recommend_pct}% recommend</p>
            </>
          )}
        </div>
        <div className="mt-auto space-y-2 border-t border-[var(--border)] pt-4 text-secondary" style={{ fontSize: "12px" }}>
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: wsConnected ? "var(--accent-green)" : "var(--accent-red)" }}
            />
            {wsConnected ? "LIVE" : "OFFLINE"}
          </div>
          <p>{auth.name}</p>
          <button
            type="button"
            className="w-full rounded-xl border border-[var(--border)] py-2"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="grid flex-1 grid-rows-[auto_1fr] overflow-hidden">
        <div className="grid grid-cols-5 gap-2 border-b border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2">
          {[
            ["Active", stats?.active_cases ?? "—"],
            ["Critical", stats?.critical_cases ?? "—"],
            ["Resolved", stats?.resolved_today ?? "—"],
            ["Avg RT", `${stats?.avg_response_time_minutes ?? "—"}m`],
            ["Beds", `${stats?.beds_available ?? "—"}/${stats?.beds_total ?? "—"}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-[var(--border)] px-2 py-2 text-center">
              <p className="text-secondary" style={{ fontSize: "10px" }}>
                {k}
              </p>
              <p style={{ fontSize: "15px", fontWeight: 700 }}>{v}</p>
            </div>
          ))}
        </div>
        <div className="grid min-h-0 grid-cols-[minmax(0,40%)_minmax(0,60%)] overflow-hidden">
        <div className="flex flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--bg-primary)]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <p className="mr-caption text-secondary" style={{ letterSpacing: "0.08em" }}>
              INCOMING ALERTS
            </p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {alerts.length === 0 && (
              <p className="text-secondary" style={{ fontSize: "13px" }}>
                No active alerts. Waiting for patient emergencies…
              </p>
            )}
            {alerts.map((a) => (
              <AlertCard
                key={a.id}
                alert={a}
                active={active?.id === a.id}
                accepted={!!accepted[a.id]}
                onSelect={setActive}
                onAccept={handleAccept}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-rows-2 overflow-hidden">
          <div className="overflow-y-auto border-b border-[var(--border)] p-5">
            {active ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-secondary" style={{ fontSize: "12px" }}>
                      Token
                    </p>
                    <p style={{ fontSize: "18px", fontWeight: 600 }}>{active.token}</p>
                  </div>
                  <EtaCountdown seconds={active.eta_seconds} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="h-card">
                    <p className="text-secondary" style={{ fontSize: "11px" }}>
                      NAME
                    </p>
                    <p style={{ fontSize: "18px", fontWeight: 600 }}>{active.name}</p>
                  </div>
                  <div className="h-card">
                    <p className="text-secondary" style={{ fontSize: "11px" }}>
                      AGE / SEX
                    </p>
                    <p style={{ fontSize: "18px", fontWeight: 600 }}>
                      {active.age} / {active.sex}
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-card">
                  <p className="text-secondary" style={{ fontSize: "11px" }}>
                    SYMPTOMS
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(active.symptoms || []).map((s) => (
                      <span
                        key={s}
                        className="rounded-full border px-2 py-1 text-secondary"
                        style={{ fontSize: "12px", borderColor: "var(--border)" }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className="rounded-xl py-2 font-semibold"
                    style={{ background: "var(--accent-red)", color: "#fff" }}
                    onClick={() => handleAccept(active)}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-[var(--border)] py-2"
                    onClick={() => setDoctorPick("Dr. Assigned")}
                  >
                    Assign Doctor
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-[var(--border)] py-2"
                    onClick={() =>
                      setBeds((b) => ({
                        ...b,
                        icu_occ: Math.min(b.icu_total, b.icu_occ + 1),
                      }))
                    }
                  >
                    Escalate ICU
                  </button>
                </div>
              </motion.div>
            ) : (
              <p className="text-secondary">Select an alert</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-0 overflow-hidden">
            <div className="relative h-full min-h-[220px]">
              {key ? (
                <HospitalMap apiKey={key} patientPos={patientPos} hospitalPos={hospitalPos} />
              ) : (
                <iframe
                  title="map"
                  className="h-full w-full border-0"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${patientPos.lng - 0.02},${patientPos.lat - 0.02},${patientPos.lng + 0.02},${patientPos.lat + 0.02}&layer=mapnik&marker=${patientPos.lat},${patientPos.lng}`}
                />
              )}
            </div>
            <div className="overflow-y-auto border-l border-[var(--border)] bg-[var(--bg-primary)] p-4">
              <p className="mr-caption text-secondary" style={{ letterSpacing: "0.08em" }}>
                CASES / 24H
              </p>
              <div style={{ width: "100%", height: 140, background: "#111118" }} className="mt-2 rounded-xl">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="h" tick={{ fill: "#888", fontSize: 9 }} />
                    <YAxis tick={{ fill: "#888", fontSize: 9 }} />
                    <Tooltip contentStyle={{ background: "#111118", border: "none" }} />
                    <Bar dataKey="v" fill="#FF3B5C" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mr-caption mt-4 text-secondary" style={{ letterSpacing: "0.08em" }}>
                BLOOD BANK
              </p>
              <div className="mt-2 max-h-24 overflow-y-auto text-secondary" style={{ fontSize: "11px" }}>
                {(bloodRows || []).map((r) => (
                  <div key={r.id} className="flex justify-between border-b border-[var(--border)] py-1">
                    <span>{r.blood_type}</span>
                    <span style={{ color: (r.units_available || 0) <= 5 ? "var(--accent-amber)" : "inherit" }}>
                      {r.units_available}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mr-caption mt-4 text-secondary" style={{ letterSpacing: "0.08em" }}>
                RESOURCES
              </p>
              <ResourceBar
                label="ER Beds"
                occ={beds.er_occ}
                total={beds.er_total}
                onDec={() => setBeds((b) => ({ ...b, er_occ: Math.max(0, b.er_occ - 1) }))}
                onInc={() => setBeds((b) => ({ ...b, er_occ: Math.min(b.er_total, b.er_occ + 1) }))}
              />
              <ResourceBar
                label="ICU Beds"
                occ={beds.icu_occ}
                total={beds.icu_total}
                onDec={() => setBeds((b) => ({ ...b, icu_occ: Math.max(0, b.icu_occ - 1) }))}
                onInc={() => setBeds((b) => ({ ...b, icu_occ: Math.min(b.icu_total, b.icu_occ + 1) }))}
              />
              <p className="mt-4 text-secondary" style={{ fontSize: "13px" }}>
                On-duty staff: {staff.doctors + staff.nurses + staff.paramedics}
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

function ResourceBar({ label, occ, total, onDec, onInc }) {
  const pct = Math.round((occ / Math.max(total, 1)) * 100)
  const color =
    pct > 80 ? "var(--accent-red)" : pct > 60 ? "var(--accent-amber)" : "var(--accent-green)"
  return (
    <div className="mt-3">
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-secondary" style={{ fontSize: "13px" }}>
          {label}
        </span>
        <div className="flex items-center gap-2">
          <button type="button" className="rounded border border-[var(--border)] px-2 py-1 text-secondary" onClick={onDec}>
            −
          </button>
          <span style={{ fontSize: "13px", color }}>{total - occ} free / {total}</span>
          <button type="button" className="rounded border border-[var(--border)] px-2 py-1 text-secondary" onClick={onInc}>
            +
          </button>
        </div>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
        <div className="h-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function EtaCountdown({ seconds }) {
  const [s, setS] = useState(seconds)
  useEffect(() => {
    setS(seconds)
  }, [seconds])
  useEffect(() => {
    const t = window.setInterval(() => setS((x) => Math.max(0, x - 1)), 1000)
    return () => clearInterval(t)
  }, [])
  const m = Math.floor(s / 60)
  const sec = s % 60
  return (
    <div className="text-right">
      <p className="text-secondary" style={{ fontSize: "11px" }}>
        ETA
      </p>
      <p
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: s < 120 ? "var(--accent-red)" : s < 300 ? "var(--accent-amber)" : "var(--accent-green)",
        }}
      >
        {String(m).padStart(2, "0")}:{String(sec).padStart(2, "0")}
      </p>
    </div>
  )
}
