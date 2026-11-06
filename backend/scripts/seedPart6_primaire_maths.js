// PARTIE 6 — MATHÉMATIQUES PRIMAIRE COMPLÈTES : CP → CM2 (20 leçons)
export const LECONS_MATHS_PRIMAIRE = [
  {
    slug: 'math-nombres-entiers',
    title: 'Les nombres entiers et la numération',
    category: 'mathematiques', level: 'debutant',
    triggers: ['numération','nombres entiers','unités dizaines centaines','valeur positionnelle','chiffres nombres','lire écrire nombres','milliers millions','nombre en lettres'],
    answer: `Excellente question ! ✨

🔢 **LES NOMBRES ENTIERS ET LA NUMÉRATION**

---

**Le système décimal** est basé sur 10 chiffres : 0, 1, 2, 3, 4, 5, 6, 7, 8, 9.

**Chaque position a une valeur :**

| Milliards | Millions | Milliers | Unités simples |
|---|---|---|---|
| 1 000 000 000 | 1 000 000 | 1 000 | 1 |
| 100 000 000 | 100 000 | 100 | (centaines) |
| 10 000 000 | 10 000 | 10 | (dizaines) |

---

**EXEMPLE : 34 725**

| Dizaines de mille | Milliers | Centaines | Dizaines | Unités |
|---|---|---|---|---|
| 3 | 4 | 7 | 2 | 5 |

→ 34 725 = 3 × 10 000 + 4 × 1 000 + 7 × 100 + 2 × 10 + 5 × 1

---

**LIRE ET ÉCRIRE LES NOMBRES**

- 245 → deux cent quarante-cinq
- 1 000 → mille
- 2 500 → deux mille cinq cents
- 10 000 → dix mille
- 1 000 000 → un million

**Règles d'écriture :**
- "Cent" prend un "s" quand il est multiplié et pas suivi : deux cent**s** (mais : deux cent quatre)
- "Vingt" prend un "s" : quatre-vingts (mais : quatre-vingt-deux)
- On met des traits d'union : vingt-deux, trente-cinq

---

**COMPARER ET RANGER**
- Plus grand : > | Plus petit : < | Égal : =
- Pour comparer, on regarde d'abord le chiffre de gauche (rang le plus élevé).

Continue comme ça ! 💪`,
  },
  {
    slug: 'math-tables-multiplication',
    title: 'Les tables de multiplication',
    category: 'mathematiques', level: 'debutant',
    triggers: ['tables de multiplication','table de 2','table de 3','table de 4','table de 5','table de 6','table de 7','table de 8','table de 9','apprendre tables','multiplication'],
    answer: `Excellente question ! ✨

🧮 **LES TABLES DE MULTIPLICATION**

---

**TABLE DE 2 :** 2, 4, 6, 8, 10, 12, 14, 16, 18, 20
**TABLE DE 3 :** 3, 6, 9, 12, 15, 18, 21, 24, 27, 30
**TABLE DE 4 :** 4, 8, 12, 16, 20, 24, 28, 32, 36, 40
**TABLE DE 5 :** 5, 10, 15, 20, 25, 30, 35, 40, 45, 50
**TABLE DE 6 :** 6, 12, 18, 24, 30, 36, 42, 48, 54, 60
**TABLE DE 7 :** 7, 14, 21, 28, 35, 42, 49, 56, 63, 70
**TABLE DE 8 :** 8, 16, 24, 32, 40, 48, 56, 64, 72, 80
**TABLE DE 9 :** 9, 18, 27, 36, 45, 54, 63, 72, 81, 90
**TABLE DE 10 :** 10, 20, 30, 40, 50, 60, 70, 80, 90, 100

---

**ASTUCES POUR MÉMORISER :**
- **Table de 2 :** doubler le nombre (2×7 = 7+7 = 14)
- **Table de 5 :** toujours 0 ou 5 à la fin (5×4=20, 5×7=35)
- **Table de 9 :** les chiffres de la réponse font toujours 9 en somme (9×7=63 → 6+3=9)
- **Table de 10 :** ajouter un 0 (10×8=80)
- **Commutativité :** 3×7 = 7×3 → apprendre une case = apprendre les deux !

---

**PROPRIÉTÉS :**
- × 0 = toujours 0
- × 1 = toujours le même nombre
- **Commutativité** : a × b = b × a
- **Distributivité** : 6×8 = 6×(4+4) = 24+24 = 48

Continue comme ça ! 💪`,
  },
  {
    slug: 'math-division-euclidienne',
    title: 'La division euclidienne (division avec reste)',
    category: 'mathematiques', level: 'debutant',
    triggers: ['division euclidienne','division avec reste','dividende diviseur quotient reste','poser une division','algorithm division','long division','47 divisé par 5'],
    answer: `Excellente question ! ✨

🧮 **LA DIVISION EUCLIDIENNE**

---

**Vocabulaire :**
- **Dividende** : le nombre qu'on divise (ex. : 47)
- **Diviseur** : le nombre par lequel on divise (ex. : 5)
- **Quotient** : le résultat entier de la division (ex. : 9)
- **Reste** : ce qu'il reste (ex. : 2)

**Relation fondamentale :** dividende = diviseur × quotient + reste
> 47 = 5 × 9 + 2 → vérifie : 5×9=45, 45+2=47 ✅

---

**POSER UNE DIVISION : 253 ÷ 4**

\`\`\`
253 | 4
───   ──
   25 ÷ 4 = 6 (6×4=24), reste 1 → on descend le 3
   13 ÷ 4 = 3 (3×4=12), reste 1

   Résultat : Quotient = 63, Reste = 1
\`\`\`
Vérification : 4 × 63 + 1 = 252 + 1 = 253 ✅

---

**ÉTAPES :**
1. On prend les premiers chiffres du dividende jusqu'à avoir un nombre ≥ diviseur
2. On cherche le plus grand multiple du diviseur qui ne dépasse pas ce nombre
3. On soustrait → c'est le reste partiel
4. On descend le chiffre suivant
5. On répète jusqu'à la fin

---

**Divisibilité rapide :**
- Par 2 : finit par 0, 2, 4, 6, 8
- Par 3 : somme des chiffres divisible par 3
- Par 5 : finit par 0 ou 5
- Par 9 : somme des chiffres divisible par 9
- Par 10 : finit par 0

Continue comme ça ! 💪`,
  },
  {
    slug: 'math-fractions-primaire',
    title: 'Les fractions — initiation',
    category: 'mathematiques', level: 'debutant',
    triggers: ['fraction','fractions','numérateur','dénominateur','fraction simple','moitié','tiers','quart','fraction de la vie courante','3/4','1/2'],
    answer: `Excellente question ! ✨

🧮 **LES FRACTIONS**

---

**Définition :**
Une fraction représente une partie d'un tout.

La fraction **a/b** se lit « a sur b » ou « a b-ième(s) ».
- **a** = **numérateur** (le nombre de parts prises)
- **b** = **dénominateur** (le nombre total de parts égales)

---

**Exemples de la vie courante :**
- 1/2 = une moitié (1 part sur 2 parts égales)
- 1/3 = un tiers
- 1/4 = un quart
- 3/4 = trois quarts

---

**FRACTIONS ÉQUIVALENTES**
On peut multiplier (ou diviser) le numérateur ET le dénominateur par le même nombre :
> 1/2 = 2/4 = 3/6 = 4/8 → toutes égales !

---

**SIMPLIFIER UNE FRACTION** (trouver la fraction la plus simple)
On divise numérateur et dénominateur par leur PGCD.
> 6/9 → PGCD(6,9) = 3 → 6÷3/9÷3 = **2/3**

---

**COMPARER DES FRACTIONS**
- Même dénominateur : on compare les numérateurs → 3/7 < 5/7
- Dénominateurs différents : on réduit au même dénominateur
> 1/2 vs 2/5 → 5/10 vs 4/10 → **1/2 > 2/5**

---

**FRACTION ET NOMBRE DÉCIMAL**
> 1/2 = 0,5 | 1/4 = 0,25 | 3/4 = 0,75 | 1/5 = 0,2 | 1/10 = 0,1

Continue comme ça ! 💪`,
  },
  {
    slug: 'math-nombres-decimaux-primaire',
    title: 'Les nombres décimaux',
    category: 'mathematiques', level: 'debutant',
    triggers: ['nombres décimaux','virgule','dixièmes','centièmes','millièmes','2,5','3,14','lire decimal','comparer decimaux','arrondir decimal'],
    answer: `Excellente question ! ✨

🧮 **LES NOMBRES DÉCIMAUX**

---

**Structure d'un nombre décimal :**

> **3,725**

| Partie entière | , | Dixièmes | Centièmes | Millièmes |
|---|---|---|---|---|
| 3 | , | 7 | 2 | 5 |

- 3 unités
- 7 dixièmes (7/10)
- 2 centièmes (2/100)
- 5 millièmes (5/1000)

---

**LIRE UN DÉCIMAL**
3,725 → « trois virgule sept cent vingt-cinq »
ou → « trois et sept cent vingt-cinq millièmes »

---

**COMPARER DES DÉCIMAUX**
1. On compare d'abord la partie entière
2. Si égale, on compare les dixièmes, puis les centièmes...

> 4,7 vs 4,65 → parties entières égales (4) → dixièmes : 7 > 6 → **4,7 > 4,65**

**Astuce :** 4,7 = 4,70 (on peut ajouter des zéros après la virgule sans changer la valeur)

---

**ARRONDIR UN DÉCIMAL**
À la dizaine : regarder les unités (≥5 → arrondir à 10 supérieur)
À l'unité : regarder les dixièmes
Aux dixièmes : regarder les centièmes (≥5 → +1 au dixième)

**Exemple :** 3,746 arrondi :
- À l'unité → **4** (7 ≥ 5)
- Au dixième → **3,7** (4 < 5)
- Au centième → **3,75** (6 ≥ 5)

---

**OPÉRATIONS SUR LES DÉCIMAUX :**
Toujours aligner les virgules !
> 3,45 + 2,7 = 3,45 + 2,70 = **6,15**

Continue comme ça ! 💪`,
  },
  {
    slug: 'math-multiples-diviseurs',
    title: 'Multiples, diviseurs et critères de divisibilité',
    category: 'mathematiques', level: 'intermediaire',
    triggers: ['multiples','diviseurs','multiple de','diviseur de','critères divisibilité','divisible par','multiple commun','diviseur commun','table des multiples'],
    answer: `Excellente question ! ✨

🧮 **MULTIPLES ET DIVISEURS**

---

**MULTIPLE** : Un multiple de n est le résultat de n × k (k entier)
- Multiples de 4 : 0, 4, 8, 12, 16, 20, 24, 28... (table de 4)
- Multiples de 6 : 0, 6, 12, 18, 24, 30...

---

**DIVISEUR** : a est un diviseur de b si b ÷ a est entier (reste = 0)
- Diviseurs de 12 : 1, 2, 3, 4, 6, 12

**Lien :** 4 est un diviseur de 12 ↔ 12 est un multiple de 4

---

**CRITÈRES DE DIVISIBILITÉ**

| Diviseur | Critère | Exemple |
|---|---|---|
| 2 | dernier chiffre pair (0,2,4,6,8) | 348 ✅ |
| 3 | somme des chiffres divisible par 3 | 3+4+8=15, 15÷3=5 ✅ |
| 4 | les 2 derniers chiffres divisibles par 4 | 348: 48÷4=12 ✅ |
| 5 | finit par 0 ou 5 | 345 ✅ |
| 6 | divisible par 2 ET par 3 | 348 ✅ |
| 9 | somme des chiffres divisible par 9 | 729: 7+2+9=18 ✅ |
| 10 | finit par 0 | 340 ✅ |

---

**PGCD** (Plus Grand Commun Diviseur)
Diviseurs communs de 12 et 18 :
- Diviseurs de 12 : 1, 2, 3, 4, 6, 12
- Diviseurs de 18 : 1, 2, 3, 6, 9, 18
- Communs : 1, 2, 3, 6 → **PGCD = 6**

**PPCM** (Plus Petit Commun Multiple)
- Multiples de 4 : 4, 8, 12, 16, 20, **24**, 28...
- Multiples de 6 : 6, 12, 18, **24**, 30...
- **PPCM(4,6) = 24**

Continue comme ça ! 💪`,
  },
  {
    slug: 'math-nombres-premiers',
    title: 'Les nombres premiers',
    category: 'mathematiques', level: 'intermediaire',
    triggers: ['nombres premiers','nombre premier','premier','décomposition facteurs premiers','crible ératosthène','est premier','factorisation','facteurs premiers de'],
    answer: `Excellente question ! ✨

🧮 **LES NOMBRES PREMIERS**

---

**Définition :** Un nombre premier est un entier ≥ 2 dont les **seuls diviseurs sont 1 et lui-même**.

---

**Liste des premiers nombres premiers :**
2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47...

**Note :** 2 est le seul nombre premier pair. Tous les autres sont impairs.
**1 n'est PAS un nombre premier** (convention mathématique).

---

**TESTER SI UN NOMBRE EST PREMIER**
Pour tester si n est premier, on vérifie si n est divisible par des nombres premiers ≤ √n.

**Exemple : 37 premier ?**
√37 ≈ 6,08 → tester 2, 3, 5
- 37 ÷ 2 = 18,5 (non) | 37 ÷ 3 = 12,3 (non) | 37 ÷ 5 = 7,4 (non)
→ **37 est premier** ✅

**Exemple : 35 premier ?**
- 35 ÷ 5 = 7 → **35 = 5 × 7 → n'est pas premier**

---

**DÉCOMPOSITION EN FACTEURS PREMIERS**
Tout entier > 1 se décompose de façon unique en produit de facteurs premiers.

**Exemple : 60**
60 ÷ 2 = 30 | 30 ÷ 2 = 15 | 15 ÷ 3 = 5 | 5 est premier
→ **60 = 2 × 2 × 3 × 5 = 2² × 3 × 5**

**Exemple : 84 = 2² × 3 × 7**

---

**Utilité :** Calculer rapidement le PGCD et le PPCM.
> PGCD(60, 84) = 2² × 3 = **12**
> PPCM(60, 84) = 2² × 3 × 5 × 7 = **420**

Continue comme ça ! 💪`,
  },
  {
    slug: 'math-proportionnalite-primaire',
    title: 'La proportionnalité et la règle de trois',
    category: 'mathematiques', level: 'intermediaire',
    triggers: ['proportionnalité','proportionnalite','règle de trois','règle de 3','tableau de proportionnalité','4eme proportionnelle','rapport constant','proportionnel','recette cuisine proportions'],
    answer: `Excellente question ! ✨

🧮 **LA PROPORTIONNALITÉ ET LA RÈGLE DE TROIS**

---

**Définition :** Deux grandeurs sont proportionnelles si leur rapport est constant.

**Exemple :** Si 3 cahiers coûtent 6 €, combien coûtent 7 cahiers ?

| Nombre de cahiers | 3 | 7 |
|---|---|---|
| Prix en € | 6 | ? |

Rapport : 6 ÷ 3 = **2 €/cahier** (coefficient de proportionnalité)
→ 7 × 2 = **14 €**

---

**LA RÈGLE DE TROIS (produit en croix)**

Si les deux grandeurs sont proportionnelles :
> a/b = c/x → **x = (b × c) / a**

**Exemple :** 3 cahiers = 6 €, 7 cahiers = ?
> x = (7 × 6) / 3 = 42 / 3 = **14 €**

---

**EXEMPLE CONCRET — RECETTE**
Pour 4 personnes : 300 g de farine. Pour 6 personnes : ?
> x = (6 × 300) / 4 = 1800 / 4 = **450 g**

---

**RECONNAÎTRE LA PROPORTIONNALITÉ**
Un tableau est proportionnel si le rapport ligne1/ligne2 est constant.

| x | 2 | 4 | 6 | 8 |
|---|---|---|---|---|
| y | 5 | 10 | 15 | 20 |

Rapport : 5/2 = 10/4 = 15/6 = 20/8 = **2,5** → ✅ proportionnel

---

**VITESSE — DISTANCE — TEMPS**
> Distance = Vitesse × Temps → d = v × t
> v = d/t | t = d/v

**Exemple :** Voiture à 80 km/h pendant 3h → d = 80 × 3 = **240 km**

Continue comme ça ! 💪`,
  },
  {
    slug: 'math-pourcentages-primaire',
    title: 'Les pourcentages',
    category: 'mathematiques', level: 'intermediaire',
    triggers: ['pourcentage','pourcentages','%','taux','calcul pourcentage','50%','20%','réduction prix','augmentation','soldes','promotion'],
    answer: `Excellente question ! ✨

🧮 **LES POURCENTAGES**

---

**Définition :** Un pourcentage exprime une fraction sur 100.
> **p% = p/100**

**Exemples :**
- 50% = 50/100 = 1/2 = 0,5
- 25% = 1/4 = 0,25
- 10% = 1/10 = 0,1
- 1% = 1/100 = 0,01

---

**CALCULER UN POURCENTAGE D'UN NOMBRE**

**Méthode 1 (fraction) :** p% de N = (p × N) / 100
> 20% de 150 = (20 × 150) / 100 = 3000 / 100 = **30**

**Méthode 2 (décimal) :** multiplier par le coefficient
> 20% de 150 = 0,20 × 150 = **30**

---

**APPLICATIONS COURANTES**

**Réduction (soldes) :**
Prix initial = 80 €, réduction de 15%
→ Réduction = 15% × 80 = 0,15 × 80 = 12 €
→ Prix final = 80 − 12 = **68 €**
→ Ou directement : 80 × (1 − 0,15) = 80 × 0,85 = **68 €**

**Augmentation :**
Salaire = 1 200 €, augmentation de 5%
→ Nouveau salaire = 1200 × 1,05 = **1 260 €**

**Trouver le taux :**
25 étudiants sur 40 ont réussi.
> Taux = (25/40) × 100 = **62,5%**

---

**PIÈGES À ÉVITER :**
- Une réduction de 20% puis une de 20% ≠ 40% de réduction !
- (1 − 0,2) × (1 − 0,2) = 0,8 × 0,8 = 0,64 → réduction réelle : **36%**

Continue comme ça ! 💪`,
  },
  {
    slug: 'math-perimetre-aire-primaire',
    title: 'Périmètre et aire — révision complète',
    category: 'geometrie', level: 'debutant',
    triggers: ['périmètre','perimetre','aire','surface','cm2','m2','calculer perimetre','calculer surface','quelle est l aire','mesurer contour'],
    answer: `Excellente question ! ✨

📐 **PÉRIMÈTRE ET AIRE — RÉCAPITULATIF**

---

**PÉRIMÈTRE = longueur du contour** (en cm, m, km...)

| Figure | Formule périmètre |
|---|---|
| Carré (côté a) | P = 4a |
| Rectangle (L × l) | P = 2(L + l) |
| Triangle (a, b, c) | P = a + b + c |
| Cercle (rayon r) | P = 2πr |

**Exemple :** Rectangle 8 cm × 5 cm → P = 2(8+5) = **26 cm**

---

**AIRE = surface intérieure** (en cm², m², km²...)

| Figure | Formule aire |
|---|---|
| Carré (côté a) | A = a² |
| Rectangle (L × l) | A = L × l |
| Triangle (base b, hauteur h) | A = (b × h) / 2 |
| Parallélogramme (b, h) | A = b × h |
| Trapèze (B, b, h) | A = (B + b) × h / 2 |
| Disque (rayon r) | A = πr² |

**Exemple :** Triangle base 6 cm, hauteur 4 cm → A = (6×4)/2 = **12 cm²**

---

**CONVERSIONS D'AIRES :**
- 1 m² = 10 000 cm² = 100 dm²
- 1 km² = 1 000 000 m²
- 1 ha = 10 000 m²

**Attention :** Pour convertir des aires, on multiplie/divise par le carré du coefficient !
> 1 m = 100 cm → 1 m² = 100² cm² = 10 000 cm²

Continue comme ça ! 💪`,
  },
  {
    slug: 'math-vitesse-duree-distance',
    title: 'Vitesse, durée et distance',
    category: 'mathematiques', level: 'intermediaire',
    triggers: ['vitesse','distance','durée','durée temps','km/h','m/s','speed distance time','calculer vitesse','calculer durée','calculer distance','km heure'],
    answer: `Excellente question ! ✨

🧮 **VITESSE, DURÉE ET DISTANCE**

---

**LA FORMULE FONDAMENTALE :**
> **d = v × t**
> (Distance = Vitesse × Temps)

Les 3 formules déduites :

| Chercher | Formule |
|---|---|
| Distance d | d = v × t |
| Vitesse v | v = d / t |
| Temps t | t = d / v |

**Moyen mémo : triangle DST (Distance Speed Time)**

---

**EXEMPLES**

**Trouver la distance :**
Voiture à 90 km/h pendant 2h30 (= 2,5 h)
> d = 90 × 2,5 = **225 km**

**Trouver la vitesse :**
240 km parcourus en 3 h
> v = 240 / 3 = **80 km/h**

**Trouver la durée :**
350 km à 70 km/h
> t = 350 / 70 = **5 heures**

---

**CONVERSIONS D'UNITÉS**

km/h → m/s : diviser par 3,6
> 90 km/h = 90 / 3,6 = **25 m/s**

m/s → km/h : multiplier par 3,6
> 25 m/s = 25 × 3,6 = **90 km/h**

---

**DURÉES EN HEURES ET MINUTES**
2h30 = 2,5 h (car 30 min = 0,5 h)
1h45 = 1,75 h (car 45 min = 0,75 h)

**Convertir des minutes en heures :** diviser par 60
> 90 min = 90/60 = **1,5 h = 1h30**

Continue comme ça ! 💪`,
  },
  {
    slug: 'math-puissances-base',
    title: 'Les puissances — base et exposant',
    category: 'mathematiques', level: 'intermediaire',
    triggers: ['puissances','puissance','exposant','carré','cube','2 au carré','3 au cube','puissance 10','notation scientifique','a exposant n'],
    answer: `Excellente question ! ✨

🧮 **LES PUISSANCES**

---

**Définition :**
> **aⁿ = a × a × a × ... × a** (n fois)

- **a** = base
- **n** = exposant

**Exemples :**
- 2³ = 2 × 2 × 2 = **8** (2 au cube)
- 5² = 5 × 5 = **25** (5 au carré)
- 10⁴ = 10 000

---

**PUISSANCES DE 10** (très importantes !)

| 10⁰ | 10¹ | 10² | 10³ | 10⁴ | 10⁵ | 10⁶ |
|---|---|---|---|---|---|---|
| 1 | 10 | 100 | 1 000 | 10 000 | 100 000 | 1 000 000 |

---

**RÈGLES DE CALCUL**

| Règle | Formule | Exemple |
|---|---|---|
| Produit même base | aᵐ × aⁿ = aᵐ⁺ⁿ | 3² × 3⁴ = 3⁶ = 729 |
| Quotient même base | aᵐ ÷ aⁿ = aᵐ⁻ⁿ | 5⁵ ÷ 5² = 5³ = 125 |
| Puissance de puissance | (aᵐ)ⁿ = aᵐˣⁿ | (2³)² = 2⁶ = 64 |
| Exposant 0 | a⁰ = 1 | 7⁰ = 1 |
| Exposant 1 | a¹ = a | 9¹ = 9 |
| Exposant négatif | a⁻ⁿ = 1/aⁿ | 2⁻³ = 1/8 |

---

**NOTATION SCIENTIFIQUE**
> a × 10ⁿ avec 1 ≤ a < 10

**Exemples :**
- 3 400 000 = **3,4 × 10⁶**
- 0,00045 = **4,5 × 10⁻⁴**

Continue comme ça ! 💪`,
  },
  {
    slug: 'math-fractions-operations',
    title: 'Opérations sur les fractions',
    category: 'mathematiques', level: 'intermediaire',
    triggers: ['additionner fractions','soustraire fractions','multiplier fractions','diviser fractions','operations fractions','même dénominateur fractions','dénominateur commun','addition fraction'],
    answer: `Excellente question ! ✨

🧮 **OPÉRATIONS SUR LES FRACTIONS**

---

**ADDITION ET SOUSTRACTION**

**Même dénominateur :** on additionne les numérateurs.
> 3/7 + 2/7 = **(3+2)/7 = 5/7**

**Dénominateurs différents :** on réduit au même dénominateur (PPCM).
> 1/3 + 1/4 → PPCM(3,4) = 12
> = 4/12 + 3/12 = **7/12**

**Méthode rapide :**
> a/b + c/d = (ad + bc) / bd

> 1/3 + 1/4 = (1×4 + 1×3) / (3×4) = (4+3)/12 = **7/12**

---

**MULTIPLICATION**

> **(a/b) × (c/d) = (a×c) / (b×d)**

On multiplie numérateur par numérateur, dénominateur par dénominateur.

**Exemple :** 2/3 × 4/5 = (2×4)/(3×5) = **8/15**

**Simplification avant multiplication :**
> 4/9 × 3/8 → simplifier 4 et 8 (÷4), et 3 et 9 (÷3) → **1/3 × 1/2 = 1/6**

---

**DIVISION** (= multiplier par l'inverse)

> **(a/b) ÷ (c/d) = (a/b) × (d/c) = (a×d) / (b×c)**

**Exemple :** 3/4 ÷ 2/5 = 3/4 × 5/2 = **15/8**

---

**SIMPLIFIER LE RÉSULTAT**
Toujours simplifier la fraction finale si possible.
> 6/9 = **2/3** (÷3) | 10/25 = **2/5** (÷5)

Continue comme ça ! 💪`,
  },
  {
    slug: 'math-problemes-type',
    title: 'Méthode pour résoudre des problèmes mathématiques',
    category: 'mathematiques', level: 'debutant',
    triggers: ['résoudre problème','problème mathématique','méthode problème','poser problème','schéma problème','chercher donné question','problème texte','comment résoudre','etapes resolution'],
    answer: `Excellente question ! ✨

🧮 **MÉTHODE POUR RÉSOUDRE UN PROBLÈME**

---

**LES 5 ÉTAPES FONDAMENTALES**

**1. LIRE et comprendre**
- Lire le problème au moins 2 fois
- Repérer ce qu'on cherche (la question)
- Identifier les données (informations données)

**2. SCHÉMATISER (si utile)**
- Dessiner la situation
- Faire un tableau, un schéma

**3. CHOISIR les opérations**
- Addition : réunir, ajouter, au total
- Soustraction : retirer, différence, de plus que
- Multiplication : fois, chaque, autant de fois
- Division : partager, distribuer, par personne

**4. CALCULER**
- Poser les opérations clairement
- Montrer toutes les étapes
- Vérifier les unités

**5. VÉRIFIER et RÉDIGER**
- Vérifier que la réponse a du sens
- Écrire la réponse en phrase complète avec l'unité

---

**EXEMPLE RÉSOLU**

> « Martin a 245 billes. Il en donne 1/5 à sa sœur. Combien lui en reste-t-il ? »

1. **Question :** Combien reste-t-il à Martin ?
2. **Données :** 245 billes, donne 1/5
3. **Calcul :** 1/5 de 245 = 245 ÷ 5 = 49 billes données
4. **Reste :** 245 − 49 = **196 billes**
5. **Réponse :** Il reste **196 billes** à Martin.

---

**MOTS-CLÉS COURANTS :**
- « au total » → addition
- « combien de plus » → soustraction
- « chaque » → multiplication
- « en partageant » → division
- « à quelle vitesse » → d = v × t

Continue comme ça ! 💪`,
  },
  {
    slug: 'math-calcul-mental',
    title: 'Techniques de calcul mental',
    category: 'mathematiques', level: 'debutant',
    triggers: ['calcul mental','calculer de tête','astuce calcul','calcul rapide','multiplier 11','multiplier 25','ajouter 9','soustraire 99','stratégie calcul','calcul rapide'],
    answer: `Excellente question ! ✨

🧮 **TECHNIQUES DE CALCUL MENTAL**

---

**ADDITION — ASTUCES**

Arrondir puis ajuster :
> 48 + 37 = 50 + 37 − 2 = 87 − 2 = **85**
> 199 + 456 = 200 + 456 − 1 = **655**

Décomposer :
> 67 + 58 = 67 + 50 + 8 = 117 + 8 = **125**

---

**SOUSTRACTION — ASTUCES**

Arrondir :
> 82 − 49 = 82 − 50 + 1 = 32 + 1 = **33**

Compter de la valeur à soustraire jusqu'au nombre :
> 83 − 47 : de 47 à 83 = 50 − 47 + 83 − 50 = 3 + 33 = **36**

---

**MULTIPLICATION — ASTUCES**

× 11 : additionner les chiffres et placer au milieu
> 45 × 11 = 4_5 → 4+5=9 → **495**
> 47 × 11 → 4+7=11 → 4_11_7 → **517**

× 25 : diviser par 4 puis multiplier par 100
> 36 × 25 = 36/4 × 100 = 9 × 100 = **900**

× 5 : diviser par 2 puis multiplier par 10
> 86 × 5 = 43 × 10 = **430**

× 9 : multiplier par 10 puis soustraire
> 47 × 9 = 47 × 10 − 47 = 470 − 47 = **423**

Carrés : (a+b)² = a² + 2ab + b²
> 32² = (30+2)² = 900 + 120 + 4 = **1024**

---

**DIVISION — ASTUCES**
÷ 4 : diviser deux fois par 2
> 348 ÷ 4 = 174 ÷ 2 = **87**

÷ 5 : multiplier par 2 puis diviser par 10
> 345 ÷ 5 = 690 ÷ 10 = **69**

Continue comme ça ! 💪`,
  },
  {
    slug: 'math-echelle-carte',
    title: 'Les échelles et les cartes',
    category: 'mathematiques', level: 'intermediaire',
    triggers: ['échelle','echelle carte','1/25000','1 pour 25000','distance réelle carte','calcul echelle','carte géographique echelle','plan echelle','réduction agrandissement échelle'],
    answer: `Excellente question ! ✨

🧮 **LES ÉCHELLES ET LES CARTES**

---

**Définition :**
L'échelle est le rapport entre une longueur sur la carte et la longueur réelle correspondante.

> **Échelle = distance sur la carte / distance réelle**

---

**LIRE UNE ÉCHELLE**

Échelle 1/25 000 signifie : 1 cm sur la carte = 25 000 cm dans la réalité = **250 m**

Échelle 1/100 000 : 1 cm = 100 000 cm = **1 km**

---

**CALCULS**

**Trouver la distance réelle (connaissant la carte) :**
> Distance réelle = Distance carte × Dénominateur de l'échelle

**Exemple :** Carte au 1/50 000. Distance sur carte = 3 cm.
> Distance réelle = 3 × 50 000 = 150 000 cm = **1 500 m = 1,5 km**

---

**Trouver la distance sur la carte (connaissant le réel) :**
> Distance carte = Distance réelle / Dénominateur de l'échelle

**Exemple :** Réalité : 800 m. Échelle : 1/40 000.
> Distance carte = 80 000 cm / 40 000 = **2 cm**

---

**RÉDUCTION ET AGRANDISSEMENT**

| Rapport k | Effet |
|---|---|
| k > 1 | Agrandissement |
| k < 1 | Réduction (échelle de carte) |

Si les longueurs sont × k, les aires sont × k², les volumes × k³.

**Exemple :** Modèle réduit au 1/10 : longueur/10, surface/100, volume/1000.

Continue comme ça ! 💪`,
  },
  {
    slug: 'math-angles-trigonometrie-avance',
    title: 'Trigonométrie avancée — cercle trigonométrique',
    category: 'mathematiques', level: 'avance',
    triggers: ['cercle trigonométrique','cercle trigo','radians','cos sin valeurs','formules trigonométriques','cos sin tan valeurs remarquables','identité trigonométrique','sin2 cos2','formule angle double'],
    answer: `Excellente question ! ✨

📐 **TRIGONOMÉTRIE AVANCÉE**

---

**LE CERCLE TRIGONOMÉTRIQUE**
Cercle de rayon 1, centré en O. Un point M(cos α, sin α) correspond à l'angle α.

**Valeurs remarquables (à connaître absolument) :**

| α (degrés) | α (radians) | cos α | sin α | tan α |
|---|---|---|---|---|
| 0° | 0 | 1 | 0 | 0 |
| 30° | π/6 | √3/2 | 1/2 | 1/√3 |
| 45° | π/4 | √2/2 | √2/2 | 1 |
| 60° | π/3 | 1/2 | √3/2 | √3 |
| 90° | π/2 | 0 | 1 | — |
| 180° | π | -1 | 0 | 0 |
| 270° | 3π/2 | 0 | -1 | — |

---

**IDENTITÉS FONDAMENTALES**

> **cos²α + sin²α = 1** (relation de Pythagore)

> tan α = sin α / cos α

---

**FORMULES D'ADDITION**

> cos(a + b) = cos a cos b − sin a sin b
> sin(a + b) = sin a cos b + cos a sin b

**Formules de l'angle double (a = b) :**
> cos(2a) = cos²a − sin²a = 1 − 2sin²a = 2cos²a − 1
> sin(2a) = 2 sin a cos a

---

**RADIANS** : 1 tour = 2π rad = 360°
> Pour convertir : °→ rad : × π/180 | rad → ° : × 180/π

Continue comme ça ! 💪`,
  },
  {
    slug: 'math-inegalites-inequations',
    title: 'Inéquations et inégalités',
    category: 'mathematiques', level: 'intermediaire',
    triggers: ['inéquation','inequation','inégalité','inegalite','résoudre inéquation','x inférieur','x supérieur','intervalle solution','tableau signe','signe négatif inégalité'],
    answer: `Excellente question ! ✨

🧮 **INÉQUATIONS ET INÉGALITÉS**

---

**LES SYMBOLES**

| Symbole | Signification |
|---|---|
| < | strictement inférieur à |
| ≤ | inférieur ou égal à |
| > | strictement supérieur à |
| ≥ | supérieur ou égal à |

---

**RÉSOUDRE UNE INÉQUATION DU 1ER DEGRÉ**

**Règles :**
- Ajouter/soustraire un nombre des deux côtés → le sens de l'inégalité **ne change pas**
- Multiplier/diviser par un nombre **positif** → le sens **ne change pas**
- Multiplier/diviser par un nombre **négatif** → le sens **s'inverse** ⚠️

**Exemple 1 :** 3x − 5 > 4
> 3x > 9 → x > **3** → Solution : ]3 ; +∞[

**Exemple 2 :** −2x + 6 ≤ 12
> −2x ≤ 6 → x ≥ **−3** (division par −2 → inversion !)
> Solution : [−3 ; +∞[

---

**NOTATION DES INTERVALLES**

| Notation | Signification |
|---|---|
| ]a ; b[ | a < x < b (bornes exclues) |
| [a ; b] | a ≤ x ≤ b (bornes incluses) |
| [a ; +∞[ | x ≥ a |
| ]−∞ ; b[ | x < b |
| ℝ | tous les réels |

---

**SIGNE D'UNE EXPRESSION**

Pour ax + b > 0 :
- Si a > 0 : x > −b/a (même sens)
- Si a < 0 : x < −b/a (sens inverse)

**Tableau de signe de (2x − 6) :**

| x | −∞ | 3 | +∞ |
|---|---|---|---|
| 2x − 6 | − | 0 | + |

Continue comme ça ! 💪`,
  },
  {
    slug: 'math-suites-arithmetiques-geometriques',
    title: 'Suites arithmétiques et géométriques',
    category: 'mathematiques', level: 'avance',
    triggers: ['suites','suite arithmétique','suite géométrique','raison','terme général','somme suite','un+1','premier terme raison','progression arithmétique','progression géométrique'],
    answer: `Excellente question ! ✨

🧮 **SUITES ARITHMÉTIQUES ET GÉOMÉTRIQUES**

---

**SUITE ARITHMÉTIQUE**

Chaque terme est obtenu en ajoutant une **raison r** au terme précédent.
> uₙ₊₁ = uₙ + r

**Terme général :**
> uₙ = u₀ + n × r   ou   uₙ = u₁ + (n−1) × r

**Somme des n premiers termes :**
> Sₙ = n × (u₁ + uₙ) / 2   = n × (premier + dernier) / 2

**Exemple :** u₁ = 3, r = 5
> u₁=3, u₂=8, u₃=13, u₄=18...
> Terme général : uₙ = 3 + (n−1) × 5 = 5n − 2
> Somme des 10 premiers : S₁₀ = 10 × (3 + 48) / 2 = **255**

---

**SUITE GÉOMÉTRIQUE**

Chaque terme est obtenu en multipliant par une **raison q** (q ≠ 0, 1).
> uₙ₊₁ = uₙ × q

**Terme général :**
> uₙ = u₀ × qⁿ   ou   uₙ = u₁ × qⁿ⁻¹

**Somme des n premiers termes** (si q ≠ 1) :
> Sₙ = u₁ × (1 − qⁿ) / (1 − q)

**Exemple :** u₁ = 2, q = 3
> u₁=2, u₂=6, u₃=18, u₄=54...
> Terme général : uₙ = 2 × 3ⁿ⁻¹
> Somme des 5 premiers : S₅ = 2 × (1 − 3⁵) / (1 − 3) = 2 × (1 − 243) / (−2) = **242**

---

**RECONNAÎTRE LE TYPE**
- Différences constantes → arithmétique
- Quotients constants → géométrique

Continue comme ça ! 💪`,
  },
];
