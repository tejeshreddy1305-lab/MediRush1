from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db, Patient, EmergencyHistory
from pydantic import BaseModel
import httpx, json
import numpy as np

router = APIRouter(prefix="/api", tags=["Patients"])


class DrugRequest(BaseModel):
    drug_name: str


@router.get("/patient/{patient_id}")
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    p = db.query(Patient).filter(Patient.id == patient_id).first()
    if not p:
        return {
            "id": "demo-patient-001",
            "name": "Ravi Kumar",
            "age": 34,
            "sex": "Male",
            "blood_type": "O+",
            "allergies": "Penicillin",
            "chronic_conditions": "Hypertension,Type 2 Diabetes",
            "current_medications": "Amlodipine 5mg,Metformin 500mg",
            "vitals_history": json.dumps(
                [
                    {"date": "Jan 5", "bp": "138/88", "hr": 82},
                    {"date": "Jan 8", "bp": "142/90", "hr": 79},
                    {"date": "Jan 11", "bp": "135/85", "hr": 84},
                ]
            ),
            "visit_history": json.dumps([]),
        }
    return {
        "id": p.id,
        "name": p.name,
        "age": p.age,
        "sex": p.sex,
        "blood_type": p.blood_type,
        "allergies": p.allergies,
        "chronic_conditions": p.chronic_conditions,
        "current_medications": p.current_medications,
        "vitals_history": p.vitals_history,
        "visit_history": p.visit_history,
    }


def _parse_bp(bp: str) -> tuple[int, int]:
    parts = str(bp or "120/80").replace(" ", "").split("/")
    try:
        sysv = int(parts[0]) if parts and parts[0].isdigit() else 120
    except Exception:
        sysv = 120
    try:
        diav = int(parts[1]) if len(parts) > 1 and str(parts[1]).isdigit() else 80
    except Exception:
        diav = 80
    return sysv, diav


def _analyze_trend(values: list[float]) -> dict:
    if len(values) < 3:
        return {"trend": "insufficient_data", "alert": None, "slope": 0.0, "predicted_next": None}
    x = np.arange(len(values), dtype=float)
    slope = float(np.polyfit(x, np.array(values, dtype=float), 1)[0])
    if slope > 0.5:
        trend = "rising"
    elif slope < -0.5:
        trend = "falling"
    else:
        trend = "stable"
    next_val = round(float(values[-1]) + slope, 1)
    return {"trend": trend, "slope": round(slope, 2), "predicted_next": next_val, "alert": None}


@router.get("/patient/{patient_id}/vitals/analysis")
def vitals_analysis(patient_id: str, db: Session = Depends(get_db)):
    p = db.query(Patient).filter(Patient.id == patient_id).first()
    if not p or not p.vitals_history:
        return {"bp": {"trend": "insufficient_data"}, "hr": {"trend": "insufficient_data"}, "alerts": []}
    try:
        vitals = json.loads(p.vitals_history or "[]")
    except Exception:
        return {"bp": {"trend": "insufficient_data"}, "hr": {"trend": "insufficient_data"}, "alerts": []}

    last5 = vitals[-5:]
    bp_sys_vals: list[float] = []
    hr_vals: list[float] = []
    for v in last5:
        if "bp_sys" in v:
            bp_sys_vals.append(float(v["bp_sys"]))
        else:
            sysv, _ = _parse_bp(v.get("bp", "120/80"))
            bp_sys_vals.append(float(sysv))
        hr_vals.append(float(v.get("hr", 75)))

    bp_analysis = _analyze_trend(bp_sys_vals)
    hr_analysis = _analyze_trend(hr_vals)

    alerts = []
    pred = bp_analysis.get("predicted_next")
    if bp_analysis.get("trend") == "rising" and pred is not None and pred > 140:
        alerts.append(
            {
                "type": "WARNING",
                "metric": "Blood Pressure",
                "message": f"BP trending upward. Predicted next reading: {pred} mmHg. Consider consulting a doctor.",
                "icon": "trending_up",
            }
        )
    if bp_sys_vals and bp_sys_vals[-1] > 180:
        alerts.append(
            {
                "type": "CRITICAL",
                "metric": "Blood Pressure",
                "message": "Hypertensive crisis range detected in latest reading. Seek immediate care.",
                "icon": "emergency",
            }
        )

    return {"bp": bp_analysis, "hr": hr_analysis, "alerts": alerts}


