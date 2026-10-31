import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoEtablissement from "./LogoEtablissement";
import { getTypeInfo } from "./espaceProTypes";
import { demanderCodeOuverture } from "../utils/codeOuverture";
import { useTraduction } from "../i18n/traduction";
import BoutonLienAppGestion from "./BoutonLienAppGestion";
import type { CompteProfessionnel } from "../types/pro";

// Espace pro d'un établissement en formule complète, vu sur le site Moftal :
// tout se fait dans SA propre application (la gestion interne, avec son logo).
// Ici, seulement : installer l'application, et partager le lien à ses membres.
// Rien n'est supprimé : demandes, historique, membres, retrait, paramètres,
// profil et vitrine sont dans l'application.

const API = (import.meta.env.VITE_API_URL || "http://localhost:5002").replace(/\/api\/?$/, "");
const DOMAINE_GESTION = "gestions.moftal.com";

const estAndroid = () => /Android/i.test(navigator.userAgent);

export default function AccueilAppGestion({ account, couleur }: { account: Pick<CompteProfessionnel, "id" | "name" | "type" | "photo" | "tenant_code">; couleur: string }) {
  const navigate = useNavigate();
  const { tr } = useTraduction();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- relancé seulement quand ces valeurs changent (voulu)
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
      // l'app Moftal ou une autre application, comme depuis Chrome lui-même).
      const secours = encodeURIComponent(`https://${cible}`);
      window.location.href = `intent://${cible}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${secours};end`;
    } else {
      window.location.href = `https://${cible}`;
    }
    setTimeout(() => setEnCours(false), 4000);
  };

  const lienMembres = `${window.location.origin}/installer-app/${account.id}`;
  const partager = async () => {
    const texte = tr("Rejoignez {nom} sur son application :", { nom: account.name });
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
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{tr("Votre gestion complète est dans votre propre application, avec votre logo.")}</p>

        {erreur && <p className="mt-4 text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">{tr(erreur)}</p>}

        <button onClick={() => ouvrir(true)} disabled={!tenantCode || enCours}
          className="mt-6 w-full py-4 rounded-2xl text-white text-base font-extrabold shadow-md disabled:opacity-60"
          style={{ background: couleur }}>
          {!tenantCode && !erreur ? tr("⏳ Préparation…") : enCours ? tr("⏳ Ouverture…") : tr("📲 Installer ma gestion interne")}
        </button>
        <p className="mt-2 text-xs text-gray-400">{tr("Votre application s'ouvre et propose l'installation : confirmez, c'est tout.")}</p>

        {/* Roue de secours : déjà installée, iPhone / Firefox, installation qui
            échoue, nouvel appareil — la gestion s'ouvre sans rien installer */}
        <button onClick={() => ouvrir(false)} disabled={!tenantCode || enCours}
          className="mt-4 w-full py-3.5 rounded-2xl text-sm font-bold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 disabled:opacity-60">
          {tr("📂 Ouvrir ma gestion")}
        </button>
        <p className="mt-1.5 text-xs text-gray-400">{tr("Déjà installée, ou installation impossible sur cet appareil ? Ouvrez-la directement.")}</p>

        <button onClick={partager}
          className="mt-5 w-full py-3.5 rounded-2xl text-sm font-bold border-2"
          style={{ borderColor: couleur, color: couleur }}>
          {copie ? tr("✅ Lien copié") : tr("🔗 Partager le lien à mes membres")}
        </button>

        {/* Lien de l'application de gestion elle-même : vos employés l'installent,
            puis n'ont que les droits que vous leur donnez (Employés) */}
        <div className="mt-3">
          <BoutonLienAppGestion accountId={account.id} type={account.type} tenantCode={tenantCode}
            className="w-full py-3 rounded-2xl text-sm font-bold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100" />
          <p className="mt-1.5 text-xs text-gray-400">{tr("Pour vos employés : ils installent l'application et n'ont que les droits que vous leur donnez dans « Employés ».")}</p>
        </div>

      </div>
      <button onClick={() => navigate("/")} className="mt-6 text-sm text-gray-500">{tr("← Retour à Moftal")}</button>
    </div>
  );
}
