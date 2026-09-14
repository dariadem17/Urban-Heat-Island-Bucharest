@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo [ERROR] Mediul virtual .venv nu exista.
  echo Ruleaza mai intai instalarea dependentelor.
  pause
  exit /b 1
)

echo Pornesc Urban Heat Island API...
echo API:  http://127.0.0.1:8000
echo Docs: http://127.0.0.1:8000/docs
echo Oprire: CTRL+C
echo.

".venv\Scripts\python.exe" -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

echo.
echo Backend-ul s-a oprit.
pause
