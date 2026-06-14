import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';
import ProfessionalWallet from '../models/ProfessionalWallet.js';
import ProfessionalAccount from '../models/ProfessionalAccount.js';

const router = express.Router();

// ─── Création des tables au démarrage ─────────────────────────────────────────
async function ensureZakatTables() {
  try {
    // Table des personnes pauvres (gérées par l'admin)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "zakat_poor_people" (
        "id"               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "numero_h"         VARCHAR(50)   DEFAULT '',
        "prenom"           VARCHAR(100)  NOT NULL,
        "nom_famille"      VARCHAR(100)  NOT NULL,
        "age"              INTEGER       DEFAULT 0,
        "location"         VARCHAR(200)  DEFAULT '',
        "situation"        TEXT          DEFAULT '',
        "needs"            TEXT[]        DEFAULT '{}',
        "urgency"          VARCHAR(20)   DEFAULT 'medium' CHECK (urgency IN ('low','medium','high','critical')),
        "religion"         VARCHAR(50)   DEFAULT 'Islam',
        "phone"            VARCHAR(50),
        "address"          VARCHAR(300)  DEFAULT '',
        "family_size"      INTEGER       DEFAULT 1,
        "occupation"       VARCHAR(200),
        "health_condition" VARCHAR(300),
        "is_active"        BOOLEAN       DEFAULT true,
        "solde_recu"       DECIMAL(15,2) DEFAULT 0,
        "total_recu"       DECIMAL(15,2) DEFAULT 0,
        "verified_by"      VARCHAR(100)  DEFAULT 'admin',
        "created_at"       TIMESTAMPTZ   DEFAULT NOW(),
        "updated_at"       TIMESTAMPTZ   DEFAULT NOW()
      );
    `);

    // Table des comptes Zakat des donateurs (chaque utilisateur qui veut donner)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "zakat_comptes_donateurs" (
        "id"           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "numero_h"     VARCHAR(50)   NOT NULL UNIQUE,
        "nom_donateur" VARCHAR(200)  DEFAULT '',
        "solde"        DECIMAL(15,2) DEFAULT 0 CHECK (solde >= 0),
        "total_depose" DECIMAL(15,2) DEFAULT 0,
        "total_donne"  DECIMAL(15,2) DEFAULT 0,
        "created_at"   TIMESTAMPTZ   DEFAULT NOW(),
        "updated_at"   TIMESTAMPTZ   DEFAULT NOW()
      );
    `);

    // Table de toutes les opérations Zakat (dépôts + dons + paiements pauvres)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "zakat_operations" (
        "id"              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "type"            VARCHAR(30)   NOT NULL CHECK (type IN ('depot','don_au_pauvre','paiement_clinique','paiement_fournisseur','calcul_zakat')),
        "de_numero_h"     VARCHAR(50),
        "de_nom"          VARCHAR(200)  DEFAULT '',
        "vers_id"         VARCHAR(100),
        "vers_nom"        VARCHAR(200)  DEFAULT '',
        "montant"         DECIMAL(15,2) NOT NULL CHECK (montant > 0),
        "currency"        VARCHAR(10)   DEFAULT 'GNF',
        "description"     TEXT,
        "statut"          VARCHAR(20)   DEFAULT 'confirme',
        "created_at"      TIMESTAMPTZ   DEFAULT NOW()
      );
    `);

    // Table des calculs de zakat
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "zakat_calculs" (
        "id"             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "numero_h"       VARCHAR(50)   NOT NULL,
        "nom"            VARCHAR(200)  DEFAULT '',
        "patrimoine"     DECIMAL(20,2) NOT NULL CHECK (patrimoine >= 0),
        "montant_zakat"  DECIMAL(20,2) NOT NULL DEFAULT 0,
        "currency"       VARCHAR(10)   DEFAULT 'GNF',
        "est_paye"       BOOLEAN       DEFAULT false,
        "paye_le"        TIMESTAMPTZ,
        "created_at"     TIMESTAMPTZ   DEFAULT NOW()
      );
    `);

    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_zakat_don_numero_h ON "zakat_comptes_donateurs" ("numero_h");`).catch(() => {});
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_zakat_ops_de ON "zakat_operations" ("de_numero_h");`).catch(() => {});

    // Ajouter solde_recu si la table existait sans cette colonne
    await sequelize.query(`ALTER TABLE "zakat_poor_people" ADD COLUMN IF NOT EXISTS "solde_recu" DECIMAL(15,2) DEFAULT 0;`).catch(() => {});
    await sequelize.query(`ALTER TABLE "zakat_poor_people" ADD COLUMN IF NOT EXISTS "total_recu" DECIMAL(15,2) DEFAULT 0;`).catch(() => {});

  } catch (err) {
    console.warn('⚠️ ensureZakatTables:', err.message);
  }
}

