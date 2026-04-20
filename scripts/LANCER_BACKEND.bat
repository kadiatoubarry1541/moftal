@echo off
chcp 65001 >nul
title Backend - Les Enfants d'Adam
color 0E
cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║   LANCEMENT BACKEND SEUL (Node + IA Professeur)              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Backend Node
echo [1/2] Backend Node.js...
cd backend
if not exist "node_modules" call npm install
if not exist "config.env" if exist "config.env.example" copy "config.env.example" "config.env" >nul
cd ..
echo    OK

REM IA
echo [2/2] IA Professeur...
cd "IA SC"
if not exist .env if exist .env.example copy .env.example .env >nul
py -m pip install -q flask flask-cors python-dotenv openai requests psycopg2-binary 2>nul
cd ..
echo    OK

echo.
echo Lancement Backend (port 5002) et IA (port 5000)...
echo.

start "IA Professeur" cmd /k "cd /d ""%~dp0IA SC"" && (py app.py 2>nul || python app.py)"
timeout /t 3 /nobreak >nul

start "Backend Node" cmd /k "cd /d ""%~dp0backend"" && npm start"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║   BACKEND DEMARRE !                                          ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo   Backend:  http://localhost:5002
echo   IA:       http://localhost:5000
echo.
echo   Ne fermez pas les 2 fenetres ouvertes.
echo.
pause
