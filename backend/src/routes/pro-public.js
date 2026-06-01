import express from 'express';
import { sequelize } from '../config/database.js';

const router = express.Router();

const q = (sql, rep) =>
  sequelize.query(sql, { replacements: rep, type: sequelize.QueryTypes.SELECT })
    .catch(() => []);

const q1 = (sql, rep) =>
  sequelize.query(sql, { replacements: rep, type: sequelize.QueryTypes.SELECT })
    .then(r => r[0]).catch(() => ({ c: 0, t: 0 }));

// ─── GET /api/pro-public/:type/:tenantCode ─────────────────────────────────
// Infos publiques du tenant (nom, logo, contact, description)
router.get('/:type/:tenantCode', async (req, res) => {
  try {
    const { type, tenantCode } = req.params;
    const [tenant] = await sequelize.query(
      `SELECT tenant_code, type, name, logo_url, address, phone, email, description
       FROM management_tenants
       WHERE tenant_code = :code AND type = :type AND is_active = true
       LIMIT 1`,
      { replacements: { code: tenantCode, type }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(404).json({ success: false, message: 'Espace introuvable ou inactif.' });
    res.json({ success: true, tenant });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── GET /api/pro-public/:type/:tenantCode/data ────────────────────────────
// Données publiques spécifiques au type (staff, projets, articles, biens…)
router.get('/:type/:tenantCode/data', async (req, res) => {
  const { type, tenantCode: code } = req.params;
  try {
    switch (type) {

      case 'school': {
        const [staffCnt, stuCnt, clsCnt, staff] = await Promise.all([
          q1(`SELECT COUNT(*) as c FROM school_staff WHERE tenant_code=:code AND is_active=true`, { code }),
          q1(`SELECT COUNT(*) as c FROM school_students WHERE tenant_code=:code AND statut='actif'`, { code }),
          q1(`SELECT COUNT(*) as c FROM school_classrooms WHERE tenant_code=:code`, { code }),
          q(`SELECT nom,prenom,role,matiere FROM school_staff WHERE tenant_code=:code AND is_active=true ORDER BY role,nom LIMIT 12`, { code }),
        ]);
        return res.json({ success: true, stats: { staff: +(staffCnt.c||0), students: +(stuCnt.c||0), classes: +(clsCnt.c||0) }, staff });
      }

      case 'madrasa': {
        const [staffCnt, stuCnt, halCnt, staff] = await Promise.all([
          q1(`SELECT COUNT(*) as c FROM madrasa_staff WHERE tenant_code=:code`, { code }),
          q1(`SELECT COUNT(*) as c FROM madrasa_students WHERE tenant_code=:code AND is_active=true`, { code }),
          q1(`SELECT COUNT(*) as c FROM madrasa_halaqas WHERE tenant_code=:code`, { code }),
          q(`SELECT nom,prenom,role FROM madrasa_staff WHERE tenant_code=:code ORDER BY nom LIMIT 12`, { code }),
        ]);
        return res.json({ success: true, stats: { staff: +(staffCnt.c||0), students: +(stuCnt.c||0), halaqas: +(halCnt.c||0) }, staff });
      }

      case 'mosque': {
        const [memCnt, annCnt, imams, announcements] = await Promise.all([
          q1(`SELECT COUNT(*) as c FROM mosque_members WHERE tenant_code=:code AND is_active=true`, { code }),
          q1(`SELECT COUNT(*) as c FROM mosque_announcements WHERE tenant_code=:code AND is_active=true`, { code }),
          q(`SELECT nom,prenom,rang,specialite FROM mosque_imams WHERE tenant_code=:code AND is_active=true ORDER BY rang LIMIT 6`, { code }),
          q(`SELECT titre,contenu,created_at FROM mosque_announcements WHERE tenant_code=:code AND is_active=true ORDER BY created_at DESC LIMIT 5`, { code }),
        ]);
        return res.json({ success: true, stats: { members: +(memCnt.c||0), announcements: +(annCnt.c||0) }, imams, announcements });
      }

      case 'imam': {
        const [imamsCnt, predCnt, imams, predications] = await Promise.all([
          q1(`SELECT COUNT(*) as c FROM imam_network_imams WHERE tenant_code=:code AND is_active=true`, { code }),
          q1(`SELECT COUNT(*) as c FROM imam_network_predications WHERE tenant_code=:code`, { code }),
          q(`SELECT nom,prenom,specialite FROM imam_network_imams WHERE tenant_code=:code AND is_active=true ORDER BY nom LIMIT 6`, { code }),
          q(`SELECT titre,theme,date_pred FROM imam_network_predications WHERE tenant_code=:code ORDER BY date_pred DESC LIMIT 5`, { code }),
        ]);
        return res.json({ success: true, stats: { imams: +(imamsCnt.c||0), predications: +(predCnt.c||0) }, imams, predications });
      }

      case 'ngo': {
        const [memCnt, projCnt, annCnt, projects, announcements] = await Promise.all([
          q1(`SELECT COUNT(*) as c FROM ngo_members WHERE tenant_code=:code AND is_active=true`, { code }),
          q1(`SELECT COUNT(*) as c FROM ngo_projects WHERE tenant_code=:code AND statut='en_cours'`, { code }),
          q1(`SELECT COUNT(*) as c FROM ngo_announcements WHERE tenant_code=:code AND is_active=true`, { code }),
          q(`SELECT nom,description,statut,budget,beneficiaires FROM ngo_projects WHERE tenant_code=:code ORDER BY created_at DESC LIMIT 6`, { code }),
          q(`SELECT titre,contenu,created_at FROM ngo_announcements WHERE tenant_code=:code AND is_active=true ORDER BY created_at DESC LIMIT 3`, { code }),
        ]);
        return res.json({ success: true, stats: { members: +(memCnt.c||0), projects: +(projCnt.c||0), announcements: +(annCnt.c||0) }, projects, announcements });
      }

      case 'enterprise': {
        const [empCnt, clientCnt, contractCnt, employees, announcements] = await Promise.all([
          q1(`SELECT COUNT(*) as c FROM enterprise_employees WHERE tenant_code=:code AND is_active=true`, { code }),
          q1(`SELECT COUNT(*) as c FROM enterprise_clients WHERE tenant_code=:code AND is_active=true`, { code }),
          q1(`SELECT COUNT(*) as c FROM enterprise_contracts WHERE tenant_code=:code AND statut='en_cours'`, { code }),
          q(`SELECT nom,prenom,poste,departement FROM enterprise_employees WHERE tenant_code=:code AND is_active=true ORDER BY nom LIMIT 8`, { code }),
          q(`SELECT titre,contenu,created_at FROM enterprise_announcements WHERE tenant_code=:code AND is_active=true ORDER BY created_at DESC LIMIT 3`, { code }),
        ]);
        return res.json({ success: true, stats: { employees: +(empCnt.c||0), clients: +(clientCnt.c||0), contracts: +(contractCnt.c||0) }, employees, announcements });
      }

      case 'journalist': {
        const [repCnt, artCnt, subCnt, articles, reporters] = await Promise.all([
          q1(`SELECT COUNT(*) as c FROM journalist_reporters WHERE tenant_code=:code AND is_active=true`, { code }),
          q1(`SELECT COUNT(*) as c FROM journalist_articles WHERE tenant_code=:code AND statut='publie'`, { code }),
          q1(`SELECT COUNT(*) as c FROM journalist_subscribers WHERE tenant_code=:code AND is_active=true`, { code }),
          q(`SELECT titre,categorie,auteur_nom,date_pub,resume FROM journalist_articles WHERE tenant_code=:code AND statut='publie' ORDER BY date_pub DESC LIMIT 6`, { code }),
          q(`SELECT nom,prenom,role,specialite FROM journalist_reporters WHERE tenant_code=:code AND is_active=true ORDER BY nom LIMIT 8`, { code }),
        ]);
        return res.json({ success: true, stats: { reporters: +(repCnt.c||0), articles: +(artCnt.c||0), subscribers: +(subCnt.c||0) }, articles, reporters });
      }

      case 'scientist': {
        const [memCnt, pubCnt, projCnt, publications, members] = await Promise.all([
          q1(`SELECT COUNT(*) as c FROM scientist_members WHERE tenant_code=:code AND is_active=true`, { code }),
          q1(`SELECT COUNT(*) as c FROM scientist_publications WHERE tenant_code=:code AND statut='publie'`, { code }),
          q1(`SELECT COUNT(*) as c FROM scientist_projects WHERE tenant_code=:code AND statut='en_cours'`, { code }),
          q(`SELECT titre,type_pub,domaine,auteur_nom,date_pub,resume FROM scientist_publications WHERE tenant_code=:code AND statut='publie' ORDER BY date_pub DESC LIMIT 6`, { code }),
          q(`SELECT nom,prenom,role,specialite FROM scientist_members WHERE tenant_code=:code AND is_active=true ORDER BY nom LIMIT 8`, { code }),
        ]);
        return res.json({ success: true, stats: { members: +(memCnt.c||0), publications: +(pubCnt.c||0), projects: +(projCnt.c||0) }, publications, members });
      }

      case 'security_agency': {
        const [agentCnt, missCnt, agents] = await Promise.all([
          q1(`SELECT COUNT(*) as c FROM security_agents WHERE tenant_code=:code AND is_active=true`, { code }),
          q1(`SELECT COUNT(*) as c FROM security_missions WHERE tenant_code=:code AND statut='en_cours'`, { code }),
          q(`SELECT nom,prenom,grade,specialite FROM security_agents WHERE tenant_code=:code AND is_active=true ORDER BY grade,nom LIMIT 8`, { code }),
        ]);
        return res.json({ success: true, stats: { agents: +(agentCnt.c||0), missions: +(missCnt.c||0) }, agents });
      }

      case 'immo':
      case 'immobilier': {
        const [propCnt, vacantCnt, properties] = await Promise.all([
          q1(`SELECT COUNT(*) as c FROM immo_properties WHERE tenant_code=:code`, { code }),
          q1(`SELECT COUNT(*) as c FROM immo_properties WHERE tenant_code=:code AND statut='vacant'`, { code }),
          q(`SELECT nom,type_bien,superficie,prix,statut,quartier,ville FROM immo_properties WHERE tenant_code=:code ORDER BY created_at DESC LIMIT 9`, { code }),
        ]);
        return res.json({ success: true, stats: { total: +(propCnt.c||0), vacant: +(vacantCnt.c||0) }, properties });
      }

      case 'restaurant': {
        const [dishCnt, tableCnt, staffCnt, dishes] = await Promise.all([
          q1(`SELECT COUNT(*) as c FROM resto_dishes WHERE tenant_code=:code AND disponible=true`, { code }),
          q1(`SELECT COUNT(*) as c FROM resto_tables WHERE tenant_code=:code`, { code }),
          q1(`SELECT COUNT(*) as c FROM resto_staff WHERE tenant_code=:code AND actif=true`, { code }),
          q(`SELECT nom,categorie,prix,description,disponible FROM resto_dishes WHERE tenant_code=:code AND disponible=true ORDER BY categorie,nom LIMIT 20`, { code }),
        ]);
        return res.json({ success: true, stats: { dishes: +(dishCnt.c||0), tables: +(tableCnt.c||0), staff: +(staffCnt.c||0) }, dishes });
      }

      case 'transport': {
        const [vehicleCnt, driverCnt, tripCnt, trips] = await Promise.all([
          q1(`SELECT COUNT(*) as c FROM transport_vehicles WHERE tenant_code=:code AND statut='actif'`, { code }),
          q1(`SELECT COUNT(*) as c FROM transport_drivers WHERE tenant_code=:code AND statut='disponible'`, { code }),
          q1(`SELECT COUNT(*) as c FROM transport_trips WHERE tenant_code=:code AND date_depart >= CURRENT_DATE`, { code }),
          q(`SELECT lieu_depart,lieu_arrivee,date_depart,heure_depart,prix,places_restantes FROM transport_trips WHERE tenant_code=:code AND date_depart >= CURRENT_DATE ORDER BY date_depart LIMIT 10`, { code }),
        ]);
        return res.json({ success: true, stats: { vehicles: +(vehicleCnt.c||0), drivers: +(driverCnt.c||0), trips: +(tripCnt.c||0) }, trips });
      }

      case 'supplier': {
        const [prodCnt, clientCnt, products, announcements] = await Promise.all([
          q1(`SELECT COUNT(*) as c FROM supplier_products WHERE tenant_code=:code AND is_active=true`, { code }),
          q1(`SELECT COUNT(*) as c FROM supplier_clients WHERE tenant_code=:code AND is_active=true`, { code }),
          q(`SELECT nom,categorie,prix_gros,prix_detail,stock,unite FROM supplier_products WHERE tenant_code=:code AND is_active=true ORDER BY categorie,nom LIMIT 20`, { code }),
          q(`SELECT titre,contenu,type,created_at FROM supplier_announcements WHERE tenant_code=:code AND is_active=true ORDER BY created_at DESC LIMIT 5`, { code }),
        ]);
        return res.json({ success: true, stats: { products: +(prodCnt.c||0), clients: +(clientCnt.c||0) }, products, announcements });
      }

      case 'reseau': {
        const [memCnt, projCnt, annCnt, members, announcements] = await Promise.all([
          q1(`SELECT COUNT(*) as c FROM reseau_members WHERE tenant_code=:code AND is_active=true`, { code }),
          q1(`SELECT COUNT(*) as c FROM reseau_projets WHERE tenant_code=:code AND statut='en_cours'`, { code }),
          q1(`SELECT COUNT(*) as c FROM reseau_announcements WHERE tenant_code=:code AND is_active=true`, { code }),
          q(`SELECT nom,prenom,poste,secteur FROM reseau_members WHERE tenant_code=:code AND is_active=true ORDER BY nom LIMIT 8`, { code }),
          q(`SELECT titre,contenu,created_at FROM reseau_announcements WHERE tenant_code=:code AND is_active=true ORDER BY created_at DESC LIMIT 3`, { code }),
        ]);
        return res.json({ success: true, stats: { members: +(memCnt.c||0), projects: +(projCnt.c||0), announcements: +(annCnt.c||0) }, members, announcements });
      }

      default:
        return res.status(400).json({ success: false, message: `Type '${type}' non supporté.` });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
