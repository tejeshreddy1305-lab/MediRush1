"""Simulated CAD ambulance dispatch — nearest station, vehicle pool, hospital broadcast."""

from __future__ import annotations

import json
import math
import random
import uuid
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import Emergency, get_db
from websocket.manager import manager

router = APIRouter(prefix="/api", tags=["Ambulance"])

STATIONS: list[dict[str, Any]] = [
    {"name": "Tirupati Central", "lat": 13.6355, "lng": 79.4120, "vehicles": 4},
    {"name": "Renigunta Station", "lat": 13.6528, "lng": 79.5170, "vehicles": 2},
    {"name": "Tiruchanur Station", "lat": 13.5967, "lng": 79.4012, "vehicles": 3},
]

_pool: dict[str, int] = {s["name"]: int(s["vehicles"]) for s in STATIONS}


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(
        math.radians(lat2)
    ) * math.sin(dlng / 2) ** 2
    return r * 2 * math.asin(math.sqrt(a))


class DispatchBody(BaseModel):
    lat: float
    lng: float
    token: str = ""
    severity: str = "CRITICAL"
    condition: str = "Emergency"
    hospital_id: str | None = None


@router.post("/ambulance/dispatch")
async def dispatch_ambulance(body: DispatchBody, db: Session = Depends(get_db)):
    lat, lng = body.lat, body.lng
    token = (body.token or "").strip()

    hospital_id = body.hospital_id
    if not hospital_id and token:
        em = (
            db.query(Emergency)
            .filter(Emergency.token == token)
            .order_by(Emergency.created_at.desc())
            .first()
        )
        if em:
            hospital_id = em.hospital_id
    hospital_id = hospital_id or "h1"

    ranked: list[tuple[float, dict[str, Any]]] = []
    for s in STATIONS:
        km = _haversine_km(lat, lng, s["lat"], s["lng"])
        ranked.append((km, s))
    ranked.sort(key=lambda x: x[0])

    chosen = None
    for km, s in ranked:
        name = s["name"]
        if _pool.get(name, 0) > 0:
            chosen = (km, s)
            break
    if not chosen:
        km, s = ranked[0]
        chosen = (km, s)
    else:
        km, s = chosen

    name = s["name"]
    if _pool.get(name, 0) > 0:
        _pool[name] = _pool[name] - 1

    dist_km = max(0.5, km)
    base_min = 6 + (dist_km / 25.0) * 6
    eta_minutes = max(6, min(12, base_min + random.uniform(-0.8, 0.8)))
    eta_seconds = int(eta_minutes * 60)

    registration = f"AP 09 Z {random.randint(4000, 4999)}"
    driver_name = "Suresh M."
    driver_phone = "9848012345"
    dispatch_id = str(uuid.uuid4())[:12].upper()

    msg = json.dumps(
        {
            "type": "AMBULANCE_DISPATCHED",
            "token": token,
            "eta_seconds": eta_seconds,
            "registration": registration,
            "station_name": name,
            "dispatch_id": dispatch_id,
        }
    )
    await manager.broadcast_to_hospital(hospital_id, msg)

    return {
        "station_name": name,
        "eta_seconds": eta_seconds,
        "driver_name": driver_name,
        "driver_phone": driver_phone,
        "registration": registration,
        "station_lat": s["lat"],
        "station_lng": s["lng"],
        "dispatch_id": dispatch_id,
    }