ensureZakatTables();

// Toutes les routes nécessitent d'être connecté
router.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────────
// SECTION DONATEUR — celui qui veut faire sa Zakat
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/zakat/mon-compte — voir son solde Zakat
router.get('/mon-compte', async (req, res) => {
  try {
    const { numeroH, prenom, nomFamille } = req.user;
    const nom = `${prenom || ''} ${nomFamille || ''}`.trim();

    // Créer le compte s'il n'existe pas
    await sequelize.query(`
      INSERT INTO zakat_comptes_donateurs (numero_h, nom_donateur, created_at, updated_at)
      VALUES (:numeroH, :nom, NOW(), NOW())
      ON CONFLICT (numero_h) DO NOTHING
    `, { replacements: { numeroH, nom } });

    const [[compte]] = await sequelize.query(`
      SELECT solde, total_depose, total_donne FROM zakat_comptes_donateurs WHERE numero_h = :numeroH
    `, { replacements: { numeroH } });

    // Dernières opérations
    const [operations] = await sequelize.query(`
      SELECT type, de_nom, vers_nom, montant, description, created_at
      FROM zakat_operations
      WHERE de_numero_h = :numeroH
      ORDER BY created_at DESC LIMIT 20
    `, { replacements: { numeroH } });

    res.json({
      success: true,
      compte: {
        solde:       parseFloat(compte.solde)        || 0,
        totalDepose: parseFloat(compte.total_depose) || 0,
        totalDonne:  parseFloat(compte.total_donne)  || 0,
      },
      operations,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/zakat/deposer — le donateur dépose de l'argent dans son compte Zakat
// En mode démo : dépôt direct. En production : FedaPay doit appeler ce endpoint après paiement.
router.post('/deposer', async (req, res) => {
  try {
    const { montant, fedapayRef } = req.body;
    const { numeroH, prenom, nomFamille } = req.user;

    if (!montant || isNaN(parseFloat(montant)) || parseFloat(montant) <= 0) {
      return res.status(400).json({ success: false, message: 'Montant invalide.' });
    }

    const m = parseFloat(parseFloat(montant).toFixed(2));
    const nom = `${prenom || ''} ${nomFamille || ''}`.trim();

    // Créer le compte si besoin
    await sequelize.query(`
      INSERT INTO zakat_comptes_donateurs (numero_h, nom_donateur, created_at, updated_at)
      VALUES (:numeroH, :nom, NOW(), NOW())
      ON CONFLICT (numero_h) DO NOTHING
    `, { replacements: { numeroH, nom } });

    // Créditer le solde
    await sequelize.query(`
      UPDATE zakat_comptes_donateurs
      SET solde = solde + :m, total_depose = total_depose + :m, updated_at = NOW()
      WHERE numero_h = :numeroH
    `, { replacements: { m, numeroH } });

    // Enregistrer l'opération
    await sequelize.query(`
      INSERT INTO zakat_operations (type, de_numero_h, de_nom, montant, currency, description, statut, created_at)
      VALUES ('depot', :numeroH, :nom, :m, 'GNF', :desc, 'confirme', NOW())
    `, { replacements: { numeroH, nom, m, desc: fedapayRef ? `Dépôt via FedaPay #${fedapayRef}` : `Dépôt de ${m.toLocaleString('fr-GN')} GNF` } });

    res.json({
      success: true,
      message: `${m.toLocaleString('fr-GN')} GNF ajoutés à votre compte Zakat.`,
      nouveauSolde: m,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/zakat/donner-au-pauvre/:poorId — envoyer de l'argent à un pauvre
// INTERNE — gratuit — pas de FedaPay
router.post('/donner-au-pauvre/:poorId', async (req, res) => {
  try {
    const { montant, description } = req.body;
    const { numeroH, prenom, nomFamille } = req.user;
    const { poorId } = req.params;

    if (!montant || parseFloat(montant) <= 0) {
      return res.status(400).json({ success: false, message: 'Montant invalide.' });
    }

    const m = parseFloat(parseFloat(montant).toFixed(2));
    const nomDonateur = `${prenom || ''} ${nomFamille || ''}`.trim();

    // Vérifier que la personne pauvre existe et est active
    const [[pauvre]] = await sequelize.query(`
      SELECT id, prenom, nom_famille FROM zakat_poor_people WHERE id = :poorId AND is_active = true
    `, { replacements: { poorId } });

    if (!pauvre) {
      return res.status(404).json({ success: false, message: 'Personne introuvable ou inactive.' });
    }

    // Vérifier que le donateur a assez de solde (atomique — pas de triche)
    const [, meta] = await sequelize.query(`
      UPDATE zakat_comptes_donateurs
      SET solde = solde - :m, total_donne = total_donne + :m, updated_at = NOW()
      WHERE numero_h = :numeroH AND solde >= :m
    `, { replacements: { m, numeroH } });

    const lignesModifiees = meta?.rowCount ?? meta?.affectedRows ?? 0;
    if (lignesModifiees === 0) {
      return res.status(400).json({
        success: false,
        message: 'Solde Zakat insuffisant. Déposez d\'abord de l\'argent dans votre compte Zakat.'
      });
    }

    // Créditer le pauvre
    const nomPauvre = `${pauvre.prenom} ${pauvre.nom_famille}`;
    await sequelize.query(`
      UPDATE zakat_poor_people
      SET solde_recu = solde_recu + :m, total_recu = total_recu + :m, updated_at = NOW()
      WHERE id = :poorId
    `, { replacements: { m, poorId } });

    // Enregistrer l'opération
    await sequelize.query(`
      INSERT INTO zakat_operations (type, de_numero_h, de_nom, vers_id, vers_nom, montant, currency, description, statut, created_at)
      VALUES ('don_au_pauvre', :numeroH, :nomDonateur, :poorId, :nomPauvre, :m, 'GNF', :desc, 'confirme', NOW())
    `, { replacements: { numeroH, nomDonateur, poorId, nomPauvre, m, desc: description || `Zakat de ${nomDonateur} → ${nomPauvre}` } });

    res.json({
      success: true,
      message: `${m.toLocaleString('fr-GN')} GNF envoyés à ${nomPauvre}. Que Allah accepte votre Zakat.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION PAUVRE — celui qui reçoit la Zakat
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/zakat/mon-solde-pauvre — pauvre voit son solde reçu
// L'utilisateur doit avoir son numeroH enregistré dans zakat_poor_people
router.get('/mon-solde-pauvre', async (req, res) => {
  try {
    const { numeroH } = req.user;

    const [[profil]] = await sequelize.query(`
      SELECT id, prenom, nom_famille, solde_recu, total_recu
      FROM zakat_poor_people
      WHERE numero_h = :numeroH AND is_active = true
    `, { replacements: { numeroH } });

    if (!profil) {
      return res.json({ success: true, inscrit: false, message: 'Vous n\'êtes pas inscrit comme bénéficiaire Zakat.' });
    }

    const [operations] = await sequelize.query(`
      SELECT type, de_nom, vers_nom, montant, description, created_at
      FROM zakat_operations
      WHERE vers_id = :poorId
      ORDER BY created_at DESC LIMIT 20
    `, { replacements: { poorId: profil.id } });

    res.json({
      success: true,
      inscrit: true,
      profil: {
        id: profil.id,
        prenom: profil.prenom,
        nomFamille: profil.nom_famille,
        soldeRecu: parseFloat(profil.solde_recu) || 0,
        totalRecu: parseFloat(profil.total_recu) || 0,
      },
      operations,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/zakat/payer-professionnel — pauvre paie une clinique ou un fournisseur
// INTERNE — gratuit — pas de FedaPay
router.post('/payer-professionnel', async (req, res) => {
  try {
    const { montant, proAccountId, type, description } = req.body;
    // type = 'clinique' ou 'fournisseur'
    const { numeroH } = req.user;

    if (!montant || parseFloat(montant) <= 0) {
      return res.status(400).json({ success: false, message: 'Montant invalide.' });
    }
    if (!proAccountId) {
      return res.status(400).json({ success: false, message: 'Professionnel requis.' });
    }
    if (!['clinique', 'fournisseur'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type de paiement invalide. Choisir : clinique ou fournisseur.' });
    }

    const m = parseFloat(parseFloat(montant).toFixed(2));

    // Vérifier que l'utilisateur est bien un bénéficiaire Zakat
    const [[pauvre]] = await sequelize.query(`
      SELECT id, prenom, nom_famille, solde_recu FROM zakat_poor_people
      WHERE numero_h = :numeroH AND is_active = true
    `, { replacements: { numeroH } });

    if (!pauvre) {
      return res.status(403).json({ success: false, message: 'Vous n\'êtes pas inscrit comme bénéficiaire Zakat.' });
    }

    // Vérifier et débiter le solde du pauvre (atomique)
    const [, meta] = await sequelize.query(`
      UPDATE zakat_poor_people
      SET solde_recu = solde_recu - :m, updated_at = NOW()
      WHERE id = :poorId AND solde_recu >= :m
    `, { replacements: { m, poorId: pauvre.id } });

    const lignesModifiees = meta?.rowCount ?? meta?.affectedRows ?? 0;
    if (lignesModifiees === 0) {
      return res.status(400).json({
        success: false,
        message: `Solde Zakat insuffisant. Disponible : ${parseFloat(pauvre.solde_recu).toLocaleString('fr-GN')} GNF`
      });
    }

    // Vérifier que le professionnel existe
    const proAccount = await ProfessionalAccount.findByPk(proAccountId);
    if (!proAccount) {
      // Rembourser si pro introuvable
      await sequelize.query(`UPDATE zakat_poor_people SET solde_recu = solde_recu + :m WHERE id = :poorId`, { replacements: { m, poorId: pauvre.id } });
      return res.status(404).json({ success: false, message: 'Professionnel introuvable. Paiement annulé.' });
    }

    // Créditer le Moftal Pay Pro du professionnel (créer si besoin)
    let comptePro = await ProfessionalWallet.findOne({ where: { proAccountId } });
    if (!comptePro) {
      comptePro = await ProfessionalWallet.create({
        proAccountId,
        ownerNumeroH: proAccount.ownerNumeroH,
        nomPro:  proAccount.name,
        typePro: proAccount.type,
      });
    }
    await comptePro.update({
      solde:     Number(comptePro.solde)     + m,
      totalRecu: Number(comptePro.totalRecu) + m,
    });

    // Enregistrer l'opération
    const typeOp = type === 'clinique' ? 'paiement_clinique' : 'paiement_fournisseur';
    const nomPauvre = `${pauvre.prenom} ${pauvre.nom_famille}`;
    await sequelize.query(`
      INSERT INTO zakat_operations (type, de_numero_h, de_nom, vers_id, vers_nom, montant, currency, description, statut, created_at)
      VALUES (:typeOp, :numeroH, :nomPauvre, :proAccountId, :nomPro, :m, 'GNF', :desc, 'confirme', NOW())
    `, { replacements: {
      typeOp, numeroH, nomPauvre, proAccountId,
      nomPro: proAccount.name,
      m,
      desc: description || `Paiement ${type} depuis solde Zakat → ${proAccount.name}`
    }});

    res.json({
      success: true,
      gratuit: true,
      message: `${m.toLocaleString('fr-GN')} GNF payés à ${proAccount.name}. Paiement interne — aucun frais.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES COMMUNES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/zakat/poor-people — liste des personnes pauvres actives
router.get('/poor-people', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT id, numero_h, prenom, nom_famille, age, location, situation,
             needs, urgency, religion, phone, address, family_size,
             occupation, health_condition, is_active, solde_recu, total_recu,
             verified_by, created_at
      FROM zakat_poor_people
      WHERE is_active = true
      ORDER BY CASE urgency WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, created_at DESC
    `);

    const people = rows.map(p => ({
      id: p.id,
      numeroH: p.numero_h,
      prenom: p.prenom,
      nomFamille: p.nom_famille,
      age: p.age,
      location: p.location,
      situation: p.situation,
      needs: p.needs || [],
      urgency: p.urgency,
      religion: p.religion,
      contactInfo: { phone: p.phone, address: p.address },
      familySize: p.family_size,
      occupation: p.occupation,
      healthCondition: p.health_condition,
      isActive: p.is_active,
      soldeRecu:  parseFloat(p.solde_recu)  || 0,
      totalRecu:  parseFloat(p.total_recu)  || 0,
      verifiedBy: p.verified_by,
      verifiedAt: p.created_at,
    }));

    res.json({ success: true, poorPeople: people });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/zakat/mes-dons — historique des dons du donateur connecté
router.get('/mes-dons', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT type, de_nom, vers_nom, montant, currency, description, statut, created_at
      FROM zakat_operations
      WHERE de_numero_h = :numeroH AND type = 'don_au_pauvre'
      ORDER BY created_at DESC LIMIT 50
    `, { replacements: { numeroH: req.user.numeroH } });
    res.json({ success: true, dons: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/zakat/mes-calculs — mes calculs de zakat
router.get('/mes-calculs', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT id, patrimoine, montant_zakat, currency, est_paye, paye_le, created_at
      FROM zakat_calculs WHERE numero_h = :numeroH ORDER BY created_at DESC LIMIT 20
    `, { replacements: { numeroH: req.user.numeroH } });
    res.json({ success: true, calculs: rows.map(r => ({ ...r, patrimoine: parseFloat(r.patrimoine), montantZakat: parseFloat(r.montant_zakat) })) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/zakat/calculer — calculer et enregistrer la zakat (2.5%)
router.post('/calculer', async (req, res) => {
  try {
    const { patrimoine, currency = 'GNF' } = req.body;
    if (patrimoine === undefined || isNaN(parseFloat(patrimoine)) || parseFloat(patrimoine) < 0) {
      return res.status(400).json({ success: false, message: 'Patrimoine invalide.' });
    }
    const p = parseFloat(patrimoine);
    const montantZakat = parseFloat((p * 0.025).toFixed(2));
    const nom = `${req.user.prenom || ''} ${req.user.nomFamille || ''}`.trim();

    await sequelize.query(`
      INSERT INTO zakat_calculs (numero_h, nom, patrimoine, montant_zakat, currency, created_at)
      VALUES (:numeroH, :nom, :p, :montantZakat, :currency, NOW())
    `, { replacements: { numeroH: req.user.numeroH, nom, p, montantZakat, currency: currency.toString().slice(0, 10) } });

    res.json({
      success: true,
      patrimoine: p,
      montantZakat,
      message: `Votre Zakat s'élève à ${montantZakat.toLocaleString('fr-GN')} ${currency} (2.5% de votre patrimoine).`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES ADMIN
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/zakat/admin/ajouter-pauvre — Admin ajoute une personne pauvre
router.post('/admin/ajouter-pauvre', requireAdmin, async (req, res) => {
  try {
    const { prenom, nomFamille, age, location, situation, needs = [], urgency = 'medium',
            religion = 'Islam', phone, address, familySize, occupation, healthCondition, numeroH = '' } = req.body;

    if (!prenom || !nomFamille || !location || !situation) {
      return res.status(400).json({ success: false, message: 'Prénom, nom, localisation et situation sont requis.' });
    }
    if (!['low','medium','high','critical'].includes(urgency)) {
      return res.status(400).json({ success: false, message: 'Niveau d\'urgence invalide.' });
    }

    const [[row]] = await sequelize.query(`
      INSERT INTO zakat_poor_people
        (numero_h, prenom, nom_famille, age, location, situation, needs, urgency, religion,
         phone, address, family_size, occupation, health_condition, verified_by, created_at, updated_at)
      VALUES
        (:numeroH, :prenom, :nomFamille, :age, :location, :situation, :needs, :urgency, :religion,
         :phone, :address, :familySize, :occupation, :healthCondition, :verifiedBy, NOW(), NOW())
      RETURNING id
    `, { replacements: {
      numeroH: numeroH.toString().slice(0, 50),
      prenom: prenom.toString().slice(0, 100),
      nomFamille: nomFamille.toString().slice(0, 100),
      age: parseInt(age) || 0,
      location: location.toString().slice(0, 200),
      situation: situation.toString().slice(0, 1000),
      needs: Array.isArray(needs) ? needs.map(n => n.toString().slice(0, 100)) : [],
      urgency,
      religion: religion.toString().slice(0, 50),
      phone: phone ? phone.toString().slice(0, 50) : null,
      address: address ? address.toString().slice(0, 300) : '',
      familySize: parseInt(familySize) || 1,
      occupation: occupation ? occupation.toString().slice(0, 200) : null,
      healthCondition: healthCondition ? healthCondition.toString().slice(0, 300) : null,
      verifiedBy: req.user.numeroH,
    }});

    res.json({ success: true, message: 'Personne ajoutée.', id: row.id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/zakat/admin/pauvre/:id — désactiver une personne
router.delete('/admin/pauvre/:id', requireAdmin, async (req, res) => {
  try {
    await sequelize.query(`UPDATE zakat_poor_people SET is_active = false, updated_at = NOW() WHERE id = :id`, { replacements: { id: req.params.id } });
    res.json({ success: true, message: 'Personne désactivée.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/zakat/admin/toutes-operations — Admin voit tout
router.get('/admin/toutes-operations', requireAdmin, async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT type, de_nom, vers_nom, montant, currency, description, statut, created_at
      FROM zakat_operations ORDER BY created_at DESC LIMIT 200
    `);
    res.json({ success: true, operations: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/zakat/admin/crediter-pauvre — Admin crédite manuellement un pauvre (pour test ou aide directe)
router.post('/admin/crediter-pauvre', requireAdmin, async (req, res) => {
  try {
    const { poorId, montant, note } = req.body;
    if (!poorId || !montant || parseFloat(montant) <= 0) {
      return res.status(400).json({ success: false, message: 'ID et montant requis.' });
    }
    const m = parseFloat(parseFloat(montant).toFixed(2));

    await sequelize.query(`
      UPDATE zakat_poor_people SET solde_recu = solde_recu + :m, total_recu = total_recu + :m, updated_at = NOW() WHERE id = :poorId
    `, { replacements: { m, poorId } });

    await sequelize.query(`
      INSERT INTO zakat_operations (type, de_numero_h, de_nom, vers_id, montant, currency, description, statut, created_at)
      VALUES ('don_au_pauvre', :adminH, 'Admin', :poorId, :m, 'GNF', :note, 'confirme', NOW())
    `, { replacements: { adminH: req.user.numeroH, poorId, m, note: note || 'Crédit admin direct' } });

    res.json({ success: true, message: `${m.toLocaleString('fr-GN')} GNF crédités.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
