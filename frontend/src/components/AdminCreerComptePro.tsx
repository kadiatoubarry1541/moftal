import { useState } from "react";
import { config } from "../config/api";
import { ADMIN_SERVICES } from "./EspaceProModals";
import { normaliserLogo } from "../utils/logoImage";
import EnvoiLien from "./EnvoiLien";
import { lienAppGestion } from "../utils/lienAppGestion";
import { messageLienApplication } from "../utils/invitationPro";
import { useTraduction } from "../i18n/traduction";

// L'admin crée un compte pro avec le minimum (nom, secteur, téléphone ou e-mail).
// Il envoie le lien de l'application : le pro se connecte avec ce téléphone /
// cet e-mail (la première fois il choisit son mot de passe), installe et a
// tous les droits. Le compte est publié tout de suite (essai gratuit).
export default function AdminCreerComptePro({ onClose, onCree }: { onClose: () => void; onCree?: () => void }) {
  const { tr } = useTraduction();
  const [name, setName] = useState("");
  const [type, setType] = useState("school");
  const [subSector, setSubSector] = useState("");
  const [planType, setPlanType] = useState<"full" | "visibility">("full");
  const [identifiant, setIdentifiant] = useState("");
  const [photo, setPhoto] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<{ lien: string; nom: string; telephone?: string; email?: string; compteExistant: boolean; code?: string | null } | null>(null);
  const echanges = ["vendor", "supplier", "producer"].includes(type);

  const creer = async () => {
    setErreur("");
    if (!name.trim()) { setErreur(tr("Indiquez le nom de l'établissement.")); return; }
    if (!identifiant.trim()) { setErreur(tr("Indiquez le téléphone ou l'e-mail de l'établissement.")); return; }
    if (echanges && !subSector) { setErreur(tr("Choisissez le niveau d'échanges.")); return; }
    setEnvoi(true);
    try {
      const r = await fetch(`${config.API_BASE_URL}/invitations-pro/admin/creer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        body: JSON.stringify({ name: name.trim(), type, subSector: echanges ? subSector : undefined, planType, identifiant: identifiant.trim(), photo: photo || undefined }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) { setErreur(tr(d.message || "Le compte n'a pas été créé.")); return; }
      // Lien à envoyer : l'application de gestion (formule complète), sinon son espace pro
      let lien = `${window.location.origin}/espace-pro/${d.account.id}`;
      if (d.account.planType === "full") {
        let code = d.account.tenant_code;
        if (!code) {
          const e = await fetch(`${config.API_BASE_URL}/professionals/${d.account.id}/ensure-tenant`, {
            method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
          }).then(x => x.json()).catch(() => ({}));
          code = e.tenantCode;
        }
        if (code) lien = lienAppGestion(d.account.type, code);
      }
      setResultat({ lien, nom: d.account.name, telephone: d.account.phone || undefined, email: d.account.email || undefined, compteExistant: !!d.compteExistant, code: d.codePremiereConnexion || null });
      onCree?.();
    } catch {
      setErreur(tr("Erreur de connexion. Vérifiez internet puis réessayez."));
    } finally {
      setEnvoi(false);
    }
  };

  const champ = "w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";
  return (
    <div className="fixed inset-0 z-[10050] bg-black/50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-extrabold text-gray-900">{tr("➕ Créer un compte pro")}</h3>
          <button onClick={onClose} aria-label={tr("Fermer")} className="text-2xl text-gray-400">×</button>
        </div>

        {resultat ? (
          <div>
            <p className="text-sm text-green-700 font-semibold">{tr("✅ « {nom} » est créé et publié.", { nom: resultat.nom })}</p>
            <p className="text-sm text-gray-600 mt-1">
              {resultat.code
                ? tr("Envoyez-lui ce lien et ce code : il se connecte avec ce téléphone / cet e-mail, saisit le code, choisit son mot de passe la première fois, puis installe.")
                : tr("Ce téléphone / e-mail a déjà un compte Moftal : il se connecte avec son mot de passe habituel.")}
            </p>
            {resultat.code && (
              <p className="text-sm bg-white border border-dashed border-green-500 rounded-lg px-3 py-2">
                {tr("🔑 Code de première connexion :")} <b className="text-lg tracking-widest">{resultat.code}</b>
              </p>
            )}
            <EnvoiLien lien={resultat.lien} message={messageLienApplication(resultat.nom, resultat.lien, true) + (resultat.code ? `\n${tr("Code de première connexion :")} ${resultat.code}` : "")} telephone={resultat.telephone} email={resultat.email} sujet={tr("Votre application {nom} sur Moftal", { nom: resultat.nom })} />
            <button onClick={onClose} className="mt-4 w-full py-2.5 rounded-xl bg-gray-100 text-gray-800 font-semibold text-sm">{tr("Fermer")}</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{tr("Nom de l'établissement *")}</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder={tr("Ex : École Les Étoiles")} className={champ} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{tr("Téléphone ou e-mail de l'établissement *")}</label>
              <input value={identifiant} onChange={e => setIdentifiant(e.target.value)} placeholder={tr("Ex : 620 00 00 00 ou contact@ecole.com")}
                inputMode="email" autoCapitalize="none" className={champ} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{tr("Secteur *")}</label>
              <select value={type} onChange={e => { setType(e.target.value); setSubSector(""); }} className={champ}>
                {ADMIN_SERVICES.map(s => <option key={s.type} value={s.type}>{s.emoji} {tr(s.label)}</option>)}
              </select>
            </div>
            {echanges && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{tr("Niveau d'échanges *")}</label>
                <select value={subSector} onChange={e => setSubSector(e.target.value)} className={champ}>
                  <option value="">{tr("Choisir…")}</option>
                  <option value="primaire">{tr("Primaire")}</option>
                  <option value="secondaire">{tr("Secondaire")}</option>
                  <option value="tertiaire">{tr("Tertiaire")}</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{tr("Formule *")}</label>
              <select value={planType} onChange={e => setPlanType(e.target.value as "full" | "visibility")} className={champ}>
                <option value="full">{tr("Visibilité + Gestion Interne")}</option>
                <option value="visibility">{tr("Visibilité + Rendez-vous")}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{tr("Logo (facultatif — sinon le pro l'ajoute)")}</label>
              <div className="flex items-center gap-3">
                {photo && <img src={photo} alt="" className="w-12 h-12 rounded-lg object-contain border border-gray-200 bg-white" />}
                <label className="px-3 py-2 rounded-xl border border-teal-600 text-teal-700 text-sm font-semibold cursor-pointer">
                  {photo ? tr("Changer") : tr("Choisir un logo")}
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const f = e.target.files?.[0]; e.target.value = "";
                    if (f) normaliserLogo(f).then(setPhoto).catch(err => setErreur(tr(err.message)));
                  }} />
                </label>
              </div>
            </div>
            {erreur && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">{erreur}</p>}
            <button onClick={creer} disabled={envoi} className="w-full py-3 rounded-xl bg-teal-600 text-white font-bold text-sm disabled:opacity-60">
              {envoi ? tr("⏳ Création…") : tr("Créer et obtenir le lien de l'application")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