@router.get("/patient/{patient_id}/history")
def patient_emergency_history(patient_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(EmergencyHistory)
        .filter(EmergencyHistory.patient_id == patient_id)
        .order_by(EmergencyHistory.date.desc())
        .all()
    )
    out = []
    for r in rows:
        try:
            meds = json.loads(r.medications_given or "[]")
        except Exception:
            meds = []
        out.append(
            {
                "id": r.id,
                "date": r.date,
                "condition": r.condition,
                "severity": r.severity,
                "hospital_name": r.hospital_name,
                "hospital_type": r.hospital_type,
                "treatment_time_minutes": r.treatment_time_minutes,
                "outcome": r.outcome,
                "medications_given": meds,
                "discharge_notes": r.discharge_notes or "",
                "doctor_name": r.doctor_name or "",
            }
        )
    return out


@router.get("/patient/{patient_id}/vitals")
def get_patient_vitals(patient_id: str, db: Session = Depends(get_db)):
    p = db.query(Patient).filter(Patient.id == patient_id).first()
    if not p or not p.vitals_history:
        return {
            "points": [
                {"date": "Jan 5", "bp_sys": 138, "bp_dia": 88, "hr": 82},
                {"date": "Jan 8", "bp_sys": 142, "bp_dia": 90, "hr": 79},
                {"date": "Jan 11", "bp_sys": 135, "bp_dia": 85, "hr": 84},
                {"date": "Jan 14", "bp_sys": 140, "bp_dia": 88, "hr": 81},
                {"date": "Jan 17", "bp_sys": 138, "bp_dia": 86, "hr": 83},
            ]
        }
    try:
        raw = json.loads(p.vitals_history or "[]")
        points = []
        for row in raw:
            bp = row.get("bp", "120/80")
            parts = str(bp).replace(" ", "").split("/")
            sysv = int(parts[0]) if parts and parts[0].isdigit() else 120
            diav = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 80
            points.append(
                {
                    "date": row.get("date", ""),
                    "bp_sys": sysv,
                    "bp_dia": diav,
                    "hr": row.get("hr", 75),
                }
            )
        return {"points": points}
    except Exception:
        return {"points": []}


@router.post("/drug_info")
async def drug_info(req: DrugRequest):
    try:
        url = f"https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22{req.drug_name}%22&limit=1"
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url)
            data = r.json()
        result = data.get("results", [{}])[0]
        return {
            "purpose": (result.get("purpose") or result.get("indications_and_usage") or [""])[0][:300],
            "warnings": (result.get("warnings") or result.get("warnings_and_cautions") or [""])[0][:300],
            "sideEffects": (result.get("adverse_reactions") or [""])[0][:300],
            "source": "U.S. FDA Drug Database (OpenFDA)",
        }
    except Exception:
        return {
            "purpose": f"{req.drug_name.capitalize()} is used to manage chronic conditions. Consult your doctor.",
            "warnings": "Do not stop taking without consulting your doctor.",
            "sideEffects": "May cause dizziness or nausea in some patients.",
            "source": "Fallback data — FDA API unavailable",
        }


@router.post("/generate_token")
def generate_token():
    import uuid
    from datetime import datetime, timedelta

    token = str(uuid.uuid4())[:8].upper()
    expires_at = (datetime.utcnow() + timedelta(minutes=20)).isoformat()
    return {"token": token, "expires_at": expires_at}
