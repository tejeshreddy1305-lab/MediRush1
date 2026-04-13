import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from ai.triage import analyze

def test_triage(symptoms, hr=75, spo2=98, wpm=130):
    print(f"Testing symptoms: {symptoms}, HR: {hr}, SpO2: {spo2}")
    result = analyze(symptoms, hr, spo2, wpm=wpm)
    print(f"Result: {result['severity']} (Score: {result['score']}, Condition: {result['condition']})")
    print("-" * 30)

test_triage(["chest pain"])
test_triage(["chest pain", "shortness of breath"])
test_triage(["mild headache"])
test_triage(["throat swelling", "difficulty breathing"], spo2=92)
test_triage(["heart attack"], hr=160, spo2=88)
