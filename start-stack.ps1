<#
    ARGUS-PRISM — one-shot local stack launcher
    ------------------------------------------------------------------
    Brings up the full production stack and the backend API:
        Postgres · Neo4j · Redis · Ollama (AI Examiner) · FastAPI

    Usage:
        ./start-stack.ps1              # datastores + backend
        ./start-stack.ps1 -NoAssistant # skip Ollama (lighter)
        ./start-stack.ps1 -Stop        # stop everything (data kept)

    Requires: Docker Desktop running, backend/.venv created, .env present.
#>
param(
    [switch]$Stop,
    [switch]$NoAssistant,
    [switch]$Seed          # also populate demo accounts/alerts via the simulator
)

$ErrorActionPreference = 'Stop'
$root    = $PSScriptRoot
$compose = Join-Path $root 'infra/docker-compose.yml'
$py      = Join-Path $root 'backend/.venv/Scripts/python.exe'

function Wait-Healthy($name, $timeoutSec = 120) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        $s = docker inspect --format '{{.State.Health.Status}}' $name 2>$null
        if ($s -eq 'healthy') { Write-Host "  $name  healthy" -ForegroundColor Green; return }
        Start-Sleep 3
    }
    throw "$name did not become healthy within ${timeoutSec}s"
}

if ($Stop) {
    Write-Host "Stopping ARGUS-PRISM stack (data volumes kept)..." -ForegroundColor Cyan
    $p = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
    if ($p) { Stop-Process -Id $p.OwningProcess -Force; Write-Host "  backend stopped (PID $($p.OwningProcess))" }
    docker compose -f $compose --profile assistant stop
    Write-Host "Stopped." -ForegroundColor Green
    return
}

# 1. Docker up
if (-not (docker info 2>$null)) { throw "Docker Desktop is not running. Start it first." }

Write-Host "Starting datastores..." -ForegroundColor Cyan
if ($NoAssistant) {
    docker compose -f $compose up -d postgres neo4j redis
} else {
    docker compose -f $compose --profile assistant up -d postgres neo4j redis ollama
}

Write-Host "Waiting for health checks..." -ForegroundColor Cyan
Wait-Healthy 'infra-postgres-1'
Wait-Healthy 'infra-redis-1'
Wait-Healthy 'infra-neo4j-1'

# 2. Ensure the AI model is present (free, local)
if (-not $NoAssistant) {
    $cid = docker ps -qf name=ollama
    if ($cid) {
        $has = docker exec $cid ollama list 2>$null | Select-String 'gemma:2b'
        if (-not $has) {
            Write-Host "Pulling gemma:2b (first run only, ~1.7 GB)..." -ForegroundColor Cyan
            docker exec $cid ollama pull gemma:2b
        } else {
            Write-Host "  gemma:2b  present" -ForegroundColor Green
        }
    }
}

# 3. Backend
$existing = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Backend already listening on :8000 (PID $($existing.OwningProcess))" -ForegroundColor Yellow
} else {
    Write-Host "Starting backend on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
    Push-Location (Join-Path $root 'backend')
    Start-Process -FilePath $py -ArgumentList '-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8000' -WindowStyle Minimized
    Pop-Location
    Start-Sleep 6
}

# 3b. Optional demo data (additive — leaves seeded cases/audit intact)
if ($Seed) {
    Write-Host "Seeding demo data (cases + simulator accounts/alerts)..." -ForegroundColor Cyan
    Push-Location (Join-Path $root 'backend')
    & $py seed_demo.py
    & $py seed_sim.py
    Pop-Location
}

# 4. Report health
try {
    $h = Invoke-RestMethod http://127.0.0.1:8000/health -TimeoutSec 5
    Write-Host "`nStack health:" -ForegroundColor Cyan
    $h.data.dependencies.PSObject.Properties | ForEach-Object {
        $st = $_.Value.status
        $col = if ($st -eq 'up') { 'Green' } elseif ($st -eq 'disabled') { 'Yellow' } else { 'Red' }
        Write-Host ("  {0,-10} {1}  ({2})" -f $_.Name, $st, $_.Value.detail) -ForegroundColor $col
    }
} catch {
    Write-Host "Backend not answering /health yet — give it a few seconds." -ForegroundColor Yellow
}

Write-Host "`nFrontend:  cd frontend; npm run dev   ->  http://localhost:5173" -ForegroundColor Cyan
Write-Host "Stop all:  ./start-stack.ps1 -Stop" -ForegroundColor Cyan
