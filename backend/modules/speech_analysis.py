"""
Speech Analysis Module
------------------------
Ye module audio recording (candidate ka bola hua answer) ko text mein
convert karta hai (Whisper se), aur speaking pace + filler words
detect karta hai.

Real ML component: OpenAI Whisper - pre-trained speech-to-text model
jo audio waveform se accurate transcription generate karta hai.
"""

import whisper
import re

# Whisper model load karo - "base" model accuracy aur speed ka achha balance hai
# Options: tiny, base, small, medium, large (jitna bada utna accurate but slow)
print("Loading Whisper model... (pehli baar thoda time lagega)")
model = whisper.load_model("base")

# Common filler words jo interview mein confidence kam dikhate hain
FILLER_WORDS = ["um", "uh", "like", "you know", "actually", "basically", "so yeah", "i mean"]


def transcribe_audio(audio_path: str) -> dict:
    """
    Audio file ko text mein convert karta hai Whisper se.

    Args:
        audio_path: Audio file ka path (mp3, wav, m4a, etc.)

    Returns:
        dict with transcribed text and duration info
    """
    try:
        result = model.transcribe(audio_path)
        return {
            "text": result["text"].strip(),
            "language": result.get("language", "unknown"),
            "segments": result.get("segments", [])
        }
    except Exception as e:
        return {"error": f"Could not process audio - {str(e)}"}


def calculate_speaking_pace(text: str, duration_seconds: float) -> dict:
    """
    Words per minute calculate karta hai.

    Args:
        text: Transcribed text
        duration_seconds: Audio ki total duration

    Returns:
        dict with WPM and pace category
    """
    word_count = len(text.split())
    if duration_seconds <= 0:
        return {"wpm": 0, "pace_category": "unknown"}

    wpm = round((word_count / duration_seconds) * 60, 2)

    # Ideal interview speaking pace: 120-150 WPM
    if wpm < 100:
        category = "Slow - thoda confidently aur fluently bolo"
    elif wpm <= 160:
        category = "Good - ye ek achhi speaking pace hai"
    else:
        category = "Fast - thoda slow karo, clarity better hogi"

    return {"wpm": wpm, "pace_category": category}


def detect_filler_words(text: str) -> dict:
    """
    Text mein filler words dhundta hai aur count karta hai.
    """
    text_lower = text.lower()
    filler_counts = {}

    for filler in FILLER_WORDS:
        pattern = r'\b' + re.escape(filler) + r'\b'
        matches = re.findall(pattern, text_lower)
        if matches:
            filler_counts[filler] = len(matches)

    total_fillers = sum(filler_counts.values())
    word_count = len(text.split())
    filler_ratio = round((total_fillers / word_count) * 100, 2) if word_count > 0 else 0

    return {
        "filler_words_found": filler_counts,
        "total_filler_count": total_fillers,
        "filler_ratio_percent": filler_ratio
    }


def analyze_speech(audio_path: str, duration_seconds: float) -> dict:
    """
    Poora speech analysis pipeline - transcription + pace + filler words.
    """
    transcription = transcribe_audio(audio_path)

    if "error" in transcription:
        return transcription

    text = transcription["text"]
    pace_result = calculate_speaking_pace(text, duration_seconds)
    filler_result = detect_filler_words(text)

    return {
        "transcribed_text": text,
        "speaking_pace": pace_result,
        "filler_analysis": filler_result
    }


# ---- TEST KARNE KE LIYE ----
if __name__ == "__main__":
    print("\n--- Speech Analysis Test ---")

    # Apni audio file ka path yahan daalo
    audio_file_path = "sample_audio.m4a"
    audio_duration = 25.0

    result = analyze_speech(audio_file_path, audio_duration)

    if "error" in result:
        print(f"Error: {result['error']}")
        print("\nPehle ek chhoti audio recording banao (15-20 second ka)")
        print("apne phone se ya computer se, aur uska path upar daalo.")
    else:
        print(f"Transcribed Text: {result['transcribed_text']}")
        print(f"\nSpeaking Pace: {result['speaking_pace']['wpm']} WPM")
        print(f"Pace Feedback: {result['speaking_pace']['pace_category']}")
        print(f"\nFiller Words Found: {result['filler_analysis']['filler_words_found']}")
        print(f"Filler Ratio: {result['filler_analysis']['filler_ratio_percent']}%")