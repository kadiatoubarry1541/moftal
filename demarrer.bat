@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title Les Enfants d'Adam - Demarrage

echo.
echo  ==========================================
echo    Les Enfants d'Adam  -  DEMARRAGE
echo  ==========================================
echo.

REM ── 1. Verifier Node.js ──────────────────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo  ERREUR : Node.js n'est pas installe !
    echo  Telechargez-le sur https://nodejs.org
    pause
    exit /b 1
)
echo  [OK] Node.js detecte.

REM ── 2. Arreter TOUS les anciens processus Node ───────────────────────────────
echo  Arret des anciens serveurs...
wmic process where "name='node.exe'" call terminate >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 3 /nobreak >nul
echo  [OK] Pret.
echo.

REM ── 3. Verifier PostgreSQL ────────────────────────────────────────────────────
echo  Verification de PostgreSQL...
pg_isready -h localhost -p 5432 >nul 2>&1
if errorlevel 1 (
    echo.
    echo  *** PostgreSQL n'est pas demarre ! ***
    echo  Ouvrez pgAdmin ou demarrez le service PostgreSQL.
    echo  Appuyez sur une touche quand c'est fait...
    pause
)
echo  [OK] PostgreSQL pret.
echo.

REM ── 4. Demarrer le BACKEND ───────────────────────────────────────────────────
echo  [1/2] Demarrage du BACKEND (port 7777)...
start "BACKEND - Les Enfants d'Adam" cmd /k "title BACKEND ^& cd /d "%~dp0backend" ^& color 0B ^& npm start"
echo.

REM Attendre que le backend reponde (max 60 secondes)
echo  Attente du backend...
set BACKEND_PRET=0
for /L %%i in (1,1,60) do (
    if "!BACKEND_PRET!"=="0" (
        curl -s --max-time 2 http://localhost:7777/api/health >nul 2>&1
        if not errorlevel 1 (
            set BACKEND_PRET=1
        ) else (
            timeout /t 1 /nobreak >nul
        )
    )
)
if "!BACKEND_PRET!"=="1" (
    echo  [OK] Backend pret !
) else (
    echo  ATTENTION : Backend pas repond - verifie la fenetre noire BACKEND
    pause
)
echo.

REM ── 5. Demarrer le FRONTEND ──────────────────────────────────────────────────
echo  [2/2] Demarrage du FRONTEND (port 3000)...
start "FRONTEND - Les Enfants d'Adam" cmd /k "title FRONTEND ^& cd /d "%~dp0frontend" ^& color 0D ^& npm run dev"
echo.

REM Attendre que le frontend reponde (max 60 secondes)
echo  Attente du frontend...
set FRONTEND_PRET=0
for /L %%i in (1,1,60) do (
    if "!FRONTEND_PRET!"=="0" (
        curl -s --max-time 2 http://localhost:3000 >nul 2>&1
        if not errorlevel 1 (
            set FRONTEND_PRET=1
        ) else (
            timeout /t 1 /nobreak >nul
        )
    )
)
if "!FRONTEND_PRET!"=="1" (
    echo  [OK] Frontend pret !
) else (
    echo  ATTENTION : Frontend pas repond - verifie la fenetre noire FRONTEND
    pause
)
echo.

REM ── 6. Ouvrir le navigateur ──────────────────────────────────────────────────
echo  [OK] Ouverture du navigateur...
start "" "http://localhost:3000"

echo.
echo  ==========================================
echo    TOUT EST LANCE  -  Bonne continuation !
echo  ==========================================
echo.
echo  Backend  : http://localhost:7777
echo  Frontend : http://localhost:3000
echo.
echo  Gardez les 2 fenetres noires ouvertes.
echo  Pour tout arreter : fermez les 2 fenetres noires.
echo.
pause
