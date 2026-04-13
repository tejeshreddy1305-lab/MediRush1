import sys
import os

# Add backend to path so we can import properly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, HospitalStaff, Hospital
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def seed_staff():
    db = SessionLocal()
    
    # Check if Apollo hospital exists
    apollo = db.query(Hospital).filter(Hospital.id == 1).first()
    if not apollo:
        print("Apollo hospital not found. Run seed_hospitals.py first.")
        return
        
    email = "satya.k@apollotirupati.com"
    existing_staff = db.query(HospitalStaff).filter(HospitalStaff.email == email).first()
    
    if not existing_staff:
        staff = HospitalStaff(
            hospital_id=1,
            name="Dr. Satya K",
            role="Emergency Director",
            email=email,
            password_hash=get_password_hash("securepass123")
        )
        db.add(staff)
        db.commit()
        print(f"User {email} successfully seeded with password 'securepass123'")
    else:
        print(f"User {email} already exists.")
        
    db.close()

if __name__ == "__main__":
    seed_staff()
