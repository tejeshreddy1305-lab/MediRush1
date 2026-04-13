from __future__ import annotations

import json
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException

from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import HospitalStaff, get_db
from websocket.manager import manager

router = APIRouter(prefix="/api", tags=["Staff"])


@router.get("/staff/{hospital_id}")
def list_staff(hospital_id: str, db: Session = Depends(get_db)):
    rows = db.query(HospitalStaff).filter(HospitalStaff.hospital_id == hospital_id).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "role": s.role,
            "email": s.email,
            "status": s.status or "available",
            "speciality": s.speciality or "",
            "current_case_token": s.current_case_token or "",
        }
        for s in rows
    ]


class StatusBody(BaseModel):
    status: Literal["available", "on_case", "off_duty"]


@router.patch("/staff/{staff_id}/status")
def patch_staff_status(staff_id: str, body: StatusBody, db: Session = Depends(get_db)):
    s = db.query(HospitalStaff).filter(HospitalStaff.id == staff_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Staff not found")
    s.status = body.status
    if body.status != "on_case":
        s.current_case_token = ""
    db.commit()
    return {"ok": True}


class AssignBody(BaseModel):
    staff_id: str
    token: str
    hospital_id: str
    message: str = "A specialist has been assigned to your case."


@router.post("/staff/assign")
async def assign_staff(body: AssignBody, db: Session = Depends(get_db)):
    s = db.query(HospitalStaff).filter(HospitalStaff.id == body.staff_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Staff not found")
    if (s.status or "") != "available":
        raise HTTPException(status_code=400, detail="Staff not available")

    s.status = "on_case"
    s.current_case_token = body.token
    db.commit()

    payload = {
        "type": "DOCTOR_ASSIGNED",
        "doctor_name": s.name,
        "role": s.role,
        "speciality": s.speciality or "",
        "message": body.message,
    }
    await manager.broadcast_to_patient(body.token, json.dumps(payload))
    return {"ok": True, "assigned": s.name}
