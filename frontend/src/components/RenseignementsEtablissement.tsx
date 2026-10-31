import { useEffect, useState, type CSSProperties } from "react";
import { TenantLogo } from "./GestionBrand";
import { normaliserLogo } from "../utils/logoImage";
import type { EtablissementGestion } from "../types/pro";

// Paramètres d'une gestion interne : renseignements de l'établissement (logo,
// nom, description, contact, horaires, urgence). Enregistrés sur le serveur
// (PUT <base>/settings) et affichés sur le site de l'établissement.
const champ: CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" };
const etiquette: CSSProperties = { fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 };
const formulaireDe = (t: Partial<EtablissementGestion> | null) => ({ name: t?.name || "", description: t?.description || "", phone: t?.phone || "", email: t?.email || "", address: t?.address || "", horaires: t?.horaires || "", phone_urgence: t?.phone_urgence || "" });

export default function RenseignementsEtablissement({ base, tenantCode, tenant, couleur, emoji, titre, nomLabel, descriptionAide, horairesAide, onSaved }: {
  /** Préfixe des routes de la gestion, ex. /api/restaurant-mgmt/CODE */
  base: string;
  tenantCode?: string;
  tenant: EtablissementGestion & { acces_employe?: string | null };
  couleur: string;
  emoji: string;
  titre: string;
  nomLabel: string;
  descriptionAide?: string;
  horairesAide?: string;
  onSaved: (tenant: EtablissementGestion) => void;
}) {
  const [form, setForm] = useState<ReturnType<typeof formulaireDe> & { logo_url?: string }>(() => formulaireDe(tenant));
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => { setForm(formulaireDe(tenant)); }, [tenant]);

  // Employé aux droits limités : il ne modifie pas l'établissement
  if (tenant?.acces_employe && tenant.acces_employe !== "total") {
    return (
      <div style={{ background: `${couleur}0d`, border: `1px solid ${couleur}33`, borderRadius: 12, padding: 14, fontSize: 13, color: couleur }}>
        Seul le propriétaire peut modifier les renseignements de l'établissement.
      </div>
    );
  }

  const set = (cle: string) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [cle]: e.target.value }));
  // Logo converti en PNG 512 px : s'affiche partout et sert d'icône d'application
  const choisirLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    normaliserLogo(file).then(logo => setForm((f) => ({ ...f, logo_url: logo }))).catch(err => alert(err.message));
  };
  const enregistrer = async () => {
    if (!(form.name || "").trim()) { alert(`${nomLabel.replace(/ \*$/, "")} : ce champ est obligatoire.`); return; }
    setEnvoi(true);
    try {
      const r = await fetch(`${base}/settings`, { method: "PUT", headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await r.json().catch(() => ({ success: false, message: `Erreur du serveur (${r.status}) : rien n'a été enregistré.` }));
      if (d.success && d.tenant) { onSaved(d.tenant); alert("Renseignements enregistrés. Ils apparaissent sur votre site."); }
      else alert(d.message || "Erreur : rien n'a été enregistré.");
    } catch {
      alert("Connexion coupée : rien n'a été enregistré. Réessayez.");
    } finally { setEnvoi(false); }
  };

  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, display: "grid", gap: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{emoji} {titre}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <TenantLogo tenantCode={tenantCode} logoUrl={form.logo_url || tenant?.logo_url} fallback={emoji} size={72} radius={14} />
        <div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", background: couleur, color: "white", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            Changer le logo
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={choisirLogo} />
          </label>
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>Affiché partout : votre gestion, votre site, les listes et les rendez-vous.</p>
        </div>
      </div>
      <div><label style={etiquette}>{nomLabel}</label><input style={champ} value={form.name} onChange={set("name")} /></div>
      <div><label style={etiquette}>Description</label><textarea style={{ ...champ, height: 80, resize: "vertical" }} placeholder={descriptionAide} value={form.description} onChange={set("description")} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
        <div><label style={etiquette}>Téléphone</label><input style={champ} type="tel" value={form.phone} onChange={set("phone")} /></div>
        <div><label style={etiquette}>E-mail</label><input style={champ} type="email" value={form.email} onChange={set("email")} /></div>
      </div>
      <div><label style={etiquette}>Adresse</label><input style={champ} placeholder="Quartier, rue, repère…" value={form.address} onChange={set("address")} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
        <div><label style={etiquette}>Horaires d'ouverture</label><input style={champ} placeholder={horairesAide} value={form.horaires} onChange={set("horaires")} /></div>
        <div><label style={etiquette}>Téléphone d'urgence</label><input style={champ} type="tel" value={form.phone_urgence} onChange={set("phone_urgence")} /></div>
      </div>
      <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>Ces renseignements sont enregistrés sur le serveur et affichés sur votre site.</p>
      <button onClick={enregistrer} disabled={envoi} style={{ justifySelf: "start", padding: "10px 24px", background: envoi ? `${couleur}88` : couleur, color: "white", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: envoi ? "not-allowed" : "pointer" }}>
        {envoi ? "Enregistrement…" : "Enregistrer les renseignements"}
      </button>
    </div>
  );
}
