# Ensure Node.js and yarn paths are in PATH
$env:Path = "C:\Program Files\nodejs;$env:APPDATA\npm;" + $env:Path

Write-Host "Waiting for any package installation to finish..."
while (Get-Process -Name "npm", "yarn" -ErrorAction SilentlyContinue) {
    Start-Sleep -Seconds 2
}
Write-Host "Starting frontend dev server..."
Set-Location -Path "$PSScriptRoot\frontend"
$env:PORT=3000
if (Get-Command yarn.cmd -ErrorAction SilentlyContinue) {
    yarn.cmd start
} else {
    npm.cmd start
}
