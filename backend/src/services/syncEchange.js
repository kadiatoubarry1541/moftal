import { sequelize } from '../../config/database.js';

/**
 * Produits des commerçants → page Échange.
 *
 * Quand un commerçant (commerce, vendeur, fournisseur, producteur) ajoute,
 * modifie ou retire un produit dans sa gestion interne, le même produit est
 * créé, mis à jour ou retiré dans Échange, pour que tout le monde le voie
 * (et puisse l'acheter ou contacter le vendeur comme pour une publication
 * faite depuis Échange). Le lien est gardé dans exchange_products.source_gestion
 * (« table:id »), jamais en double.
 */

// Table de gestion → comment lire le prix et la photo
const TABLES = {
  commerce_products: { prix: (p) => p.prix_vente, photo: (p) => p.photo_url || p.image_url },
  retailer_products: { prix: (p) => p.prix_vente, photo: (p) => p.photo_url || p.image_url },
  producer_products: { prix: (p) => p.prix_unitaire, photo: (p) => p.photo_url || p.image_url },
  supplier_products: { prix: (p) => p.prix_detail || p.prix_gros, photo: (p) => p.photo_url || p.image_url },
};
const TYPES_COMMERCANTS = ['commerce', 'vendor', 'supplier', 'producer'];
const SECTEURS = ['primaire', 'secondaire', 'tertiaire', 'quaternaire', 'nourriture'];

let colonnePrete = null;
const preparer = () => (colonnePrete ||= sequelize.query(`
  ALTER TABLE exchange_products ADD COLUMN IF NOT EXISTS source_gestion VARCHAR(120);
  CREATE UNIQUE INDEX IF NOT EXISTS exchange_products_source_gestion ON exchange_products (source_gestion) WHERE source_gestion IS NOT NULL;
`).catch((e) => { colonnePrete = null; throw e; }));

