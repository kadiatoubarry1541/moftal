@echo off
chcp 65001 >nul
title Faire fonctionner l'IA - Les Enfants d'Adam
color 0B
cd /d "%~dp0"

echo.
echo ═══════════════════════════════════════════════════════════
echo   FAIRE FONCTIONNER L'IA - Professeur de Français
echo ═══════════════════════════════════════════════════════════
echo.
echo L'IA fonctionne via le BACKEND (port 5002).
echo Pas besoin de Python - tout est dans le backend Node.js !
echo.

REM 1. Seed des leçons
echo [1/3] Initialisation des leçons du Professeur IA...
cd backend
if not exist "node_modules" call npm install
call npm run seed-ia 2>nul
if errorlevel 1 (
    echo    ⚠️  Seed échoué - vérifiez que PostgreSQL est démarré
    echo       et que la base "enfants_adam_eve" existe.
) else (
    echo    ✅ Leçons chargées
)
cd ..

REM 2. Démarrer backend
echo.
echo [2/3] Démarrage du Backend (contient l'IA)...
start "Backend + IA" cmd /k "cd /d %~dp0backend && npm start"
timeout /t 5 /nobreak >nul

REM 3. Démarrer frontend
echo.
echo [3/3] Démarrage du Frontend...
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ═══════════════════════════════════════════════════════════
echo   ✅ C'EST PRÊT !
echo ═══════════════════════════════════════════════════════════
echo.
echo   Ouvrez: http://localhost:3000
echo   Allez dans Éducation ^> Professeur IA de Français
echo.
echo   Testez avec: "Qu'est-ce que l'alphabet ?" ou "Comment dire bonjour ?"
echo.
pause
