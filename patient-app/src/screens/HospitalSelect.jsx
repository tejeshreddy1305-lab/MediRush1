import { useEffect, useMemo, useState } from "react"
import { recommendHospitals, notifyHospital } from "../api/medirush"

export default function HospitalSelect({
  go,
  triageData,
  setHospitals,
  setSelectedHospital,
  setToken,
  showToast,
}) {
  const [filter, setFilter] = useState("All")
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const getPos = () =>
        new Promise((resolve) => {
          if (!navigator.geolocation) return resolve({ lat: 13.6288, lng: 79.4192 })
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
            () => resolve({ lat: 13.6288, lng: 79.4192 }),
            { timeout: 8000 }
          )
        })
      const pos = await getPos()
      const res = await recommendHospitals({
        lat: pos.lat,
        lng: pos.lng,
        condition: triageData?.condition || "",
        severity: triageData?.severity || "MODERATE",
      })
      if (cancelled) return
      const list = res.data?.hospitals || []
      setRows(list)
      setHospitals(list)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [setHospitals, triageData])

  const shown = useMemo(() => {
    const r = [...rows]
    if (filter === "Nearest") r.sort((a, b) => a.distance_km - b.distance_km)
    if (filter === "Best Match") r.sort((a, b) => b.composite_score - a.composite_score)
    return r
  }, [rows, filter])

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)]">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        <button type="button" className="text-secondary" onClick={() => go("triage")}>
          ←
        </button>
        <p className="flex-1 text-center font-semibold" style={{ fontSize: "17px" }}>
          Nearby Hospitals
        </p>
        <span style={{ width: 24 }} />
      </div>

      <div className="flex gap-2 px-4 py-3">
        {["All", "Nearest", "Best Match"].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className="rounded-full border px-3 py-1 text-secondary"
            style={{
              fontSize: "13px",
              borderColor: filter === f ? "var(--accent-red-border)" : "var(--border)",
              background: filter === f ? "var(--bg-tertiary)" : "transparent",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-24">
        {loading && (
          <div className="space-y-3">
            <div className="mr-skeleton h-28 rounded-2xl" />
            <div className="mr-skeleton h-28 rounded-2xl" />
          </div>
        )}
        {!loading &&
          shown.map((h, idx) => {
            const beds = h.beds_available ?? 0
            const bedClass =
              beds > 10 ? "text-[var(--accent-green)]" : beds > 0 ? "text-[var(--accent-amber)]" : "text-[var(--accent-red)]"
            const open = expanded === h.id
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => setExpanded(open ? null : h.id)}
                className="mr-card w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="font-bold text-[var(--accent-red)]" style={{ fontSize: "20px" }}>
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold" style={{ fontSize: "15px" }}>
                          {h.name}
                        </p>
                        {idx === 0 && (
                          <span className="rounded-full px-2 py-0.5 text-caption font-semibold mr-pill-critical">
                            BEST MATCH
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-secondary" style={{ fontSize: "12px" }}>
                        {(h.specializations || []).slice(0, 3).join(" · ")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-secondary" style={{ fontSize: "12px" }}>
                        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[var(--accent-blue)]">
                          {Math.round((h.eta_seconds || 0) / 60)} min
                        </span>
                        <span className="rounded-full border border-[var(--border)] px-2 py-0.5">
                          {h.distance_km} km
                        </span>
                        <span className={`rounded-full border border-[var(--border)] px-2 py-0.5 ${bedClass}`}>
                          Beds {beds}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-secondary">{open ? "▾" : "▸"}</span>
                </div>
                {open && (
                  <div className="mt-3 border-t border-[var(--border)] pt-3 text-secondary" style={{ fontSize: "13px" }}>
                    <p>Type: {h.type}</p>
                    <p className="mt-1">Phone: {h.phone}</p>
                    <button
                      type="button"
                      className="mr-btn-primary mt-3"
                      onClick={async (e) => {
                        e.stopPropagation()
                        setSelectedHospital(h)
                        const pos = await new Promise((resolve) => {
                          if (!navigator.geolocation) return resolve({ lat: 13.6288, lng: 79.4192 })
                          navigator.geolocation.getCurrentPosition(
                            (p) =>
                              resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
                            () => resolve({ lat: 13.6288, lng: 79.4192 }),
                            { timeout: 8000 }
                          )
                        })
                        const res = await notifyHospital({
                          hospital_id: h.id,
                          patient_data: {
                            name: "Ravi Kumar",
                            age: 34,
                            sex: "Male",
                            symptoms: triageData?.symptoms || [],
                            blood_type: "O+",
                            allergies: "Penicillin",
                            conditions: "Hypertension",
                            medications: "Amlodipine",
                            lat: pos.lat,
                            lng: pos.lng,
                          },
                          condition: triageData?.condition || "Emergency",
                          severity: triageData?.severity || "CRITICAL",
                          priority_score: triageData?.score || 8,
                          eta_seconds: h.eta_seconds || 600,
                        })
                        if (res.ok && res.data?.token) setToken(res.data.token)
                        else showToast?.("Could not notify hospital — continue to navigation")
                        go("navigation")
                      }}
                    >
                      Select This Hospital
                    </button>
                  </div>
                )}
              </button>
            )
          })}
      </div>
    </div>
  )
}
