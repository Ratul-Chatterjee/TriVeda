import os


def load_ground_truth(file_name: str) -> str:
    path = f"data/ground_truth/{file_name}.txt"
    
    if not os.path.exists(path):
        print("⚠️ Ground truth file not found (WER/CER may be 0)")
        return ""
    
    with open(path, "r", encoding="utf-8") as f:
        return f.read()