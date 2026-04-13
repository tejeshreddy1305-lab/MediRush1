import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import "./index.css"
import HomeScreen from "./screens/Home"
import EmergencyInputScreen from "./screens/EmergencyInput"
import TriageResultScreen from "./screens/TriageResult"
import HospitalSelectScreen from "./screens/HospitalSelect"
import NavigationScreen from "./screens/Navigation"
import ConfirmationScreen from "./screens/Confirmation"
import HealthRecordsScreen from "./screens/HealthRecords"
import EmergencyContactScreen from "./screens/EmergencyContact"
import FeedbackScreen from "./screens/Feedback"
import { safeLocalStorage } from "./utils/safeJson"
import { useTranslation } from "./utils/i18n"

const variants = {
  enter: (dir) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir < 0 ? 40 : -40, opacity: 0 }),
}

function hasEmergencySetup() {
  try {
    if (safeLocalStorage.get("emergency_contact")) return true
    if (safeLocalStorage.getString("ec_skipped") === "true") return true
  } catch {
    /* ignore */
  }
  return false
}

export default function App() {
  const [screen, setScreen] = useState(() => (hasEmergencySetup() ? "home" : "emergency_contact"))
  const [dir, setDir] = useState(1)
  const [triageData, setTriageData] = useState(null)
  const [hospitals, setHospitals] = useState([])
  const [selectedHospital, setSelectedHospital] = useState(null)
  const [token, setToken] = useState(null)
  const [toast, setToast] = useState(null)
  const [language, setLanguage] = useState(() => safeLocalStorage.getString("medirush_lang", "en"))
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true))

  const t = useTranslation(language)

  const showToast = (msg) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => {
    const on = () => {
      setIsOnline(true)
      showToast("Back online ✓")
    }
    const off = () => {
      setIsOnline(false)
      showToast(t("offline_banner"))
    }
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [language])

  const go = (s) => {
    setDir(1)
    setScreen(s)
  }

  const updateLanguage = (lang) => {
    setLanguage(lang)
    safeLocalStorage.setString("medirush_lang", lang)
  }

  const ctx = {
    go,
    triageData,
    setTriageData,
    hospitals,
    setHospitals,
    selectedHospital,
    setSelectedHospital,
    token,
    setToken,
    showToast,
    language,
    updateLanguage,
  }

  const pages = {
    emergency_contact: <EmergencyContactScreen {...ctx} />,
    home: <HomeScreen {...ctx} />,
    input: <EmergencyInputScreen {...ctx} />,
    triage: <TriageResultScreen {...ctx} />,
    hospitals: <HospitalSelectScreen {...ctx} />,
    navigation: <NavigationScreen {...ctx} />,
    confirmation: <ConfirmationScreen {...ctx} />,
    records: <HealthRecordsScreen {...ctx} />,
    feedback: <FeedbackScreen {...ctx} />,
  }

  return (
    <div
      className="relative mx-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-[var(--bg-primary)]"
      style={{ minHeight: "100dvh" }}
    >
      {!isOnline && (
        <div
          style={{
            background: "#FFB020",
            color: "#000",
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 16px",
            textAlign: "center",
          }}
        >
          {t("offline_banner")}
        </div>
      )}
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={screen}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className="flex-1 overflow-hidden"
        >
          {pages[screen]}
        </motion.div>
      </AnimatePresence>
      {toast && <div className="mr-toast">{toast}</div>}
    </div>
  )
}
