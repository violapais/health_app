"""
main.py  (Week 1, Day 6-7 + Week 2, Day 4-5 + Week 3, Day 5-7)

FastAPI backend for the symptom checker.

Endpoints:
  GET  /health          - liveness check
  GET  /symptoms         - list of all 132 known symptom keys (for the app's
                            multi-select screen)
  POST /predict          - disease prediction + probabilities
  POST /explain           - prediction + calibrated confidence + SHAP explanation
  POST /report             - the full merged report the mobile app calls:
                              ML prediction + confidence + SHAP + LLM summary + risk level

Run:
    uvicorn main:app --reload --port 8000
"""
import json
from pathlib import Path
from typing import List

import numpy as np
import pandas as pd
import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from explainability import get_explainer
from risk_rules import assess_risk
import llm_explain

from disease_information import get_disease_information

load_dotenv()

MODEL_DIR = Path(__file__).parent / "model"

# Use the educational Kaggle benchmark candidate model.
USE_CANDIDATE_MODEL = True

MODEL_SUFFIX = "_candidate" if USE_CANDIDATE_MODEL else ""

app = FastAPI(title="Symptom Checker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to the app's origin in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Load model artifacts once at startup ----
try:
    model = joblib.load(
        MODEL_DIR / f"disease_model_calibrated{MODEL_SUFFIX}.pkl"
    )

    label_encoder = joblib.load(
        MODEL_DIR / f"label_encoder{MODEL_SUFFIX}.pkl"
    )

    with open(
        MODEL_DIR / f"feature_columns{MODEL_SUFFIX}.json"
    ) as f:
        FEATURE_COLUMNS: List[str] = json.load(f)

    explainer = get_explainer(model, FEATURE_COLUMNS)

    FEATURE_INDEX = {
        name: i for i, name in enumerate(FEATURE_COLUMNS)
    }

    print("Loaded model:", "candidate" if USE_CANDIDATE_MODEL else "original")
    print("Disease classes:", len(label_encoder.classes_))
    print("Symptom features:", len(FEATURE_COLUMNS))

except FileNotFoundError as exc:
    raise RuntimeError(
        f"Model artifact not found: {exc.filename}"
    )

# Rough disease -> specialty lookup for the "nearby doctor" feature (Week 5)

SPECIALTY_MAP = {
    # Respiratory
    "Bronchial Asthma": "Pulmonologist",
    "Pneumonia": "Pulmonologist",
    "Tuberculosis": "Pulmonologist",
    "Common Cold": "General Physician",

    # Heart and blood vessels
    "Heart attack": "Cardiologist",
    "Hypertension": "Cardiologist",
    "Varicose veins": "Vascular Surgeon",

    # Endocrine and metabolic
    "Diabetes": "Endocrinologist",
    "Hypothyroidism": "Endocrinologist",
    "Hyperthyroidism": "Endocrinologist",
    "Hypoglycemia": "Endocrinologist",

    # Infectious diseases
    "Malaria": "Infectious Disease Specialist",
    "Dengue": "Infectious Disease Specialist",
    "Typhoid": "Infectious Disease Specialist",
    "AIDS": "Infectious Disease Specialist",
    "Chicken pox": "Dermatologist",
    "hepatitis A": "Gastroenterologist",
    "Hepatitis B": "Gastroenterologist",
    "Hepatitis C": "Gastroenterologist",
    "Hepatitis D": "Gastroenterologist",
    "Hepatitis E": "Gastroenterologist",

    # Neurological
    "(vertigo) Paroymsal  Positional Vertigo": "ENT Specialist",
    "Migraine": "Neurologist",
    "Paralysis (brain hemorrhage)": "Neurologist",

    # Bone and joint
    "Cervical spondylosis": "Orthopedist",
    "Osteoarthristis": "Orthopedist",
    "Arthritis": "Rheumatologist",

    # Skin and allergy
    "Psoriasis": "Dermatologist",
    "Acne": "Dermatologist",
    "Impetigo": "Dermatologist",
    "Fungal infection": "Dermatologist",
    "Dimorphic hemmorhoids(piles)": "General Surgeon",
    "Drug Reaction": "Dermatologist",
    "Allergy": "Allergist",

    # Digestive
    "GERD": "Gastroenterologist",
    "Gastroenteritis": "Gastroenterologist",
    "Chronic cholestasis": "Gastroenterologist",
    "Alcoholic hepatitis": "Gastroenterologist",
    "Jaundice": "Gastroenterologist",
    "Peptic ulcer diseae": "Gastroenterologist",

    # Urinary
    "Urinary tract infection": "Urologist",
}

DEFAULT_SPECIALTY = "General Physician"


class PredictRequest(BaseModel):
    symptoms: List[str] = Field(..., description="List of symptom keys, e.g. ['high_fever','chills']")


class PredictResponse(BaseModel):
    disease: str
    probabilities: dict


class ExplainResponse(BaseModel):
    disease: str
    confidence: float
    top_contributing_symptoms: list


class ReportResponse(BaseModel):
    disease: str
    confidence: float
    top_contributing_symptoms: list
    llm_explanation: str
    risk_level: str
    risk_detail: dict
    recommended_specialty: str
    disease_information: dict


def _vectorize(symptoms: List[str]) -> np.ndarray:
    unknown = [s for s in symptoms if s not in FEATURE_INDEX]
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unknown symptom(s): {unknown}")
    if not symptoms:
        raise HTTPException(status_code=400, detail="Provide at least one symptom.")
    vec = np.zeros(len(FEATURE_COLUMNS), dtype=int)
    for s in symptoms:
        vec[FEATURE_INDEX[s]] = 1
    return vec


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/symptoms")
def list_symptoms():
    return {"symptoms": FEATURE_COLUMNS, "count": len(FEATURE_COLUMNS)}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    x = _vectorize(req.symptoms)
    probs = model.predict_proba(pd.DataFrame([x], columns=FEATURE_COLUMNS))[0]
    top_idx = int(np.argmax(probs))
    disease = label_encoder.inverse_transform([top_idx])[0]
    prob_dict = {
        label_encoder.inverse_transform([i])[0]: round(float(p), 4)
        for i, p in enumerate(probs)
    }
    return {"disease": disease, "probabilities": prob_dict}


@app.post("/explain", response_model=ExplainResponse)
def explain(req: PredictRequest):
    x = _vectorize(req.symptoms)
    probs = model.predict_proba(pd.DataFrame([x], columns=FEATURE_COLUMNS))[0]
    top_idx = int(np.argmax(probs))
    disease = label_encoder.inverse_transform([top_idx])[0]
    confidence = round(float(probs[top_idx]), 4)
    top_contributors = explainer.top_contributors(x, top_idx, top_n=5)
    return {
        "disease": disease,
        "confidence": confidence,
        "top_contributing_symptoms": top_contributors,
    }



@app.post("/report", response_model=ReportResponse)
def report(req: PredictRequest):
    x = _vectorize(req.symptoms)

    probs = model.predict_proba(
        pd.DataFrame([x], columns=FEATURE_COLUMNS)
    )[0]

    top_idx = int(np.argmax(probs))

    disease = label_encoder.inverse_transform([top_idx])[0]

    confidence = round(float(probs[top_idx]), 4)

    top_contributors = explainer.top_contributors(
        x, top_idx, top_n=5
    )

    llm_summary = llm_explain.explain(
        disease, confidence, top_contributors
    )

    risk = assess_risk(req.symptoms)

    specialty = SPECIALTY_MAP.get(
        disease, DEFAULT_SPECIALTY
    )

    # Retrieve medically reviewed disease information.
    disease_information = get_disease_information(disease)

    return {
        "disease": disease,
        "confidence": confidence,
        "top_contributing_symptoms": top_contributors,
        "llm_explanation": llm_summary,
        "risk_level": risk["level"],
        "risk_detail": risk,
        "recommended_specialty": specialty,
        "disease_information": disease_information,
    }

