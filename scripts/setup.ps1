# WhyCode - prepara la macchina per lavorare (Fase 0)
# Uso: powershell -File scripts/setup.ps1
$ErrorActionPreference = "Stop"

Set-Location (Split-Path -Parent $PSScriptRoot)

$nodeVersione = (& node -v).TrimStart("v")
$maggiore = [int]($nodeVersione.Split(".")[0])
if ($maggiore -lt 22) {
    Write-Host "Node troppo vecchio: serve almeno la 22, qui c'e' la $nodeVersione"
    exit 2
}
Write-Host "Node ok: v$nodeVersione"

if (-not (Test-Path "node_modules")) {
    Write-Host "Installo le dipendenze..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Installazione fallita"
        exit 2
    }
} else {
    Write-Host "Dipendenze gia' presenti"
}

foreach ($cartella in @("kb", "registro")) {
    if (-not (Test-Path $cartella)) {
        New-Item -ItemType Directory -Path $cartella | Out-Null
        Write-Host "Creata cartella $cartella"
    }
}

Write-Host "PRONTO: node v$nodeVersione, tutto a posto. Prova con: npm test"
exit 0
