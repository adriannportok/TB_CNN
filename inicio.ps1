# Script de inicio rápido para TB-CNN
# Ejecuta este script desde PowerShell en la raíz del proyecto

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   TB-CNN - Inicio Automático" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Obtener la ruta actual
$projectRoot = $PSScriptRoot

# Función para verificar si un comando existe
function Test-Command {
    param($command)
    $null -ne (Get-Command $command -ErrorAction SilentlyContinue)
}

# Verificar Python
Write-Host "[1/5] Verificando Python..." -ForegroundColor Yellow
if (Test-Command python) {
    $pythonVersion = python --version
    Write-Host "  ✓ $pythonVersion encontrado" -ForegroundColor Green
} else {
    Write-Host "  ✗ Python no encontrado. Por favor instala Python 3.9+" -ForegroundColor Red
    exit 1
}

# Verificar Node.js
Write-Host "[2/5] Verificando Node.js..." -ForegroundColor Yellow
if (Test-Command node) {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js $nodeVersion encontrado" -ForegroundColor Green
} else {
    Write-Host "  ✗ Node.js no encontrado. Por favor instala Node.js 18+" -ForegroundColor Red
    exit 1
}

# Verificar entorno virtual de Python
Write-Host "[3/5] Verificando entorno virtual Python..." -ForegroundColor Yellow
$venvPath = Join-Path $projectRoot "server-flask\.venv"
if (Test-Path $venvPath) {
    Write-Host "  ✓ Entorno virtual encontrado" -ForegroundColor Green
} else {
    Write-Host "  ! Creando entorno virtual..." -ForegroundColor Yellow
    Set-Location (Join-Path $projectRoot "server-flask")
    python -m venv .venv
    Write-Host "  ✓ Entorno virtual creado" -ForegroundColor Green
    Set-Location $projectRoot
}

# Verificar dependencias del backend
Write-Host "[4/5] Verificando dependencias del backend..." -ForegroundColor Yellow
$requirementsPath = Join-Path $projectRoot "server-flask\requirements.txt"
if (Test-Path $requirementsPath) {
    Write-Host "  ! Instalando dependencias (esto puede tardar)..." -ForegroundColor Yellow
    Set-Location (Join-Path $projectRoot "server-flask")
    & "$venvPath\Scripts\python.exe" -m pip install -r requirements.txt --quiet
    Write-Host "  ✓ Dependencias instaladas" -ForegroundColor Green
    Set-Location $projectRoot
} else {
    Write-Host "  ⚠ requirements.txt no encontrado" -ForegroundColor Yellow
}

# Verificar dependencias del frontend
Write-Host "[5/5] Verificando dependencias del frontend..." -ForegroundColor Yellow
$nodeModulesPath = Join-Path $projectRoot "frontend\node_modules"
if (-not (Test-Path $nodeModulesPath)) {
    Write-Host "  ! Instalando dependencias de Node.js..." -ForegroundColor Yellow
    Set-Location (Join-Path $projectRoot "frontend")
    npm install --silent
    Write-Host "  ✓ Dependencias instaladas" -ForegroundColor Green
    Set-Location $projectRoot
} else {
    Write-Host "  ✓ Dependencias ya instaladas" -ForegroundColor Green
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   Configuración completada" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Preguntar si desea iniciar los servidores
Write-Host "¿Deseas iniciar los servidores ahora? (S/N): " -NoNewline -ForegroundColor Yellow
$response = Read-Host

if ($response -eq 'S' -or $response -eq 's') {
    Write-Host ""
    Write-Host "Iniciando servidores..." -ForegroundColor Cyan
    Write-Host ""
    
    # Iniciar backend en una nueva ventana
    Write-Host "► Iniciando Backend (Flask)..." -ForegroundColor Green
    $backendPath = Join-Path $projectRoot "server-flask"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; .\.venv\Scripts\activate; python main.py"
    
    Start-Sleep -Seconds 2
    
    # Iniciar frontend en una nueva ventana
    Write-Host "► Iniciando Frontend (React)..." -ForegroundColor Green
    $frontendPath = Join-Path $projectRoot "frontend"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev"
    
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "   Servidores iniciados" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Backend:  http://localhost:5000" -ForegroundColor Green
    Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
    Write-Host ""
    Write-Host "Presiona Ctrl+C en cada ventana para detener los servidores" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Para iniciar manualmente:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Backend:" -ForegroundColor Cyan
    Write-Host "  cd server-flask" -ForegroundColor White
    Write-Host "  .\.venv\Scripts\activate" -ForegroundColor White
    Write-Host "  python main.py" -ForegroundColor White
    Write-Host ""
    Write-Host "Frontend:" -ForegroundColor Cyan
    Write-Host "  cd frontend" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host ""
}

Write-Host "¡Listo! 🎉" -ForegroundColor Green
