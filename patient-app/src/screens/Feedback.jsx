import { useState } from "react"
import { motion } from "framer-motion"
import { submitFeedback } from "../api/medirush"
import { useTranslation } from "../utils/i18n"

function Stars({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="text-2xl"
          style={{ color: n <= value ? "#FFB020" : "#48484a" }}
          aria-label={`${n} stars`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function Feedback({
  go,
  language,
  token,
  selectedHospital,
  showToast,
}) {
  const t = useTranslation(language)
  const [rating, setRating] = useState(4)
  const [rt, setRt] = useState(4)
  const [staff, setStaff] = useState(4)
  const [rec, setRec] = useState(true)
  const [comment, setComment] = useState("")
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!selectedHospital?.id) {
      showToast?.("Select a hospital first")
      return
    }
    setLoading(true)
    try {
      const res = await submitFeedback({
        token: token || "",
        hospital_id: selectedHospital.id,
        rating,
        response_time_rating: rt,
        staff_rating: staff,
        comment: comment.slice(0, 300),
        would_recommend: rec,
      })
      if (res.ok) setDone(true)
      else showToast?.("Could not submit feedback")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex min-h-full flex-col items-center bg-[var(--bg-primary)] px-6 py-10">
        <motion.svg width="88" height="88" viewBox="0 0 24 24" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
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
        <p className="mt-6 text-center font-semibold text-primary" style={{ fontSize: "20px" }}>
          Thank you!
        </p>
        <p className="mt-2 text-center text-secondary" style={{ fontSize: "14px" }}>
          Your feedback helps improve emergency care across Tirupati.
        </p>
        <button type="button" className="mr-btn-primary mt-10 w-full max-w-sm" onClick={() => go("home")}>
          {t("feedback_back")}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-[var(--bg-primary)] px-4 py-6">
      <div className="flex items-center justify-between">
        <button type="button" className="text-secondary" onClick={() => go("confirmation")}>
          ←
        </button>
        <p className="font-semibold" style={{ fontSize: "17px" }}>
          Feedback
        </p>
        <span style={{ width: 24 }} />
      </div>
      <p className="mt-6 text-secondary" style={{ fontSize: "13px" }}>
        {t("feedback_title")}
      </p>
      <div className="mt-4 mr-card">
        <p className="text-secondary" style={{ fontSize: "12px" }}>
          Overall
        </p>
        <Stars value={rating} onChange={setRating} />
      </div>
      <div className="mt-4 mr-card">
        <p className="text-secondary" style={{ fontSize: "12px" }}>
          Response time
        </p>
        <Stars value={rt} onChange={setRt} />
      </div>
      <div className="mt-4 mr-card">
        <p className="text-secondary" style={{ fontSize: "12px" }}>
          Hospital staff
        </p>
        <Stars value={staff} onChange={setStaff} />
      </div>
      <div className="mt-4 mr-card">
        <p className="text-secondary" style={{ fontSize: "12px" }}>
          Recommend MediRush?
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-full py-3 font-semibold"
            style={{ background: rec ? "var(--accent-red)" : "var(--bg-tertiary)", color: "#fff" }}
            onClick={() => setRec(true)}
          >
            Yes
          </button>
          <button
            type="button"
            className="flex-1 rounded-full border border-[var(--border)] py-3 font-semibold text-secondary"
            onClick={() => setRec(false)}
          >
            Not sure
          </button>
        </div>
      </div>
      <label className="mt-4 block">
        <textarea
          className="mr-input mt-2 min-h-[100px] resize-none"
          placeholder="Tell us more (optional)"
          maxLength={300}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <p className="mt-1 text-right text-secondary" style={{ fontSize: "11px" }}>
          {comment.length} / 300
        </p>
      </label>
      <button type="button" className="mr-btn-primary mt-6" disabled={loading} onClick={submit}>
        {t("feedback_submit")}
      </button>
    </div>
  )
}
