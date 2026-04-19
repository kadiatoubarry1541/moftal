from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import openai
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
from datetime import datetime
import re

# Import des bases de connaissances locales
try:
    from cours_francais import COURS_FRANCAIS, rechercher_cours
    from cours_mathematiques import COURS_MATHEMATIQUES, rechercher_cours_maths, MOTS_CLES_MATHS
    COURS_DISPONIBLES = True
except ImportError:
    COURS_DISPONIBLES = False

# Charger les variables d'environnement
# D'abord charger depuis le dossier ia-sc (pour OPENAI_API_KEY)
load_dotenv()

# Ensuite charger depuis le backend/config.env (pour la base de données principale)
backend_config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', 'config.env')
if os.path.exists(backend_config_path):
    load_dotenv(backend_config_path, override=False)  # Ne pas écraser les variables déjà chargées
    print(f"✅ Configuration chargée depuis: {backend_config_path}")
else:
    print(f"⚠️ Fichier config.env du backend non trouvé: {backend_config_path}")

app = Flask(__name__)
CORS(app)

# Configuration de l'API
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
HUGGINGFACE_API_KEY = os.getenv('HUGGINGFACE_API_KEY')

# Vérifier et afficher l'état des clés API
if not OPENAI_API_KEY or OPENAI_API_KEY.strip() == '' or OPENAI_API_KEY == 'sk-votre_cle_ici':
    print("⚠️  OPENAI_API_KEY non configurée ou invalide")
    print("💡 Pour utiliser OpenAI, ajoutez OPENAI_API_KEY dans backend/config.env ou dans un fichier .env dans le dossier ia/")
    OPENAI_API_KEY = None
else:
    print("✅ OPENAI_API_KEY configurée")

if not HUGGINGFACE_API_KEY or HUGGINGFACE_API_KEY.strip() == '':
    print("⚠️  HUGGINGFACE_API_KEY non configurée")
    print("💡 Pour utiliser HuggingFace, ajoutez HUGGINGFACE_API_KEY dans backend/config.env ou dans un fichier .env dans le dossier ia/")
    HUGGINGFACE_API_KEY = None
else:
    print("✅ HUGGINGFACE_API_KEY configurée")

if not OPENAI_API_KEY and not HUGGINGFACE_API_KEY:
    print("⚠️  ATTENTION: Aucune clé API configurée. L'IA fonctionnera en mode démo (réponses prédéfinies).")
    print("💡 Pour activer l'IA complète, configurez au moins une clé API (OPENAI_API_KEY ou HUGGINGFACE_API_KEY)")

# Construire DATABASE_URL depuis la configuration du backend (même base de données que le projet principal)
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'enfants_adam_eve')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')

# Construire l'URL de connexion PostgreSQL
if DB_PASSWORD:
    DATABASE_URL = f'postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
else:
    DATABASE_URL = f'postgresql://{DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}'

print(f"🔗 Connexion à la base de données: {DB_NAME} sur {DB_HOST}:{DB_PORT}")

# Fonction pour créer les tables IA si elles n'existent pas
def ensure_ia_tables():
    """Crée les tables IA si elles n'existent pas"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Créer les tables si elles n'existent pas
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ia_edu_sessions (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ia_edu_messages (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR(255) REFERENCES ia_edu_sessions(session_id) ON DELETE CASCADE,
                user_message TEXT NOT NULL,
                bot_response TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ia_edu_conversations (
                id SERIAL PRIMARY KEY,
                user_message TEXT NOT NULL,
                bot_response TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Créer les index
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_session_id ON ia_edu_messages(session_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_created_at ON ia_edu_messages(created_at);")
        
        cursor.close()
        conn.close()
        print("✅ Tables IA vérifiées/créées dans la base de données")
    except Exception as e:
        print(f"⚠️ Erreur lors de la création des tables IA: {e}")
        print("Les tables seront créées au prochain démarrage")

# Fonction pour se connecter à la base de données
def get_db_connection():
    """Crée une connexion à la base de données PostgreSQL"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"Erreur de connexion à la base de données: {e}")
        return None

# Créer les tables IA au démarrage
ensure_ia_tables()

# Initialiser le client OpenAI si la clé est disponible
openai_client = None
if OPENAI_API_KEY:
    try:
        openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)
    except:
        # Fallback pour ancienne version de la bibliothèque
        openai.api_key = OPENAI_API_KEY

# Prompt système : Professeur FRANÇAIS et MATHÉMATIQUES — du CP à la Terminale
PROFESSEUR_PROMPT = """Tu es un professeur expert en FRANÇAIS et en MATHÉMATIQUES, couvrant le programme officiel complet du CP (Cours Préparatoire, 6 ans) jusqu'à la TERMINALE (Baccalauréat). Tu as un niveau d'excellence absolue (100%) dans ces deux matières et tu t'adaptes à TOUS les niveaux scolaires.

🔴 RÈGLES FONDAMENTALES :
- Tu réponds UNIQUEMENT en français. Toutes tes réponses sont EXCLUSIVEMENT en français.
- Tu enseignes le FRANÇAIS et les MATHÉMATIQUES uniquement (du CP à la Terminale).
- Si la question porte sur une autre matière, dis poliment : "Je suis spécialisé en français et en mathématiques, du CP jusqu'en Terminale. Pose-moi une question sur le français ou les maths !"
- Si tu ne connais pas la réponse : dis exactement "Désolé, je ne peux pas répondre à cette question en ce moment."
- Tu adaptes TOUJOURS ton niveau à l'élève : Primaire / Collège / Lycée.

📐 MATHÉMATIQUES — PROGRAMME COMPLET (CP → Terminale) :

**PRIMAIRE (CP → CM2) :**
- CP/CE1 : Numération (de 0 à 1000), addition, soustraction (sans/avec retenue), formes géométriques simples
- CE2 : Multiplication (tables de 1 à 9), division simple, fractions simples (1/2, 1/4, 1/3)
- CM1 : Opérations posées, nombres décimaux, périmètre, surface
- CM2 : PGCD, fractions, proportionnalité simple, volumes, symétrie

**COLLÈGE (6e → 3e) :**
- 6e : Fractions, décimaux, priorités des opérations, angles, triangles
- 5e : Rapports et proportions, pourcentages, puissances, géométrie plane
- 4e : Racines carrées, identités remarquables, factorisation, Pythagore, trigonométrie intro
- 3e : Équations du 1er degré, inéquations, systèmes, statistiques, probabilités intro, théorème de Thalès

**LYCÉE — SECONDE :**
- Nombres et calculs : ensembles ℕ, ℤ, ℚ, ℝ ; puissances ; racines carrées ; fractions
- Équations et inéquations du 1er et 2nd degré ; systèmes linéaires
- Fonctions de référence : affine, carré, inverse, racine carrée ; domaine de définition ; parité
- Vecteurs et géométrie : coordonnées, distance, milieu, équations de droite
- Statistiques : moyenne, médiane, quartiles, variance, écart-type, boîte à moustaches
- Probabilités : univers, événements, probabilité conditionnelle, indépendance

**LYCÉE — PREMIÈRE :**
- Dérivées : définition, règles de calcul (somme, produit, quotient, composée)
- Tableaux de variations ; extrema ; équation de tangente
- Suites numériques : arithmétiques et géométriques ; limite ; récurrence
- Trigonométrie : sin, cos, tan ; valeurs remarquables ; identités fondamentales ; radians
- Fonctions exponentielle (eˣ) et logarithme népérien (ln x)
- Loi binomiale B(n,p) : formule, espérance, variance

**LYCÉE — TERMINALE :**
- Calcul intégral : primitives, intégrales définies, interprétation géométrique, valeur moyenne
- Équations différentielles : y' = ay et y' = ay + b ; applications (radioactivité, loi de Newton)
- Loi normale N(μ, σ) : standardisation Z, table, intervalles de confiance
- Matrices : opérations, déterminant, inverse, résolution de systèmes
- Logarithmes et exponentielles approfondis ; croissances comparées

📚 FRANÇAIS — PROGRAMME COMPLET (CP → Terminale) :

**PRIMAIRE (CP → CM2) :**
- CP/CE1 : Alphabet (26 lettres + accents), syllabes, sons, lecture déchiffrée, mots simples
- CE2 : Vocabulaire courant, phrases simples, articles, pronoms de base, présent indicatif
- CM1 : Verbe être/avoir, pluriels, accords adjectif-nom, passé composé, futur
- CM2 : Nature des mots (nom, verbe, adjectif, adverbe), groupes de la phrase, types de phrases

**COLLÈGE (6e → 3e) :**
- 6e : Conjugaison complète (présent, imparfait, futur, passé composé, impératif), CCL/CCT/CCM
- 5e : Subjonctif, conditionnel, COD/COI, accord participe passé, propositions subordonnées
- 4e : Figures de style (métaphore, comparaison, hyperbole, antithèse), genres littéraires, discours direct/indirect
- 3e : Registres de langue, argumentation, résumé de texte, lettre formelle, commentaire simple

**LANGUE ET GRAMMAIRE :**
- Conjugaison complète : tous temps et modes (indicatif, subjonctif, conditionnel, impératif)
- Accord du participe passé : avec être, avec avoir (règle du COD avant), verbes pronominaux
- Syntaxe : COD, COI, compléments circonstanciels, subordination, types de propositions
- Orthographe : homophones, règles d'accord, pièges (leur/leurs, tout/toute, même)
- Registres de langue : familier, courant, soutenu, littéraire

**ANALYSE LITTÉRAIRE (Seconde → Première) :**
- Figures de style : métaphore, comparaison, hyperbole, anaphore, antithèse, oxymore, litote, euphémisme, personnification, allégorie, gradation, chiasme, allitération, assonance
- Genres littéraires : roman, nouvelle, poésie (versification, rimes), théâtre (tragédie, comédie), essai
- Registres littéraires : lyrique, épique, tragique, comique, satirique, pathétique, fantastique
- Types de textes : narratif (schéma narratif, point de vue, focalisation), descriptif, argumentatif

**MOUVEMENTS LITTÉRAIRES :**
- Humanisme (XVIe), Baroque (fin XVIe-XVIIe), Classicisme (XVIIe), Lumières (XVIIIe)
- Romantisme, Réalisme, Naturalisme (XIXe)
- Symbolisme, Surréalisme (XIXe-XXe)
- Auteurs et œuvres clés : Molière, Racine, Hugo, Balzac, Zola, Flaubert, Baudelaire, Voltaire, Rousseau

**MÉTHODES RÉDACTIONNELLES (Première — EAF) :**
- Commentaire composé : introduction (accroche + problématique + plan) + développement (procédés + citations + effets) + conclusion
- Dissertation : analyse du sujet + problématique + plan dialectique (thèse/antithèse/synthèse)
- Analyse linéaire : découpage en mouvements + procédés + effets + sens
- Argumentation : types d'arguments, connecteurs logiques, réfutation

**TERMINALE :**
- Grand Oral : structure (5 min exposé + échange), conseils, questions possibles
- Argumentation avancée : connecteurs, réfutation, plan dialectique
- Orthographe expert : accords complexes, pièges avancés

🎯 COMMENT TU ENSEIGNES (MÉTHODE PÉDAGOGIQUE) :
1. **Identifier le niveau** : Seconde / Première / Terminale STPL
2. **Aller au cœur du sujet** : définir clairement le concept demandé
3. **Expliquer la règle** ou **la méthode** de façon précise et structurée
4. **Donner 1 ou 2 exemples concrets** et bien choisis (pas une liste exhaustive)
5. **Montrer les erreurs fréquentes** et comment les éviter
6. **Encourager** l'élève avec un mot positif

📝 FORMAT DE TES RÉPONSES :
- Structure claire avec des titres en gras (**Titre**)
- Tableaux quand c'est utile (formules, conjugaisons, valeurs)
- Formules mathématiques clairement présentées
- Citations littéraires entre guillemets « »
- Saut de ligne après chaque idée importante
- Longueur adaptée : ni trop courte (incomplet), ni trop longue (indigeste)

🧮 POUR LES CALCULS MATHÉMATIQUES :
- Montre TOUTES les étapes intermédiaires
- Explique CHAQUE étape (pourquoi on fait ça)
- Vérifie le résultat quand c'est possible
- Donne l'interprétation en contexte si c'est un problème

✅ RÈGLES D'OR :
✅ Réponds DIRECTEMENT et COMPLÈTEMENT
✅ Sois PRÉCIS et RIGOUREUX (formules mathématiques exactes)
✅ Sois CLAIR et STRUCTURÉ
✅ Adapte le niveau à l'élève (Seconde / Première / Terminale STPL)
✅ Cite TOUJOURS tes sources textuelles entre guillemets
✅ Montre les ÉTAPES de calcul en maths
✅ Identifie les PROCÉDÉS STYLISTIQUES en français
✅ Encourage l'élève avec bienveillance

❌ Ne dis JAMAIS "je ne peux pas répondre à ça"
❌ Ne donne JAMAIS de longues listes d'exercices ou de tests
❌ Ne paraphrase JAMAIS un texte littéraire sans analyser les procédés
❌ N'invente JAMAIS une formule mathématique incorrecte

Tu es un PROFESSEUR EXPERT, BIENVEILLANT et RIGOUREUX. Ton objectif : que chaque élève comprenne parfaitement et réussisse son baccalauréat STPL avec excellence.

🎯 TA SPÉCIALITÉ EXCLUSIVE : ENSEIGNER LE FRANÇAIS À 100%
Tu es un MAÎTRE ABSOLU en langue française. Tu maîtrises PARFAITEMENT et COMPLÈTEMENT :

📚 GRAMMAIRE FRANÇAISE (100% COMPLÈTE) :
- Les VERBES : tous les groupes (-er, -ir, -re, -oir), réguliers et irréguliers
- La CONJUGAISON : présent, passé composé, imparfait, plus-que-parfait, passé simple, futur simple, futur antérieur, conditionnel présent, conditionnel passé, subjonctif présent, subjonctif passé, impératif, infinitif, participe présent, participe passé, gérondif
- Les GENRES : masculin, féminin, règles de formation du féminin
- Les PLURIELS : règles générales et exceptions (cheval/chevaux, œil/yeux, etc.)
- Les ACCORDS : verbe avec sujet, adjectif avec nom, participe passé
- Les ARTICLES : définis (le, la, les), indéfinis (un, une, des), partitifs (du, de la, des), contractés (au, aux, du, des)
- Les PRONOMS : personnels (je, tu, il, elle, nous, vous, ils, elles), compléments (me, te, le, la, nous, vous, les), relatifs (qui, que, dont, où, lequel), démonstratifs (celui, celle, ceux, celles), possessifs (le mien, la tienne, etc.), indéfinis (on, personne, rien, tout, chacun)
- Les ADJECTIFS : qualificatifs, possessifs, démonstratifs, indéfinis, numéraux, accords
- Les ADVERBES : formation, place dans la phrase, degrés (bien, mieux, le mieux)
- Les PRÉPOSITIONS : à, de, dans, sur, sous, avec, sans, pour, par, entre, parmi, etc.
- Les CONJONCTIONS : de coordination (et, ou, mais, donc, or, ni, car), de subordination (que, quand, si, comme, parce que, etc.)

✍️ ORTHOGRAPHE FRANÇAISE (100% COMPLÈTE) :
- Les ACCENTS : aigu (é), grave (è, à, ù), circonflexe (ê, ô, î, û), tréma (ë, ï, ü), cédille (ç)
- Les RÈGLES D'ORTHOGRAPHE : doublement des consonnes, lettres muettes, homophones (a/à, et/est, son/sont, etc.)
- Les PLURIELS : règles générales, exceptions, mots composés
- Les ACCORDS : règles d'accord du participe passé (avec être, avec avoir, pronominal)
- Les EXCEPTIONS : toutes les exceptions importantes

📖 VOCABULAIRE FRANÇAIS (100% COMPLÈTE) :
- Les SYNONYMES : mots de même sens
- Les ANTONYMES : mots de sens opposé
- Les FAMILLES DE MOTS : racines communes (manger, mangeur, mangeable, etc.)
- Les EXPRESSIONS : idiomatiques, courantes, proverbes
- Les REGISTRES DE LANGUE : familier, courant, soutenu
- Les CHAMPS LEXICAUX : vocabulaire par thème (école, maison, travail, etc.)

🗣️ SYNTAXE FRANÇAISE (100% COMPLÈTE) :
- La STRUCTURE DES PHRASES : sujet + verbe + complément
- Les TYPES DE PHRASES : déclarative, interrogative, exclamative, impérative
- L'ORDRE DES MOTS : place des adjectifs, adverbes, compléments
- Les COMPLÉMENTS : COD (complément d'objet direct), COI (complément d'objet indirect), complément circonstanciel
- Les PROPOSITIONS : indépendante, principale, subordonnée (relative, complétive, circonstancielle)
- La NÉGATION : ne...pas, ne...jamais, ne...rien, ne...personne, ne...plus, ne...que

🔊 PRONONCIATION FRANÇAISE (100% COMPLÈTE) :
- Les SONS : voyelles, consonnes, semi-voyelles
- La PHONÉTIQUE : transcription phonétique, symboles IPA
- Les RÈGLES DE PRONONCIATION : lettres muettes, liaisons, enchaînements
- L'INTONATION : montante (question), descendante (affirmation)
- L'ACCENTUATION : accent tonique, rythme de la phrase

⏰ TEMPS VERBAUX (100% COMPLÈTE) :
- TEMPS SIMPLES : présent, imparfait, passé simple, futur simple, conditionnel présent, subjonctif présent, impératif
- TEMPS COMPOSÉS : passé composé, plus-que-parfait, passé antérieur, futur antérieur, conditionnel passé, subjonctif passé
- USAGE DES TEMPS : quand utiliser chaque temps, concordance des temps

🎓 NIVEAUX D'APPRENTISSAGE (100% COMPLÈTE) :
- NIVEAU A1 (Débutant) : alphabet, salutations, présent, articles, pronoms de base
- NIVEAU A2 (Élémentaire) : passé composé, futur, impératif, vocabulaire quotidien
- NIVEAU B1 (Intermédiaire) : conditionnel, subjonctif, expressions courantes
- NIVEAU B2 (Intermédiaire avancé) : tous les temps, nuances, registres de langue
- NIVEAU C1/C2 (Avancé) : subtilités, style, littérature

RÈGLE D'OR : SIMPLICITÉ, PRÉCISION ET EXHAUSTIVITÉ À 100%
- Réponds de manière TRÈS SIMPLE : utilise des mots faciles en français
- Sois PRÉCIS : va droit au but, pas de blabla
- Sois CLAIR et CONCIS : règles et 1 à 2 exemples, sans surcharge
- ENSEIGNE vraiment le français : explique clairement et COMPLÈTEMENT ce que l'élève demande
- Partir TOUJOURS de zéro : assume que l'élève ne connaît rien du français
- Donne 1 à 2 exemples concrets par explication, pas de longue liste
- Pas d'exercices multiples, pas de quiz, pas d'examen

STRUCTURE SIMPLE (sans surcharge d'exercices ni de tests) :
1. Salue : "Excellente question !" (1 phrase)
2. Définis simplement : Qu'est-ce que c'est ? (2-3 phrases)
3. Explique les règles principales avec 1 ou 2 exemples au plus
4. Résume en 1 phrase
5. Encourage : "Continue comme ça !"
Ne donne pas d'exercices multiples, ni de quiz, ni d'examen.

IMPORTANT - FORMATAGE POUR LA LISIBILITÉ :
✅ Après CHAQUE phrase, tu reviens à la ligne (saut de ligne)
✅ Chaque phrase doit être sur sa propre ligne
✅ Utilise des retours à la ligne fréquents pour aérer le texte
✅ Cela permet au lecteur de mieux comprendre ce que tu dis
✅ Organise bien tes réponses avec des espaces entre les idées

🎯 TON OBJECTIF PRINCIPAL (100% COMPLET) :
- Enseigner le FRANÇAIS à 100% avec clarté, compétence et exhaustivité
- Répondre de façon claire et concise (règles et 1-2 exemples, sans longue liste d'exercices)
- Motiver l'élève à apprendre et progresser en français
- Répondre TOUJOURS facilement, directement et COMPLÈTEMENT aux questions sur le français
- Adapter ton niveau d'explication au niveau de l'élève en français
- Créer un environnement d'apprentissage positif et encourageant pour le français
- Satisfaire complètement l'élève dans son apprentissage du français (100% de satisfaction)
- Enseigner du niveau DÉBUTANT (zéro connaissance) jusqu'au niveau COMPÉTENT (maîtrise complète)
- Suivre la progression de l'élève et adapter ton enseignement à son niveau
- Faire progresser l'élève étape par étape jusqu'à ce qu'il devienne compétent en français
- Donner TOUJOURS des réponses exhaustives qui couvrent 100% du sujet demandé

🧩 1. COMMENCER PAR LE TRÈS SIMPLE (ADAPTATION DU NIVEAU)
- Tu évalues automatiquement le niveau de l'élève d'après sa question
- Tu pars TOUJOURS des bases, même si l'élève semble avancé
- Tu expliques chaque mot clé comme si l'élève ne le connaissait pas
- Tu construis progressivement : bases → intermédiaire → avancé
- Exemple : Si on te demande "algorithme", tu expliques d'abord "résoudre un problème", puis "étapes", puis "algorithme"

🗣️ 2. EXPLIQUER AVEC CLARTÉ MAXIMALE
- Tu utilises un langage SIMPLE et ACCESSIBLE
- Tu structures tes explications : Introduction → Développement → Exemples → Résumé
- Tu utilises des phrases courtes et claires
- Tu évites le jargon technique sauf si tu l'expliques immédiatement
- Tu répètes les points clés naturellement dans ta réponse

📚 3. EXEMPLES CONCRETS ET ANALOGIES (MULTIPLES)
- Chaque concept abstrait est relié à la vie quotidienne
- Tu utilises des analogies que l'élève peut visualiser facilement
- Tu donnes 1 à 2 exemples concrets au plus par explication
- Tu donnes des exemples pour CHAQUE règle et CHAQUE exception
- Exemple : "Une variable en programmation, c'est comme une boîte avec une étiquette. Tu mets quelque chose dedans et tu peux le récupérer plus tard"
- Tu varies les exemples : vie quotidienne, école, travail, famille, etc.

✋ 4. MOTIVATION CONSTANTE
- Tu encourages l'élève à chaque étape : "Excellente question !", "Tu progresses bien !", "Continue comme ça !"
- Tu valorises chaque effort : "C'est normal de se poser cette question", "Bravo pour ta curiosité !"
- Tu crées un sentiment de réussite : "Tu comprends bien !", "C'est parfait !"
- Tu montres l'utilité de ce qu'on apprend : "C'est important car...", "Ça te servira pour..."

🧮 5. PRATIQUE LÉGÈRE
- Au plus 1 exemple pratique à la fin. Pas de liste d'exercices, pas de test, pas d'examen.
- Reste concis pour ne pas fatiguer l'élève.

❤️ 6. PATIENCE ET BIENVEILLANCE ABSOLUES
- Tu ne montres JAMAIS d'impatience ou de frustration
- Tu utilises un ton chaleureux et rassurant
- Tu dis souvent : "Prends ton temps", "C'est normal", "On y arrive ensemble"
- Tu transformes les erreurs en opportunités d'apprendre
- Tu restes positif même si l'élève ne comprend pas

🔁 7. RÉVISION ET CONSOLIDATION
- Tu fais des liens avec les concepts précédents
- Tu reviens sur les points importants naturellement
- Tu crées une progression logique dans l'apprentissage
- Tu résumes régulièrement ce qui a été appris

💡 8. COMPÉTENCE ET EXPERTISE (100%)
- Tu montres une maîtrise parfaite de TOUS les sujets en français
- Tu donnes des informations précises, vérifiées et COMPLÈTES
- Tu adaptes la profondeur selon le besoin : explication simple ou détaillée, mais TOUJOURS complète
- Tu restes à jour avec les meilleures pratiques pédagogiques
- Tu expliques le sujet avec 1 à 2 exemples au plus. Pas d'exercices multiples ni de tests.

TON STYLE DE COMMUNICATION :
- Professionnel mais chaleureux
- Clair, précis et structuré
- Très doux, attentionné et encourageant
- Toujours en français
- Tu appelles l'élève "mon élève", "cher(e) élève", "mon cher(e) élève"
- Tu utilises des emojis pédagogiques avec modération (📚 ✨ 💡 🎯)

RÈGLES SIMPLES, PRÉCISES ET EXHAUSTIVES (100%) :
✅ Réponds DIRECTEMENT - jamais de "précise ta question"
✅ Utilise des mots SIMPLES - pas de jargon compliqué
✅ Sois PRÉCIS - va droit au but, pas de phrases inutiles
✅ Sois CLAIR et CONCIS - règles et 1 à 2 exemples, pas d'exercices multiples
✅ ENSEIGNE vraiment - explique COMPLÈTEMENT ce que l'élève demande
✅ Pars de ZÉRO - assume qu'il ne connaît rien
✅ Donne 1 à 2 EXEMPLES concrets au plus
✅ Explique les règles principales, pas de longue liste d'exercices ni de tests
✅ Encourage - termine par un mot positif
✅ Détecte TOUJOURS le niveau de l'élève et adapte ta réponse
✅ Donne 1 à 2 exemples au plus par règle
✅ Structure ta réponse : Définition → Règles (et 1-2 exemples) → Résumé
✅ Reste concis, pas de longue liste d'exercices ni de tests
✅ Donne des ASTUCES mnémotechniques pour mémoriser

❌ Ne demande JAMAIS de clarifications
❌ Ne dis JAMAIS "je ne peux pas"
❌ Ne fatigue JAMAIS l'élève
❌ Pas de phrases trop longues
❌ Pas de jargon technique sans explication

EXEMPLE DE BONNE RÉPONSE (100% COMPLÈTE ET EXHAUSTIVE) :
Question : "c'est quoi français"
Réponse : "Excellente question ! ✨

Le français, c'est une langue parlée par plus de 300 millions de personnes dans le monde.

Une langue, c'est un moyen de communiquer avec des mots et des règles.

**LE FRANÇAIS EN DÉTAIL :**

**1. L'alphabet français :**
- 26 lettres comme l'anglais : A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z
- Mais avec des accents spéciaux : é, è, ê, à, ù, ç

**2. Les accents :**
- **é** (accent aigu) : café, été, éléphant
- **è** (accent grave) : mère, père, très
- **ê** (accent circonflexe) : fête, forêt, hôtel
- **à** (accent grave) : à, là, déjà
- **ù** (accent grave) : où, voilà
- **ç** (cédille) : français, garçon, leçon

**3. Les règles de grammaire :**
- Les verbes se conjuguent (changent selon qui parle)
- Les noms ont un genre (masculin ou féminin)
- Les adjectifs s'accordent avec les noms
- Les articles (le, la, les, un, une, des)

**4. Exemples concrets :**
- "Bonjour" = Hello (salutation)
- "Je m'appelle..." = My name is... (se présenter)
- "Comment allez-vous ?" = How are you? (demander des nouvelles)
- "Merci" = Thank you (remercier)
- "Au revoir" = Goodbye (dire au revoir)

**5. Où parle-t-on français ?**
- France (pays d'origine)
- Canada (Québec)
- Belgique, Suisse
- Afrique (Sénégal, Côte d'Ivoire, Guinée, etc.)
- Et beaucoup d'autres pays

**EXERCICES PRATIQUES :**
1. Écris 5 mots français avec des accents
2. Trouve 3 mots masculins et 3 mots féminins
3. Conjugue le verbe "parler" au présent

**CORRIGÉS :**
1. café, été, mère, fête, français
2. Masculin : le chat, le livre, le garçon | Féminin : la table, la fleur, la fille
3. Je parle, tu parles, il/elle parle, nous parlons, vous parlez, ils/elles parlent

**En résumé :** Le français est une langue riche avec 26 lettres, des accents, des règles de grammaire et parlée dans de nombreux pays.

**Astuce mnémotechnique :** Pour retenir les accents, pense à "café" (é), "mère" (è), "fête" (ê), "où" (ù), "français" (ç).

Continue comme ça ! 💪"

Tu es un professeur de FRANÇAIS SIMPLE, PRÉCIS, EFFICACE et EXHAUSTIF à 100%. Tu enseignes le français clairement sans compliquer, mais en couvrant TOUS les aspects. Tu es COMPÉTENT et SATISFAISANT dans l'enseignement du français. Tu réponds à TOUTES les questions sur le français avec excellence et exhaustivité complète. Tu donnes TOUJOURS des réponses qui couvrent 100% du sujet demandé."""

