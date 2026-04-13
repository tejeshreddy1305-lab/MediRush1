import { useMemo, useState } from "react"

const REGIONS = {
  head: ["headache", "dizziness", "blurred_and_distorted_vision"],
  chest: ["chest_pain", "breathlessness", "chest_tightness"],
  abdomen: ["abdominal_pain", "vomiting", "nausea"],
  left_arm: ["muscle_pain", "weakness_in_limbs", "muscle_weakness"],
  right_arm: ["weakness_in_limbs", "muscle_weakness", "neck_pain"],
  left_leg: ["knee_pain", "swollen_legs", "movement_stiffness"],
  right_leg: ["knee_pain", "swollen_legs", "movement_stiffness"],
  back: ["back_pain", "neck_pain", "muscle_weakness"],
}

export default function BodyMap({ symptoms, onChange, pain, setPain }) {
  const [face, setFace] = useState("front")
  const [active, setActive] = useState(null)

  const addAll = (keys) => {
    const s = new Set(symptoms)
    keys.forEach((k) => s.add(k))
    onChange([...s])
  }

  const regions = useMemo(() => Object.keys(REGIONS), [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="mr-caption">Body map</p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-full border border-[var(--border)] px-3 py-1 text-secondary"
            style={{ fontSize: "13px" }}
            onClick={() => setFace("front")}
          >
            Front
          </button>
          <button
            type="button"
            className="rounded-full border border-[var(--border)] px-3 py-1 text-secondary"
            style={{ fontSize: "13px" }}
            onClick={() => setFace("back")}
          >
            Back
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[260px]">
        <svg viewBox="0 0 200 360" className="w-full">
          <rect
            x="20"
            y="10"
            width="160"
            height="340"
            rx="18"
            fill="var(--bg-tertiary)"
            stroke="var(--border)"
          />
          {/* simple body */}
          <ellipse
            cx="100"
            cy="46"
            rx="22"
            ry="26"
            fill={active === "head" ? "rgba(255,59,92,0.25)" : "transparent"}
            stroke="var(--border-strong)"
            onClick={() => {
              setActive("head")
              addAll(REGIONS.head)
            }}
            style={{ cursor: "pointer" }}
          />
          <rect
            x="78"
            y="72"
            width="44"
            height="70"
            rx="10"
            fill={active === "chest" ? "rgba(255,59,92,0.25)" : "transparent"}
            stroke="var(--border-strong)"
            onClick={() => {
              setActive("chest")
              addAll(REGIONS.chest)
            }}
            style={{ cursor: "pointer" }}
          />
          <rect
            x="80"
            y="142"
            width="40"
            height="60"
            rx="10"
            fill={active === "abdomen" ? "rgba(255,59,92,0.25)" : "transparent"}
            stroke="var(--border-strong)"
            onClick={() => {
              setActive("abdomen")
              addAll(REGIONS.abdomen)
            }}
            style={{ cursor: "pointer" }}
          />
          <rect
            x="52"
            y="84"
            width="22"
            height="90"
            rx="8"
            fill={active === "left_arm" ? "rgba(255,59,92,0.25)" : "transparent"}
            stroke="var(--border-strong)"
            onClick={() => {
              setActive("left_arm")
              addAll(REGIONS.left_arm)
            }}
            style={{ cursor: "pointer" }}
          />
          <rect
            x="126"
            y="84"
            width="22"
            height="90"
            rx="8"
            fill={active === "right_arm" ? "rgba(255,59,92,0.25)" : "transparent"}
            stroke="var(--border-strong)"
            onClick={() => {
              setActive("right_arm")
              addAll(REGIONS.right_arm)
            }}
            style={{ cursor: "pointer" }}
          />
          <rect
            x="78"
            y="200"
            width="18"
            height="110"
            rx="8"
            fill={active === "left_leg" ? "rgba(255,59,92,0.25)" : "transparent"}
            stroke="var(--border-strong)"
            onClick={() => {
              setActive("left_leg")
              addAll(REGIONS.left_leg)
            }}
            style={{ cursor: "pointer" }}
          />
          <rect
            x="104"
            y="200"
            width="18"
            height="110"
            rx="8"
            fill={active === "right_leg" ? "rgba(255,59,92,0.25)" : "transparent"}
            stroke="var(--border-strong)"
            onClick={() => {
              setActive("right_leg")
              addAll(REGIONS.right_leg)
            }}
            style={{ cursor: "pointer" }}
          />
          {face === "back" && (
            <rect
              x="86"
              y="120"
              width="28"
              height="70"
              rx="10"
              fill={active === "back" ? "rgba(255,59,92,0.25)" : "transparent"}
              stroke="var(--border-strong)"
              onClick={() => {
                setActive("back")
                addAll(REGIONS.back)
              }}
              style={{ cursor: "pointer" }}
            />
          )}
        </svg>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="mr-caption">Pain level</p>
          <span className="text-primary font-semibold">{pain}/10</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={pain}
          onChange={(e) => setPain(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: "var(--accent-red)" }}
        />
      </div>

      <p className="text-secondary" style={{ fontSize: "11px" }}>
        Tap regions: {regions.join(", ")}
      </p>
    </div>
  )
}
