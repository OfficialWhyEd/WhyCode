# WhyCode - la prova completa (build + tutti i test)
# Uso: powershell -File scripts/prova.ps1
$ErrorActionPreference = "Stop"

Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "Compilo e lancio tutti i test..."
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "PROVA FALLITA"
    exit 1
}
Write-Host "PROVA OK"
exit 0
