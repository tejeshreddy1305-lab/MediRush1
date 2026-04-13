# backend/database.py

from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, Text, text
from sqlalchemy.orm import declarative_base, sessionmaker
import os
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/medirush.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class Patient(Base):
    __tablename__ = "patients"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    age = Column(Integer)
    sex = Column(String)
    blood_type = Column(String)
    allergies = Column(Text)
    chronic_conditions = Column(Text)
    current_medications = Column(Text)
    vitals_history = Column(Text)
    visit_history = Column(Text)


class Hospital(Base):
    __tablename__ = "hospitals"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    address = Column(String)
    city = Column(String)
    state = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    phone = Column(String)
    type = Column(String)
    specializations = Column(Text)
    beds_total = Column(Integer)
    beds_occupied = Column(Integer)
    emergency_bay = Column(Boolean, default=True)
    icu_beds = Column(Integer)
    rating = Column(Float)


class Emergency(Base):
    __tablename__ = "emergencies"
    id = Column(String, primary_key=True)
    patient_id = Column(String)
    hospital_id = Column(String)
    token = Column(String)
    severity = Column(String)
    priority_score = Column(Float)
    symptoms = Column(Text)
    suspected_condition = Column(String)
    status = Column(String, default="active")
    created_at = Column(String)
    resolved_at = Column(String)


class HospitalStaff(Base):
    __tablename__ = "hospital_staff"
    id = Column(String, primary_key=True)
    hospital_id = Column(String)
    name = Column(String)
    role = Column(String)
    email = Column(String, unique=True)
    password_hash = Column(String)
    status = Column(String, default="available")
    speciality = Column(String, default="")
    current_case_token = Column(String, default="")


class BloodBank(Base):
    __tablename__ = "blood_bank"
    id = Column(String, primary_key=True)
    hospital_id = Column(String, nullable=False)
    blood_type = Column(String, nullable=False)
    units_available = Column(Integer, default=0)
    last_updated = Column(String)


class Feedback(Base):
    __tablename__ = "feedback"
    id = Column(String, primary_key=True)
    emergency_id = Column(String, default="")
    hospital_id = Column(String, nullable=False)
    patient_token = Column(String, default="")
    rating = Column(Integer)
    response_time_rating = Column(Integer)
    staff_rating = Column(Integer)
    comment = Column(Text, default="")
    would_recommend = Column(Boolean, default=True)
    created_at = Column(String)


class EmergencyHistory(Base):
    __tablename__ = "emergency_history"
    id = Column(String, primary_key=True)
    patient_id = Column(String, nullable=False)
    date = Column(String)
    condition = Column(String)
    severity = Column(String)
    hospital_name = Column(String)
    hospital_type = Column(String)
    treatment_time_minutes = Column(Integer)
    outcome = Column(String)
    medications_given = Column(Text)
    discharge_notes = Column(Text)
    doctor_name = Column(String)


from passlib.context import CryptContext
import json
import uuid

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def _migrate_sqlite():
    if "sqlite" not in DATABASE_URL:
        return
    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(hospital_staff)")).fetchall()
        existing = {r[1] for r in rows}
        alters = [
            ("status", "VARCHAR DEFAULT 'available'"),
            ("speciality", "VARCHAR DEFAULT ''"),
            ("current_case_token", "VARCHAR DEFAULT ''"),
        ]
        for col, ddl in alters:
            if col not in existing:
                try:
                    conn.execute(text(f"ALTER TABLE hospital_staff ADD COLUMN {col} {ddl}"))
                except Exception:
                    pass


def init_db():
    Base.metadata.create_all(bind=engine)
    _migrate_sqlite()
    seed_data()


BLOOD_SEED = [
    ("h1", "O+", 18),
    ("h1", "A+", 12),
    ("h1", "B+", 8),
    ("h1", "AB+", 4),
    ("h1", "O-", 3),
    ("h1", "A-", 2),
    ("h1", "B-", 1),
    ("h1", "AB-", 0),
    ("h2", "O+", 35),
    ("h2", "A+", 22),
    ("h2", "B+", 19),
    ("h2", "AB+", 7),
    ("h2", "O-", 5),
    ("h2", "A-", 4),
    ("h2", "B-", 2),
    ("h2", "AB-", 1),
    ("h3", "O+", 10),
    ("h3", "A+", 6),
    ("h3", "B+", 4),
    ("h3", "AB+", 2),
    ("h3", "O-", 0),
    ("h3", "A-", 1),
    ("h3", "B-", 0),
    ("h3", "AB-", 0),
    ("h4", "O+", 25),
    ("h4", "A+", 15),
    ("h4", "B+", 10),
    ("h4", "AB+", 5),
    ("h4", "O-", 4),
    ("h4", "A-", 3),
    ("h4", "B-", 2),
    ("h4", "AB-", 1),
]


