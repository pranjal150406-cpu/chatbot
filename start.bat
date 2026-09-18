@echo off
title AI Chatbot Launcher
echo ========================================================
echo        STARTING AI CHATBOT (FRONTEND + BACKEND)
echo ========================================================
echo.

echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "AI Chatbot Backend (Port 8000)" cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\python.exe main.py"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Vite Frontend on http://localhost:5173 ...
start "AI Chatbot Frontend (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================================
echo Both servers are starting up!
echo  - Frontend UI : http://localhost:5173
echo  - Backend API : http://localhost:8000
echo ========================================================
echo Keep the opened command windows running while chatting.
echo.
timeout /t 3 /nobreak >nul
start http://localhost:5173
