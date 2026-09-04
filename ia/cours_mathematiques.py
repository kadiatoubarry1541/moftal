# Base de données complète de cours de mathématiques - Niveau STPL
# Couvre : Seconde → Première STPL → Terminale STPL
# Conforme au programme officiel du baccalauréat STL/STPL

COURS_MATHEMATIQUES = {

    # =========================================================
    # SECONDE (2nde) — Première année du lycée
    # =========================================================
    "seconde": {

        "nombres_et_calculs": {
            "titre": "Nombres et Calculs (Seconde)",
            "contenu": """**Les ensembles de nombres :**
- **ℕ** (naturels) : 0, 1, 2, 3, 4, ...
- **ℤ** (entiers relatifs) : ..., -2, -1, 0, 1, 2, ...
- **ℚ** (rationnels) : fractions a/b avec b ≠ 0 — ex : 1/2, -3/4, 0,5
- **ℝ** (réels) : tous les nombres (rationnels + irrationnels comme √2, π)

**Priorités opératoires (PEMDAS) :**
1. Parenthèses
2. Puissances (exposants)
3. Multiplication et Division (de gauche à droite)
4. Addition et Soustraction (de gauche à droite)

**Puissances :**
- aⁿ × aᵐ = aⁿ⁺ᵐ  → ex : 2³ × 2² = 2⁵ = 32
- aⁿ ÷ aᵐ = aⁿ⁻ᵐ  → ex : 3⁵ ÷ 3² = 3³ = 27
- (aⁿ)ᵐ = aⁿˣᵐ   → ex : (2³)² = 2⁶ = 64
- a⁻ⁿ = 1/aⁿ      → ex : 2⁻³ = 1/8
- a⁰ = 1 (pour a ≠ 0)

**Racines carrées :**
- √a × √b = √(ab)
- √a / √b = √(a/b)
- (√a)² = a
- √9 = 3, √16 = 4, √25 = 5, √36 = 6, √49 = 7, √64 = 8, √81 = 9, √100 = 10

**Fractions :**
- a/b + c/d = (ad + bc)/(bd)
- a/b × c/d = ac/bd
- a/b ÷ c/d = a/b × d/c = ad/bc""",
            "exemples": [
                "2³ × 2² = 2⁵ = 32",
                "3 + 4 × 2 = 3 + 8 = 11 (priorité ×)",
                "√36 = 6 car 6² = 36",
                "1/3 + 1/4 = 4/12 + 3/12 = 7/12"
            ]
        },

        "equations_inequations": {
            "titre": "Équations et Inéquations du 1er et 2nd Degré (Seconde)",
            "contenu": """**Équations du 1er degré (ax + b = 0) :**
Méthode : isoler l'inconnue x
- 3x + 6 = 0  →  3x = -6  →  x = -2
- 2x - 5 = 7  →  2x = 12  →  x = 6

**Systèmes d'équations (2 inconnues) :**
Méthode par substitution ou combinaison (addition)
- Exemple : { 2x + y = 5 et x - y = 1 }
  → Addition : 3x = 6 → x = 2 → y = 5 - 4 = 1
  → Solution : (2 ; 1)

**Équations du 2nd degré : ax² + bx + c = 0**
Calcul du discriminant : **Δ = b² - 4ac**

- Si **Δ > 0** : deux solutions x₁ = (-b - √Δ)/(2a) et x₂ = (-b + √Δ)/(2a)
- Si **Δ = 0** : une solution double x₀ = -b/(2a)
- Si **Δ < 0** : pas de solution réelle

**Inéquations du 1er degré :**
Même méthode qu'une équation, MAIS si on multiplie/divise par un nombre négatif, le signe d'inégalité s'inverse.
- 2x > 6  →  x > 3
- -3x > 9  →  x < -3 (inversion car ÷ par -3)

**Tableau de signes (inéquations 2nd degré) :**
Pour ax² + bx + c > 0 :
- Trouver les racines x₁ et x₂
- Signe de l'expression = signe de a à l'extérieur des racines""",
            "exemples": [
                "x² - 5x + 6 = 0 → Δ = 25 - 24 = 1 → x₁ = 2, x₂ = 3",
                "2x + 3 > 7 → 2x > 4 → x > 2",
                "x² - 4 = 0 → (x-2)(x+2) = 0 → x = 2 ou x = -2"
            ]
        },

        "fonctions_reference": {
            "titre": "Fonctions de Référence et Généralités (Seconde)",
            "contenu": """**Notion de fonction :**
Une fonction f associe à chaque valeur de x une seule valeur f(x).
Notation : f : x → f(x) ou y = f(x)

**Domaine de définition :**
- Ensemble des valeurs de x où f est définie
- f(x) = 1/x → x ≠ 0 → D_f = ℝ \ {0}
- f(x) = √x → x ≥ 0 → D_f = [0 ; +∞[

**Fonctions de référence :**

1. **Fonction affine : f(x) = ax + b**
   - a = pente (coefficient directeur), b = ordonnée à l'origine
   - Si a > 0 : croissante | Si a < 0 : décroissante
   - Droite qui passe par (0, b)

2. **Fonction carré : f(x) = x²**
   - Parabole, axe de symétrie x = 0
   - Décroissante sur ]-∞ ; 0] , Croissante sur [0 ; +∞[
   - Minimum en x = 0 : f(0) = 0

3. **Fonction inverse : f(x) = 1/x**
   - Définie sur ℝ \ {0}
   - Hyperbole, décroissante sur chaque intervalle
   - Asymptotes : x = 0 (verticale) et y = 0 (horizontale)

4. **Fonction racine carrée : f(x) = √x**
   - Définie sur [0 ; +∞[
   - Croissante sur [0 ; +∞[

**Parité :**
- f paire si f(-x) = f(x) pour tout x [symétrie axe y]
- f impaire si f(-x) = -f(x) pour tout x [symétrie point O]
- f(x) = x² → paire | f(x) = x³ → impaire""",
            "exemples": [
                "f(x) = 2x + 3 : pente = 2, ordonnée = 3",
                "f(x) = x² : minimum 0 en x = 0",
                "f(x) = 1/x : non définie en x = 0",
                "f(4) = √4 = 2"
            ]
        },

        "vecteurs_geometrie": {
            "titre": "Vecteurs et Géométrie dans le Plan (Seconde)",
            "contenu": """**Vecteur :**
Un vecteur AB est défini par :
- Direction (la droite qui porte AB)
- Sens (de A vers B)
- Norme (longueur) : |AB| = √[(xB-xA)² + (yB-yA)²]
- Coordonnées : AB⃗ = (xB - xA ; yB - yA)

**Opérations sur les vecteurs :**
- Addition : u⃗(x₁; y₁) + v⃗(x₂; y₂) = (x₁+x₂ ; y₁+y₂)
- Multiplication par scalaire : k × u⃗(x; y) = (kx ; ky)
- Vecteurs colinéaires : u⃗ et v⃗ colinéaires si x₁y₂ - x₂y₁ = 0

**Milieu d'un segment :**
Milieu M de AB : M = ((xA+xB)/2 ; (yA+yB)/2)

**Distance entre deux points :**
AB = √[(xB-xA)² + (yB-yA)²]

**Équation de droite :**
y = ax + b (forme réduite)
- a = (yB - yA)/(xB - xA) (pente)
- Droites parallèles : même pente a
- Droites perpendiculaires : a₁ × a₂ = -1

**Cercle de centre Ω(a; b) et rayon r :**
Équation : (x - a)² + (y - b)² = r²""",
            "exemples": [
                "A(1;2) B(4;6) → AB⃗ = (3; 4) → |AB| = √(9+16) = 5",
                "Milieu M de AB = ((1+4)/2 ; (2+6)/2) = (2,5 ; 4)",
                "Droite passant par A(0;3) avec pente 2 : y = 2x + 3"
            ]
        },

        "statistiques_descriptives": {
            "titre": "Statistiques Descriptives (Seconde)",
            "contenu": """**Vocabulaire :**
- Population : ensemble étudié
- Individu : élément de la population
- Caractère : propriété mesurée (ex : taille, note)
- Effectif : nombre d'individus ayant une valeur
- Fréquence : effectif / effectif total

**Indicateurs de position :**

**1. Moyenne arithmétique (x̄) :**
x̄ = (somme de toutes les valeurs) / (nombre de valeurs)
x̄ = Σ(xᵢ × nᵢ) / Σnᵢ

**2. Médiane (Me) :**
Valeur qui partage la série en deux moitiés égales.
- Si n pair : moyenne des valeurs de rang n/2 et n/2 + 1
- Si n impair : valeur de rang (n+1)/2

**3. Quartiles :**
- Q₁ (1er quartile) : 25% des valeurs sont inférieures à Q₁
- Q₃ (3e quartile) : 75% des valeurs sont inférieures à Q₃
- Écart interquartile : Q₃ - Q₁

**Indicateurs de dispersion :**

**1. Étendue :** valeur maximale - valeur minimale

**2. Variance (V) :**
V = Σ(xᵢ - x̄)² × nᵢ / Σnᵢ

**3. Écart-type (σ) :**
σ = √V (racine carrée de la variance)
Plus σ est grand, plus les valeurs sont dispersées autour de la moyenne.

**Diagrammes :**
- Diagramme en bâtons (données discrètes)
- Histogramme (données continues)
- Boîte à moustaches : min | Q₁ | Me | Q₃ | max""",
            "exemples": [
                "Série : 2, 4, 6, 8, 10 → x̄ = 30/5 = 6",
                "Médiane de 1, 3, 5, 7, 9 → Me = 5 (3e valeur sur 5)",
                "Étendue : max(10) - min(2) = 8"
            ]
        },

        "probabilites_base": {
            "titre": "Probabilités — Notions de Base (Seconde)",
            "contenu": """**Vocabulaire fondamental :**
- **Expérience aléatoire** : résultat non prévisible (ex : lancer de dé)
- **Univers Ω** : ensemble de tous les résultats possibles
- **Événement** : sous-ensemble de Ω
- **Événement certain** : probabilité = 1
- **Événement impossible** : probabilité = 0

**Lancer d'un dé à 6 faces :**
Ω = {1, 2, 3, 4, 5, 6}
P(obtenir 3) = 1/6
P(obtenir pair) = 3/6 = 1/2

**Règles de probabilité :**
- 0 ≤ P(A) ≤ 1 pour tout événement A
- P(Ω) = 1
- P(∅) = 0
- P(Ā) = 1 - P(A) [événement contraire]
- P(A ∪ B) = P(A) + P(B) - P(A ∩ B)
- Si A et B incompatibles (A ∩ B = ∅) : P(A ∪ B) = P(A) + P(B)

**Probabilité conditionnelle :**
P(A sachant B) = P(A ∩ B) / P(B)

**Indépendance :**
A et B indépendants si P(A ∩ B) = P(A) × P(B)

**Tableau croisé et arbre des probabilités :**
Outil pour organiser et calculer les probabilités dans des situations à plusieurs étapes.""",
            "exemples": [
                "Dé : P(face ≥ 4) = P({4,5,6}) = 3/6 = 1/2",
                "P(pair) = 3/6 → P(impair) = 1 - 1/2 = 1/2",
                "Tirage avec remise : P(A ∩ B) = P(A) × P(B)"
            ]
        }
    },

    # =========================================================
    # PREMIÈRE STPL
    # =========================================================
    "premiere_stpl": {

        "derivees": {
            "titre": "Calcul de Dérivées — Première STPL",
            "contenu": """**Définition de la dérivée :**
f'(x₀) = lim[h→0] [f(x₀ + h) - f(x₀)] / h
La dérivée mesure le taux de variation instantané (la pente de la tangente en x₀).

**Dérivées des fonctions de base :**
| Fonction f(x)    | Dérivée f'(x)         |
|------------------|-----------------------|
| c (constante)    | 0                     |
| x                | 1                     |
| xⁿ               | n × xⁿ⁻¹              |
| √x               | 1/(2√x)               |
| 1/x              | -1/x²                 |
| eˣ               | eˣ                    |
| ln(x)            | 1/x                   |
| sin(x)           | cos(x)                |
| cos(x)           | -sin(x)               |

**Règles de calcul :**
- **(u + v)' = u' + v'**
- **(k × u)' = k × u'**  (k constante)
- **(u × v)' = u'v + uv'** (dérivée d'un produit)
- **(u/v)' = (u'v - uv') / v²** (dérivée d'un quotient)
- **(u(v(x)))' = v'(x) × u'(v(x))** (dérivée d'une composée)

**Sens de variation grâce à f' :**
- f'(x) > 0 sur un intervalle → f **croissante** sur cet intervalle
- f'(x) < 0 sur un intervalle → f **décroissante** sur cet intervalle
- f'(x) = 0 → point critique (souvent un extremum : maximum ou minimum)

**Équation de la tangente en x₀ :**
y = f'(x₀)(x - x₀) + f(x₀)""",
            "exemples": [
                "f(x) = x³ - 3x → f'(x) = 3x² - 3",
                "f'(x) = 0 → 3x² = 3 → x = ±1",
                "Tangente en x₀=1 : y = f'(1)(x-1) + f(1) = 0(x-1) + (-2) = -2",
                "g(x) = (2x+1)⁴ → g'(x) = 4×2×(2x+1)³ = 8(2x+1)³"
            ]
        },

        "tableaux_variations": {
            "titre": "Tableaux de Variations et Extrema — Première STPL",
            "contenu": """**Méthode pour dresser un tableau de variations :**
1. Calculer f'(x)
2. Trouver les zéros de f'(x) (résoudre f'(x) = 0)
3. Étudier le signe de f'(x) sur chaque intervalle
4. En déduire le sens de variation de f
5. Calculer les valeurs de f aux points critiques

**Maximum et minimum locaux :**
- En x₀ : si f' change de signe **+ → -** : maximum local
- En x₀ : si f' change de signe **- → +** : minimum local

**Exemple complet :**
f(x) = x³ - 3x + 2 sur ℝ
f'(x) = 3x² - 3 = 3(x² - 1) = 3(x - 1)(x + 1)
f'(x) = 0 → x = -1 ou x = 1

| x          | -∞    | -1   |      | 1    |    +∞ |
|------------|-------|------|------|------|-------|
| f'(x)      |   +   |  0   |  -   |  0   |   +   |
| f(x)       |  ↗   |  4   |  ↘  |  0   |  ↗   |

Maximum local : f(-1) = 4
Minimum local : f(1) = 0""",
            "exemples": [
                "f(x) = x² - 4x + 3 → f'(x) = 2x - 4 = 0 → x = 2 (minimum)",
                "f(2) = 4 - 8 + 3 = -1 (valeur minimale)",
                "Croissante sur [2; +∞[ et décroissante sur ]-∞; 2]"
            ]
        },

        "suites_numeriques": {
            "titre": "Suites Numériques — Première STPL",
            "contenu": """**Définition :**
Une suite est une liste ordonnée de nombres : u₀, u₁, u₂, ..., uₙ, ...

**Suite arithmétique :**
uₙ₊₁ = uₙ + r  (r = raison)
- Terme général : uₙ = u₀ + n × r
- Somme des n premiers termes : Sₙ = n × (u₀ + uₙ₋₁) / 2

**Suite géométrique :**
uₙ₊₁ = uₙ × q  (q = raison)
- Terme général : uₙ = u₀ × qⁿ
- Somme des n premiers termes (q ≠ 1) : Sₙ = u₀ × (1 - qⁿ) / (1 - q)

**Limite d'une suite :**
- Si uₙ → L quand n → +∞ : la suite converge vers L
- Suite géométrique :
  - Si |q| < 1 : qⁿ → 0 (suite converge vers 0)
  - Si q > 1 : qⁿ → +∞ (suite diverge)
  - Si q = 1 : constante
  - Si q ≤ -1 : oscille (diverge)

**Raisonnement par récurrence :**
Pour prouver une propriété Pₙ pour tout n ≥ n₀ :
1. **Initialisation** : vérifier P(n₀)
2. **Hérédité** : supposer P(n) vraie, montrer P(n+1) vraie""",
            "exemples": [
                "Suite arith : u₀=3, r=4 → u₅ = 3 + 5×4 = 23",
                "Suite géom : u₀=2, q=3 → u₄ = 2 × 3⁴ = 162",
                "Somme arith 5 termes (1,4,7,10,13) : S = 5×(1+13)/2 = 35"
            ]
        },

        "trigonometrie": {
            "titre": "Trigonométrie — Première STPL",
            "contenu": """**Dans un triangle rectangle :**
Pour un angle aigu α :
- sin(α) = côté opposé / hypoténuse
- cos(α) = côté adjacent / hypoténuse
- tan(α) = côté opposé / côté adjacent = sin(α)/cos(α)

**Valeurs remarquables :**
| α        | 0°  | 30°    | 45°    | 60°    | 90° |
|----------|-----|--------|--------|--------|-----|
| sin(α)   | 0   | 1/2    | √2/2   | √3/2   | 1   |
| cos(α)   | 1   | √3/2   | √2/2   | 1/2    | 0   |
| tan(α)   | 0   | √3/3   | 1      | √3     | —   |

**Identités fondamentales :**
- sin²(α) + cos²(α) = 1
- cos(2α) = cos²(α) - sin²(α) = 1 - 2sin²(α) = 2cos²(α) - 1
- sin(2α) = 2 sin(α) cos(α)

**Mesure en radians :**
- 180° = π radians
- 90° = π/2 rad, 60° = π/3 rad, 45° = π/4 rad, 30° = π/6 rad

**Fonctions sin et cos :**
- Périodiques de période 2π
- -1 ≤ sin(x) ≤ 1 et -1 ≤ cos(x) ≤ 1
- Dérivées : sin'(x) = cos(x) et cos'(x) = -sin(x)""",
            "exemples": [
                "Triangle rectangle : angle 30°, hyp=10 → côté opp = 10×sin(30°) = 5",
                "sin²(45°) + cos²(45°) = (√2/2)² + (√2/2)² = 1/2 + 1/2 = 1",
                "cos(60°) = 1/2 ; sin(60°) = √3/2"
            ]
        },

        "loi_binomiale": {
            "titre": "Variable Aléatoire et Loi Binomiale — Première STPL",
            "contenu": """**Variable aléatoire discrète X :**
X prend des valeurs x₁, x₂, ..., xₙ avec des probabilités p₁, p₂, ..., pₙ

**Espérance E(X) :**
E(X) = Σ xᵢ × P(X = xᵢ)
→ Valeur moyenne que prend X sur un grand nombre d'expériences

**Variance V(X) et Écart-type σ(X) :**
V(X) = E(X²) - [E(X)]²
σ(X) = √V(X)

**Schéma de Bernoulli :**
- 1 expérience avec 2 issues : succès (p) ou échec (1-p)
- X = 1 si succès, X = 0 si échec
- E(X) = p, V(X) = p(1-p)

**Loi Binomiale B(n, p) :**
n répétitions indépendantes d'une épreuve de Bernoulli de probabilité p.
X = nombre de succès

**Formule :**
P(X = k) = C(n,k) × pᵏ × (1-p)ⁿ⁻ᵏ

où C(n,k) = n! / (k! × (n-k)!) = "k parmi n"

**Paramètres :**
- Espérance : E(X) = n × p
- Variance : V(X) = n × p × (1-p)
- Écart-type : σ = √(npq) avec q = 1-p

**Condition d'approximation par la loi normale :**
Si n ≥ 30 et np ≥ 5 et nq ≥ 5 → loi binomiale ≈ loi normale""",
            "exemples": [
                "X~B(10, 0,3) : P(X=4) = C(10,4)×0,3⁴×0,7⁶ ≈ 0,200",
                "E(X) = 10 × 0,3 = 3 ; V(X) = 10 × 0,3 × 0,7 = 2,1",
                "C(5,2) = 5!/(2!×3!) = 10"
            ]
        },

        "fonctions_exp_ln": {
            "titre": "Fonctions Exponentielle et Logarithme Népérien — Première STPL",
            "contenu": """**La fonction exponentielle f(x) = eˣ :**
- e ≈ 2,718... (nombre d'Euler)
- Définie sur ℝ, valeurs dans ]0 ; +∞[
- Toujours positive : eˣ > 0 pour tout x
- Croissante sur ℝ
- Dérivée : (eˣ)' = eˣ

**Propriétés de eˣ :**
- eˣ × eʸ = eˣ⁺ʸ
- eˣ / eʸ = eˣ⁻ʸ
- (eˣ)ⁿ = eⁿˣ
- e⁰ = 1

**La fonction logarithme népérien f(x) = ln(x) :**
- Définie sur ]0 ; +∞[ (x > 0 obligatoire !)
- Croissante sur ]0 ; +∞[
- Dérivée : (ln x)' = 1/x

**Propriétés de ln(x) :**
- ln(a × b) = ln(a) + ln(b)
- ln(a / b) = ln(a) - ln(b)
- ln(aⁿ) = n × ln(a)
- ln(e) = 1 et ln(1) = 0

**Lien entre eˣ et ln(x) :**
- ln(eˣ) = x pour tout x ∈ ℝ
- e^(ln x) = x pour x > 0
- Elles sont **inverses** l'une de l'autre

**Résoudre des équations :**
- eˣ = a → x = ln(a) (si a > 0)
- ln(x) = b → x = eᵇ""",
            "exemples": [
                "e² × e³ = e⁵",
                "ln(e³) = 3",
                "eˣ = 5 → x = ln(5) ≈ 1,609",
                "ln(x) = 2 → x = e² ≈ 7,389"
            ]
        }
    },

    # =========================================================
    # TERMINALE STPL
    # =========================================================
    "terminale_stpl": {

        "calcul_integral": {
            "titre": "Calcul Intégral — Terminale STPL",
            "contenu": """**Primitives d'une fonction :**
F est une primitive de f si F'(x) = f(x) pour tout x.
Si F est une primitive de f, alors toutes les primitives sont F(x) + C (C constante).

**Primitives usuelles :**
| f(x)         | F(x) (primitive)    |
|--------------|---------------------|
| k (constante)| kx + C              |
| xⁿ (n ≠ -1) | xⁿ⁺¹/(n+1) + C      |
| 1/x          | ln|x| + C           |
| eˣ           | eˣ + C              |
| sin(x)       | -cos(x) + C         |
| cos(x)       | sin(x) + C          |
| eᵃˣ          | (1/a)eᵃˣ + C        |
| 1/√x         | 2√x + C             |

**Intégrale définie :**
∫[a→b] f(x) dx = [F(x)]ₐᵇ = F(b) - F(a)

**Interprétation géométrique :**
Si f(x) ≥ 0 sur [a ; b], alors ∫[a→b] f(x) dx = aire sous la courbe entre x=a et x=b.

**Propriétés des intégrales :**
- ∫[a→b] [f(x) + g(x)] dx = ∫[a→b] f(x) dx + ∫[a→b] g(x) dx
- ∫[a→b] k × f(x) dx = k × ∫[a→b] f(x) dx
- ∫[a→b] f(x) dx = -∫[b→a] f(x) dx
- ∫[a→a] f(x) dx = 0

**Valeur moyenne d'une fonction :**
m = (1/(b-a)) × ∫[a→b] f(x) dx

**Aire entre deux courbes :**
Si f(x) ≥ g(x) sur [a ; b] :
Aire = ∫[a→b] [f(x) - g(x)] dx""",
            "exemples": [
                "∫[0→2] x² dx = [x³/3]₀² = 8/3 - 0 = 8/3",
                "∫[0→1] eˣ dx = [eˣ]₀¹ = e - 1 ≈ 1,718",
                "Valeur moyenne de f(x)=x² sur [0;3] : m = (1/3) × [x³/3]₀³ = (1/3)×9 = 3"
            ]
        },

        "equations_differentielles": {
            "titre": "Équations Différentielles — Terminale STPL",
            "contenu": """**Définition :**
Une équation différentielle lie une fonction f à sa (ses) dérivée(s).

**Type 1 : y' = ay  (équation homogène)**
Solution générale : y = C × eᵃˣ  (C ∈ ℝ)
→ Exponentielle de coefficient a

**Résolution avec condition initiale :**
Si y(0) = y₀ alors C = y₀
Donc : y = y₀ × eᵃˣ

**Type 2 : y' = ay + b  (équation avec second membre constant)**
Solution particulière : y_p = -b/a (constante)
Solution générale : y = C × eᵃˣ - b/a

**Méthode de résolution :**
1. Trouver la solution de l'équation homogène y' = ay → yₕ = C × eᵃˣ
2. Trouver une solution particulière yₚ (constante ou polynôme)
3. Solution générale : y = yₕ + yₚ
4. Appliquer la condition initiale pour trouver C

**Applications :**
- Croissance et décroissance d'une population
- Refroidissement/réchauffement (loi de Newton)
- Radioactivité : N(t) = N₀ × e⁻ᵏᵗ
- Charge/décharge de condensateur en physique

**Demi-vie :**
t₁/₂ tel que N(t₁/₂) = N₀/2
→ e⁻ᵏᵗ½ = 1/2 → t₁/₂ = ln(2)/k""",
            "exemples": [
                "y' = 3y → y = C×e³ˣ ; si y(0)=2 → y = 2e³ˣ",
                "y' = -2y + 4 → yₚ = 2, y = Ce⁻²ˣ + 2 ; si y(0)=5 → C=3 → y = 3e⁻²ˣ + 2",
                "Radioactivité : N(t) = 1000×e⁻⁰'⁰⁵ᵗ → N(10) = 1000×e⁻⁰'⁵ ≈ 607"
            ]
        },

        "loi_normale": {
            "titre": "Loi Normale et Statistiques Inférentielles — Terminale STPL",
            "contenu": """**La loi normale N(μ, σ) :**
- μ = espérance (moyenne)
- σ = écart-type
- Courbe en cloche, symétrique par rapport à x = μ
- 68% des valeurs dans [μ - σ ; μ + σ]
- 95% des valeurs dans [μ - 2σ ; μ + 2σ]
- 99,7% des valeurs dans [μ - 3σ ; μ + 3σ]

**Loi normale centrée réduite N(0, 1) :**
Z = (X - μ) / σ

Table de la loi normale : P(Z ≤ z) = Φ(z)
- Φ(0) = 0,5
- Φ(1,645) ≈ 0,95
- Φ(1,96) ≈ 0,975
- P(−z ≤ Z ≤ z) = 2Φ(z) − 1

**Intervalle de confiance pour une proportion p :**
n mesures, fréquence observée f
Intervalle à 95% : [f - 1,96√(f(1-f)/n) ; f + 1,96√(f(1-f)/n)]

**Test d'hypothèse :**
- H₀ : hypothèse nulle (à tester)
- H₁ : hypothèse alternative
- Niveau de signification α (souvent 5%)
- Si la valeur observée est dans la zone de rejet → on rejette H₀

**Approximation binomiale → normale :**
X~B(n,p) peut être approchée par N(np, √(np(1-p))) si n grand, np ≥ 5 et nq ≥ 5""",
            "exemples": [
                "X~N(100, 15) : P(85 ≤ X ≤ 115) = P(|Z| ≤ 1) ≈ 68%",
                "n=100, f=0,6 : IC 95% = [0,6 ± 1,96×√(0,24/100)] = [0,504 ; 0,696]",
                "Z = (X-μ)/σ = (115-100)/15 = 1 → P(X ≤ 115) = Φ(1) ≈ 0,841"
            ]
        },

        "matrices": {
            "titre": "Calcul Matriciel — Terminale STPL",
            "contenu": """**Définition :**
Une matrice est un tableau de nombres à m lignes et n colonnes.
Notation : A = (aᵢⱼ) où i = ligne, j = colonne

**Opérations de base :**

**Addition/Soustraction (matrices de même taille) :**
(A + B)ᵢⱼ = aᵢⱼ + bᵢⱼ

**Multiplication par un scalaire k :**
(kA)ᵢⱼ = k × aᵢⱼ

**Produit de matrices A(m×n) × B(n×p) = C(m×p) :**
cᵢⱼ = Σₖ aᵢₖ × bₖⱼ
→ Ligne i de A × Colonne j de B

**Matrice identité I (carrée) :**
Coefficients diagonaux = 1, reste = 0
A × I = I × A = A

**Déterminant d'une matrice 2×2 :**
A = [[a, b], [c, d]]
det(A) = ad - bc

**Matrice inverse A⁻¹ (si det(A) ≠ 0) :**
Pour A 2×2 : A⁻¹ = (1/det(A)) × [[d, -b], [-c, a]]
A × A⁻¹ = I

**Résolution de système avec les matrices :**
AX = B → X = A⁻¹ × B

**Exemple :**
{ 2x + y = 5
{ x - y = 1
A = [[2,1],[1,-1]], B = [[5],[1]]
det(A) = -2 - 1 = -3
A⁻¹ = (-1/3) × [[-1,-1],[-1,2]] = [[1/3, 1/3],[1/3, -2/3]]
X = A⁻¹ × B = [[2],[1]] → x=2, y=1""",
            "exemples": [
                "[[1,2],[3,4]] × [[5],[6]] = [[1×5+2×6],[3×5+4×6]] = [[17],[39]]",
                "det([[3,1],[2,4]]) = 3×4 - 1×2 = 10",
                "AX = B avec det(A)≠0 → X = A⁻¹B"
            ]
        },

        "logarithmes_approfondis": {
            "titre": "Logarithmes et Exponentielles Approfondis — Terminale STPL",
            "contenu": """**Récapitulatif des propriétés :**

**Fonction ln(x) :**
- Domaine : ]0 ; +∞[
- ln(1) = 0, ln(e) = 1
- ln(a×b) = ln(a) + ln(b)
- ln(a/b) = ln(a) - ln(b)
- ln(aⁿ) = n ln(a)
- ln'(x) = 1/x

**Fonction eˣ :**
- Domaine : ℝ, image : ]0 ; +∞[
- e⁰ = 1, e¹ = e ≈ 2,718
- eᵃ × eᵇ = eᵃ⁺ᵇ
- (eᵃ)ᵇ = eᵃᵇ
- (eˣ)' = eˣ

**Logarithme décimal log₁₀(x) = log(x) :**
- log(10) = 1, log(1) = 0
- log(a×b) = log(a) + log(b)
- log(x) = ln(x) / ln(10)

**Croissances comparées :**
Quand x → +∞ :
- ln(x) / x → 0 (x domine ln)
- xⁿ / eˣ → 0 (eˣ domine tout polynôme)

**Applications :**
- Résolution : eˣ > 5 → x > ln(5) ≈ 1,609
- Résolution : ln(x²) = 4 → 2ln(x) = 4 → ln(x) = 2 → x = e²
- Temps de demi-vie : T = ln(2)/k""",
            "exemples": [
                "ln(6) = ln(2) + ln(3)",
                "e^(2x) = 8 → 2x = ln(8) = 3ln(2) → x = (3/2)ln(2)",
                "ln(x²-1) défini si x²-1 > 0 → |x| > 1"
            ]
        },

        "revision_generale": {
            "titre": "Révision Générale — Baccalauréat STPL Mathématiques",
            "contenu": """**RÉCAPITULATIF COMPLET DES NOTIONS CLÉS :**

**1. Analyse :**
- Dérivées : règles de base, produit, quotient, composée
- Tableaux de variations, extrema
- Primitives et intégrales : calcul et interprétation géométrique
- Équations différentielles : y'=ay et y'=ay+b

**2. Algèbre :**
- Équations et inéquations 1er et 2nd degré
- Suites arithmétiques et géométriques
- Matrices : opérations, déterminant, inverse, résolution de systèmes

**3. Fonctions :**
- Fonctions usuelles : affine, carré, inverse, racine carrée
- Exponentielle eˣ et logarithme ln(x)
- Trigonométrie : sin, cos, tan et valeurs remarquables

**4. Statistiques et Probabilités :**
- Statistiques descriptives : moyenne, médiane, variance, écart-type
- Loi binomiale B(n,p) : P(X=k), E(X), V(X)
- Loi normale N(μ,σ) : standardisation Z, table
- Intervalle de confiance

**CONSEILS POUR L'EXAMEN :**
1. Toujours vérifier le domaine de définition
2. Montrer tous les calculs intermédiaires
3. Interpréter les résultats en contexte
4. Vérifier la cohérence des résultats (signe, ordre de grandeur)
5. Ne pas oublier la constante C dans les primitives""",
            "exemples": [
                "Résumé: Δ=b²-4ac → racines de ax²+bx+c=0",
                "∫eˣdx = eˣ + C ; ∫xⁿdx = xⁿ⁺¹/(n+1) + C",
                "IC 95%: [p̂ ± 1,96√(p̂(1-p̂)/n)]"
            ]
        }
    }
}


