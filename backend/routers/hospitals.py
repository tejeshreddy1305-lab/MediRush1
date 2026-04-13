from __future__ import annotations

import math
import os
import random
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import Emergency, Hospital, get_db

router = APIRouter(prefix="/api", tags=["Hospitals"])

GOOGLE_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(
        math.radians(lat2)
    ) * math.sin(dlng / 2) ** 2
    return r * 2 * math.asin(math.sqrt(a))


def _directions_eta(
    plat: float, plng: float, hlat: float, hlng: float
) -> tuple[int, float, str]:
    if GOOGLE_KEY:
        url = (
            "https://maps.googleapis.com/maps/api/directions/json"
            f"?origin={plat},{plng}&destination={hlat},{hlng}"
            f"&mode=driving&key={GOOGLE_KEY}"
        )
        try:
            r = httpx.get(url, timeout=10.0)
            data = r.json()
            if data.get("routes"):
                leg = data["routes"][0]["legs"][0]
                eta = int(leg["duration"]["value"])
                dist_km = leg["distance"]["value"] / 1000.0
                summary = leg.get("summary") or ""
                return eta, round(dist_km, 2), summary
        except Exception:
            pass
    km = haversine_km(plat, plng, hlat, hlng)
    eta = int(km / 30.0 * 3600)
    return max(eta, 60), round(km, 2), "straight-line estimate"


CONDITION_SPECIALTY_MAP: dict[str, list[str]] = {
    "Acute Coronary Syndrome": [
        "Cardiology",
        "Cardiac ICU",
        "Interventional Cardiology",
    ],
    "Stroke": ["Neurology", "Neurosurgery", "Stroke Unit"],
    "Cardiac Arrest": ["Cardiology", "Emergency Medicine", "Cardiac ICU"],
    "Respiratory Distress": ["Pulmonology", "Emergency Medicine", "ICU"],
    "Neurological Emergency": ["Neurology", "Neurosurgery"],
    "Hemorrhagic Emergency": ["Trauma", "General Surgery", "ICU"],
    "Anaphylaxis": ["Emergency Medicine", "Allergy", "ICU"],
    "Fracture": ["Orthopedics", "Trauma"],
    "General Emergency": ["Emergency Medicine", "General Medicine"],
}


def _specialty_match_scores(
    specs: list[str], condition: str
) -> tuple[float, str, str | None]:
    """Returns (specialty_match_score, match_reason, condition_specific_unit)."""
    cond = (condition or "").strip() or "General Emergency"
    required = CONDITION_SPECIALTY_MAP.get(
        cond, CONDITION_SPECIALTY_MAP["General Emergency"]
    )
    spec_set = [str(s) for s in specs]
    matched = [s for s in spec_set if s in required]
    if matched:
        unit = matched[0]
        return (
            1.0,
            f"Strong match: {unit} aligns with {cond}.",
            unit,
        )
    lowered = [s.lower() for s in spec_set]
    partial = False
    for req in required:
        rl = req.lower()
        if any(rl in ls or ls in rl for ls in lowered):
            partial = True
            break
    if partial:
        return (
            0.5,
            f"Partial specialty overlap for {cond}; still capable ER care.",
            None,
        )
    return (
        0.1,
        "No direct specialty banner — routed to general emergency capacity.",
        None,
    )


def _wait_time_minutes(hospital_type: str | None) -> int:
    base = 8 if (hospital_type or "").lower() == "private" else 18
    return max(1, base + random.randint(-3, 3))


def _specialty_match(specs: list[str], condition: str) -> float:
    score, _, _ = _specialty_match_scores(specs, condition)
    return score


@router.get("/hospitals/nearby")
async def hospitals_nearby(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: int = Query(5000),
    type: str = Query("hospital"),
):
    results: list[dict[str, Any]] = []
    if not GOOGLE_KEY:
        return {"results": [], "source": "places", "message": "GOOGLE_MAPS_API_KEY missing"}
    url = (
        "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        f"?location={lat},{lng}&radius={radius}&type={type}&key={GOOGLE_KEY}"
    )
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            r = await client.get(url)
            data = r.json()
        for p in data.get("results", [])[:20]:
            loc = p.get("geometry", {}).get("location", {})
            results.append(
                {
                    "name": p.get("name"),
                    "lat": loc.get("lat"),
                    "lng": loc.get("lng"),
                    "place_id": p.get("place_id"),
                    "rating": p.get("rating"),
                    "vicinity": p.get("vicinity"),
                }
            )
        return {"results": results, "source": "places"}
    except Exception as e:
        return {"results": [], "source": "places", "error": str(e)}


