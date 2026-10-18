# WhyCode - collaudo F0: la lista di accettazione in un comando solo.
# Uso: powershell -File scripts/collaudo.ps1
$ErrorActionPreference = "Continue"
Set-Location (Split-Path -Parent $PSScriptRoot)

$problemi = @()
function Verifica($nome, $esito) {
    if ($esito) {
        Write-Host "OK    $nome"
    } else {
        Write-Host "ROTTO $nome"
        $script:problemi += $nome
    }
}

Write-Host "WhyCode, collaudo F0, $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
Write-Host ""

# 1. build
& npm run build *> $null
Verifica "build senza errori" ($LASTEXITCODE -eq 0)

# 2. test: soglia F0 almeno 60 verdi, zero rossi
$uscitaTest = & npm test 2>&1 | Out-String
$pass = 0
if ($uscitaTest -match " pass (\d+)") { $pass = [int]$Matches[1] }
$fail = -1
if ($uscitaTest -match " fail (\d+)") { $fail = [int]$Matches[1] }
Verifica "test verdi: almeno 60 (trovati $pass)" ($pass -ge 60)
Verifica "test rossi: zero (trovati $fail)" ($fail -eq 0)

# 3. corpus di prova
$validi = (Get-ChildItem "tests/fixtures/kernel/valid/*.why" | Measure-Object).Count
$rotti = (Get-ChildItem "tests/fixtures/kernel/broken/*.why" | Measure-Object).Count
$reali = (Get-ChildItem "tests/fixtures/reali/*.why" | Measure-Object).Count
Verifica "corpus validi: almeno 40 (trovati $validi)" ($validi -ge 40)
Verifica "corpus rotti: 10 (trovati $rotti)" ($rotti -eq 10)
Verifica "programmi realistici: almeno 6 (trovati $reali)" ($reali -ge 6)
Verifica "attesi.json c'e'" (Test-Path "tests/fixtures/kernel/broken/attesi.json")

# 4. golden
$uscitaGolden = & node build/tools/golden.js verifica 2>&1 | Out-String
Verifica "golden: 20 OK e 0 falliti" ($uscitaGolden -match "Golden: 20 OK, 0 FALLITO")

# 5. CLI a motore spento
$versione = & node build/tools/whycode.js --versione 2>&1 | Out-String
Verifica "CLI --versione funziona a motore spento" (($LASTEXITCODE -eq 0) -and ($versione -match "WhyCode"))
$memoria = & node build/tools/whycode.js memoria vedi 2>&1 | Out-String
Verifica "CLI memoria vedi funziona a motore spento" (($LASTEXITCODE -eq 0) -and ($memoria -match "memoria"))
$controlla = & node build/tools/whycode.js controlla tests/fixtures/reali/calcolatrice.why 2>&1 | Out-String
Verifica "CLI controlla su un programma reale: a posto" (($LASTEXITCODE -eq 0) -and ($controlla -match "OK:"))
$stampa = & node build/tools/whycode.js stampa tests/fixtures/reali/calcolatrice.why 2>&1 | Out-String
Verifica "CLI stampa su un programma reale" (($LASTEXITCODE -eq 0) -and ($stampa -match "funzione somma"))

# 6. report test: rifa' i test e lascia la riga nel registro delle prove
$report = & node build/tools/whycode.js report test 2>&1 | Out-String
Verifica "report test OK e registrato" ($report -match "REPORT: OK: \d+ passati, 0 falliti")

Write-Host ""
if ($problemi.Count -eq 0) {
    Write-Host "COLLAUDO F0: SUPERATO ($pass test verdi, $validi file validi, $rotti rotti, $reali realistici, 20 golden, CLI a motore spento)"
    exit 0
} else {
    Write-Host "COLLAUDO F0: NON SUPERATO"
    foreach ($p in $problemi) { Write-Host "  - $p" }
    exit 1
}
