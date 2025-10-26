@echo off
echo ============================================================
echo   CRISPR-BERT Full Stack Startup Script
echo ============================================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Please install Python 3.8+
    pause
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found! Please install Node.js
    pause
    exit /b 1
)

echo [1/3] Checking model files...
if not exist "final1\weight\final_model.keras" (
    echo [ERROR] Model not found at final1\weight\final_model.keras
    echo Please train the model first:
    echo    cd final1
    echo    python train_model.py
    pause
    exit /b 1
)
echo [✓] Model file found (final1\weight\final_model.keras)
echo.

echo [2/3] Starting Flask Model API (Port 5001)...
echo --------------------------------------------------------
start "CRISPR Model API" cmd /k "python model_api.py"
timeout /t 5 /nobreak >nul
echo [✓] Flask API started
echo.

echo [3/3] Starting Node.js Backend (Port 5000)...
echo --------------------------------------------------------
start "CRISPR Backend" cmd /k "node server.js"
timeout /t 3 /nobreak >nul
echo [✓] Node.js Backend started
echo.

echo ============================================================
echo   All Services Started!
echo ============================================================
echo.
echo Services running:
echo   Flask Model API:    http://localhost:5001
echo   Node.js Backend:    http://localhost:5000
echo   React Frontend:     cd client ^&^& npm start
echo.
echo To start React frontend, open a new terminal and run:
echo   cd client
echo   npm start
echo.
echo Press any key to open service URLs in browser...
pause >nul

start http://localhost:5001/health
start http://localhost:5000/api/health

echo.
echo Services are running in separate windows.
echo Close those windows to stop the services.
echo.
pause

