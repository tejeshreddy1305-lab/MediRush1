import { useState } from "react"
import { motion } from "framer-motion"
import { safeLocalStorage } from "../utils/safeJson"
import { useTranslation } from "../utils/i18n"

const PHONE_RE = /^[6-9]\d{9}$/

export default function EmergencyContact({ go, language }) {
  const t = useTranslation(language)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [relationship, setRelationship] = useState("Spouse")
  const [err, setErr] = useState("")

  const save = () => {
    setErr("")
    if (!name.trim()) {
      setErr("Name required")
      return
    }
    if (!PHONE_RE.test(phone.replace(/\s/g, ""))) {
      setErr("Enter valid 10-digit Indian mobile")
      return
    }
    safeLocalStorage.set("emergency_contact", {
      name: name.trim(),
      phone: phone.replace(/\s/g, ""),
      relationship,
    })
    go("home")
  }

  const skip = () => {
    safeLocalStorage.setString("ec_skipped", "true")
    go("home")
  }

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)] px-5 py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-primary font-semibold" style={{ fontSize: "20px" }}>
          {t("ec_title")}
        </p>
        <label className="mt-6 block text-secondary" style={{ fontSize: "13px" }}>
          {t("ec_name")}
          <input
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-3 text-primary"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </label>
        <label className="mt-4 block text-secondary" style={{ fontSize: "13px" }}>
          {t("ec_phone")}
          <input
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-3 text-primary"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
          />
        </label>
        <label className="mt-4 block text-secondary" style={{ fontSize: "13px" }}>
          {t("ec_rel")}
          <select
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-3 text-primary"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
          >
            {["Spouse", "Parent", "Child", "Friend", "Other"].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        {err && (
          <p className="mt-2" style={{ fontSize: "13px", color: "var(--accent-red)" }}>
            {err}
          </p>
        )}
        <button type="button" className="mr-btn-primary mt-8 w-full" onClick={save}>
          {t("ec_save")}
        </button>
        <button type="button" className="mr-btn-secondary mt-3 w-full" onClick={skip}>
          {t("ec_skip")}
        </button>
      </motion.div>
    </div>
  )
}