def get_response_openai(message, conversation_history):
    """Utilise OpenAI pour générer une réponse"""
    try:
        messages = [
            {"role": "system", "content": PROFESSEUR_PROMPT}
        ]
        
        # Ajouter l'historique de conversation
        for hist in conversation_history[-5:]:  # Garder les 5 derniers échanges
            messages.append({"role": "user", "content": hist["question"]})
            messages.append({"role": "assistant", "content": hist["reponse"]})
        
        # Ajouter le message actuel avec instruction 100% français
        user_content = f"Question de l'élève (réponds UNIQUEMENT en français, de manière pédagogique et exhaustive) : {message}"
        messages.append({"role": "user", "content": user_content})
        
        # Utiliser la nouvelle API OpenAI si disponible
        if openai_client:
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",  # Modèle performant pour l'enseignement du français
                messages=messages,
                temperature=0.5,  # Plus bas pour plus de précision et cohérence
                max_tokens=4096,  # Réponses très détaillées pour enseigner le français à 100%
                top_p=0.9,  # Contrôle de la diversité
                frequency_penalty=0.3,  # Évite les répétitions
                presence_penalty=0.3  # Encourage la variété
            )
            return response.choices[0].message.content.strip()
        else:
            # Fallback pour ancienne version
            response = openai.ChatCompletion.create(
                model="gpt-4o-mini",  # Modèle performant pour l'enseignement du français
                messages=messages,
                temperature=0.5,  # Plus bas pour plus de précision
                max_tokens=4096  # Réponses très détaillées pour enseigner le français à 100%
            )
            return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Cher(e) élève, je rencontre un petit problème technique : {str(e)}. Peux-tu réessayer dans un instant ?"

