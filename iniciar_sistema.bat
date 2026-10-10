@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\iniciar_sistema.ps1"
if errorlevel 1 (
    echo.
    echo No se pudo iniciar SIPRD. Revisa el error indicado arriba.
    pause
    exit /b 1
)
echo.
echo SIPRD esta disponible en http://localhost:5173/
pause
