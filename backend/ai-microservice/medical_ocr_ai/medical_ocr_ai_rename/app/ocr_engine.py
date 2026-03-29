import os
import fitz  # PyMuPDF
import pytesseract
from PIL import Image

pytesseract.pytesseract.tesseract_cmd = os.getenv(
    "TESSERACT_CMD",
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
)


def extract_text_from_pdf(pdf_path):
    text = ""

    doc = None
    try:
        doc = fitz.open(pdf_path)

        for page in doc:
            # Try direct text first
            page_text = page.get_text()
            if page_text.strip():
                text += page_text
            else:
                # Convert page to image (NO POPPLER)
                pix = page.get_pixmap()
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                text += pytesseract.image_to_string(img)
    finally:
        if doc is not None:
            doc.close()

    return text