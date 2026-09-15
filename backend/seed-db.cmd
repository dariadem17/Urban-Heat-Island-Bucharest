@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo [ERROR] Mediul virtual .venv nu exista.
  echo Instaleaza mai intai dependentele backendului.
  pause
  exit /b 1
)

echo Calculez si salvez statisticile din TIFF si JSON...
".venv\Scripts\python.exe" seed_db.py --replace

if errorlevel 1 (
  echo [ERROR] Baza de date nu a putut fi generata.
  pause
  exit /b 1
)

echo Baza de date a fost actualizata.
pause
