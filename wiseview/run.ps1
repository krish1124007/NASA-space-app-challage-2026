$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$HasDeps = & python -c "import flask, astropy, requests; print('OK')" 2>$null
if ($HasDeps -eq "OK") {
    Write-Host "System Python verified with all required scientific libraries." -ForegroundColor Green
    $PyCmd = "python"
} else {
    if (-not (Test-Path ".venv")) {
        Write-Host "Creating virtual environment..."
        python -m venv --system-site-packages .venv
    }
    Write-Host "Installing dependencies..."
    & .\.venv\Scripts\python.exe -m pip install --quiet --upgrade pip
    & .\.venv\Scripts\python.exe -m pip install --quiet -r requirements.txt
    $PyCmd = ".\.venv\Scripts\python.exe"
}

Write-Host "Starting WiseView on http://127.0.0.1:5000" -ForegroundColor Cyan
& $PyCmd -m wv.www.unoverse
