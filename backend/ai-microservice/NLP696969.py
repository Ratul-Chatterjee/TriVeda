from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import json
import requests
import logging
import time
import re


app = FastAPI(title="Ayurvedic Triage Microservice", version="1.0.0")


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.2"


class TriageRequest(BaseModel):
    raw_symptoms: str = Field(..., description="User's main problem description")
    explicit_symptoms: List[str] = Field(default_factory=list)
    explicit_severity: Optional[str] = None
    explicit_duration: Optional[str] = None
    available_departments: List[Dict[str, str]] = Field(..., description="List of available hospital departments")

class TriageResponse(BaseModel):
    final_symptoms: List[str]
    final_severity: str
    final_duration: str
    dosha_indicator: str
    recommended_department_id: str

def call_ollama(prompt: str, system_prompt: str = None, max_retries: int = 2) -> str:
    """
    Call Ollama API with the given prompt with retry logic
    """
    for attempt in range(max_retries):
        try:
            full_prompt = ""
            if system_prompt:
                full_prompt = f"System: {system_prompt}\n\nUser: {prompt}"
            else:
                full_prompt = prompt
            
            payload = {
                "model": MODEL_NAME,
                "prompt": full_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "num_predict": 300,
                    "timeout": 60
                }
            }
            
            logger.info(f"Calling Ollama (attempt {attempt + 1})...")
            response = requests.post(OLLAMA_URL, json=payload, timeout=60)
            response.raise_for_status()
            
            result = response.json()
            return result.get("response", "")
            
        except requests.exceptions.Timeout:
            logger.warning(f"Ollama timeout on attempt {attempt + 1}")
            if attempt == max_retries - 1:
                raise HTTPException(status_code=503, detail="Ollama service timeout")
            time.sleep(2)
        except requests.exceptions.ConnectionError:
            logger.error("Cannot connect to Ollama. Make sure Ollama is running on port 11434")
            raise HTTPException(status_code=503, detail="Ollama service not reachable. Run 'ollama serve'")
        except requests.exceptions.RequestException as e:
            logger.error(f"Ollama API error: {e}")
            if attempt == max_retries - 1:
                raise HTTPException(status_code=503, detail=f"Ollama service error: {str(e)}")

def extract_missing_info(raw_symptoms: str) -> Dict[str, Any]:
    """
    Use Ollama Llama 3.2 to extract missing information from raw symptoms
    """
    system_prompt = """Extract medical information from the patient description. Return ONLY a JSON object."""
    
    user_prompt = f"""Patient: "{raw_symptoms}"

Extract:
1. symptoms: list of main symptoms (2-3 short phrases)
2. severity: "Mild", "Moderate", or "High"
3. duration: how long (like "2 weeks", "3 days")

Return exactly this format:
{{"symptoms": ["symptom1", "symptom2"], "severity": "Moderate", "duration": "2 weeks"}}"""
    
    try:
        response = call_ollama(user_prompt, system_prompt)
        
        
        response = response.strip()
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0]
        elif "```" in response:
            response = response.split("```")[1].split("```")[0]
        
        extracted = json.loads(response)
        
        return {
            "extracted_symptoms": extracted.get("symptoms", []),
            "extracted_severity": extracted.get("severity", "Moderate"),
            "extracted_duration": extracted.get("duration", "Not specified")
        }
        
    except Exception as e:
        logger.error(f"Error in extraction: {e}")
        return manual_extraction(raw_symptoms)

def manual_extraction(text: str) -> Dict[str, Any]:
    """
    Manual extraction without LLM as fallback
    """
    text_lower = text.lower()
    
    
    symptoms = []
    symptom_map = {
        "burn": "Burning sensation",
        "stomach": "Stomach discomfort",
        "sleep": "Sleep disturbance",
        "pain": "Pain",
        "cough": "Cough",
        "mucus": "Mucus production",
        "congest": "Congestion",
        "rash": "Rash",
        "itch": "Itching",
        "swell": "Swelling",
        "joint": "Joint pain",
        "heart": "Heart palpitations",
        "palpitation": "Heart palpitations",
        "back": "Back pain",
        "leg": "Leg pain",
        "knee": "Knee pain",
        "stiff": "Stiffness"
    }
    
    for key, symptom in symptom_map.items():
        if key in text_lower:
            if symptom not in symptoms:
                symptoms.append(symptom)
    
    if not symptoms:
        symptoms = ["General symptoms"]
    
    
    severity = "Moderate"
    if any(word in text_lower for word in ["severe", "intense", "unbearable", "excruciating", "sharp", "shooting"]):
        severity = "High"
    elif any(word in text_lower for word in ["mild", "slight", "little"]):
        severity = "Mild"
    
    
    duration_patterns = [
        (r'(\d+)\s*(?:weeks?|weeks?)', 'week'),
        (r'(\d+)\s*(?:days?|days?)', 'day'),
        (r'(\d+)\s*(?:months?|months?)', 'month'),
        (r'(\d+)\s*(?:years?|years?)', 'year')
    ]
    
    duration = "Not specified"
    for pattern, unit in duration_patterns:
        match = re.search(pattern, text_lower)
        if match:
            num = match.group(1)
            duration = f"{num} {unit}{'s' if int(num) > 1 else ''}"
            break
    
    return {
        "extracted_symptoms": symptoms,
        "extracted_severity": severity,
        "extracted_duration": duration
    }

