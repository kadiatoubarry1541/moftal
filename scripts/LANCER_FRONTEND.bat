@echo off
chcp 65001 >nul
title Frontend - Les Enfants d'Adam
color 0B
cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║   LANCEMENT FRONTEND SEUL                                    ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

cd frontend
if not exist "node_modules" (
    echo Installation des dependances...
    call npm install
)
echo.
echo Demarrage du frontend sur http://localhost:5173
echo Le navigateur s'ouvrira dans 10 secondes...
start cmd /c "timeout /t 10 /nobreak >nul && start http://localhost:5173"
call npm run dev
