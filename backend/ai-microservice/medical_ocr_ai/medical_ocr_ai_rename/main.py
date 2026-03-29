import tkinter as tk
from tkinter import filedialog

from app.ocr_engine import extract_text_from_pdf
from app.analyzer import generate_medical_summary, generate_ayurvedic_summary
from app.metrics import calculate_cer, calculate_wer
from app.utils import load_ground_truth
import os


def choose_file():
    root = tk.Tk()
    root.withdraw()
    
    file_path = filedialog.askopenfilename(
        title="Select Medical PDF",
        filetypes=[("PDF files", "*.pdf")]
    )
    
    return file_path


def quality(score):
    if score <= 0.02:
        return "Excellent"
    elif score <= 0.05:
        return "Strong"
    else:
        return "Needs Improvement"


def main():
    print("\n📄 Select your medical PDF...\n")
    
    file_path = choose_file()
    
    if not file_path:
        print("❌ No file selected")
        return
    
    
    print("🔍 Running OCR...")
    extracted_text = extract_text_from_pdf(file_path)
    
    
    print("🧠 Generating Medical Summary...")
    medical_summary = generate_medical_summary(extracted_text)
    
    
    print("🌿 Generating Ayurvedic Summary...")
    ayurvedic_summary = generate_ayurvedic_summary(extracted_text)
    
    
    # Ground truth handling
    file_name = os.path.basename(file_path).replace(".pdf", "")
    gt_text = load_ground_truth(file_name)
    
    
    cer = calculate_cer(extracted_text, gt_text)
    wer = calculate_wer(extracted_text, gt_text)
    
    
    print("\n================= OUTPUT =================\n")
    
    print("🩺 MEDICAL SUMMARY:\n")
    print(medical_summary)
    
    print("\n🌿 AYURVEDIC SUMMARY:\n")
    print(ayurvedic_summary)
    
    print("\n📊 OCR ACCURACY:\n")
    print(f"CER: {round(cer,4)} ({quality(cer)})")
    print(f"WER: {round(wer,4)} ({quality(wer)})")
    
    print("\n==========================================\n")


if __name__ == "__main__":
    main()