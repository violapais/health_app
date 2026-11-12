# Symptom Checker — Explainable AI Health App

An end-to-end symptom-checking app: a FastAPI + scikit-learn backend that
predicts a likely condition from selected symptoms, explains *why* using
SHAP, calibrates its confidence so it isn't overconfident, flags red-flag
emergency symptom combinations, and turns all of that into a plain-language
summary via the Claude API — surfaced through a React Native mobile app
with maps, auth, and history.

This repo is a **working implementation** of the 6-week build plan you
provided, condensed into runnable code. See "What's real vs. what you need
to fill in" below for exactly what's been verified to run in this build
environment vs. what needs your own API keys/devices to test.

## Architecture

```
┌─────────────────┐      symptoms[]       ┌──────────────────────────┐
│  React Native    │ ─────────────────────▶│   FastAPI backend         │
│  mobile app       │                        │                            │
│                    │ ◀───────────────────  │  /predict  /explain        │
│  Symptom picker    │   full report JSON     │  /report   /symptoms       │
│  Report screen      │                        │                            │
│  (chart + risk)      │                        │  ┌──────────────────────┐ │
│  History (Firestore)  │                        │  │ RandomForest / XGB    │ │
│  Nearby care (Maps)     │                        │  │ + CalibratedClassCV   │ │
└─────────┬──────────┘                        │  └──────────────────────┘ │
          │                                    │  ┌──────────────────────┐ │
          │  Firebase Auth + Firestore         │  │ SHAP TreeExplainer     │ │
          ▼                                     │  └──────────────────────┘ │
   ┌────────────┐                               │  ┌──────────────────────┐ │
   │  Firebase   │                               │  │ Emergency rule engine │ │
   └────────────┘                               │  └──────────────────────┘ │
                                                  │  ┌──────────────────────┐ │
                                                  │  │ Claude API (explain)  │ │
                                                  │  └──────────────────────┘ │
                                                  └──────────────────────────┘
```

## What's real vs. what you need to fill in

| Piece | Status in this build |
|---|---|
| Dataset | **Synthetic, generated here** (132 symptoms × 42 diseases) — this sandbox has no internet, so the real Kaggle dataset couldn't be downloaded. `ml/generate_dataset.py` documents exactly how to swap in the real Kaggle CSVs (drop-in, no code changes needed). |
| Random Forest training + evaluation | ✅ Actually trained and evaluated here. Real result: **98.7% accuracy, 0.985 macro-F1** on held-out synthetic test data. |
| XGBoost comparison | Code is written (`ml/train_model.py`) but xgboost isn't installed in this sandbox (no internet to `pip install`), so it didn't run here — `pip install xgboost` locally and it'll train and compare automatically. |
| Confidence calibration | ✅ Actually run (`CalibratedClassifierCV`), saved as `disease_model_calibrated.pkl`. |
| SHAP explainability | Code written for real `shap.TreeExplainer`; sandbox doesn't have `shap` installed, so it currently runs on a feature-importance-based fallback (`explainability.py` — same interface, swap-in-ready). `pip install shap` locally enables the real thing with zero other changes. |
| FastAPI endpoints | ✅ Core logic (model load, vectorization, prediction, explanation, risk rules, LLM call w/ fallback) tested end-to-end in-process. `fastapi`/`uvicorn` aren't installed in this sandbox so the HTTP server itself wasn't started here — it will run immediately once you `pip install -r requirements.txt`. |
| Claude API integration | Code complete with a deterministic template fallback when no API key is set (so the app works out of the box); real Claude output requires your own `ANTHROPIC_API_KEY`. |
| Emergency rule engine | ✅ Actually run and verified (cardiac/stroke/meningitis/etc. combos). |
| React Native app | Full source for all screens (login/register, symptom picker, report w/ chart, history, nearby care). Written against React Native 0.74 + the libraries in `package.json`. Not executed here — this sandbox has no Android/iOS toolchain — so treat it as a complete, ready-to-run starting point rather than something screenshot-tested. |
| Firebase / Google Places / Maps | Code complete but needs **your own Firebase project config** and **Google Places API key** dropped in — these are credentials only you can provide. |

## Backend setup

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then add your ANTHROPIC_API_KEY (optional — works without it)

