# WhyCode - che aria tira: versioni, git, registri, memoria
# Uso: powershell -File scripts/stato.ps1
$ErrorActionPreference = "Stop"

Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "WhyCode, stato al $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
Write-Host "Node: $(& node -v)"

if (Test-Path ".git") {
    $modifiche = (git status --short | Measure-Object).Count
    Write-Host "Git: $modifiche file modificati o nuovi"
}

$linguaggi = 0
if (Test-Path "kb/linguaggi") {
    $linguaggi = (Get-ChildItem "kb/linguaggi" -Directory | Measure-Object).Count
}
Write-Host "Memoria: $linguaggi linguaggi"

foreach ($registro in @("registro/prove/prove.jsonl", "registro/collassi/collassi.jsonl")) {
    if (Test-Path $registro) {
        $righe = (Get-Content $registro | Measure-Object).Count
        Write-Host "Registro $registro : $righe righe"
    } else {
        Write-Host "Registro $registro : ancora vuoto"
    }
}

if (Test-Path "build") {
    Write-Host "Build: pronta (cartella build presente)"
} else {
    Write-Host "Build: non ancora fatta (lancia npm run build)"
}

exit 0
