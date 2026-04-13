import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

function formatEta(totalSec) {
  const m = Math.floor(Math.max(0, totalSec) / 60)
  const s = Math.max(0, totalSec) % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export default function AmbulanceTracker({
  open,
  onClose,
  meta,
  patientLat,
  patientLng,
}) {
  const total = meta?.eta_seconds ?? 480
  const [remain, setRemain] = useState(total)
  const registration = meta?.registration || "AP 09 Z 4521"
  const driver = meta?.driver_name || "Suresh M."
  const phone = meta?.driver_phone || "9848012345"

  useEffect(() => {
    if (!open) return
    setRemain(total)
    const id = window.setInterval(() => {
      setRemain((r) => Math.max(0, r - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [open, total])

  const progress = useMemo(() => {
    if (total <= 0) return 100
    return Math.min(100, ((total - remain) / total) * 100)
  }, [total, remain])

  const barColor =
    remain > total * 0.5 ? "#FF3B5C" : remain > total * 0.25 ? "#FFB020" : "#00D68F"

  const shareSms = () => {
    const body = encodeURIComponent(
      `Ambulance dispatched. Live location: https://maps.google.com/?q=${patientLat},${patientLng}`
    )
    window.open(`sms:?&body=${body}`, "_blank")
  }

  const cancel = () => {
    if (window.confirm("Cancel ambulance dispatch?")) onClose?.()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[300] flex flex-col justify-end bg-black/80 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="max-h-[88vh] overflow-y-auto rounded-t-3xl px-5 pb-8 pt-6"
            style={{ background: "#111118", color: "#F5F5F7" }}
          >
            <p style={{ fontSize: "17px", fontWeight: 600 }}>Ambulance Dispatched</p>
            <p className="mt-2 text-secondary" style={{ fontSize: "14px" }}>
              {registration} · Driver {driver} · 📞 {phone}
            </p>
            <p className="mt-6 font-mono" style={{ fontSize: "36px", fontWeight: 700, color: "#F5F5F7" }}>
              Arriving in {formatEta(remain)}
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#1A1A24]">
              <div
                className="h-full transition-all duration-1000"
                style={{ width: `${progress}%`, background: barColor }}
              />
            </div>
            <p className="mt-4 text-secondary" style={{ fontSize: "12px" }}>
              Simulated CAD — route follows nearest station. Open Maps for live routing.
            </p>
            <iframe
              title="route-preview"
              className="mt-4 h-40 w-full rounded-xl border-0"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${(meta?.station_lng ?? 79.41) - 0.04},${(meta?.station_lat ?? 13.63) - 0.04},${(meta?.station_lng ?? 79.41) + 0.04},${(meta?.station_lat ?? 13.63) + 0.04}&layer=mapnik&marker=${meta?.station_lat ?? 13.63},${meta?.station_lng ?? 79.41}`}
            />
            <div className="mt-6 grid grid-cols-1 gap-3">
              <a className="mr-btn-primary flex items-center justify-center no-underline" href={`tel:${phone}`}>
                Call Driver
              </a>
              <button type="button" className="mr-btn-secondary" onClick={shareSms}>
                Share Location
              </button>
              <button type="button" className="mr-btn-secondary" onClick={cancel}>
                Cancel Dispatch
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