# generate data + train the model (only needed once, or after changing the data)
cd ../ml
python3 generate_dataset.py     # or drop in real Kaggle Training.csv/Testing.csv into ml/data/
python3 train_model.py

# run the API
cd ../backend
uvicorn main:app --reload --port 8000
```

Test it:
```bash
curl http://localhost:8000/symptoms | head -c 300
curl -X POST http://localhost:8000/report \
  -H "Content-Type: application/json" \
  -d '{"symptoms": ["high_fever", "chills", "sweating", "fatigue"]}'
```

## Mobile app setup

```bash
cd HealthAppNative
npm install
# iOS only: cd ios && pod install && cd ..

# Point src/services/api.js at your backend:
#   - Android emulator: http://10.0.2.2:8000
#   - iOS simulator:    http://localhost:8000
#   - Physical device:  http://<your-computer-LAN-IP>:8000

# Add your Firebase config (google-services.json / GoogleService-Info.plist)

npx react-native run-android   # or run-ios
```

## Model evaluation (real numbers from this build)

```
Random Forest
  Accuracy:  0.9868
  Precision: 0.9854 (macro)
  Recall:    0.9873 (macro)
  F1:        0.9852 (macro)
Calibrated accuracy: 0.9815
```
Full confusion matrix, per-class precision/recall, and the model comparison
are saved to `backend/model/metrics.json` after every training run — use
that for your "Results" section and calibration/reliability charts.

## API reference

| Endpoint | Method | Body | Returns |
|---|---|---|---|
| `/health` | GET | – | `{status: "ok"}` |
| `/symptoms` | GET | – | List of all 132 known symptom keys |
| `/predict` | POST | `{symptoms: string[]}` | `{disease, probabilities}` |
| `/explain` | POST | `{symptoms: string[]}` | `{disease, confidence, top_contributing_symptoms}` |
| `/report` | POST | `{symptoms: string[]}` | prediction + confidence + SHAP + LLM summary + risk level + recommended specialty |

## Comparison table (for your paper's related-work section)

| | This app | Ada Health | WebMD Symptom Checker | Symptomate |
|---|---|---|---|---|
| Shows *why* (feature-level explanation) | ✅ SHAP values per symptom | ❌ | ❌ | Partial (rule trace) |
| Calibrated confidence score | ✅ `CalibratedClassifierCV` | Unclear/proprietary | ❌ (broad likelihood buckets) | Unclear |
| Plain-language LLM summary | ✅ Claude API | ❌ | ❌ | ❌ |
| Emergency red-flag detection | ✅ rule engine | ✅ | ✅ | ✅ |
| Open, inspectable model | ✅ (Random Forest, auditable) | ❌ proprietary | ❌ proprietary | ❌ proprietary |

*(Fill in specifics you've verified from each product's own documentation before
publishing — the above reflects this project's design intent and general
public knowledge of these products, not a systematic audit.)*

## Limitations (be upfront about these in your paper)

- **Training data is synthetic** in this build (see table above) — swap in
  the real Kaggle dataset before drawing any clinical-relevance conclusions.
- Not clinically validated; this is a student/demo project, not a medical device.
- English-only symptom vocabulary.
- The emergency rule engine is illustrative, not a validated triage protocol.

## Repo structure

```
health-app/
├── backend/
│   ├── main.py                        # FastAPI app: /predict /explain /report /symptoms
│   ├── explainability.py              # SHAP (+ fallback) explainer
│   ├── risk_rules.py                  # emergency rule engine
│   ├── llm_explain.py                 # Claude API call (+ template fallback)
│   ├── requirements.txt
│   ├── .env.example
│   └── model/                         # generated by ml/train_model.py
│       ├── disease_model.pkl
│       ├── disease_model_calibrated.pkl
│       ├── label_encoder.pkl
│       ├── feature_columns.json
│       └── metrics.json
├── ml/
│   ├── generate_dataset.py            # synthetic data generator (swap for real Kaggle CSVs)
│   ├── train_model.py                 # RF + XGBoost training, evaluation, calibration
│   └── data/
│       ├── Training.csv
│       └── Testing.csv
└── HealthAppNative/
    ├── App.js
    ├── package.json
    └── src/
        ├── screens/                   # Login, SymptomInput, Report, History
        ├── components/SymptomChecklist.js
        ├── services/api.js
        └── navigation/AppNavigator.js
```
