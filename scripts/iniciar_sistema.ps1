$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$pythonPath = Join-Path $projectRoot '.venv\Scripts\python.exe'
$logDir = Join-Path $projectRoot '.local\logs'
$backendPort = 8000
if (Test-Path -LiteralPath '.env') {
    $portLine = Get-Content -LiteralPath '.env' | Where-Object { $_ -match '^SIPRD_API_PORT=([0-9]+)$' } | Select-Object -Last 1
    if ($portLine -match '^SIPRD_API_PORT=([0-9]+)$') { $backendPort = [int]$Matches[1] }
}
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$env:TEMP = Join-Path $projectRoot '.venv\tmp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null

function Invoke-Checked {
    param([string]$Executable, [string[]]$Arguments)
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Fallo el comando: $Executable $($Arguments -join ' ')" }
}

function Get-ServiceResponse {
    param([string]$Url)
    try { return Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 } catch { return $null }
}

function Start-SiprdService {
    param([string]$Name, [string]$Executable, [string]$Arguments, [string]$Url)
    $response = Get-ServiceResponse $Url
    if ($response -and $response.StatusCode -eq 200) {
        Write-Host "$Name ya responde en $Url"
        return
    }
    $stdout = Join-Path $logDir "$Name.out.log"
    $stderr = Join-Path $logDir "$Name.err.log"
    $process = Start-Process -FilePath $Executable -ArgumentList $Arguments -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    $deadline = (Get-Date).AddSeconds(45)
    while ((Get-Date) -lt $deadline) {
        $process.Refresh()
        if ($process.HasExited) {
            if (Test-Path -LiteralPath $stderr) { Get-Content -LiteralPath $stderr -Tail 25 | Write-Host }
            throw "$Name termino antes de estar listo. Log: $stderr"
        }
        $response = Get-ServiceResponse $Url
        if ($response -and $response.StatusCode -eq 200) {
            Write-Host "$Name listo: $Url"
            return
        }
        Start-Sleep -Milliseconds 500
    }
    throw "$Name no respondio a tiempo. Revisa $stderr"
}

function Update-SiprdBackend {
    $health = Get-ServiceResponse "http://127.0.0.1:$backendPort/api/v1/salud"
    if (-not $health) { return }
    $running = $health.Content | ConvertFrom-Json
    if ($running.sistema -ne 'SIPRD API') { throw "El puerto $backendPort esta ocupado por otro servicio." }
    if ($running.version -eq '0.3.3') { return }
    Write-Host 'Actualizando el servidor SIPRD anterior...'
    $listeners = @(Get-NetTCPConnection -LocalPort $backendPort -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
    foreach ($serviceProcessId in $listeners) {
        $serviceProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $serviceProcessId"
        $isProjectPython = $serviceProcess.ExecutablePath -eq $pythonPath -or ($serviceProcess.CommandLine -and $serviceProcess.CommandLine.Contains($pythonPath))
        if (-not $isProjectPython -or $serviceProcess.CommandLine -notmatch 'backend\.app\.main:app') {
            throw "No se pudo identificar con seguridad el servidor anterior. Cierra su terminal y vuelve a ejecutar iniciar_sistema.bat."
        }
        Stop-Process -Id $serviceProcessId -Force -ErrorAction Stop
    }
    $deadline = (Get-Date).AddSeconds(10)
    while ((Get-Date) -lt $deadline -and (Get-ServiceResponse "http://127.0.0.1:$backendPort/api/v1/salud")) { Start-Sleep -Milliseconds 300 }
    if (Get-ServiceResponse "http://127.0.0.1:$backendPort/api/v1/salud") { throw "El servidor anterior sigue activo. No se pudo completar su reinicio." }
}

try {
    if (-not (Test-Path -LiteralPath $pythonPath)) {
        Write-Host 'Creando entorno virtual de Python...'
        $systemPython = (Get-Command python -ErrorAction Stop).Source
        Invoke-Checked $systemPython @('-m', 'venv', '.venv')
    }
    $pipReady = $false
    try { & $pythonPath -m pip --version *> $null; $pipReady = ($LASTEXITCODE -eq 0) } catch {}
    if (-not $pipReady) { Invoke-Checked $pythonPath @('-m', 'ensurepip', '--upgrade') }
    $dependenciesReady = $false
    try {
        & $pythonPath -c 'import fastapi, uvicorn, sqlalchemy.ext.asyncio, asyncpg, psycopg, pydantic_settings, email_validator, jwt, argon2, multipart, structlog, httpx, aiofiles, dotenv, aiosqlite, openpyxl' *> $null
        $dependenciesReady = ($LASTEXITCODE -eq 0)
    } catch {}
    if (-not $dependenciesReady) {
        Write-Host 'Instalando dependencias de Python...'
        Invoke-Checked $pythonPath @('-m', 'pip', 'install', '-r', 'backend/requirements.txt')
    }
    if (-not (Test-Path -LiteralPath 'node_modules\vite\bin\vite.js')) {
        Write-Host 'Instalando dependencias del frontend...'
        $npmPath = (Get-Command npm.cmd -ErrorAction Stop).Source
        Invoke-Checked $npmPath @('ci')
    }
    $nodePath = (Get-Command node -ErrorAction Stop).Source
    Start-SiprdService 'motor' $pythonPath '-m uvicorn motor.api.main:app --host 127.0.0.1 --port 8001' 'http://127.0.0.1:8001/salud'
    Update-SiprdBackend
    Start-SiprdService 'backend' $pythonPath "-m uvicorn backend.app.main:app --host 127.0.0.1 --port $backendPort" "http://127.0.0.1:$backendPort/listo"
    Start-SiprdService 'frontend' $nodePath 'node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort' 'http://127.0.0.1:5173/'
    Write-Host ''
    Write-Host 'Frontend: http://localhost:5173/'
    Write-Host "API:      http://127.0.0.1:$backendPort/docs"
    Write-Host 'Motor:    http://127.0.0.1:8001/docs'
    Write-Host "Logs:     $logDir"
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
