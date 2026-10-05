@echo off
setlocal
cd /d "%~dp0"
if not exist "backend\venv\Scripts\python.exe" call setup.bat
if errorlevel 1 exit /b 1
if not exist "frontend\node_modules\vite\bin\vite.js" call setup.bat
if errorlevel 1 exit /b 1

echo ========================================================
echo        STARTING AI CHATBOT (FRONTEND + BACKEND)
echo ========================================================
echo.
start "AI Chatbot Backend (Port 8000)" cmd /k "cd /d ""%~dp0backend"" ^&^& ""%~dp0backend\venv\Scripts\python.exe"" main.py"
start "AI Chatbot Frontend (Port 5173)" cmd /k "cd /d ""%~dp0frontend"" ^&^& npm run dev"
echo Frontend : http://localhost:5173
echo Backend  : http://localhost:8000
timeout /t 3 /nobreak >nul
start http://localhost:5173
