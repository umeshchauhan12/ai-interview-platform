"""
Emotion Analysis Module
--------------------------
Ye module candidate ki photo/video frame se facial emotion detect karta hai
using DeepFace (pre-trained CNN model on FER2013-style data).

Real ML component: Deep learning based facial emotion classifier jo
image se confidence/nervousness/neutral jaise emotions detect karta hai.
"""

from deepface import DeepFace
import cv2


def analyze_emotion_from_image(image_path: str) -> dict:
    """
    Ek image se facial emotion detect karta hai.

    Args:
        image_path: Image file ka path (jpg/png)

    Returns:
        dict with dominant emotion, emotion breakdown, aur interview-relevant feedback
    """
    try:
        result = DeepFace.analyze(
            img_path=image_path,
            actions=['emotion'],
            enforce_detection=True,
            detector_backend='retinaface'
        )

        # DeepFace list return karta hai (agar multiple faces hon), hum pehla lete hain
        if isinstance(result, list):
            result = result[0]

        dominant_emotion = result['dominant_emotion']
        emotion_scores = result['emotion']

        feedback = generate_composure_feedback(dominant_emotion, emotion_scores)

        return {
            "dominant_emotion": dominant_emotion,
            "emotion_breakdown": {k: round(v, 2) for k, v in emotion_scores.items()},
            "composure_feedback": feedback
        }

    except ValueError as e:
        return {"error": "No face detected in the image. Please ensure your face is clearly visible."}
    except Exception as e:
        return {"error": f"Could not analyze emotion - {str(e)}"}


def generate_composure_feedback(dominant_emotion: str, emotion_scores: dict) -> str:
    """
    Dominant emotion ke basis pe interview-relevant feedback deta hai.
    """
    confident_emotions = ["neutral", "happy"]
    nervous_emotions = ["fear", "sad", "surprise"]

    if dominant_emotion in confident_emotions:
        return "You appear calm and composed - a good sign for interview presence."
    elif dominant_emotion in nervous_emotions:
        return f"You appear slightly {dominant_emotion}. Try to relax your expression and breathe steadily."
    elif dominant_emotion == "angry":
        return "Your expression reads as tense. Consider relaxing your facial muscles before answering."
    else:
        return "Your expression is neutral overall."


def extract_frame_from_webcam() -> str:
    """
    Webcam se ek frame capture karke temporary image save karta hai.
    Testing ke liye - real app mein frontend se image aayegi.
    """
    cam = cv2.VideoCapture(0)
    ret, frame = cam.read()
    cam.release()

    if not ret:
        return None

    temp_path = "temp_webcam_frame.jpg"
    cv2.imwrite(temp_path, frame)
    return temp_path


# ---- TEST KARNE KE LIYE ----
if __name__ == "__main__":
    print("\n--- Emotion Analysis Test ---")
    print("Webcam se photo capture karne ki koshish kar rahe hain...")

    frame_path = extract_frame_from_webcam()

    if frame_path is None:
        print("Webcam access nahi mila. Kisi image file ka path daal ke test karo:")
        print("Neeche wali line update karo:")
        frame_path = "test_face.jpg"  # <-- apni image ka path daal sakte ho

    result = analyze_emotion_from_image(frame_path)

    if "error" in result:
        print(f"Error: {result['error']}")
    else:
        print(f"Dominant Emotion: {result['dominant_emotion']}")
        print(f"Emotion Breakdown: {result['emotion_breakdown']}")
        print(f"Feedback: {result['composure_feedback']}")