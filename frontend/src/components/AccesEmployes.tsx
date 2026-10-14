import { useEffect, useState } from "react";
import { envoyerGestion } from "../utils/envoyerGestion";
import EnvoiLien from "./EnvoiLien";
import { messageLienApplication } from "../utils/invitationPro";
import { lienAppGestionIci } from "../utils/lienAppGestion";

// « 👥 Employés » : le propriétaire donne accès à sa gestion à ses employés
// (téléphone, e-mail ou NuméroH) et choisit pour chacun :
// On lui envoie le lien de l'application : il se connecte avec ce téléphone /
// cet e-mail (la première fois il choisit son mot de passe) et n'a que ses droits.
//   - Tous les droits : exactement comme le propriétaire (directeur + proviseur, associés) ;
//   - Complet : tout, sauf les paramètres et les accès ;
//   - Limité  : voir, ajouter, changer un statut — sans modifier ni supprimer.
// Les règles sont appliquées par le serveur (utils/accesEmployes.js).

type Employe = { id: number; numero_h: string; nom: string | null; poste: string | null; niveau: "total" | "complet" | "limite"; is_active: boolean; telephone?: string | null; email?: string | null };
type Invitation = { nom: string; telephone?: string | null; email?: string | null; nouveauCompte?: boolean };

const NIVEAUX = [
  { v: "limite", titre: "Limité", detail: "Voir, ajouter (ventes, patients, élèves…) et changer un statut. Ne peut ni modifier ni supprimer." },
  { v: "complet", titre: "Complet", detail: "Tout comme vous, sauf les paramètres de l'établissement et la gestion des employés." },
  { v: "total", titre: "Tous les droits (co-responsable)", detail: "Exactement comme vous : paramètres, logo et employés compris. Pour un directeur, un proviseur, un associé." },
] as const;

