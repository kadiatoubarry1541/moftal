# Base de données complète de cours de français professionnels
# Organisée par niveaux : DÉBUTANT, INTERMÉDIAIRE, AVANCÉ + LYCÉE (Seconde → Terminale STPL)

COURS_FRANCAIS = {
    "niveau_debutant": {
        "alphabet": {
            "titre": "L'Alphabet Français",
            "contenu": """L'alphabet français compte 26 lettres : A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z.

**Les accents en français :**
- é (accent aigu) : café, été, éléphant
- è (accent grave) : père, mère, frère
- ê (accent circonflexe) : fête, tête, bête
- à (accent grave) : là, voilà
- ù (accent grave) : où
- ç (cédille) : français, garçon, leçon

**Prononciation de base :**
Chaque lettre a un nom et un son. Exemple : A se prononce "a" comme dans "ami".""",
            "exemples": ["A comme ami", "B comme bonjour", "C comme chat", "É comme été"]
        },
        
        "articles": {
            "titre": "Les Articles (Le, La, Les, Un, Une, Des)",
            "contenu": """Les articles sont des petits mots qui précèdent les noms.

**Articles définis (on sait de quoi on parle) :**
- Le (masculin singulier) : le chat, le livre
- La (féminin singulier) : la table, la maison
- Les (pluriel) : les chats, les tables

**Articles indéfinis (on ne sait pas précisément) :**
- Un (masculin singulier) : un chat, un livre
- Une (féminin singulier) : une table, une maison
- Des (pluriel) : des chats, des tables

**Règle importante :**
Le genre (masculin/féminin) est souvent arbitraire en français. Il faut l'apprendre avec chaque mot.""",
            "exemples": ["Le chat (masculin)", "La table (féminin)", "Un livre (masculin)", "Une pomme (féminin)"]
        },
        
        "pronoms": {
            "titre": "Les Pronoms Personnels (Je, Tu, Il, Elle, Nous, Vous, Ils, Elles)",
            "contenu": """Les pronoms remplacent les noms pour éviter les répétitions.

**Pronoms sujets :**
- Je (moi) : Je mange
- Tu (toi) : Tu manges
- Il (lui, masculin) : Il mange
- Elle (elle, féminin) : Elle mange
- Nous (nous) : Nous mangeons
- Vous (vous) : Vous mangez
- Ils (eux, masculin ou mixte) : Ils mangent
- Elles (elles, féminin uniquement) : Elles mangent

**Utilisation :**
Les pronoms indiquent QUI fait l'action.""",
            "exemples": ["Je suis content", "Tu es gentil", "Il est grand", "Elle est belle"]
        },
        
        "verbes_etre_avoir": {
            "titre": "Les Verbes Être et Avoir (Les Plus Importants)",
            "contenu": """ÊTRE et AVOIR sont les deux verbes les plus importants en français.

**ÊTRE (to be) - Présent :**
- Je suis
- Tu es
- Il/Elle est
- Nous sommes
- Vous êtes
- Ils/Elles sont

**AVOIR (to have) - Présent :**
- J'ai
- Tu as
- Il/Elle a
- Nous avons
- Vous avez
- Ils/Elles ont

**Utilisation :**
- ÊTRE : état, identité (Je suis étudiant, Il est grand)
- AVOIR : possession (J'ai un livre, Tu as une voiture)""",
            "exemples": ["Je suis content", "Tu es professeur", "J'ai un chat", "Il a une voiture"]
        },
        
        "phrases_simples": {
            "titre": "Construire des Phrases Simples",
            "contenu": """Une phrase simple = Sujet + Verbe + Complément

**Structure de base :**
1. Le sujet (qui fait l'action) : Je, Tu, Il, Le chat...
2. Le verbe (l'action) : mange, va, est...
3. Le complément (ce qui complète) : une pomme, à l'école, content...

**Exemples :**
- Je mange une pomme (Sujet + Verbe + Complément)
- Le chat est noir (Sujet + Verbe + Attribut)
- Tu vas à l'école (Sujet + Verbe + Complément de lieu)""",
            "exemples": ["Je mange", "Tu es content", "Il va à l'école", "Nous sommes étudiants"]
        }
    },
    
    "niveau_intermediaire": {
        "conjugaison_present": {
            "titre": "La Conjugaison au Présent",
            "contenu": """Le présent indique une action qui se passe maintenant.

**Groupes de verbes :**

**1er groupe (-er) :**
- Parler : je parle, tu parles, il parle, nous parlons, vous parlez, ils parlent
- Manger : je mange, tu manges, il mange, nous mangeons, vous mangez, ils mangent

**2ème groupe (-ir) :**
- Finir : je finis, tu finis, il finit, nous finissons, vous finissez, ils finissent

**3ème groupe (-re, -oir, -ir irréguliers) :**
- Prendre : je prends, tu prends, il prend, nous prenons, vous prenez, ils prennent
- Voir : je vois, tu vois, il voit, nous voyons, vous voyez, ils voient

**Règles importantes :**
- Les terminaisons changent selon la personne
- Certains verbes sont irréguliers (être, avoir, faire, aller...)""",
            "exemples": ["Je parle français", "Tu finis tes devoirs", "Il prend le bus", "Nous voyons un film"]
        },
        
        "genres_et_accords": {
            "titre": "Les Genres (Masculin/Féminin) et les Accords",
            "contenu": """En français, les noms ont un genre : masculin ou féminin.

**Règles de base :**
- Le masculin : le chat, un livre, un garçon
- Le féminin : la table, une pomme, une fille

**Accord des adjectifs :**
L'adjectif s'accorde avec le nom qu'il qualifie.
- Un chat noir (masculin)
- Une table noire (féminin)
- Des chats noirs (masculin pluriel)
- Des tables noires (féminin pluriel)

**Accord des verbes :**
Le verbe s'accorde avec son sujet.
- Le chat mange (singulier)
- Les chats mangent (pluriel)""",
            "exemples": ["Un grand homme", "Une grande femme", "Les grands hommes", "Les grandes femmes"]
        },
        
        "pluriel": {
            "titre": "Le Pluriel des Noms",
            "contenu": """Le pluriel indique plusieurs choses.

**Règles générales :**
- Singulier → Pluriel : + S
  - Un chat → Des chats
  - Une table → Des tables

**Exceptions importantes :**
- Mots en -al → -aux : un cheval → des chevaux
- Mots en -eau → -eaux : un château → des châteaux
- Mots en -eu → -eux : un feu → des feux
- Mots en -ou → -oux : un bijou → des bijoux
- Mots invariables : un enfant → des enfants (pas de changement)

**Attention :**
Certains mots ne changent pas : un souris → des souris""",
            "exemples": ["Un chat → Des chats", "Un cheval → Des chevaux", "Un château → Des châteaux"]
        },
        
        "temps_passes": {
            "titre": "Les Temps du Passé (Passé Composé et Imparfait)",
            "contenu": """Il existe plusieurs façons de parler du passé.

**PASSÉ COMPOSÉ (action terminée) :**
Formation : AVOIR ou ÊTRE + participe passé
- J'ai mangé (action terminée)
- Je suis allé (action terminée)

**IMPARFAIT (action en cours dans le passé) :**
Formation : radical + terminaisons -ais, -ais, -ait, -ions, -iez, -aient
- Je mangeais (action en cours)
- Il était content (état dans le passé)

**Quand utiliser quoi ?**
- Passé composé : action précise, terminée (Hier, j'ai mangé)
- Imparfait : description, habitude (Quand j'étais enfant, je jouais)""",
            "exemples": ["J'ai mangé hier", "Je mangeais souvent", "Il était content", "Nous avons parlé"]
        },
        
        "adjectifs": {
            "titre": "Les Adjectifs Qualificatifs",
            "contenu": """Les adjectifs décrivent les noms.

**Place de l'adjectif :**
- Avant le nom (petit, grand, beau, bon, mauvais, jeune, vieux...) : un petit chat
- Après le nom (la plupart) : une table noire, un livre intéressant

**Accord :**
L'adjectif s'accorde en genre et en nombre avec le nom.
- Un chat noir → Des chats noirs
- Une table noire → Des tables noires

**Degrés de comparaison :**
- Comparatif : plus grand que, moins grand que, aussi grand que
- Superlatif : le plus grand, le moins grand""",
            "exemples": ["Un grand homme", "Une belle femme", "Plus grand que", "Le plus grand"]
        }
    },
    
    "niveau_avance": {
        "subjonctif": {
            "titre": "Le Subjonctif (Mode et Temps)",
            "contenu": """Le subjonctif exprime le doute, le souhait, l'émotion, l'obligation.

**Formation :**
Radical du présent + terminaisons : -e, -es, -e, -ions, -iez, -ent
- Que je parle, que tu parles, qu'il parle, que nous parlions, que vous parliez, qu'ils parlent

**Utilisation :**
Après certaines expressions :
- Il faut que tu viennes (obligation)
- Je veux que tu sois là (souhait)
- Je doute qu'il vienne (doute)
- Je suis content que tu sois là (émotion)

**Verbes irréguliers au subjonctif :**
- Être : que je sois, que tu sois, qu'il soit...
- Avoir : que j'aie, que tu aies, qu'il ait...
- Faire : que je fasse, que tu fasses, qu'il fasse...""",
            "exemples": ["Il faut que je parte", "Je veux que tu viennes", "Je doute qu'il soit là"]
        },
        
        "conditionnel": {
            "titre": "Le Conditionnel (Temps et Mode)",
            "contenu": """Le conditionnel exprime une action qui dépend d'une condition.

**Formation :**
Radical du futur + terminaisons de l'imparfait : -ais, -ais, -ait, -ions, -iez, -aient
- Je parlerais, tu parlerais, il parlerait, nous parlerions, vous parleriez, ils parleraient

**Utilisations :**
1. **Politesse :** Je voudrais un café (au lieu de "je veux")
2. **Hypothèse :** Si j'avais de l'argent, j'achèterais une voiture
3. **Information incertaine :** Il serait parti (on n'est pas sûr)

**Si + imparfait → conditionnel présent :**
- Si j'étais riche, je voyagerais""",
            "exemples": ["Je voudrais un café", "Si j'avais le temps, je viendrais", "Il serait parti"]
        },
        
        "analyse_logique": {
            "titre": "L'Analyse Logique de la Phrase",
            "contenu": """L'analyse logique étudie la fonction des mots dans la phrase.

**Les fonctions essentielles :**

**1. Le Sujet :**
- Qui fait l'action ? Le chat mange (sujet : le chat)

**2. Le Verbe :**
- L'action ou l'état : Le chat mange (verbe : mange)

**3. Les Compléments :**
- **COD (Complément d'Objet Direct)** : répond à "quoi ?" ou "qui ?"
  - Je mange une pomme (COD : une pomme)
  
- **COI (Complément d'Objet Indirect)** : répond à "à qui ?", "à quoi ?", "de qui ?", "de quoi ?"
  - Je parle à mon ami (COI : à mon ami)
  
- **CC (Complément Circonstanciel)** : répond à "où ?", "quand ?", "comment ?", "pourquoi ?"
  - Je vais à l'école (CC de lieu : à l'école)
  - Je viens demain (CC de temps : demain)

**4. L'Attribut du Sujet :**
- Qualifie le sujet avec le verbe "être" : Il est content (attribut : content)""",
            "exemples": [
                "Je mange une pomme (COD)",
                "Je parle à mon ami (COI)",
                "Je vais à l'école (CC de lieu)",
                "Il est content (Attribut)"
            ]
        },
        
        "orthographe_avancee": {
            "titre": "Orthographe Avancée et Règles Complexes",
            "contenu": """**Règles d'orthographe avancées :**

**1. Accord du participe passé :**
- Avec AVOIR : pas d'accord sauf si COD avant (Les pommes que j'ai mangées)
- Avec ÊTRE : accord avec le sujet (Elle est partie, Ils sont partis)

**2. Homophones (mots qui se prononcent pareil) :**
- a/à : Il a (verbe) / Il va à l'école (préposition)
- et/est : Le chat et le chien / Il est content
- son/sont : Son chat (possessif) / Ils sont là (verbe)
- ces/ses : Ces chats (démonstratif) / Ses chats (possessif)

**3. Doubles consonnes :**
- Après une voyelle courte : appeler, arriver, occuper
- Règles spécifiques : -ss- (passer), -ll- (aller), -tt- (mettre)

**4. Accents et cédille :**
- É (accent aigu) : été, café
- È (accent grave) : père, mère
- Ê (circonflexe) : fête, tête
- Ç (cédille) : français, garçon""",
            "exemples": [
                "J'ai mangé (pas d'accord)", "Les pommes que j'ai mangées (accord)",
                "Il a / Il va à", "Ces chats / Ses chats"
            ]
        },
        
        "syntaxe_complexe": {
            "titre": "Syntaxe Complexe et Subordination",
            "contenu": """**Phrases complexes :**

**1. Coordination :**
Liaison de deux phrases indépendantes avec : et, ou, mais, donc, car, ni
- Je mange et je bois (deux actions)

**2. Subordination :**
Une phrase dépend d'une autre.

**Types de subordonnées :**
- **Relative (qui, que, dont, où)** : Le livre que je lis
- **Complétive (que + indicatif/subjonctif)** : Je pense qu'il vient
- **Circonstancielle :**
  - Temporelle (quand, pendant que) : Quand je viens, il part
  - Causale (parce que, puisque) : Je reste parce qu'il pleut
  - Conditionnelle (si) : Si tu viens, je serai content
  - Concessive (bien que, quoique) : Bien qu'il pleuve, je sors

**Ordre des mots :**
En français, l'ordre est généralement : Sujet + Verbe + Compléments""",
            "exemples": [
                "Le livre que je lis (relative)",
                "Je pense qu'il vient (complétive)",
                "Quand je viens, il part (temporelle)",
                "Si tu viens, je serai content (conditionnelle)"
            ]
        },
        
        "conjugaison_avancee": {
            "titre": "Conjugaison Avancée (Tous les Temps)",
            "contenu": """**Tous les temps et modes en français :**

**INDICATIF :**
- Présent : Je mange
- Passé composé : J'ai mangé
- Imparfait : Je mangeais
- Plus-que-parfait : J'avais mangé
- Passé simple : Je mangeai (littéraire)
- Futur simple : Je mangerai
- Futur antérieur : J'aurai mangé

**CONDITIONNEL :**
- Conditionnel présent : Je mangerais
- Conditionnel passé : J'aurais mangé

**SUBJONCTIF :**
- Subjonctif présent : Que je mange
- Subjonctif passé : Que j'aie mangé
- Subjonctif imparfait : Que je mangeasse (littéraire)
- Subjonctif plus-que-parfait : Que j'eusse mangé (littéraire)

**IMPÉRATIF :**
- Présent : Mange ! (tu), Mangeons ! (nous), Mangez ! (vous)

**PARTICIPE :**
- Présent : Mangeant
- Passé : Mangé""",
            "exemples": [
                "Je mange (présent)",
                "J'ai mangé (passé composé)",
                "Je mangerai (futur)",
                "Je mangerais (conditionnel)",
                "Que je mange (subjonctif)"
            ]
        }
    },

    # =========================================================
    # NIVEAU SECONDE (2nde) — Première année du lycée
    # =========================================================
    "niveau_seconde": {

        "lecture_textes": {
            "titre": "Lecture et Analyse de Textes — Seconde",
            "contenu": """**Les grands types de textes au lycée :**

**1. Le texte narratif (roman, nouvelle, conte) :**
- Raconte une histoire avec des personnages, un lieu, une époque
- Schéma narratif : situation initiale → élément perturbateur → péripéties → résolution → situation finale
- Narrateur : qui raconte ? (1ère personne = je, 3e personne = il/elle)
- Point de vue (focalisation) :
  - **Focalisation zéro** : narrateur omniscient, sait tout
  - **Focalisation interne** : narrateur = personnage, voit de l'intérieur
  - **Focalisation externe** : narrateur observe de l'extérieur, ne sait pas tout

**2. Le texte poétique :**
- Organisé en **strophes** (quatrains, tercets, distiques...)
- Utilise des **vers** (mesurés par syllabes : alexandrin = 12 syllabes)
- Effets sonores : **rime** (alternance croisée ABAB, embrassée ABBA, suivie AABB), allitération, assonance
- Langage figuré : métaphore, comparaison, personnification

**3. Le texte théâtral :**
- Divisé en **actes** et **scènes**
- Dialogue entre personnages (répliques)
- **Didascalies** : indications de mise en scène (en italique)
- Genres : tragédie, comédie, tragi-comédie, drame

**4. Le texte argumentatif :**
- Défend une thèse (idée principale)
- Structure : thèse → arguments → exemples → conclusion
- Connecteurs logiques : de plus, cependant, or, ainsi, en effet, par conséquent...""",
            "exemples": [
                "Roman de Zola : focalisation interne sur un personnage ouvrier",
                "Sonnet de Shakespeare : 2 quatrains + 2 tercets, rimes ABBA ABBA CDC DCD",
                "Racine, Phèdre : tragédie classique en 5 actes, alexandrins"
            ]
        },

        "figures_de_style": {
            "titre": "Les Figures de Style — Seconde et Première",
            "contenu": """**Les figures de style essentielles à connaître :**

**Figures d'analogie (comparaison) :**
- **Comparaison** : rapproche deux éléments avec un outil de comparaison (comme, tel, ainsi que, semblable à)
  → "Il est courageux **comme** un lion"
- **Métaphore** : comparaison SANS outil de comparaison
  → "C'est un lion dans la bataille" (il = lion)
- **Métaphore filée** : métaphore développée sur plusieurs lignes
- **Allégorie** : représentation concrète d'une idée abstraite (la Justice = femme aux yeux bandés)
- **Personnification** : donne des traits humains à un animal ou objet
  → "La nature pleure sous la pluie"

**Figures d'amplification :**
- **Hyperbole** : exagération délibérée → "Je t'ai dit mille fois de faire ça"
- **Gradation** : progression croissante ou décroissante → "Il faut choisir : vivre ou végéter ou mourir"
- **Accumulation** : liste rapide d'éléments → "le bruit, la fureur, les cris, le chaos"

**Figures d'atténuation :**
- **Euphémisme** : adoucit une réalité dure → "Il nous a quittés" (au lieu de "il est mort")
- **Litote** : en dire moins pour en suggérer plus → "Ce n'est pas mal" (= c'est très bien)

**Figures de construction :**
- **Anaphore** : répétition d'un mot en début de phrase ou vers → "Je suis, je vis, je règne"
- **Antithèse** : opposition de deux idées contraires → "La vie est courte, l'art est long"
- **Chiasme** : croisement en ABBA → "il faut manger pour vivre, non vivre pour manger"
- **Oxymore** : alliance de mots contradictoires → "une obscure clarté"

**Figures sonores :**
- **Allitération** : répétition de consonnes → "Pour qui sont ces serpents qui sifflent sur vos têtes"
- **Assonance** : répétition de voyelles → "Les sanglots longs des violons de l'automne"
- **Onomatopée** : mot qui imite un son → "boum", "tic-tac", "miaou" """,
            "exemples": [
                "Métaphore : 'La vie est un long fleuve tranquille'",
                "Hyperbole : 'J'ai une faim de loup'",
                "Anaphore : 'Je veux, je réclame, j'exige justice !'",
                "Antithèse : 'Partir, c'est mourir un peu'"
            ]
        },

        "expression_ecrite_seconde": {
            "titre": "Expression Écrite — Seconde",
            "contenu": """**Rédiger un texte narratif :**
1. Choisir un narrateur (je ou il/elle)
2. Créer un schéma narratif (situation initiale → élément perturbateur → ...)
3. Décrire le cadre (lieu, époque, ambiance)
4. Développer les personnages (portrait physique + moral)
5. Utiliser des temps verbaux cohérents :
   - Passé simple : action principale (il arriva, il dit)
   - Imparfait : description, arrière-plan (la pluie tombait)

**Rédiger une description :**
- Choisir un point de vue (panoramique → détails, ou l'inverse)
- Organiser par plan ou par sens (vue, ouïe, odorat, toucher)
- Utiliser des adjectifs précis et des comparaisons
- Créer une atmosphère (joyeuse, angoissante, mélancolique...)

**Rédiger un dialogue :**
- Tirets (—) pour chaque prise de parole
- Verbes de parole variés : dit, répondit, s'exclama, murmura...
- Respect de la ponctuation : guillemets « » ou tirets

**Paragraphe argumentatif (base) :**
- **Idée** (la thèse du paragraphe)
- **Argument** (la raison)
- **Exemple** (preuve, citation, fait)
- **Conclusion** de paragraphe (reformulation + transition)""",
            "exemples": [
                "Narratif : incipit (début) = lieu + époque + personnages",
                "Descriptif : 'La pièce sentait la vieille poussière...' (sens)",
                "Dialogue : — Où vas-tu ? demanda-t-il. — Loin, répondit-elle."
            ]
        }
    },

    # =========================================================
    # NIVEAU PREMIÈRE STPL (EAF — Épreuves Anticipées de Français)
    # =========================================================
    "niveau_premiere": {

        "commentaire_compose": {
            "titre": "Le Commentaire Composé — Méthode Complète (Première)",
            "contenu": """**Définition :**
Le commentaire composé est une analyse structurée d'un texte littéraire.
Il montre comment le texte produit du sens et des effets sur le lecteur.

**ÉTAPE 1 — Lecture et annotation du texte (15 min) :**
- Lire attentivement 2 à 3 fois
- Repérer : le type de texte, le thème, le ton, les effets
- Souligner : figures de style, mots importants, temps verbaux
- Dégager 2 ou 3 axes d'analyse (= les grandes idées à développer)

**ÉTAPE 2 — Introduction (10 à 15 lignes) :**
1. **Accroche** : phrase générale sur l'auteur, l'époque ou le thème
2. **Présentation du texte** : auteur, titre, date, genre, résumé bref
3. **Problématique** : question centrale que pose votre analyse
   → "En quoi ce texte... ?" / "Comment l'auteur... ?"
4. **Annonce du plan** : "Nous verrons d'abord..., puis..., enfin..."

**ÉTAPE 3 — Développement (2 ou 3 parties) :**
Chaque partie = 1 axe d'analyse
Chaque partie contient 2 ou 3 sous-parties :
  - **Idée directrice** (ce qu'on va montrer)
  - **Analyse** d'un procédé stylistique (figure de style, temps verbaux, syntaxe...)
  - **Citation** du texte entre guillemets « »
  - **Interprétation** : quel effet sur le lecteur ?

**ÉTAPE 4 — Conclusion (5 à 8 lignes) :**
1. **Bilan** : résumer les 2 ou 3 parties
2. **Réponse à la problématique**
3. **Ouverture** : comparaison avec une autre œuvre, une autre époque

**RÈGLES ABSOLUES :**
✅ Toujours citer le texte avec des guillemets
✅ Analyser COMMENT le texte produit ses effets (procédés)
✅ Ne jamais paraphraser (raconter ce qui se passe ≠ analyser)
✅ Lier les observations stylistiques au sens""",
            "exemples": [
                "Problématique : 'En quoi ce portrait révèle-t-il la vision pessimiste de l'auteur ?'",
                "Plan en 2 parties : I. Un portrait réaliste et précis / II. Une critique sociale implicite",
                "Citation analysée : 'Le mot \"ténèbres\" (ligne 5) crée une atmosphère oppressante'"
            ]
        },

        "dissertation": {
            "titre": "La Dissertation Littéraire — Méthode Complète (Première)",
            "contenu": """**Définition :**
La dissertation est un exercice de réflexion sur une question littéraire.
Elle demande de défendre une position argumentée sur un texte ou un thème.

**TYPES DE SUJETS :**
1. **Dissertation sur œuvre** : "Dans [œuvre], comment l'auteur traite-t-il [thème] ?"
2. **Dissertation sur corpus** : à partir de plusieurs textes donnés
3. **Question ouverte** : "La littérature peut-elle changer le monde ?"

**MÉTHODE — Les grandes étapes :**

**1. Analyse du sujet (15 min) :**
- Identifier les mots-clés → les définir précisément
- Reformuler le sujet en question
- Trouver la problématique : le vrai enjeu du sujet

**2. Recherche d'arguments (15 min) :**
- Trouver des arguments POUR la thèse
- Trouver des arguments CONTRE ou NUANCES (antithèse)
- Trouver des exemples : œuvres, auteurs, citations

**3. Construction du plan :**
Plan en 3 parties (thèse / antithèse / synthèse) OU 2 parties selon le sujet
- **I. Thèse** (on affirme)
- **II. Antithèse** (on nuance ou on contredit)
- **III. Synthèse** (on dépasse le paradoxe)

**4. Introduction :**
- Accroche (générale) → Présentation du sujet → Problématique → Annonce du plan

**5. Développement :**
Chaque partie = 2 ou 3 paragraphes avec : Idée + Argument + Exemple + Mini-conclusion

**6. Conclusion :**
Bilan + Réponse à la problématique + Ouverture

**VOCABULAIRE DE LA DISSERTATION :**
- "Il convient de s'interroger sur..." / "On peut se demander si..."
- "D'une part... d'autre part..." / "Cependant, il faut nuancer..."
- "À cet égard..." / "En témoigne..." / "C'est pourquoi..."
- "En définitive..." / "Pour conclure..." """,
            "exemples": [
                "Sujet : 'Le roman est-il un simple divertissement ?' → Prob : Quel rôle joue le roman ?",
                "I. Le roman divertit / II. Le roman instruit et critique / III. Le roman transforme",
                "Exemple : Zola (Germinal) → roman de divertissement ET critique sociale"
            ]
        },

        "analyse_lineaire": {
            "titre": "L'Analyse Linéaire — Méthode (Première — EAF)",
            "contenu": """**Définition :**
L'analyse linéaire (ou explication de texte) suit le texte ligne par ligne
pour montrer comment le sens se construit progressivement.

**STRUCTURE DE L'ANALYSE LINÉAIRE :**

**Introduction (courte) :**
- Auteur, œuvre, date, genre
- Situation du passage dans l'œuvre
- Axes de lecture = ce qu'on va montrer (2 ou 3 idées)
- Lecture à voix haute (obligatoire à l'oral EAF)

**Développement — Mouvement par mouvement :**
Découper le texte en 2, 3 ou 4 mouvements (parties logiques)
Pour chaque mouvement :
1. Nommer le mouvement ("Dans ce premier mouvement, l. 1-5...")
2. Analyser les procédés : figures de style, syntaxe, temps verbaux, vocabulaire
3. Expliquer le sens et les effets produits
4. Citer précisément le texte

**Conclusion :**
- Résumé des axes de lecture
- Bilan sur l'intention de l'auteur
- Ouverture : lien avec d'autres textes ou la problématique de l'objet d'étude

**À L'ORAL EAF :**
1. Lecture à voix haute (expressive, claire, correcte)
2. Analyse linéaire (10 min de présentation)
3. Entretien avec le jury (10 min de questions)

**Erreurs à éviter :**
❌ Paraphraser (raconter sans analyser)
❌ Faire un commentaire composé (aller au hasard dans le texte)
❌ Oublier de citer le texte
✅ Toujours partir d'un PROCÉDÉ pour expliquer un SENS""",
            "exemples": [
                "Mouvement 1 (l.1-5) : L'incipit présente le cadre — décor sombre par le champ lexical de la nuit",
                "Procédé : anaphore de 'jamais' → insistance sur le désespoir du narrateur",
                "Effet : le lecteur ressent l'enfermement du personnage"
            ]
        },

        "mouvements_litteraires": {
            "titre": "Les Mouvements Littéraires — Première STPL",
            "contenu": """**Les grands mouvements littéraires français :**

**1. HUMANISME (XVIe siècle) :**
- Pensée : l'Homme au centre (Latin : humanus)
- Retour aux textes antiques (Grèce, Rome)
- Auteurs : Rabelais (Gargantua), Montaigne (Essais), Erasme
- Thèmes : éducation, tolérance, liberté de pensée

**2. BAROQUE (fin XVIe - XVIIe siècle) :**
- Mouvement, excès, apparences trompeuses
- Vocabulaire riche, métaphores filées, hyperboles
- Auteurs : Agrippa d'Aubigné, Théophile de Viau
- Thèmes : le monde comme théâtre, instabilité, illusion

**3. CLASSICISME (XVIIe siècle — Siècle de Louis XIV) :**
- Raison, ordre, mesure, clarté
- Règle des 3 unités au théâtre (temps, lieu, action)
- Auteurs : Molière (Dom Juan, Le Misanthrope), Racine (Phèdre), La Fontaine (Fables), Corneille
- Thèmes : passions humaines, morale, vertu

**4. LES LUMIÈRES (XVIIIe siècle) :**
- Raison contre superstition, liberté, progrès, tolérance
- Encyclopédie de Diderot et d'Alembert
- Auteurs : Voltaire (Candide), Rousseau (Émile), Montesquieu (De l'Esprit des lois)
- Thèmes : critique de l'Église, esclavage, inégalités

**5. ROMANTISME (début XIXe siècle) :**
- Sentiment, liberté, nature, évasion, Moi (lyrisme)
- Réaction contre la raison classique
- Auteurs : Victor Hugo (Hernani, Les Misérables), Lamartine, Alfred de Musset, Alfred de Vigny
- Thèmes : amour, mort, nature, mélancolie (le "mal du siècle")

**6. RÉALISME (milieu XIXe siècle) :**
- Représenter la réalité sociale telle qu'elle est
- Observation précise, documentation
- Auteurs : Balzac (La Comédie humaine), Flaubert (Madame Bovary), Stendhal
- Thèmes : bourgeoisie, argent, ambition, vie quotidienne

**7. NATURALISME (fin XIXe siècle) :**
- Réalisme poussé à l'extrême : influence du milieu et de l'hérédité
- Méthode scientifique appliquée à la littérature
- Auteur principal : Émile Zola (Germinal, Nana, L'Assommoir)
- Thèmes : misère, alcool, travail ouvrier, hérédité

**8. SYMBOLISME (fin XIXe siècle) :**
- Musicalité, symboles, mystère, suggestion plutôt que description
- Auteurs : Baudelaire (Les Fleurs du Mal), Verlaine, Rimbaud, Mallarmé
- Thèmes : monde intérieur, idéal, correspondances des sens

**9. SURRÉALISME (XXe siècle) :**
- Inconscient, rêve, automatisme (écriture automatique)
- André Breton (Manifeste du Surréalisme)
- Auteurs : Aragon, Éluard, Desnos
- Thèmes : liberté totale, amour fou, hasard objectif""",
            "exemples": [
                "Classicisme : Molière critique les vices humains avec humour",
                "Romantisme : Hugo dans 'Demain dès l'aube' exprime son deuil par la nature",
                "Naturalisme : Zola décrit la mine comme une bête qui dévore les hommes"
            ]
        },

        "genres_litteraires": {
            "titre": "Les Genres Littéraires — Première STPL",
            "contenu": """**Les 4 grands genres littéraires :**

**1. LE ROMAN (et la nouvelle) :**
- Œuvre narrative en prose, personnages fictifs
- Types : réaliste, fantastique, policier, épistolaire, initiatique, autobiographique
- Éléments : narrateur, focalisation, temps (récit/histoire), espace, personnages
- Incipit (début) et excipit (fin) très importants

**2. LA POÉSIE :**
- Langage travaillé, rythmé, souvent en vers
- Versification : nombre de syllabes (compte des « e » muets), rimes, strophes
- **Alexandrin** = 12 syllabes | **Octosyllabe** = 8 | **Décasyllabe** = 10
- Poème en prose (sans vers mais avec musicalité)
- Registres : lyrique, épique, satirique, élégiaque

**3. LE THÉÂTRE :**
- Texte pour être joué (représenté) — Dialogue + didascalies
- **Tragédie** : héros noble, destin fatal, catharsis (purification des passions)
- **Comédie** : dénouement heureux, satire des vices (Molière)
- **Drame romantique** : mélange tragédie/comédie (Hugo)
- Règles classiques : 3 unités (action, lieu, temps — 24h), bienséance, vraisemblance

**4. L'ESSAI et la LITTÉRATURE D'IDÉES :**
- Réflexion personnelle sur un sujet (philosophique, politique, social)
- Auteurs : Montaigne, Voltaire, Rousseau
- Texte argumentatif : thèse + arguments + exemples

**REGISTRES LITTÉRAIRES :**
- **Lyrique** : expression des sentiments personnels (amour, deuil)
- **Épique** : récit de combats, héros, grandeur
- **Tragique** : destin inéluctable, souffrance
- **Comique** : faire rire (ironie, parodie, burlesque)
- **Satirique** : critiquer avec humour (Voltaire)
- **Pathétique** : susciter la pitié, l'émotion
- **Fantastique** : hésitation entre réel et surnaturel""",
            "exemples": [
                "Madame Bovary : roman réaliste à focalisation interne",
                "Phèdre de Racine : tragédie classique, alexandrins, 5 actes",
                "Candide de Voltaire : conte philosophique satirique"
            ]
        }
    },

    # =========================================================
    # NIVEAU TERMINALE STPL
    # =========================================================
    "niveau_terminale": {

        "grand_oral": {
            "titre": "Le Grand Oral — Préparation (Terminale)",
            "contenu": """**Le Grand Oral (Baccalauréat) :**
Épreuve orale de 20 minutes, coefficient 10.

**DÉROULEMENT :**
1. **Préparation** (20 min) : vous préparez votre exposé (notes sur papier autorisées)
2. **Exposé** (5 min) : vous présentez votre question et répondez sans notes
3. **Échange** (10 min) : le jury vous pose des questions
4. **Échange sur le projet** (5 min) : le jury vous questionne sur vos projets post-bac

**STRUCTURE DE L'EXPOSÉ (5 min) :**
1. **Introduction** : présentation de la question, sa pertinence, annonce du plan
2. **Développement** : 2 ou 3 arguments illustrés d'exemples précis
3. **Conclusion** : réponse synthétique à la question, ouverture

**CONSEILS POUR BRILLER :**
✅ Poser une vraie question (pas trop large, pas trop étroite)
✅ Avoir une réponse nuancée (ne pas être dogmatique)
✅ Citer des exemples concrets (œuvres, expériences, actualité)
✅ Relier à votre spécialité STPL (chimie, physique, biologie)
✅ Regarder le jury, articuler, parler clairement
✅ Être capable de défendre votre point de vue face aux questions

**THÈMES POSSIBLES STPL :**
- La chimie et les enjeux environnementaux (liens avec l'essai scientifique)
- La littérature scientifique et la vulgarisation
- L'histoire des sciences et ses révolutions (Galilée, Darwin...)
- L'éthique dans la recherche scientifique""",
            "exemples": [
                "Question : 'La chimie peut-elle sauver la planète ?'",
                "Question : 'En quoi la littérature de science-fiction anticipe-t-elle le réel ?'",
                "Introduction : définir les termes, annoncer la problématique et le plan"
            ]
        },

        "argumentation_avancee": {
            "titre": "L'Argumentation Avancée — Terminale",
            "contenu": """**Les types d'arguments :**

**1. Argument par l'exemple :**
→ On illustre la thèse avec un fait précis, une anecdote, une statistique
"Comme le montre l'exemple de..." / "Ainsi, dans..."

**2. Argument par l'autorité :**
→ On s'appuie sur une citation d'expert, d'auteur, de philosophe
"Selon Voltaire..." / "Comme le dit Einstein..."

**3. Argument par analogie :**
→ Comparer deux situations similaires
"De même qu'il faut..., il faut aussi..."

**4. Argument logique (déductif) :**
→ On part d'un principe général pour arriver à une conclusion
"Si... alors... → donc..."

**5. Argument par le contraire (a contrario) :**
→ Montrer ce qui se passe si l'on ne suit pas la thèse
"Sans..., on risquerait..."

**Connecteurs logiques avancés :**
- **Cause** : car, parce que, puisque, étant donné que, en raison de
- **Conséquence** : donc, ainsi, c'est pourquoi, par conséquent, il s'ensuit que
- **Opposition/Concession** : mais, cependant, néanmoins, or, toutefois, bien que, quoique
- **Addition** : de plus, en outre, par ailleurs, qui plus est
- **Illustration** : ainsi, par exemple, c'est le cas de, comme en témoigne

**La réfutation :**
- Citer l'argument adverse : "Certains estiment que..."
- Le réfuter : "Cependant, cette position ignore..."
- Apporter un contre-argument solide

**Plan dialectique (thèse / antithèse / synthèse) :**
I. Affirmation (thèse)
II. Nuance ou opposition (antithèse)
III. Dépassement du paradoxe (synthèse)""",
            "exemples": [
                "Thèse : la science améliore la vie / Antithèse : elle crée aussi des dangers",
                "Synthèse : la science est un outil — c'est l'usage qui est bon ou mauvais",
                "Connecteur : 'Certes... mais... / Si... il n'en demeure pas moins que...'"
            ]
        },

        "orthographe_expert": {
            "titre": "Orthographe et Grammaire Niveau Expert — Terminale",
            "contenu": """**L'accord du participe passé — Règles complètes :**

**Avec ÊTRE :** accord avec le sujet
- Elle est **partie** (féminin singulier)
- Ils sont **partis** (masculin pluriel)
- Elles se sont **regardées** (réfléchi, féminin pluriel)

**Avec AVOIR :** accord avec le COD si le COD est AVANT le verbe
- J'ai mangé des pommes (COD après → pas d'accord) : "mangé"
- Les pommes que j'ai **mangées** (COD "que" = les pommes, avant → accord)
- Je les ai **vues** (les = elles, COD avant → accord au féminin)

**Verbes pronominaux :**
- Se laver : être + accord avec sujet (si action sur soi) → "Elle s'est lavée"
- Se parler : COD inexistant → pas d'accord → "Elles se sont parlé"

**Pièges classiques :**
- **leur** invariable (pronom COI) vs **leurs** (adjectif possessif)
  → "Je leur ai dit" (pronom) / "leurs livres" (possessif)
- **tout / toute / tous / toutes** : variable sauf adverbe devant adjectif
  → "elles sont tout étonnées" (adverbe, invariable) / "toutes les filles"
- **même** : variable (adjectif) ou invariable (adverbe = "aussi")
  → "les mêmes erreurs" (variable) / "même lui est venu" (invariable)
- **quel(le)(s)** (adjectif) vs **qu'elle(s)** (que + elle)
  → "Quelle belle journée !" / "Je pense qu'elle viendra"

**Les niveaux de langue :**
- **Familier** : t'as, c'est, gars, sympa, bouquin → conversation amicale
- **Courant** : standard, neutre → usage quotidien
- **Soutenu** : néanmoins, quoique, nonobstant → écrit formel, littérature
- **Littéraire** : vocabulaire rare, inversions, subjonctif imparfait""",
            "exemples": [
                "'Les tableaux qu'il a peints' → accord (COD 'que' avant = les tableaux)",
                "'Il a peint des tableaux' → pas d'accord (COD après)",
                "'Elles se sont souvenues' → accord (se = COD direct)"
            ]
        },

        "synthese_programme_terminal": {
            "titre": "Synthèse Programme Français — Terminale STPL",
            "contenu": """**RÉCAPITULATIF POUR LE BAC :**

**Épreuves de français (EAF — Première) :**
- Écrit : Commentaire composé OU Dissertation (4h)
- Oral : Analyse linéaire (10 min) + entretien (10 min)

**Œuvres au programme (exemples typiques — vérifier programme officiel) :**
- Romans : Balzac, Zola, Maupassant, Flaubert
- Poésie : Baudelaire (Spleen et Idéal), Rimbaud, Apollinaire
- Théâtre : Molière, Racine, Marivaux, Anouilh
- Littérature d'idées : Voltaire, Rousseau, Montaigne

**MÉTHODES ESSENTIELLES :**

1. **Commentaire composé :**
   → Introduction (accroche + présentation + problématique + plan)
   → 2/3 parties avec citations analysées
   → Conclusion (bilan + ouverture)

2. **Dissertation :**
   → Analyse du sujet → Problématique → Plan dialectique
   → 3 parties : thèse / antithèse / synthèse
   → Exemples tirés des œuvres

3. **Analyse linéaire :**
   → Mouvements du texte → Procédés → Effets → Sens

**FIGURES DE STYLE INCONTOURNABLES :**
Métaphore, comparaison, hyperbole, anaphore, antithèse, oxymore, litote, euphémisme, personnification, allégorie, gradation

**CONNECTEURS ESSENTIELS :**
- Cause : car, parce que, puisque, étant donné que
- Conséquence : donc, c'est pourquoi, ainsi, par conséquent
- Opposition : mais, cependant, or, néanmoins, toutefois
- Illustration : par exemple, ainsi, comme en témoigne, c'est le cas de""",
            "exemples": [
                "Commentaire : trouver 2-3 axes depuis les procédés du texte",
                "Dissertation : thèse 'Le roman divertit' → antithèse 'il instruit aussi'",
                "Analyse : 'Le verbe «écraser» (l.3) renforce l'idée d'oppression'"
            ]
        }
    }
}


# Fonction pour obtenir un cours par niveau et sujet
def obtenir_cours(niveau, sujet):
    """Retourne le cours correspondant au niveau et au sujet"""
    if niveau in COURS_FRANCAIS and sujet in COURS_FRANCAIS[niveau]:
        return COURS_FRANCAIS[niveau][sujet]
    return None

# Fonction pour lister tous les cours d'un niveau
def lister_cours_niveau(niveau):
    """Retourne la liste de tous les cours d'un niveau"""
    if niveau in COURS_FRANCAIS:
        return list(COURS_FRANCAIS[niveau].keys())
    return []

# Fonction pour rechercher un cours par mot-clé
def rechercher_cours(mot_cle):
    """Recherche un cours contenant le mot-clé"""
    resultats = []
    mot_cle_lower = mot_cle.lower()
    
    for niveau, cours in COURS_FRANCAIS.items():
        for sujet, contenu in cours.items():
            if (mot_cle_lower in sujet.lower() or 
                mot_cle_lower in contenu["titre"].lower() or
                mot_cle_lower in contenu["contenu"].lower()):
                resultats.append({
                    "niveau": niveau,
                    "sujet": sujet,
                    "cours": contenu
                })
    
    return resultats
