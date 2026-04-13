from fastapi import APIRouter
from pydantic import BaseModel, Field
from ai.triage import analyze

router = APIRouter(prefix="/api", tags=["Triage"])


class VitalsIn(BaseModel):
    hr: int = Field(75, ge=20, le=250)
    spo2: int = Field(98, ge=50, le=100)
    age: int = Field(35, ge=1, le=120)
    bp_sys: int | None = None
    bp_dia: int | None = None


class AnalyzeRequest(BaseModel):
    symptoms: list[str]
    vitals: VitalsIn = VitalsIn()
    transcript: str | None = None


@router.get("/symptoms/features")
def list_symptom_features():
    """Expose canonical ML feature names for autocomplete in the patient app."""
    try:
        from ai.feature_columns import FEATURE_COLUMNS

        return {"features": FEATURE_COLUMNS}
    except Exception:
        return {"features": []}


@router.post("/analyze")
def analyze_endpoint(req: AnalyzeRequest):
    v = req.vitals
    return analyze(
        symptoms=req.symptoms,
        hr=v.hr,
        spo2=v.spo2,
        age=v.age,
    )


# Backward compatibility
@router.post("/analyze_symptoms")
def analyze_symptoms_legacy(req: AnalyzeRequest):
    return analyze_endpoint(req)
