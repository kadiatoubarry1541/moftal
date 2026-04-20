@echo off
chcp 65001 >nul
title Les Enfants d'Adam - Tout lancer
color 0A
cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║   LANCEMENT COMPLET - Backend + Frontend + IA Professeur     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
timeout /t 2 /nobreak >nul

REM Backend
echo [1/3] Backend...
cd backend
if not exist "node_modules" call npm install
if not exist "config.env" if exist "config.env.example" copy "config.env.example" "config.env" >nul
cd ..
echo    OK

REM Frontend
echo [2/3] Frontend...
cd frontend
if not exist "node_modules" call npm install
cd ..
echo    OK

REM IA
echo [3/3] IA Professeur...
cd "IA SC"
if not exist .env if exist .env.example copy .env.example .env >nul
py -m pip install -q flask flask-cors python-dotenv openai requests psycopg2-binary 2>nul
if errorlevel 1 python -m pip install -q flask flask-cors python-dotenv openai requests psycopg2-binary 2>nul
cd ..
echo    OK

echo.
echo Lancement des 3 serveurs...
echo.

start "Backend" cmd /k "cd /d ""%~dp0backend"" && npm run dev"
timeout /t 4 /nobreak >nul

start "Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"
timeout /t 4 /nobreak >nul

start "IA Professeur" cmd /k "cd /d ""%~dp0IA SC"" && (py app.py 2>nul || python app.py)"
timeout /t 3 /nobreak >nul

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    TOUT EST DEMARRE !                        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo   Backend:  http://localhost:5002
echo   Frontend: http://localhost:3000
echo   IA:       http://localhost:5000
echo.
echo   Ne fermez pas les 3 fenetres ouvertes.
echo.
echo   Ouverture du navigateur dans 15 secondes...
timeout /t 15 /nobreak >nul
start http://localhost:3000
echo.
echo   Le projet est ouvert a 100%% dans le navigateur.
pause
