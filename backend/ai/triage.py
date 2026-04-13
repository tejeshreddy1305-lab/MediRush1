"""ML triage inference with sklearn models; rule-based fallback if artifacts are missing."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path

import joblib
import numpy as np

logger = logging.getLogger("medirush")

_DIR = Path(__file__).resolve().parent
_METRICS_PATH = _DIR / "train_metrics.json"

disease_model = None
severity_model = None
feature_columns: list[str] | None = None
MODEL_AVAILABLE = False

try:
    disease_model = joblib.load(_DIR / "disease_model.pkl")
    severity_model = joblib.load(_DIR / "severity_model.pkl")
    feature_columns = joblib.load(_DIR / "feature_columns.pkl")
    MODEL_AVAILABLE = True
except Exception as e:
    logger.warning("Triage ML artifacts missing or unloadable — using fallback: %s", e)
    MODEL_AVAILABLE = False


def reload_models() -> None:
    """Reload joblib artifacts after training (mutates module globals)."""
    global disease_model, severity_model, feature_columns, MODEL_AVAILABLE
    try:
        disease_model = joblib.load(_DIR / "disease_model.pkl")
        severity_model = joblib.load(_DIR / "severity_model.pkl")
        feature_columns = joblib.load(_DIR / "feature_columns.pkl")
        MODEL_AVAILABLE = True
        logger.info("Triage ML models reloaded successfully")
    except Exception as e:
        MODEL_AVAILABLE = False
        logger.warning("Triage ML models could not be reloaded: %s", e)


def _normalize_token(s: str) -> str:
    return s.lower().strip().replace(" ", "_").replace("-", "_")


def rule_based_fallback(
    symptoms: list[str], hr: int, spo2: int, age: int
) -> dict:
    """Spec-aligned heuristic triage when ML models are unavailable."""
    text = " ".join(symptoms).lower()
    critical_keywords = [
        "chest pain",
        "heart attack",
        "stroke",
        "unconscious",
        "not breathing",
        "severe bleeding",
        "cardiac arrest",
    ]
    moderate_keywords = [
        "fracture",
        "high fever",
        "difficulty breathing",
        "vomiting",
        "abdominal pain",
    ]
    score = 1.0
    if any(k in text for k in critical_keywords):
        score = 9.0
    elif any(k in text for k in moderate_keywords):
        score = 5.5
    if spo2 < 90 or hr > 140:
        score = max(score, 9.0)
    severity = "CRITICAL" if score >= 7 else "MODERATE" if score >= 4 else "NORMAL"
    actions = {
        "CRITICAL": "Life-threatening emergency detected. Proceed to emergency department immediately. Do not drive yourself.",
        "MODERATE": "Urgent medical attention needed within 1-2 hours. Avoid food/water until assessed.",
        "NORMAL": "Non-urgent. Monitor symptoms. Book a GP appointment if symptoms persist >48 hours.",
    }
    return {
        "severity": severity,
        "score": round(float(score), 1),
        "confidence": 65.0,
        "condition": "General Emergency",
        "action": actions[severity],
        "vitals_flag": spo2 < 90 or hr > 140,
        "severity_probabilities": {},
    }


def _fallback_analyze(
    symptoms: list[str], hr: int, spo2: int, age: int
) -> dict:
    """Back-compat alias."""
    return rule_based_fallback(symptoms, hr, spo2, age)


def analyze(
    symptoms: list[str],
    hr: int = 75,
    spo2: int = 98,
    age: int = 35,
) -> dict:
    if not MODEL_AVAILABLE or not feature_columns or disease_model is None or severity_model is None:
        logger.warning("Triage: ML models not loaded — fallback triage path used")
        return rule_based_fallback(symptoms, hr, spo2, age)

    vec = np.zeros(len(feature_columns), dtype=np.float64)
    symptom_lower = [_normalize_token(s) for s in symptoms]
    for i, col in enumerate(feature_columns):
        c = col.lower().replace(" ", "_")
        if c in symptom_lower or any(
            c in s or s in c for s in symptom_lower if len(s) > 2
        ):
            vec[i] = 1.0

    vitals_critical = spo2 < 90 or hr > 140 or hr < 40

    disease = disease_model.predict([vec])[0]
    severity = severity_model.predict([vec])[0]
    disease_proba = disease_model.predict_proba([vec])[0]
    severity_proba = severity_model.predict_proba([vec])[0]

    confidence = round(float(np.max(disease_proba)) * 100, 1)

    if vitals_critical:
        severity = "CRITICAL"

    base_map = {"CRITICAL": 8.5, "MODERATE": 5.0, "NORMAL": 2.0}
    base = base_map.get(str(severity), 5.0)
    score = round(min(10.0, base + (confidence / 100) * 1.5), 1)

    if age > 60 and str(severity) == "MODERATE":
        severity = "CRITICAL"
        score = min(10.0, score + 1.2)

    actions = {
        "CRITICAL": "Life-threatening emergency detected. Proceed to emergency department immediately. Do not drive yourself.",
        "MODERATE": "Urgent medical attention needed within 1-2 hours. Avoid food/water until assessed.",
        "NORMAL": "Non-urgent. Monitor symptoms. Book a GP appointment if symptoms persist >48 hours.",
    }

    return {
        "severity": str(severity),
        "score": score,
        "confidence": confidence,
        "condition": str(disease),
        "action": actions.get(str(severity), actions["MODERATE"]),
        "vitals_flag": vitals_critical,
        "severity_probabilities": {
            str(cls): round(float(p) * 100, 1)
            for cls, p in zip(severity_model.classes_, severity_proba)
        },
    }


def log_metrics_once() -> None:
    """Emit training metrics once at startup if train_metrics.json exists."""
    if not _METRICS_PATH.exists():
        return
    try:
        data = json.loads(_METRICS_PATH.read_text(encoding="utf-8"))
        logger.info(
            "Triage Model — Disease Acc: %s%% | Severity Acc: %s%%",
            data.get("disease_accuracy", "?"),
            data.get("severity_accuracy", "?"),
        )
    except Exception:
        pass
