import requests
import json
import re
import time

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3.2"

def check_ollama():
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code != 200:
            return False, "Ollama not responding"
        
        models = response.json().get('models', [])
        model_names = [m['name'] for m in models]
        
        model_available = any(MODEL in m for m in model_names)
        
        if not model_available:
            return False, f"Model {MODEL} not found. Run: ollama pull {MODEL}"
        
        return True, "Ready"
        
    except requests.exceptions.ConnectionError:
        return False, "Ollama not running. Start with: ollama serve"
    except Exception as e:
        return False, str(e)

def suggest_department(symptoms_text):
    
    ready, message = check_ollama()
    if not ready:
        return {
            "department": "Service Unavailable",
            "confidence": "Low",
            "reason": message
        }
    
    departments = {
        "Cardiology": ["heart", "chest pain", "palpitations", "bp", "blood pressure"],
        "Gastroenterology": ["stomach", "acidity", "digestion", "burning", "vomiting", "nausea"],
        "Neurology": ["headache", "dizziness", "blurred vision", "migraine", "nerve"],
        "Pulmonology": ["cough", "breathing", "asthma", "lungs", "respiratory"],
        "Orthopedics": ["joint", "bone", "muscle", "back pain", "knee", "spine"],
        "Dermatology": ["skin", "rash", "itching", "acne", "hair"],
        "Psychiatry": ["anxiety", "depression", "stress", "sleep", "mental"],
        "ENT": ["ear", "nose", "throat", "hearing", "sinus"],
        "Ophthalmology": ["eye", "vision", "blurred", "sight"],
        "Urology": ["urine", "kidney", "bladder", "uti"],
        "Gynecology": ["period", "pregnancy", "women", "menstrual"],
        "General Medicine": []
    }
    
    prompt = f"""You are a medical triage assistant. Based on the symptoms described, suggest the most appropriate doctor department.

Symptoms: "{symptoms_text}"

Available Departments and their common cases:
- Cardiology: Heart problems, chest pain, high blood pressure
- Gastroenterology: Stomach issues, acidity, digestion problems
- Neurology: Headaches, migraines, dizziness, nerve problems
- Pulmonology: Breathing issues, cough, asthma
- Orthopedics: Bone, joint, muscle pain
- Dermatology: Skin problems, rashes, allergies
- Psychiatry: Mental health, anxiety, depression
- ENT: Ear, nose, throat problems
- Ophthalmology: Eye problems
- Urology: Urinary tract issues
- Gynecology: Women's health
- General Medicine: General health concerns not specific to other departments

Analyze the symptoms and return ONLY a JSON object with this exact format:
{{
    "department": "Department Name",
    "confidence": "High/Medium/Low",
    "reason": "Brief explanation why this department is suitable"
}}

Do not include any other text, explanations, or markdown. Just the JSON.
"""
    
    for attempt in range(2):
        try:
            print(f"  Calling Ollama (attempt {attempt + 1})...")
            
            response = requests.post(
                OLLAMA_URL,
                json={
                    "model": MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "temperature": 0.1,
                    "max_tokens": 150,
                    "options": {
                        "num_predict": 150,
                        "temperature": 0.1
                    }
                },
                timeout=45
            )
            
            if response.status_code == 200:
                result = response.json().get('response', '')
                
                json_match = re.search(r'\{.*\}', result, re.DOTALL)
                if json_match:
                    try:
                        return json.loads(json_match.group())
                    except json.JSONDecodeError:
                        pass
                
                return {
                    "department": extract_department_from_text(result, symptoms_text),
                    "confidence": "Medium",
                    "reason": "Based on symptom analysis"
                }
            else:
                if attempt == 0:
                    time.sleep(2)
                    continue
                    
        except requests.exceptions.Timeout:
            print(f"  Timeout on attempt {attempt + 1}")
            if attempt == 0:
                time.sleep(2)
                continue
        except Exception as e:
            if attempt == 0:
                time.sleep(2)
                continue
    
    return rule_based_fallback(symptoms_text)

