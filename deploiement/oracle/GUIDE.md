# Passer Moftal sur Oracle Cloud (gratuit) — guide pas à pas

Objectif : **0 franc par mois** pour le serveur et la base, à la place de Render + Neon.
Le site `moftal.com` reste sur Cloudflare (déjà gratuit) : on ne change que le serveur
`api.moftal.com` et la base de données.

Tout est déjà prêt dans ce dossier. Il reste à : créer le compte, créer la machine,
copier les réglages, lancer **une** commande, vérifier, puis basculer.

---

## Étape 1 — Créer le compte Oracle

1. Sur oracle.com/cloud/free, « Start for free ».
2. Nom, adresse : **exactement comme sur la carte bancaire**. Pas de VPN.
3. **Région (définitive, on ne peut plus la changer)** : une région d'Europe proche,
   par exemple **France Central (Paris)** ou **France South (Marseille)**.
4. Carte : Visa ou Mastercard **de crédit**, ou de débit qui fonctionne comme une carte
   de crédit, **physique, à votre nom**. Pas de carte prépayée ni virtuelle.
   Oracle bloque une petite somme pour vérifier, puis la rend.

## Étape 2 — Créer la machine (gratuite)

Console Oracle → **Compute → Instances → Create instance** :

| Réglage | Valeur |
|---|---|
| Image | **Canonical Ubuntu 24.04** |
| Shape | **Ampere → VM.Standard.A1.Flex**, **2 OCPU**, **12 Go** de mémoire (limite gratuite) |
| Réseau | laisser « Create new virtual cloud network », avec **adresse IP publique** |
| Clé SSH | « Generate a key pair for me » → **télécharger la clé privée** et la garder précieusement |
| Boot volume | 100 Go (la limite gratuite totale est d'environ 200 Go) |

Si Oracle répond « Out of capacity » : réessayez plus tard (souvent le matin tôt), c'est
fréquent pour les machines gratuites.

Notez l'**adresse IP publique** de la machine.

## Étape 3 — Ouvrir les portes 80 et 443

Console → la machine → **Subnet** → **Security List** → **Add Ingress Rules** :
- Source `0.0.0.0/0`, protocole TCP, port **80**
- Source `0.0.0.0/0`, protocole TCP, port **443**

(Le pare-feu interne de la machine est ouvert automatiquement par l'installateur.)

## Étape 4 — Se connecter à la machine et récupérer Moftal

Depuis un ordinateur (ou la **Cloud Shell** de la console Oracle, bouton `>_` en haut) :

```bash
ssh -i cle-privee.key ubuntu@ADRESSE_IP
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/kadiatoubarry1541/moftal.git
cd moftal/deploiement/oracle
```

Si le dépôt GitHub est **privé** : sur GitHub → le dépôt → Settings → **Deploy keys** →
ajouter la clé publique de la machine (`ssh-keygen -t ed25519` puis `cat ~/.ssh/id_ed25519.pub`),
lecture seule, et cloner avec `git clone git@github.com:kadiatoubarry1541/moftal.git`.

## Étape 5 — Copier les réglages de Render

```bash
cp env.exemple .env
nano .env
```

- Pour chaque ligne, recopier la valeur depuis **Render → le service → Environment**
  (même nom, même valeur). Tout réglage présent sur Render et absent du fichier : l'ajouter aussi.
- `NEON_DATABASE_URL` : l'adresse de la base **Neon** (Neon → le projet → Connection string).
- `DB_PASSWORD` : **laisser vide** (généré automatiquement).
- `SAUVEGARDE_CLE` : le même mot de passe que le secret GitHub `SAUVEGARDE_CLE`.

Enregistrer : `Ctrl+O`, `Entrée`, `Ctrl+X`.

## Étape 6 — Installer (une seule commande)

```bash
sudo bash installer.sh
```

Le script installe Docker, ouvre le pare-feu, prépare la carte de la Guinée pour le
guidage (quelques minutes), **copie la base Neon** et vérifie la copie (mêmes tables, même
nombre de comptes), démarre tout, et programme la sauvegarde de chaque nuit.

À la fin : « 🎉 Installation terminée ».

## Étape 7 — Vérifier avant de basculer

```bash
docker compose ps                     # tout doit être « running » / « healthy »
docker compose exec serveur wget -qO- http://localhost:5002/api/health
docker compose logs --tail 50 serveur # pas d'erreur rouge
```

## Étape 8 — Basculer (choisir une heure calme, ~15 minutes)

1. **Render** : mettre le service en pause (Settings → **Suspend**) : plus personne n'écrit dans Neon.
2. Sur la machine : dernière copie, toute fraîche :
   ```bash
   sudo bash transferer-base.sh --forcer
   ```
   Il doit afficher « ✅ Transfert terminé et vérifié ».
3. **Cloudflare** (DNS de moftal.com) : l'enregistrement `api` → type **A** → l'**adresse IP**
   de la machine Oracle, **proxy désactivé (nuage gris)** pour que le certificat HTTPS
   se crée tout seul. Attendre quelques minutes.
4. Tester : ouvrir `https://api.moftal.com/api/health` → doit répondre. Puis se connecter sur
   moftal.com, ouvrir quelques pages, envoyer un message.
5. **Garder Render (en pause) et Neon pendant 2 semaines** par sécurité. Ensuite seulement,
   les supprimer : c'est là que vous arrêtez de payer.

Retour en arrière (en cas de problème) : remettre l'enregistrement `api` comme avant et
relancer le service Render. Neon n'a jamais été modifié.

## Étape 9 — Mises à jour automatiques après chaque modification

Pour que chaque modification fusionnée sur GitHub arrive aussi sur Oracle (après les
vérifications), ajouter dans **GitHub → Settings → Secrets and variables → Actions** :

| Secret | Valeur |
|---|---|
| `ORACLE_HOST` | l'adresse IP de la machine |
| `ORACLE_USER` | `ubuntu` |
| `ORACLE_SSH_KEY` | le contenu de la **clé privée** téléchargée à l'étape 2 |
| `ORACLE_DOSSIER` | `/home/ubuntu/moftal/deploiement/oracle` |

Sans ces secrets, rien ne change (mise à jour à la main : `sudo bash mettre-a-jour.sh`).

Une fois sur Oracle, retirer le secret GitHub `NEON_DATABASE_URL` : la sauvegarde de nuit
se fait désormais sur la machine (`sauvegarder.sh`, chaque nuit à 02:17).

---

## Bon à savoir

- **Machine « inactive »** : Oracle peut reprendre une machine gratuite qui ne fait presque
  rien pendant 7 jours (processeur, réseau et mémoire sous 20 %). Une application utilisée
  chaque jour n'est normalement pas concernée. Si cela arrivait, passer le compte en
  « Pay As You Go » (on reste gratuit tant qu'on reste dans les limites « Always Free ») et
  créer une **alerte de budget à 1 $** dans Billing → Budgets.
- **Carte du guidage** : mise à jour automatiquement le 1er de chaque mois (nouvelles rues
  ajoutées sur OpenStreetMap).
- **Sauvegarde** : chaque nuit, chiffrée, envoyée sur IDrive et vérifiée. Journal :
  `/var/log/moftal-sauvegarde.log`.
- **Restaurer une sauvegarde** : voir `docs/SAUVEGARDE_ET_RESTAURATION.md`.
- Commandes utiles (dans ce dossier) :
  `docker compose ps` · `docker compose logs -f serveur` · `docker compose restart serveur`
