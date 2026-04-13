export default function VitalsInput({ vitals, onChange }) {
  const v = vitals

  const set = (k, val) => onChange({ ...v, [k]: val })

  const hr = v.hr ?? 75
  const spo2 = v.spo2 ?? 98
  const bpSys = v.bp_sys ?? ""
  const bpDia = v.bp_dia ?? ""

  const hrDot =
    hr < 40 || hr > 120 ? "bg-[var(--accent-red)]" : hr >= 60 && hr <= 100
      ? "bg-[var(--accent-green)]"
      : "bg-[var(--accent-amber)]"

  const spoDot =
    spo2 < 90 ? "bg-[var(--accent-red)]" : spo2 >= 95
      ? "bg-[var(--accent-green)]"
      : "bg-[var(--accent-amber)]"

  const bpColor = () => {
    const s = Number(bpSys)
    const d = Number(bpDia)
    if (!s || !d) return "var(--text-secondary)"
    if (s > 160 || d > 100) return "var(--accent-red)"
    if (s > 140 || d > 90) return "var(--accent-amber)"
    return "var(--accent-green)"
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="mr-caption">Heart rate</p>
          <span className={`h-2 w-2 rounded-full ${hrDot}`} />
        </div>
        <input
          type="number"
          className="mr-input"
          min={20}
          max={250}
          value={hr}
          onChange={(e) => set("hr", Number(e.target.value))}
        />
        <p className="mt-1 text-secondary" style={{ fontSize: "13px" }}>
          Normal: 60–100 bpm
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="mr-caption">Blood oxygen (SpO2)</p>
          <span className={`h-2 w-2 rounded-full ${spoDot}`} />
        </div>
        <input
          type="number"
          className="mr-input"
          min={50}
          max={100}
          value={spo2}
          onChange={(e) => set("spo2", Number(e.target.value))}
        />
        <p className="mt-1 text-secondary" style={{ fontSize: "13px" }}>
          Normal: 95–100%
        </p>
      </div>

      <div>
        <p className="mr-caption mb-2">Age</p>
        <input
          type="number"
          className="mr-input"
          min={1}
          max={120}
          value={v.age ?? 35}
          onChange={(e) => set("age", Number(e.target.value))}
        />
      </div>

      <div>
        <p className="mr-caption mb-2">Blood pressure (optional)</p>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            className="mr-input"
            placeholder="Systolic"
            value={bpSys}
            onChange={(e) => set("bp_sys", e.target.value === "" ? "" : Number(e.target.value))}
            style={{ color: bpColor() }}
          />
          <input
            type="number"
            className="mr-input"
            placeholder="Diastolic"
            value={bpDia}
            onChange={(e) => set("bp_dia", e.target.value === "" ? "" : Number(e.target.value))}
            style={{ color: bpColor() }}
          />
        </div>
      </div>
    </div>
  )
}
