# Start the FastAPI Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python -m uvicorn main:app --reload --port 8000"

# Start Patient App
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd patient-app; npm run dev -- --port 5173"

# Start Hospital Dashboard
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd hospital-dashboard; npm run dev -- --port 5174"

Write-Host "MediRush Services Started!"
Write-Host "Backend running on http://localhost:8000"
Write-Host "Patient App running on http://localhost:5173"
Write-Host "Hospital Dashboard running on http://localhost:5174"