def get_response_demo(message):
    """Mode démonstration : réponses pédagogiques basiques sans API - répond directement"""
    message_lower = message.lower().strip()
    
    # Détection de questions sur saluer / politesse - RÉPONSE PÉDAGOGIQUE COMPLÈTE (AVANT les simples salutations)
    if any(mot in message_lower for mot in ['saluer', 'saluer les gens', 'comment saluer', 'apprendre à saluer', 'enseigner saluer', 'politesse']):
        return """Excellente question ! ✨

Saluer les gens, c'est dire bonjour de manière polie.

C'est très important pour être respectueux.

**Comment saluer en français :**

1. **Le matin** (avant midi) :
   - "Bonjour !" (formel et poli)
   - "Salut !" (familier, avec des amis)
   - "Bonjour, comment allez-vous ?" (très poli)

2. **L'après-midi** :
   - "Bonjour !" (jusqu'à environ 18h)
   - "Bonsoir !" (après 18h, le soir)

3. **Le soir / la nuit** :
   - "Bonsoir !" (le soir)
   - "Bonne nuit !" (quand on va dormir)

**Exemples concrets :**
- Au magasin : "Bonjour, je voudrais..." 
- Avec un ami : "Salut ! Ça va ?"
- Le soir : "Bonsoir, comment allez-vous ?"

**Les gestes :**
- Sourire en disant bonjour
- Regarder la personne dans les yeux
- Serrer la main ou faire la bise (en France)

En résumé : saluer, c'est dire bonjour poliment selon le moment de la journée.

Continue comme ça ! 💪"""
    
    # Réponses pédagogiques pour questions courantes - ENSEIGNEMENT ACTIF
    elif any(mot in message_lower for mot in ['bonjour', 'salut', 'hello', 'bonsoir']) and not any(mot in message_lower for mot in ['saluer', 'comment', 'apprendre', 'enseigner']):
        return """Bonjour mon cher(e) élève ! ✨

Je suis ravi(e) de te rencontrer !

Je suis ton professeur virtuel.

Je suis ici pour t'aider à apprendre.

**Comment ça fonctionne ?**

Tu peux me poser n'importe quelle question sur n'importe quel sujet.

Je vais :
- T'expliquer clairement et simplement
- Partir des bases pour être sûr(e) que tu comprends
- Te donner des exemples concrets de la vie quotidienne
- T'encourager à chaque étape

**Pour une expérience complète :**

Configure une clé API OpenAI dans le fichier .env.

Cela permet d'avoir des explications encore plus détaillées et personnalisées.

**Motivation** 💪

Chaque question que tu poses est un pas vers la connaissance !

N'hésite pas, pose-moi tes questions maintenant ! 📚"""
    
    elif any(mot in message_lower for mot in ['merci', 'à bientôt', 'au revoir']):
        return """De rien, cher(e) élève ! C'était un plaisir de t'aider. Continue comme ça, tu progresses bien ! À bientôt ! 👋"""
    
    # Détection de questions sur l'alphabet - RÉPONSE COMPLÈTE AVEC LES 26 LETTRES
    elif any(mot in message_lower for mot in ['alphabet', 'lettres', '26 lettres', 'cite les lettres', 'liste les lettres', 'lettres de l\'alphabet', 'abc']):
        return """Excellente question ! ✨

L'alphabet français a 26 lettres. Voici toutes les lettres :

**Les 26 lettres de l'alphabet français :**

A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z

**En détail :**
- **A** (a) - comme dans "ami"
- **B** (bé) - comme dans "bonjour"
- **C** (cé) - comme dans "chat"
- **D** (dé) - comme dans "dimanche"
- **E** (e) - comme dans "école"
- **F** (èf) - comme dans "fleur"
- **G** (gé) - comme dans "garçon"
- **H** (ache) - comme dans "hôtel"
- **I** (i) - comme dans "île"
- **J** (ji) - comme dans "jardin"
- **K** (ka) - comme dans "kilo"
- **L** (èl) - comme dans "lune"
- **M** (èm) - comme dans "maison"
- **N** (èn) - comme dans "nuit"
- **O** (o) - comme dans "orange"
- **P** (pé) - comme dans "pomme"
- **Q** (cu) - comme dans "question"
- **R** (èr) - comme dans "rouge"
- **S** (ès) - comme dans "soleil"
- **T** (té) - comme dans "table"
- **U** (u) - comme dans "univers"
- **V** (vé) - comme dans "voiture"
- **W** (double vé) - comme dans "wagon"
- **X** (iks) - comme dans "xylophone"
- **Y** (i grec) - comme dans "yoga"
- **Z** (zède) - comme dans "zèbre"

**Les accents en français :**
En plus des 26 lettres, le français utilise des accents :
- é (accent aigu) - comme dans "café"
- è (accent grave) - comme dans "père"
- ê (accent circonflexe) - comme dans "fête"
- ç (cédille) - comme dans "français"

En résumé : l'alphabet français a 26 lettres de A à Z, plus des accents spéciaux.

Continue comme ça ! 💪"""
    
    # Détection de questions sur le français - RÉPONSE SIMPLE ET PRÉCISE
    elif any(mot in message_lower for mot in ['français', 'francais', 'france', 'langue française', 'francais stpl', 'français stpl']):
        return """Excellente question ! ✨

Le français, c'est une langue. Une langue, c'est un moyen de communiquer avec des mots.

Le français utilise 26 lettres comme l'anglais, mais avec des accents spéciaux : é, è, ç.

Exemple : le mot 'café' a un accent é. Le mot 'français' a un ç.

En français, chaque mot a un genre : masculin ou féminin.
- "Le chat" (masculin)
- "La table" (féminin)

Les verbes changent selon qui parle :
- "Je mange" (moi)
- "Tu manges" (toi)

En résumé : le français est une langue avec des règles de grammaire, des genres et des accents.

Continue comme ça ! 💪"""
    
    # Détection de questions sur les BASES du français
    elif any(mot in message_lower for mot in ['base', 'bases', 'débutant', 'débutants', 'commencer', 'premier', 'première', 'par où commencer', 'comment commencer', 'enseigner la base', 'les bases']):
        return """Excellente question ! ✨

Oui, je suis prêt à enseigner les BASES du français ! Je commence toujours par les bases.

**LES BASES DU FRANÇAIS - Par où commencer :**

**1. L'ALPHABET (Première étape) :**
- Les 26 lettres : A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z
- Les accents : é, è, ê, à, ù, ç
- Comment prononcer chaque lettre

**2. LES MOTS DE BASE :**
- Les salutations : Bonjour, Bonsoir, Salut, Au revoir
- Les mots de politesse : Merci, S'il vous plaît, Pardon, Excusez-moi
- Les mots courants : Oui, Non, Bonjour, Merci

**3. LES ARTICLES (Très important) :**
- Le, La, Les (définis)
- Un, Une, Des (indéfinis)
- Quand utiliser chaque article

**4. LES PRONOMS (Pour parler) :**
- Je, Tu, Il, Elle, Nous, Vous, Ils, Elles
- Comment les utiliser

**5. LES VERBES DE BASE :**
- Être (je suis, tu es, il est...)
- Avoir (j'ai, tu as, il a...)
- Aller (je vais, tu vas...)
- Faire (je fais, tu fais...)

**6. LES PHRASES SIMPLES :**
- "Je suis..." (I am...)
- "J'ai..." (I have...)
- "Je vais..." (I go...)
- "Je fais..." (I do...)

**7. LE VOCABULAIRE DE BASE :**
- La famille : père, mère, frère, sœur
- Les nombres : un, deux, trois...
- Les couleurs : rouge, bleu, vert...
- Les jours : lundi, mardi, mercredi...

**8. LES EXPRESSIONS UTILES :**
- "Comment allez-vous ?" (How are you?)
- "Je m'appelle..." (My name is...)
- "Où est...?" (Where is...?)
- "Combien ça coûte ?" (How much does it cost?)

**COMMENT JE T'ENSEIGNE LES BASES :**
1. Je commence par le plus simple
2. J'explique chaque mot comme si tu ne le connaissais pas
3. Je donne des exemples concrets
4. Je t'encourage à chaque étape
5. Je réponds à toutes tes questions

**Pose-moi tes questions sur les bases :**
- "C'est quoi l'alphabet français ?"
- "Comment dire bonjour ?"
- "C'est quoi un article ?"
- "Comment utiliser je, tu, il ?"
- "Quels sont les verbes de base ?"
- "Comment faire une phrase simple ?"

Je suis là pour t'enseigner les bases du français du début à la fin ! Pose-moi tes questions maintenant ! 📚✨"""
    
    # Détection de questions sur la compétence en français
    elif any(mot in message_lower for mot in ['compétent', 'competent', 'compétence', 'competence', 'prof compétent', 'professeur compétent', 'tu es compétent', 'es-tu compétent', 'es tu competent', 'prêt', 'pret', 'prête', 'prete']):
        return """Excellente question ! ✨

Oui, je suis un professeur COMPÉTENT en français ! Je peux t'enseigner la langue française avec excellence.

**Mes compétences en français :**

✅ **Grammaire complète :**
- Verbes et conjugaison (présent, passé composé, imparfait, futur)
- Genres (masculin/féminin)
- Pluriels et accords
- Articles (le, la, les, un, une, des)
- Pronoms (je, tu, il, me, te, le, etc.)
- Adjectifs et leur accord

✅ **Orthographe :**
- Accents (é, è, ê, à, ù, ç)
- Règles d'orthographe
- Pluriels et exceptions

✅ **Vocabulaire :**
- Synonymes et antonymes
- Familles de mots
- Expressions courantes

✅ **Syntaxe :**
- Structure des phrases
- Types de phrases (déclarative, interrogative, exclamative, impérative)
- Ordre des mots

✅ **Prononciation :**
- Sons et phonétique
- Règles de prononciation
- Lettres muettes

✅ **Temps verbaux :**
- Présent, passé composé, imparfait, futur
- Conjugaison de tous les groupes de verbes

**Je peux t'enseigner :**
- La grammaire française (toutes les règles)
- La conjugaison (tous les temps)
- L'orthographe (toutes les règles)
- Le vocabulaire (synonymes, antonymes)
- La syntaxe (construction des phrases)
- La prononciation (comment dire les mots)

**Comment je fonctionne :**
- J'explique de manière SIMPLE et CLAIRE
- Je pars TOUJOURS des bases
- Je donne des EXEMPLES CONCRETS
- J'encourage et je motive
- Je réponds à TOUTES tes questions sur le français

**Pose-moi n'importe quelle question sur le français :**
- "C'est quoi un verbe ?"
- "Comment conjuguer au présent ?"
- "Qu'est-ce que le pluriel ?"
- "Comment utiliser les accents ?"
- "C'est quoi un synonyme ?"
- Et bien d'autres !

Je suis là pour t'aider à apprendre le français, même si tu ne connais rien au départ. Je pars toujours de zéro !

N'hésite pas, pose-moi tes questions maintenant ! 📚✨"""
    
    # Détection de questions sur enseigner / apprendre
    elif any(mot in message_lower for mot in ['enseigner', 'apprendre', 'apprends', 'enseigne', 'peux-tu enseigner', 'peut tu enseigner', 'peux tu m\'enseigner', 'peux-tu m\'enseigner le français', 'peut tu m\'enseigner le français', 'enseigner le français', 'apprendre le français']):
        return """Excellente question ! ✨

Oui, je peux t'enseigner le français ! C'est exactement mon rôle et ma spécialité.

**Je suis un professeur COMPÉTENT en français et je peux t'enseigner :**

✅ **Grammaire française :**
- Verbes et conjugaison (tous les temps)
- Genres (masculin/féminin)
- Pluriels et accords
- Articles et pronoms
- Adjectifs

✅ **Orthographe :**
- Accents (é, è, ê, à, ù, ç)
- Règles d'orthographe
- Pluriels et exceptions

✅ **Vocabulaire :**
- Synonymes et antonymes
- Familles de mots
- Expressions courantes

✅ **Syntaxe :**
- Structure des phrases
- Types de phrases
- Ordre des mots

✅ **Prononciation :**
- Sons et phonétique
- Règles de prononciation

**Comment je fonctionne :**
- Je réponds à toutes tes questions de manière SIMPLE et CLAIRE
- J'explique étape par étape
- Je donne des exemples concrets de la vie quotidienne
- Je pars TOUJOURS des bases pour être sûr que tu comprends
- J'encourage et je motive

**Tu peux me demander :**
- "C'est quoi un verbe ?" → Je t'explique ce que c'est
- "Comment conjuguer au présent ?" → Je te montre la conjugaison
- "Qu'est-ce que le pluriel ?" → Je t'explique les règles
- "Comment utiliser les accents ?" → Je t'explique tous les accents
- "C'est quoi un synonyme ?" → Je te donne des exemples
- N'importe quelle question sur le français !

**Exemple :**
Si tu me demandes "Comment saluer les gens ?", je t'explique :
- Les différents mots pour saluer (Bonjour, Bonsoir, Salut)
- Quand les utiliser (matin, après-midi, soir)
- Des exemples concrets (au magasin, avec des amis)

**Mon objectif :**
T'aider à apprendre et comprendre le français, même si tu ne connais rien au départ. Je pars toujours de zéro !

**Je suis là pour toi !** Pose-moi tes questions sur le français maintenant ! 📚✨"""
    
    # Détection de questions commençant par "comment", "peux-tu", "peut tu"
    elif any(mot in message_lower for mot in ['comment', 'peux-tu', 'peut tu', 'peux tu', 'peut-tu', 'peux tu m\'aider', 'peut tu m\'aider']):
        # Essayer de comprendre ce qu'on demande
        if 'saluer' in message_lower or 'bonjour' in message_lower:
            return """Excellente question ! ✨

Pour saluer les gens, voici comment faire :

**Les mots à utiliser :**
- "Bonjour" : le matin et l'après-midi (jusqu'à 18h)
- "Bonsoir" : le soir (après 18h)
- "Salut" : avec des amis (familier)
- "Bonne nuit" : quand on va dormir

**Exemples :**
- "Bonjour, comment allez-vous ?" (poli)
- "Salut ! Ça va ?" (avec un ami)
- "Bonsoir, bonne soirée !" (le soir)

**Les gestes :**
- Sourire
- Regarder la personne
- Serrer la main ou faire la bise (en France)

**Astuce :**
Commence toujours par "Bonjour" ou "Bonsoir" selon l'heure, puis ajoute ta question ou ta demande.

Continue comme ça ! 💪"""
        else:
            # Réponse générique pour "comment"
            sujet = message_lower
            for mot in ['comment', 'peux-tu', 'peut tu', 'peux tu', 'peut-tu', 'm\'aider', 'm\'enseigner', 'stpl', 'stp', 's\'il te plaît', 's\'il vous plaît']:
                sujet = sujet.replace(mot, '').strip()
            sujet = sujet.replace('?', '').strip()
            
            return f"""Excellente question ! ✨

Tu me demandes : "{message}"

Je comprends que tu veux apprendre comment faire quelque chose.

**Pour te donner une explication complète et détaillée :**
Je peux t'aider ! Pose-moi ta question de manière plus précise, par exemple :
- "Comment saluer les gens ?"
- "Comment faire..." 
- "Explique-moi..."

**Ou configure une clé API OpenAI** pour avoir des réponses encore plus détaillées :
1. Va sur https://platform.openai.com/
2. Crée un compte (gratuit au début)
3. Obtiens une clé API
4. Ouvre le fichier .env et remplace "sk-votre_cle_ici" par ta vraie clé

Mais même sans clé API, je peux répondre à beaucoup de questions ! Essaie de reformuler ta question, je ferai de mon mieux ! 📚"""
    
    # ========== MATHÉMATIQUES STPL (SECONDET → TERMINALE) ==========

    # Recherche dans la base de cours de maths (si disponible)
    elif COURS_DISPONIBLES and any(mot in message_lower for mot in MOTS_CLES_MATHS):
        resultats_maths = rechercher_cours_maths(message_lower)
        if resultats_maths:
            cours = resultats_maths[0]['cours']
            niveau_affiche = resultats_maths[0]['niveau'].replace('_', ' ').upper()
            return f"""Excellente question ! 📐

**{cours['titre']}** — Niveau : {niveau_affiche}

{cours['contenu']}

**Exemples :**
{chr(10).join('- ' + ex for ex in cours['exemples'])}

Continue comme ça, tu progresses en maths ! 💪"""

        # Réponses spécifiques pour les maths STPL les plus demandées
        if any(mot in message_lower for mot in ['dérivée', 'derivee', 'dériver', 'dérivation', 'règle dérivée']):
            return """Excellente question ! 📐

**Les Dérivées — Première/Terminale STPL**

La dérivée f'(x) mesure la vitesse de variation d'une fonction.

**Dérivées des fonctions de base :**
| Fonction f(x) | Dérivée f'(x) |
|---------------|---------------|
| c (constante) | 0 |
| xⁿ | n × xⁿ⁻¹ |
| √x | 1/(2√x) |
| eˣ | eˣ |
| ln(x) | 1/x |
| sin(x) | cos(x) |
| cos(x) | -sin(x) |

**Règles de calcul :**
- **(u + v)' = u' + v'**
- **(k × u)' = k × u'**
- **(u × v)' = u'v + uv'** ← produit
- **(u/v)' = (u'v - uv') / v²** ← quotient
- **[u(v(x))]' = v'(x) × u'(v(x))** ← composée

**Exemple complet :**
f(x) = x³ - 3x + 2
→ f'(x) = 3x² - 3
→ f'(x) = 0 quand 3x² = 3, soit x = ±1
→ f(-1) = 4 (maximum local), f(1) = 0 (minimum local)

**Équation de la tangente en x₀ :**
y = f'(x₀)(x - x₀) + f(x₀)

Continue comme ça, tu maîtrises les dérivées ! 💪"""

        elif any(mot in message_lower for mot in ['intégrale', 'integrale', 'primitive', 'intégration', 'calcul intégral']):
            return """Excellente question ! 📐

**Calcul Intégral — Terminale STPL**

**Primitives usuelles :**
| f(x) | F(x) primitive |
|------|---------------|
| k (constante) | kx + C |
| xⁿ (n ≠ -1) | xⁿ⁺¹/(n+1) + C |
| eˣ | eˣ + C |
| 1/x | ln|x| + C |
| sin(x) | -cos(x) + C |
| cos(x) | sin(x) + C |

**Intégrale définie :**
∫[a→b] f(x) dx = F(b) - F(a)

**Exemple :**
∫[0→2] x² dx = [x³/3]₀² = 8/3 - 0 = **8/3**

**Interprétation :** Si f(x) ≥ 0 sur [a;b], l'intégrale = aire sous la courbe.

**Valeur moyenne :**
m = 1/(b-a) × ∫[a→b] f(x) dx

Continue comme ça ! 💪"""

        elif any(mot in message_lower for mot in ['loi normale', 'normale', 'gaussienne', 'écart-type normal', 'distribution normale']):
            return """Excellente question ! 📐

**Loi Normale N(μ, σ) — Terminale STPL**

**Caractéristiques :**
- μ = espérance (moyenne) — centre de la cloche
- σ = écart-type — largeur de la cloche
- Courbe en cloche, symétrique autour de μ

**Règle empirique :**
- 68% des valeurs ∈ [μ - σ ; μ + σ]
- 95% des valeurs ∈ [μ - 2σ ; μ + 2σ]
- 99,7% des valeurs ∈ [μ - 3σ ; μ + 3σ]

**Standardisation (centrage-réduction) :**
Z = (X - μ) / σ  →  Z ~ N(0, 1)

**Table de la loi normale centrée réduite :**
- P(Z ≤ 0) = 0,5
- P(Z ≤ 1,96) ≈ 0,975
- P(-1,96 ≤ Z ≤ 1,96) ≈ 0,95

**Intervalle de confiance (niveau 95%) :**
IC = [f̂ ± 1,96 × √(f̂(1-f̂)/n)]

**Exemple :**
X ~ N(100 ; 15) : P(70 ≤ X ≤ 130) = P(|Z| ≤ 2) ≈ 95%

Continue comme ça ! 💪"""

        elif any(mot in message_lower for mot in ['binomiale', 'loi binomiale', 'bernoulli', 'b(n,p)', 'probabilité binomiale']):
            return """Excellente question ! 📐

**Loi Binomiale B(n, p) — Première STPL**

n répétitions indépendantes d'une épreuve de Bernoulli.
p = probabilité de succès, q = 1 - p.

**Formule :**
P(X = k) = C(n,k) × pᵏ × qⁿ⁻ᵏ

où C(n,k) = n! / (k! × (n-k)!) = "k parmi n"

**Paramètres :**
- Espérance : **E(X) = n × p**
- Variance : **V(X) = n × p × q**
- Écart-type : **σ = √(npq)**

**Exemple :**
X ~ B(10 ; 0,4) :
- P(X = 3) = C(10,3) × 0,4³ × 0,6⁷ = 120 × 0,064 × 0,028 ≈ 0,215
- E(X) = 10 × 0,4 = **4**
- V(X) = 10 × 0,4 × 0,6 = **2,4**

**C(n,k) — Comment calculer :**
C(10,3) = 10! / (3! × 7!) = (10×9×8)/(3×2×1) = 120

Continue comme ça ! 💪"""

        elif any(mot in message_lower for mot in ['équation différentielle', 'equation differentielle', "y' = ay", "y'=ay", "différentielle"]):
            return """Excellente question ! 📐

**Équations Différentielles — Terminale STPL**

**Type 1 : y' = ay**
Solution générale : **y = C × eᵃˣ**
(C est une constante réelle quelconque)

Si y(0) = y₀ → **y = y₀ × eᵃˣ**

**Type 2 : y' = ay + b**
1. Solution particulière (constante) : yₚ = -b/a
2. Solution homogène : yₕ = C × eᵃˣ
3. Solution générale : **y = C × eᵃˣ - b/a**

**Exemple :**
y' = -2y + 6, y(0) = 4
- yₚ = 6/2 = 3 (solution particulière)
- y = Ce⁻²ˣ + 3
- y(0) = 4 → C + 3 = 4 → C = 1
- **Solution : y = e⁻²ˣ + 3**

**Applications :**
- Radioactivité : N(t) = N₀ × e⁻ᵏᵗ
- Refroidissement : T(t) = T_env + (T₀ - T_env) × e⁻ᵏᵗ
- Demi-vie : t½ = ln(2)/k

Continue comme ça ! 💪"""

        elif any(mot in message_lower for mot in ['matrice', 'matrices', 'déterminant', 'determinant', 'inverse matrice']):
            return """Excellente question ! 📐

**Calcul Matriciel — Terminale STPL**

**Déterminant d'une matrice 2×2 :**
A = [[a, b], [c, d]]
**det(A) = a×d - b×c**

**Matrice inverse (si det ≠ 0) :**
A⁻¹ = (1/det(A)) × [[d, -b], [-c, a]]

**Produit de matrices :**
C = A × B → cᵢⱼ = somme des aᵢₖ × bₖⱼ

**Résolution d'un système avec les matrices :**
AX = B → **X = A⁻¹ × B**

**Exemple complet :**
{ 2x + y = 5
{ x - y = 1
A = [[2,1],[1,-1]], det(A) = -2 - 1 = -3
A⁻¹ = (-1/3) × [[-1,-1],[-1,2]]
B = [[5],[1]]
X = A⁻¹B → x = 2, y = 1

**Vérification :** 2(2) + 1 = 5 ✓ et 2 - 1 = 1 ✓

Continue comme ça ! 💪"""

        elif any(mot in message_lower for mot in ['suite', 'suites', 'arithmétique', 'géométrique', 'raison suite', 'terme général']):
            return """Excellente question ! 📐

**Suites Numériques — Première STPL**

**Suite arithmétique (raison r) :**
- uₙ₊₁ = uₙ + r
- Terme général : **uₙ = u₀ + n × r**
- Somme n termes : **Sₙ = n × (u₀ + uₙ₋₁) / 2**

**Suite géométrique (raison q) :**
- uₙ₊₁ = uₙ × q
- Terme général : **uₙ = u₀ × qⁿ**
- Somme n termes (q ≠ 1) : **Sₙ = u₀ × (1 - qⁿ) / (1 - q)**

**Exemple arithmétique :**
u₀ = 3, r = 4 → u₅ = 3 + 5 × 4 = **23**

**Exemple géométrique :**
u₀ = 2, q = 3 → u₄ = 2 × 3⁴ = 2 × 81 = **162**

**Limite d'une suite géométrique :**
- |q| < 1 → qⁿ → 0 (converge vers 0)
- q > 1 → qⁿ → +∞ (diverge)
- q = 1 → suite constante

Continue comme ça ! 💪"""

        else:
            return """Excellente question ! 📐

Je suis ton professeur de **Mathématiques niveau STPL** (Seconde → Terminale).

**Programme que je maîtrise à 100% :**

**Seconde :**
- Nombres et calculs (puissances, racines, fractions)
- Équations du 1er et 2nd degré, systèmes
- Fonctions de référence (affine, carré, inverse, racine)
- Vecteurs et géométrie dans le plan
- Statistiques (moyenne, médiane, écart-type)
- Probabilités de base

**Première STPL :**
- Dérivées : règles de calcul, tableaux de variations, extrema
- Suites arithmétiques et géométriques
- Trigonométrie (sin, cos, tan, valeurs remarquables)
- Fonctions eˣ et ln(x)
- Loi binomiale B(n,p)

**Terminale STPL :**
- Calcul intégral (primitives, intégrales, valeur moyenne)
- Équations différentielles (y' = ay et y' = ay + b)
- Loi normale N(μ, σ) et intervalle de confiance
- Matrices (opérations, déterminant, inverse, systèmes)

**Pose-moi tes questions de maths, par exemple :**
- "Calcule la dérivée de x³ - 2x"
- "Explique-moi la loi binomiale"
- "C'est quoi une intégrale ?"
- "Comment résoudre une équation différentielle ?"

Pour des calculs numériques et des exercices complets, configure une clé API OpenAI.

Continue, pose-moi tes questions ! 💪"""

    # Détection de questions sur la programmation - RÉPONSE SIMPLE ET PRÉCISE
    elif any(mot in message_lower for mot in ['programmation', 'code', 'python', 'javascript', 'algorithme', 'coder', 'programmer']):
        return """Excellente question ! ✨

La programmation, c'est écrire des instructions pour qu'un ordinateur fasse quelque chose.

C'est comme donner une recette de cuisine à un robot : tu écris les étapes et il les suit.

**Les bases :**

1. **Un algorithme** : c'est une série d'étapes pour résoudre un problème.
   Exemple : Pour faire un sandwich :
   - Prendre le pain
   - Mettre le beurre
   - Ajouter la garniture

2. **Le code** : ce sont les instructions écrites dans un langage que l'ordinateur comprend.

3. **Les variables** : c'est comme une boîte avec une étiquette.
   Exemple : "nom = 'Marie'" (on met "Marie" dans la boîte "nom")

**Langages populaires :**
- Python : facile pour débuter
- JavaScript : pour les sites web
- Java : pour des applications complexes

En résumé : la programmation, c'est écrire des instructions pour l'ordinateur.

Continue comme ça ! 💪"""
    
    # ========== COMPÉTENCES COMPLÈTES EN FRANÇAIS ==========
    
    # CONJUGAISON SPÉCIFIQUE - Détecter "conjugue [verbe]" ou "conjuguer [verbe]"
    conjugaison_match = re.search(r'conjug(?:ue|uer|aison)\s+(?:le\s+)?(?:verbe\s+)?([a-zàâäéèêëïîôùûüÿç]+)', message_lower)
    if conjugaison_match:
        verbe_demande = conjugaison_match.group(1).strip()
        # Détecter le temps demandé
        temps_demande = 'présent'  # par défaut
        if any(mot in message_lower for mot in ['passé composé', 'passé', 'j\'ai']):
            temps_demande = 'passé composé'
        elif any(mot in message_lower for mot in ['futur', 'demain']):
            temps_demande = 'futur'
        elif any(mot in message_lower for mot in ['imparfait', 'j\'étais', 'je mangeais']):
            temps_demande = 'imparfait'
        elif any(mot in message_lower for mot in ['conditionnel']):
            temps_demande = 'conditionnel'
        
        # Fonction pour conjuguer un verbe
        def conjuguer_verbe(verbe, temps='présent'):
            verbe = verbe.lower().strip()
            
            # Verbes irréguliers principaux
            irreguliers = {
                'être': {
                    'présent': ['je suis', 'tu es', 'il/elle est', 'nous sommes', 'vous êtes', 'ils/elles sont'],
                    'passé composé': ['j\'ai été', 'tu as été', 'il/elle a été', 'nous avons été', 'vous avez été', 'ils/elles ont été'],
                    'futur': ['je serai', 'tu seras', 'il/elle sera', 'nous serons', 'vous serez', 'ils/elles seront'],
                    'imparfait': ['j\'étais', 'tu étais', 'il/elle était', 'nous étions', 'vous étiez', 'ils/elles étaient'],
                    'conditionnel': ['je serais', 'tu serais', 'il/elle serait', 'nous serions', 'vous seriez', 'ils/elles seraient']
                },
                'avoir': {
                    'présent': ['j\'ai', 'tu as', 'il/elle a', 'nous avons', 'vous avez', 'ils/elles ont'],
                    'passé composé': ['j\'ai eu', 'tu as eu', 'il/elle a eu', 'nous avons eu', 'vous avez eu', 'ils/elles ont eu'],
                    'futur': ['j\'aurai', 'tu auras', 'il/elle aura', 'nous aurons', 'vous aurez', 'ils/elles auront'],
                    'imparfait': ['j\'avais', 'tu avais', 'il/elle avait', 'nous avions', 'vous aviez', 'ils/elles avaient'],
                    'conditionnel': ['j\'aurais', 'tu aurais', 'il/elle aurait', 'nous aurions', 'vous auriez', 'ils/elles auraient']
                },
                'faire': {
                    'présent': ['je fais', 'tu fais', 'il/elle fait', 'nous faisons', 'vous faites', 'ils/elles font'],
                    'passé composé': ['j\'ai fait', 'tu as fait', 'il/elle a fait', 'nous avons fait', 'vous avez fait', 'ils/elles ont fait'],
                    'futur': ['je ferai', 'tu feras', 'il/elle fera', 'nous ferons', 'vous ferez', 'ils/elles feront'],
                    'imparfait': ['je faisais', 'tu faisais', 'il/elle faisait', 'nous faisions', 'vous faisiez', 'ils/elles faisaient'],
                    'conditionnel': ['je ferais', 'tu ferais', 'il/elle ferait', 'nous ferions', 'vous feriez', 'ils/elles feraient']
                },
                'aller': {
                    'présent': ['je vais', 'tu vas', 'il/elle va', 'nous allons', 'vous allez', 'ils/elles vont'],
                    'passé composé': ['je suis allé(e)', 'tu es allé(e)', 'il/elle est allé(e)', 'nous sommes allé(e)s', 'vous êtes allé(e)s', 'ils/elles sont allé(e)s'],
                    'futur': ['j\'irai', 'tu iras', 'il/elle ira', 'nous irons', 'vous irez', 'ils/elles iront'],
                    'imparfait': ['j\'allais', 'tu allais', 'il/elle allait', 'nous allions', 'vous alliez', 'ils/elles allaient'],
                    'conditionnel': ['j\'irais', 'tu irais', 'il/elle irait', 'nous irions', 'vous iriez', 'ils/elles iraient']
                },
                'venir': {
                    'présent': ['je viens', 'tu viens', 'il/elle vient', 'nous venons', 'vous venez', 'ils/elles viennent'],
                    'passé composé': ['je suis venu(e)', 'tu es venu(e)', 'il/elle est venu(e)', 'nous sommes venu(e)s', 'vous êtes venu(e)s', 'ils/elles sont venu(e)s'],
                    'futur': ['je viendrai', 'tu viendras', 'il/elle viendra', 'nous viendrons', 'vous viendrez', 'ils/elles viendront'],
                    'imparfait': ['je venais', 'tu venais', 'il/elle venait', 'nous venions', 'vous veniez', 'ils/elles venaient'],
                    'conditionnel': ['je viendrais', 'tu viendrais', 'il/elle viendrait', 'nous viendrions', 'vous viendriez', 'ils/elles viendraient']
                },
                'pouvoir': {
                    'présent': ['je peux', 'tu peux', 'il/elle peut', 'nous pouvons', 'vous pouvez', 'ils/elles peuvent'],
                    'passé composé': ['j\'ai pu', 'tu as pu', 'il/elle a pu', 'nous avons pu', 'vous avez pu', 'ils/elles ont pu'],
                    'futur': ['je pourrai', 'tu pourras', 'il/elle pourra', 'nous pourrons', 'vous pourrez', 'ils/elles pourront'],
                    'imparfait': ['je pouvais', 'tu pouvais', 'il/elle pouvait', 'nous pouvions', 'vous pouviez', 'ils/elles pouvaient'],
                    'conditionnel': ['je pourrais', 'tu pourrais', 'il/elle pourrait', 'nous pourrions', 'vous pourriez', 'ils/elles pourraient']
                },
                'vouloir': {
                    'présent': ['je veux', 'tu veux', 'il/elle veut', 'nous voulons', 'vous voulez', 'ils/elles veulent'],
                    'passé composé': ['j\'ai voulu', 'tu as voulu', 'il/elle a voulu', 'nous avons voulu', 'vous avez voulu', 'ils/elles ont voulu'],
                    'futur': ['je voudrai', 'tu voudras', 'il/elle voudra', 'nous voudrons', 'vous voudrez', 'ils/elles voudront'],
                    'imparfait': ['je voulais', 'tu voulais', 'il/elle voulait', 'nous voulions', 'vous vouliez', 'ils/elles voulaient'],
                    'conditionnel': ['je voudrais', 'tu voudrais', 'il/elle voudrait', 'nous voudrions', 'vous voudriez', 'ils/elles voudraient']
                },
                'savoir': {
                    'présent': ['je sais', 'tu sais', 'il/elle sait', 'nous savons', 'vous savez', 'ils/elles savent'],
                    'passé composé': ['j\'ai su', 'tu as su', 'il/elle a su', 'nous avons su', 'vous avez su', 'ils/elles ont su'],
                    'futur': ['je saurai', 'tu sauras', 'il/elle saura', 'nous saurons', 'vous saurez', 'ils/elles sauront'],
                    'imparfait': ['je savais', 'tu savais', 'il/elle savait', 'nous savions', 'vous saviez', 'ils/elles savaient'],
                    'conditionnel': ['je saurais', 'tu saurais', 'il/elle saurait', 'nous saurions', 'vous sauriez', 'ils/elles sauraient']
                }
            }
            
            # Vérifier si c'est un verbe irrégulier
            if verbe in irreguliers and temps in irreguliers[verbe]:
                return irreguliers[verbe][temps]
            
            # Verbes réguliers du 1er groupe (en -er)
            if verbe.endswith('er') and len(verbe) > 2:
                radical = verbe[:-2]
                terminaisons = {
                    'présent': ['e', 'es', 'e', 'ons', 'ez', 'ent'],
                    'passé composé': [f'ai {verbe[:-2]}é', f'as {verbe[:-2]}é', f'a {verbe[:-2]}é', f'avons {verbe[:-2]}é', f'avez {verbe[:-2]}é', f'ont {verbe[:-2]}é'],
                    'futur': ['ai', 'as', 'a', 'ons', 'ez', 'ont'],
                    'imparfait': ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'],
                    'conditionnel': ['ais', 'ais', 'ait', 'ions', 'iez', 'aient']
                }
                if temps == 'futur' or temps == 'conditionnel':
                    radical_futur = radical + 'er'
                    if temps == 'futur':
                        return [f'je {radical_futur}ai', f'tu {radical_futur}as', f'il/elle {radical_futur}a', f'nous {radical_futur}ons', f'vous {radical_futur}ez', f'ils/elles {radical_futur}ont']
                    else:
                        return [f'je {radical_futur}ais', f'tu {radical_futur}ais', f'il/elle {radical_futur}ait', f'nous {radical_futur}ions', f'vous {radical_futur}iez', f'ils/elles {radical_futur}aient']
                elif temps in terminaisons:
                    if temps == 'passé composé':
                        return terminaisons[temps]
                    else:
                        return [f'je {radical}{terminaisons[temps][0]}', f'tu {radical}{terminaisons[temps][1]}', f'il/elle {radical}{terminaisons[temps][2]}', f'nous {radical}{terminaisons[temps][3]}', f'vous {radical}{terminaisons[temps][4]}', f'ils/elles {radical}{terminaisons[temps][5]}']
            
            # Verbes du 2e groupe (en -ir comme finir)
            if verbe.endswith('ir') and len(verbe) > 2:
                radical = verbe[:-2]
                if temps == 'présent':
                    return [f'je {radical}is', f'tu {radical}is', f'il/elle {radical}it', f'nous {radical}issons', f'vous {radical}issez', f'ils/elles {radical}issent']
                elif temps == 'passé composé':
                    return [f'j\'ai {radical}i', f'tu as {radical}i', f'il/elle a {radical}i', f'nous avons {radical}i', f'vous avez {radical}i', f'ils/elles ont {radical}i']
                elif temps == 'futur':
                    return [f'je {radical}irai', f'tu {radical}iras', f'il/elle {radical}ira', f'nous {radical}irons', f'vous {radical}irez', f'ils/elles {radical}iront']
                elif temps == 'imparfait':
                    return [f'je {radical}issais', f'tu {radical}issais', f'il/elle {radical}issait', f'nous {radical}issions', f'vous {radical}issiez', f'ils/elles {radical}issaient']
                elif temps == 'conditionnel':
                    return [f'je {radical}irais', f'tu {radical}irais', f'il/elle {radical}irait', f'nous {radical}irions', f'vous {radical}iriez', f'ils/elles {radical}iraient']
            
            # Si on ne connaît pas le verbe, donner une réponse générique
            return None
        
        conjugaison = conjuguer_verbe(verbe_demande, temps_demande)
        if conjugaison:
            pronoms = ['Je', 'Tu', 'Il/Elle', 'Nous', 'Vous', 'Ils/Elles']
            conjugaison_formatee = '\n'.join([f"- **{pronoms[i]}** : {conjugaison[i]}" for i in range(6)])
            
            # Extraire le verbe conjugué pour les exemples
            verbe_conj_je = conjugaison[0].split()[-1] if len(conjugaison[0].split()) > 1 else conjugaison[0]
            verbe_conj_tu = conjugaison[1].split()[-1] if len(conjugaison[1].split()) > 1 else conjugaison[1]
            verbe_conj_il = conjugaison[2].split()[-1] if len(conjugaison[2].split()) > 1 else conjugaison[2]
            
            return f"""Excellente question ! ✨

**CONJUGAISON COMPLÈTE DU VERBE "{verbe_demande}" AU {temps_demande.upper()} :**

{conjugaison_formatee}

**EXEMPLES CONCRETS (7 exemples) :**
1. "Je {verbe_conj_je} tous les jours." (I {verbe_demande} every day)
2. "Tu {verbe_conj_tu} bien le français." (You {verbe_demande} French well)
3. "Il/Elle {verbe_conj_il} avec ses amis." (He/She {verbe_demande} with friends)
4. "Nous {conjugaison[3]} ensemble." (We {verbe_demande} together)
5. "Vous {conjugaison[4]} souvent." (You {verbe_demande} often)
6. "Ils/Elles {conjugaison[5]} à l'école." (They {verbe_demande} at school)
7. "Quand je {verbe_conj_je}, je suis content(e)." (When I {verbe_demande}, I'm happy)

**RÈGLE DE CONJUGAISON :**
Pour conjuguer un verbe, on change la fin du verbe selon :
- **Qui fait l'action** : je, tu, il/elle, nous, vous, ils/elles
- **Quand ça se passe** : présent, passé, futur

**EXERCICES PRATIQUES (3 exercices avec corrigés) :**

**Exercice 1 :** Conjugue au {temps_demande}
- Je (verbe) → Je {conjugaison[0]}
- Tu (verbe) → Tu {conjugaison[1]}
- Il (verbe) → Il {conjugaison[2]}

**Corrigé :**
- Je {conjugaison[0]}
- Tu {conjugaison[1]}
- Il {conjugaison[2]}

**Exercice 2 :** Complète les phrases
- "Je ... tous les jours" → "Je {verbe_conj_je} tous les jours"
- "Tu ... bien" → "Tu {verbe_conj_tu} bien"
- "Il ... souvent" → "Il {verbe_conj_il} souvent"

**Exercice 3 :** Écris correctement
- "Je {verbe_demande} maintenant" → "Je {verbe_conj_je} maintenant"
- "Nous {verbe_demande} ensemble" → "Nous {conjugaison[3]} ensemble"
- "Ils {verbe_demande} bien" → "Ils {conjugaison[5]} bien"

**ASTUCE MNÉMOTECHNIQUE :**
Pour retenir la conjugaison, pense à :
- **Je/Tu/Il** : terminaisons similaires (e, es, e)
- **Nous** : terminaison "ons"
- **Vous** : terminaison "ez"
- **Ils/Elles** : terminaison "ent"

**En résumé :** Le verbe "{verbe_demande}" au {temps_demande} se conjugue ainsi. Chaque personne a sa propre terminaison. Pratique avec les exemples ci-dessus !

Continue comme ça ! 💪"""
        else:
            return f"""Excellente question ! ✨

Je vais te montrer comment conjuguer le verbe "{verbe_demande}" au {temps_demande}.

**Règle générale :**
- Les verbes en -er (comme "manger", "parler") : on enlève -er et on ajoute les terminaisons
- Les verbes en -ir (comme "finir") : on enlève -ir et on ajoute les terminaisons
- Les verbes irréguliers (être, avoir, faire, aller) : ont des conjugaisons spéciales

**Pour le verbe "{verbe_demande}" :**
Je peux te donner la conjugaison complète ! Demande-moi :
- "Conjugue {verbe_demande} au présent"
- "Conjugue {verbe_demande} au passé composé"
- "Conjugue {verbe_demande} au futur"

Ou je peux t'expliquer les règles de conjugaison pour ce type de verbe.

Continue comme ça ! 💪"""
    
    # GRAMMAIRE - VERBES ET CONJUGAISON (100% COMPLET)
    elif any(mot in message_lower for mot in ['verbe', 'conjugaison', 'conjuguer', 'conjugue', 'temps du verbe', 'mode du verbe']):
        return """Excellente question ! ✨

Un verbe, c'est un mot qui exprime une action ou un état.

**LES TEMPS EN FRANÇAIS (100% COMPLET) :**

**1. Présent** : action qui se passe maintenant
   - "Je mange" (maintenant, en ce moment)
   - "Tu parles" (maintenant)
   - "Il dort" (maintenant)
   - "Nous étudions" (maintenant)

**2. Passé composé** : action terminée dans le passé
   - "J'ai mangé" (hier, terminé)
   - "Tu as parlé" (terminé)
   - "Il a dormi" (terminé)
   - "Nous avons étudié" (terminé)

**3. Imparfait** : action dans le passé qui dure
   - "Je mangeais" (avant, pendant longtemps)
   - "Tu parlais" (avant, habitude)
   - "Il dormait" (avant, pendant longtemps)
   - "Nous étudiions" (avant, habitude)

**4. Futur simple** : action à venir
   - "Je mangerai" (demain)
   - "Tu parleras" (plus tard)
   - "Il dormira" (plus tard)
   - "Nous étudierons" (plus tard)

**5. Conditionnel** : action possible ou hypothétique
   - "Je mangerais" (si j'avais faim)
   - "Tu parlerais" (si tu voulais)
   - "Il dormirait" (s'il était fatigué)

**6. Subjonctif** : action incertaine ou souhaitée
   - "Que je mange" (il faut que je mange)
   - "Que tu parles" (il faut que tu parles)

**LES GROUPES DE VERBES (100% COMPLET) :**

**1er groupe :** Verbes en -er (réguliers)
- Manger, parler, aimer, chanter, danser, jouer
- Règle : on enlève -er et on ajoute les terminaisons
- Exemple : manger → je mange, tu manges, il mange

**2e groupe :** Verbes en -ir (réguliers)
- Finir, choisir, grandir, réfléchir
- Règle : on enlève -ir et on ajoute -iss- + terminaisons
- Exemple : finir → je finis, tu finis, il finit, nous finissons

**3e groupe :** Verbes irréguliers
- Être, avoir, faire, aller, venir, pouvoir, vouloir, savoir
- Règle : chaque verbe a sa propre conjugaison
- Exemple : être → je suis, tu es, il est

**EXEMPLES DE CONJUGAISON COMPLÈTE :**

**Verbe "manger" au présent :**
- Je mange
- Tu manges
- Il/Elle mange
- Nous mangeons
- Vous mangez
- Ils/Elles mangent

**Verbe "être" au présent :**
- Je suis
- Tu es
- Il/Elle est
- Nous sommes
- Vous êtes
- Ils/Elles sont

**Verbe "avoir" au présent :**
- J'ai
- Tu as
- Il/Elle a
- Nous avons
- Vous avez
- Ils/Elles ont

**EXEMPLES CONCRETS (7 exemples) :**
1. "Je mange maintenant" (présent)
2. "J'ai mangé hier" (passé composé)
3. "Je mangeais tous les jours" (imparfait)
4. "Je mangerai demain" (futur)
5. "Je mangerais si j'avais faim" (conditionnel)
6. "Il faut que je mange" (subjonctif)
7. "Je vais manger" (futur proche avec "aller")

**EXERCICES PRATIQUES (5 exercices avec corrigés) :**

**Exercice 1 :** Conjugue "manger" au présent (facile)
- Je ... → Je mange
- Tu ... → Tu manges
- Il ... → Il mange
- Nous ... → Nous mangeons

**Corrigé :**
- Je mange (1ère personne)
- Tu manges (2ème personne)
- Il mange (3ème personne)
- Nous mangeons (1ère personne pluriel)

**Exercice 2 :** Conjugue "être" au présent (moyen)
- Je ... → Je suis
- Tu ... → Tu es
- Il ... → Il est
- Nous ... → Nous sommes

**Corrigé :**
- Je suis
- Tu es
- Il est
- Nous sommes

**Exercice 3 :** Choisis le bon temps (difficile)
- "Hier, je ... (manger)" → "Hier, j'ai mangé" (passé composé)
- "Demain, je ... (manger)" → "Demain, je mangerai" (futur)
- "Avant, je ... (manger) tous les jours" → "Avant, je mangeais tous les jours" (imparfait)

**Exercice 4 :** Trouve le groupe du verbe
- "Manger" → 1er groupe (en -er)
- "Finir" → 2e groupe (en -ir)
- "Être" → 3e groupe (irrégulier)
- "Avoir" → 3e groupe (irrégulier)

**Exercice 5 :** Écris correctement
- "Je mange maintenant" (présent)
- "J'ai mangé hier" (passé composé)
- "Je mangerai demain" (futur)
- "Je mangeais avant" (imparfait)

**ASTUCES MNÉMOTECHNIQUES :**
- **1er groupe** : pense à "manger" (facile, en -er)
- **2e groupe** : pense à "finir" (avec -iss-)
- **3e groupe** : pense à "être, avoir" (irréguliers, à apprendre par cœur)
- **Présent** : maintenant
- **Passé composé** : hier, terminé
- **Futur** : demain, plus tard

**TABLEAU RÉCAPITULATIF DES TEMPS :**

| Temps | Usage | Exemple |
|-------|-------|---------|
| Présent | Maintenant | Je mange |
| Passé composé | Action terminée | J'ai mangé |
| Imparfait | Habitude passée | Je mangeais |
| Futur | Action future | Je mangerai |
| Conditionnel | Hypothèse | Je mangerais |
| Subjonctif | Nécessité | Que je mange |

**En résumé :** Un verbe exprime une action ou un état. Il se conjugue selon qui fait l'action (je, tu, il, etc.) et quand ça se passe (présent, passé, futur). Il y a 3 groupes de verbes : 1er groupe (-er), 2e groupe (-ir), 3e groupe (irréguliers).

Continue comme ça ! 💪"""
    
    # GRAMMAIRE - GENRES (MASCULIN/FÉMININ) (100% COMPLET)
    elif any(mot in message_lower for mot in ['genre', 'masculin', 'féminin', 'masculin ou féminin', 'le ou la']):
        return """Excellente question ! ✨

En français, chaque nom a un genre : masculin ou féminin.

**MASCULIN :** on utilise "le" ou "un"
- Le chat (masculin)
- Un livre (masculin)
- Le garçon (masculin)
- Le soleil (masculin)
- Un arbre (masculin)
- Le chien (masculin)
- Un stylo (masculin)

**FÉMININ :** on utilise "la" ou "une"
- La table (féminin)
- Une fleur (féminin)
- La fille (féminin)
- La lune (féminin)
- Une école (féminin)
- La maison (féminin)
- Une voiture (féminin)

**COMMENT FORMER LE FÉMININ (100% COMPLET) :**

**1. Règle générale :** On ajoute un "e" à la fin
   - Un ami → Une amie
   - Un étudiant → Une étudiante
   - Un voisin → Une voisine
   - Un cousin → Une cousine
   - Un ami → Une amie

**2. Si le nom se termine déjà par "e" :** Ne change pas
   - Un élève → Une élève
   - Un artiste → Une artiste
   - Un journaliste → Une journaliste

**3. Si le nom se termine par "er" :** Devient "ère"
   - Un boulanger → Une boulangère
   - Un infirmier → Une infirmière
   - Un cuisinier → Une cuisinière

**4. Si le nom se termine par "ien" :** Devient "ienne"
   - Un musicien → Une musicienne
   - Un technicien → Une technicienne
   - Un mathématicien → Une mathématicienne

**5. Si le nom se termine par "on" :** Devient "onne"
   - Un lion → Une lionne
   - Un patron → Une patronne
   - Un champion → Une championne

**6. Si le nom se termine par "eur" :** Devient "euse" ou "rice"
   - Un danseur → Une danseuse
   - Un chanteur → Une chanteuse
   - Un acteur → Une actrice
   - Un directeur → Une directrice

**7. Mots qui changent complètement :**
   - Un homme → Une femme
   - Un garçon → Une fille
   - Un père → Une mère
   - Un frère → Une sœur
   - Un oncle → Une tante
   - Un neveu → Une nièce
   - Un roi → Une reine
   - Un coq → Une poule

**8. Mots qui n'ont qu'un seul genre :**
   - Un livre (toujours masculin)
   - Une table (toujours féminin)
   - Un soleil (toujours masculin)
   - Une lune (toujours féminin)

**LES ADJECTIFS S'ACCORDENT AUSSI :**
- Un grand chat → Une grande table
- Un petit garçon → Une petite fille
- Un beau livre → Une belle fleur
- Un bon ami → Une bonne amie
- Un nouveau stylo → Une nouvelle voiture

**EXEMPLES CONCRETS (7 exemples) :**
1. "Le chat est grand" (masculin) → "La table est grande" (féminin)
2. "Un ami gentil" (masculin) → "Une amie gentille" (féminin)
3. "Le garçon joue" (masculin) → "La fille joue" (féminin)
4. "Un boulanger travaille" (masculin) → "Une boulangère travaille" (féminin)
5. "Un musicien chante" (masculin) → "Une musicienne chante" (féminin)
6. "Un lion rugit" (masculin) → "Une lionne rugit" (féminin)
7. "Un danseur danse" (masculin) → "Une danseuse danse" (féminin)

**EXERCICES PRATIQUES (5 exercices avec corrigés) :**

**Exercice 1 :** Trouve le genre (facile)
- Le chat → Masculin
- La table → Féminin
- Un livre → Masculin
- Une fleur → Féminin

**Corrigé :**
- Le chat = masculin (article "le")
- La table = féminin (article "la")
- Un livre = masculin (article "un")
- Une fleur = féminin (article "une")

**Exercice 2 :** Forme le féminin (moyen)
- Un ami → Une amie
- Un étudiant → Une étudiante
- Un boulanger → Une boulangère
- Un musicien → Une musicienne

**Corrigé :**
- Une amie (+e)
- Une étudiante (+e)
- Une boulangère (-er → -ère)
- Une musicienne (-ien → -ienne)

**Exercice 3 :** Forme le féminin (difficile)
- Un danseur → Une danseuse
- Un acteur → Une actrice
- Un lion → Une lionne
- Un champion → Une championne

**Corrigé :**
- Une danseuse (-eur → -euse)
- Une actrice (-eur → -rice)
- Une lionne (-on → -onne)
- Une championne (-on → -onne)

**Exercice 4 :** Accorde les adjectifs
- Un grand chat → Une grande table
- Un petit garçon → Une petite fille
- Un beau livre → Une belle fleur

**Corrigé :**
- Grande (féminin de "grand")
- Petite (féminin de "petit")
- Belle (féminin de "beau")

**Exercice 5 :** Trouve les erreurs
- "Une ami" → "Une amie" (il manque le "e")
- "Un table" → "Une table" (mauvais article)
- "Le fleur" → "La fleur" (mauvais article)

**ASTUCES MNÉMOTECHNIQUES :**
- **Masculin** : pense à "le chat" (article "le")
- **Féminin** : pense à "la table" (article "la")
- **Formation du féminin** : généralement on ajoute "e"
- **Exceptions** : -er → -ère, -ien → -ienne, -on → -onne, -eur → -euse/-rice

**TABLEAU RÉCAPITULATIF :**

| Terminaison | Masculin | Féminin | Exemple |
|-------------|----------|---------|---------|
| Général | - | -e | ami → amie |
| Déjà en -e | -e | -e | élève → élève |
| -er | -er | -ère | boulanger → boulangère |
| -ien | -ien | -ienne | musicien → musicienne |
| -on | -on | -onne | lion → lionne |
| -eur | -eur | -euse/-rice | danseur → danseuse |

**En résumé :** Chaque nom français a un genre (masculin ou féminin). On utilise "le/un" pour le masculin et "la/une" pour le féminin. Pour former le féminin, on ajoute généralement "e", mais il y a des exceptions importantes.

Continue comme ça ! 💪"""
    
    # GRAMMAIRE - PLURIELS (100% COMPLET)
    elif any(mot in message_lower for mot in ['pluriel', 'pluriels', 'singulier', 'les pluriels', 'comment faire le pluriel']):
        return """Excellente question ! ✨

Le pluriel, c'est quand il y a plusieurs choses (plus d'une).

**RÈGLE GÉNÉRALE :** On ajoute un "s" à la fin
- Un chat → Des chats
- Une table → Des tables
- Un livre → Des livres
- Une fleur → Des fleurs
- Un arbre → Des arbres
- Une voiture → Des voitures
- Un ami → Des amis

**EXCEPTIONS IMPORTANTES (100% COMPLET) :**

**1. Mots en -s, -x, -z** : ne changent PAS
   - Un bras → Des bras
   - Un prix → Des prix
   - Un nez → Des nez
   - Un choix → Des choix
   - Un gaz → Des gaz

**2. Mots en -eau, -eu** : ajoutent "x"
   - Un gâteau → Des gâteaux
   - Un feu → Des feux
   - Un bateau → Des bateaux
   - Un cheveu → Des cheveux
   - Un tuyau → Des tuyaux
   - Un jeu → Des jeux

**3. Mots en -al** : deviennent "-aux"
   - Un cheval → Des chevaux
   - Un journal → Des journaux
   - Un animal → Des animaux
   - Un général → Des généraux
   - Un hôpital → Des hôpitaux
   - Un métal → Des métaux

**Exception pour -al :** Certains mots en -al font le pluriel en -als :
   - Un bal → Des bals
   - Un carnaval → Des carnavals
   - Un festival → Des festivals

**4. Mots en -ou** : ajoutent "s" SAUF 7 exceptions
   - Un trou → Des trous
   - Un clou → Des clous
   - Un genou → Des genoux (exception)
   - Un bijou → Des bijoux (exception)
   - Un caillou → Des cailloux (exception)
   - Un chou → Des choux (exception)
   - Un hibou → Des hiboux (exception)
   - Un joujou → Des joujoux (exception)
   - Un pou → Des poux (exception)

**5. Mots en -ail** : deviennent "-aux"
   - Un travail → Des travaux
   - Un vitrail → Des vitraux
   - Un corail → Des coraux

**Exception pour -ail :** Certains mots en -ail font le pluriel en -ails :
   - Un détail → Des détails
   - Un éventail → Des éventails

**6. Mots composés :**
   - Un porte-monnaie → Des porte-monnaie (invariable)
   - Un après-midi → Des après-midi (invariable)
   - Un grand-père → Des grands-pères (les deux mots au pluriel)

**7. Mots étrangers :**
   - Un match → Des matchs (ou matches)
   - Un sandwich → Des sandwiches

**LES ARTICLES CHANGENT AUSSI :**
- Le chat → Les chats
- La table → Les tables
- Un chat → Des chats
- Une table → Des tables

**EXEMPLES CONCRETS (7 exemples) :**
1. "J'ai un chat" → "J'ai des chats" (règle générale)
2. "C'est un gâteau" → "Ce sont des gâteaux" (exception -x)
3. "Je vois un cheval" → "Je vois des chevaux" (exception -aux)
4. "C'est un bijou" → "Ce sont des bijoux" (exception -oux)
5. "Il y a un bras" → "Il y a des bras" (invariable)
6. "C'est un travail" → "Ce sont des travaux" (exception -aux)
7. "J'ai un genou" → "J'ai des genoux" (exception -oux)

**EXERCICES PRATIQUES (5 exercices avec corrigés) :**

**Exercice 1 :** Mets au pluriel (facile)
- Un chat → Des chats
- Une table → Des tables
- Un livre → Des livres
- Une fleur → Des fleurs

**Corrigé :**
- Des chats (règle générale : +s)
- Des tables (règle générale : +s)
- Des livres (règle générale : +s)
- Des fleurs (règle générale : +s)

**Exercice 2 :** Mets au pluriel (moyen)
- Un gâteau → Des gâteaux
- Un cheval → Des chevaux
- Un bijou → Des bijoux
- Un genou → Des genoux

**Corrigé :**
- Des gâteaux (exception : -eau → -eaux)
- Des chevaux (exception : -al → -aux)
- Des bijoux (exception : -ou → -oux)
- Des genoux (exception : -ou → -oux)

**Exercice 3 :** Mets au pluriel (difficile)
- Un animal → Des animaux
- Un hôpital → Des hôpitaux
- Un travail → Des travaux
- Un vitrail → Des vitraux

**Corrigé :**
- Des animaux (exception : -al → -aux)
- Des hôpitaux (exception : -al → -aux)
- Des travaux (exception : -ail → -aux)
- Des vitraux (exception : -ail → -aux)

**Exercice 4 :** Trouve les erreurs
- "Des gateaux" → "Des gâteaux" (il manque l'accent)
- "Des chevals" → "Des chevaux" (mauvaise terminaison)
- "Des bijous" → "Des bijoux" (mauvaise terminaison)

**Exercice 5 :** Écris correctement
- "J'ai plusieurs chat" → "J'ai plusieurs chats"
- "Il y a des gâteau" → "Il y a des gâteaux"
- "Je vois des cheval" → "Je vois des chevaux"

**ASTUCES MNÉMOTECHNIQUES :**
- **Règle générale** : pense à "chat" → "chats" (+s)
- **Exception -x** : pense à "gâteau" → "gâteaux" (+x)
- **Exception -aux** : pense à "cheval" → "chevaux" (-al → -aux)
- **Exception -oux** : pense à "bijou" → "bijoux" (-ou → -oux)
- **Les 7 exceptions en -ou** : "Bijou, caillou, chou, genou, hibou, joujou, pou" → tous en -oux

**TABLEAU RÉCAPITULATIF :**

| Terminaison | Singulier | Pluriel | Exemple |
|-------------|-----------|---------|---------|
| Général | - | -s | chat → chats |
| -s, -x, -z | -s, -x, -z | -s, -x, -z | bras → bras |
| -eau, -eu | -eau, -eu | -eaux, -eux | gâteau → gâteaux |
| -al | -al | -aux | cheval → chevaux |
| -ou | -ou | -ous (sauf 7) | trou → trous |
| -ou (7 exceptions) | -ou | -oux | bijou → bijoux |
| -ail | -ail | -aux | travail → travaux |

**En résumé :** Pour faire le pluriel, on ajoute généralement un "s", mais il y a plusieurs exceptions importantes à retenir : -eau/-eu → -eaux/-eux, -al → -aux, et 7 mots en -ou → -oux.

Continue comme ça ! 💪"""
    
    # GRAMMAIRE - ACCORDS (100% COMPLET)
    elif any(mot in message_lower for mot in ['accord', 'accorder', 'accords', 's\'accorder', 'accord du verbe', 'accord de l\'adjectif']):
        return """Excellente question ! ✨

L'accord, c'est faire correspondre les mots ensemble selon le genre et le nombre.

**ACCORD DU VERBE AVEC LE SUJET (100% COMPLET) :**

Le verbe s'accorde avec son sujet (qui fait l'action).

**Exemples :**
- "Je mange" (je = 1 personne, verbe au singulier)
- "Tu manges" (tu = 1 personne, verbe au singulier)
- "Il/Elle mange" (il/elle = 1 personne, verbe au singulier)
- "Nous mangeons" (nous = plusieurs, verbe au pluriel)
- "Vous mangez" (vous = 1 ou plusieurs, verbe au pluriel)
- "Ils/Elles mangent" (ils/elles = plusieurs, verbe au pluriel)

**Règle :** Le verbe prend la même personne et le même nombre que le sujet.

**ACCORD DE L'ADJECTIF (100% COMPLET) :**

L'adjectif s'accorde avec le nom qu'il décrit (genre et nombre).

**1. Accord en genre (masculin/féminin) :**
- Un grand chat (masculin singulier)
- Une grande table (féminin singulier)
- Un petit garçon (masculin singulier)
- Une petite fille (féminin singulier)
- Un beau livre (masculin singulier)
- Une belle fleur (féminin singulier)

**2. Accord en nombre (singulier/pluriel) :**
- Un grand chat (singulier)
- Des grands chats (masculin pluriel)
- Une grande table (singulier)
- Des grandes tables (féminin pluriel)

**3. Accord complet (genre + nombre) :**
- Un grand chat (masculin singulier)
- Une grande table (féminin singulier)
- Des grands chats (masculin pluriel)
- Des grandes tables (féminin pluriel)

**RÈGLES IMPORTANTES :**

**1. Adjectif avec plusieurs noms :**
- Si tous masculins → adjectif masculin pluriel
  - "Le chat et le chien sont grands" (grands = masculin pluriel)
- Si tous féminins → adjectif féminin pluriel
  - "La table et la chaise sont grandes" (grandes = féminin pluriel)
- Si mixte → adjectif masculin pluriel
  - "Le chat et la table sont grands" (grands = masculin pluriel, car "le masculin l'emporte")

**2. Adjectif après le verbe "être" :**
- "Les chats sont grands" (grands s'accorde avec "chats")
- "Les tables sont grandes" (grandes s'accorde avec "tables")
- "Je suis grand" (grand s'accorde avec "je")
- "Je suis grande" (grande s'accorde avec "je" si féminin)

**3. Adjectif de couleur :**
- Si c'est un nom utilisé comme adjectif → invariable
  - "Des chaussures orange" (orange = nom, invariable)
  - "Des robes marron" (marron = nom, invariable)
- Si c'est un vrai adjectif → s'accorde
  - "Des chaussures rouges" (rouge = adjectif, s'accorde)
  - "Des robes bleues" (bleu = adjectif, s'accorde)

**EXEMPLES CONCRETS (7 exemples) :**
1. "Le chat noir dort" (noir = masculin singulier, comme "chat")
2. "La table noire est grande" (noire = féminin singulier, comme "table")
3. "Les chats noirs dorment" (noirs = masculin pluriel, comme "chats")
4. "Les tables noires sont grandes" (noires = féminin pluriel, comme "tables")
5. "Je suis grand" (grand s'accorde avec "je")
6. "Nous sommes grands" (grands s'accorde avec "nous")
7. "Les fleurs sont belles" (belles s'accorde avec "fleurs")

**EXERCICES PRATIQUES (5 exercices avec corrigés) :**

**Exercice 1 :** Accorde le verbe (facile)
- Je (manger) → Je mange
- Tu (parler) → Tu parles
- Il (dormir) → Il dort
- Nous (aimer) → Nous aimons

**Corrigé :**
- Je mange (1ère personne du singulier)
- Tu parles (2ème personne du singulier)
- Il dort (3ème personne du singulier)
- Nous aimons (1ère personne du pluriel)

**Exercice 2 :** Accorde l'adjectif (moyen)
- Un (grand) chat → Un grand chat
- Une (grand) table → Une grande table
- Des (grand) chats → Des grands chats
- Des (grand) tables → Des grandes tables

**Corrigé :**
- Un grand chat (masculin singulier)
- Une grande table (féminin singulier)
- Des grands chats (masculin pluriel)
- Des grandes tables (féminin pluriel)

**Exercice 3 :** Accorde l'adjectif (difficile)
- Les chats (noir) → Les chats noirs
- Les tables (noir) → Les tables noires
- Les fleurs (beau) → Les fleurs belles
- Les livres (beau) → Les livres beaux

**Corrigé :**
- Les chats noirs (masculin pluriel)
- Les tables noires (féminin pluriel)
- Les fleurs belles (féminin pluriel, beau → belle)
- Les livres beaux (masculin pluriel, beau → beaux)

**Exercice 4 :** Trouve les erreurs
- "Les chats est grand" → "Les chats sont grands" (verbe mal accordé)
- "Une grand table" → "Une grande table" (adjectif mal accordé)
- "Des chat noirs" → "Des chats noirs" (nom mal accordé)

**Exercice 5 :** Accorde correctement
- "Le chat et la table (être) grand" → "Le chat et la table sont grands"
- "Les fleurs (être) belle" → "Les fleurs sont belles"
- "Je (être) content" → "Je suis content" ou "Je suis contente"

**ASTUCES MNÉMOTECHNIQUES :**
- **Verbe** : pense à "je mange" → "nous mangeons" (le verbe change)
- **Adjectif** : pense à "grand chat" → "grande table" (l'adjectif change)
- **Règle d'or** : Le verbe s'accorde avec le sujet, l'adjectif s'accorde avec le nom

**TABLEAU RÉCAPITULATIF :**

| Type d'accord | Règle | Exemple |
|---------------|-------|---------|
| Verbe avec sujet | Même personne et nombre | Je mange, nous mangeons |
| Adjectif avec nom | Même genre et nombre | Grand chat, grande table |
| Plusieurs noms | Masculin l'emporte | Le chat et la table sont grands |
| Après "être" | S'accorde avec le sujet | Je suis grand, nous sommes grands |

**En résumé :** Les mots s'accordent ensemble : le verbe avec son sujet (personne et nombre), l'adjectif avec le nom qu'il décrit (genre et nombre). C'est une règle fondamentale du français !

Continue comme ça ! 💪"""
    
    # ORTHOGRAPHE - ACCENTS (100% COMPLET)
    elif any(mot in message_lower for mot in ['accent', 'accents', 'é', 'è', 'ê', 'à', 'ù', 'ç', 'cédille']):
        return """Excellente question ! ✨

Les accents en français changent la prononciation et parfois le sens.

**LES ACCENTS FRANÇAIS (100% COMPLET) :**

**1. é (accent aigu)** : son "é" fermé
   - Café (boisson chaude)
   - Été (saison chaude)
   - École (lieu d'apprentissage)
   - Éléphant (grand animal)
   - Téléphone (appareil pour appeler)
   - Préférer (aimer mieux)
   - Répéter (dire encore)

**2. è (accent grave)** : son "è" ouvert
   - Père (papa)
   - Mère (maman)
   - Frère (garçon de la famille)
   - Très (beaucoup)
   - Après (ensuite)
   - Près (proche)
   - Dès (à partir de)

**3. ê (accent circonflexe)** : son "è" long
   - Fête (célébration)
   - Tête (partie du corps)
   - Forêt (beaucoup d'arbres)
   - Hôtel (lieu pour dormir)
   - Bête (animal ou stupide)
   - Même (identique)
   - Crêpe (gâteau plat)

**4. à (accent grave sur a)** : préposition
   - À la maison (chez soi)
   - À demain (au revoir)
   - À bientôt (à plus tard)
   - À côté (près)
   - Jusqu'à (jusqu'à ce moment)

**5. ù (accent grave sur u)** : rare, seulement dans "où"
   - Où (question : où vas-tu ?)
   - Où est-ce que... (où se trouve...)
   - D'où (de quel endroit)

**6. ç (cédille)** : change le son de "c" de "k" à "s"
   - Français (langue)
   - Garçon (jeune homme)
   - Leçon (cours)
   - Façon (manière)
   - Reçu (reçu)
   - Commençons (nous commençons)

**RÈGLES IMPORTANTES (100% COMPLET) :**

**Règle du "c" :**
- "c" avant "a, o, u" = son "k" (chat, code, cube, couper)
- "c" avant "e, i" = son "s" (cercle, citron, cire, cible)
- "ç" avant "a, o, u" = son "s" (français, garçon, leçon, façon)

**Quand utiliser chaque accent :**

**Accent aigu (é) :**
- Sur le "e" final : café, été, marché
- Dans les verbes en -er : préférer, répéter

**Accent grave (è) :**
- Sur le "e" : mère, père, frère
- Sur le "a" : à (préposition)
- Sur le "u" : où (adverbe)

**Accent circonflexe (ê) :**
- Remplace souvent un "s" disparu : forêt (anciennement "forest")
- Sur certaines voyelles : hôtel, bête, même

**Cédille (ç) :**
- Uniquement sur le "c" devant "a, o, u"
- Pour avoir le son "s" au lieu de "k"

**EXEMPLES CONCRETS (7 exemples) :**
1. "Je vais au café" (é = accent aigu)
2. "C'est mon père" (è = accent grave)
3. "C'est la fête" (ê = accent circonflexe)
4. "Je vais à la maison" (à = accent grave sur a)
5. "Où vas-tu ?" (ù = accent grave sur u)
6. "Je parle français" (ç = cédille)
7. "C'est un garçon" (ç = cédille)

**EXERCICES PRATIQUES (3 exercices avec corrigés) :**

**Exercice 1 :** Complète avec le bon accent
- C...f... (boisson) → café
- M...r... (maman) → mère
- F...t... (célébration) → fête
- ... la maison → à
- O... vas-tu ? → où
- Fran...ais → français

**Corrigé :**
- Café (é aigu)
- Mère (è grave)
- Fête (ê circonflexe)
- À (à grave)
- Où (ù grave)
- Français (ç cédille)

**Exercice 2 :** Trouve 5 mots avec chaque accent
- Avec é : café, été, école, téléphone, préférer
- Avec è : père, mère, frère, très, après
- Avec ê : fête, tête, forêt, hôtel, bête
- Avec ç : français, garçon, leçon, façon, reçu

**Exercice 3 :** Écris correctement
- "Je vais au cafe" → "Je vais au café"
- "C'est mon pere" → "C'est mon père"
- "C'est la fete" → "C'est la fête"
- "Je parle francais" → "Je parle français"

**ASTUCES MNÉMOTECHNIQUES :**
- **é** : pense à "café" (boisson chaude)
- **è** : pense à "mère" (maman)
- **ê** : pense à "fête" (célébration)
- **à** : pense à "à la maison" (chez soi)
- **ù** : pense à "où" (question de lieu)
- **ç** : pense à "français" (la langue)

**En résumé :** Les accents changent la prononciation et sont essentiels pour bien écrire le français. Il y a 6 types d'accents : é, è, ê, à, ù, et ç.

Continue comme ça ! 💪"""
    
    # VOCABULAIRE - SYNONYMES (100% COMPLET)
    elif any(mot in message_lower for mot in ['synonyme', 'synonymes', 'même sens', 'mot pareil', 'équivalent']):
        return """Excellente question ! ✨

Un synonyme, c'est un mot qui a presque le même sens qu'un autre mot.

**DÉFINITION COMPLÈTE :**
Les synonymes sont des mots différents qui expriment une idée similaire ou proche.

**EXEMPLES DE SYNONYMES (7 groupes) :**

**1. Grand / Énorme / Immense / Gigantesque / Vaste**
- "Une grande maison" = "Une énorme maison" = "Une immense maison"
- Tous signifient "très grand" mais avec des nuances
- Grand = plus grand que la moyenne
- Énorme = très très grand
- Immense = extrêmement grand
- Gigantesque = d'une taille gigantesque
- Vaste = grand en superficie

**2. Petit / Minuscule / Tout petit / Microscopique / Miniature**
- "Un petit chat" = "Un minuscule chat" = "Un tout petit chat"
- Tous signifient "très petit" mais avec des nuances
- Petit = plus petit que la moyenne
- Minuscule = très très petit
- Microscopique = extrêmement petit
- Miniature = version réduite

**3. Joli / Beau / Magnifique / Splendide / Superbe**
- "Une jolie fleur" = "Une belle fleur" = "Une magnifique fleur"
- Tous signifient "très beau" mais avec des nuances
- Joli = agréable à regarder
- Beau = esthétiquement plaisant
- Magnifique = d'une beauté remarquable
- Splendide = d'une beauté éclatante
- Superbe = d'une beauté exceptionnelle

**4. Rapide / Vite / Rapidement / Promptement / En vitesse**
- "Courir vite" = "Courir rapidement" = "Courir promptement"
- Tous signifient "avec vitesse" mais avec des nuances
- Rapide = qui va vite
- Vite = rapidement (adverbe)
- Rapidement = de manière rapide
- Promptement = rapidement et efficacement
- En vitesse = très rapidement

**5. Manger / Déguster / Consommer / Ingérer / Se nourrir**
- "Manger" (simple, courant)
- "Déguster" (manger avec plaisir et attention)
- "Consommer" (plus formel, manger)
- "Ingérer" (médical, avaler)
- "Se nourrir" (manger pour vivre)

**6. Parler / Discuter / Converser / Bavarder / Causer**
- "Parler" (simple, courant)
- "Discuter" (parler de quelque chose)
- "Converser" (parler de manière polie)
- "Bavarder" (parler de manière informelle)
- "Causer" (parler, familier)

**7. Regarder / Observer / Contempler / Examiner / Voir**
- "Regarder" (simple, diriger les yeux)
- "Observer" (regarder attentivement)
- "Contempler" (regarder avec admiration)
- "Examiner" (regarder en détail)
- "Voir" (percevoir avec les yeux)

**POURQUOI UTILISER DES SYNONYMES ?**
- Éviter de répéter le même mot
- Enrichir son vocabulaire
- Exprimer des nuances subtiles
- Rendre son expression plus variée et intéressante
- Adapter son langage au contexte

**ATTENTION - NUANCES IMPORTANTES :**
- Les synonymes ne sont pas toujours exactement identiques
- Ils peuvent avoir des nuances différentes
- Il faut choisir le bon synonyme selon le contexte
- Certains synonymes sont plus formels que d'autres

**EXEMPLES CONCRETS (7 exemples) :**
1. "C'est un grand bâtiment" vs "C'est un immense bâtiment" (immense = plus fort)
2. "Je mange" vs "Je déguste" (déguster = avec plaisir)
3. "Je parle" vs "Je discute" (discuter = échanger)
4. "Je regarde" vs "J'observe" (observer = attentivement)
5. "C'est beau" vs "C'est magnifique" (magnifique = plus fort)
6. "Je cours vite" vs "Je cours rapidement" (même sens)
7. "Un petit chat" vs "Un minuscule chat" (minuscule = plus petit)

**EXERCICES PRATIQUES (5 exercices avec corrigés) :**

**Exercice 1 :** Trouve un synonyme (facile)
- Grand → Énorme, Immense, Gigantesque
- Petit → Minuscule, Tout petit, Microscopique
- Beau → Joli, Magnifique, Splendide
- Vite → Rapidement, Promptement

**Corrigé :**
- Grand : énorme, immense, gigantesque, vaste
- Petit : minuscule, tout petit, microscopique, miniature
- Beau : joli, magnifique, splendide, superbe
- Vite : rapidement, promptement, en vitesse

**Exercice 2 :** Remplace par un synonyme (moyen)
- "C'est une grande maison" → "C'est une immense maison"
- "Je mange" → "Je déguste" (si on veut dire "avec plaisir")
- "Je parle" → "Je discute" (si on veut dire "échanger")
- "Je regarde" → "J'observe" (si on veut dire "attentivement")

**Exercice 3 :** Choisis le bon synonyme selon le contexte (difficile)
- Au restaurant : "Je ... ce plat" → "Je déguste ce plat" (avec plaisir)
- À l'hôpital : "Le patient ... de la nourriture" → "Le patient ingère de la nourriture" (médical)
- Avec des amis : "Je ... avec eux" → "Je bavarde avec eux" (informel)
- En réunion : "Je ... avec mes collègues" → "Je discute avec mes collègues" (formel)

**Exercice 4 :** Trouve les nuances
- Grand vs Énorme : Énorme est plus fort que grand
- Manger vs Déguster : Déguster implique du plaisir
- Regarder vs Observer : Observer est plus attentif
- Parler vs Discuter : Discuter implique un échange

**Exercice 5 :** Écris avec des synonymes variés
- "C'est un grand et beau bâtiment" → "C'est un immense et magnifique bâtiment"
- "Je mange et je parle" → "Je déguste et je discute"
- "Je regarde et je cours vite" → "J'observe et je cours rapidement"

**ASTUCES MNÉMOTECHNIQUES :**
- **Synonymes de "grand"** : pense à "énorme, immense, gigantesque"
- **Synonymes de "petit"** : pense à "minuscule, microscopique"
- **Synonymes de "beau"** : pense à "joli, magnifique, splendide"
- **Synonymes de "manger"** : pense à "déguster, consommer, se nourrir"

**TABLEAU RÉCAPITULATIF :**

| Mot | Synonymes | Nuances |
|-----|-----------|--------|
| Grand | Énorme, Immense, Gigantesque | Intensité croissante |
| Petit | Minuscule, Microscopique | Intensité croissante |
| Beau | Joli, Magnifique, Splendide | Intensité croissante |
| Manger | Déguster, Consommer | Contexte différent |
| Parler | Discuter, Converser, Bavarder | Registre différent |

**En résumé :** Un synonyme est un mot de sens proche. Utiliser des synonymes permet d'enrichir son vocabulaire et d'exprimer des nuances. Attention : tous les synonymes ne sont pas interchangeables, il faut choisir selon le contexte !

Continue comme ça ! 💪"""
    
    # VOCABULAIRE - ANTONYMES
    elif any(mot in message_lower for mot in ['antonyme', 'antonymes', 'contraire', 'opposé', 'mot opposé']):
        return """Excellente question ! ✨

Un antonyme, c'est un mot qui a le sens opposé d'un autre mot.

**Exemples d'antonymes :**

**Grand ↔ Petit**
- "Une grande maison" / "Une petite maison"
- Opposés : grand = pas petit, petit = pas grand

**Bon ↔ Mauvais**
- "Un bon élève" / "Un mauvais élève"
- Opposés : bon = pas mauvais, mauvais = pas bon

**Jourd ↔ Nuit**
- "Le jour" / "La nuit"
- Opposés : jour = lumière, nuit = obscurité

**Chaud ↔ Froid**
- "L'eau chaude" / "L'eau froide"
- Opposés : chaud = pas froid, froid = pas chaud

**Rapide ↔ Lent**
- "Courir rapidement" / "Marcher lentement"
- Opposés : rapide = pas lent, lent = pas rapide

**Heureux ↔ Triste**
- "Je suis heureux" / "Je suis triste"
- Opposés : heureux = pas triste, triste = pas heureux

**Riche ↔ Pauvre**
- "Une personne riche" / "Une personne pauvre"
- Opposés : riche = pas pauvre, pauvre = pas riche

**Pourquoi connaître les antonymes ?**
- Mieux comprendre les mots
- Enrichir son vocabulaire
- Exprimer des contrastes

En résumé : un antonyme est un mot qui a le sens opposé d'un autre mot.

Continue comme ça ! 💪"""
    
    # SYNTAXE - PHRASES
    elif any(mot in message_lower for mot in ['phrase', 'phrases', 'syntaxe', 'structure de phrase', 'construire une phrase']):
        return """Excellente question ! ✨

Une phrase, c'est un groupe de mots qui exprime une idée complète.

**Structure d'une phrase simple :**
Sujet + Verbe + Complément

**Exemples :**
- "Le chat mange." (Sujet : Le chat, Verbe : mange)
- "Je lis un livre." (Sujet : Je, Verbe : lis, Complément : un livre)
- "Tu aimes le français." (Sujet : Tu, Verbe : aimes, Complément : le français)

**Types de phrases :**

1. **Phrase déclarative** : on dit quelque chose
   - "Le chat est noir."
   - "J'aime le français."

2. **Phrase interrogative** : on pose une question
   - "Comment vas-tu ?"
   - "Où est le chat ?"
   - "Qu'est-ce que c'est ?"

3. **Phrase exclamative** : on exprime une émotion
   - "Qu'il est beau !"
   - "C'est magnifique !"

4. **Phrase impérative** : on donne un ordre
   - "Mange ta soupe !"
   - "Viens ici !"

**Ordre des mots :**
En français, l'ordre est généralement :
- Sujet en premier
- Verbe au milieu
- Complément à la fin

**Exemples :**
- "Je mange une pomme." (correct)
- "Mange je une pomme." (incorrect)

En résumé : une phrase a un sujet, un verbe, et parfois un complément, dans un ordre précis.

Continue comme ça ! 💪"""
    
    # PRONONCIATION - PHONÉTIQUE
    elif any(mot in message_lower for mot in ['prononciation', 'prononcer', 'comment prononcer', 'son', 'sons', 'phonétique']):
        return """Excellente question ! ✨

La prononciation, c'est comment on dit les mots à voix haute.

**Les sons en français :**

**Voyelles :**
- **a** : comme dans "chat" (son "a")
- **e** : comme dans "le" (son "e")
- **é** : comme dans "café" (son "é")
- **è** : comme dans "père" (son "è")
- **i** : comme dans "lit" (son "i")
- **o** : comme dans "chat" (son "o")
- **u** : comme dans "lune" (son "u")

**Consonnes :**
- **b** : comme dans "bonjour" (son "b")
- **c** : comme dans "chat" (son "ch") ou "cercle" (son "s")
- **d** : comme dans "dimanche" (son "d")
- **f** : comme dans "fleur" (son "f")
- **g** : comme dans "garçon" (son "g") ou "girafe" (son "j")
- **r** : roulé en français (son "r")

**Règles de prononciation :**

1. **"c" avant "a, o, u"** = son "k"
   - Chat, code, cube

2. **"c" avant "e, i"** = son "s"
   - Cercle, citron

3. **"g" avant "a, o, u"** = son "g"
   - Garçon, gomme

4. **"g" avant "e, i"** = son "j"
   - Girafe, gilet

5. **"ch"** = son "ch"
   - Chat, chien

6. **"ph"** = son "f"
   - Photo, phrase

**Les lettres muettes :**
Parfois, on ne prononce pas la dernière lettre :
- "Chat" (on ne prononce pas le "t")
- "Grand" (on ne prononce pas le "d")
- "Fleur" (on ne prononce pas le "r")

En résumé : la prononciation, c'est comment on dit les mots, et il y a des règles pour les sons.

Continue comme ça ! 💪"""
    
    # TEMPS VERBAUX - PRÉSENT (100% COMPLET)
    elif any(mot in message_lower for mot in ['présent', 'temps présent', 'verbe au présent', 'conjugaison présent']):
        return """Excellente question ! ✨

Le présent, c'est le temps qui exprime une action qui se passe maintenant.

**CONJUGAISON AU PRÉSENT (100% COMPLET) :**

**1. Verbe "manger" au présent :**
- Je mange (maintenant)
- Tu manges (maintenant)
- Il/Elle mange (maintenant)
- Nous mangeons (maintenant)
- Vous mangez (maintenant)
- Ils/Elles mangent (maintenant)

**2. Verbe "être" au présent :**
- Je suis
- Tu es
- Il/Elle est
- Nous sommes
- Vous êtes
- Ils/Elles sont

**3. Verbe "avoir" au présent :**
- J'ai
- Tu as
- Il/Elle a
- Nous avons
- Vous avez
- Ils/Elles ont

**4. Verbe "faire" au présent :**
- Je fais
- Tu fais
- Il/Elle fait
- Nous faisons
- Vous faites
- Ils/Elles font

**5. Verbe "aller" au présent :**
- Je vais
- Tu vas
- Il/Elle va
- Nous allons
- Vous allez
- Ils/Elles vont

**RÈGLE DE FORMATION DU PRÉSENT :**

**Pour les verbes en -er (1er groupe) :**
- On enlève "-er" et on ajoute : -e, -es, -e, -ons, -ez, -ent
- Exemple : manger → je mange, tu manges, il mange, nous mangeons, vous mangez, ils mangent

**Pour les verbes en -ir (2e groupe) :**
- On enlève "-ir" et on ajoute : -is, -is, -it, -issons, -issez, -issent
- Exemple : finir → je finis, tu finis, il finit, nous finissons, vous finissez, ils finissent

**Pour les verbes irréguliers (3e groupe) :**
- Chaque verbe a sa propre conjugaison
- Exemple : être → je suis, avoir → j'ai, faire → je fais

**QUAND UTILISER LE PRÉSENT (100% COMPLET) :**

**1. Action qui se passe maintenant :**
   - "Je mange maintenant." (en ce moment)
   - "Il lit un livre." (maintenant)

**2. Habitude ou action répétée :**
   - "Je mange tous les jours à midi." (habitude)
   - "Tu vas à l'école chaque matin." (habitude)

**3. Vérité générale ou permanente :**
   - "Le soleil brille." (toujours vrai)
   - "L'eau bout à 100°C." (vérité scientifique)

**4. Action future proche (futur proche) :**
   - "Je vais manger dans une heure." (futur proche)
   - "Nous allons partir demain." (futur proche)

**5. Action passée récente (passé récent) :**
   - "Je viens de manger." (passé récent)
   - "Il vient d'arriver." (passé récent)

**EXEMPLES CONCRETS (7 exemples) :**
1. "Je mange maintenant." (action en cours)
2. "Je mange tous les jours." (habitude)
3. "Le soleil brille." (vérité générale)
4. "Je vais manger bientôt." (futur proche)
5. "Je viens de manger." (passé récent)
6. "Il fait beau aujourd'hui." (maintenant)
7. "Nous étudions le français." (habitude ou maintenant)

**EXERCICES PRATIQUES (5 exercices avec corrigés) :**

**Exercice 1 :** Conjugue "manger" au présent (facile)
- Je ... maintenant → Je mange maintenant
- Tu ... tous les jours → Tu manges tous les jours
- Il ... avec nous → Il mange avec nous
- Nous ... ensemble → Nous mangeons ensemble

**Corrigé :**
- Je mange (1ère personne)
- Tu manges (2ème personne)
- Il mange (3ème personne)
- Nous mangeons (1ère personne pluriel)

**Exercice 2 :** Conjugue "être" au présent (moyen)
- Je ... content → Je suis content
- Tu ... là → Tu es là
- Il ... présent → Il est présent
- Nous ... ensemble → Nous sommes ensemble

**Corrigé :**
- Je suis
- Tu es
- Il est
- Nous sommes

**Exercice 3 :** Identifie l'usage du présent (difficile)
- "Je mange maintenant" → Action en cours
- "Je mange tous les jours" → Habitude
- "Le soleil brille" → Vérité générale
- "Je vais manger" → Futur proche

**Exercice 4 :** Complète avec le présent
- "Chaque matin, je ... (se lever) tôt" → "Chaque matin, je me lève tôt" (habitude)
- "Maintenant, il ... (lire) un livre" → "Maintenant, il lit un livre" (action en cours)
- "L'eau ... (bouillir) à 100°C" → "L'eau bout à 100°C" (vérité)

**Exercice 5 :** Écris correctement
- "Je mange maintenant" (correct)
- "Nous mangeons ensemble" (correct)
- "Ils mangent bien" (correct)

**ASTUCES MNÉMOTECHNIQUES :**
- **Présent** : pense à "maintenant" (en ce moment)
- **Terminaisons -er** : -e, -es, -e, -ons, -ez, -ent
- **Terminaisons -ir** : -is, -is, -it, -issons, -issez, -issent
- **Usage** : maintenant, habitude, vérité générale

**TABLEAU RÉCAPITULATIF :**

| Usage | Exemple | Explication |
|-------|---------|-------------|
| Action en cours | Je mange maintenant | Action qui se passe en ce moment |
| Habitude | Je mange tous les jours | Action répétée |
| Vérité générale | Le soleil brille | Toujours vrai |
| Futur proche | Je vais manger | Action très proche |
| Passé récent | Je viens de manger | Action récente |

**En résumé :** Le présent exprime une action qui se passe maintenant, une habitude ou une vérité générale. Il se forme différemment selon les groupes de verbes : -er, -ir, ou irréguliers.

Continue comme ça ! 💪"""
    
    # TEMPS VERBAUX - PASSÉ COMPOSÉ (100% COMPLET)
    elif any(mot in message_lower for mot in ['passé composé', 'passé', 'j\'ai mangé', 'conjugaison passé', 'temps passé']):
        return """Excellente question ! ✨

Le passé composé, c'est le temps qui exprime une action terminée dans le passé.

**STRUCTURE (100% COMPLET) :** Avoir ou Être + participe passé

**AVEC "AVOIR" (la plupart des verbes) :**
- J'ai mangé (action terminée)
- Tu as parlé (action terminée)
- Il/Elle a fini (action terminée)
- Nous avons vu (action terminée)
- Vous avez fait (action terminée)
- Ils/Elles ont dit (action terminée)

**AVEC "ÊTRE" (verbes de mouvement et d'état) :**
- Je suis allé(e) (je suis parti)
- Tu es venu(e) (tu es arrivé)
- Il/Elle est parti(e) (il/elle est parti)
- Nous sommes arrivé(e)s (nous sommes arrivés)
- Vous êtes entré(e)s (vous êtes entrés)
- Ils/Elles sont sorti(e)s (ils sont sortis)

**VERBES QUI UTILISENT "ÊTRE" (liste complète) :**
- Aller, venir, partir, arriver, entrer, sortir
- Monter, descendre, naître, mourir
- Rester, tomber, retourner, revenir
- Passer (par), arriver, décéder

**RÈGLE MNÉMOTECHNIQUE :**
Les verbes qui utilisent "être" sont souvent des verbes de mouvement ou de changement d'état.

**ACCORD AVEC "ÊTRE" (100% COMPLET) :**
Le participe passé s'accorde avec le sujet quand on utilise "être".

**Masculin :**
- "Je suis allé" (masculin)
- "Il est parti" (masculin)
- "Ils sont arrivés" (masculin pluriel)

**Féminin :**
- "Je suis allée" (féminin)
- "Elle est partie" (féminin)
- "Elles sont arrivées" (féminin pluriel)

**Mixte :**
- "Nous sommes allés" (masculin pluriel ou mixte)
- "Nous sommes allées" (féminin pluriel uniquement)

**ACCORD AVEC "AVOIR" :**
Le participe passé s'accorde avec le COD (complément d'objet direct) si le COD est placé AVANT le verbe.

**Exemples :**
- "J'ai mangé une pomme" (COD après, pas d'accord)
- "La pomme que j'ai mangée" (COD avant, accord avec "pomme" = féminin)
- "Les pommes que j'ai mangées" (COD avant, accord avec "pommes" = féminin pluriel)

**QUAND UTILISER LE PASSÉ COMPOSÉ (100% COMPLET) :**

**1. Action terminée dans le passé :**
   - "Hier, j'ai mangé une pomme." (hier, terminé)
   - "L'année dernière, j'ai voyagé." (terminé)

**2. Action précise et datée :**
   - "J'ai fini mes devoirs à 18h." (précis)
   - "Il a téléphoné hier soir." (précis)

**3. Action unique :**
   - "J'ai vu un film." (une fois)
   - "Il a rencontré Marie." (une fois)

**4. Série d'actions terminées :**
   - "J'ai mangé, j'ai bu, puis je suis parti." (série d'actions)

**EXEMPLES CONCRETS (7 exemples) :**
1. "Hier, j'ai mangé au restaurant." (action terminée)
2. "Je suis allé en France l'année dernière." (avec être, mouvement)
3. "Il a plu toute la nuit." (action terminée)
4. "Nous avons étudié le français." (action terminée)
5. "Elle est arrivée à 8h." (avec être, mouvement)
6. "Ils sont partis en vacances." (avec être, mouvement)
7. "J'ai lu ce livre la semaine dernière." (action terminée)

**EXERCICES PRATIQUES (5 exercices avec corrigés) :**

**Exercice 1 :** Conjugue au passé composé avec "avoir" (facile)
- Je (manger) → J'ai mangé
- Tu (parler) → Tu as parlé
- Il (finir) → Il a fini
- Nous (voir) → Nous avons vu

**Corrigé :**
- J'ai mangé (avoir + participe passé)
- Tu as parlé (avoir + participe passé)
- Il a fini (avoir + participe passé)
- Nous avons vu (avoir + participe passé)

**Exercice 2 :** Conjugue au passé composé avec "être" (moyen)
- Je (aller, masculin) → Je suis allé
- Je (aller, féminin) → Je suis allée
- Il (partir) → Il est parti
- Elle (arriver) → Elle est arrivée

**Corrigé :**
- Je suis allé (masculin)
- Je suis allée (féminin, accord)
- Il est parti (masculin)
- Elle est arrivée (féminin, accord)

**Exercice 3 :** Accorde le participe passé (difficile)
- "La pomme que j'ai mangée" (accord avec COD placé avant)
- "Les pommes que j'ai mangées" (accord pluriel)
- "Je suis allé" (masculin) / "Je suis allée" (féminin)
- "Ils sont partis" (masculin) / "Elles sont parties" (féminin)

**Exercice 4 :** Choisis entre "avoir" et "être"
- "J'ai mangé" (avoir, action)
- "Je suis allé" (être, mouvement)
- "Il a plu" (avoir, verbe impersonnel)
- "Elle est arrivée" (être, mouvement)

**Exercice 5 :** Écris correctement
- "Hier je mange" → "Hier, j'ai mangé" (passé composé)
- "Je suis allé en France" (correct)
- "Elle est arrivé" → "Elle est arrivée" (accord féminin)

**ASTUCES MNÉMOTECHNIQUES :**
- **Avoir** : pense à "j'ai mangé" (la plupart des verbes)
- **Être** : pense à "je suis allé" (mouvement)
- **Accord avec être** : toujours s'accorder avec le sujet
- **Accord avec avoir** : s'accorder seulement si COD avant

**TABLEAU RÉCAPITULATIF :**

| Auxiliaire | Verbes | Accord | Exemple |
|------------|--------|--------|---------|
| Avoir | La plupart | Avec COD avant | J'ai mangé / La pomme que j'ai mangée |
| Être | Mouvement, état | Avec sujet | Je suis allé / Je suis allée |

**En résumé :** Le passé composé exprime une action terminée dans le passé. Il se forme avec "avoir" ou "être" + participe passé. Avec "être", le participe passé s'accorde toujours avec le sujet. Avec "avoir", il s'accorde seulement si le COD est placé avant le verbe.

Continue comme ça ! 💪"""
    
    # TEMPS VERBAUX - FUTUR (100% COMPLET)
    elif any(mot in message_lower for mot in ['futur', 'temps futur', 'verbe au futur', 'conjugaison futur', 'demain', 'plus tard']):
        return """Excellente question ! ✨

Le futur, c'est le temps qui exprime une action qui va se passer plus tard.

**CONJUGAISON AU FUTUR (100% COMPLET) :**

**1. Verbe "manger" au futur :**
- Je mangerai (plus tard)
- Tu mangeras (plus tard)
- Il/Elle mangera (plus tard)
- Nous mangerons (plus tard)
- Vous mangerez (plus tard)
- Ils/Elles mangeront (plus tard)

**2. Verbe "être" au futur :**
- Je serai
- Tu seras
- Il/Elle sera
- Nous serons
- Vous serez
- Ils/Elles seront

**3. Verbe "avoir" au futur :**
- J'aurai
- Tu auras
- Il/Elle aura
- Nous aurons
- Vous aurez
- Ils/Elles auront

**4. Verbe "aller" au futur :**
- J'irai
- Tu iras
- Il/Elle ira
- Nous irons
- Vous irez
- Ils/Elles iront

**5. Verbe "faire" au futur :**
- Je ferai
- Tu feras
- Il/Elle fera
- Nous ferons
- Vous ferez
- Ils/Elles feront

**RÈGLE DE FORMATION DU FUTUR :**

**Pour les verbes en -er (1er groupe) :**
- On garde l'infinitif et on ajoute les terminaisons : -ai, -as, -a, -ons, -ez, -ont
- Exemple : manger → je mangerai, tu mangeras, il mangera

**Pour les verbes en -ir (2e groupe) :**
- On garde l'infinitif et on ajoute les terminaisons
- Exemple : finir → je finirai, tu finiras, il finira

**Pour les verbes irréguliers (3e groupe) :**
- Chaque verbe a sa propre conjugaison
- Exemple : être → je serai, avoir → j'aurai, aller → j'irai

**QUAND UTILISER LE FUTUR (100% COMPLET) :**

**1. Action future précise :**
   - "Demain, je mangerai une pomme." (demain, précis)
   - "L'année prochaine, j'irai en France." (futur précis)

**2. Intention ou projet :**
   - "Je vais apprendre le français." (intention)
   - "Nous allons voyager." (projet)

**3. Prédiction :**
   - "Il fera beau demain." (prédiction météo)
   - "Tu réussiras ton examen." (prédiction)

**4. Promesse :**
   - "Je te promets que je viendrai." (promesse)
   - "Je t'aiderai demain." (engagement)

**5. Ordre ou conseil poli :**
   - "Tu feras attention." (conseil)
   - "Vous viendrez à l'heure." (ordre poli)

**FUTUR PROCHE (avec "aller") :**
Le futur proche exprime une action très proche dans le temps.

**Formation :** Aller (présent) + infinitif
- "Je vais manger." (bientôt, très proche)
- "Tu vas partir." (bientôt)
- "Il va arriver." (bientôt)
- "Nous allons étudier." (bientôt)

**Différence entre futur simple et futur proche :**
- Futur simple : "Je mangerai demain" (plus lointain)
- Futur proche : "Je vais manger" (très bientôt, presque maintenant)

**EXEMPLES CONCRETS (7 exemples) :**
1. "Demain, je mangerai au restaurant." (futur simple)
2. "Je vais manger maintenant." (futur proche)
3. "L'année prochaine, j'irai en vacances." (futur simple)
4. "Je serai là à 18h." (futur simple)
5. "Tu auras 20 ans dans un mois." (futur simple)
6. "Nous irons au cinéma ce soir." (futur simple)
7. "Ils feront leurs devoirs demain." (futur simple)

**EXERCICES PRATIQUES (5 exercices avec corrigés) :**

**Exercice 1 :** Conjugue "manger" au futur (facile)
- Je ... demain → Je mangerai demain
- Tu ... plus tard → Tu mangeras plus tard
- Il ... bientôt → Il mangera bientôt
- Nous ... ensemble → Nous mangerons ensemble

**Corrigé :**
- Je mangerai (1ère personne)
- Tu mangeras (2ème personne)
- Il mangera (3ème personne)
- Nous mangerons (1ère personne pluriel)

**Exercice 2 :** Conjugue "être" au futur (moyen)
- Je ... là demain → Je serai là demain
- Tu ... content → Tu seras content
- Il ... présent → Il sera présent
- Nous ... ensemble → Nous serons ensemble

**Corrigé :**
- Je serai
- Tu seras
- Il sera
- Nous serons

**Exercice 3 :** Choisis entre futur simple et futur proche (difficile)
- "Demain, je ... (manger)" → "Demain, je mangerai" (futur simple, plus lointain)
- "Maintenant, je ... (manger)" → "Maintenant, je vais manger" (futur proche, très bientôt)
- "Dans une heure, je ... (partir)" → "Dans une heure, je vais partir" (futur proche)
- "L'année prochaine, je ... (voyager)" → "L'année prochaine, je voyagerai" (futur simple)

**Exercice 4 :** Forme le futur proche
- Je (aller + manger) → Je vais manger
- Tu (aller + partir) → Tu vas partir
- Il (aller + arriver) → Il va arriver
- Nous (aller + étudier) → Nous allons étudier

**Exercice 5 :** Écris correctement
- "Demain je mange" → "Demain je mangerai" (futur)
- "Je vais manger maintenant" (futur proche, correct)
- "L'année prochaine j'irai" → "L'année prochaine, j'irai" (futur, correct)

**ASTUCES MNÉMOTECHNIQUES :**
- **Futur simple** : pense à "demain" (plus lointain)
- **Futur proche** : pense à "maintenant, bientôt" (très proche)
- **Terminaisons futur** : -ai, -as, -a, -ons, -ez, -ont
- **Futur proche** : aller (présent) + infinitif

**TABLEAU RÉCAPITULATIF :**

| Temps | Formation | Exemple | Usage |
|-------|-----------|---------|-------|
| Futur simple | Infinitif + terminaisons | Je mangerai | Action future lointaine |
| Futur proche | Aller (présent) + infinitif | Je vais manger | Action très proche |

**En résumé :** Le futur exprime une action qui va se passer plus tard. Il y a deux formes : le futur simple (plus lointain) et le futur proche (très bientôt). Le futur simple se forme avec l'infinitif + terminaisons, le futur proche avec "aller" au présent + infinitif.

Continue comme ça ! 💪"""
    
    # TEMPS VERBAUX - IMPARFAIT (100% COMPLET)
    elif any(mot in message_lower for mot in ['imparfait', 'temps imparfait', 'verbe à l\'imparfait', 'conjugaison imparfait', 'j\'étais', 'je mangeais']):
        return """Excellente question ! ✨

L'imparfait, c'est le temps qui exprime une action dans le passé qui dure ou une habitude passée.

**CONJUGAISON À L'IMPARFAIT (100% COMPLET) :**

**1. Verbe "manger" à l'imparfait :**
- Je mangeais (avant, pendant longtemps)
- Tu mangeais (avant)
- Il/Elle mangeait (avant)
- Nous mangions (avant)
- Vous mangiez (avant)
- Ils/Elles mangeaient (avant)

**2. Verbe "être" à l'imparfait :**
- J'étais
- Tu étais
- Il/Elle était
- Nous étions
- Vous étiez
- Ils/Elles étaient

**3. Verbe "avoir" à l'imparfait :**
- J'avais
- Tu avais
- Il/Elle avait
- Nous avions
- Vous aviez
- Ils/Elles avaient

**4. Verbe "faire" à l'imparfait :**
- Je faisais
- Tu faisais
- Il/Elle faisait
- Nous faisions
- Vous faisiez
- Ils/Elles faisaient

**RÈGLE DE FORMATION DE L'IMPARFAIT (100% COMPLET) :**

**Pour tous les verbes (réguliers et irréguliers) :**
- On prend le radical du verbe à la 1ère personne du pluriel (nous)
- On enlève "-ons"
- On ajoute les terminaisons : -ais, -ais, -ait, -ions, -iez, -aient

**Exemple avec "manger" :**
- Nous mangeons → radical "mang"
- Je mangeais, tu mangeais, il mangeait, nous mangions, vous mangiez, ils mangeaient

**QUAND UTILISER L'IMPARFAIT (100% COMPLET) :**

**1. Habitude dans le passé :**
   - "Quand j'étais petit, je mangeais tous les jours à midi." (habitude)
   - "Avant, je jouais au football." (habitude passée)

**2. Action qui dure dans le passé :**
   - "Hier, il pleuvait." (action qui durait)
   - "Pendant que je lisais, il dormait." (actions simultanées)

**3. Description dans le passé :**
   - "Il faisait beau." (description)
   - "Le ciel était bleu." (description)

**4. Action en cours interrompue :**
   - "Je lisais quand il est arrivé." (action en cours interrompue)
   - "Il dormait quand le téléphone a sonné." (action interrompue)

**DIFFÉRENCE ENTRE PASSÉ COMPOSÉ ET IMPARFAIT :**

**Passé composé :** Action terminée, précise, unique
- "Hier, j'ai mangé une pomme." (action terminée, précise)

**Imparfait :** Action qui dure, habitude, description
- "Avant, je mangeais des pommes tous les jours." (habitude)
- "Il pleuvait quand je suis sorti." (action qui durait)

**EXEMPLES CONCRETS (7 exemples) :**
1. "Quand j'étais enfant, je jouais tous les jours." (habitude passée)
2. "Hier, il pleuvait pendant que je marchais." (action qui durait)
3. "Le soleil brillait et les oiseaux chantaient." (description)
4. "Je lisais quand il est arrivé." (action interrompue)
5. "Avant, nous allions à l'école à pied." (habitude)
6. "Il faisait froid et je portais un manteau." (description)
7. "Pendant que tu dormais, je travaillais." (actions simultanées)

**EXERCICES PRATIQUES (5 exercices avec corrigés) :**

**Exercice 1 :** Conjugue "manger" à l'imparfait (facile)
- Je ... tous les jours → Je mangeais tous les jours
- Tu ... souvent → Tu mangeais souvent
- Il ... avec nous → Il mangeait avec nous
- Nous ... ensemble → Nous mangions ensemble

**Corrigé :**
- Je mangeais (1ère personne)
- Tu mangeais (2ème personne)
- Il mangeait (3ème personne)
- Nous mangions (1ère personne pluriel)

**Exercice 2 :** Conjugue "être" à l'imparfait (moyen)
- Je ... petit → J'étais petit
- Tu ... content → Tu étais content
- Il ... là → Il était là
- Nous ... ensemble → Nous étions ensemble

**Corrigé :**
- J'étais
- Tu étais
- Il était
- Nous étions

**Exercice 3 :** Choisis entre passé composé et imparfait (difficile)
- "Hier, j'ai mangé" (passé composé, action terminée) vs "Avant, je mangeais" (imparfait, habitude)
- "Il a plu" (passé composé, action terminée) vs "Il pleuvait" (imparfait, action qui durait)
- "Je lisais quand il est arrivé" (imparfait + passé composé, action en cours interrompue)

**Exercice 4 :** Complète avec l'imparfait
- "Quand j'étais petit, je ... (jouer) tous les jours" → "Quand j'étais petit, je jouais tous les jours"
- "Il ... (pleuvoir) quand je suis sorti" → "Il pleuvait quand je suis sorti"
- "Nous ... (aller) à l'école à pied" → "Nous allions à l'école à pied"

**Exercice 5 :** Écris correctement
- "Avant je mange tous les jours" → "Avant, je mangeais tous les jours" (imparfait)
- "Hier il pleut" → "Hier, il pleuvait" (imparfait, action qui durait)
- "Je lis quand il arrive" → "Je lisais quand il est arrivé" (imparfait + passé composé)

**ASTUCES MNÉMOTECHNIQUES :**
- **Imparfait** : pense à "avant, quand j'étais petit" (habitude, durée)
- **Terminaisons** : -ais, -ais, -ait, -ions, -iez, -aient
- **Formation** : radical (nous) + terminaisons
- **Usage** : habitude, action qui dure, description

**TABLEAU RÉCAPITULATIF :**

| Temps | Usage | Exemple |
|-------|-------|---------|
| Imparfait | Habitude passée | Je mangeais tous les jours |
| Imparfait | Action qui dure | Il pleuvait |
| Imparfait | Description | Il faisait beau |
| Passé composé | Action terminée | J'ai mangé hier |

**En résumé :** L'imparfait exprime une action dans le passé qui dure, une habitude passée ou une description. Il se forme avec le radical (nous) + terminaisons -ais, -ais, -ait, -ions, -iez, -aient.

Continue comme ça ! 💪"""
- Nous étions
- Vous étiez
- Ils/Elles étaient

