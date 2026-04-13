import { useRef, useState } from "react"
import SymptomSearch from "../components/SymptomSearch"
import BodyMap from "../components/BodyMap"
import VitalsInput from "../components/VitalsInput"
import ChatSymptomChecker from "../components/ChatSymptomChecker"
import { analyzeEmergency } from "../api/medirush"
import { Mic } from "lucide-react"
import { useTranslation } from "../utils/i18n"

const TABS = ["DESCRIBE", "BODY", "VITALS", "CHAT"]

export default function EmergencyInput({ go, setTriageData, showToast, language }) {
  const t = useTranslation(language || "en")
  const [tab, setTab] = useState("DESCRIBE")
  const [symptoms, setSymptoms] = useState([])
  const [vitals, setVitals] = useState({ hr: 75, spo2: 98, age: 35, bp_sys: "", bp_dia: "" })
  const [pain, setPain] = useState(5)
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const recogRef = useRef(null)

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      showToast("Voice input not supported in this browser")
      return
    }
    const r = new SR()
    recogRef.current = r
    r.lang = "en-IN"
    r.onresult = (ev) => {
      const text = ev.results[0][0].transcript || ""
      const parts = text.split(/[,.]/).map((s) => s.trim()).filter(Boolean)
      const next = new Set(symptoms)
      parts.forEach((p) => next.add(p.toLowerCase().replace(/\s+/g, "_")))
      setSymptoms([...next])
    }
    r.onend = () => setRecording(false)
    setRecording(true)
    r.start()
  }

  const analyze = async () => {
    if (!symptoms.length) {
      showToast("Add at least one symptom")
      return
    }
    setLoading(true)
    try {
      const res = await analyzeEmergency({
        symptoms,
        vitals: {
          hr: vitals.hr,
          spo2: vitals.spo2,
          age: vitals.age,
          bp_sys: vitals.bp_sys === "" ? undefined : vitals.bp_sys,
          bp_dia: vitals.bp_dia === "" ? undefined : vitals.bp_dia,
        },
      })
      if (!res.ok) {
        showToast(String(res.error))
        return
      }
      setTriageData({ ...res.data, pain, symptoms })
      go("triage")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)]">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        <button type="button" className="text-secondary" onClick={() => go("home")} aria-label="Back">
          ←
        </button>
        <p className="flex-1 text-center font-semibold text-primary" style={{ fontSize: "17px" }}>
          {t("input_title")}
        </p>
        <span style={{ width: 24 }} />
      </div>

      <div className="flex gap-2 px-4 pt-3">
        {TABS.map((tabId) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setTab(tabId)}
            className="flex-1 pb-2 text-center text-secondary"
            style={{
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              borderBottom: tab === tabId ? "2px solid var(--accent-red)" : "2px solid transparent",
              color: tab === tabId ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {tabId === "DESCRIBE"
              ? t("input_tab_describe")
              : tabId === "BODY"
                ? t("input_tab_body")
                : tabId === "VITALS"
                  ? t("input_tab_vitals")
                  : t("input_tab_chat")}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {tab === "DESCRIBE" && <SymptomSearch symptoms={symptoms} onChange={setSymptoms} />}
        {tab === "BODY" && (
          <BodyMap
            symptoms={symptoms}
            onChange={setSymptoms}
            pain={pain}
            setPain={setPain}
          />
        )}
        {tab === "VITALS" && <VitalsInput vitals={vitals} onChange={setVitals} />}
        {tab === "CHAT" && (
          <ChatSymptomChecker
            onApply={(syms) => {
              setSymptoms(syms.map((s) => String(s).toLowerCase().replace(/\s+/g, "_")))
              setTab("DESCRIBE")
            }}
          />
        )}
      </div>

      <button
        type="button"
        className="fixed bottom-24 right-5 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-tertiary)]"
        onClick={startVoice}
        aria-label="Voice input"
      >
        <Mic className={recording ? "text-[var(--accent-red)]" : "text-secondary"} size={20} />
      </button>
      {recording && (
        <div className="fixed bottom-40 right-6 flex gap-1">
          {[12, 18, 10].map((h, i) => (
            <span
              key={i}
              className="w-1 rounded bg-[var(--accent-red)]"
              style={{ height: h, animation: "mr-pulse-ring 0.8s ease-in-out infinite" }}
            />
          ))}
        </div>
      )}

      <div className="border-t border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3">
        <button
          type="button"
          className="mr-btn-primary flex items-center justify-center gap-2"
          disabled={loading || !symptoms.length}
          onClick={analyze}
        >
          {loading ? (
            <span className="mr-skeleton h-4 w-28 rounded" />
          ) : (
            <>
              {t("input_analyze")}
              <span className="rounded-full bg-[rgba(0,0,0,0.15)] px-2 py-0.5 text-[13px]">
                {symptoms.length}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
