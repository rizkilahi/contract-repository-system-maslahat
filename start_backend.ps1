Write-Host "Starting backend FastAPI server on port 8001..."
Set-Location -Path "$PSScriptRoot\backend"

$venvPython = Join-Path (Get-Location) ".venv\Scripts\python.exe"
if (Test-Path $venvPython) {
    Write-Host "Using virtual environment Python: $venvPython"
    & $venvPython -m uvicorn server:app --reload --host 0.0.0.0 --port 8001
} else {
    Write-Host "Warning: .venv not found, falling back to system python..."
    python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001
}
