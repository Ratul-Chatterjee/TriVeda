"""
Triveda AI Matchmaker Engine - AI-Powered Ayurvedic Appointment Matchmaker
Returns ranked doctors with intelligent scoring and empathetic match reasons
Enhanced with maximum accuracy through calibrated scoring weights
"""

import json
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import logging
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Triveda AI Matchmaker Engine", version="3.0.0")

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.2"


class IntakeData(BaseModel):
    problem_description: str
    symptoms: List[str]
    severity: str
    duration: str


class PatientData(BaseModel):
    age: int
    gender: str
    languages: List[str]
    prakriti: str
    vikriti: str
    height_cm: int
    weight_kg: int
    dietary_habits: str
    health_goals: str
    medical_history: List[str]
    assessment_summary: List[str]


class Doctor(BaseModel):
    doctor_id: str
    specialization: str
    experience_years: int
    gender: str
    languages: List[str]
    success_count: int
    unsuccessful_count: int
    case_summaries: List[str]


class MatchmakerRequest(BaseModel):
    intake_data: IntakeData
    patient_data: PatientData
    available_doctors: List[Doctor]


class DoctorRanking(BaseModel):
    doctor_id: str
    match_score: int
    match_reason: str


class MatchmakerResponse(BaseModel):
    doctor_rankings: List[DoctorRanking]


