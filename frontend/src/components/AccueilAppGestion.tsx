import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoEtablissement from "./LogoEtablissement";
import { getTypeInfo } from "./EspaceProModals";
import { demanderCodeOuverture } from "../utils/codeOuverture";

// Espace pro d'un établissement en formule complète, vu sur le site Moftal :
// tout se fait dans SA propre application (la gestion interne, avec son logo).
// Ici, seulement : installer l'application, et partager le lien à ses membres.
// Rien n'est supprimé : demandes, historique, membres, retrait, paramètres,
// profil et vitrine sont dans l'application.

const API = (import.meta.env.VITE_API_URL || "http://localhost:5002").replace(/\/api\/?$/, "");
const DOMAINE_GESTION = "gestions.moftal.com";

const estAndroid = () => /Android/i.test(navigator.userAgent);

export default function AccueilAppGestion({ account, couleur }: { account: any; couleur: string }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";
  const [tenantCode, setTenantCode] = useState<string>(account.tenant_code || "");
  const [code, setCode] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [copie, setCopie] = useState(false);
  const chemin = getTypeInfo(account.type).path;

  // La gestion doit exister (créée la première fois, comme depuis « Gestion interne »)
  useEffect(() => {
    if (tenantCode) return;
    fetch(`${API}/api/professionals/${account.id}/ensure-tenant`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success && d.tenantCode) setTenantCode(d.tenantCode); else setErreur(d.message || "Impossible de préparer votre gestion."); })
      .catch(() => setErreur("Erreur de connexion. Vérifiez internet puis réessayez."));
  }, [account.id]);

  // Code d'ouverture préparé à l'avance (valable 10 min, renouvelé) : l'appui sur
  // « Installer » ouvre tout de suite la gestion, déjà connectée.
  useEffect(() => {
    let fini = false;
    const charger = () => demanderCodeOuverture().then(c => { if (!fini) setCode(c); });
    charger();
    const t = setInterval(charger, 8 * 60 * 1000);
    return () => { fini = true; clearInterval(t); };
  }, []);

  const adresse = (installer: boolean, c: string | null) => {
    const q = new URLSearchParams();
    if (installer) q.set("installer", "1");
    if (c) q.set("_c", c);
    return `${DOMAINE_GESTION}/${chemin}/${tenantCode}${q.toString() ? `?${q}` : ""}`;
  };

  const ouvrir = async (installer: boolean) => {
    if (!tenantCode || enCours) return;
    setEnCours(true);
    // Le code est à usage unique : un nouveau sera préparé pour un prochain appui
    const c = code || await demanderCodeOuverture();
    setCode(null);
    void demanderCodeOuverture().then(setCode);
    const cible = adresse(installer, c);
    if (estAndroid()) {
      // Installer n'est possible que dans Chrome : on l'ouvre directement (depuis
      // l'app Moftal, WhatsApp, Facebook… comme depuis Chrome lui-même).
      const secours = encodeURIComponent(`https://${cible}`);
      window.location.href = `intent://${cible}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${secours};end`;
    } else {
      window.location.href = `https://${cible}`;
    }
    setTimeout(() => setEnCours(false), 4000);
  };

  const lienMembres = `${window.location.origin}/installer-app/${account.id}`;
  const partager = async () => {
    const texte = `Rejoignez ${account.name} sur son application :`;
    if (navigator.share) {
      try { await navigator.share({ title: account.name, text: texte, url: lienMembres }); return; } catch { /* annulé : on copie */ }
    }
    try { await navigator.clipboard.writeText(lienMembres); } catch {
      const z = document.createElement("textarea"); z.value = lienMembres; document.body.appendChild(z); z.select(); document.execCommand("copy"); z.remove();
    }
    setCopie(true); setTimeout(() => setCopie(false), 2500);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center px-4 pt-10 pb-16">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 text-center">
        <div className="w-24 h-24 mx-auto rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-600 bg-white">
          <LogoEtablissement src={account.photo} name={account.name} type={account.type} fontSize={40} />
        </div>
        <h1 className="mt-4 text-xl font-extrabold text-gray-900 dark:text-white">{account.name}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Votre gestion complète est dans votre propre application, avec votre logo.</p>

        {erreur && <p className="mt-4 text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">{erreur}</p>}

        <button onClick={() => ouvrir(true)} disabled={!tenantCode || enCours}
          className="mt-6 w-full py-4 rounded-2xl text-white text-base font-extrabold shadow-md disabled:opacity-60"
          style={{ background: couleur }}>
          {!tenantCode && !erreur ? "⏳ Préparation…" : enCours ? "⏳ Ouverture…" : "📲 Installer ma gestion interne"}
        </button>
        <p className="mt-2 text-xs text-gray-400">Votre application s'ouvre et propose l'installation : confirmez, c'est tout.</p>

        <button onClick={partager}
          className="mt-5 w-full py-3.5 rounded-2xl text-sm font-bold border-2"
          style={{ borderColor: couleur, color: couleur }}>
          {copie ? "✅ Lien copié" : "🔗 Partager le lien à mes membres"}
        </button>

        <button onClick={() => ouvrir(false)} disabled={!tenantCode || enCours}
          className="mt-5 text-xs font-semibold text-gray-500 underline disabled:opacity-50">
          Déjà installée ? Ouvrir ma gestion
        </button>
      </div>
      <button onClick={() => navigate("/")} className="mt-6 text-sm text-gray-500">← Retour à Moftal</button>
    </div>
  );
}