def determine_dosha_and_department(final_symptoms: List[str], available_departments: List[Dict[str, str]]) -> tuple:
    """
    Determine dosha and department based on symptoms with intelligent scoring
    """
    symptoms_text = " ".join(final_symptoms).lower()
    
    
    dosha_scores = {"Vata": 0, "Pitta": 0, "Kapha": 0}
    
    vata_keywords = ["pain", "sharp", "shooting", "radiating", "anxiety", "nervous", "dry", "gas", "bloating", 
                     "tremor", "spasm", "irregular", "palpitation", "insomnia", "restless", "cold", "crack"]
    
    pitta_keywords = ["burn", "burning", "acid", "heartburn", "inflam", "red", "rash", "hot", "fever", "sweat", 
                      "irritat", "thirst", "nausea", "vomit", "diarrhea", "bitter", "sour", "heat"]
    
    kapha_keywords = ["mucus", "phlegm", "congest", "heavy", "heaviness", "slow", "fatigue", "tired", "swell", 
                      "cough", "cold", "stiff", "thick", "white", "oily", "dull"]
    
    for keyword in vata_keywords:
        if keyword in symptoms_text:
            dosha_scores["Vata"] += 1
    
    for keyword in pitta_keywords:
        if keyword in symptoms_text:
            dosha_scores["Pitta"] += 1
    
    for keyword in kapha_keywords:
        if keyword in symptoms_text:
            dosha_scores["Kapha"] += 1
    
    primary_dosha = max(dosha_scores, key=dosha_scores.get)
    
    
    if dosha_scores[primary_dosha] == 0:
        if any(word in symptoms_text for word in ["stomach", "burn", "acid", "rash"]):
            primary_dosha = "Pitta"
        elif any(word in symptoms_text for word in ["cough", "mucus", "congest"]):
            primary_dosha = "Kapha"
        else:
            primary_dosha = "Vata"
    
    
    department_scores = []
    
    for dept in available_departments:
        score = 0
        dept_name_lower = dept['name'].lower()
        dept_desc_lower = dept['description'].lower()
        dept_id = dept['id']
        
        logger.info(f"Scoring department: {dept['name']}")
        
        
        if primary_dosha.lower() in dept_name_lower or primary_dosha.lower() in dept_desc_lower:
            score += 20
            logger.info(f"  +20 for dosha match ({primary_dosha})")
        
        
        if "neuro" in dept_name_lower:
            if any(word in symptoms_text for word in ["pain", "nerve", "headache", "migraine", "radiating", "shooting"]):
                score += 25
                logger.info(f"  +25 for neurology symptom match")
        
        
        if "ortho" in dept_name_lower:
            if any(word in symptoms_text for word in ["joint", "knee", "back", "bone", "stiff", "crack", "swollen"]):
                score += 25
                logger.info(f"  +25 for orthopedics symptom match")
        
        
        if "derma" in dept_name_lower:
            if any(word in symptoms_text for word in ["rash", "skin", "itch", "red", "burning"]):
                score += 25
                logger.info(f"  +25 for dermatology symptom match")
        
        
        if "cardio" in dept_name_lower:
            if any(word in symptoms_text for word in ["heart", "palpitation", "chest", "irregular"]):
                score += 25
                logger.info(f"  +25 for cardiology symptom match")
        
        
        if "pulmo" in dept_name_lower:
            if any(word in symptoms_text for word in ["cough", "breath", "mucus", "chest", "wheeze"]):
                score += 25
                logger.info(f"  +25 for pulmonology symptom match")
        
        
        if "rheuma" in dept_name_lower:
            if any(word in symptoms_text for word in ["arthritis", "joint", "autoimmune", "swelling", "stiff"]):
                score += 25
                logger.info(f"  +25 for rheumatology symptom match")
        
        
        if "ent" in dept_name_lower or "ear" in dept_name_lower or "nose" in dept_name_lower or "throat" in dept_name_lower:
            if any(word in symptoms_text for word in ["ear", "nose", "throat", "sinus", "sneez"]):
                score += 25
                logger.info(f"  +25 for ENT symptom match")
        
        
        symptom_words = set(symptoms_text.split())
        for word in symptom_words:
            if len(word) > 3 and word in dept_desc_lower:
                score += 2
                logger.info(f"  +2 for keyword '{word}' in description")
        
        
        if "back pain" in symptoms_text and "back" in dept_desc_lower:
            score += 15
            logger.info(f"  +15 for back pain match")
        
        if "joint pain" in symptoms_text and "joint" in dept_desc_lower:
            score += 15
            logger.info(f"  +15 for joint pain match")
        
        if "rash" in symptoms_text and "skin" in dept_desc_lower:
            score += 15
            logger.info(f"  +15 for rash match")
        
        department_scores.append({
            "id": dept_id,
            "score": score,
            "name": dept['name']
        })
        
        logger.info(f"  Total score for {dept['name']}: {score}")
    
    
    department_scores.sort(key=lambda x: x["score"], reverse=True)
    
    
    logger.info("=" * 50)
    logger.info("FINAL DEPARTMENT SCORES:")
    for dept in department_scores:
        logger.info(f"  {dept['name']}: {dept['score']} points")
    logger.info("=" * 50)
    
    
    if department_scores and department_scores[0]["score"] > 0:
        best_match_id = department_scores[0]["id"]
        logger.info(f"Selected: {department_scores[0]['name']} with {department_scores[0]['score']} points")
    else:
        
        best_match_id = available_departments[0]["id"]
        for dept in available_departments:
            if primary_dosha.lower() in dept['description'].lower():
                best_match_id = dept['id']
                logger.info(f"Fallback selected: {dept['name']} based on dosha {primary_dosha}")
                break
    
    return primary_dosha, best_match_id

