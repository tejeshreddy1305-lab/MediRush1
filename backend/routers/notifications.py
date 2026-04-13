from fastapi import APIRouter
from websocket.manager import manager
from pydantic import BaseModel
from typing import Optional
import uuid, json
from datetime import datetime, timedelta

router = APIRouter(prefix="/api", tags=["Notifications"])

class NotifyRequest(BaseModel):
    hospital_id: str
    patient_data: dict
    condition: str = "Unknown"
    severity: str = "CRITICAL"
    priority_score: float = 9.0
    eta_seconds: int = 600
    token: Optional[str] = None

@router.post("/notify_hospital")
async def notify_hospital(req: NotifyRequest):
    token = req.token or str(uuid.uuid4())[:8].upper()
    expires_at = (datetime.utcnow() + timedelta(minutes=20)).isoformat()
    message = json.dumps({
        "type": "EMERGENCY_ALERT",
        "patient": req.patient_data,
        "condition": req.condition,
        "severity": req.severity,
        "priority_score": req.priority_score,
        "eta_seconds": req.eta_seconds,
        "token": token,
        "timestamp": datetime.utcnow().isoformat()
    })
    await manager.broadcast_to_hospital(req.hospital_id, message)
    return {"status": "notified", "token": token, "expires_at": expires_at}

@router.post("/accept_case")
async def accept_case(body: dict):
    token = body.get("token", "")
    doctor_name = body.get("doctor_name", "Dr. Ramesh Kumar")
    hospital_name = body.get("hospital_name", "Apollo Hospitals Tirupati")
    message = json.dumps({
        "type": "DOCTOR_ACCEPTED",
        "doctor_name": doctor_name,
        "hospital_name": hospital_name,
        "message": "We are ready. Come to Emergency Bay 2."
    })
    await manager.broadcast_to_patient(token, message)
    return {"status": "accepted"}


@router.post("/mark_arrived")
async def mark_arrived(body: dict):
    token = body.get("token", "")
    message = json.dumps({
        "type": "ARRIVED",
        "message": "You have arrived at the hospital. Please proceed to the help desk."
    })
    await manager.broadcast_to_patient(token, message)
    return {"status": "arrived"}
