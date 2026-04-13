import { useEffect, useMemo, useState } from "react"
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from "recharts"
import { fetchDrugInfo, fetchPatient, fetchPatientVitals } from "../api/medirush"

export default function HealthRecords({ go }) {
  const [patient, setPatient] = useState(null)
  const [vitals, setVitals] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [drug, setDrug] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetchPatient("demo-patient-001")
      const v = await fetchPatientVitals("demo-patient-001")
      if (cancelled) return
      if (res.ok) setPatient(res.data)
      if (v.ok) setVitals(v.data.points || [])
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const meds = useMemo(() => {
    const raw = patient?.current_medications || ""
    return raw.split(",").map((s) => s.trim()).filter(Boolean)
  }, [patient])

  const visits = useMemo(() => {
    try {
      return JSON.parse(patient?.visit_history || "[]")
    } catch {
      return []
    }
  }, [patient])

  const openDrug = async (name) => {
    setExpanded(name)
    const res = await fetchDrugInfo(name.split(" ")[0])
    if (res.ok) setDrug(res.data)
    else setDrug(null)
  }

  return (
    <div className="min-h-full bg-[var(--bg-primary)] px-4 py-6 pb-24">
      <div className="flex items-center gap-3">
        <button type="button" className="text-secondary" onClick={() => go("home")}>
          ←
        </button>
        <p className="font-semibold" style={{ fontSize: "17px" }}>
          Health Records
        </p>
      </div>

      <div className="mt-6 mr-card">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full font-semibold"
            style={{ background: "var(--accent-red)", color: "#fff" }}
          >
            {(patient?.name || "RK").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-primary" style={{ fontSize: "17px" }}>
              {patient?.name || "—"}
            </p>
            <p className="text-secondary" style={{ fontSize: "13px" }}>
              {patient?.age} yrs · {patient?.sex}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full px-3 py-1 text-caption font-semibold mr-pill-critical">
            {patient?.blood_type || "O+"}
          </span>
          <span className="rounded-full px-3 py-1 text-caption font-semibold mr-pill-moderate">
            Allergies: {patient?.allergies || "—"}
          </span>
        </div>
        <p className="mt-3 text-secondary" style={{ fontSize: "13px" }}>
          Chronic: {patient?.chronic_conditions || "—"}
        </p>
      </div>

      <div className="mt-6 mr-card">
        <p className="mr-caption mb-3">Vitals history</p>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={vitals}>
              <XAxis dataKey="date" hide />
              <Tooltip
                contentStyle={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}
              />
              <Line type="monotone" dataKey="bp_sys" stroke="var(--accent-red)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="hr" stroke="var(--accent-blue)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6">
        <p className="mr-caption mb-3">Medications</p>
        <div className="space-y-2">
          {meds.map((m) => (
            <button
              key={m}
              type="button"
              className="mr-card w-full text-left"
              onClick={() => openDrug(m)}
            >
              <p className="font-semibold" style={{ fontSize: "15px" }}>
                {m}
              </p>
              {expanded === m && drug && (
                <div className="mt-2 text-secondary" style={{ fontSize: "13px" }}>
                  <p>{drug.purpose}</p>
                  <p className="mt-2">{drug.sideEffects}</p>
                  <p className="mt-2">{drug.warnings}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="mr-caption mb-3">Emergency history</p>
        <div className="space-y-2">
          {visits.map((v, i) => (
            <div key={i} className="mr-card">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold" style={{ fontSize: "15px" }}>
                  {v.diagnosis}
                </p>
                <span className="text-caption mr-pill-moderate">{v.severity || "MODERATE"}</span>
              </div>
              <p className="mt-1 text-secondary" style={{ fontSize: "13px" }}>
                {v.date} · {v.hospital}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
