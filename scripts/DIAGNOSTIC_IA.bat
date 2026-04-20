@echo off
chcp 65001 >nul
title Diagnostic IA
echo.
echo ═══════════════════════════════════════════════════════════
echo   DIAGNOSTIC - Pourquoi l'IA ne répond pas ?
echo ═══════════════════════════════════════════════════════════
echo.

cd /d "%~dp0IA SC"

echo [1] Test Python...
py -c "print('OK')" 2>nul
if errorlevel 1 (
    echo    ERREUR: Python non trouvé. Utilisez "python" ou installez Python.
) else (
    echo    OK - Python fonctionne
)

echo.
echo [2] Test Flask...
py -c "import flask; print('OK')" 2>nul
if errorlevel 1 (
    echo    ERREUR: Flask non installé.
    echo    Exécutez: py -m pip install flask flask-cors python-dotenv openai requests
) else (
    echo    OK - Flask installé
)

echo.
echo [3] Test port 5000...
netstat -ano | findstr ":5000" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo    ATTENTION: Le port 5000 est DÉJÀ utilisé !
    echo    Fermez l'autre application qui l'utilise, ou l'IA est déjà démarrée.
) else (
    echo    OK - Port 5000 libre
)

echo.
echo [4] Lancement du serveur IA (si erreur, elle s'affichera ci-dessous)...
echo    Appuyez sur Ctrl+C pour arrêter.
echo ═══════════════════════════════════════════════════════════
echo.

py app.py

pause
