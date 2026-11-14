# SPHEREx Explorer Startup Script (PowerShell)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Launching SPHEREx Explorer & WiseView Scientific Suite  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$WorkspaceRoot = $PSScriptRoot
Set-Location $WorkspaceRoot

$PythonExe = Join-Path $WorkspaceRoot "wiseview\.venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) { $PythonExe = "python" }

# 1. Launch FastAPI Backend on Port 8000
Write-Host "`n[1/2] Starting Scientific Backend on http://127.0.0.1:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WorkspaceRoot'; & '$PythonExe' -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

# 2. Launch Vite Frontend on Port 3000
Write-Host "[2/2] Starting Frontend Dev Server on http://127.0.0.1:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WorkspaceRoot\frontend'; npm run dev"

Write-Host "`n✓ All services launched in separate windows!" -ForegroundColor Cyan
Write-Host "➜ Frontend Dev:  http://127.0.0.1:3000" -ForegroundColor Yellow
Write-Host "➜ Backend & UI:  http://127.0.0.1:8000" -ForegroundColor Yellow
Write-Host "➜ API Docs:      http://127.0.0.1:8000/docs" -ForegroundColor Yellow