// Compte pro approuvé et actif du commerçant propriétaire de cet établissement
async function compteCommercant(tenantCode) {
  const [compte] = await sequelize.query(
    `SELECT owner_numero_h, type, sub_sector, name, city, status, is_active, subscription_status
       FROM professional_accounts WHERE tenant_code = :code LIMIT 1`,
    { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
  );
  if (!compte || !TYPES_COMMERCANTS.includes(compte.type)) return null;
  return compte;
}

/**
 * Met Échange à jour pour un produit de gestion (après ajout, modification ou retrait).
 * Ne fait jamais échouer l'action de gestion : une erreur est seulement notée au journal.
 */
export async function synchroniserProduit(table, id, tenantCode) {
  const regle = TABLES[table];
  if (!regle || !id || !tenantCode) return;
  try {
    await preparer();
    const source = `${table}:${id}`;
    const compte = await compteCommercant(tenantCode);
    const [produit] = await sequelize.query(
      `SELECT * FROM ${table} WHERE id = :id AND tenant_code = :code LIMIT 1`,
      { replacements: { id, code: tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    const visible = !!produit && produit.is_active !== false && !!compte
      && compte.status === 'approved' && compte.is_active !== false && compte.subscription_status !== 'blocked';
    if (!visible) {
      await sequelize.query(`UPDATE exchange_products SET is_active = false, updated_at = NOW() WHERE source_gestion = :source`,
        { replacements: { source } });
      return;
    }
    // Secteur d'Échange : celui choisi à l'inscription ; une boutique vend des produits finis (secondaire)
    const secteur = SECTEURS.includes(compte.sub_sector) ? compte.sub_sector : 'secondaire';
    const photo = regle.photo(produit);
    const valeurs = {
      source,
      titre: String(produit.nom || 'Produit').slice(0, 255),
      description: String(produit.description || produit.categorie || produit.nom || '').slice(0, 5000) || String(produit.nom || ''),
      secteur,
      souscat: produit.categorie || null,
      prix: Number(regle.prix(produit)) || 0,
      images: JSON.stringify(photo ? [photo] : []),
      numeroH: compte.owner_numero_h,
      quantite: Number.isFinite(Number(produit.stock)) ? Number(produit.stock) : null,
      dispo: !(Number(produit.stock) <= 0 && produit.stock !== null && produit.stock !== undefined),
      lieu: compte.city || null,
    };
    await sequelize.query(
      `INSERT INTO exchange_products (id, title, description, category, subcategory, price, currency, images, videos, audio,
                                      numero_h, is_active, is_available, quantity, location, tags, views, likes, created_by,
                                      is_moftal_exclusive, source_gestion, created_at, updated_at)
       VALUES (gen_random_uuid(), :titre, :description, :secteur, :souscat, :prix, 'FG', CAST(:images AS JSON), '[]', '[]',
               :numeroH, true, :dispo, :quantite, :lieu, '[]', 0, '[]', :numeroH, false, :source, NOW(), NOW())
       ON CONFLICT (source_gestion) WHERE source_gestion IS NOT NULL DO UPDATE SET
         title = EXCLUDED.title, description = EXCLUDED.description, category = EXCLUDED.category,
         subcategory = EXCLUDED.subcategory, price = EXCLUDED.price, images = EXCLUDED.images,
         numero_h = EXCLUDED.numero_h, is_active = true, is_available = EXCLUDED.is_available,
         quantity = EXCLUDED.quantity, location = EXCLUDED.location, updated_at = NOW()`,
      { replacements: valeurs }
    );
  } catch (e) {
    console.error(`Échange : produit ${table}:${id} non synchronisé :`, e.message);
  }
}

/** Retrait d'un produit de gestion (supprimé) : il disparaît d'Échange. */
export async function retirerProduit(table, id) {
  if (!TABLES[table] || !id) return;
  try {
    await preparer();
    await sequelize.query(`UPDATE exchange_products SET is_active = false, updated_at = NOW() WHERE source_gestion = :source`,
      { replacements: { source: `${table}:${id}` } });
  } catch (e) {
    console.error(`Échange : retrait ${table}:${id} :`, e.message);
  }
}

/** Au démarrage : les produits déjà en gestion apparaissent aussi dans Échange. */
export async function synchroniserTout() {
  try {
    await preparer();
    for (const table of Object.keys(TABLES)) {
      const existe = await sequelize.query(`SELECT to_regclass(:t) AS t`, { replacements: { t: table }, type: sequelize.QueryTypes.SELECT });
      if (!existe[0]?.t) continue;
      const lignes = await sequelize.query(
        `SELECT p.id, p.tenant_code FROM ${table} p
           JOIN professional_accounts a ON a.tenant_code = p.tenant_code
          WHERE a.type IN ('commerce','vendor','supplier','producer')`,
        { type: sequelize.QueryTypes.SELECT }
      );
      for (const l of lignes) await synchroniserProduit(table, l.id, l.tenant_code);
    }
  } catch (e) {
    console.error('Échange : synchronisation des produits de gestion :', e.message);
  }
}

/** Tous les produits d'un établissement (après une modification) : Échange suit. */
export async function synchroniserEtablissement(table, tenantCode) {
  if (!TABLES[table] || !tenantCode) return;
  try {
    const lignes = await sequelize.query(`SELECT id FROM ${table} WHERE tenant_code = :code`,
      { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT });
    for (const l of lignes) await synchroniserProduit(table, l.id, tenantCode);
  } catch (e) {
    console.error(`Échange : synchronisation ${table} / ${tenantCode} :`, e.message);
  }
}

/**
 * À placer sur le routeur d'une gestion : après chaque modification réussie de
 * ses produits (ajout, modification, stock, import, retrait), Échange est mis à jour.
 */
export function suivreProduitsDansEchange(table) {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      res.on('finish', () => {
        if (res.statusCode < 300 && req.params.tenantCode) synchroniserEtablissement(table, req.params.tenantCode);
      });
    }
    next();
  };
}

/**
 * Publications faites par le commerçant depuis le bouton « Publier » d'Échange :
 * elles apparaissent aussi sur son site (celles venant de sa gestion y sont déjà).
 */
export async function publicationsEchangeDuSite(tenantCode, limite = 40) {
  try {
    await preparer();
    const lignes = await sequelize.query(
      `SELECT e.id, e.title, e.subcategory, e.price, e.quantity, e.images, e.description
         FROM exchange_products e
         JOIN management_tenants t ON t.owner_numero_h = e.numero_h
        WHERE t.tenant_code = :code AND e.is_active = true AND e.source_gestion IS NULL
        ORDER BY e.created_at DESC LIMIT :limite`,
      { replacements: { code: tenantCode, limite }, type: sequelize.QueryTypes.SELECT }
    );
    return lignes.map((e) => {
      let images = e.images;
      if (typeof images === 'string') { try { images = JSON.parse(images); } catch { images = []; } }
      const premiere = Array.isArray(images) ? images[0] : null;
      const photo = typeof premiere === 'string' ? premiere : (premiere?.url || null);
      return {
        id: `echange-${e.id}`, nom: e.title, categorie: e.subcategory || 'Échange', prix: Number(e.price) || 0,
        stock: e.quantity ?? null, unite: 'pièce', photo, description: e.description || '',
      };
    });
  } catch (e) {
    console.error('Échange → site :', e.message);
    return [];
  }
}