class AyurvedicScorer:
    SPECIALIZATION_MAP = {
        "Gastroenterology": {
            "keywords": ["stomach", "burning", "acidic", "heartburn", "nausea", "bloating", 
                        "acidity", "digestion", "ulcer", "gastric", "indigestion", "constipation",
                        "diarrhea", "ibs", "crohn", "colon", "intestine", "reflux", "pitta",
                        "acidity", "gas", "bloating", "indigestion"],
            "score": 35,
            "description": "Specializes in digestive health"
        },
        "Psychiatry": {
            "keywords": ["anxiety", "stress", "insomnia", "depression", "mental", "nervous",
                        "panic", "mood", "emotional", "psychiatric", "therapy", "counseling",
                        "restlessness", "sleep", "fear", "worry", "vata", "anxiety disorder"],
            "score": 35,
            "description": "Specializes in mental health and stress management"
        },
        "Dermatology": {
            "keywords": ["rash", "skin", "itching", "redness", "eczema", "acne", "inflammation",
                        "psoriasis", "dermatitis", "hives", "lesion", "scar", "pigmentation",
                        "dry skin", "oily skin", "allergy", "pitta", "skin irritation"],
            "score": 35,
            "description": "Specializes in skin health and inflammatory conditions"
        },
        "Respiratory Medicine": {
            "keywords": ["cough", "wheezing", "breath", "asthma", "respiratory", "lungs",
                        "pneumonia", "bronchitis", "chest congestion", "shortness of breath",
                        "allergies", "sinus", "phlegm", "mucus", "cold", "kapha", "breathing"],
            "score": 35,
            "description": "Specializes in respiratory health"
        },
        "Neurology": {
            "keywords": ["headache", "migraine", "brain", "nerve", "neurological", "seizure",
                        "tremor", "dizziness", "vertigo", "neuropathy", "stroke", "memory",
                        "cognitive", "parkinson", "multiple sclerosis", "ms", "throbbing",
                        "one side", "sensitivity to light", "aura", "chronic headache", "vata"],
            "score": 35,
            "description": "Specializes in neurological conditions and headaches"
        },
        "Rheumatology": {
            "keywords": ["joint pain", "arthritis", "rheumatoid", "osteoarthritis", "gout",
                        "autoimmune", "inflammation", "stiffness", "swelling", "fibromyalgia",
                        "lupus", "scleroderma", "musculoskeletal", "joint", "knee pain", 
                        "back pain", "chronic pain", "inflammatory arthritis", "vata"],
            "score": 35,
            "description": "Specializes in arthritis and autoimmune conditions"
        },
        "Gynecology": {
            "keywords": ["periods", "cramps", "hormonal", "pcos", "menstrual", "pregnancy",
                        "fertility", "ovary", "uterus", "vaginal", "menopause", "endometriosis",
                        "fibroids", "contraception", "womens health", "female", "irregular periods",
                        "pitta", "vata", "hormone imbalance", "menstrual disorders"],
            "score": 35,
            "description": "Specializes in women's health and hormonal balance"
        },
        "Endocrinology": {
            "keywords": ["diabetes", "blood sugar", "thyroid", "hormonal", "metabolic",
                        "insulin", "glucose", "hyperthyroidism", "hypothyroidism", "pituitary",
                        "adrenal", "hormone", "endocrine", "weight", "metabolism", "type 2 diabetes",
                        "type 1 diabetes", "blood glucose", "sugar level", "frequent urination",
                        "thirst", "fatigue", "weight loss", "weight gain", "kapha"],
            "score": 35,
            "description": "Specializes in metabolic health and hormonal disorders"
        },
        "Cardiology": {
            "keywords": ["heart", "chest pain", "palpitations", "blood pressure", "hypertension",
                        "cardiac", "cardiovascular", "cholesterol", "artery", "vein", "circulation",
                        "heart attack", "stroke", "bp", "high bp", "low bp", "pitta"],
            "score": 35,
            "description": "Specializes in heart health and cardiovascular conditions"
        },
        "Nephrology": {
            "keywords": ["kidney", "renal", "urinary", "bladder", "uti", "kidney stone",
                        "urine", "nephritis", "dialysis", "creatinine", "proteinuria"],
            "score": 35,
            "description": "Specializes in kidney and urinary tract health"
        },
        "Orthopedics": {
            "keywords": ["bone", "fracture", "spine", "back pain", "neck pain", "orthopedic",
                        "muscle", "ligament", "tendon", "sports injury", "knee", "hip", "shoulder",
                        "arthritis", "joint replacement", "vata"],
            "score": 35,
            "description": "Specializes in bone, joint, and muscle conditions"
        },
        "General Medicine": {
            "keywords": [],
            "score": 15,
            "description": "General medicine practitioner"
        },
        "Internal Medicine": {
            "keywords": [],
            "score": 15,
            "description": "Internal medicine specialist"
        }
    }
    
    @staticmethod
    def calculate_score(doctor: Doctor, patient: PatientData, intake: IntakeData) -> Dict[str, Any]:
        score = 0
        scoring_factors = []
        
        total_cases = doctor.success_count + doctor.unsuccessful_count
        success_rate = (doctor.success_count / total_cases * 100) if total_cases > 0 else 0
        
        problem_lower = intake.problem_description.lower()
        symptoms_lower = [s.lower() for s in intake.symptoms]
        vikriti_lower = patient.vikriti.lower()
        medical_history_lower = [h.lower() for h in patient.medical_history]
        case_text = " ".join(doctor.case_summaries).lower()
        
        specialization_score = 0
        specialization_reason = ""
        
        if doctor.specialization in AyurvedicScorer.SPECIALIZATION_MAP:
            spec_config = AyurvedicScorer.SPECIALIZATION_MAP[doctor.specialization]
            keywords = spec_config["keywords"]
            
            if keywords:
                matched = False
                match_count = 0
                for kw in keywords:
                    if kw in problem_lower:
                        match_count += 2
                        matched = True
                    if any(kw in sym for sym in symptoms_lower):
                        match_count += 1
                        matched = True
                    if any(kw in hist for hist in medical_history_lower):
                        match_count += 1
                        matched = True
                
                if matched:
                    base_score = spec_config["score"]
                    bonus = min(10, match_count)
                    specialization_score = base_score + bonus
                    specialization_reason = spec_config["description"]
                    if bonus >= 5:
                        specialization_reason += " with extensive relevant experience"
            else:
                specialization_score = spec_config["score"]
                specialization_reason = spec_config["description"]
        
        score += specialization_score
        if specialization_reason:
            scoring_factors.append(specialization_reason)
        
        dosha_score = 0
        dosha_reason = ""
        
        if "pitta" in vikriti_lower:
            pitta_keywords = ["acidity", "burning", "inflammation", "ulcer", "digestion", 
                              "pitta", "heartburn", "acidic", "heat", "rash", "redness"]
            matches = sum(1 for kw in pitta_keywords if kw in case_text)
            if matches >= 4:
                dosha_score = 30
                dosha_reason = "Highly experienced with Pitta imbalances and inflammatory conditions"
            elif matches >= 2:
                dosha_score = 20
                dosha_reason = "Experienced with Pitta-related conditions"
            elif matches >= 1:
                dosha_score = 10
                dosha_reason = "Some experience with Pitta imbalances"
        
        elif "vata" in vikriti_lower:
            vata_keywords = ["vata", "anxiety", "stress", "bloating", "gas", "nervous", 
                            "pain", "insomnia", "restlessness", "dryness", "joint", "nerve"]
            matches = sum(1 for kw in vata_keywords if kw in case_text)
            if matches >= 4:
                dosha_score = 30
                dosha_reason = "Highly experienced with Vata imbalances and stress-related conditions"
            elif matches >= 2:
                dosha_score = 20
                dosha_reason = "Experienced with Vata-related conditions"
            elif matches >= 1:
                dosha_score = 10
                dosha_reason = "Some experience with Vata imbalances"
        
        elif "kapha" in vikriti_lower:
            kapha_keywords = ["kapha", "congestion", "mucus", "heaviness", "lethargy",
                             "cough", "wheezing", "cold", "sinus", "weight"]
            matches = sum(1 for kw in kapha_keywords if kw in case_text)
            if matches >= 4:
                dosha_score = 30
                dosha_reason = "Highly experienced with Kapha imbalances and respiratory conditions"
            elif matches >= 2:
                dosha_score = 20
                dosha_reason = "Experienced with Kapha-related conditions"
            elif matches >= 1:
                dosha_score = 10
                dosha_reason = "Some experience with Kapha imbalances"
        
        score += dosha_score
        if dosha_reason:
            scoring_factors.append(dosha_reason)
        
        exp_score = 0
        exp_reason = ""
        
        if doctor.experience_years >= 15:
            exp_score = 18
            exp_reason = f"{doctor.experience_years}+ years of extensive expertise"
        elif doctor.experience_years >= 12:
            exp_score = 15
            exp_reason = f"{doctor.experience_years} years of solid experience"
        elif doctor.experience_years >= 8:
            exp_score = 12
            exp_reason = f"{doctor.experience_years} years of experience"
        elif doctor.experience_years >= 5:
            exp_score = 9
            exp_reason = f"{doctor.experience_years} years of practice"
        elif doctor.experience_years >= 2:
            exp_score = 5
            exp_reason = f"{doctor.experience_years} years in practice"
        
        if total_cases > 50:
            if success_rate >= 98:
                exp_score += 12
                exp_reason += f" with outstanding {success_rate:.0f}% success rate"
            elif success_rate >= 95:
                exp_score += 10
                exp_reason += f" with exceptional {success_rate:.0f}% success rate"
            elif success_rate >= 90:
                exp_score += 8
                exp_reason += f" with excellent {success_rate:.0f}% success rate"
            elif success_rate >= 85:
                exp_score += 6
                exp_reason += f" with strong {success_rate:.0f}% success rate"
            elif success_rate >= 75:
                exp_score += 4
                exp_reason += f" with good {success_rate:.0f}% success rate"
        
        score += min(exp_score, 25)
        if exp_reason:
            scoring_factors.append(exp_reason.strip())
        
        case_score = 0
        case_reasons = []
        
        symptom_matches = 0
        for symptom in intake.symptoms:
            if symptom.lower() in case_text:
                symptom_matches += 1
                case_reasons.append(f"experienced with {symptom}")
        
        case_score += min(12, symptom_matches * 4)
        
        for condition in medical_history_lower[:2]:
            if condition in case_text and condition not in ["none", "no"]:
                case_score += 6
                case_reasons.append(f"experienced with {condition}")
        
        holistic_keywords = ["empathetic", "holistic", "lifestyle", "dietary", "nadi pariksha", 
                            "pulse diagnosis", "personalized", "gentle", "caring", "ayurvedic",
                            "natural", "herbal", "panchakarma", "detox"]
        for kw in holistic_keywords:
            if kw in case_text:
                case_score += 3
                if "holistic" not in str(case_reasons):
                    case_reasons.append("holistic and caring approach")
                break
        
        if patient.assessment_summary:
            assessment_text = " ".join(patient.assessment_summary).lower()
            if "herbal" in assessment_text or "natural" in assessment_text:
                if "herbal" in case_text or "natural" in case_text or "ayurvedic" in case_text:
                    case_score += 5
                    case_reasons.append("aligns with preference for natural remedies")
        
        if patient.health_goals.lower() in case_text:
            case_score += 4
            case_reasons.append("understands your health goals")
        
        case_score = min(20, case_score)
        score += case_score
        if case_reasons:
            scoring_factors.append(f"Specifically {', '.join(case_reasons[:2])}")
        
        lang_score = 0
        common_langs = set(patient.languages) & set(doctor.languages)
        if common_langs:
            lang_score = min(12, len(common_langs) * 4)
            scoring_factors.append(f"Communicates in {', '.join(list(common_langs)[:2])}")
        
        score += lang_score
        
        if patient.gender == doctor.gender:
            score += 6
            scoring_factors.append(f"Same gender ({doctor.gender}) for comfort")
        
        if patient.age >= 60 and doctor.experience_years >= 10:
            score += 5
            scoring_factors.append("Experienced with senior patient care")
        
        final_score = min(100, score)
        
        return {
            "score": final_score,
            "scoring_factors": scoring_factors,
            "success_rate": success_rate,
            "total_cases": total_cases
        }


