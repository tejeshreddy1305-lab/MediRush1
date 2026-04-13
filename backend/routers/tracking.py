from fastapi import APIRouter
from websocket.manager import manager
from pydantic import BaseModel
import json

router = APIRouter(prefix="/api", tags=["Tracking"])

class LocationUpdate(BaseModel):
    lat: float
    lng: float
    hospital_id: str = ""

@router.patch("/tracking/{token}")
async def update_location(token: str, body: LocationUpdate):
    message = json.dumps({
        "type": "LOCATION_UPDATE",
        "lat": body.lat,
        "lng": body.lng,
        "token": token,
        "hospital_id": body.hospital_id,
    })
    if body.hospital_id:
        await manager.broadcast_to_hospital(body.hospital_id, message)
    return {"status": "updated"}