export default function AccesEmployes({ base, couleur = "#1a8f1a", nomEtablissement, onClose }: { base: string; couleur?: string; nomEtablissement?: string; onClose: () => void }) {
  const [employes, setEmployes] = useState<Employe[] | null>(null);
  const [erreur, setErreur] = useState("");
  const [form, setForm] = useState({ numero_h: "", poste: "", niveau: "limite" });
  const [envoi, setEnvoi] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const lienApp = lienAppGestionIci() || window.location.href;
  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

  const charger = () =>
    fetch(`${base}/acces-employes`, { headers: headers() })
      .then(r => r.json())
      .then(d => { if (d.success) setEmployes(d.employes || []); else setErreur(d.message || "Liste indisponible."); })
      .catch(() => setErreur("Connexion impossible : la liste n'a pas pu être chargée."));

  useEffect(() => { charger(); }, [base]); // eslint-disable-line react-hooks/exhaustive-deps

  const ajouter = async () => {
    if (!form.numero_h.trim()) { alert("Saisissez le téléphone, l'e-mail ou le NuméroH de l'employé."); return; }
    setEnvoi(true);
    try {
      const identifiant = form.numero_h.trim();
      const r = await fetch(`${base}/acces-employes`, { method: "POST", headers: headers(), body: JSON.stringify({ identifiant, poste: form.poste, niveau: form.niveau }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) { alert(d.message || "L'employé n'a pas été ajouté. Réessayez."); return; }
      setForm({ numero_h: "", poste: "", niveau: "limite" });
      // Le lien de l'application, à lui envoyer tout de suite
      const estEmail = identifiant.includes("@");
      setInvitation({ nom: d.employe.nom || identifiant, nouveauCompte: d.nouveauCompte,
        telephone: estEmail || /[a-z]/i.test(identifiant) ? (d.employe.telephone || null) : identifiant, email: estEmail ? identifiant : null });
      charger();
    } catch {
      alert("Erreur de connexion : rien n'a été enregistré. Vérifiez votre connexion et réessayez.");
    } finally {
      setEnvoi(false);
    }
  };
  const envoyerLien = (e: Employe) => setInvitation({ nom: e.nom || e.numero_h, telephone: e.telephone, email: e.email });
  const changerNiveau = async (e: Employe, niveau: string) => {
    if (await envoyerGestion(`${base}/acces-employes/${e.id}`, { method: "PUT", headers: headers(), body: JSON.stringify({ niveau }) })) charger();
  };
  const retirer = async (e: Employe) => {
    if (!confirm(`Retirer l'accès de ${e.nom || e.numero_h} ? Il ne pourra plus entrer dans votre gestion.`)) return;
    if (await envoyerGestion(`${base}/acces-employes/${e.id}`, { method: "DELETE", headers: headers() })) charger();
  };

  const inp = { width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" as const };
  return (
    <div onClick={ev => { if (ev.target === ev.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10050, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "white", borderRadius: 16, padding: 20, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800 }}>👥 Accès des employés</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}>Vos employés entrent dans cette gestion avec leur propre compte Moftal. Vous choisissez ce que chacun peut faire, et vous pouvez retirer l'accès à tout moment.</p>

        {invitation && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#166534" }}>✅ Envoyez ce lien à {invitation.nom}</div>
            <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>
              {invitation.nouveauCompte
                ? "Il ouvre le lien, se connecte avec ce téléphone / cet e-mail et choisit son mot de passe la première fois. Il n'a que les droits donnés ici."
                : "Il ouvre le lien et se connecte avec son téléphone / e-mail et son mot de passe habituel. Il n'a que les droits donnés ici."}
            </div>
            <EnvoiLien lien={lienApp} message={messageLienApplication(nomEtablissement || "notre établissement", lienApp)}
              telephone={invitation.telephone} email={invitation.email} sujet={`Application — ${nomEtablissement || "Moftal"}`} />
            <button onClick={() => setInvitation(null)} style={{ marginTop: 10, background: "none", border: "none", color: "#64748b", fontSize: 12, cursor: "pointer" }}>Masquer</button>
          </div>
        )}

        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Ajouter un employé</div>
          <input value={form.numero_h} onChange={e => setForm(f => ({ ...f, numero_h: e.target.value }))} placeholder="Téléphone, e-mail ou NuméroH de l'employé" inputMode="email" autoCapitalize="none" style={{ ...inp, marginBottom: 4 }} />
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>Pas encore de compte Moftal ? Mettez son téléphone ou son e-mail : il choisira son mot de passe à sa première connexion.</div>
          <input value={form.poste} onChange={e => setForm(f => ({ ...f, poste: e.target.value }))} placeholder="Poste (ex. Caissier, Secrétaire, Infirmier)" style={{ ...inp, marginBottom: 10 }} />
          {NIVEAUX.map(n => (
            <label key={n.v} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", marginBottom: 6, borderRadius: 8, cursor: "pointer", border: `1.5px solid ${form.niveau === n.v ? couleur : "#e2e8f0"}`, background: "white" }}>
              <input type="radio" name="niveau" checked={form.niveau === n.v} onChange={() => setForm(f => ({ ...f, niveau: n.v }))} style={{ marginTop: 3 }} />
              <span><b style={{ fontSize: 14 }}>{n.titre}</b><br /><span style={{ fontSize: 12, color: "#64748b" }}>{n.detail}</span></span>
            </label>
          ))}
          <button onClick={ajouter} disabled={envoi} style={{ width: "100%", marginTop: 6, padding: 11, background: couleur, color: "white", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", opacity: envoi ? 0.7 : 1 }}>
            {envoi ? "Ajout…" : "Donner l'accès"}
          </button>
        </div>

        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Employés ayant accès</div>
        {erreur && <p style={{ color: "#dc2626", fontSize: 13 }}>{erreur}</p>}
        {!employes && !erreur && <p style={{ color: "#64748b", fontSize: 13 }}>Chargement…</p>}
        {employes && employes.length === 0 && <p style={{ color: "#94a3b8", fontSize: 13 }}>Aucun employé pour l'instant.</p>}
        {employes?.map(e => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 180px", minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{e.nom || e.numero_h}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{e.poste ? `${e.poste} · ` : ""}{e.numero_h}</div>
            </div>
            <select value={e.niveau} onChange={ev => changerNiveau(e, ev.target.value)} style={{ padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }}>
              <option value="limite">Limité</option>
              <option value="complet">Complet</option>
              <option value="total">Tous les droits</option>
            </select>
            <button onClick={() => envoyerLien(e)} style={{ padding: "6px 10px", background: "white", color: couleur, border: `1px solid ${couleur}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🔗 Lien</button>
            <button onClick={() => retirer(e)} style={{ padding: "6px 10px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Retirer</button>
          </div>
        ))}

        <button onClick={onClose} style={{ width: "100%", marginTop: 16, padding: 11, background: "#f1f5f9", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>Fermer</button>
      </div>
    </div>
  );
}
