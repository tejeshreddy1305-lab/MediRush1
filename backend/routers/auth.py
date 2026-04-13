from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, HospitalStaff, Hospital
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from pydantic import BaseModel
import os

router = APIRouter(prefix="/api", tags=["Auth"])
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
SECRET = os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET") or "medirush-secret-2024"


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(HospitalStaff).filter(HospitalStaff.email == req.email).first()
    if not user or not pwd_context.verify(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    hospital = (
        db.query(Hospital).filter(Hospital.id == user.hospital_id).first()
        if user.hospital_id
        else None
    )
    token = jwt.encode(
        {
            "sub": user.id,
            "hospital_id": user.hospital_id,
            "role": user.role,
            "name": user.name,
            "exp": datetime.utcnow() + timedelta(hours=8),
        },
        SECRET,
        algorithm=os.getenv("ALGORITHM", "HS256"),
    )
    return {
        "token": token,
        "name": user.name,
        "role": user.role,
        "hospital_id": user.hospital_id,
        "hospital_name": hospital.name if hospital else None,
    }


@router.get("/auth/verify")
def verify(token: str):
    try:
        data = jwt.decode(token, SECRET, algorithms=[os.getenv("ALGORITHM", "HS256")])
        return {"valid": True, "data": data}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
