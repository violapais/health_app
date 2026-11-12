"""
llm_explain.py  (Week 3, Day 3-4)

Turns the ML prediction + confidence + top SHAP symptoms into a short,
reassuring, plain-language explanation via the Anthropic API.

Requires ANTHROPIC_API_KEY in backend/.env (see .env.example).
If no key is configured, falls back to a deterministic template so the
rest of the app keeps working during development/demos.
"""
import os

try:
    from anthropic import Anthropic, APIError
    HAS_ANTHROPIC_SDK = True
except ImportError:
    # anthropic isn't installed in this dev/build environment; the /report
    # endpoint keeps working via the template fallback below. In production,
    # `pip install anthropic` (it's already in requirements.txt) enables the
    # real Claude call.
    HAS_ANTHROPIC_SDK = False

SYSTEM_PROMPT = """You are a medical explanation assistant. Given a predicted \
condition, confidence score, and the key contributing symptoms, explain in \
simple, reassuring language why this prediction was made. Do not give a \
diagnosis - frame this as a possibility to discuss with a doctor. Keep it \
under 100 words."""

_client = None

def _get_client():
    global _client

    if not HAS_ANTHROPIC_SDK:
        return None

    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()

        # Treat the example placeholder as "no API key".
        if not api_key or api_key == "sk-ant-...":
            return None

        try:
            _client = Anthropic(api_key=api_key)
        except Exception:
            # Keep /report working even if the Anthropic SDK/client
            # has a dependency compatibility problem.
            return None

    return _client



def _template_fallback(disease: str, confidence: float, top_symptoms: list) -> str:
    syms = ", ".join(s["symptom"].replace("_", " ") for s in top_symptoms[:3])
    return (
        f"Based on the symptoms you reported - especially {syms} - the model's "
        f"closest match is {disease}, with {confidence*100:.0f}% confidence. "
        f"This is only a possibility worth discussing with a doctor, not a "
        f"diagnosis. A clinician can confirm what's going on and recommend "
        f"next steps."
    )


def explain(disease: str, confidence: float, top_symptoms: list) -> str:
    client = _get_client()
    if client is None:
        return _template_fallback(disease, confidence, top_symptoms)

    symptom_lines = "\n".join(
        f"- {s['symptom'].replace('_', ' ')} (contribution: {s['shap_value']})"
        for s in top_symptoms
    )
    user_prompt = (
        f"Predicted condition: {disease}\n"
        f"Confidence: {confidence:.2f}\n"
        f"Key contributing symptoms:\n{symptom_lines}\n\n"
        f"Write the explanation now."
    )
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=250,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return "".join(
            block.text for block in response.content if block.type == "text"
        ).strip()
    except Exception:
        # covers APIError plus any transient/network issues
        return _template_fallback(disease, confidence, top_symptoms)
