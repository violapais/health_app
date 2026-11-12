"""
risk_rules.py  (Week 3, Day 1-2)

Simple rule engine layered on top of the ML prediction. Red-flag symptom
combinations are checked independently of what the model predicted —
an emergency combination should surface even if the ML model's top
guess is something mundane, since these combinations are themselves
the reason to seek urgent care.

Loosely inspired by Manchester Triage System red-flag categories.
NOT a clinical tool — this is a coarse, illustrative safety net for a
student/demo project, not a substitute for real triage software.
"""
from __future__ import annotations
from typing import List, Dict

# Each rule: name, the set of symptom-column names that must ALL be present,
# the risk level to assign, and a short human-readable reason.
RED_FLAG_RULES: List[Dict] = [
    {
        "name": "possible_cardiac_event",
        "symptoms": {"chest_pain", "breathlessness", "sweating"},
        "level": "High",
        "reason": "Chest pain with shortness of breath and sweating can indicate a cardiac event.",
    },
    {
        "name": "possible_stroke",
        "symptoms": {"headache", "blurred_and_distorted_vision", "altered_sensorium"},
        "level": "High",
        "reason": "Severe headache with vision changes and confusion can indicate a stroke.",
    },
    {
        "name": "possible_meningitis",
        "symptoms": {"high_fever", "stiff_neck", "skin_rash"},
        "level": "High",
        "reason": "High fever with stiff neck and rash can indicate meningitis.",
    },
    {
        "name": "severe_breathing_difficulty",
        "symptoms": {"breathlessness", "chest_pain"},
        "level": "Medium",
        "reason": "Breathlessness with chest pain warrants prompt medical evaluation.",
    },
    {
        "name": "possible_severe_dehydration",
        "symptoms": {"diarrhoea", "vomiting", "dehydration"},
        "level": "Medium",
        "reason": "Combined vomiting, diarrhoea, and dehydration can escalate quickly, "
                  "especially in children and older adults.",
    },
]

EMERGENCY_NUMBER = "112"  # generic; swap for a locale-aware number in production


def assess_risk(symptoms: List[str]) -> Dict:
    """Return the highest risk level triggered by any rule, plus which
    rule(s) fired, so the frontend can show why."""
    symptom_set = set(symptoms)
    triggered = []
    for rule in RED_FLAG_RULES:
        if rule["symptoms"].issubset(symptom_set):
            triggered.append(rule)

    if not triggered:
        return {"level": "Low", "triggered_rules": [], "emergency_number": None}

    level_rank = {"Low": 0, "Medium": 1, "High": 2}
    highest = max(triggered, key=lambda r: level_rank[r["level"]])

    return {
        "level": highest["level"],
        "triggered_rules": [
            {"name": r["name"], "reason": r["reason"]} for r in triggered
        ],
        "emergency_number": EMERGENCY_NUMBER if highest["level"] == "High" else None,
    }