**3. Verbe "avoir" à l'imparfait :**
- J'avais
- Tu avais
- Il/Elle avait
- Nous avions
- Vous aviez
- Ils/Elles avaient

**4. Verbe "faire" à l'imparfait :**
- Je faisais
- Tu faisais
- Il/Elle faisait
- Nous faisions
- Vous faisiez
- Ils/Elles faisaient

**RÈGLE DE FORMATION DE L'IMPARFAIT (100% COMPLET) :**

**Pour tous les verbes (réguliers et irréguliers) :**
- On prend le radical du verbe à la 1ère personne du pluriel (nous)
- On enlève "-ons"
- On ajoute les terminaisons : -ais, -ais, -ait, -ions, -iez, -aient

**Exemple avec "manger" :**
- Nous mangeons → radical "mang"
- Je mangeais, tu mangeais, il mangeait, nous mangions, vous mangiez, ils mangeaient

**QUAND UTILISER L'IMPARFAIT (100% COMPLET) :**

**1. Habitude dans le passé :**
   - "Quand j'étais petit, je mangeais tous les jours à midi." (habitude)
   - "Avant, je jouais au football." (habitude passée)

**2. Action qui dure dans le passé :**
   - "Hier, il pleuvait." (action qui durait)
   - "Pendant que je lisais, il dormait." (actions simultanées)

