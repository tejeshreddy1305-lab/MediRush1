"""
Train disease + severity classifiers from a public symptom–disease CSV.
Primary: GeeksforGeeks improved dataset (reachable). Expands rows to 132 binary features.
"""

from __future__ import annotations

import io
import json
import os
import urllib.request
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

try:
    from .feature_columns import FEATURE_COLUMNS
except ImportError:
    from feature_columns import FEATURE_COLUMNS

DIR = Path(__file__).resolve().parent

DATASET_URLS = [
    os.getenv(
        "TRIAGE_DATASET_URL",
        "https://media.geeksforgeeks.org/wp-content/uploads/20250415160347722782/improved_disease_dataset.csv",
    ),
    "https://raw.githubusercontent.com/anujdutt9/Disease-Prediction-from-Symptoms/master/dataset/training.csv",
]

SEVERITY_MAP = {
    "Heart attack": "CRITICAL",
    "Stroke": "CRITICAL",
    "Paralysis (brain hemorrhage)": "CRITICAL",
    "Bronchial Asthma": "CRITICAL",
    "Hypertension": "MODERATE",
    "Diabetes": "MODERATE",
    "Pneumonia": "MODERATE",
    "Urinary tract infection": "MODERATE",
    "Migraine": "MODERATE",
    "Cervical spondylosis": "MODERATE",
    "Jaundice": "MODERATE",
    "Malaria": "MODERATE",
    "Dengue": "MODERATE",
    "Typhoid": "MODERATE",
    "Hepatitis A": "MODERATE",
    "Common Cold": "NORMAL",
    "Chicken pox": "NORMAL",
    "Fungal infection": "NORMAL",
    "Allergy": "NORMAL",
    "Drug Reaction": "NORMAL",
    "Acne": "NORMAL",
}

# Map CSV column names (10-feature GFG set) → canonical feature column keys
COL_MAP = {
    "fever": "high_fever",
    "headache": "headache",
    "nausea": "nausea",
    "vomiting": "vomiting",
    "fatigue": "fatigue",
    "joint_pain": "joint_pain",
    "skin_rash": "skin_rash",
    "cough": "cough",
    "weight_loss": "weight_loss",
    "yellow_eyes": "yellowing_of_eyes",
}

FEATURE_INDEX = {c: i for i, c in enumerate(FEATURE_COLUMNS)}


def _download_csv() -> pd.DataFrame:
    last_err: Exception | None = None
    for url in DATASET_URLS:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "MediRush-train/1.0"})
            raw = urllib.request.urlopen(req, timeout=60).read()
            df = pd.read_csv(io.BytesIO(raw))
            if "prognosis" in df.columns and len(df.columns) > 50:
                return df
            if "disease" in df.columns:
                return df
        except Exception as e:
            last_err = e
            continue
    raise RuntimeError(f"Could not download dataset: {last_err}")


def _map_severity(prognosis: str) -> str:
    p = (prognosis or "").strip()
    if p in SEVERITY_MAP:
        return SEVERITY_MAP[p]
    # fuzzy: strip extra spaces
    for k, v in SEVERITY_MAP.items():
        if k.lower() == p.lower():
            return v
    return "MODERATE"


def _rows_to_x(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    if "prognosis" in df.columns:
        y_raw = df["prognosis"].astype(str)
    else:
        y_raw = df["disease"].astype(str)

    n = len(df)
    X = np.zeros((n, len(FEATURE_COLUMNS)), dtype=np.float32)

    if set(COL_MAP.keys()).issubset(df.columns):
        for csv_col, canon in COL_MAP.items():
            idx = FEATURE_INDEX.get(canon)
            if idx is not None:
                X[:, idx] = df[csv_col].values.astype(np.float32)
    else:
        # Wide Kaggle-style CSV: symptom columns match FEATURE_COLUMNS
        for j, col in enumerate(FEATURE_COLUMNS):
            if col in df.columns:
                X[:, j] = df[col].values.astype(np.float32)

    y_disease = y_raw.values
    y_severity = np.array([_map_severity(x) for x in y_disease])
    return X, y_disease, y_severity


def main() -> None:
    df = _download_csv()
    X, y_disease, y_severity = _rows_to_x(df)

    X_train, X_test, yd_train, yd_test, ys_train, ys_test = train_test_split(
        X, y_disease, y_severity, test_size=0.2, random_state=42, stratify=y_severity
    )

    disease_model = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced_subsample",
    )
    disease_model.fit(X_train, yd_train)
    yd_pred = disease_model.predict(X_test)
    disease_acc = accuracy_score(yd_test, yd_pred)

    severity_model = GradientBoostingClassifier(
        n_estimators=200,
        learning_rate=0.08,
        max_depth=5,
        random_state=42,
    )
    severity_model.fit(X_train, ys_train)
    ys_pred = severity_model.predict(X_test)
    severity_acc = accuracy_score(ys_test, ys_pred)

    print("=== Disease classifier ===")
    print(f"Test accuracy: {disease_acc * 100:.2f}%")
    print(classification_report(yd_test, yd_pred, zero_division=0))
    print("Confusion matrix (disease, top classes may be large):\n", confusion_matrix(yd_test, yd_pred))

    print("=== Severity classifier ===")
    print(f"Test accuracy: {severity_acc * 100:.2f}%")
    print(classification_report(ys_test, ys_pred, zero_division=0))
    print(confusion_matrix(ys_test, ys_pred))

    joblib.dump(disease_model, DIR / "disease_model.pkl")
    joblib.dump(severity_model, DIR / "severity_model.pkl")
    joblib.dump(FEATURE_COLUMNS, DIR / "feature_columns.pkl")

    metrics = {
        "disease_accuracy": round(float(disease_acc) * 100, 2),
        "severity_accuracy": round(float(severity_acc) * 100, 2),
    }
    (DIR / "train_metrics.json").write_text(json.dumps(metrics), encoding="utf-8")
    print("Saved disease_model.pkl, severity_model.pkl, feature_columns.pkl, train_metrics.json")


def train_all() -> None:
    """Train models from remote CSV and persist pkls; reload triage module if present."""
    main()
    try:
        from . import triage as triage_mod

        triage_mod.reload_models()
    except Exception:
        try:
            import triage as triage_mod

            triage_mod.reload_models()
        except Exception:
            pass


if __name__ == "__main__":
    main()
