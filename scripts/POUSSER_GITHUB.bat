@echo off
chcp 65001 >nul
echo ============================================
echo   Pousser tout vers GitHub (origin/main)
echo ============================================
cd /d "%~dp0"

echo.
echo [1/3] Ajout de tous les fichiers...
git add -A

echo.
echo [2/3] Statut actuel :
git status --short
if %errorlevel% neq 0 goto err

echo.
set /p COMMIT_MSG="Message du commit (Entree = garder le dernier message ou 'tout pousser') : "
if "%COMMIT_MSG%"=="" (
  echo Pas de nouveau message - on pousse les commits existants.
  goto push
)

echo.
echo [2b/3] Nouveau commit avec ton message...
git commit -m "%COMMIT_MSG%"
 REM Si rien a commiter, git commit rend 1, c'est normal
goto push

:push
echo.
echo [3/3] Envoi vers GitHub...
git push origin main
if %errorlevel% neq 0 (
  echo.
  echo ERREUR: Le push a echoue. Verifie:
  echo   - Internet / VPN
  echo   - Connexion a GitHub (login + token si HTTPS)
  echo   - Que la branche distante s'appelle bien "main"
  pause
  exit /b 1
)

echo.
echo OK - Tout est pousse sur GitHub.
pause
exit /b 0

:err
echo Erreur pendant git status
pause
exit /b 1