**3. Description dans le passé :**
   - "Il faisait beau." (description)
   - "Le ciel était bleu." (description)

**4. Action en cours interrompue :**
   - "Je lisais quand il est arrivé." (action en cours interrompue)
   - "Il dormait quand le téléphone a sonné." (action interrompue)

**DIFFÉRENCE ENTRE PASSÉ COMPOSÉ ET IMPARFAIT :**

**Passé composé :** Action terminée, précise, unique
- "Hier, j'ai mangé une pomme." (action terminée, précise)

**Imparfait :** Action qui dure, habitude, description
- "Avant, je mangeais des pommes tous les jours." (habitude)
- "Il pleuvait quand je suis sorti." (action qui durait)

**EXEMPLES CONCRETS (7 exemples) :**
1. "Quand j'étais enfant, je jouais tous les jours." (habitude passée)
2. "Hier, il pleuvait pendant que je marchais." (action qui durait)
3. "Le soleil brillait et les oiseaux chantaient." (description)
4. "Je lisais quand il est arrivé." (action interrompue)
5. "Avant, nous allions à l'école à pied." (habitude)
6. "Il faisait froid et je portais un manteau." (description)
7. "Pendant que tu dormais, je travaillais." (actions simultanées)

**EXERCICES PRATIQUES (5 exercices avec corrigés) :**

