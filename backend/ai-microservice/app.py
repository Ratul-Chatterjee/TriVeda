import base64
import os
import tempfile
import importlib.util
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from NLP707070 import (
    TriageRequest,
    TriageResponse,
    determine_department,
    determine_dosha,
    extract_missing_info,
    logger,
    merge_symptoms,
    normalize_severity,
)

app = FastAPI(title="Triveda AI Microservice", version="1.0.0")


class RagAskRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=10)


class RagAskResponse(BaseModel):
    answer: str
    confidence: float = 0.0
    total_sources: int = 0
    processing_time: float = 0.0
    herb_sources: list[Dict[str, Any]] = Field(default_factory=list)
    research_sources: list[Dict[str, Any]] = Field(default_factory=list)


class MedicalOcrRequest(BaseModel):
    file_name: str = Field(..., min_length=1, max_length=255)
    mime_type: str = Field(..., min_length=1, max_length=120)
    file_base64: str = Field(..., min_length=10)
    include_ayurveda: bool = True


class MedicalOcrResponse(BaseModel):
    summary: str
    medical_summary: str
    ayurvedic_summary: Optional[str] = None
    extracted_text_preview: str
    ocr_char_count: int


_rag_bot = None
_rag_error: Optional[str] = None
_ocr_engines: Optional[Dict[str, Any]] = None
_ocr_error: Optional[str] = None


def _get_rag_bot():
    global _rag_bot, _rag_error
    if _rag_bot is not None:
        return _rag_bot
    if _rag_error is not None:
        return None

    try:
        rag_dir = os.path.join(os.path.dirname(__file__), "RAG_MODEL")
        rag_file = os.path.join(rag_dir, "RAG_code.py")

        spec = importlib.util.spec_from_file_location("rag_code_module", rag_file)
        if spec is None or spec.loader is None:
            raise RuntimeError(f"Unable to load RAG module from {rag_file}")

        rag_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(rag_module)
        UnifiedAyurvedicRAGBot = rag_module.UnifiedAyurvedicRAGBot

        _rag_bot = UnifiedAyurvedicRAGBot(
            herbs_file=os.path.join(rag_dir, "herbs.json"),
            pubmed_file=os.path.join(rag_dir, "pubmed_data", "pubmed_for_rag.json"),
        )
        return _rag_bot
    except Exception as exc:
        _rag_error = str(exc)
        logger.error(f"RAG initialization failed: {_rag_error}")
        return None


def _get_medical_ocr_engines() -> Optional[Dict[str, Any]]:
    global _ocr_engines, _ocr_error

    if _ocr_engines is not None:
        return _ocr_engines
    if _ocr_error is not None:
        return None

    try:
        root = Path(__file__).resolve().parent
        base_dir = root / "medical_ocr_ai" / "medical_ocr_ai_rename" / "app"
        ocr_path = base_dir / "ocr_engine.py"
        analyzer_path = base_dir / "analyzer.py"

        if not ocr_path.exists() or not analyzer_path.exists():
            raise RuntimeError("medical_ocr_ai modules not found.")

        ocr_spec = importlib.util.spec_from_file_location("medical_ocr_engine", str(ocr_path))
        analyzer_spec = importlib.util.spec_from_file_location("medical_ocr_analyzer", str(analyzer_path))
        if ocr_spec is None or ocr_spec.loader is None:
            raise RuntimeError("Failed to load OCR engine spec.")
        if analyzer_spec is None or analyzer_spec.loader is None:
            raise RuntimeError("Failed to load analyzer spec.")

        ocr_module = importlib.util.module_from_spec(ocr_spec)
        analyzer_module = importlib.util.module_from_spec(analyzer_spec)
        ocr_spec.loader.exec_module(ocr_module)
        analyzer_spec.loader.exec_module(analyzer_module)

        _ocr_engines = {
            "extract_text_from_pdf": getattr(ocr_module, "extract_text_from_pdf", None),
            "generate_medical_summary": getattr(analyzer_module, "generate_medical_summary", None),
            "generate_ayurvedic_summary": getattr(analyzer_module, "generate_ayurvedic_summary", None),
            "Image": getattr(ocr_module, "Image", None),
            "pytesseract": getattr(ocr_module, "pytesseract", None),
        }

        if not _ocr_engines["extract_text_from_pdf"]:
            raise RuntimeError("extract_text_from_pdf function unavailable.")
        if not _ocr_engines["generate_medical_summary"]:
            raise RuntimeError("generate_medical_summary function unavailable.")

        return _ocr_engines
    except Exception as exc:
        _ocr_error = str(exc)
        logger.error(f"Medical OCR initialization failed: {_ocr_error}")
        return None


def _decode_base64_payload(payload: str) -> bytes:
    raw = payload.strip()
    if "," in raw and raw.lower().startswith("data:"):
        raw = raw.split(",", 1)[1]

    try:
        return base64.b64decode(raw, validate=False)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid base64 payload: {exc}")


