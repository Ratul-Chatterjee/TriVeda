import Levenshtein


def calculate_cer(predicted: str, ground_truth: str) -> float:
    if not ground_truth:
        return 0.0
    
    distance = Levenshtein.distance(predicted, ground_truth)
    return distance / len(ground_truth)


def calculate_wer(predicted: str, ground_truth: str) -> float:
    if not ground_truth:
        return 0.0
    
    pred_words = predicted.split()
    gt_words = ground_truth.split()
    
    distance = Levenshtein.distance(" ".join(pred_words), " ".join(gt_words))
    return distance / len(gt_words)