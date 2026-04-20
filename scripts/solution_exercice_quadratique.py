"""
Résolution de l'exercice sur les racines de l'équation quadratique
Équation: 2x² + 7x + 5 = 0
"""

print("=" * 60)
print("RÉSOLUTION DE L'EXERCICE")
print("Équation: 2x² + 7x + 5 = 0")
print("=" * 60)
print()

# Étape 1: Identifier les coefficients
print("ÉTAPE 1: Identification des coefficients")
print("-" * 60)
print("Pour une équation quadratique de la forme ax² + bx + c = 0:")
print("  a = 2  (coefficient de x²)")
print("  b = 7  (coefficient de x)")
print("  c = 5  (terme constant)")
print()

# Étape 2: Relations de Viète
print("ÉTAPE 2: Relations de Viète (formules importantes)")
print("-" * 60)
print("Pour toute équation quadratique ax² + bx + c = 0 avec racines X1 et X2:")
print("  • Somme des racines: X1 + X2 = -b/a")
print("  • Produit des racines: X1 × X2 = c/a")
print()
print("Ces formules sont vraies SANS avoir besoin de calculer X1 et X2 explicitement!")
print()

# Calculs
a = 2
b = 7
c = 5

# a) X1 + X2
print("=" * 60)
print("a) X1 + X2")
print("=" * 60)
print("Formule: X1 + X2 = -b/a")
print(f"Calcul: X1 + X2 = -({b})/{a} = -{b}/{a}")
somme = -b / a
print(f"RÉSULTAT: X1 + X2 = {somme}")
print()

# b) X1 × X2
print("=" * 60)
print("b) X1 × X2")
print("=" * 60)
print("Formule: X1 × X2 = c/a")
print(f"Calcul: X1 × X2 = {c}/{a} = {c}/{a}")
produit = c / a
print(f"RÉSULTAT: X1 × X2 = {produit}")
print()

# c) 1/X1 + 1/X2
print("=" * 60)
print("c) 1/X1 + 1/X2")
print("=" * 60)
print("On peut réécrire cette expression en mettant au même dénominateur:")
print("  1/X1 + 1/X2 = X2/(X1×X2) + X1/(X1×X2)")
print("              = (X1 + X2)/(X1 × X2)")
print()
print("On utilise les résultats précédents:")
print(f"  1/X1 + 1/X2 = (X1 + X2)/(X1 × X2)")
print(f"              = {somme}/{produit}")
inverse_somme = somme / produit
print(f"RÉSULTAT: 1/X1 + 1/X2 = {inverse_somme}")
print()

# d) X1² + X2²
print("=" * 60)
print("d) X1² + X2²")
print("=" * 60)
print("On utilise l'identité remarquable:")
print("  (X1 + X2)² = X1² + 2X1X2 + X2²")
print()
print("En réorganisant:")
print("  X1² + X2² = (X1 + X2)² - 2X1X2")
print()
print("On utilise les résultats précédents:")
print(f"  X1² + X2² = ({somme})² - 2({produit})")
print(f"            = {somme**2} - {2*produit}")
somme_carres = somme**2 - 2*produit
print(f"            = {somme_carres}")
print(f"RÉSULTAT: X1² + X2² = {somme_carres}")
print()

# e) 1/X1² + 1/X2²
print("=" * 60)
print("e) 1/X1² + 1/X2²")
print("=" * 60)
print("On met au même dénominateur:")
print("  1/X1² + 1/X2² = X2²/(X1²×X2²) + X1²/(X1²×X2²)")
print("                = (X1² + X2²)/(X1² × X2²)")
print()
print("Mais X1² × X2² = (X1 × X2)²")
print()
print("Donc:")
print(f"  1/X1² + 1/X2² = (X1² + X2²)/(X1 × X2)²")
print(f"                = {somme_carres}/({produit})²")
print(f"                = {somme_carres}/{produit**2}")
inverse_somme_carres = somme_carres / (produit**2)
print(f"RÉSULTAT: 1/X1² + 1/X2² = {inverse_somme_carres}")
print()

# f) (X1 - X2)²
print("=" * 60)
print("f) (X1 - X2)²")
print("=" * 60)
print("On développe l'identité remarquable:")
print("  (X1 - X2)² = X1² - 2X1X2 + X2²")
print("             = X1² + X2² - 2X1X2")
print()
print("On utilise les résultats précédents:")
print(f"  (X1 - X2)² = {somme_carres} - 2({produit})")
print(f"             = {somme_carres} - {2*produit}")
difference_carree = somme_carres - 2*produit
print(f"             = {difference_carree}")
print(f"RÉSULTAT: (X1 - X2)² = {difference_carree}")
print()

# Vérification optionnelle: calculer les racines explicitement
print("=" * 60)
print("VÉRIFICATION (optionnelle): Calcul explicite des racines")
print("=" * 60)
print("Pour vérifier, calculons X1 et X2 avec la formule quadratique:")
print("  x = (-b ± √(b² - 4ac)) / (2a)")
print()
discriminant = b**2 - 4*a*c
print(f"Discriminant Δ = b² - 4ac = {b}² - 4({a})({c}) = {b**2} - {4*a*c} = {discriminant}")
print()
if discriminant >= 0:
    import math
    x1 = (-b + math.sqrt(discriminant)) / (2*a)
    x2 = (-b - math.sqrt(discriminant)) / (2*a)
    print(f"X1 = (-{b} + √{discriminant}) / (2×{a}) = {x1}")
    print(f"X2 = (-{b} - √{discriminant}) / (2×{a}) = {x2}")
    print()
    print("Vérification:")
    print(f"  X1 + X2 = {x1} + {x2} = {x1 + x2} ✓")
    print(f"  X1 × X2 = {x1} × {x2} = {x1 * x2} ✓")
else:
    print("Le discriminant est négatif, donc les racines sont complexes.")
print()

print("=" * 60)
print("RÉSUMÉ DES RÉSULTATS")
print("=" * 60)
print(f"a) X1 + X2 = {somme}")
print(f"b) X1 × X2 = {produit}")
print(f"c) 1/X1 + 1/X2 = {inverse_somme}")
print(f"d) X1² + X2² = {somme_carres}")
print(f"e) 1/X1² + 1/X2² = {inverse_somme_carres}")
print(f"f) (X1 - X2)² = {difference_carree}")
print("=" * 60)

