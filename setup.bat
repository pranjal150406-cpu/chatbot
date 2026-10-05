@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
  echo Python launcher ^(py^) was not found. Install Python 3.10 or newer and try again.
  exit /b 1
)
if not exist "backend\venv\Scripts\python.exe" (
  echo Creating backend virtual environment...
  py -3 -m venv backend\venv
  if errorlevel 1 exit /b 1
)
if not exist "backend\.env" (
  copy "backend\.env.example" "backend\.env" >nul
  echo Created backend\.env from the example. Add your Gemini API key before chatting.
)
echo Installing backend requirements...
"backend\venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
if errorlevel 1 exit /b 1
if not exist "frontend\node_modules\vite\bin\vite.js" (
  echo Installing frontend dependencies...
  pushd frontend
  call npm install
  if errorlevel 1 (popd & exit /b 1)
  popd
)
if not exist "node_modules\concurrently\dist\bin\concurrently.js" (
  echo Installing root launcher dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)
echo Setup complete. Confirm GEMINI_API_KEY in backend\.env, then run start.bat.
