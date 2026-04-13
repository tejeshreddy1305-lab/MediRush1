import { useMemo } from "react"
import { motion } from "framer-motion"
import QRCode from "react-qr-code"

export default function Confirmation({ go, token, selectedHospital, triageData, showToast }) {
  const t = token || "PENDING"
  const h = selectedHospital
  const sev = triageData?.severity || "MODERATE"
  const qrValue = useMemo(
    () => `MEDIRUSH:${t}:${h?.id || "unknown"}:${sev}:${new Date().toISOString()}`,
    [t, h?.id, sev]
  )

  const checkIn = h?.type === "Government" ? 8 : 4
  const drive = Math.max(1, Math.round((h?.eta_seconds || 600) / 60))

  return (
    <div className="min-h-full bg-[var(--bg-primary)] px-4 py-6">
      <div className="flex items-center justify-between">
        <button type="button" className="text-secondary" onClick={() => go("navigation")}>
          ←
        </button>
        <p className="font-semibold" style={{ fontSize: "17px" }}>
          Confirmation
        </p>
        <span style={{ width: 24 }} />
      </div>

      <div className="mt-8 flex flex-col items-center">
        <motion.svg
          width="80"
          height="80"
          viewBox="0 0 24 24"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <path
            d="M5 13l4 4L19 7"
            fill="none"
            stroke="var(--accent-green)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="40"
            strokeDashoffset="40"
            style={{ animation: "mr-check 0.8s ease forwards" }}
          />
        </motion.svg>
        <style>{`@keyframes mr-check { to { stroke-dashoffset: 0; } }`}</style>

        <p
          className="mt-6 text-center font-semibold tracking-tight"
          style={{ fontSize: "32px", color: "var(--accent-red)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
        >
          {t}
        </p>

        <div className="mt-6 mr-card w-full max-w-[320px]">
          <QRCode value={qrValue} size={180} bgColor="var(--bg-secondary)" fgColor="var(--text-primary)" />
        </div>
      </div>

      <div className="mt-6 mr-card border-l-4" style={{ borderLeftColor: "var(--accent-blue)" }}>
        <p className="mr-caption">Time to treatment</p>
        <p className="mt-2 text-primary" style={{ fontSize: "17px" }}>
          Est. treatment in {drive + checkIn} min
        </p>
        <p className="mt-1 text-secondary" style={{ fontSize: "13px" }}>
          Drive {drive} min + check-in avg {checkIn} min ({h?.type === "Government" ? "Govt" : "Private"})
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {[
          `Emergency detected — ${sev}`,
          `Hospital notified — ${h?.name || "Hospital"}`,
          "Medical records shared",
          "Route calculated",
          "Doctor preparing…",
        ].map((line, i) => (
          <motion.div
            key={line}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="text-secondary"
            style={{ fontSize: "13px" }}
          >
            {i < 4 ? "✓" : "⏳"} {line}
          </motion.div>
        ))}
      </div>

      <div className="mt-8 space-y-3">
        <button
          type="button"
          className="mr-btn-secondary w-full"
          onClick={() => showToast?.("QR saved — use your device screenshot if download is unavailable")}
        >
          Download QR
        </button>
        <button type="button" className="mr-btn-secondary w-full" onClick={() => go("navigation")}>
          Back to Navigation
        </button>
        <button type="button" className="mr-btn-primary mt-3 w-full" onClick={() => go("feedback")}>
          Rate your experience
        </button>
      </div>
    </div>
  )
}