@router.get("/hospitals/eta")
def hospitals_eta(
    origin_lat: float = Query(...),
    origin_lng: float = Query(...),
    dest_lat: float = Query(...),
    dest_lng: float = Query(...),
):
    try:
        eta_sec, dist_km, summary = _directions_eta(
            origin_lat, origin_lng, dest_lat, dest_lng
        )
        return {
            "eta_seconds": eta_sec,
            "distance_km": dist_km,
            "route_summary": summary,
        }
    except Exception as e:
        km = haversine_km(origin_lat, origin_lng, dest_lat, dest_lng)
        return {
            "eta_seconds": int(km / 30.0 * 3600),
            "distance_km": round(km, 2),
            "route_summary": "fallback",
            "error": str(e),
        }


@router.post("/hospitals/recommend")
def recommend_hospitals(body: dict, db: Session = Depends(get_db)):
    lat = float(body.get("lat", 13.6288))
    lng = float(body.get("lng", 79.4192))
    condition = str(body.get("condition", ""))
    severity = str(body.get("severity", "MODERATE"))

    hospitals = db.query(Hospital).all()
    import json as _json

    scored: list[dict[str, Any]] = []
    for h in hospitals:
        specs = _json.loads(h.specializations or "[]")
        eta_sec, dist_km, _summary = _directions_eta(lat, lng, h.lat, h.lng)
        specialty_score = _specialty_match(specs, condition)
        sm_score, match_reason, cond_unit = _specialty_match_scores(specs, condition)
        beds_avail = max(0, (h.beds_total or 0) - (h.beds_occupied or 0))
        bed_ratio = beds_avail / max(h.beds_total or 1, 1)
        crit_icu = (
            db.query(Emergency)
            .filter(Emergency.hospital_id == h.id, Emergency.severity == "CRITICAL")
            .filter(or_(Emergency.status == "active", Emergency.status.is_(None)))
            .count()
        )
        icu_avail = max(0, (h.icu_beds or 0) - crit_icu)
        icu_ratio = min(1.0, icu_avail / max(h.icu_beds or 1, 1))
        composite = (
            (1.0 - min(1.0, eta_sec / 3600.0)) * 0.25
            + specialty_score * 0.35
            + bed_ratio * 0.20
            + icu_ratio * 0.20
        )
        wait_min = _wait_time_minutes(h.type)
        trauma = any("Trauma" in s for s in specs)
        scored.append(
            {
                "id": h.id,
                "name": h.name,
                "phone": h.phone,
                "type": h.type,
                "lat": h.lat,
                "lng": h.lng,
                "specializations": specs,
                "beds_available": beds_avail,
                "icu_beds": h.icu_beds,
                "beds_total": h.beds_total,
                "eta_seconds": eta_sec,
                "distance_km": dist_km,
                "drive_time_minutes": max(1, round(eta_sec / 60)),
                "composite_score": round(min(10.0, composite * 10), 2),
                "severity": severity,
                "specialty_match_score": sm_score,
                "match_reason": match_reason,
                "wait_time_minutes": wait_min,
                "condition_specific_unit": cond_unit,
                "trauma_unit": trauma,
                "icu_beds_available": icu_avail,
            }
        )
    scored.sort(key=lambda x: x["composite_score"], reverse=True)
    top = scored[:3]
    for i, row in enumerate(top):
        row["rank"] = i + 1
        if i == 0:
            row["best_match"] = True
    return {"hospitals": top}


@router.post("/recommend")
def recommend_legacy(body: dict, db: Session = Depends(get_db)):
    return recommend_hospitals(body, db)


@router.get("/geocode/reverse")
async def reverse_geocode(lat: float = Query(...), lng: float = Query(...)):
    url = (
        "https://nominatim.openstreetmap.org/reverse?lat="
        f"{lat}&lon={lng}&format=json"
    )
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                url,
                headers={"User-Agent": "MediRush/2.0 (emergency triage)"},
            )
            data = r.json()
        addr = data.get("address", {})
        city = addr.get("city") or addr.get("town") or addr.get("village") or ""
        state = addr.get("state", "")
        display = data.get("display_name", "")
        return {"city": city, "state": state, "display_name": display}
    except Exception as e:
        return {"city": "Tirupati", "state": "Andhra Pradesh", "error": str(e)}


@router.get("/hospitals")
def list_hospitals(db: Session = Depends(get_db)):
    import json as _json

    hospitals = db.query(Hospital).all()
    result = []
    for h in hospitals:
        result.append(
            {
                "id": h.id,
                "name": h.name,
                "city": h.city,
                "lat": h.lat,
                "lng": h.lng,
                "phone": h.phone,
                "type": h.type,
                "beds_total": h.beds_total,
                "beds_available": (h.beds_total or 0) - (h.beds_occupied or 0),
                "specializations": _json.loads(h.specializations or "[]"),
                "emergency_bay": h.emergency_bay,
                "rating": h.rating,
            }
        )
    return result
