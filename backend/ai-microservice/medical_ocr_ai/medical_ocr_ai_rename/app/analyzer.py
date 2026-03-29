import os
import re
from google import genai


def _get_client():
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None
    try:
        return genai.Client(api_key=api_key)
    except Exception:
        return None


def _local_medical_fallback(text: str) -> str:
    if not text or not text.strip():
        return "No text could be extracted from the report."

    compact = re.sub(r"\s+", " ", text).strip()
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    preview_lines = lines[:8]

    high_keywords = [
        "hemoglobin", "wbc", "rbc", "platelet", "glucose", "cholesterol",
        "creatinine", "bilirubin", "sgpt", "sgot", "tsh", "vitamin", "bp",
        "pulse", "ecg", "x-ray", "mri", "ct",
    ]

    matched = []
    lower = compact.lower()
    for key in high_keywords:
        if key in lower:
            matched.append(key)

    bullets = [
        "Key findings (auto-extracted):",
        *[f"- {line}" for line in preview_lines[:5]],
    ]

    if matched:
        bullets.append("Detected clinical terms:")
        bullets.extend([f"- {term}" for term in sorted(set(matched))[:10]])

    bullets.append("Recommendation: Doctor review advised for clinical interpretation.")
    return "\n".join(bullets)


def _local_ayurveda_fallback(text: str) -> str:
    if not text or not text.strip():
        return "Insufficient text for Ayurvedic interpretation."

    compact = re.sub(r"\s+", " ", text).lower()

    suggestions = []
    if any(word in compact for word in ["acidity", "burn", "inflammation", "pitta"]):
        suggestions.append("Potential Pitta aggravation indicators detected.")
    if any(word in compact for word in ["dry", "anxiety", "insomnia", "pain", "vata"]):
        suggestions.append("Potential Vata imbalance indicators detected.")
    if any(word in compact for word in ["weight", "edema", "mucus", "kapha", "cholesterol"]):
        suggestions.append("Potential Kapha imbalance indicators detected.")

    if not suggestions:
        suggestions.append("General tridosha balancing guidance suggested.")

    return "\n".join([
        "Ayurvedic interpretation (auto-generated):",
        *[f"- {item}" for item in suggestions],
        "- Diet: Prefer warm, freshly prepared meals and avoid ultra-processed food.",
        "- Lifestyle: Maintain regular sleep and meal timings.",
        "- Follow-up: Consult Ayurvedic physician for personalized prakriti-vikriti assessment.",
    ])


def _generate_with_gemini(prompt: str) -> str:
    client = _get_client()
    if not client:
        return ""

    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash-latest",
            contents=prompt,
        )
        return (response.text or "").strip()
    except Exception:
        return ""


def generate_medical_summary(text: str) -> str:
    text = (text or "")[:6000]

    prompt = f"""
Summarize this medical report in concise bullet points:
- Key findings
- Abnormal values or notable terms
- Practical next-step recommendations for patient follow-up

{text}
"""

    generated = _generate_with_gemini(prompt)
    if generated:
        return generated

    return _local_medical_fallback(text)


def generate_ayurvedic_summary(text: str) -> str:
    text = (text or "")[:6000]

    prompt = f"""
Analyze this medical report from an Ayurveda perspective:
- Probable dosha imbalance clues
- Simple interpretation for patient
- Diet and lifestyle suggestions

{text}
"""

    generated = _generate_with_gemini(prompt)
    if generated:
        return generated

    return _local_ayurveda_fallback(text)
