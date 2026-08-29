Write-Host "Starting backend FastAPI server on port 8001..."
Set-Location -Path "$PSScriptRoot\backend"
python -m uvicorn server:app --reload --host 127.0.0.1 --port 8001
