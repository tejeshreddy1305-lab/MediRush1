export default function StatusPill({ severity }) {
  const s = String(severity || "MODERATE").toUpperCase()
  const cls =
    s === "CRITICAL"
      ? "mr-pill-critical"
      : s === "NORMAL"
        ? "mr-pill-normal"
        : "mr-pill-moderate"
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-caption font-semibold tracking-wide ${cls}`}
      style={{ letterSpacing: "0.12em" }}
    >
      {s}
    </span>
  )
}
