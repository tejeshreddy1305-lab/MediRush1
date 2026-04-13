import { motion } from "framer-motion"

export default function AlertCard({ alert, active, onSelect, onAccept, accepted }) {
  const sev = String(alert.severity || "MODERATE").toUpperCase()
  const bar =
    sev === "CRITICAL"
      ? "bg-[var(--accent-red)]"
      : sev === "NORMAL"
        ? "bg-[var(--accent-green)]"
        : "bg-[var(--accent-amber)]"

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect(alert)}
      className="relative w-full overflow-hidden rounded-2xl border text-left"
      style={{
        borderColor: "var(--border)",
        background: active ? "rgba(10,132,255,0.08)" : "var(--bg-tertiary)",
      }}
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${bar}`} />
      <div className="px-4 py-3 pl-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p style={{ fontSize: "15px", fontWeight: 600 }}>
              {alert.name}, {alert.age} · {alert.sex}
            </p>
            <p className="text-secondary" style={{ fontSize: "13px" }}>
              {alert.condition}
            </p>
          </div>
          <span
            className="rounded-full px-2 py-1 text-caption font-semibold"
            style={{
              border: "1px solid var(--border)",
              color:
                sev === "CRITICAL"
                  ? "var(--accent-red)"
                  : sev === "NORMAL"
                    ? "var(--accent-green)"
                    : "var(--accent-amber)",
            }}
          >
            {sev}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-secondary" style={{ fontSize: "12px" }}>
          <span>ETA {alert.etaLabel}</span>
          <span>{alert.timestamp}</span>
        </div>
        <button
          type="button"
          className="mt-3 w-full rounded-xl py-2 font-semibold"
          style={{
            background: "var(--accent-red)",
            color: "#fff",
            opacity: accepted ? 0.5 : 1,
          }}
          disabled={accepted}
          onClick={(e) => {
            e.stopPropagation()
            onAccept(alert)
          }}
        >
          {accepted ? "Accepted" : "Accept Case"}
        </button>
      </div>
    </motion.button>
  )
}
