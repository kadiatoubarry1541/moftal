import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { config } from "../config/api";
import LogoEtablissement from "../components/LogoEtablissement";
import { getTypeInfo } from "../components/EspaceProModals";
import { demanderCodeOuverture } from "../utils/codeOuverture";
import { DOMAINE_GESTION } from "../utils/lienAppGestion";

// Invitation d'un employé par son responsable : il choisit son mot de passe
// (s'il n'avait pas de compte) ou se connecte, puis ouvre l'application de
// l'établissement pour l'installer. Il n'y a que les droits donnés par le pro.
type Invitation = {
  choisirMotDePasse: boolean;
  identifiant: string;
  etablissement: { tenantCode: string; name: string; type: string; logo: string | null };
  poste: string | null;
  niveau: "complet" | "limite";
};

export default function RejoindreEquipe() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [inv, setInv] = useState<Invitation | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [voir, setVoir] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const connecte = !!localStorage.getItem("token");

  useEffect(() => {
    fetch(`${config.API_BASE_URL}/invitations-pro/equipe/${encodeURIComponent(token)}`)
      .then(async r => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.success) setErreur(d.message || "Lien d'invitation invalide.");
        else setInv(d);
      })
      .catch(() => setErreur("Erreur de connexion. Vérifiez internet puis réessayez."))
      .finally(() => setChargement(false));
  }, [token]);

  const seConnecter = () => navigate(`/login?redirect=${encodeURIComponent(`/rejoindre-equipe/${token}`)}`);

  // L'application de l'établissement, déjà connectée, qui propose l'installation
  const ouvrirApplication = async (tenantCode: string, type: string) => {
    const chemin = `/${getTypeInfo(type).path}/${tenantCode}`;
    if (window.location.hostname === "moftal.com" || window.location.hostname === "www.moftal.com") {
      const code = await demanderCodeOuverture();
      window.location.href = `https://${DOMAINE_GESTION}${chemin}?installer=1${code ? `&_c=${encodeURIComponent(code)}` : ""}`;
    } else {
      navigate(`${chemin}?installer=1`, { replace: true });
    }
  };

  const accepter = async () => {
    if (!inv) return;
    setErreur("");
    if (inv.choisirMotDePasse) {
      if (password.length < 6) { setErreur("Le mot de passe doit contenir au moins 6 caractères."); return; }
      if (password !== confirm) { setErreur("Les mots de passe ne correspondent pas."); return; }
    }
    setEnvoi(true);
    try {
      const jeton = localStorage.getItem("token");
      const r = await fetch(`${config.API_BASE_URL}/invitations-pro/equipe/${encodeURIComponent(token)}/accepter`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(!inv.choisirMotDePasse && jeton ? { Authorization: `Bearer ${jeton}` } : {}) },
        body: JSON.stringify(inv.choisirMotDePasse ? { password } : {}),
      });
      const d = await r.json().catch(() => ({}));
      if (d.doitSeConnecter) { seConnecter(); return; }
      if (!r.ok || !d.success) { setErreur(d.message || "L'invitation n'a pas pu être acceptée."); return; }
      localStorage.setItem("token", d.token);
      localStorage.setItem("session_user", JSON.stringify({ numeroH: d.user.numeroH, userData: d.user, token: d.token, type: "vivant", source: "invitation_equipe" }));
      window.dispatchEvent(new Event("session-updated"));
      await ouvrirApplication(d.etablissement.tenantCode, d.etablissement.type);
    } catch {
      setErreur("Erreur de connexion. Vérifiez internet puis réessayez.");
    } finally {
      setEnvoi(false);
    }
  };

  const champ = "w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500";
  if (chargement) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 pt-10 pb-16">
      <div className="w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        {!inv ? (
          <div className="text-center">
            <p className="text-4xl mb-3">🔗</p>
            <p className="text-gray-800 font-semibold">{erreur}</p>
            <button onClick={() => navigate("/login")} className="mt-5 w-full py-3 rounded-2xl bg-emerald-600 text-white font-bold">Se connecter</button>
          </div>
        ) : (
          <>
            <div className="w-24 h-24 mx-auto rounded-3xl overflow-hidden border border-gray-200 bg-white">
              <LogoEtablissement src={inv.etablissement.logo} name={inv.etablissement.name} type={inv.etablissement.type} fontSize={40} />
            </div>
            <h1 className="mt-4 text-xl font-extrabold text-gray-900 text-center">{inv.etablissement.name}</h1>
            <p className="mt-1 text-sm text-gray-500 text-center">
              Vous êtes invité(e) dans l'équipe{inv.poste ? ` comme ${inv.poste}` : ""}. Accès {inv.niveau === "complet" ? "complet" : "limité"}, donné par votre responsable.
            </p>

            <div className="mt-6 space-y-4">
              {inv.choisirMotDePasse ? (
                <>
                  <div className="text-sm text-gray-600">Vous vous connecterez avec : <b>{inv.identifiant}</b></div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">🔒 Choisissez votre mot de passe</label>
                    <div className="flex gap-2">
                      <input type={voir ? "text" : "password"} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Au moins 6 caractères" className={champ} />
                      <button type="button" onClick={() => setVoir(v => !v)} aria-label={voir ? "Masquer" : "Afficher"} className="px-3 rounded-xl border border-gray-300 bg-white text-lg">{voir ? "🙈" : "👁️"}</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">🔒 Confirmez le mot de passe</label>
                    <input type={voir ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Retapez le mot de passe" className={champ} />
                  </div>
                </>
              ) : !connecte ? (
                <div className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
                  Connectez-vous avec votre téléphone ou votre e-mail et votre mot de passe.
                  <button onClick={seConnecter} className="mt-3 w-full py-3 rounded-xl bg-emerald-600 text-white font-bold">Se connecter</button>
                </div>
              ) : null}

              {erreur && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">{erreur}</p>}

              {(inv.choisirMotDePasse || connecte) && (
                <button onClick={accepter} disabled={envoi} className="w-full py-4 rounded-2xl bg-emerald-600 text-white text-base font-extrabold disabled:opacity-60">
                  {envoi ? "⏳ Un instant…" : "📲 Rejoindre et installer l'application"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
