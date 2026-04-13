import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import StatusPill from "../components/StatusPill"

export default function TriageResult({ go, triageData }) {
  const [sheet, setSheet] = useState(false)
  const sev = String(triageData?.severity || "MODERATE").toUpperCase()

  const header = useMemo(() => {
    if (sev === "CRITICAL")
      return "linear-gradient(160deg, #1a0008 0%, #2d000f 100%)"
    if (sev === "NORMAL")
      return "linear-gradient(160deg, #001a0d 0%, #002d1a 100%)"
    return "linear-gradient(160deg, #1a1000 0%, #2d1a00 100%)"
  }, [sev])

  const score = Number(triageData?.score || 0)
  const conf = Number(triageData?.confidence || 0)
  const probs = triageData?.severity_probabilities || {}

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)]">
      <div className="relative h-[40%] px-4 pt-6" style={{ background: header }}>
        <button type="button" className="text-secondary" onClick={() => go("input")}>
          ← Back
        </button>
        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <StatusPill severity={sev} />
            <p className="mt-3 font-semibold text-primary" style={{ fontSize: "22px" }}>
              {triageData?.condition || "Condition"}
            </p>
            <p className="mt-2 text-secondary" style={{ fontSize: "13px", color: "var(--accent-purple)" }}>
              AI Confidence: {conf.toFixed(1)}%
            </p>
          </div>
          <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
            <circle cx="50" cy="50" r="42" stroke="var(--border)" strokeWidth="8" fill="none" />
            <circle
              cx="50"
              cy="50"
              r="42"
              stroke="var(--accent-red)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(score / 10) * 264} 264`}
              transform="rotate(-90 50 50)"
            />
            <text x="50" y="54" textAnchor="middle" fill="var(--text-primary)" fontSize="14" fontWeight="600">
              {score.toFixed(1)}
            </text>
          </svg>
        </div>
      </div>

      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.28 }}
        className="flex-1 rounded-t-[24px] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-5"
        style={{ marginTop: "-12px" }}
      >
        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
          <div
            className="h-full"
            style={{
              width: `${Math.min(100, (score / 10) * 100)}%`,
              background:
                sev === "CRITICAL"
                  ? "var(--accent-red)"
                  : sev === "NORMAL"
                    ? "var(--accent-green)"
                    : "var(--accent-amber)",
            }}
          />
        </div>

        <p className="text-body text-primary">{triageData?.action}</p>

        {triageData?.vitals_flag && (
          <p className="mt-3 text-secondary" style={{ fontSize: "13px", color: "var(--accent-amber)" }}>
            Abnormal vitals detected
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {["CRITICAL", "MODERATE", "NORMAL"].map((k) => (
            <span
              key={k}
              className="rounded-full border border-[var(--border)] px-2 py-1 text-secondary"
              style={{ fontSize: "11px" }}
            >
              {k}: {Number(probs[k] || 0).toFixed(1)}%
            </span>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <button type="button" className="mr-btn-primary" onClick={() => go("hospitals")}>
            Find Best Hospital →
          </button>
          <button type="button" className="mr-btn-secondary w-full" onClick={() => setSheet(true)}>
            Compare Hospitals
          </button>
        </div>
      </motion.div>

      {sheet && (
        <div className="fixed inset-0 z-50 bg-black/60 px-4 py-10" onClick={() => setSheet(false)}>
          <div className="mr-card" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold text-primary">Compare</p>
            <p className="mt-2 text-secondary" style={{ fontSize: "13px" }}>
              Ranking uses distance, specialty match, and bed availability from the backend.
            </p>
            <button type="button" className="mr-btn-primary mt-4" onClick={() => setSheet(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
