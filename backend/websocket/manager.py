from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        self.hospital_connections: Dict[str, List[WebSocket]] = {}
        self.patient_connections: Dict[str, List[WebSocket]] = {}

    async def connect_hospital(self, websocket: WebSocket, hospital_id: str):
        await websocket.accept()
        if hospital_id not in self.hospital_connections:
            self.hospital_connections[hospital_id] = []
        self.hospital_connections[hospital_id].append(websocket)

    async def connect_patient(self, websocket: WebSocket, token: str):
        await websocket.accept()
        if token not in self.patient_connections:
            self.patient_connections[token] = []
        self.patient_connections[token].append(websocket)

    def disconnect_hospital(self, websocket: WebSocket, hospital_id: str):
        conns = self.hospital_connections.get(hospital_id, [])
        if websocket in conns:
            conns.remove(websocket)

    def disconnect_patient(self, websocket: WebSocket, token: str):
        conns = self.patient_connections.get(token, [])
        if websocket in conns:
            conns.remove(websocket)

    async def broadcast_to_hospital(self, hospital_id: str, message: str):
        for ws in self.hospital_connections.get(hospital_id, []):
            try:
                await ws.send_text(message)
            except Exception:
                pass

    async def broadcast_to_patient(self, token: str, message: str):
        for ws in self.patient_connections.get(token, []):
            try:
                await ws.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()