class MatchReasonGenerator:
    def __init__(self):
        self.ollama_url = OLLAMA_URL
    
    def generate(self, doctor: Doctor, patient: PatientData, intake: IntakeData, 
                 score: int, scoring_factors: List[str], success_rate: float) -> str:
        
        scoring_summary = ", ".join(scoring_factors[:4])
        key_symptoms = ", ".join(intake.symptoms[:3])
        vikriti = patient.vikriti
        
        if score >= 85:
            tone = "Excellent match"
        elif score >= 70:
            tone = "Great match"
        elif score >= 55:
            tone = "Good match"
        elif score >= 40:
            tone = "Moderate match"
        else:
            tone = "Consider match"
        
        prompt = f"""Write a concise match reason.

Tone: {tone}
Doctor: {doctor.specialization}, {doctor.experience_years} years
Success: {success_rate:.0f}%
Patient: {vikriti} imbalance, {key_symptoms}
Key strengths: {scoring_summary[:100]}

Write 1 sentence explaining why this doctor is a good match:"""
        
        try:
            response = requests.post(
                self.ollama_url,
                json={
                    "model": MODEL_NAME,
                    "prompt": prompt,
                    "stream": False,
                    "temperature": 0.3,
                    "max_tokens": 100
                },
                timeout=10
            )
            
            if response.status_code == 200:
                reason = response.json().get('response', '').strip()
                if reason and len(reason) > 10:
                    return reason.replace('"', '').strip()
        except Exception as e:
            logger.warning(f"LLM fallback: {e}")
        
        if scoring_factors:
            main_factor = scoring_factors[0]
            if score >= 85:
                return f"{tone}: {main_factor}. Highly recommended for your {vikriti} imbalance."
            elif score >= 70:
                return f"{tone}: {main_factor}. Well-suited for your {', '.join(intake.symptoms[:2])}."
            elif score >= 55:
                return f"{tone}: {main_factor}. Strong alignment with your health needs."
            else:
                return f"{tone}: {main_factor}. Consider for your {vikriti} imbalance."
        
        return f"{tone}: {doctor.specialization} specialist with {doctor.experience_years} years experience and {success_rate:.0f}% success rate."


