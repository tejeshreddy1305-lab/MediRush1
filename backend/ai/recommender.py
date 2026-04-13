"""
ai/recommender.py — Hospital Recommendation Engine

Composite score = specialty_match (45%) + distance_score (30%) + availability (25%)
Uses Google Directions API for real ETA and distance.
Falls back to Haversine calculation if no API key.
"""

from __future__ import annotations
import os
import math
import json
import httpx
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

GOOGLE_MAPS_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")


# ─────────────────────────────────────────
#  Haversine fallback
# ─────────────────────────────────────────
def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    dφ = math.radians(lat2 - lat1)
    dλ = math.radians(lng2 - lng1)
    a = math.sin(dφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(dλ / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _estimate_eta_seconds(distance_km: float) -> int:
    """~25 km/h average in city traffic."""
    return int((distance_km / 25) * 3600)


# ─────────────────────────────────────────
#  Google Directions API call
# ─────────────────────────────────────────
async def _get_driving_info(
    origin_lat: float, origin_lng: float,
    dest_lat: float, dest_lng: float
) -> tuple[float, int]:
    """Returns (distance_km, eta_seconds). Falls back to Haversine on error."""
    if not GOOGLE_MAPS_KEY or GOOGLE_MAPS_KEY == "YOUR_GOOGLE_MAPS_API_KEY_HERE":
        dist = _haversine_km(origin_lat, origin_lng, dest_lat, dest_lng)
        return dist, _estimate_eta_seconds(dist)

    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin":      f"{origin_lat},{origin_lng}",
        "destination": f"{dest_lat},{dest_lng}",
        "mode":        "driving",
        "key":         GOOGLE_MAPS_KEY,
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params)
            data = resp.json()
            leg = data["routes"][0]["legs"][0]
            dist_m   = leg["distance"]["value"]
            dur_s    = leg["duration"]["value"]
            return round(dist_m / 1000, 2), dur_s
    except Exception:
        dist = _haversine_km(origin_lat, origin_lng, dest_lat, dest_lng)
        return dist, _estimate_eta_seconds(dist)


# ─────────────────────────────────────────
#  Scoring helpers
# ─────────────────────────────────────────
def _specialty_score(hospital_specializations: List[str], required_specialty: str) -> float:
    """1.0 if specialty matches, 0.3 otherwise."""
    spec_lower = [s.lower() for s in hospital_specializations]
    req_lower  = required_specialty.lower()
    if any(req_lower in s or s in req_lower for s in spec_lower):
        return 1.0
    # Partial match for multi-specialty
    if "multi-specialty" in spec_lower or "multi specialty" in spec_lower:
        return 0.6
    return 0.3


def _distance_score(distance_km: float) -> float:
    """Closer = higher score. >20 km = 0."""
    return max(0.0, 1.0 - distance_km / 20.0)


def _availability_score(beds_available: int, beds_total: int) -> float:
    if beds_total == 0:
        return 0.0
    return round(beds_available / beds_total, 4)


# ─────────────────────────────────────────
#  Main recommender
# ─────────────────────────────────────────
async def recommend(
    patient_lat: float,
    patient_lng: float,
    condition: str,
    severity: str,
    required_specialty: str,
    hospitals: list,          # list of Hospital ORM objects
    top_n: int = 3,
) -> List[dict]:
    """
    Score all hospitals and return top_n sorted by composite score (desc).
    Each result dict includes all card-render data.
    """
    scored = []

    for h in hospitals:
        dist_km, eta_s = await _get_driving_info(
            patient_lat, patient_lng, h.lat, h.lng
        )

        specs = h.specializations_list
        s_score   = _specialty_score(specs, required_specialty)
        d_score   = _distance_score(dist_km)
        a_score   = _availability_score(h.beds_total - h.beds_occupied, h.beds_total)

        composite = (s_score * 0.45) + (d_score * 0.30) + (a_score * 0.25)

        # Load extra fields from JSON file if present (doctor info)
        scored.append({
            "id":               h.id,
            "name":             h.name,
            "address":          h.address,
            "city":             h.city,
            "lat":              h.lat,
            "lng":              h.lng,
            "phone":            h.phone,
            "type":             h.type,
            "specializations":  specs,
            "beds_total":       h.beds_total,
            "beds_occupied":    h.beds_occupied,
            "beds_available":   h.beds_total - h.beds_occupied,
            "emergency_bay":    h.emergency_bay,
            "icu_beds":         h.icu_beds,
            "rating":           h.rating,
            "distance_km":      round(dist_km, 2),
            "eta_seconds":      eta_s,
            "eta_minutes":      round(eta_s / 60, 1),
            "specialty_score":  round(s_score, 4),
            "distance_score":   round(d_score, 4),
            "availability_score": round(a_score, 4),
            "composite_score":  round(composite, 4),
        })

    # Sort descending by composite
    scored.sort(key=lambda x: x["composite_score"], reverse=True)
    top = scored[:top_n]

    # Add badges
    if len(top) > 0:
        top[0]["badge"] = "Best Match"
    if len(top) > 1:
        # Fastest = lowest ETA among remaining
        fastest_idx = min(range(1, len(top)), key=lambda i: top[i]["eta_seconds"])
        top[fastest_idx]["badge"] = "Fastest"

    return top