def _extract_text_from_upload(file_name: str, mime_type: str, data: bytes, engines: Dict[str, Any]) -> str:
    extract_text_from_pdf = engines["extract_text_from_pdf"]
    image_cls = engines.get("Image")
    pytesseract_mod = engines.get("pytesseract")

    lowered_name = (file_name or "").lower()
    lowered_mime = (mime_type or "").lower()

    if lowered_name.endswith(".pdf") or "pdf" in lowered_mime:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(data)
            temp_path = tmp.name

        try:
            return (extract_text_from_pdf(temp_path) or "").strip()
        except HTTPException:
            raise
        except Exception as exc:
            # Invalid/corrupt PDFs should return a controlled 4xx error, not crash the API.
            raise HTTPException(
                status_code=422,
                detail=f"PDF OCR failed: {exc}",
            )
        finally:
            try:
                os.remove(temp_path)
            except Exception:
                pass

    if image_cls and pytesseract_mod:
        try:
            image = image_cls.open(BytesIO(data))
            return (pytesseract_mod.image_to_string(image) or "").strip()
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Image OCR failed: {exc}")

    raise HTTPException(status_code=422, detail="Unsupported file type for OCR.")


@app.post("/api/triage", response_model=TriageResponse)
async def triage_patient(request: TriageRequest):
    try:
        logger.info(f"Processing triage request: {request.raw_symptoms[:120]}")

        extracted = extract_missing_info(request.raw_symptoms)
        final_symptoms = merge_symptoms(request.explicit_symptoms, extracted["extracted_symptoms"])
        symptoms_text = " ".join(final_symptoms).lower()

        final_severity = normalize_severity(request.explicit_severity or extracted["extracted_severity"])
        final_duration = request.explicit_duration or extracted["extracted_duration"]
        dosha = determine_dosha(symptoms_text)

        dept_id, dept_name, dept_desc = determine_department(symptoms_text)

        return TriageResponse(
            final_symptoms=final_symptoms,
            final_severity=final_severity,
            final_duration=final_duration,
            dosha_indicator=dosha,
            recommended_department_id=dept_id,
            recommended_department_name=dept_name,
            recommended_department_description=dept_desc,
        )
    except Exception as exc:
        logger.error(f"Triage error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/rag/ask", response_model=RagAskResponse)
async def rag_ask(request: RagAskRequest):
    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="query is required")

    bot = _get_rag_bot()
    if bot is None:
        raise HTTPException(
            status_code=503,
            detail=f"RAG model is unavailable. {_rag_error or 'Initialization failed.'}",
        )

    try:
        result = bot.query(query, top_k=request.top_k)
        return RagAskResponse(
            answer=str(result.get("answer") or "No response generated."),
            confidence=float(result.get("confidence") or 0.0),
            total_sources=int(result.get("total_sources") or 0),
            processing_time=float(result.get("processing_time") or 0.0),
            herb_sources=result.get("herb_sources") or [],
            research_sources=result.get("research_sources") or [],
        )
    except Exception as exc:
        logger.error(f"RAG query error: {exc}")
        raise HTTPException(status_code=500, detail=f"RAG query failed: {str(exc)}")


@app.post("/api/medical-ocr/analyze", response_model=MedicalOcrResponse)
async def analyze_medical_document(request: MedicalOcrRequest):
    engines = _get_medical_ocr_engines()
    if engines is None:
        raise HTTPException(
            status_code=503,
            detail=f"Medical OCR is unavailable. {_ocr_error or 'Initialization failed.'}",
        )

    data = _decode_base64_payload(request.file_base64)
    if not data:
        raise HTTPException(status_code=400, detail="Empty file payload.")

    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large for OCR (max 15MB).")

    try:
        extracted_text = _extract_text_from_upload(
            request.file_name,
            request.mime_type,
            data,
            engines,
        )
    except HTTPException as exc:
        # Keep the upload flow stable for malformed/unsupported documents by
        # falling back to a safe summary instead of returning 422.
        if exc.status_code == 422:
            extracted_text = f"No extractable text found in document. OCR note: {exc.detail}"
        else:
            raise

    if not extracted_text:
        extracted_text = "No extractable text found in document."

    medical_summary = engines["generate_medical_summary"](extracted_text)
    ayurvedic_summary = None
    if request.include_ayurveda and engines.get("generate_ayurvedic_summary"):
        ayurvedic_summary = engines["generate_ayurvedic_summary"](extracted_text)

    summary_parts = ["AI OCR Report Analysis", "", "Medical Summary:", str(medical_summary).strip()]
    if ayurvedic_summary:
        summary_parts.extend(["", "Ayurvedic Summary:", str(ayurvedic_summary).strip()])
    summary_parts.extend([
        "",
        f"OCR Character Count: {len(extracted_text)}",
    ])

    return MedicalOcrResponse(
        summary="\n".join(summary_parts).strip(),
        medical_summary=str(medical_summary).strip(),
        ayurvedic_summary=str(ayurvedic_summary).strip() if ayurvedic_summary else None,
        extracted_text_preview=extracted_text[:1200],
        ocr_char_count=len(extracted_text),
    )


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Triveda AI Backend",
        "rag_initialized": _rag_bot is not None,
        "rag_error": _rag_error,
        "medical_ocr_initialized": _ocr_engines is not None,
        "medical_ocr_error": _ocr_error,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