def seed_data():
    db = SessionLocal()
    try:
        if db.query(Hospital).count() == 0:
            hospitals = [
                Hospital(
                    id="h1",
                    name="Apollo Hospitals Tirupati",
                    city="Tirupati",
                    state="Andhra Pradesh",
                    address="Renigunta Rd, Tirupati",
                    lat=13.6213,
                    lng=79.4091,
                    phone="0877-2266666",
                    type="Private",
                    beds_total=200,
                    beds_occupied=155,
                    specializations=json.dumps(
                        ["Cardiology", "Neurology", "Trauma", "Orthopedics"]
                    ),
                    icu_beds=28,
                    rating=4.8,
                ),
                Hospital(
                    id="h2",
                    name="SVIMS — Sri Venkateswara Institute",
                    city="Tirupati",
                    state="Andhra Pradesh",
                    address="Alipiri Rd, Tirupati",
                    lat=13.6372,
                    lng=79.4200,
                    phone="0877-2287777",
                    type="Government",
                    beds_total=850,
                    beds_occupied=720,
                    specializations=json.dumps(
                        ["Neurology", "Cardiology", "Oncology", "Nephrology"]
                    ),
                    icu_beds=60,
                    rating=4.5,
                ),
                Hospital(
                    id="h3",
                    name="Ruia Government Hospital",
                    city="Tirupati",
                    state="Andhra Pradesh",
                    address="Tirupati",
                    lat=13.6356,
                    lng=79.4105,
                    phone="0877-2286666",
                    type="Government",
                    beds_total=400,
                    beds_occupied=340,
                    specializations=json.dumps(
                        ["General Medicine", "Trauma", "Pediatrics"]
                    ),
                    icu_beds=30,
                    rating=4.2,
                ),
                Hospital(
                    id="h4",
                    name="Narayana Medical College Hospital",
                    city="Tirupati",
                    state="Andhra Pradesh",
                    address="Tirupati",
                    lat=13.6288,
                    lng=79.4192,
                    phone="0877-2284444",
                    type="Private",
                    beds_total=300,
                    beds_occupied=210,
                    specializations=json.dumps(
                        ["Cardiology", "Neurosurgery", "Orthopedics", "Trauma"]
                    ),
                    icu_beds=35,
                    rating=4.6,
                ),
            ]
            db.add_all(hospitals)
            db.commit()

        staff_rows = [
                ("s1", "h1", "Dr. Ramesh Kumar", "Emergency Head", "admin@hospital.com", "available", "Emergency", ""),
                ("s2", "h1", "Dr. Priya Nair", "Cardiologist", "priya@apollo.com", "available", "Cardiology", ""),
                ("s3", "h1", "Dr. Suresh Rao", "Neurologist", "suresh@apollo.com", "on_case", "Neurology", "DEMO"),
                ("s4", "h1", "Nurse Lakshmi", "ICU Nurse", "lakshmi@apollo.com", "available", "ICU", ""),
                ("s5", "h1", "Nurse Ravi", "Emergency Nurse", "ravi.n@apollo.com", "available", "Emergency", ""),
                ("s6", "h2", "Dr. Anand Babu", "Emergency Head", "anand@svims.com", "available", "Emergency", ""),
                ("s7", "h2", "Dr. Kavitha Reddy", "Neurologist", "kavitha@svims.com", "available", "Neurology", ""),
                ("s8", "h2", "Dr. Mohan Rao", "Cardiologist", "mohan@svims.com", "on_case", "Cardiology", "DEMO"),
            ]
        existing_staff_emails = {s.email for s in db.query(HospitalStaff).all()}
        added_staff = False
        for sid, hid, name, role, email, st, spec, tok in staff_rows:
            if email in existing_staff_emails:
                continue
            db.add(
                HospitalStaff(
                    id=sid,
                    hospital_id=hid,
                    name=name,
                    role=role,
                    email=email,
                    password_hash=pwd_context.hash("admin123")
                    if email == "admin@hospital.com"
                    else pwd_context.hash("doctor123"),
                    status=st,
                    speciality=spec,
                    current_case_token=tok,
                )
            )
            added_staff = True
        if added_staff:
            db.commit()

        if db.query(Patient).count() == 0:
            demo = Patient(
                id="demo-patient-001",
                name="Ravi Kumar",
                age=34,
                sex="Male",
                blood_type="O+",
                allergies="Penicillin",
                chronic_conditions="Hypertension,Type 2 Diabetes",
                current_medications="Amlodipine 5mg,Metformin 500mg",
                vitals_history=json.dumps(
                    [
                        {"date": "Jan 5", "bp": "138/88", "bp_sys": 138, "bp_dia": 88, "hr": 82, "spo2": 98},
                        {"date": "Jan 8", "bp": "142/90", "bp_sys": 142, "bp_dia": 90, "hr": 79, "spo2": 97},
                        {"date": "Jan 11", "bp": "135/85", "bp_sys": 135, "bp_dia": 85, "hr": 84, "spo2": 98},
                        {"date": "Jan 14", "bp": "140/88", "bp_sys": 140, "bp_dia": 88, "hr": 81, "spo2": 97},
                        {"date": "Jan 17", "bp": "138/86", "bp_sys": 138, "bp_dia": 86, "hr": 83, "spo2": 98},
                        {"date": "Jan 20", "bp": "136/84", "bp_sys": 136, "bp_dia": 84, "hr": 80, "spo2": 98},
                        {"date": "Jan 23", "bp": "133/82", "bp_sys": 133, "bp_dia": 82, "hr": 78, "spo2": 99},
                    ]
                ),
                visit_history=json.dumps([]),
            )
            db.add(demo)
            db.commit()

        if db.query(BloodBank).count() == 0:
            now = datetime.utcnow().isoformat()
            for i, (hid, bt, u) in enumerate(BLOOD_SEED):
                db.add(
                    BloodBank(
                        id=f"bb{hid}_{bt}_{i}",
                        hospital_id=hid,
                        blood_type=bt,
                        units_available=u,
                        last_updated=now,
                    )
                )
            db.commit()

        if db.query(EmergencyHistory).count() == 0:
            hist = [
                EmergencyHistory(
                    id="eh1",
                    patient_id="demo-patient-001",
                    date="2026-01-12T15:42:00",
                    condition="Hypertensive Crisis",
                    severity="MODERATE",
                    hospital_name="Apollo Hospitals Tirupati",
                    hospital_type="Private",
                    treatment_time_minutes=18,
                    outcome="Resolved",
                    medications_given=json.dumps(["Aspirin 300mg", "Labetalol IV"]),
                    discharge_notes="Patient stabilized. Follow-up in 2 weeks with cardiology.",
                    doctor_name="Dr. Ramesh Kumar",
                ),
                EmergencyHistory(
                    id="eh2",
                    patient_id="demo-patient-001",
                    date="2025-11-05T10:20:00",
                    condition="Diabetic Review",
                    severity="NORMAL",
                    hospital_name="SVIMS — Sri Venkateswara Institute",
                    hospital_type="Government",
                    treatment_time_minutes=45,
                    outcome="Resolved",
                    medications_given=json.dumps(["Insulin adjustment"]),
                    discharge_notes="HbA1c reviewed. Continue Metformin.",
                    doctor_name="Dr. Anand Babu",
                ),
                EmergencyHistory(
                    id="eh3",
                    patient_id="demo-patient-001",
                    date="2025-08-18T08:05:00",
                    condition="Chest Pain — Rule out ACS",
                    severity="CRITICAL",
                    hospital_name="Narayana Medical College Hospital",
                    hospital_type="Private",
                    treatment_time_minutes=22,
                    outcome="Resolved",
                    medications_given=json.dumps(["Aspirin", "Nitroglycerin"]),
                    discharge_notes="Troponins negative. Discharged with cardiology OP.",
                    doctor_name="Dr. Mohan Rao",
                ),
                EmergencyHistory(
                    id="eh4",
                    patient_id="demo-patient-001",
                    date="2025-03-02T19:30:00",
                    condition="Road Traffic Injury",
                    severity="MODERATE",
                    hospital_name="Ruia Government Hospital",
                    hospital_type="Government",
                    treatment_time_minutes=90,
                    outcome="Referred",
                    medications_given=json.dumps(["Tetanus toxoid", "Analgesic"]),
                    discharge_notes="Referred to orthopedics for follow-up imaging.",
                    doctor_name="Dr. Staff Physician",
                ),
            ]
            db.add_all(hist)
            db.commit()

        if db.query(Feedback).count() == 0:
            for i in range(5):
                db.add(
                    Feedback(
                        id=f"fb{i}",
                        hospital_id="h1",
                        patient_token="DEMO",
                        rating=5 - (i % 3),
                        response_time_rating=4,
                        staff_rating=5,
                        comment="Good care during emergency.",
                        would_recommend=True,
                        created_at=datetime.utcnow().isoformat(),
                    )
                )
            db.commit()

        if db.query(Emergency).count() == 0:
            db.add(
                Emergency(
                    id="em1",
                    patient_id="demo-patient-001",
                    hospital_id="h1",
                    token="DEMO1",
                    severity="CRITICAL",
                    priority_score=9.0,
                    symptoms=json.dumps(["chest pain"]),
                    suspected_condition="ACS",
                    status="active",
                    created_at=datetime.utcnow().isoformat(),
                    resolved_at="",
                )
            )
            db.commit()
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
