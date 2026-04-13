import asyncio
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import SessionLocal, init_db
from routers import (
    ambulance,
    auth,
    blood_bank,
    dashboard,
    feedback_api,
    hospitals,
    notifications,
    patients,
    staff,
    symptoms,
    tracking,
)
from websocket.manager import manager

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("medirush")

app = FastAPI(
    title="MediRush API",
    version="2.0.0",
    description="AI-Powered Emergency Healthcare Response System",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:5176",
        "http://127.0.0.1:5176",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(symptoms.router)
app.include_router(hospitals.router)
app.include_router(notifications.router)
app.include_router(tracking.router)
app.include_router(patients.router)
app.include_router(auth.router)
app.include_router(ambulance.router)
app.include_router(dashboard.router)
app.include_router(blood_bank.router)
app.include_router(feedback_api.router)
app.include_router(staff.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "MediRush API v2.0", "websockets": "active"}


@app.get("/")
def root():
    return {"message": "MediRush Emergency Healthcare API", "docs": "/docs"}


_executor = ThreadPoolExecutor(max_workers=1)


def _train_models_sync() -> None:
    try:
        from ai.train_model import train_all

        train_all()
        logger.info("ML models trained successfully")
    except Exception as e:
        logger.error("Model training failed: %s", e)
        logger.warning("Falling back to rule-based triage")


async def _maybe_train_models() -> None:
    pkl = Path(__file__).resolve().parent / "ai" / "severity_model.pkl"
    if pkl.exists():
        try:
            from ai.triage import reload_models

            reload_models()
        except Exception:
            pass
        return
    logger.info("ML models not found — training in background…")
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(_executor, _train_models_sync)


async def _broadcast_stats_loop() -> None:
    await asyncio.sleep(2)
    while True:
        try:
            from routers.dashboard import compute_stats

            db = SessionLocal()
            try:
                for hid in list(manager.hospital_connections.keys()):
                    stats = compute_stats(db, hid)
                    await manager.broadcast_to_hospital(
                        hid,
                        json.dumps({"type": "STATS_UPDATE", "stats": stats}),
                    )
            finally:
                db.close()
        except Exception:
            logger.exception("stats broadcast tick failed")
        await asyncio.sleep(30)


@app.on_event("startup")
async def startup():
    init_db()
    asyncio.create_task(_maybe_train_models())
    asyncio.create_task(_broadcast_stats_loop())
    try:
        from ai.triage import log_metrics_once

        log_metrics_once()
    except Exception:
        pass
    logger.info("MediRush API started — database initialized")


@app.websocket("/ws/hospital/{hospital_id}")
async def hospital_ws(websocket: WebSocket, hospital_id: str):
    await manager.connect_hospital(websocket, hospital_id)
    logger.info("Hospital %s connected via WebSocket", hospital_id)
    try:
        while True:
            try:
                data = await websocket.receive_text()
                msg = json.loads(data)
            except Exception:
                continue
            if msg.get("type") in ("DOCTOR_ACCEPTED", "ARRIVED", "COMPLETED"):
                token = msg.get("token", "")
                await manager.broadcast_to_patient(token, json.dumps(msg))
            elif msg.get("type") == "BED_UPDATE":
                await manager.broadcast_to_hospital(hospital_id, json.dumps(msg))
    except WebSocketDisconnect:
        manager.disconnect_hospital(websocket, hospital_id)
        logger.info("Hospital %s disconnected", hospital_id)


@app.websocket("/ws/patient/{token}")
async def patient_ws(websocket: WebSocket, token: str):
    await manager.connect_patient(websocket, token)
    logger.info("Patient %s connected via WebSocket", token)
    try:
        while True:
            try:
                data = await websocket.receive_text()
                msg = json.loads(data)
            except Exception:
                continue
            if msg.get("type") == "LOCATION_UPDATE":
                hospital_id = msg.get("hospital_id", "")
                if hospital_id:
                    await manager.broadcast_to_hospital(hospital_id, json.dumps(msg))
    except WebSocketDisconnect:
        manager.disconnect_patient(websocket, token)
        logger.info("Patient %s disconnected", token)


@app.websocket("/ws/tracking/{token}")
async def tracking_ws(websocket: WebSocket, token: str):
    await manager.connect_patient(websocket, token)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_patient(websocket, token)
