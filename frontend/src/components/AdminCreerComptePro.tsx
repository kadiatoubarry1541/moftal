import { useState } from "react";
import { config } from "../config/api";
import { ADMIN_SERVICES } from "./EspaceProModals";
import { normaliserLogo } from "../utils/logoImage";
import EnvoiInvitationPro from "./EnvoiInvitationPro";

// L'admin crée un compte pro avec le minimum (nom, secteur, téléphone ou e-mail).
// Le pro reçoit un lien : il choisit son mot de passe, ajoute son logo et
// installe sa gestion. Le compte est publié tout de suite (essai gratuit).
export default function AdminCreerComptePro({ onClose, onCree }: { onClose: () => void; onCree?: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("school");
  const [subSector, setSubSector] = useState("");
  const [planType, setPlanType] = useState<"full" | "visibility">("full");
  const [identifiant, setIdentifiant] = useState("");
  const [photo, setPhoto] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<{ token: string; nom: string; telephone?: string; email?: string; compteExistant: boolean } | null>(null);
  const echanges = ["vendor", "supplier", "producer"].includes(type);

  const creer = async () => {
    setErreur("");
    if (!name.trim()) { setErreur("Indiquez le nom de l'établissement."); return; }
    if (!identifiant.trim()) { setErreur("Indiquez le téléphone ou l'e-mail de l'établissement."); return; }
    if (echanges && !subSector) { setErreur("Choisissez le niveau d'échanges."); return; }
    setEnvoi(true);
    try {
      const r = await fetch(`${config.API_BASE_URL}/invitations-pro/admin/creer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        body: JSON.stringify({ name: name.trim(), type, subSector: echanges ? subSector : undefined, planType, identifiant: identifiant.trim(), photo: photo || undefined }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) { setErreur(d.message || "Le compte n'a pas été créé."); return; }
      setResultat({ token: d.token, nom: d.account.name, telephone: d.account.phone || undefined, email: d.account.email || undefined, compteExistant: !!d.compteExistant });
      onCree?.();
    } catch {
      setErreur("Erreur de connexion. Vérifiez internet puis réessayez.");
    } finally {
      setEnvoi(false);
    }
  };

  const champ = "w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";
  return (
    <div className="fixed inset-0 z-[10050] bg-black/50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-extrabold text-gray-900">➕ Créer un compte pro</h3>
          <button onClick={onClose} aria-label="Fermer" className="text-2xl text-gray-400">×</button>
        </div>

        {resultat ? (
          <div>
            <p className="text-sm text-green-700 font-semibold">✅ « {resultat.nom} » est créé et publié.</p>
            <p className="text-sm text-gray-600 mt-1">
              {resultat.compteExistant
                ? "Ce téléphone / e-mail a déjà un compte Moftal : le pro se connecte avec, puis accepte l'invitation."
                : "Envoyez-lui ce lien : il choisit son mot de passe, ajoute son logo et installe sa gestion."}
            </p>
            <EnvoiInvitationPro token={resultat.token} nom={resultat.nom} telephone={resultat.telephone} email={resultat.email} />
            <button onClick={onClose} className="mt-4 w-full py-2.5 rounded-xl bg-gray-100 text-gray-800 font-semibold text-sm">Fermer</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nom de l'établissement *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex : École Les Étoiles" className={champ} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Téléphone ou e-mail de l'établissement *</label>
              <input value={identifiant} onChange={e => setIdentifiant(e.target.value)} placeholder="Ex : 620 00 00 00 ou contact@ecole.com"
                inputMode="email" autoCapitalize="none" className={champ} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Secteur *</label>
              <select value={type} onChange={e => { setType(e.target.value); setSubSector(""); }} className={champ}>
                {ADMIN_SERVICES.map(s => <option key={s.type} value={s.type}>{s.emoji} {s.label}</option>)}
              </select>
            </div>
            {echanges && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Niveau d'échanges *</label>
                <select value={subSector} onChange={e => setSubSector(e.target.value)} className={champ}>
                  <option value="">Choisir…</option>
                  <option value="primaire">Primaire</option>
                  <option value="secondaire">Secondaire</option>
                  <option value="tertiaire">Tertiaire</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Formule *</label>
              <select value={planType} onChange={e => setPlanType(e.target.value as "full" | "visibility")} className={champ}>
                <option value="full">Visibilité + Gestion Interne</option>
                <option value="visibility">Visibilité + Rendez-vous</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Logo (facultatif — sinon le pro l'ajoute)</label>
              <div className="flex items-center gap-3">
                {photo && <img src={photo} alt="" className="w-12 h-12 rounded-lg object-contain border border-gray-200 bg-white" />}
                <label className="px-3 py-2 rounded-xl border border-teal-600 text-teal-700 text-sm font-semibold cursor-pointer">
                  {photo ? "Changer" : "Choisir un logo"}
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const f = e.target.files?.[0]; e.target.value = "";
                    if (f) normaliserLogo(f).then(setPhoto).catch(err => setErreur(err.message));
                  }} />
                </label>
              </div>
            </div>
            {erreur && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">{erreur}</p>}
            <button onClick={creer} disabled={envoi} className="w-full py-3 rounded-xl bg-teal-600 text-white font-bold text-sm disabled:opacity-60">
              {envoi ? "⏳ Création…" : "Créer et obtenir le lien d'invitation"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
