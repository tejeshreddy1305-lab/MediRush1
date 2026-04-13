import { useEffect, useMemo, useState } from "react"
import { fetchSymptomFeatures } from "../api/medirush"
import { humanizeFeatureName, normalizeSymptomToken } from "../utils/symptoms"

const GROUPS = [
  {
    label: "Cardiac",
    border: "var(--accent-red)",
    keys: ["chest_pain", "chest_tightness"],
  },
  {
    label: "Respiratory",
    border: "var(--accent-blue)",
    keys: ["breathlessness", "fatigue"],
  },
  {
    label: "Neurological",
    border: "var(--accent-purple)",
    keys: ["headache", "altered_sensorium", "weakness_in_limbs"],
  },
  {
    label: "Trauma",
    border: "var(--accent-amber)",
    keys: ["bruising", "weakness_in_limbs", "back_pain"],
  },
  {
    label: "Abdominal",
    border: "var(--accent-green)",
    keys: ["abdominal_pain", "vomiting", "nausea"],
  },
  {
    label: "Allergic",
    border: "var(--accent-red)",
    keys: ["throat_irritation", "skin_rash", "breathlessness"],
  },
]

export default function SymptomSearch({ symptoms, onChange }) {
  const [q, setQ] = useState("")
  const [features, setFeatures] = useState([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const res = await fetchSymptomFeatures()
      if (!alive) return
      setFeatures(res.features?.length ? res.features : [])
    })()
    return () => {
      alive = false
    }
  }, [])

  const suggestions = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (qq.length < 2) return []
    return features
      .filter((f) => f.toLowerCase().includes(qq.replace(/\s+/g, "_")))
      .slice(0, 12)
  }, [q, features])

  const add = (raw) => {
    const t = normalizeSymptomToken(raw)
    if (!t) return
    if (symptoms.includes(t)) return
    onChange([...symptoms, t])
    setQ("")
  }

  const remove = (t) => onChange(symptoms.filter((s) => s !== t))

  return (
    <div className="space-y-4">
      <div>
        <input
          className="mr-input"
          placeholder="Describe your main symptom..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {suggestions.length > 0 && (
          <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)]">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="block w-full px-3 py-2 text-left text-secondary hover:bg-[var(--bg-glass)]"
                style={{ fontSize: "15px" }}
                onClick={() => add(s)}
              >
                {humanizeFeatureName(s)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mr-caption mb-2">Selected symptoms</p>
        <div className="flex flex-wrap gap-2">
          {symptoms.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => remove(s)}
              className="rounded-full border px-3 py-1 text-secondary"
              style={{
                borderColor: "var(--accent-red-border)",
                background: "var(--bg-tertiary)",
                color: "var(--accent-red)",
                fontSize: "13px",
              }}
            >
              {humanizeFeatureName(s)} ×
            </button>
          ))}
          {symptoms.length === 0 && (
            <p className="text-secondary" style={{ fontSize: "13px" }}>
              Add at least one symptom.
            </p>
          )}
        </div>
      </div>

      <div>
        <p className="mr-caption mb-2">Common emergencies</p>
        <div className="grid grid-cols-2 gap-3">
          {GROUPS.map((g) => (
            <button
              key={g.label}
              type="button"
              className="mr-card text-left"
              style={{ borderLeft: `4px solid ${g.border}` }}
              onClick={() => {
                const next = new Set(symptoms)
                g.keys.forEach((k) => next.add(k))
                onChange([...next])
              }}
            >
              <p className="font-semibold" style={{ fontSize: "15px" }}>
                {g.label}
              </p>
              <p className="mt-1 text-secondary" style={{ fontSize: "13px" }}>
                Add typical symptoms
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
