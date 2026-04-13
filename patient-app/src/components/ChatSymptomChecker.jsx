import { useCallback, useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const TERMINAL = 12

const QUESTION_TREE = [
  {
    id: 0,
    question: "Where is your pain or discomfort?",
    type: "choice",
    options: ["Chest", "Head", "Abdomen", "Arms/Legs", "Whole body", "No pain"],
    next: { Chest: 1, Head: 4, Abdomen: 7, "Arms/Legs": 9, "Whole body": 10, "No pain": 11 },
    symptoms_added: {},
  },
  {
    id: 1,
    question: "How would you describe the chest sensation?",
    type: "choice",
    options: ["Crushing pressure", "Sharp stabbing", "Tight squeezing", "Burning", "None of these"],
    next: {
      "Crushing pressure": 2,
      "Sharp stabbing": 3,
      "Tight squeezing": 2,
      Burning: 3,
      "None of these": 11,
    },
    symptoms_added: {
      "Crushing pressure": ["chest pain", "chest pressure", "chest tightness"],
      "Sharp stabbing": ["chest pain", "sharp chest pain"],
      "Tight squeezing": ["chest tightness", "chest pain"],
      Burning: ["heartburn", "chest pain"],
    },
  },
  {
    id: 2,
    question: "Do you have any of these additional symptoms?",
    type: "multi",
    options: ["Left arm pain or numbness", "Shortness of breath", "Sweating", "Nausea", "Jaw pain"],
    next: { default: TERMINAL },
    symptoms_added: {
      "Left arm pain or numbness": ["left arm pain", "left arm numbness"],
      "Shortness of breath": ["shortness of breath"],
      Sweating: ["sweating"],
      Nausea: ["nausea"],
      "Jaw pain": ["jaw pain"],
    },
  },
  {
    id: 3,
    question: "Do you have difficulty breathing?",
    type: "yesno",
    next: { Yes: TERMINAL, No: 11 },
    symptoms_added: { Yes: ["difficulty breathing", "shortness of breath"] },
  },
  {
    id: 4,
    question: "Describe your headache:",
    type: "choice",
    options: ["Worst headache of my life", "Throbbing one side", "Pressure around head", "Behind eyes"],
    next: { "Worst headache of my life": 5, default: 6 },
    symptoms_added: {
      "Worst headache of my life": ["worst headache of life", "severe headache", "thunderclap headache"],
      "Throbbing one side": ["migraine", "severe headache"],
      "Pressure around head": ["headache", "pressure headache"],
      "Behind eyes": ["headache", "eye pain"],
    },
  },
  {
    id: 5,
    question: "Do you have vision changes, face drooping, or arm weakness?",
    type: "multi",
    options: ["Vision changes", "Face drooping", "Arm weakness", "Speech problems", "None"],
    next: { default: TERMINAL },
    symptoms_added: {
      "Face drooping": ["face drooping"],
      "Arm weakness": ["arm weakness"],
      "Speech problems": ["speech difficulty"],
      "Vision changes": ["vision loss", "blurred vision"],
    },
  },
  {
    id: 6,
    question: "How long has the headache been there?",
    type: "choice",
    options: ["Under 1 hour", "1-6 hours", "More than 6 hours"],
    next: { default: TERMINAL },
    symptoms_added: {},
  },
  {
    id: 7,
    question: "Is the abdominal pain:",
    type: "choice",
    options: ["Severe and sudden", "Cramping", "Constant dull ache", "After eating"],
    next: { "Severe and sudden": 8, default: 11 },
    symptoms_added: {
      "Severe and sudden": ["abdominal pain", "acute abdomen"],
      Cramping: ["abdominal pain", "cramping"],
      "Constant dull ache": ["abdominal pain"],
      "After eating": ["abdominal pain", "nausea"],
    },
  },
  {
    id: 8,
    question: "Any of these?",
    type: "multi",
    options: ["Vomiting blood", "Blood in stool", "Rigid/board-like abdomen", "None"],
    next: { default: TERMINAL },
    symptoms_added: {
      "Vomiting blood": ["vomiting blood"],
      "Blood in stool": ["blood in stool"],
      "Rigid/board-like abdomen": ["rigid abdomen"],
    },
  },
  {
    id: 9,
    question: "What happened to your arms/legs?",
    type: "choice",
    options: ["Sudden weakness", "Severe injury/fracture", "Swelling", "Numbness"],
    next: { default: TERMINAL },
    symptoms_added: {
      "Sudden weakness": ["weakness", "sudden weakness"],
      "Severe injury/fracture": ["fracture", "severe pain"],
      Swelling: ["swelling", "edema"],
      Numbness: ["numbness", "tingling"],
    },
  },
  {
    id: 10,
    question: "Whole body symptoms?",
    type: "multi",
    options: ["High fever (>101°F)", "Severe weakness", "Rash", "Shivering", "Confusion"],
    next: { default: TERMINAL },
    symptoms_added: {
      "High fever (>101°F)": ["high fever"],
      "Severe weakness": ["lethargy", "weakness"],
      Rash: ["skin rash"],
      Shivering: ["shivering", "chills"],
      Confusion: ["confusion", "altered mental status"],
    },
  },
  {
    id: 11,
    question: "Any of these?",
    type: "multi",
    options: [
      "Dizziness/fainting",
      "Palpitations",
      "Severe allergic reaction",
      "Bleeding heavily",
      "None of above",
    ],
    next: { default: TERMINAL },
    symptoms_added: {
      "Dizziness/fainting": ["dizziness", "syncope"],
      Palpitations: ["palpitations", "heart palpitations"],
      "Severe allergic reaction": ["allergic reaction", "anaphylaxis"],
      "Bleeding heavily": ["severe bleeding", "hemorrhage"],
    },
  },
  { id: TERMINAL, question: null, type: "end" },
]

export default function ChatSymptomChecker({ onApply }) {
  const [messages, setMessages] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [collectedSymptoms, setCollectedSymptoms] = useState([])
  const [multiSel, setMultiSel] = useState([])
  const [typing, setTyping] = useState(true)

  const node = useMemo(() => QUESTION_TREE.find((q) => q.id === currentQ), [currentQ])

  useEffect(() => {
    if (!node || node.type === "end") return
    setTyping(true)
    const t = window.setTimeout(() => {
      setTyping(false)
      setMessages((m) => [...m, { role: "bot", text: node.question }])
    }, 600)
    return () => clearTimeout(t)
  }, [currentQ, node])

  const pushSymptoms = useCallback((added) => {
    if (!added?.length) return
    setCollectedSymptoms((prev) => Array.from(new Set([...prev, ...added])))
  }, [])

  const goNext = (nextId) => {
    setMultiSel([])
    setCurrentQ(nextId)
  }

  const handleChoice = (opt) => {
    setMessages((m) => [...m, { role: "user", text: opt }])
    const n = QUESTION_TREE.find((q) => q.id === currentQ)
    if (!n) return
    const added = n.symptoms_added?.[opt] || []
    pushSymptoms(added)
    const nx = n.next?.[opt] ?? n.next?.default ?? TERMINAL
    goNext(nx)
  }

  const handleYesNo = (yn) => {
    setMessages((m) => [...m, { role: "user", text: yn }])
    const n = QUESTION_TREE.find((q) => q.id === currentQ)
    if (!n) return
    const added = n.symptoms_added?.[yn] || []
    pushSymptoms(added)
    goNext(n.next?.[yn] ?? TERMINAL)
  }

  const handleMultiContinue = () => {
    const n = QUESTION_TREE.find((q) => q.id === currentQ)
    if (!n) return
    setMessages((m) => [...m, { role: "user", text: multiSel.join(", ") || "None" }])
    const added = []
    for (const o of multiSel) {
      added.push(...(n.symptoms_added?.[o] || []))
    }
    pushSymptoms(added)
    goNext(n.next?.default ?? TERMINAL)
  }

  const reset = () => {
    setMessages([])
    setCurrentQ(0)
    setCollectedSymptoms([])
    setMultiSel([])
    setTyping(true)
  }

  if (currentQ === TERMINAL) {
    return (
      <div className="flex flex-col gap-4 py-2">
        <div className="flex justify-end">
          <button type="button" className="text-secondary" style={{ fontSize: "12px" }} onClick={reset}>
            Start Over
          </button>
        </div>
        <p className="text-primary" style={{ fontSize: "14px" }}>
          Thanks. Based on your answers, identified symptoms:
        </p>
        <div className="flex flex-wrap gap-2">
          {(collectedSymptoms.length ? collectedSymptoms : ["unspecified_symptom"]).map((s) => (
            <span key={s} className="rounded-full border border-[var(--border)] px-2 py-1 text-secondary" style={{ fontSize: "12px" }}>
              {s.replace(/_/g, " ")}
            </span>
          ))}
        </div>
        <button
          type="button"
          className="mr-btn-primary"
          onClick={() => onApply(collectedSymptoms.length ? collectedSymptoms : ["general_emergency"])}
        >
          Use these for analysis →
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="flex justify-end">
        <button type="button" className="text-secondary" style={{ fontSize: "12px" }} onClick={reset}>
          Start Over
        </button>
      </div>
      <div className="max-h-[320px] space-y-2 overflow-y-auto">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={`${i}-${msg.text}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`max-w-[90%] rounded-2xl px-3 py-2 ${msg.role === "user" ? "ml-auto bg-[#252530]" : "mr-auto bg-[var(--bg-tertiary)]"}`}
              style={{ fontSize: "14px", color: "var(--text-primary)" }}
            >
              {msg.text}
            </motion.div>
          ))}
        </AnimatePresence>
        {typing && (
          <div className="text-secondary" style={{ fontSize: "12px" }}>
            …
          </div>
        )}
      </div>
      {!typing && node?.type === "choice" && (
        <div className="flex flex-wrap gap-2">
          {node.options.map((o) => (
            <button key={o} type="button" className="rounded-full border border-[var(--border)] px-3 py-2 text-primary" style={{ fontSize: "13px" }} onClick={() => handleChoice(o)}>
              {o}
            </button>
          ))}
        </div>
      )}
      {!typing && node?.type === "yesno" && (
        <div className="flex gap-2">
          <button type="button" className="mr-btn-primary flex-1" onClick={() => handleYesNo("Yes")}>
            Yes
          </button>
          <button type="button" className="mr-btn-secondary flex-1" onClick={() => handleYesNo("No")}>
            No
          </button>
        </div>
      )}
      {!typing && node?.type === "multi" && (
        <div>
          {node.options.map((o) => (
            <label key={o} className="mb-2 flex items-center gap-2 text-secondary" style={{ fontSize: "14px" }}>
              <input
                type="checkbox"
                checked={multiSel.includes(o)}
                onChange={(e) => {
                  if (e.target.checked) setMultiSel((s) => [...s, o])
                  else setMultiSel((s) => s.filter((x) => x !== o))
                }}
              />
              {o}
            </label>
          ))}
          <button type="button" className="mr-btn-primary mt-3 w-full" onClick={handleMultiContinue}>
            Continue →
          </button>
        </div>
      )}
    </div>
  )
}