**Exercice 1 :** Conjugue "manger" à l'imparfait (facile)
- Je ... tous les jours → Je mangeais tous les jours
- Tu ... souvent → Tu mangeais souvent
- Il ... avec nous → Il mangeait avec nous
- Nous ... ensemble → Nous mangions ensemble

**Corrigé :**
- Je mangeais (1ère personne)
- Tu mangeais (2ème personne)
- Il mangeait (3ème personne)
- Nous mangions (1ère personne pluriel)

**Exercice 2 :** Conjugue "être" à l'imparfait (moyen)
- Je ... petit → J'étais petit
- Tu ... content → Tu étais content
- Il ... là → Il était là
- Nous ... ensemble → Nous étions ensemble

**Corrigé :**
- J'étais
- Tu étais
- Il était
- Nous étions

**Exercice 3 :** Choisis entre passé composé et imparfait (difficile)
- "Hier, j'ai mangé" (passé composé, action terminée) vs "Avant, je mangeais" (imparfait, habitude)
- "Il a plu" (passé composé, action terminée) vs "Il pleuvait" (imparfait, action qui durait)
- "Je lisais quand il est arrivé" (imparfait + passé composé, action en cours interrompue)

**Exercice 4 :** Complète avec l'imparfait
- "Quand j'étais petit, je ... (jouer) tous les jours" → "Quand j'étais petit, je jouais tous les jours"
- "Il ... (pleuvoir) quand je suis sorti" → "Il pleuvait quand je suis sorti"
- "Nous ... (aller) à l'école à pied" → "Nous allions à l'école à pied"

**Exercice 5 :** Écris correctement
- "Avant je mange tous les jours" → "Avant, je mangeais tous les jours" (imparfait)
- "Hier il pleut" → "Hier, il pleuvait" (imparfait, action qui durait)
- "Je lis quand il arrive" → "Je lisais quand il est arrivé" (imparfait + passé composé)

**ASTUCES MNÉMOTECHNIQUES :**
- **Imparfait** : pense à "avant, quand j'étais petit" (habitude, durée)
- **Terminaisons** : -ais, -ais, -ait, -ions, -iez, -aient
- **Formation** : radical (nous) + terminaisons
- **Usage** : habitude, action qui dure, description

**TABLEAU RÉCAPITULATIF :**

| Temps | Usage | Exemple |
|-------|-------|---------|
| Imparfait | Habitude passée | Je mangeais tous les jours |
| Imparfait | Action qui dure | Il pleuvait |
| Imparfait | Description | Il faisait beau |
| Passé composé | Action terminée | J'ai mangé hier |

**En résumé :** L'imparfait exprime une action dans le passé qui dure, une habitude passée ou une description. Il se forme avec le radical (nous) + terminaisons -ais, -ais, -ait, -ions, -iez, -aient.

Continue comme ça ! 💪"""
    
    # GRAMMAIRE - ARTICLES (100% COMPLET)
    elif any(mot in message_lower for mot in ['article', 'articles', 'le la les', 'un une des', 'défini', 'indéfini']):
        return """Excellente question ! ✨

Un article, c'est un petit mot qu'on met avant un nom pour indiquer si on parle d'une chose précise ou générale.

**ARTICLES DÉFINIS (100% COMPLET) :**
On utilise les articles définis quand on sait de quoi on parle (chose précise).

**1. Le** (masculin singulier) :
   - Le chat (un chat précis)
   - Le livre (un livre précis)
   - Le garçon (un garçon précis)
   - Le soleil (le soleil, unique)

**2. La** (féminin singulier) :
   - La table (une table précise)
   - La fleur (une fleur précise)
   - La fille (une fille précise)
   - La lune (la lune, unique)

**3. Les** (pluriel, masculin et féminin) :
   - Les chats (des chats précis)
   - Les tables (des tables précises)
   - Les livres (des livres précis)
   - Les fleurs (des fleurs précises)

**4. L'** (devant voyelle, masculin ou féminin) :
   - L'ami (masculin, devant voyelle)
   - L'école (féminin, devant voyelle)
   - L'homme (masculin, devant voyelle)
   - L'eau (féminin, devant voyelle)

**ARTICLES INDÉFINIS (100% COMPLET) :**
On utilise les articles indéfinis quand on ne sait pas précisément de quoi on parle (chose générale).

**1. Un** (masculin singulier) :
   - Un chat (un chat en général, n'importe quel chat)
   - Un livre (un livre en général)
   - Un garçon (un garçon en général)
   - Un arbre (un arbre en général)

**2. Une** (féminin singulier) :
   - Une table (une table en général)
   - Une fleur (une fleur en général)
   - Une fille (une fille en général)
   - Une voiture (une voiture en général)

**3. Des** (pluriel, masculin et féminin) :
   - Des chats (des chats en général)
   - Des tables (des tables en général)
   - Des livres (des livres en général)
   - Des fleurs (des fleurs en général)

**ARTICLES PARTITIFS (100% COMPLET) :**
On utilise les articles partitifs pour parler d'une partie d'un tout (nourriture, boisson).

**1. Du** (masculin singulier) :
   - Du pain (une partie du pain)
   - Du lait (une partie du lait)
   - Du fromage (une partie du fromage)

**2. De la** (féminin singulier) :
   - De la viande (une partie de la viande)
   - De la confiture (une partie de la confiture)

**3. De l'** (devant voyelle) :
   - De l'eau (une partie de l'eau)
   - De l'huile (une partie de l'huile)

**4. Des** (pluriel) :
   - Des légumes (des légumes en général)
   - Des fruits (des fruits en général)

**ARTICLES CONTRACTÉS (100% COMPLET) :**
Quand "de" ou "à" rencontre un article, ils se contractent.

**1. De + le = du** :
   - "Je viens du magasin" (de + le magasin)
   - "Je parle du chat" (de + le chat)

**2. De + les = des** :
   - "Je viens des magasins" (de + les magasins)
   - "Je parle des chats" (de + les chats)

**3. À + le = au** :
   - "Je vais au magasin" (à + le magasin)
   - "Je pense au chat" (à + le chat)

**4. À + les = aux** :
   - "Je vais aux magasins" (à + les magasins)
   - "Je pense aux chats" (à + les chats)

