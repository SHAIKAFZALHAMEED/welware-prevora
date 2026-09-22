# PREVORA Startup Helper Script
# Run this from d:\SIH2026\Welware\

$NODE = "$PSScriptRoot\node-v22.11.0-win-x64\node.exe"
$NPM  = "$PSScriptRoot\node-v22.11.0-win-x64\npm.cmd"
$env:Path = "$PSScriptRoot\node-v22.11.0-win-x64;$env:Path"

Write-Host "=== PREVORA SIF Sentinel ===" -ForegroundColor Cyan
Write-Host "Node: $(& $NODE --version)" -ForegroundColor Green
Write-Host ""

# Start backend in a new window
Write-Host "Starting FastAPI backend on http://localhost:8000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\backend'; uvicorn app.main:app --port 8000" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start frontend dev server
Write-Host "Starting React frontend on http://localhost:5173 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend'; `$env:Path = '$PSScriptRoot\node-v22.11.0-win-x64;' + `$env:Path; & '$NPM' run dev" -WindowStyle Normal

Start-Sleep -Seconds 2
Write-Host ""
Write-Host "PREVORA is starting up!" -ForegroundColor Green
Write-Host "  Backend API:   http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  Frontend App:  http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Login:         hse@oil.in / prevora2026" -ForegroundColor White
