import { useState } from "react";
import { envoyerGestion } from "../utils/envoyerGestion";

// Fenêtre « Modifier » commune aux gestions internes : reprend la fiche,
// laisse corriger chaque champ modifiable et l'enregistre sur le serveur
// (PUT). En cas d'échec, envoyerGestion prévient et rien n'est changé à l'écran.

const LIBELLES: Record<string, string> = {
  nom: "Nom", prenom: "Prénom", telephone: "Téléphone", numero_h: "Numéro Moftal", role: "Rôle",
  competence: "Compétence", titre: "Titre", description: "Description", statut: "Statut",
  date_debut: "Date de début", date_fin: "Date de fin", budget: "Budget (GNF)", donateur_nom: "Donateur",
  montant: "Montant (GNF)", type_don: "Type de don", date_don: "Date du don", contenu: "Contenu", type: "Type",
  specialite: "Spécialité", categorie: "Catégorie", date_pub: "Date de publication", email: "Email",
  type_abo: "Type d'abonnement", poste: "Poste", departement: "Département", adresse: "Adresse",
  secteur: "Secteur", client_nom: "Client", domaine: "Domaine", institution: "Institution",
  auteur_nom: "Auteur", type_pub: "Type de publication", resume: "Résumé", responsable: "Responsable",
  prix_gros: "Prix de gros (GNF)", prix_detail: "Prix de détail (GNF)", stock: "Stock", unite: "Unité",
  type_client: "Type de client", montant_total: "Montant total (GNF)", date_commande: "Date de commande",
  notes: "Notes", grade: "Grade", zone: "Zone", agent_nom: "Agent", lieu: "Lieu", type_contrat: "Type de contrat",
  membre_nom: "Membre", type_cot: "Type de cotisation", periode: "Période", date_paiement: "Date de paiement",
  niveau_coran: "Niveau (Coran)", telephone_parent: "Téléphone du parent", rang: "Rang", sourate: "Sourate",
  date_pred: "Date", type_pred: "Type", imam_nom: "Imam", mosquee: "Mosquée", nom_mosquee: "Mosquée",
  ville: "Ville", reporter_nom: "Journaliste",
};

function typeChamp(c: string): "number" | "date" | "textarea" | "text" {
  if (c.startsWith("date")) return "date";
  if (/^(montant|budget|prix|stock|rang)/.test(c)) return "number";
  if (/^(contenu|description|resume|notes)$/.test(c)) return "textarea";
  return "text";
}

export default function ModifierFiche({ titre, url, item, colonnes, couleur = "#1a8f1a", onClose, onSaved }: {
  titre: string;
  url: string;
  item: Record<string, any>;
  colonnes: string[];
  couleur?: string;
  onClose: () => void;
  onSaved: (item: Record<string, any>) => void;
}) {
  // Le statut se change avec son propre sélecteur (valeurs fixes) : pas ici.
  const champs = colonnes.filter(c => !c.endsWith("_id") && c !== "est_paye" && c !== "statut");
  const [form, setForm] = useState<Record<string, any>>(() =>
    Object.fromEntries(champs.map(c => {
      const v = item[c];
      return [c, typeChamp(c) === "date" && v ? String(v).slice(0, 10) : v ?? ""];
    })));
  const [saving, setSaving] = useState(false);

  const enregistrer = async () => {
    setSaving(true);
    const token = localStorage.getItem("token");
    const ok = await envoyerGestion(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (ok) { onSaved({ ...item, ...form }); onClose(); }
  };

  const inp = { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" as const };
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10050, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "white", borderRadius: 14, padding: 22, width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto" }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 800, color: "#0f172a" }}>✏️ {titre}</h3>
        {champs.map(c => (
          <label key={c} style={{ display: "block", marginBottom: 10 }}>
            <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>{LIBELLES[c] || c}</span>
            {typeChamp(c) === "textarea" ? (
              <textarea value={form[c]} onChange={e => setForm(f => ({ ...f, [c]: e.target.value }))} rows={3} style={{ ...inp, resize: "vertical" }} />
            ) : (
              <input type={typeChamp(c)} value={form[c]} onChange={e => setForm(f => ({ ...f, [c]: e.target.value }))} style={inp} />
            )}
          </label>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, background: "#f1f5f9", color: "#334155", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>Annuler</button>
          <button onClick={enregistrer} disabled={saving} style={{ flex: 1, padding: 11, background: couleur, color: "white", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