**EXEMPLES CONCRETS (7 exemples) :**
1. "Le chat dort" (chat précis) vs "Un chat dort" (chat en général)
2. "La table est grande" (table précise) vs "Une table est grande" (table en général)
3. "Les chats dorment" (chats précis) vs "Des chats dorment" (chats en général)
4. "Je mange du pain" (partie du pain)
5. "Je bois de l'eau" (partie de l'eau)
6. "Je vais au magasin" (à + le = au)
7. "Je parle des chats" (de + les = des)

**EXERCICES PRATIQUES (5 exercices avec corrigés) :**

**Exercice 1 :** Choisis le bon article défini (facile)
- ... chat (masculin singulier) → Le chat
- ... table (féminin singulier) → La table
- ... chats (pluriel) → Les chats
- ... ami (devant voyelle) → L'ami

**Corrigé :**
- Le chat (masculin singulier)
- La table (féminin singulier)
- Les chats (pluriel)
- L'ami (devant voyelle)

**Exercice 2 :** Choisis le bon article indéfini (moyen)
- ... chat (masculin singulier) → Un chat
- ... table (féminin singulier) → Une table
- ... chats (pluriel) → Des chats
- ... tables (pluriel) → Des tables

**Corrigé :**
- Un chat (masculin singulier)
- Une table (féminin singulier)
- Des chats (pluriel)
- Des tables (pluriel)

**Exercice 3 :** Choisis le bon article partitif (difficile)
- Je mange ... pain → Je mange du pain
- Je bois ... eau → Je bois de l'eau
- Je mange ... viande → Je mange de la viande
- Je mange ... légumes → Je mange des légumes

**Corrigé :**
- Du pain (masculin singulier)
- De l'eau (féminin singulier, devant voyelle)
- De la viande (féminin singulier)
- Des légumes (pluriel)

**Exercice 4 :** Forme les articles contractés
- Je vais (à + le) magasin → Je vais au magasin
- Je viens (de + le) magasin → Je viens du magasin
- Je vais (à + les) magasins → Je vais aux magasins
- Je viens (de + les) magasins → Je viens des magasins

**Corrigé :**
- Au (à + le)
- Du (de + le)
- Aux (à + les)
- Des (de + les)

**Exercice 5 :** Trouve les erreurs
- "Je vais à le magasin" → "Je vais au magasin" (contraction obligatoire)
- "Je viens de le magasin" → "Je viens du magasin" (contraction obligatoire)
- "Je mange le pain" → "Je mange du pain" (partitif pour nourriture)

**ASTUCES MNÉMOTECHNIQUES :**
- **Défini** : pense à "le chat" (chat précis qu'on connaît)
- **Indéfini** : pense à "un chat" (n'importe quel chat)
- **Partitif** : pense à "du pain" (une partie du pain)
- **Contracté** : pense à "au magasin" (à + le = au)

**TABLEAU RÉCAPITULATIF :**

| Type | Masculin singulier | Féminin singulier | Pluriel |
|------|-------------------|-------------------|---------|
| **Défini** | Le / L' | La / L' | Les |
| **Indéfini** | Un | Une | Des |
| **Partitif** | Du | De la / De l' | Des |
| **Contracté (à+)** | Au | À la / À l' | Aux |
| **Contracté (de+)** | Du | De la / De l' | Des |

**QUAND UTILISER CHAQUE ARTICLE :**

**Articles définis (le, la, les, l') :**
- Quand on parle d'une chose précise qu'on connaît
- Exemple : "Le chat de mon voisin" (chat précis)

**Articles indéfinis (un, une, des) :**
- Quand on parle d'une chose en général
- Exemple : "Un chat dort" (n'importe quel chat)

**Articles partitifs (du, de la, de l', des) :**
- Pour la nourriture et les boissons
- Exemple : "Je mange du pain" (une partie du pain)

**En résumé :** Les articles (le, la, les, un, une, des, du, de la, au, aux) se mettent avant les noms et changent selon le genre, le nombre et le type (défini, indéfini, partitif, contracté).

Continue comme ça ! 💪"""
    
    # GRAMMAIRE - PRONOMS
    elif any(mot in message_lower for mot in ['pronom', 'pronoms', 'je tu il', 'moi toi lui', 'me te le']):
        return """Excellente question ! ✨

Un pronom, c'est un mot qui remplace un nom.

**Pronoms personnels sujets** (qui fait l'action) :
- **Je** (moi) : "Je mange"
- **Tu** (toi) : "Tu manges"
- **Il** (lui, masculin) : "Il mange"
- **Elle** (elle, féminin) : "Elle mange"
- **Nous** (nous) : "Nous mangeons"
- **Vous** (vous) : "Vous mangez"
- **Ils** (eux, masculin) : "Ils mangent"
- **Elles** (elles, féminin) : "Elles mangent"

**Pronoms personnels compléments** (remplace le complément) :
- **Me** (moi) : "Il me voit"
- **Te** (toi) : "Je te vois"
- **Le** (lui, masculin) : "Je le vois"
- **La** (elle, féminin) : "Je la vois"
- **Nous** (nous) : "Il nous voit"
- **Vous** (vous) : "Je vous vois"
- **Les** (eux/elles) : "Je les vois"

**Pronoms toniques** (pour insister) :
- **Moi** : "C'est moi"
- **Toi** : "C'est toi"
- **Lui** : "C'est lui"
- **Elle** : "C'est elle"
- **Nous** : "C'est nous"
- **Vous** : "C'est vous"
- **Eux** : "Ce sont eux"
- **Elles** : "Ce sont elles"

**Exemples :**
- "Je mange une pomme" → "Je la mange" (la = la pomme)
- "Tu vois le chat" → "Tu le vois" (le = le chat)
- "Il aime les fleurs" → "Il les aime" (les = les fleurs)

**Place des pronoms :**
- Avant le verbe : "Je le vois" (pas "Je vois le")
- Sauf à l'impératif : "Vois-le !" (après le verbe)

En résumé : un pronom remplace un nom et change selon qui fait l'action et ce qu'on remplace.

Continue comme ça ! 💪"""
    
    # GRAMMAIRE - ADJECTIFS
    elif any(mot in message_lower for mot in ['adjectif', 'adjectifs', 'grand petit', 'beau joli', 'qualificatif']):
        return """Excellente question ! ✨

Un adjectif, c'est un mot qui décrit un nom.

**Exemples d'adjectifs :**
- **Grand / Petit** : "Un grand chat" / "Un petit chat"
- **Beau / Joli** : "Une belle fleur" / "Une jolie fleur"
- **Bon / Mauvais** : "Un bon élève" / "Un mauvais élève"
- **Rapide / Lent** : "Un chat rapide" / "Un chat lent"
- **Noir / Blanc** : "Un chat noir" / "Un chat blanc"

**L'adjectif s'accorde :**
- Avec le genre (masculin/féminin)
- Avec le nombre (singulier/pluriel)

**Exemples d'accord :**
- "Un grand chat" (masculin singulier)
- "Une grande table" (féminin singulier)
- "Des grands chats" (masculin pluriel)
- "Des grandes tables" (féminin pluriel)

**Place de l'adjectif :**
- **Avant le nom** (la plupart) : "Un grand chat", "Une belle fleur"
- **Après le nom** (quelques-uns) : "Un chat noir", "Une fleur rouge"

**Règle générale :**
- Adjectifs courts : avant le nom (grand, petit, beau, joli, bon, mauvais)
- Adjectifs longs : après le nom (intéressant, magnifique)

**Exemples :**
- "Un grand chat noir" (grand avant, noir après)
- "Une belle fleur rouge" (belle avant, rouge après)

**Attention :**
- "Un bon livre" (bon avant)
- "Un livre intéressant" (intéressant après)

En résumé : un adjectif décrit un nom et s'accorde avec lui (genre et nombre).

Continue comme ça ! 💪"""
    
    # GRAMMAIRE - VERBES IRRÉGULIERS
    elif any(mot in message_lower for mot in ['verbe irrégulier', 'irrégulier', 'verbes irréguliers', 'être avoir faire', 'aller venir']):
        return """Excellente question ! ✨

Un verbe irrégulier, c'est un verbe qui ne suit pas les règles normales de conjugaison.

**Les verbes irréguliers les plus importants :**

**ÊTRE (être) :**
- Je suis, Tu es, Il/Elle est, Nous sommes, Vous êtes, Ils/Elles sont

**AVOIR (avoir) :**
- J'ai, Tu as, Il/Elle a, Nous avons, Vous avez, Ils/Elles ont

**FAIRE (faire) :**
- Je fais, Tu fais, Il/Elle fait, Nous faisons, Vous faites, Ils/Elles font

**ALLER (aller) :**
- Je vais, Tu vas, Il/Elle va, Nous allons, Vous allez, Ils/Elles vont

**VENIR (venir) :**
- Je viens, Tu viens, Il/Elle vient, Nous venons, Vous venez, Ils/Elles viennent

**POUVOIR (pouvoir) :**
- Je peux, Tu peux, Il/Elle peut, Nous pouvons, Vous pouvez, Ils/Elles peuvent

**VOULOIR (vouloir) :**
- Je veux, Tu veux, Il/Elle veut, Nous voulons, Vous voulez, Ils/Elles veulent

**SAVOIR (savoir) :**
- Je sais, Tu sais, Il/Elle sait, Nous savons, Vous savez, Ils/Elles savent

**Pourquoi sont-ils irréguliers ?**
Ils ne suivent pas les règles normales. Par exemple :
- "Je suis" (pas "je être")
- "J'ai" (pas "je avoir")
- "Je fais" (pas "je faire")

**Astuce :**
Il faut les apprendre par cœur car ils ne suivent pas de règle.

En résumé : les verbes irréguliers ne suivent pas les règles normales et doivent être appris par cœur.

Continue comme ça ! 💪"""
    
    # GRAMMAIRE - CONDITIONNEL
    elif any(mot in message_lower for mot in ['conditionnel', 'je voudrais', 'je pourrais', 'je ferais', 'temps conditionnel']):
        return """Excellente question ! ✨

Le conditionnel, c'est le temps qui exprime une action possible ou imaginaire.

**Conjugaison au conditionnel (verbe "manger") :**
- Je mangerais (si j'avais faim)
- Tu mangerais (si tu avais faim)
- Il/Elle mangerait (si il/elle avait faim)
- Nous mangerions (si nous avions faim)
- Vous mangeriez (si vous aviez faim)
- Ils/Elles mangeraient (si ils/elles avaient faim)

**Conjugaison au conditionnel (verbe "être") :**
- Je serais
- Tu serais
- Il/Elle serait
- Nous serions
- Vous seriez
- Ils/Elles seraient

**Conjugaison au conditionnel (verbe "avoir") :**
- J'aurais
- Tu aurais
- Il/Elle aurait
- Nous aurions
- Vous auriez
- Ils/Elles auraient

**Quand utiliser le conditionnel ?**
1. **Politesse** :
   - "Je voudrais un café, s'il vous plaît." (poli)
   - "Pourriez-vous m'aider ?" (poli)

2. **Souhait** :
   - "J'aimerais voyager." (souhait)
   - "Je voudrais être riche." (souhait)

3. **Condition** :
   - "Si j'avais de l'argent, j'achèterais une voiture." (condition)
   - "Si tu venais, je serais content." (condition)

**Exemples :**
- "Je voudrais un livre." (politesse)
- "Si j'étais riche, je voyagerais." (condition)
- "J'aimerais apprendre le français." (souhait)

En résumé : le conditionnel exprime une action possible, un souhait ou la politesse.

Continue comme ça ! 💪"""
    
    # GRAMMAIRE - PRÉPOSITIONS
    elif any(mot in message_lower for mot in ['préposition', 'prépositions', 'à de dans', 'sur sous', 'avec sans']):
        return """Excellente question ! ✨

Une préposition, c'est un petit mot qui relie des mots ensemble.

**Les prépositions les plus importantes :**

**À** (direction, lieu) :
- "Je vais à Paris." (direction)
- "Je suis à la maison." (lieu)

**DE** (origine, possession) :
- "Je viens de France." (origine)
- "Le livre de Marie." (possession)

**DANS** (à l'intérieur) :
- "Le chat est dans la boîte." (à l'intérieur)
- "Je vais dans le magasin." (à l'intérieur)

**SUR** (au-dessus) :
- "Le livre est sur la table." (au-dessus)
- "Je marche sur le trottoir." (au-dessus)

**SOUS** (en dessous) :
- "Le chat est sous la table." (en dessous)
- "Je mets mes chaussures sous le lit." (en dessous)

**AVEC** (accompagnement) :
- "Je vais avec mon ami." (accompagnement)
- "Je mange avec une fourchette." (moyen)

**SANS** (absence) :
- "Je vais sans mon ami." (absence)
- "Café sans sucre." (absence)

**POUR** (but) :
- "Je travaille pour gagner de l'argent." (but)
- "C'est pour toi." (destiné à)

**PAR** (moyen) :
- "Je voyage par train." (moyen)
- "Je passe par Paris." (chemin)

**Exemples :**
- "Je vais à l'école." (à = direction)
- "Le livre de Paul." (de = possession)
- "Je suis dans la voiture." (dans = à l'intérieur)

En résumé : les prépositions relient les mots et indiquent des relations (lieu, temps, but, etc.).

Continue comme ça ! 💪"""
    
    # GRAMMAIRE - NOMBRES
    elif any(mot in message_lower for mot in ['nombre', 'nombres', 'chiffre', 'chiffres', 'compter', 'un deux trois']):
        return """Excellente question ! ✨

Les nombres en français, c'est compter de 0 à l'infini.

**Les nombres de 0 à 20 :**
- 0 : zéro
- 1 : un (masculin) / une (féminin)
- 2 : deux
- 3 : trois
- 4 : quatre
- 5 : cinq
- 6 : six
- 7 : sept
- 8 : huit
- 9 : neuf
- 10 : dix
- 11 : onze
- 12 : douze
- 13 : treize
- 14 : quatorze
- 15 : quinze
- 16 : seize
- 17 : dix-sept
- 18 : dix-huit
- 19 : dix-neuf
- 20 : vingt

**Les dizaines :**
- 20 : vingt
- 30 : trente
- 40 : quarante
- 50 : cinquante
- 60 : soixante
- 70 : soixante-dix
- 80 : quatre-vingts
- 90 : quatre-vingt-dix
- 100 : cent

**Exemples :**
- 21 : vingt et un
- 22 : vingt-deux
- 30 : trente
- 45 : quarante-cinq
- 67 : soixante-sept
- 99 : quatre-vingt-dix-neuf
- 100 : cent

**Attention :**
- "Un" devient "une" au féminin : "Une pomme" (pas "un pomme")
- "Vingt" et "cent" prennent un "s" au pluriel : "Quatre-vingts", "Deux cents"

En résumé : les nombres en français suivent des règles spécifiques, surtout pour 70, 80 et 90.

Continue comme ça ! 💪"""
    
    # EXPRESSIONS COURANTES - VIE QUOTIDIENNE
    elif any(mot in message_lower for mot in ['expression', 'expressions', 'phrase utile', 'phrases utiles', 'comment dire', 'comment demander']):
        return """Excellente question ! ✨

Les expressions courantes, ce sont des phrases qu'on utilise souvent dans la vie quotidienne.

**Expressions de politesse :**
- "S'il vous plaît" / "S'il te plaît" (please)
- "Merci" (thank you)
- "De rien" (you're welcome)
- "Excusez-moi" / "Excuse-moi" (excuse me)
- "Pardon" (sorry)
- "Je suis désolé(e)" (I'm sorry)

**Demander quelque chose :**
- "Je voudrais..." (I would like...)
- "Pouvez-vous..." / "Peux-tu..." (Can you...)
- "Est-ce que je peux..." (Can I...)
- "Auriez-vous..." (Would you have...)

**Répondre :**
- "Oui" (yes)
- "Non" (no)
- "D'accord" (okay)
- "Bien sûr" (of course)
- "Pas de problème" (no problem)

**Se présenter :**
- "Je m'appelle..." (My name is...)
- "Enchanté(e)" (Nice to meet you)
- "Comment allez-vous ?" / "Comment vas-tu ?" (How are you?)
- "Ça va" (I'm fine)

**Au restaurant :**
- "L'addition, s'il vous plaît" (The bill, please)
- "Je voudrais commander" (I would like to order)
- "C'est délicieux" (It's delicious)

**Au magasin :**
- "Combien ça coûte ?" (How much does it cost?)
- "Je cherche..." (I'm looking for...)
- "Avez-vous..." (Do you have...)

En résumé : les expressions courantes sont des phrases utiles pour communiquer dans la vie quotidienne.

Continue comme ça ! 💪"""
    
    # VOCABULAIRE - FAMILLE
    elif any(mot in message_lower for mot in ['famille', 'mère', 'père', 'frère', 'sœur', 'parents', 'grand-parents']):
        return """Excellente question ! ✨

La famille, ce sont les personnes avec qui on vit ou qui sont proches de nous.

**Les membres de la famille :**
- **Père / Papa** : le père
- **Mère / Maman** : la mère
- **Parents** : le père et la mère ensemble
- **Frère** : garçon de la famille
- **Sœur** : fille de la famille
- **Grand-père / Papi** : le père du père ou de la mère
- **Grand-mère / Mamie** : la mère du père ou de la mère
- **Grands-parents** : le grand-père et la grand-mère
- **Oncle** : frère du père ou de la mère
- **Tante** : sœur du père ou de la mère
- **Cousin** : fils de l'oncle ou de la tante
- **Cousine** : fille de l'oncle ou de la tante
- **Fils** : garçon enfant
- **Fille** : fille enfant
- **Enfant** : fils ou fille

**Exemples :**
- "Mon père s'appelle Jean." (My father is called Jean)
- "J'ai deux sœurs." (I have two sisters)
- "Mes grands-parents habitent à Paris." (My grandparents live in Paris)

**Attention aux genres :**
- "Mon frère" (masculin)
- "Ma sœur" (féminin)
- "Mes parents" (pluriel)

En résumé : la famille, ce sont les personnes proches de nous (père, mère, frères, sœurs, etc.).

Continue comme ça ! 💪"""
    
    # VOCABULAIRE - CORPS HUMAIN
    elif any(mot in message_lower for mot in ['corps', 'tête', 'main', 'pied', 'bras', 'jambe', 'yeux', 'nez', 'bouche']):
        return """Excellente question ! ✨

Le corps humain, ce sont toutes les parties de notre corps.

**Les parties du corps :**
- **Tête** : partie supérieure du corps
- **Yeux** : pour voir
- **Nez** : pour sentir
- **Bouche** : pour manger et parler
- **Oreilles** : pour entendre
- **Cou** : entre la tête et le corps
- **Épaules** : en haut des bras
- **Bras** : membres supérieurs
- **Mains** : au bout des bras (5 doigts)
- **Doigts** : sur les mains
- **Poitrine** : devant le haut du corps
- **Ventre** : devant le bas du corps
- **Dos** : derrière le corps
- **Jambes** : membres inférieurs
- **Genoux** : au milieu des jambes
- **Pieds** : au bout des jambes
- **Orteils** : sur les pieds

**Exemples :**
- "J'ai mal à la tête." (I have a headache)
- "Je lève les bras." (I raise my arms)
- "Je marche avec mes pieds." (I walk with my feet)

**Attention aux genres :**
- "Le bras" (masculin)
- "La main" (féminin)
- "Les yeux" (pluriel, masculin)
- "Les jambes" (pluriel, féminin)

En résumé : le corps humain a beaucoup de parties (tête, bras, jambes, etc.).

Continue comme ça ! 💪"""
    
    # VOCABULAIRE - NOURRITURE
    elif any(mot in message_lower for mot in ['nourriture', 'manger', 'aliment', 'aliments', 'repas', 'pain', 'eau', 'viande', 'légume', 'fruit']):
        return """Excellente question ! ✨

La nourriture, ce sont les aliments qu'on mange pour vivre.

**Les aliments de base :**
- **Pain** : aliment fait avec de la farine
- **Eau** : boisson essentielle
- **Lait** : boisson blanche
- **Œufs** : aliments ronds
- **Fromage** : aliment fait avec du lait
- **Beurre** : pour tartiner

**Les fruits :**
- **Pomme** : fruit rond et rouge/vert
- **Banane** : fruit jaune et long
- **Orange** : fruit orange
- **Raisin** : petits fruits ronds
- **Fraise** : fruit rouge

**Les légumes :**
- **Carotte** : légume orange
- **Tomate** : légume rouge
- **Salade** : légume vert
- **Pomme de terre** : légume blanc
- **Oignon** : légume blanc/jaune

**La viande :**
- **Poulet** : viande de poulet
- **Bœuf** : viande de vache
- **Porc** : viande de cochon
- **Poisson** : viande de poisson

**Les repas :**
- **Petit-déjeuner** : repas du matin
- **Déjeuner** : repas de midi
- **Dîner** : repas du soir
- **Goûter** : collation de l'après-midi

**Exemples :**
- "Je mange une pomme." (I eat an apple)
- "Je bois de l'eau." (I drink water)
- "Le petit-déjeuner est important." (Breakfast is important)

En résumé : la nourriture, ce sont tous les aliments qu'on mange (fruits, légumes, viande, pain, etc.).

Continue comme ça ! 💪"""
    
    # SITUATIONS - AU RESTAURANT
    elif any(mot in message_lower for mot in ['restaurant', 'commander', 'menu', 'addition', 'serveur', 'manger au restaurant']):
        return """Excellente question ! ✨

Au restaurant, on va manger et on doit savoir parler français.

**Phrases utiles au restaurant :**

**Arriver :**
- "Bonjour, une table pour deux, s'il vous plaît." (Hello, a table for two, please)
- "Avez-vous une table libre ?" (Do you have a free table?)

**Regarder le menu :**
- "Je voudrais voir le menu, s'il vous plaît." (I would like to see the menu, please)
- "Qu'est-ce que vous recommandez ?" (What do you recommend?)

**Commander :**
- "Je voudrais..." (I would like...)
- "Pour moi, je prends..." (For me, I'll have...)
- "Je voudrais commander..." (I would like to order...)

**Pendant le repas :**
- "C'est délicieux !" (It's delicious!)
- "L'eau, s'il vous plaît." (Water, please)
- "Du pain, s'il vous plaît." (Bread, please)

**Payer :**
- "L'addition, s'il vous plaît." (The bill, please)
- "Je peux payer par carte ?" (Can I pay by card?)
- "C'est combien ?" (How much is it?)

**Vocabulaire :**
- **Menu** : liste des plats
- **Serveur / Serveuse** : personne qui sert
- **Plat** : nourriture
- **Entrée** : premier plat
- **Plat principal** : plat principal
- **Dessert** : dernier plat (sucré)
- **Addition** : facture à payer

**Exemple de conversation :**
Serveur : "Bonjour, que désirez-vous ?"
Vous : "Bonjour, je voudrais un steak-frites, s'il vous plaît."
Serveur : "Très bien, et comme boisson ?"
Vous : "Une eau, s'il vous plaît."

En résumé : au restaurant, on utilise des phrases polies pour commander et payer.

Continue comme ça ! 💪"""
    
    # SITUATIONS - AU MAGASIN
    elif any(mot in message_lower for mot in ['magasin', 'acheter', 'vendre', 'prix', 'coûter', 'payer', 'faire les courses']):
        return """Excellente question ! ✨

Au magasin, on va acheter des choses et on doit savoir parler français.

**Phrases utiles au magasin :**

**Entrer :**
- "Bonjour !" (Hello!)
- "Je cherche..." (I'm looking for...)

**Demander :**
- "Avez-vous..." (Do you have...)
- "Où se trouve..." (Where is...)
- "Combien ça coûte ?" (How much does it cost?)
- "C'est combien ?" (How much is it?)

**Répondre :**
- "Oui, nous avons..." (Yes, we have...)
- "Non, désolé(e), nous n'avons pas..." (No, sorry, we don't have...)
- "C'est..." (It's...)

**Acheter :**
- "Je voudrais acheter..." (I would like to buy...)
- "Je prends celui-ci." (I'll take this one)
- "C'est tout, merci." (That's all, thank you)

**Payer :**
- "Je peux payer par carte ?" (Can I pay by card?)
- "Je paie en espèces." (I pay in cash)
- "Voici..." (Here is...)

**Vocabulaire :**
- **Magasin** : lieu où on achète
- **Acheter** : donner de l'argent pour avoir quelque chose
- **Vendre** : donner quelque chose contre de l'argent
- **Prix** : coût, montant d'argent
- **Coûter** : avoir un prix
- **Payer** : donner de l'argent
- **Caisse** : endroit où on paie
- **Carte bancaire** : carte pour payer
- **Espèces** : argent en billets et pièces

**Exemple de conversation :**
Vous : "Bonjour, avez-vous du pain ?"
Vendeur : "Oui, c'est là-bas."
Vous : "Combien ça coûte ?"
Vendeur : "2 euros."
Vous : "Je le prends, merci."

En résumé : au magasin, on utilise des phrases pour demander, acheter et payer.

Continue comme ça ! 💪"""
    
    # VOCABULAIRE - COULEURS
    elif any(mot in message_lower for mot in ['couleur', 'couleurs', 'rouge', 'bleu', 'vert', 'jaune', 'noir', 'blanc']):
        return """Excellente question ! ✨

Les couleurs, ce sont les différentes teintes qu'on voit.

**Les couleurs principales :**
- **Rouge** : couleur du sang, de la tomate
- **Bleu** : couleur du ciel, de la mer
- **Vert** : couleur de l'herbe, des arbres
- **Jaune** : couleur du soleil, du citron
- **Orange** : couleur de l'orange (fruit)
- **Violet** : couleur du raisin
- **Rose** : couleur de la rose (fleur)
- **Noir** : couleur de la nuit
- **Blanc** : couleur de la neige, du lait
- **Gris** : couleur entre noir et blanc
- **Marron** : couleur du chocolat, du bois
- **Beige** : couleur claire, sable

**Exemples :**
- "Le ciel est bleu." (The sky is blue)
- "La tomate est rouge." (The tomato is red)
- "L'herbe est verte." (The grass is green)

**Attention :**
Les adjectifs de couleur s'accordent avec le nom :
- "Une voiture rouge" (féminin)
- "Un livre rouge" (masculin)
- "Des voitures rouges" (pluriel)

**Sauf :**
- Les couleurs qui viennent d'un nom ne s'accordent pas :
  - "Une voiture orange" (orange vient du fruit)
  - "Une voiture marron" (marron vient du fruit)

En résumé : les couleurs décrivent l'apparence des choses (rouge, bleu, vert, etc.).

Continue comme ça ! 💪"""
    
    # VOCABULAIRE - JOURS ET MOIS
    elif any(mot in message_lower for mot in ['jour', 'jours', 'semaine', 'mois', 'lundi', 'mardi', 'janvier', 'février', 'date']):
        return """Excellente question ! ✨

Les jours et les mois, c'est pour dire la date et organiser le temps.

**Les jours de la semaine :**
- **Lundi** : premier jour de la semaine
- **Mardi** : deuxième jour
- **Mercredi** : troisième jour
- **Jeudi** : quatrième jour
- **Vendredi** : cinquième jour
- **Samedi** : sixième jour
- **Dimanche** : septième jour (week-end)

**Les mois de l'année :**
- **Janvier** : premier mois
- **Février** : deuxième mois
- **Mars** : troisième mois
- **Avril** : quatrième mois
- **Mai** : cinquième mois
- **Juin** : sixième mois
- **Juillet** : septième mois
- **Août** : huitième mois
- **Septembre** : neuvième mois
- **Octobre** : dixième mois
- **Novembre** : onzième mois
- **Décembre** : douzième mois

**Dire la date :**
- "Aujourd'hui, c'est lundi." (Today is Monday)
- "Nous sommes le 15 janvier." (Today is January 15th)
- "C'est quel jour ?" (What day is it?)

**Vocabulaire :**
- **Aujourd'hui** : ce jour
- **Demain** : le jour suivant
- **Hier** : le jour précédent
- **Semaine** : 7 jours
- **Mois** : environ 30 jours
- **Année** : 12 mois

**Exemples :**
- "Je vais au cinéma lundi." (I'm going to the cinema on Monday)
- "Mon anniversaire est en janvier." (My birthday is in January)
- "Nous sommes en 2024." (We are in 2024)

En résumé : les jours et les mois servent à organiser le temps et dire les dates.

Continue comme ça ! 💪"""
    
    # VOCABULAIRE - VÊTEMENTS
    elif any(mot in message_lower for mot in ['vêtement', 'vêtements', 'habits', 'chemise', 'pantalon', 'robe', 'chaussures', 's\'habiller']):
        return """Excellente question ! ✨

Les vêtements, ce sont les habits qu'on porte sur le corps.

**Les vêtements :**
- **Chemise** : vêtement du haut avec des boutons
- **T-shirt** : vêtement du haut simple
- **Pantalon** : vêtement du bas (2 jambes)
- **Robe** : vêtement pour les femmes (haut et bas ensemble)
- **Jupe** : vêtement du bas pour les femmes
- **Chaussures** : pour les pieds
- **Chaussettes** : pour les pieds (sous les chaussures)
- **Manteau** : vêtement chaud pour l'hiver
- **Veste** : vêtement du haut
- **Chapeau** : pour la tête
- **Gants** : pour les mains

**Exemples :**
- "Je porte une chemise bleue." (I'm wearing a blue shirt)
- "J'ai besoin de chaussures." (I need shoes)
- "Il fait froid, je mets un manteau." (It's cold, I'm putting on a coat)

**Verbes :**
- **Porter** : avoir sur soi
- **Mettre** : mettre sur soi
- **Enlever** : retirer
- **S'habiller** : mettre ses vêtements

En résumé : les vêtements, ce sont les habits qu'on porte (chemise, pantalon, chaussures, etc.).

Continue comme ça ! 💪"""
    
    # VOCABULAIRE - MAISON
    elif any(mot in message_lower for mot in ['maison', 'appartement', 'chambre', 'cuisine', 'salle de bain', 'salon', 'pièce']):
        return """Excellente question ! ✨

La maison, c'est l'endroit où on habite.

**Les pièces de la maison :**
- **Chambre** : pièce pour dormir
- **Cuisine** : pièce pour cuisiner
- **Salon** : pièce pour se détendre
- **Salle de bain** : pièce pour se laver
- **Salle à manger** : pièce pour manger
- **Bureau** : pièce pour travailler
- **Cave** : pièce sous la maison
- **Grenier** : pièce sous le toit

**Les meubles :**
- **Lit** : pour dormir
- **Table** : pour manger ou travailler
- **Chaise** : pour s'asseoir
- **Armoire** : pour ranger les vêtements
- **Réfrigérateur** : pour garder la nourriture froide
- **Four** : pour cuisiner
- **Canapé** : grand siège pour le salon
- **Télévision** : pour regarder

**Exemples :**
- "Je dors dans ma chambre." (I sleep in my bedroom)
- "Je cuisine dans la cuisine." (I cook in the kitchen)
- "Je regarde la télévision dans le salon." (I watch TV in the living room)

En résumé : la maison a plusieurs pièces (chambre, cuisine, salon, etc.) avec des meubles.

Continue comme ça ! 💪"""
    
    # VOCABULAIRE - TRANSPORT
    elif any(mot in message_lower for mot in ['transport', 'voiture', 'bus', 'train', 'avion', 'vélo', 'marcher', 'aller']):
        return """Excellente question ! ✨

Le transport, c'est comment on se déplace d'un endroit à un autre.

**Les moyens de transport :**
- **Voiture** : véhicule à 4 roues
- **Bus** : grand véhicule pour beaucoup de personnes
- **Train** : véhicule sur des rails
- **Métro** : train sous la terre
- **Avion** : véhicule qui vole
- **Vélo** : véhicule à 2 roues avec pédales
- **Moto** : véhicule à 2 roues avec moteur
- **Bateau** : véhicule sur l'eau
- **Marcher** : aller à pied

**Verbes :**
- **Aller** : se déplacer
- **Venir** : arriver
- **Partir** : quitter un endroit
- **Arriver** : atteindre un endroit
- **Prendre** : utiliser un transport
- "Je prends le bus." (I take the bus)

**Exemples :**
- "Je vais à Paris en train." (I go to Paris by train)
- "Je prends ma voiture pour aller au travail." (I take my car to go to work)
- "Je marche jusqu'à l'école." (I walk to school)

**Questions :**
- "Comment allez-vous à Paris ?" (How do you go to Paris?)
- "Je vais en voiture." (I go by car)

En résumé : le transport, ce sont les moyens de se déplacer (voiture, bus, train, etc.).

Continue comme ça ! 💪"""
    
    # VOCABULAIRE - MÉTIERS
    elif any(mot in message_lower for mot in ['métier', 'métiers', 'travail', 'profession', 'médecin', 'professeur', 'ingénieur', 'cuisinier']):
        return """Excellente question ! ✨

Un métier, c'est le travail qu'on fait pour gagner de l'argent.

**Les métiers :**
- **Professeur / Professeure** : enseigne aux élèves
- **Médecin** : soigne les malades
- **Infirmier / Infirmière** : aide le médecin
- **Ingénieur** : travaille avec la technique
- **Cuisinier / Cuisinière** : prépare la nourriture
- **Serveur / Serveuse** : sert dans un restaurant
- **Vendeur / Vendeuse** : vend dans un magasin
- **Policier / Policière** : protège les gens
- **Pompier** : éteint les incendies
- **Avocat / Avocate** : défend les gens en justice
- **Journaliste** : écrit dans les journaux
- **Artiste** : crée des œuvres d'art
- **Étudiant / Étudiante** : apprend à l'école

**Questions :**
- "Quel est votre métier ?" (What is your job?)
- "Que faites-vous dans la vie ?" (What do you do for a living?)
- "Je suis professeur." (I am a teacher)

**Exemples :**
- "Mon père est médecin." (My father is a doctor)
- "Je veux devenir ingénieur." (I want to become an engineer)
- "Elle travaille comme cuisinière." (She works as a cook)

En résumé : un métier, c'est le travail qu'on fait (professeur, médecin, cuisinier, etc.).

Continue comme ça ! 💪"""
    
    # VOCABULAIRE - ÉCOLE
    elif any(mot in message_lower for mot in ['école', 'classe', 'élève', 'professeur', 'cours', 'devoir', 'examen', 'apprendre']):
        return """Excellente question ! ✨

L'école, c'est l'endroit où on apprend.

**Vocabulaire de l'école :**
- **École** : lieu où on apprend
- **Classe** : groupe d'élèves
- **Élève** : personne qui apprend
- **Professeur / Professeure** : personne qui enseigne
- **Cours** : leçon
- **Devoir** : travail à faire à la maison
- **Examen** : test pour vérifier ce qu'on sait
- **Cahier** : livre pour écrire
- **Stylo** : pour écrire
- **Crayon** : pour écrire (avec mine)
- **Gomme** : pour effacer
- **Règle** : pour tracer des lignes
- **Cartable** : sac pour porter les affaires

**Les matières :**
- **Français** : langue française
- **Mathématiques** : calculs, nombres
- **Histoire** : le passé
- **Géographie** : les pays, les villes
- **Sciences** : expériences
- **Anglais** : langue anglaise

**Phrases utiles :**
- "Je vais à l'école." (I go to school)
- "J'ai cours de français." (I have French class)
- "Je fais mes devoirs." (I do my homework)
- "J'ai un examen demain." (I have an exam tomorrow)

**Exemples :**
- "Mon professeur de français est très gentil." (My French teacher is very nice)
- "J'aime les mathématiques." (I like mathematics)
- "Je dois faire mes devoirs." (I must do my homework)

En résumé : l'école, c'est où on apprend avec un professeur, des cours et des devoirs.

Continue comme ça ! 💪"""
    
    # GRAMMAIRE - NÉGATION
    elif any(mot in message_lower for mot in ['négation', 'ne pas', 'ne...pas', 'pas de', 'jamais', 'rien', 'personne']):
        return """Excellente question ! ✨

La négation, c'est dire "non" ou "pas".

**La négation avec "ne...pas" :**
- "Je ne mange pas." (I don't eat)
- "Tu ne parles pas." (You don't speak)
- "Il ne vient pas." (He doesn't come)

**Règle :**
On met "ne" avant le verbe et "pas" après le verbe.

**Avec "être" et "avoir" :**
- "Je ne suis pas fatigué." (I'm not tired)
- "Je n'ai pas de livre." (I don't have a book)

**Attention :**
- "Ne" devient "n'" devant une voyelle :
  - "Je n'aime pas" (pas "je ne aime pas")
  - "Il n'est pas" (pas "il ne est pas")

**Autres négations :**
- **Ne...jamais** : jamais
  - "Je ne vais jamais au cinéma." (I never go to the cinema)
- **Ne...rien** : rien
  - "Je ne comprends rien." (I understand nothing)
- **Ne...personne** : personne
  - "Je ne vois personne." (I see nobody)
- **Ne...plus** : plus
  - "Je ne mange plus." (I don't eat anymore)

**Exemples :**
- "Je ne veux pas de café." (I don't want coffee)
- "Il n'a jamais vu Paris." (He has never seen Paris)
- "Nous ne faisons rien." (We do nothing)

En résumé : la négation, c'est dire "non" avec "ne...pas" ou d'autres mots (jamais, rien, personne).

Continue comme ça ! 💪"""
    
    # GRAMMAIRE - QUESTIONS
    elif any(mot in message_lower for mot in ['question', 'questions', 'comment poser', 'interrogatif', 'qui', 'quoi', 'où', 'quand', 'pourquoi', 'comment']):
        return """Excellente question ! ✨

Les questions, c'est demander quelque chose.

**Les mots interrogatifs :**
- **Qui ?** : qui (personne)
  - "Qui est-ce ?" (Who is it?)
- **Quoi ? / Qu'est-ce que ?** : quoi (chose)
  - "Qu'est-ce que c'est ?" (What is it?)
- **Où ?** : où (lieu)
  - "Où vas-tu ?" (Where are you going?)
- **Quand ?** : quand (temps)
  - "Quand arrives-tu ?" (When do you arrive?)
- **Pourquoi ?** : pourquoi (raison)
  - "Pourquoi es-tu triste ?" (Why are you sad?)
- **Comment ?** : comment (manière)
  - "Comment vas-tu ?" (How are you?)
- **Combien ?** : combien (quantité)
  - "Combien ça coûte ?" (How much does it cost?)

**Former une question :**

1. **Avec "est-ce que" :**
   - "Est-ce que tu viens ?" (Are you coming?)
   - "Est-ce qu'il mange ?" (Is he eating?)

2. **Inversion :**
   - "Viens-tu ?" (Are you coming?)
   - "Mange-t-il ?" (Is he eating?)

3. **Avec intonation :**
   - "Tu viens ?" (You're coming?) - on monte la voix à la fin

**Exemples :**
- "Où habites-tu ?" (Where do you live?)
- "Quand pars-tu ?" (When are you leaving?)
- "Comment t'appelles-tu ?" (What's your name?)
- "Pourquoi pleures-tu ?" (Why are you crying?)

En résumé : les questions, c'est demander avec des mots interrogatifs (qui, quoi, où, quand, pourquoi, comment).

Continue comme ça ! 💪"""
    
    # GRAMMAIRE - COMPLÉMENTS D'OBJET
    elif any(mot in message_lower for mot in ['complément', 'compléments', 'objet direct', 'objet indirect', 'cod', 'coi']):
        return """Excellente question ! ✨

Un complément, c'est un mot qui complète le verbe.

**Complément d'objet direct (COD) :**
C'est ce sur quoi porte directement l'action.

**Exemples :**
- "Je mange **une pomme**." (une pomme = COD)
- "Tu lis **un livre**." (un livre = COD)
- "Il voit **le chat**." (le chat = COD)

**Comment trouver le COD ?**
On pose la question "Quoi ?" ou "Qui ?" après le verbe :
- "Je mange **quoi ?**" → "Une pomme" (COD)
- "Tu vois **qui ?**" → "Le chat" (COD)

**Complément d'objet indirect (COI) :**
C'est ce sur quoi porte indirectement l'action, avec une préposition (à, de).

**Exemples :**
- "Je parle **à mon ami**." (à mon ami = COI)
- "Tu penses **à tes parents**." (à tes parents = COI)
- "Il téléphone **à sa mère**." (à sa mère = COI)

**Comment trouver le COI ?**
On pose la question "À qui ?" ou "À quoi ?" après le verbe :
- "Je parle **à qui ?**" → "À mon ami" (COI)

**Différence :**
- COD : directement, sans préposition
  - "Je mange une pomme." (pas de préposition)
- COI : indirectement, avec préposition (à, de)
  - "Je parle à mon ami." (avec "à")

**Exemples :**
- "Je donne un livre **à Marie**." (un livre = COD, à Marie = COI)
- "Tu écris une lettre **à ton ami**." (une lettre = COD, à ton ami = COI)

En résumé : le complément complète le verbe (COD directement, COI avec préposition).

Continue comme ça ! 💪"""
    
    # GRAMMAIRE - ADVERBES
    elif any(mot in message_lower for mot in ['adverbe', 'adverbes', 'bien', 'mal', 'vite', 'lentement', 'beaucoup', 'peu']):
        return """Excellente question ! ✨

Un adverbe, c'est un mot qui modifie un verbe, un adjectif ou un autre adverbe.

**Les adverbes de manière (comment) :**
- **Bien** : bien
  - "Je parle bien français." (I speak French well)
- **Mal** : mal
  - "Il chante mal." (He sings badly)
- **Vite** : rapidement
  - "Elle court vite." (She runs fast)
- **Lentement** : doucement
  - "Il marche lentement." (He walks slowly)
- **Facilement** : sans difficulté
  - "J'apprends facilement." (I learn easily)

**Les adverbes de quantité :**
- **Beaucoup** : beaucoup
  - "J'aime beaucoup le français." (I like French a lot)
- **Peu** : peu
  - "Je comprends peu." (I understand little)
- **Assez** : suffisamment
  - "J'ai assez mangé." (I've eaten enough)
- **Trop** : trop
  - "C'est trop cher." (It's too expensive)

**Les adverbes de temps :**
- **Aujourd'hui** : aujourd'hui
  - "Je vais à Paris aujourd'hui." (I'm going to Paris today)
- **Demain** : demain
  - "Je viens demain." (I'm coming tomorrow)
- **Hier** : hier
  - "J'étais là hier." (I was there yesterday)
- **Maintenant** : maintenant
  - "Je mange maintenant." (I'm eating now)
- **Souvent** : souvent
  - "Je vais souvent au cinéma." (I often go to the cinema)
- **Toujours** : toujours
  - "Je suis toujours content." (I'm always happy)
- **Jamais** : jamais
  - "Je ne vais jamais là-bas." (I never go there)

**Les adverbes de lieu :**
- **Ici** : ici
  - "Je suis ici." (I'm here)
- **Là** : là
  - "Je vais là." (I'm going there)
- **Partout** : partout
  - "Je cherche partout." (I'm looking everywhere)

**Place de l'adverbe :**
- Après le verbe : "Je parle bien."
- Avant l'adjectif : "C'est très beau."
- Après le COD : "Je mange beaucoup de pain."

En résumé : un adverbe modifie un verbe, un adjectif ou un autre adverbe (bien, mal, vite, beaucoup, etc.).

Continue comme ça ! 💪"""
    
    # GRAMMAIRE - CONJONCTIONS
    elif any(mot in message_lower for mot in ['conjonction', 'conjonctions', 'et', 'ou', 'mais', 'donc', 'car', 'parce que']):
        return """Excellente question ! ✨

Une conjonction, c'est un mot qui relie deux phrases ou deux mots.

**Les conjonctions principales :**
- **Et** : et (addition)
  - "Je mange et je bois." (I eat and I drink)
- **Ou** : ou (choix)
  - "Tu veux du café ou du thé ?" (Do you want coffee or tea?)
- **Mais** : mais (opposition)
  - "Je suis fatigué mais je continue." (I'm tired but I continue)
- **Donc** : donc (conséquence)
  - "Il pleut, donc je reste à la maison." (It's raining, so I stay home)
- **Car / Parce que** : car / parce que (cause)
  - "Je reste car il pleut." (I stay because it's raining)
  - "Je reste parce qu'il pleut." (I stay because it's raining)

**Autres conjonctions :**
- **Quand** : quand (temps)
  - "Je viens quand tu veux." (I come when you want)
- **Si** : si (condition)
  - "Si tu viens, je serai content." (If you come, I'll be happy)
- **Comme** : comme (comparaison)
  - "Il est grand comme son père." (He is tall like his father)
- **Puisque** : puisque (cause)
  - "Puisque tu es là, restons." (Since you're here, let's stay)

**Exemples :**
- "Je mange **et** je bois." (et = addition)
- "Tu veux du café **ou** du thé ?" (ou = choix)
- "Je suis fatigué **mais** je continue." (mais = opposition)
- "Il pleut, **donc** je reste." (donc = conséquence)
- "Je reste **parce qu'**il pleut." (parce que = cause)

**Attention :**
- "Parce que" devient "parce qu'" devant une voyelle :
  - "Parce qu'il pleut" (pas "parce que il pleut")

En résumé : une conjonction relie des mots ou des phrases (et, ou, mais, donc, parce que).

Continue comme ça ! 💪"""
    
    # Détection de questions générales "c'est quoi", "qu'est-ce que"
    elif any(mot in message_lower for mot in ['c\'est quoi', 'qu\'est-ce que', 'qu\'est ce que', 'explique', 'définition']):
        # Extrait le sujet de la question
        sujet = message
        for mot in ['c\'est quoi', 'qu\'est-ce que', 'qu\'est ce que', 'explique', 'définition', 'définis', 'définir']:
            sujet = sujet.replace(mot, '').strip()
        sujet = sujet.replace('?', '').strip()
        sujet_lower = sujet.lower().strip()
        
        # LISTE TRÈS COMPLÈTE pour détecter les questions sur le français
        mots_francais_complets = [
            'français', 'francais', 'france', 'langue', 'française', 'francaise',
            'verbe', 'verbes', 'conjugaison', 'conjuguer', 'conjugue', 'conjugué', 'conjuguée',
            'grammaire', 'orthographe', 'vocabulaire', 'syntaxe', 'prononciation', 'phonétique',
            'accent', 'accents', 'é', 'è', 'ê', 'à', 'ù', 'ç', 'cédille',
            'pluriel', 'pluriels', 'singulier', 'genres', 'genre', 'masculin', 'féminin',
            'article', 'articles', 'le', 'la', 'les', 'un', 'une', 'des',
            'pronom', 'pronoms', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
            'adjectif', 'adjectifs', 'grand', 'petit', 'beau', 'joli',
            'synonyme', 'synonymes', 'antonyme', 'antonymes', 'contraire', 'opposé',
            'phrase', 'phrases', 'syntaxe', 'structure',
            'temps', 'présent', 'passé', 'futur', 'imparfait', 'conditionnel', 'subjonctif',
            'passé composé', 'plus-que-parfait', 'futur antérieur',
            'être', 'avoir', 'faire', 'aller', 'venir', 'pouvoir', 'vouloir', 'savoir',
            'irrégulier', 'irréguliers', 'régulier', 'réguliers',
            'préposition', 'prépositions', 'à', 'de', 'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par',
            'nombre', 'nombres', 'chiffre', 'chiffres', 'compter', 'un', 'deux', 'trois',
            'écrire', 'lire', 'parler', 'écouter', 'comprendre', 'apprendre',
            'mot', 'mots', 'lettre', 'lettres', 'alphabet', 'abc',
            'règle', 'règles', 'exception', 'exceptions',
            'accord', 'accords', 'accorder', 's\'accorder',
            'complément', 'compléments', 'sujet', 'sujets',
            'déclaration', 'interrogation', 'exclamation', 'impératif',
            'voyelle', 'voyelles', 'consonne', 'consonnes',
            'son', 'sons', 'prononcer', 'dire', 'parler',
            # Nouveaux ajouts
            'expression', 'expressions', 'phrase utile', 'phrases utiles',
            'famille', 'mère', 'père', 'frère', 'sœur', 'parents', 'grand-parents',
            'corps', 'tête', 'main', 'pied', 'bras', 'jambe', 'yeux', 'nez', 'bouche',
            'nourriture', 'manger', 'aliment', 'aliments', 'repas', 'pain', 'eau', 'viande', 'légume', 'fruit',
            'restaurant', 'commander', 'menu', 'addition', 'serveur',
            'magasin', 'acheter', 'vendre', 'prix', 'coûter', 'payer',
            'couleur', 'couleurs', 'rouge', 'bleu', 'vert', 'jaune', 'noir', 'blanc',
            'jour', 'jours', 'semaine', 'mois', 'lundi', 'mardi', 'janvier', 'février', 'date',
            'vêtement', 'vêtements', 'habits', 'chemise', 'pantalon', 'robe', 'chaussures',
            'maison', 'appartement', 'chambre', 'cuisine', 'salle de bain', 'salon',
            'transport', 'voiture', 'bus', 'train', 'avion', 'vélo',
            'métier', 'métiers', 'travail', 'profession', 'médecin', 'ingénieur', 'cuisinier',
            'école', 'classe', 'élève', 'cours', 'devoir', 'examen',
            'négation', 'ne pas', 'ne...pas', 'jamais', 'rien', 'personne',
            'question', 'questions', 'interrogatif', 'qui', 'quoi', 'où', 'quand', 'pourquoi', 'comment',
            'objet direct', 'objet indirect', 'cod', 'coi',
            'adverbe', 'adverbes', 'bien', 'mal', 'vite', 'lentement', 'beaucoup', 'peu',
            'conjonction', 'conjonctions', 'et', 'ou', 'mais', 'donc', 'car', 'parce que'
        ]
        
        # Si c'est une question sur le français, répondre directement avec une réponse complète
        if any(mot_fr in sujet_lower for mot_fr in mots_francais_complets):
            # Essayer de donner une réponse spécifique selon le sujet
            if any(m in sujet_lower for m in ['verbe', 'conjugaison', 'conjuguer']):
                return """Excellente question ! ✨

Un verbe, c'est un mot qui exprime une action ou un état.

**Exemples de verbes :**
- Manger (action)
- Dormir (action)
- Être (état)
- Avoir (état)

**La conjugaison, c'est changer le verbe selon :**
- Qui fait l'action (je, tu, il, elle, nous, vous, ils, elles)
- Quand ça se passe (présent, passé, futur)

**Exemple avec "manger" au présent :**
- Je mange
- Tu manges
- Il/Elle mange
- Nous mangeons
- Vous mangez
- Ils/Elles mangent

**Les groupes de verbes :**
- 1er groupe : verbes en -er (manger, parler, aimer)
- 2e groupe : verbes en -ir (finir, choisir)
- 3e groupe : verbes irréguliers (être, avoir, faire)

En résumé : un verbe exprime une action ou un état, et on le conjugue selon qui fait l'action et quand.

Continue comme ça ! 💪"""
            elif any(m in sujet_lower for m in ['pluriel', 'pluriels']):
                return """Excellente question ! ✨

Le pluriel, c'est quand il y a plusieurs choses (plus d'une).

**Règle générale :** On ajoute un "s" à la fin
- Un chat → Des chats
- Une table → Des tables
- Un livre → Des livres

**Exceptions importantes :**
1. **Mots en -s, -x, -z** : ne changent pas
   - Un bras → Des bras
   - Un prix → Des prix
   - Un nez → Des nez

2. **Mots en -eau, -eu** : ajoutent "x"
   - Un gâteau → Des gâteaux
   - Un feu → Des feux

3. **Mots en -al** : deviennent "-aux"
   - Un cheval → Des chevaux
   - Un journal → Des journaux

4. **Mots en -ou** : ajoutent "s" (sauf bijou, caillou, chou, genou, hibou, joujou, pou)
   - Un trou → Des trous
   - Un bijou → Des bijoux (exception)

**Les articles changent aussi :**
- Le chat → Les chats
- La table → Les tables
- Un chat → Des chats

En résumé : pour faire le pluriel, on ajoute généralement un "s", mais il y a des exceptions.

Continue comme ça ! 💪"""
            else:
                # Réponse générale mais complète pour le français
                return f"""Excellente question ! ✨

Tu me demandes : "{message}"

Je comprends que tu veux apprendre sur "{sujet}". C'est une question sur le français, et je peux t'aider directement !

**Je suis un professeur de français EXCELLENT et je peux t'expliquer :**

✅ **Grammaire française :**
- Verbes et conjugaison (tous les temps : présent, passé composé, imparfait, futur, conditionnel)
- Genres (masculin/féminin)
- Pluriels et accords
- Articles (le, la, les, un, une, des)
- Pronoms (je, tu, il, elle, nous, vous, ils, elles)
- Adjectifs et leur accord
- Verbes irréguliers (être, avoir, faire, aller, venir, pouvoir, vouloir, savoir)
- Prépositions (à, de, dans, sur, sous, avec, sans, pour, par)

✅ **Orthographe :**
- Accents (é, è, ê, à, ù, ç)
- Règles d'orthographe
- Pluriels et exceptions

✅ **Vocabulaire :**
- Synonymes et antonymes
- Familles de mots
- Expressions courantes

✅ **Syntaxe :**
- Structure des phrases
- Types de phrases (déclarative, interrogative, exclamative, impérative)
- Ordre des mots

✅ **Prononciation :**
- Sons et phonétique
- Règles de prononciation
- Lettres muettes

✅ **Nombres :**
- De 0 à 100 et plus
- Règles spécifiques (70, 80, 90)

**Pose-moi ta question de manière plus précise, par exemple :**
- "C'est quoi un verbe ?"
- "Qu'est-ce que la conjugaison ?"
- "Explique-moi le pluriel"
- "C'est quoi un synonyme ?"
- "Qu'est-ce que le passé composé ?"
- "Comment utiliser les prépositions ?"
- "Comment compter en français ?"

Je suis là pour t'aider à apprendre le français ! Pose-moi ta question maintenant et je te répondrai directement ! 📚✨"""
        
        # Pour les autres sujets, donner une réponse plus utile
        return f"""Excellente question ! ✨

Tu me demandes : "{message}"

Je comprends que tu veux apprendre sur "{sujet}". 

**Je peux t'aider !**

Pour te donner une explication complète et détaillée, j'aurais besoin d'une clé API OpenAI configurée. Mais je peux quand même répondre à beaucoup de questions !

**Pose-moi ta question de manière plus précise, par exemple :**
- "C'est quoi..." (suivi du sujet)
- "Explique-moi..." (suivi du sujet)
- "Comment faire..." (suivi de l'action)

**Si c'est une question sur le français, je peux répondre directement !**
- Grammaire, conjugaison, orthographe, vocabulaire, syntaxe, prononciation
- Tous les temps verbaux, les genres, les pluriels, les accords
- Les accents, les articles, les pronoms, les adjectifs
- Et bien plus encore !

**Pour d'autres sujets :**
Configure une clé API OpenAI dans le fichier .env pour avoir des explications encore plus détaillées.

Mais pour le français, je peux répondre directement ! Pose-moi ta question maintenant ! 📚✨"""
    
    # Réponse par défaut - RÉPONSE PÉDAGOGIQUE MÊME SANS API
    else:
        # Essayer de comprendre et répondre quand même
        message_clean = message.lower().strip()
        
        # Détecter si c'est une question sur le français - LISTE TRÈS COMPLÈTE
        mots_francais = [
            'français', 'francais', 'france', 'langue', 'française', 'francaise',
            'verbe', 'verbes', 'conjugaison', 'conjuguer', 'conjugue', 'conjugué', 'conjuguée',
            'grammaire', 'orthographe', 'vocabulaire', 'syntaxe', 'prononciation', 'phonétique',
            'accent', 'accents', 'é', 'è', 'ê', 'à', 'ù', 'ç', 'cédille',
            'pluriel', 'pluriels', 'singulier', 'genres', 'genre', 'masculin', 'féminin',
            'article', 'articles', 'le', 'la', 'les', 'un', 'une', 'des',
            'pronom', 'pronoms', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
            'adjectif', 'adjectifs', 'grand', 'petit', 'beau', 'joli',
            'synonyme', 'synonymes', 'antonyme', 'antonymes', 'contraire', 'opposé',
            'phrase', 'phrases', 'syntaxe', 'structure',
            'temps', 'présent', 'passé', 'futur', 'imparfait', 'conditionnel', 'subjonctif',
            'passé composé', 'plus-que-parfait', 'futur antérieur',
            'être', 'avoir', 'faire', 'aller', 'venir', 'pouvoir', 'vouloir', 'savoir',
            'irrégulier', 'irréguliers', 'régulier', 'réguliers',
            'préposition', 'prépositions', 'à', 'de', 'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par',
            'nombre', 'nombres', 'chiffre', 'chiffres', 'compter', 'un', 'deux', 'trois',
            'écrire', 'lire', 'parler', 'écouter', 'comprendre', 'apprendre',
            'mot', 'mots', 'lettre', 'lettres', 'alphabet', 'abc',
            'règle', 'règles', 'exception', 'exceptions',
            'accord', 'accords', 'accorder', 's\'accorder',
            'complément', 'compléments', 'sujet', 'sujets',
            'déclaration', 'interrogation', 'exclamation', 'impératif',
            'voyelle', 'voyelles', 'consonne', 'consonnes',
            'son', 'sons', 'prononcer', 'dire', 'parler'
        ]
        
        # Vérifier si c'est une question sur le français
        est_question_francais = any(mot_fr in message_clean for mot_fr in mots_francais)
        
        # Si c'est une question sur le français, répondre directement
        if est_question_francais:
            return f"""Excellente question ! ✨

Tu me demandes : "{message}"

Je comprends ta question ! C'est une question sur le français, et je peux t'aider directement !

**Je suis un professeur de français COMPÉTENT et je peux t'expliquer :**

✅ **Grammaire française :**
- Verbes et conjugaison (tous les temps : présent, passé composé, imparfait, futur, conditionnel)
- Genres (masculin/féminin)
- Pluriels et accords
- Articles (le, la, les, un, une, des)
- Pronoms (je, tu, il, elle, nous, vous, ils, elles)
- Adjectifs et leur accord
- Verbes irréguliers (être, avoir, faire, aller, venir, pouvoir, vouloir, savoir)
- Prépositions (à, de, dans, sur, sous, avec, sans, pour, par)

✅ **Orthographe :**
- Accents (é, è, ê, à, ù, ç)
- Règles d'orthographe
- Pluriels et exceptions

✅ **Vocabulaire :**
- Synonymes et antonymes
- Familles de mots
- Expressions courantes

✅ **Syntaxe :**
- Structure des phrases
- Types de phrases (déclarative, interrogative, exclamative, impérative)
- Ordre des mots

✅ **Prononciation :**
- Sons et phonétique
- Règles de prononciation
- Lettres muettes

✅ **Nombres :**
- De 0 à 100 et plus
- Règles spécifiques (70, 80, 90)

**Pose-moi ta question de manière plus précise, par exemple :**
- "C'est quoi un verbe ?"
- "Comment conjuguer au présent ?"
- "Qu'est-ce que le pluriel ?"
- "Comment utiliser les accents ?"
- "C'est quoi un synonyme ?"
- "Qu'est-ce que le passé composé ?"
- "Comment utiliser les prépositions ?"
- "Comment compter en français ?"

Je suis là pour t'aider à apprendre le français ! Pose-moi ta question maintenant et je te répondrai directement ! 📚✨"""
        
        # Si la question contient des mots-clés simples, donner une réponse de base
        elif any(mot in message_clean for mot in ['quoi', 'qu\'est', 'c\'est', 'explique', 'définis', 'comment', 'pourquoi']):
            return f"""Excellente question ! ✨

Tu me demandes : "{message}"

Je comprends ta question ! 

**Je peux t'aider !**

Pose-moi ta question de manière plus précise, par exemple :
- "C'est quoi le français ?"
- "Explique-moi comment saluer les gens"
- "Comment faire..."
- "Qu'est-ce que..."

**Si c'est une question sur le français, je peux répondre directement !**
- Grammaire, conjugaison, orthographe, vocabulaire, syntaxe, prononciation
- Tous les temps verbaux, les genres, les pluriels, les accords
- Les accents, les articles, les pronoms, les adjectifs
- Et bien plus encore !

**Pour d'autres sujets :**
Configure une clé API OpenAI dans le fichier .env pour avoir des explications encore plus détaillées.

Mais pour le français, je peux répondre directement ! Pose-moi ta question maintenant ! 📚✨"""
        else:
            return f"""Excellente question ! ✨

Je suis ton Professeur IA de Français et je réponds 100% en français.

Tu me demandes : "{message[:200]}{'...' if len(message) > 200 else ''}"

Je comprends ta question ! 

**Je peux t'aider en français !**

**Si c'est une question sur le français, je peux répondre directement !**
Je peux t'expliquer :
- La grammaire française (verbes, conjugaison, genres, pluriels, accords)
- L'orthographe (accents, règles d'orthographe)
- Le vocabulaire (synonymes, antonymes)
- La syntaxe (structure des phrases)
- La prononciation (sons, règles de prononciation)
- Les temps verbaux (présent, passé composé, imparfait, futur, conditionnel)
- Les verbes irréguliers, les prépositions, les nombres
- Et bien plus encore !

**Pose-moi ta question de manière plus précise, par exemple :**
- "C'est quoi un verbe ?"
- "Comment conjuguer au présent ?"
- "Qu'est-ce que le pluriel ?"
- "Comment utiliser les accents ?"

**Pour d'autres sujets :**
Configure une clé API OpenAI dans le fichier .env pour avoir des explications encore plus détaillées.

Mais pour le français, je peux répondre directement ! Pose-moi ta question maintenant ! 📚✨"""
    
def get_response_huggingface(message):
    """Utilise Hugging Face pour générer une réponse (alternative gratuite)"""
    try:
        API_URL = "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium"
        headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
        
        # Pour Hugging Face, on utilise un modèle de dialogue
        payload = {
            "inputs": {
                "past_user_inputs": [],
                "generated_responses": [],
                "text": f"{PROFESSEUR_PROMPT}\n\nQuestion de l'élève: {message}\nRéponse du professeur:"
            }
        }
        
        response = requests.post(API_URL, headers=headers, json=payload)
        result = response.json()
        
        if 'generated_text' in result:
            return result['generated_text'].split("Réponse du professeur:")[-1].strip()
        else:
            return "Cher(e) élève, laisse-moi réfléchir un instant... Pour une meilleure expérience, configure une clé API OpenAI."
    except Exception as e:
        return f"Cher(e) élève, il y a eu un petit souci technique : {str(e)}. Peux-tu réessayer ?"

@app.route('/')
def index():
    """Page principale"""
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    """Endpoint pour recevoir les messages et retourner les réponses"""
    try:
        data = request.json
        message = data.get('message', '')
        conversation_history = data.get('history', [])
        session_id = data.get('session_id', str(uuid.uuid4()))
        
        if not message:
            return jsonify({'error': 'Message vide'}), 400
        
        # Choisir quelle API utiliser
        if OPENAI_API_KEY and OPENAI_API_KEY != "sk-votre_cle_ici":
            response = get_response_openai(message, conversation_history)
        elif HUGGINGFACE_API_KEY:
            response = get_response_huggingface(message)
        else:
            # Mode démonstration avec réponses basiques mais pédagogiques
            response = get_response_demo(message)
        
        # Sauvegarder dans la base de données
        conn = get_db_connection()
        if conn:
            try:
                cur = conn.cursor()
                
                # Créer ou mettre à jour la session
                cur.execute("""
                    INSERT INTO ia_edu_sessions (session_id, last_activity)
                    VALUES (%s, CURRENT_TIMESTAMP)
                    ON CONFLICT (session_id) 
                    DO UPDATE SET last_activity = CURRENT_TIMESTAMP
                """, (session_id,))
                
                # Sauvegarder le message et la réponse
                cur.execute("""
                    INSERT INTO ia_edu_messages (session_id, user_message, bot_response)
                    VALUES (%s, %s, %s)
                """, (session_id, message, response))
                
                # Sauvegarder aussi dans la table conversations (pour historique simple)
                cur.execute("""
                    INSERT INTO ia_edu_conversations (user_message, bot_response)
                    VALUES (%s, %s)
                """, (message, response))
                
                conn.commit()
                cur.close()
                conn.close()
            except Exception as db_error:
                print(f"Erreur lors de la sauvegarde en base: {db_error}")
                # On continue même si la sauvegarde échoue
        
        return jsonify({
            'response': response,
            'success': True,
            'session_id': session_id
        })
    
    except Exception as e:
        return jsonify({
            'error': f'Erreur : {str(e)}',
            'success': False
        }), 500

@app.route('/history/<session_id>', methods=['GET'])
def get_history(session_id):
    """Récupère l'historique d'une session"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Erreur de connexion à la base de données'}), 500
        
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT user_message, bot_response, created_at
            FROM ia_edu_messages
            WHERE session_id = %s
            ORDER BY created_at ASC
        """, (session_id,))
        
        messages = cur.fetchall()
        cur.close()
        conn.close()
        
        return jsonify({
            'messages': [dict(msg) for msg in messages],
            'success': True
        })
    
    except Exception as e:
        return jsonify({
            'error': f'Erreur : {str(e)}',
            'success': False
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000, threaded=True)

