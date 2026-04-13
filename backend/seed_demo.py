"""
seed_demo.py — Master Data Seeder for Phase 3 Demo
"""
import sys
import os
import json
from datetime import datetime, timedelta

# Add parent path to allow backend imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, init_db, Hospital, HospitalStaff, Patient, Emergency
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def seed():
    init_db()
    db = SessionLocal()

    # ─────────────────────────────────────────────────────────────
    # 1. Seed 5 Hospitals
    # ─────────────────────────────────────────────────────────────
    json_path = os.path.join(os.path.dirname(__file__), "data", "hospitals.json")
    with open(json_path, "r") as f:
        hospitals_data = json.load(f)

    for h in hospitals_data:
        existing = db.query(Hospital).filter(Hospital.id == h["id"]).first()
        if not existing:
            hospital = Hospital(
                id=h["id"],
                name=h["name"],
                address=h["address"],
                city=h["city"],
                state=h["state"],
                lat=h["lat"],
                lng=h["lng"],
                phone=h["phone"],
                type=h["type"],
                specializations=json.dumps(h["specializations"]),
                beds_total=h["beds_total"],
                beds_occupied=int(h["beds_total"] * 0.7),
                emergency_bay=h["emergency_bay"],
                icu_beds=h["icu_beds"],
                rating=h["rating"]
            )
            db.add(hospital)
    db.commit()

    # ─────────────────────────────────────────────────────────────
    # 2. Seed 2 Staff per Hospital
    # ─────────────────────────────────────────────────────────────
    staff_accounts = [
        {"hid": 1, "name": "Dr. Satya K", "role": "Emergency Director", "email": "satya.k@apollotirupati.com"},
        {"hid": 1, "name": "Nurse Maya D", "role": "Triage Nurse", "email": "maya.d@apollotirupati.com"},
        {"hid": 2, "name": "Dr. Ramesh V", "role": "Cardiologist", "email": "ramesh.v@svims.edu"},
        {"hid": 2, "name": "Nurse Gita S", "role": "ICU Nurse", "email": "gita.s@svims.edu"},
        {"hid": 3, "name": "Dr. Priya N", "role": "Trauma Surgeon", "email": "priya.n@ruiahospital.org"},
        {"hid": 3, "name": "Nurse Rohan M", "role": "Paramedic", "email": "rohan.m@ruiahospital.org"},
        {"hid": 4, "name": "Dr. Vivek B", "role": "Chief Surgeon", "email": "vivek.b@amaranij.com"},
        {"hid": 4, "name": "Nurse Anjali", "role": "Ward Nurse", "email": "anjali@amaranij.com"},
        {"hid": 5, "name": "Dr. Kiran T", "role": "Neurologist", "email": "kiran.t@sankalpa.com"},
        {"hid": 5, "name": "Nurse Sita P", "role": "Head Nurse", "email": "sita.p@sankalpa.com"},
    ]

    for s in staff_accounts:
        existing = db.query(HospitalStaff).filter(HospitalStaff.email == s["email"]).first()
        if not existing:
            staff = HospitalStaff(
                hospital_id=s["hid"],
                name=s["name"],
                role=s["role"],
                email=s["email"],
                password_hash=get_password_hash("securepass123")
            )
            db.add(staff)
    db.commit()

    # ─────────────────────────────────────────────────────────────
    # 3. Seed Patient Ravi Kumar
    # ─────────────────────────────────────────────────────────────
    existing_patient = db.query(Patient).filter(Patient.name == "Ravi Kumar").first()
    if not existing_patient:
        vitals = [
            {"date": "2024-03-01", "sys": 140, "dia": 90, "hr": 82},
            {"date": "2024-03-08", "sys": 138, "dia": 88, "hr": 80},
        ]
        visits = [
            {"date": "2024-01-12", "hospital": "Apollo Hospitals Tirupati", "diagnosis": "Hypertensive Crisis"},
            {"date": "2023-10-04", "hospital": "SVR Ruia Government Hospital", "diagnosis": "Hyperglycemia"},
        ]
        
        ravi = Patient(
            name="Ravi Kumar",
            age=34,
            sex="M",
            blood_type="O+",
            allergies=json.dumps(["Penicillin"]),
            chronic_conditions=json.dumps(["Hypertension", "Type 2 Diabetes"]),
            current_medications=json.dumps(["Amlodipine 5mg", "Metformin 500mg"]),
            vitals_history=json.dumps(vitals),
            visit_history=json.dumps(visits)
        )
        db.add(ravi)
        db.commit()
        db.refresh(ravi)
        patient_id = ravi.id
    else:
        patient_id = existing_patient.id

    # ─────────────────────────────────────────────────────────────
    # 4. Seed Active Emergency
    # ─────────────────────────────────────────────────────────────
    existing_em = db.query(Emergency).filter(Emergency.token == "A3F9-72XK").first()
    if not existing_em:
        emergency = Emergency(
            patient_id=patient_id,
            hospital_id=1,  # Apollo
            token="A3F9-72XK",
            severity="CRITICAL",
            priority_score=9.2,
            symptoms=json.dumps(["Chest Pain", "Shortness of Breath"]),
            suspected_condition="Cardiac Event",
            status="en_route"
        )
        db.add(emergency)
        db.commit()

    print("✅ Master database seed completed successfully!")
    print("Patient 'Ravi Kumar' created.")
    print("10 Staff Accounts created (Password: securepass123 for all).")
    print("Active Emergency 'A3F9-72XK' seeded.")

    db.close()

if __name__ == "__main__":
    seed()
