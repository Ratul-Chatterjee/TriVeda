# AI Microservice Setup and Usage

## Scope
FastAPI AI service in `backend/ai-microservice/`.

## Core Features
- NLP triage for symptoms -> department recommendation
- RAG assistant for Ayurvedic Q&A
- Medical OCR summary generation

## Technologies
- FastAPI + Uvicorn
- Pydantic
- Sentence Transformers + FAISS (RAG)
- PyMuPDF + pytesseract + Pillow (OCR)
- Optional Ollama integration for LLM-backed workflows

## Install
```bash
cd backend/ai-microservice
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
```

## Run
```bash
cd backend/ai-microservice
python app.py
```
Service default: `http://localhost:8000`

## Environment Variables
- Optional variables:
  - `OLLAMA_URL` (inside modules using Ollama)
  - any model-related settings in submodules

## Primary Endpoints
- `POST /api/triage`
- `POST /api/rag/ask`
- `POST /api/medical-ocr/analyze`
- `GET /health`

## Backend Integration Point
Backend calls this service using:
- `AI_MICROSERVICE_URL` from backend env

## HLD
```mermaid
flowchart TB
  B[Backend Express] --> TRIAGE[/api/triage]
  B --> RAG[/api/rag/ask]
  B --> OCR[/api/medical-ocr/analyze]

  RAG --> KB[(Herbs + PubMed + FAISS)]
  OCR --> DOC[PDF/Image parsing]
  TRIAGE --> NLP[NLP extraction + rules]
```

## LLD Highlights
- Main app and endpoint contracts: `backend/ai-microservice/app.py`
- Triage utilities and department logic: `backend/ai-microservice/NLP707070.py`
- RAG engine class: `UnifiedAyurvedicRAGBot` in `RAG_MODEL/RAG_code.py`
- OCR internals loaded dynamically from `medical_ocr_ai/medical_ocr_ai_rename/app/`

## Operational Notes
- OCR accepts base64 document payloads up to 15MB.
- RAG bot initializes lazily and caches instance in-memory.
- Service returns controlled errors for unavailable model/components.
