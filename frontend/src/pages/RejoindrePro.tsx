import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { config } from "../config/api";
import LogoEtablissement from "../components/LogoEtablissement";
import { normaliserLogo } from "../utils/logoImage";

// Invitation envoyée par Moftal à un pro : il choisit son mot de passe (ou se
// connecte s'il a déjà un compte), ajoute son logo, puis arrive dans son espace
// pro pour installer sa gestion. Tout est enregistré sur le serveur.
type Invitation = {
  choisirMotDePasse: boolean;
  account: { id: string; name: string; type: string; photo: string | null; planType: string; phone: string; email: string };
};

export default function RejoindrePro() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [inv, setInv] = useState<Invitation | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [voir, setVoir] = useState(false);
  const [logo, setLogo] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const connecte = !!localStorage.getItem("token");

  useEffect(() => {
    fetch(`${config.API_BASE_URL}/invitations-pro/${encodeURIComponent(token)}`)
      .then(async r => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.success) setErreur(d.message || "Lien d'invitation invalide.");
        else setInv(d);
      })
      .catch(() => setErreur("Erreur de connexion. Vérifiez internet puis réessayez."))
      .finally(() => setChargement(false));
  }, [token]);

  const seConnecter = () => navigate(`/login?redirect=${encodeURIComponent(`/rejoindre-pro/${token}`)}`);

  const accepter = async () => {
    if (!inv) return;
    setErreur("");
    if (inv.choisirMotDePasse) {
      if (password.length < 6) { setErreur("Le mot de passe doit contenir au moins 6 caractères."); return; }
      if (password !== confirm) { setErreur("Les mots de passe ne correspondent pas."); return; }
    }
    if (!inv.account.photo && !logo) { setErreur("Ajoutez le logo de votre établissement."); return; }
    setEnvoi(true);
    try {
      const jeton = localStorage.getItem("token");
      const r = await fetch(`${config.API_BASE_URL}/invitations-pro/${encodeURIComponent(token)}/accepter`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(!inv.choisirMotDePasse && jeton ? { Authorization: `Bearer ${jeton}` } : {}) },
        body: JSON.stringify({ ...(inv.choisirMotDePasse ? { password } : {}), ...(logo ? { photo: logo } : {}) }),
      });
      const d = await r.json().catch(() => ({}));
      if (d.doitSeConnecter) { seConnecter(); return; }
      if (!r.ok || !d.success) { setErreur(d.message || "L'invitation n'a pas pu être acceptée."); return; }
      localStorage.setItem("token", d.token);
      localStorage.setItem("session_user", JSON.stringify({ numeroH: d.user.numeroH, userData: d.user, token: d.token, type: "vivant", source: "invitation_pro" }));
      window.dispatchEvent(new Event("session-updated"));
      // Espace pro : formule complète → « Installer ma gestion »
      navigate(`/espace-pro/${d.accountId}`, { replace: true });
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
              {logo || inv.account.photo
                ? <img src={logo || inv.account.photo || ""} alt="" className="w-full h-full object-contain" />
                : <LogoEtablissement src={null} name={inv.account.name} type={inv.account.type} fontSize={40} />}
            </div>
            <h1 className="mt-4 text-xl font-extrabold text-gray-900 text-center">{inv.account.name}</h1>
            <p className="mt-1 text-sm text-gray-500 text-center">Votre espace professionnel est prêt. Encore une étape et votre application est à vous.</p>

            <div className="mt-6 space-y-4">
              {inv.choisirMotDePasse ? (
                <>
                  <div className="text-sm text-gray-600">
                    Vous vous connecterez avec : <b>{inv.account.phone || inv.account.email}</b>
                  </div>
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
                  Ce téléphone / e-mail a déjà un compte Moftal. Connectez-vous avec, puis revenez accepter l'invitation.
                  <button onClick={seConnecter} className="mt-3 w-full py-3 rounded-xl bg-emerald-600 text-white font-bold">Se connecter</button>
                </div>
              ) : null}

              {!inv.account.photo && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">🖼️ Logo de votre établissement *</label>
                  <label className="inline-flex items-center px-4 py-2.5 rounded-xl border-2 border-emerald-600 text-emerald-700 font-bold text-sm cursor-pointer">
                    {logo ? "Changer le logo" : "Choisir le logo"}
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const f = e.target.files?.[0]; e.target.value = "";
                      if (f) normaliserLogo(f).then(setLogo).catch(err => setErreur(err.message));
                    }} />
                  </label>
                  <p className="text-xs text-gray-400 mt-1">Il apparaîtra sur votre application, votre site et vos reçus.</p>
                </div>
              )}

              {erreur && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">{erreur}</p>}

              {(inv.choisirMotDePasse || connecte) && (
                <button onClick={accepter} disabled={envoi}
                  className="w-full py-4 rounded-2xl bg-emerald-600 text-white text-base font-extrabold disabled:opacity-60">
                  {envoi ? "⏳ Un instant…" : "✅ Activer mon espace"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