# ===================== FONCTIONS UTILITAIRES =====================

def obtenir_cours_maths(niveau, sujet):
    """Retourne le cours de maths pour le niveau et le sujet donnés"""
    if niveau in COURS_MATHEMATIQUES and sujet in COURS_MATHEMATIQUES[niveau]:
        return COURS_MATHEMATIQUES[niveau][sujet]
    return None


def lister_cours_maths(niveau):
    """Retourne la liste des cours disponibles pour un niveau"""
    if niveau in COURS_MATHEMATIQUES:
        return list(COURS_MATHEMATIQUES[niveau].keys())
    return []


def rechercher_cours_maths(mot_cle):
    """Recherche un cours de maths contenant le mot-clé"""
    resultats = []
    mot_cle_lower = mot_cle.lower()

    for niveau, cours in COURS_MATHEMATIQUES.items():
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


# Mots-clés pour détecter une question de maths
MOTS_CLES_MATHS = [
    # Général
    "calcul", "calcule", "calculer", "calculs", "maths", "mathématiques", "math",
    "exercice", "problème", "probleme",
    # Algèbre
    "équation", "equation", "inéquation", "inequation", "polynôme", "polynome",
    "discriminant", "delta", "racine", "factoriser", "développer", "developper",
    "système", "systeme",
    # Fonctions
    "fonction", "dérivée", "derivee", "primitive", "intégrale", "integrale",
    "variation", "extremum", "maximum", "minimum", "croissante", "décroissante",
    "tangente", "limite",
    # Nombres
    "exponentielle", "logarithme", "ln", "log", "puissance", "exposant",
    "racine carrée", "racine carre",
    # Géométrie
    "vecteur", "coordonnée", "distance", "milieu", "droite", "pente",
    "triangle", "cercle", "géométrie", "geometrie",
    # Trigonométrie
    "sinus", "cosinus", "tangente", "sin", "cos", "tan", "trigonométrie",
    "radian", "degré",
    # Suites
    "suite", "arithmétique", "géométrique", "raison", "terme", "récurrence",
    # Statistiques/Probabilités
    "probabilité", "probabilite", "statistique", "moyenne", "médiane", "mediane",
    "variance", "écart-type", "ecart-type", "loi normale", "binomiale",
    "intervalle de confiance", "histogramme",
    # Matrices
    "matrice", "déterminant", "determinant", "inverse",
    # Équations diff.
    "différentielle", "differentielle",
    # Étude de fonction
    "intégration", "integration", "asymptote", "branche infinie",
    "tableau de variation", "domaine de définition", "domaine de definition",
    "ensemble de définition", "ensemble de definition",
]
