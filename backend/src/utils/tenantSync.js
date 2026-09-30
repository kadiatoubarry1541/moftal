import { sequelize } from '../config/database.js';

// Un établissement a deux fiches en base : son compte pro (professional_accounts)
// et sa gestion interne (management_tenants), que lit le site client. Ces helpers
// les gardent identiques : ce qui est changé dans la gestion se voit sur le site.

// Paramètres de la gestion interne → compte pro (nom, contact, logo, description)
export async function syncAccountFromTenant(tenantCode) {
  await sequelize.query(
    `UPDATE professional_accounts pa SET
       name        = COALESCE(NULLIF(mt.name, ''), pa.name),
       description = mt.description,
       address     = mt.address,
       phone       = mt.phone,
       email       = mt.email,
       photo       = COALESCE(NULLIF(mt.logo_url, ''), pa.photo)
     FROM management_tenants mt
     WHERE mt.tenant_code = :code AND pa.tenant_code = mt.tenant_code`,
    { replacements: { code: tenantCode } }
  ).catch((e) => console.warn('⚠️ syncAccountFromTenant:', e.message));
}

// Complète les champs vides de la gestion interne avec ceux du compte pro
// (ex. email et téléphone saisis à l'inscription). N'écrase jamais une valeur.
// Sans code : tous les établissements (au démarrage). Avec code : un seul (avant
// d'afficher son site client).
export async function fillTenantsFromAccounts(tenantCode = null) {
  await sequelize.query(
    `UPDATE management_tenants mt SET
       description = COALESCE(NULLIF(mt.description, ''), pa.description),
       address     = COALESCE(NULLIF(mt.address, ''), pa.address),
       phone       = COALESCE(NULLIF(mt.phone, ''), pa.phone),
       email       = COALESCE(NULLIF(mt.email, ''), pa.email),
       logo_url    = COALESCE(NULLIF(mt.logo_url, ''), pa.photo)
     FROM professional_accounts pa
     WHERE pa.tenant_code = mt.tenant_code${tenantCode ? ' AND mt.tenant_code = :code' : ''}`,
    { replacements: { code: tenantCode } }
  );
}
