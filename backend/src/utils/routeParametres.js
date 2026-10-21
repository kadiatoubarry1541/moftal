// Paramètres des gestions internes : PUT /:tenantCode/settings
// Renseignements de l'établissement (nom, logo, description, contact, horaires,
// téléphone d'urgence), enregistrés dans management_tenants puis recopiés sur
// le compte pro. Réservé au propriétaire et au co-responsable « tous les droits ».
import { sequelize } from '../config/database.js';
import { syncAccountFromTenant } from './tenantSync.js';
import { ensureTenantExtraColumns } from '../routes/clinic-management.js';

export function ajouterRouteParametres(router, gardes) {
  router.put('/:tenantCode/settings', ...gardes, async (req, res) => {
    if (req.employe && req.employe.niveau !== 'total') {
      return res.status(403).json({ success: false, message: "Seul le propriétaire peut modifier les renseignements de l'établissement." });
    }
    try {
      await ensureTenantExtraColumns();
      const { name, logo_url, address, phone, email, description, horaires, phone_urgence } = req.body;
      const code = req.params.tenantCode;
      await sequelize.query(
        `UPDATE management_tenants SET
          name          = COALESCE(:name, name),
          logo_url      = COALESCE(NULLIF(:logo, ''), logo_url),
          address       = :address,
          phone         = :phone,
          email         = :email,
          description   = :desc,
          horaires      = :horaires,
          phone_urgence = :phone_urgence
         WHERE tenant_code = :code`,
        { replacements: { name: (name || '').trim() || null, logo: logo_url || null, address: address || null, phone: phone || null, email: email || null, desc: description || null, horaires: horaires || null, phone_urgence: phone_urgence || null, code } }
      );
      const [updated] = await sequelize.query(`SELECT * FROM management_tenants WHERE tenant_code = :code LIMIT 1`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
      await syncAccountFromTenant(code);
      res.json({ success: true, tenant: updated });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });
}
