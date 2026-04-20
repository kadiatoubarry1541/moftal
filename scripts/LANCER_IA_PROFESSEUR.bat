@echo off
chcp 65001 >nul
title Professeur IA - Les Enfants d'Adam
color 0B

echo.
echo ═══════════════════════════════════════════════════════════
echo   PROFESSEUR IA - Démarrage rapide
echo ═══════════════════════════════════════════════════════════
echo.

cd /d "%~dp0IA SC"

if not exist .env (
    if exist .env.example (
        echo Création de .env depuis .env.example...
        copy .env.example .env >nul
        echo.
        echo ⚠️  Fichier .env créé. Pour des réponses à TOUTES les questions,
        echo    ajoutez votre clé OpenAI dans .env (voir GUIDE_DEMARRAGE_IA.md)
        echo.
    )
)

echo Installation des dépendances si nécessaire...
if exist requirements.txt (
    py -m pip install -q -r requirements.txt 2>nul
) else (
    py -m pip install -q flask flask-cors python-dotenv openai requests 2>nul
)
echo.

echo Lancement du serveur IA sur http://localhost:5000...
echo.
echo ✅ L'IA fonctionne en mode démo (grammaire, conjugaison, salutations...)
echo    Pour des réponses complètes : ajoutez OPENAI_API_KEY dans IA SC\.env
echo.
echo Fermez cette fenêtre pour arrêter le serveur.
echo ═══════════════════════════════════════════════════════════
echo.

py app.py
if errorlevel 1 python app.py
pause
