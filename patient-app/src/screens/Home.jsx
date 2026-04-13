import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { reverseGeocode } from "../api/medirush"
import { safeLocalStorage } from "../utils/safeJson"
import { useTranslation } from "../utils/i18n"

export default function Home({
  go,
  language = "en",
  updateLanguage,
  showToast,
  triageData,
  selectedHospital,
  token,
}) {
  const t = useTranslation(language)
  const [city, setCity] = useState("Locating…")

  useEffect(() => {
    let cancelled = false
    if (!navigator.geolocation) {
      setCity("Tirupati, AP")
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const res = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
        if (cancelled) return
        const c = res.data?.city
        const st = res.data?.state
        setCity(c && st ? `${c}, ${st}` : "Tirupati, AP")
      },
      () => {
        if (!cancelled) setCity(t("error_location"))
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
    return () => {
      cancelled = true
    }
  }, [t])

  const sendEmergencySms = (lat, lng) => {
    const contact = safeLocalStorage.get("emergency_contact")
    if (!contact?.phone) return
    const msg = encodeURIComponent(
      `EMERGENCY ALERT — ${contact.relationship || "Contact"} needs help!\n` +
        `Condition: ${triageData?.condition || "Emergency"}\n` +
        `Severity: ${triageData?.severity || "Unknown"}\n` +
        `Going to: ${selectedHospital?.name || "Nearest hospital"}\n` +
        `Live location: https://maps.google.com/?q=${lat},${lng}\n` +
        `Emergency token: ${token || "pending"}\n` +
        `— Sent automatically by MediRush`
    )
    window.open(`sms:${contact.phone}?body=${msg}`, "_blank")
    showToast(`${t("toast_sms")} — ${contact.name || ""}`)
  }

  const onSos = () => {
    const run = () => {
      if (!navigator.geolocation) {
        sendEmergencySms(13.6288, 79.4192)
        go("input")
        return
      }
      navigator.geolocation.getCurrentPosition(
        (p) => {
          sendEmergencySms(p.coords.latitude, p.coords.longitude)
        },
        () => {
          sendEmergencySms(13.6288, 79.4192)
        },
        { timeout: 8000, maximumAge: 60000 }
      )
    }
    run()
    go("input")
  }

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)]">
      <div className="px-4 pt-3">
        <p className="text-caption text-secondary">{city}</p>
      </div>
      <div className="flex items-center justify-between px-4 pt-2">
        <p className="text-primary font-semibold" style={{ fontSize: "18px" }}>
          {t("home_title")}
        </p>
        <div className="flex gap-2">
          {["en", "te", "hi"].map((lng) => (
            <button
              key={lng}
              type="button"
              onClick={() => updateLanguage(lng)}
              className="rounded-full border border-[var(--border)] px-3 py-1 text-secondary"
              style={{
                fontSize: "13px",
                fontWeight: 500,
                background: language === lng ? "var(--bg-tertiary)" : "transparent",
              }}
            >
              {lng.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <motion.button
          type="button"
          aria-label="Emergency"
          onClick={onSos}
          className="relative flex h-[160px] w-[160px] items-center justify-center rounded-full"
          style={{
            background: "var(--accent-red)",
            boxShadow: "0 0 40px rgba(255,59,92,0.4)",
            willChange: "transform",
          }}
          whileTap={{ scale: 0.97 }}
        >
          <span
            className="absolute inset-0 rounded-full border-2 mr-pulse-ring"
            style={{ borderColor: "var(--accent-red-border)" }}
          />
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </motion.button>
        <p className="mt-6 text-secondary" style={{ fontSize: "13px" }}>
          {t("home_sos_hint")}
        </p>
      </div>

      <div
        className="grid grid-cols-2 gap-3 px-4"
        style={{ height: 120, paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <button type="button" className="mr-btn-secondary" onClick={() => go("records")}>
          {t("home_records")}
        </button>
        <button type="button" className="mr-btn-secondary" onClick={() => go("input")}>
          {t("home_hospitals")}
        </button>
      </div>
    </div>
  )
}
