import { useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { config } from "../config/api";
import { useTraduction } from "../i18n/traduction";

const API = (config.API_BASE_URL || "http://localhost:7777/api").replace(/\/api\/?$/, "");

// « Nous écrire » sur le site d'un établissement : le message est enregistré en
// base et arrive directement dans sa gestion (Espace Pro → Messages du site),
// avec une notification au responsable. Si l'envoi échoue, on le dit.
export default function EcrireAuSite({ tenantCode, nomEtablissement, couleur, objet, messageInitial = "", style, children }: {
  tenantCode: string;
  nomEtablissement?: string;
  couleur: string;
  /** Sujet vu par l'établissement : « Demande de devis », « Commande »… */
  objet: string;
  messageInitial?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { tr } = useTraduction();
  const [ouvert, setOuvert] = useState(false);
  const [form, setForm] = useState({ nom: "", telephone: "", message: "" });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [envoye, setEnvoye] = useState(false);

  const ouvrir = () => {
    setForm(f => ({ ...f, message: messageInitial || f.message }));
    setErreur(""); setEnvoye(false); setOuvert(true);
  };

  const envoyer = async () => {
    if (envoi) return;
    if (!form.nom.trim() || form.telephone.replace(/\D/g, "").length < 8) { setErreur(tr("Indiquez votre nom et votre numéro de téléphone.")); return; }
    if (!form.message.trim()) { setErreur(tr("Écrivez votre message.")); return; }
    setEnvoi(true); setErreur("");
    try {
      const r = await fetch(`${API}/api/pro-public/demande/${encodeURIComponent(tenantCode)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, objet }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) { setErreur(tr(d.message || "Le message n'a pas été envoyé. Réessayez.")); return; }
      setEnvoye(true);
      setForm(f => ({ ...f, message: "" }));
    } catch {
      setErreur(tr("Pas de connexion : le message n'a pas été envoyé. Vérifiez internet puis réessayez."));
    } finally { setEnvoi(false); }
  };

  const champ: CSSProperties = { padding: 12, border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

  return (
    <>
      <button type="button" onClick={ouvrir} style={style}>{children}</button>
      {/* Fenêtre posée sur la page entière (jamais coincée dans un panneau) */}
      {ouvert && createPortal(
        <div onClick={e => { if (e.target === e.currentTarget && !envoi) setOuvert(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "white", width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", borderRadius: "20px 20px 0 0", padding: "20px 18px 28px", boxSizing: "border-box", textAlign: "start", color: "#0f172a" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>✉️ {tr(objet)}</div>
                {nomEtablissement && <div style={{ fontSize: 13, color: "#64748b" }}>{nomEtablissement}</div>}
              </div>
              <button type="button" onClick={() => setOuvert(false)} disabled={envoi} aria-label={tr("Fermer")}
                style={{ border: "none", background: "#f1f5f9", borderRadius: 10, width: 36, height: 36, cursor: "pointer", fontSize: 18, flexShrink: 0 }}>✕</button>
            </div>
            {envoye ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ fontSize: 48 }}>✅</div>
                <p style={{ fontSize: 16, fontWeight: 800, margin: "8px 0" }}>{nomEtablissement ? tr("Message envoyé à {nom}", { nom: nomEtablissement }) : tr("Message envoyé")}</p>
                <p style={{ fontSize: 14, color: "#475569", margin: "0 0 16px" }}>{tr("Vous serez recontacté(e) au {tel}.", { tel: form.telephone })}</p>
                <button type="button" onClick={() => setOuvert(false)}
                  style={{ width: "100%", padding: 14, background: couleur, color: "white", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>{tr("Fermer")}</button>
              </div>
            ) : (<>
              <div style={{ display: "grid", gap: 10 }}>
                <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder={tr("Votre nom *")} autoComplete="name" style={champ} />
                <input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} placeholder={tr("Votre téléphone *")} type="tel" autoComplete="tel" style={champ} />
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={5} placeholder={tr("Votre message *")} style={{ ...champ, resize: "vertical" }} />
              </div>
              {erreur && <p style={{ color: "#b91c1c", fontSize: 13, fontWeight: 600, margin: "12px 0 0" }}>{erreur}</p>}
              <button type="button" onClick={envoyer} disabled={envoi}
                style={{ width: "100%", marginTop: 14, padding: 14, background: couleur, color: "white", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: "pointer", opacity: envoi ? 0.6 : 1 }}>
                {envoi ? tr("⏳ Envoi…") : tr("Envoyer")}
              </button>
            </>)}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
