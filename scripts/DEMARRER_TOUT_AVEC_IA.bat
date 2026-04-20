@echo off
chcp 65001 >nul
title Les Enfants d'Adam - Démarrage complet avec IA
color 0A

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║   DÉMARRAGE COMPLET - BACKEND + FRONTEND + IA PROFESSEUR     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Ce script va tout installer et démarrer automatiquement.
echo 3 fenêtres vont s'ouvrir. NE LES FERMEZ PAS.
echo.
timeout /t 2 /nobreak >nul

cd /d "%~dp0"

REM === 1. Backend ===
echo [1/4] Backend Node.js...
cd backend
if not exist "node_modules" (
    echo    Installation en cours...
    call npm install
)
if not exist "config.env" if exist "config.env.example" copy "config.env.example" "config.env" >nul
cd ..
echo    OK
echo.

REM === 2. Frontend ===
echo [2/4] Frontend React...
cd frontend
if not exist "node_modules" (
    echo    Installation en cours...
    call npm install
)
cd ..
echo    OK
echo.

REM === 3. IA Professeur - Python ===
echo [3/4] IA Professeur (Python)...
cd "IA SC"
if not exist .env if exist .env.example copy .env.example .env >nul
echo    Installation des dépendances Python...
py -m pip install -q flask flask-cors python-dotenv openai requests psycopg2-binary 2>nul
if errorlevel 1 python -m pip install -q flask flask-cors python-dotenv openai requests psycopg2-binary 2>nul
cd ..
echo    OK
echo.

REM === 4. Préparation ===
echo [4/4] Préparation...
echo    Si des serveurs tournent déjà, fermez leurs fenêtres puis relancez.
timeout /t 2 /nobreak >nul
echo    OK
echo.

REM === DÉMARRAGE ===
echo ═══════════════════════════════════════════════════════════════
echo   LANCEMENT DES 3 SERVEURS...
echo ═══════════════════════════════════════════════════════════════
echo.

start "Backend" cmd /k "cd /d %~dp0backend && npm start"
timeout /t 4 /nobreak >nul

start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 4 /nobreak >nul

start "IA Professeur" cmd /k "cd /d %~dp0IA SC && py app.py"
timeout /t 3 /nobreak >nul

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    ✅ TOUT EST DÉMARRÉ !                     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo   • Backend:  http://localhost:5002
echo   • Frontend: http://localhost:5173  (ouvrez cette page)
echo   • IA:       http://localhost:5000
echo.
echo   Allez sur: Education ^> Professeur IA pour discuter
echo.
echo   NE FERMEZ PAS les 3 fenêtres noires qui se sont ouvertes !
echo.
timeout /t 5 /nobreak >nul
start http://localhost:5173
echo.
pause