def extract_department_from_text(text, original_symptoms):
    text_lower = text.lower()
    
    dept_keywords = {
        "Cardiology": ["cardio", "heart", "chest"],
        "Neurology": ["neuro", "brain", "head", "nerve"],
        "Gastroenterology": ["gastro", "stomach", "digest"],
        "Pulmonology": ["pulmo", "lung", "breath"],
        "Orthopedics": ["ortho", "bone", "joint"],
        "Dermatology": ["derma", "skin"],
        "Psychiatry": ["psych", "mental", "anxiety"],
        "ENT": ["ent", "ear", "nose", "throat"],
        "Ophthalmology": ["eye", "vision"],
        "General Medicine": ["general", "medicine"]
    }
    
    for dept, keywords in dept_keywords.items():
        if any(k in text_lower for k in keywords):
            return dept
    
    return "General Medicine"

def rule_based_fallback(symptoms):
    symptoms_lower = symptoms.lower()
    
    if any(word in symptoms_lower for word in ["head", "dizzy", "migraine", "vision", "blurred"]):
        return {
            "department": "Neurology",
            "confidence": "Medium",
            "reason": "Symptoms suggest neurological issues (headache, dizziness, blurred vision)"
        }
    elif any(word in symptoms_lower for word in ["stomach", "burn", "acidity", "digestion"]):
        return {
            "department": "Gastroenterology",
            "confidence": "Medium",
            "reason": "Symptoms suggest digestive system issues"
        }
    elif any(word in symptoms_lower for word in ["heart", "chest", "palpitations"]):
        return {
            "department": "Cardiology",
            "confidence": "Medium",
            "reason": "Symptoms suggest cardiac issues"
        }
    elif any(word in symptoms_lower for word in ["cough", "breath", "asthma", "lungs"]):
        return {
            "department": "Pulmonology",
            "confidence": "Medium",
            "reason": "Symptoms suggest respiratory issues"
        }
    elif any(word in symptoms_lower for word in ["joint", "bone", "muscle", "back"]):
        return {
            "department": "Orthopedics",
            "confidence": "Medium",
            "reason": "Symptoms suggest musculoskeletal issues"
        }
    elif any(word in symptoms_lower for word in ["skin", "rash", "itching"]):
        return {
            "department": "Dermatology",
            "confidence": "Medium",
            "reason": "Symptoms suggest skin issues"
        }
    else:
        return {
            "department": "General Medicine",
            "confidence": "Low",
            "reason": "Symptoms are general, recommend primary care first"
        }

def main():
    
    print("\n" + "="*60)
    print("DOCTOR DEPARTMENT SUGGESTION SYSTEM")
    print("="*60)
    
    ready, message = check_ollama()
    if not ready:
        print(f"  {message}")
        print("  Will use fallback mode (limited functionality)")
        print("-"*60)
    else:
        print("  Connected to Ollama")
        print("  Model available")
        print("-"*60)
    
    print("Describe your symptoms in a paragraph")
    print("(Type 'quit' to exit)")
    print("-"*60)
    
    while True:
        print("\nEnter your symptoms:")
        symptoms = input("> ").strip()
        
        if symptoms.lower() in ['quit', 'exit', 'q']:
            print("Goodbye!")
            break
        
        if not symptoms:
            print("Please enter your symptoms")
            continue
        
        print("\nAnalyzing symptoms...")
        
        result = suggest_department(symptoms)
        
        print("\n" + "="*60)
        print("SUGGESTION:")
        print("="*60)
        print(f"Department: {result.get('department', 'Unknown')}")
        print(f"Confidence: {result.get('confidence', 'Low')}")
        print(f"Reason: {result.get('reason', 'No reason provided')}")
        print("="*60)

if __name__ == "__main__":
    main()