from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import BloodBank, Hospital, get_db

router = APIRouter(prefix="/api", tags=["BloodBank"])


def _status(units: int) -> str:
    if units > 5:
        return "Available"
    if units >= 1:
        return "Low Stock"
    return "Unavailable"


@router.get("/blood-bank")
def list_blood_bank(
    blood_type: str = Query(..., description="e.g. O+ or O%2B"),
    db: Session = Depends(get_db),
):
    bt = blood_type.replace(" ", "")
    rows = (
        db.query(BloodBank, Hospital)
        .join(Hospital, Hospital.id == BloodBank.hospital_id)
        .filter(BloodBank.blood_type == bt)
        .all()
    )
    out = []
    for bb, h in rows:
        out.append(
            {
                "hospital_id": bb.hospital_id,
                "hospital_name": h.name,
                "blood_type": bb.blood_type,
                "units_available": bb.units_available,
                "status": _status(bb.units_available or 0),
            }
        )
    out.sort(key=lambda x: x["units_available"], reverse=True)
    return out


class BloodUpdate(BaseModel):
    hospital_id: str
    blood_type: str
    units_available: int = Field(ge=0, le=9999)


@router.post("/blood-bank/update")
def update_blood(body: BloodUpdate, db: Session = Depends(get_db)):
    bb = (
        db.query(BloodBank)
        .filter(
            BloodBank.hospital_id == body.hospital_id,
            BloodBank.blood_type == body.blood_type,
        )
        .first()
    )
    if not bb:
        bb = BloodBank(
            id=f"bb_{body.hospital_id}_{body.blood_type}",
            hospital_id=body.hospital_id,
            blood_type=body.blood_type,
            units_available=body.units_available,
            last_updated=datetime.utcnow().isoformat(),
        )
        db.add(bb)
    else:
        bb.units_available = body.units_available
        bb.last_updated = datetime.utcnow().isoformat()
    db.commit()
    return {"ok": True}


@router.get("/blood-bank/hospital/{hospital_id}")
def hospital_inventory(hospital_id: str, db: Session = Depends(get_db)):
    rows = db.query(BloodBank).filter(BloodBank.hospital_id == hospital_id).all()
    return [
        {
            "id": r.id,
            "blood_type": r.blood_type,
            "units_available": r.units_available,
            "last_updated": r.last_updated,
            "status": _status(r.units_available or 0),
        }
        for r in rows
    ]