class MatchmakerEngine:
    def __init__(self):
        self.scorer = AyurvedicScorer()
        self.reason_gen = MatchReasonGenerator()
    
    async def rank_doctors(self, request: MatchmakerRequest) -> MatchmakerResponse:
        if not request.available_doctors:
            return MatchmakerResponse(doctor_rankings=[])
        
        rankings = []
        
        for doctor in request.available_doctors:
            score_data = self.scorer.calculate_score(
                doctor, request.patient_data, request.intake_data
            )
            
            reason = self.reason_gen.generate(
                doctor, request.patient_data, request.intake_data,
                score_data["score"], score_data["scoring_factors"],
                score_data["success_rate"]
            )
            
            rankings.append(DoctorRanking(
                doctor_id=doctor.doctor_id,
                match_score=score_data["score"],
                match_reason=reason
            ))
        
        rankings.sort(key=lambda x: x.match_score, reverse=True)
        return MatchmakerResponse(doctor_rankings=rankings)


matchmaker_engine = MatchmakerEngine()


@app.post("/api/matchmaker", response_model=MatchmakerResponse)
async def matchmaker_endpoint(request: MatchmakerRequest):
    try:
        logger.info(f"Matchmaker request received - Analyzing {len(request.available_doctors)} doctors")
        start_time = datetime.now()
        response = await matchmaker_engine.rank_doctors(request)
        elapsed = (datetime.now() - start_time).total_seconds()
        logger.info(f"Matchmaking completed in {elapsed:.2f}s")
        return response
    except Exception as e:
        logger.error(f"Matchmaker error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "Triveda AI Matchmaker", "version": "3.0"}


if __name__ == "__main__":
    print("=" * 70)
    print("Triveda AI Matchmaker Engine v3.0 - Enhanced Accuracy")
    print("=" * 70)
    print("Supported Specializations (35 points + keyword bonuses):")
    print("Gastroenterology | Psychiatry | Dermatology | Respiratory Medicine")
    print("Neurology | Rheumatology | Gynecology | Endocrinology")
    print("Cardiology | Nephrology | Orthopedics | General/Internal Medicine")
    print("=" * 70)
    print("Accuracy Enhancements:")
    print("- Experience scoring: 5-18 points based on years")
    print("- Success rate: Up to 12 points for 98%+ success")
    print("- Case relevance: Up to 20 points for symptom matching")
    print("- Language match: Up to 12 points for communication")
    print("- Dosha alignment: Up to 30 points for imbalance expertise")
    print("=" * 70)
    uvicorn.run(app, host="0.0.0.0", port=8000)