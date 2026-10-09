@echo off
chcp 65001 >nul
echo ========================================================
echo  SIPRD · Alfa Distribuidores S.A.
echo  Iniciando servicios en Localhost...
echo ========================================================

echo [1/3] Iniciando Motor VRP (Puerto 8001)...
start "SIPRD Motor VRP" cmd /k "python -m uvicorn motor.api.main:app --host 127.0.0.1 --port 8001 --reload"

echo [2/3] Iniciando Backend API (Puerto 8000)...
start "SIPRD Backend" cmd /k "python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [3/3] Iniciando Frontend React (Puerto 5173)...
start "SIPRD Frontend" cmd /k "npm run dev"

echo.
echo ========================================================
echo  Servicios activos en Localhost:
echo  - Frontend: http://localhost:5173/
echo  - Backend API: http://localhost:8000/docs
echo  - Motor VRP:   http://localhost:8001/docs
echo ========================================================
