"""
Answer Scoring Module
----------------------
Ye module user ke diye gaye answer ko ideal/reference answer ke saath
compare karta hai using Sentence-BERT embeddings + cosine similarity.

Real ML component: Pre-trained transformer model se semantic embeddings
generate hoti hain (word-matching nahi, meaning-matching hai).
"""

from sentence_transformers import SentenceTransformer, util

# Model ek baar load hota hai (isse load karne mein thoda time lagega pehli baar)
# 'all-MiniLM-L6-v2' - lightweight, fast, aur accuracy achhi hai
model = SentenceTransformer('all-MiniLM-L6-v2')


def score_answer(user_answer: str, ideal_answer: str, keywords: list[str] = None) -> dict:
    """
    User ke answer ko ideal answer ke saath compare karke score deta hai.

    Args:
        user_answer: Candidate ne jo answer diya
        ideal_answer: Expected/reference answer
        keywords: Important keywords jo answer mein hone chahiye (optional)

    Returns:
        dict with similarity_score, keyword_coverage, final_score, feedback
    """

    if not user_answer or not user_answer.strip():
        return {
            "similarity_score": 0.0,
            "keyword_coverage": 0.0,
            "final_score": 0.0,
            "feedback": "No answer was provided."
        }

    # Step 1: Dono answers ko embeddings mein convert karo
    embeddings = model.encode([user_answer, ideal_answer], convert_to_tensor=True)

    # Step 2: Cosine similarity nikalo (0 to 1 ke beech, jitna zyada utna better)
    similarity = util.cos_sim(embeddings[0], embeddings[1]).item()
    similarity_score = round(similarity * 100, 2)  # percentage mein

    # Step 3: Keyword coverage check karo (agar keywords diye gaye hain)
    keyword_coverage = 100.0
    missing_keywords = []
    if keywords:
        user_answer_lower = user_answer.lower()
        found = [kw for kw in keywords if kw.lower() in user_answer_lower]
        missing_keywords = [kw for kw in keywords if kw.lower() not in user_answer_lower]
        keyword_coverage = round((len(found) / len(keywords)) * 100, 2)

    # Step 4: Final weighted score (semantic similarity ko zyada weight diya)
    final_score = round((similarity_score * 0.7) + (keyword_coverage * 0.3), 2)

    # Step 5: Feedback generate karo
    feedback = generate_feedback(final_score, missing_keywords)

    return {
        "similarity_score": similarity_score,
        "keyword_coverage": keyword_coverage,
        "final_score": final_score,
        "missing_keywords": missing_keywords,
        "feedback": feedback
    }


def generate_feedback(score: float, missing_keywords: list) -> str:
    """Score ke basis pe simple rule-based feedback deta hai (English mein)."""
    if score >= 80:
        feedback = "Excellent answer! Highly relevant and complete."
    elif score >= 60:
        feedback = "Good answer, but could use more detail."
    elif score >= 40:
        feedback = "Partially relevant answer. The core concept isn't fully clear."
    else:
        feedback = "This answer doesn't match the topic well. Consider revisiting the concept."

    if missing_keywords:
        feedback += f" Missing key points: {', '.join(missing_keywords)}."

    return feedback


# ---- TEST KARNE KE LIYE (isko direct run kar sakte ho) ----
if __name__ == "__main__":
    ideal = "Python is an interpreted, high-level programming language known for its readability and dynamic typing."
    user = "Python is a high-level language that is easy to read and doesn't need explicit type declarations."
    keywords = ["interpreted", "high-level", "dynamic typing", "readability"]

    result = score_answer(user, ideal, keywords)
    print("\n--- Answer Scoring Result ---")
    for key, value in result.items():
        print(f"{key}: {value}")