def merge_symptoms(explicit_symptoms: List[str], extracted_symptoms: List[str]) -> List[str]:
    """
    Merge explicit and extracted symptoms, removing duplicates
    """
    all_symptoms = []
    all_symptoms.extend(explicit_symptoms)
    
    for symptom in extracted_symptoms:
        if symptom.lower() not in [s.lower() for s in all_symptoms]:
            all_symptoms.append(symptom)
    
    if not all_symptoms:
        all_symptoms = ["General discomfort"]
    
    return all_symptoms

def normalize_severity(severity: str) -> str:
    """Normalize severity to standard values"""
    severity_map = {
        "mild": "Mild",
        "moderate": "Moderate",
        "high": "High",
        "severe": "High",
        "critical": "High"
    }
    return severity_map.get(severity.lower(), "Moderate")

@app.post("/api/triage", response_model=TriageResponse)
async def triage_patient(request: TriageRequest):
    """
    Main triage endpoint
    """
    try:
        logger.info(f"\n{'='*60}")
        logger.info(f"NEW TRIAGE REQUEST")
        logger.info(f"Symptoms: {request.raw_symptoms[:100]}...")
        logger.info(f"Available departments: {[d['name'] for d in request.available_departments]}")
        logger.info(f"{'='*60}")
        
        
        extracted_info = extract_missing_info(request.raw_symptoms)
        logger.info(f"Extracted: {extracted_info}")
        
        
        final_symptoms = merge_symptoms(
            request.explicit_symptoms,
            extracted_info["extracted_symptoms"]
        )
        
        
        if request.explicit_severity:
            final_severity = normalize_severity(request.explicit_severity)
        else:
            final_severity = normalize_severity(extracted_info["extracted_severity"])
        
        
        if request.explicit_duration:
            final_duration = request.explicit_duration
        else:
            final_duration = extracted_info["extracted_duration"]
        
        
        dosha_indicator, recommended_department_id = determine_dosha_and_department(
            final_symptoms,
            request.available_departments
        )
        
        response = TriageResponse(
            final_symptoms=final_symptoms,
            final_severity=final_severity,
            final_duration=final_duration,
            dosha_indicator=dosha_indicator,
            recommended_department_id=recommended_department_id
        )
        
        logger.info(f"\nFINAL RESPONSE:")
        logger.info(f"  Department: {recommended_department_id}")
        logger.info(f"  Dosha: {dosha_indicator}")
        logger.info(f"{'='*60}\n")
        
        return response
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code == 200:
            return {"status": "healthy", "ollama": "connected"}
    except:
        pass
    return {"status": "degraded", "ollama": "disconnected"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)