# backend/data/seed_hospitals.py
# Run this once: python seed_hospitals.py

import sys, os, uuid, json
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import SessionLocal, Hospital, Patient, HospitalStaff, init_db
from passlib.hash import bcrypt

init_db()
db = SessionLocal()

# Clear existing data
db.query(Hospital).delete()
db.query(Patient).delete()
db.query(HospitalStaff).delete()

hospitals = [
    {"name": "SVIMS", "city": "Tirupati", "lat": 13.6372, "lng": 79.4200,
     "type": "Government", "phone": "0877-2287777",
     "specializations": ["Neurology","Cardiology","Oncology","Nephrology"],
     "beds_total": 850, "icu_beds": 60},
    {"name": "Ruia Government Hospital", "city": "Tirupati", "lat": 13.6356, "lng": 79.4105,
     "type": "Government", "phone": "0877-2224585",
     "specializations": ["General Medicine","Trauma","Obstetrics"],
     "beds_total": 400, "icu_beds": 20},
    {"name": "Apollo Hospitals Tirupati", "city": "Tirupati", "lat": 13.6213, "lng": 79.4091,
     "type": "Private", "phone": "0877-2233333",
     "specializations": ["Cardiology","Neurology","Orthopedics","Trauma"],
     "beds_total": 200, "icu_beds": 30},
    {"name": "Sri Padmavathi Medical College", "city": "Tirupati", "lat": 13.6319, "lng": 79.4146,
     "type": "Private", "phone": "0877-2289000",
     "specializations": ["General Surgery","Pediatrics","Gynecology"],
     "beds_total": 500, "icu_beds": 25},
    {"name": "Star Hospital Tirupati", "city": "Tirupati", "lat": 13.6289, "lng": 79.4178,
     "type": "Private", "phone": "0877-6624444",
     "specializations": ["Multi-specialty","Orthopedics","Cardiology"],
     "beds_total": 120, "icu_beds": 15},
]

for h in hospitals:
    hospital_id = str(uuid.uuid4())
    db.add(Hospital(
        id=hospital_id, name=h["name"], city=h["city"], state="Andhra Pradesh",
        lat=h["lat"], lng=h["lng"], phone=h["phone"], type=h["type"],
        specializations=json.dumps(h["specializations"]),
        beds_total=h["beds_total"], beds_occupied=int(h["beds_total"] * 0.7),
        emergency_bay=True, icu_beds=h["icu_beds"], rating=round(3.5 + 1.4 * 0.7, 1),
        address=f"{h['city']}, Andhra Pradesh"
    ))
    # Seed one doctor + one nurse per hospital
    db.add(HospitalStaff(
        id=str(uuid.uuid4()), hospital_id=hospital_id,
        name="Dr. Ramesh Kumar", role="doctor",
        email=f"doctor@{h['name'].lower().replace(' ','')}.com",
        password_hash=bcrypt.hash("doctor123")
    ))
    db.add(HospitalStaff(
        id=str(uuid.uuid4()), hospital_id=hospital_id,
        name="Nurse Priya", role="nurse",
        email=f"nurse@{h['name'].lower().replace(' ','')}.com",
        password_hash=bcrypt.hash("nurse123")
    ))

# Seed demo patient
db.add(Patient(
    id="demo-patient-001", name="Ravi Kumar", age=34, sex="Male",
    blood_type="O+", allergies="Penicillin",
    chronic_conditions="Hypertension,Type 2 Diabetes",
    current_medications="Amlodipine 5mg,Metformin 500mg",
    vitals_history=json.dumps([
        {"date": "2025-01-05", "bp": "138/88", "hr": 82},
        {"date": "2025-01-10", "bp": "142/90", "hr": 79},
        {"date": "2025-01-15", "bp": "135/85", "hr": 84},
    ]),
    visit_history=json.dumps([
        {"date": "2025-01-12", "hospital": "Apollo Hospitals Tirupati",
         "diagnosis": "Hypertensive Crisis"}
    ])
))

db.commit()
db.close()
print("Seeding complete.")