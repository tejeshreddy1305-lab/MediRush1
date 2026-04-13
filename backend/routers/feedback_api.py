from __future__ import annotations

from datetime import datetime
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import Feedback, get_db

router = APIRouter(prefix="/api", tags=["Feedback"])


class FeedbackCreate(BaseModel):
    token: str = ""
    hospital_id: str
    rating: int = Field(ge=1, le=5)
    response_time_rating: int = Field(ge=1, le=5)
    staff_rating: int = Field(ge=1, le=5)
    comment: str = ""
    would_recommend: bool = True


@router.post("/feedback")
def create_feedback(body: FeedbackCreate, db: Session = Depends(get_db)):
    fid = str(uuid.uuid4())[:12]
    db.add(
        Feedback(
            id=fid,
            emergency_id="",
            hospital_id=body.hospital_id,
            patient_token=body.token,
            rating=body.rating,
            response_time_rating=body.response_time_rating,
            staff_rating=body.staff_rating,
            comment=(body.comment or "")[:300],
            would_recommend=body.would_recommend,
            created_at=datetime.utcnow().isoformat(),
        )
    )
    db.commit()
    return {"ok": True, "id": fid}


@router.get("/feedback/hospital/{hospital_id}/summary")
def feedback_summary(hospital_id: str, db: Session = Depends(get_db)):
    q = db.query(Feedback).filter(Feedback.hospital_id == hospital_id)
    rows = q.all()
    n = len(rows)
    if n == 0:
        return {
            "avg_rating": 0.0,
            "avg_response_time_rating": 0.0,
            "avg_staff_rating": 0.0,
            "total_responses": 0,
            "rating_distribution": {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0},
            "would_recommend_pct": 0.0,
            "recent_comments": [],
        }

    avg_rating = sum(r.rating or 0 for r in rows) / n
    avg_rt = sum(r.response_time_rating or 0 for r in rows) / n
    avg_st = sum(r.staff_rating or 0 for r in rows) / n
    dist = {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}
    for r in rows:
        k = str(max(1, min(5, r.rating or 0)))
        if k in dist:
            dist[k] += 1
    rec = sum(1 for r in rows if r.would_recommend)
    recent = sorted(rows, key=lambda x: x.created_at or "", reverse=True)[:5]
    comments = [c.comment for c in recent if c.comment]

    return {
        "avg_rating": round(avg_rating, 2),
        "avg_response_time_rating": round(avg_rt, 2),
        "avg_staff_rating": round(avg_st, 2),
        "total_responses": n,
        "rating_distribution": dist,
        "would_recommend_pct": round(100.0 * rec / n, 1),
        "recent_comments": comments[:5],
    }
