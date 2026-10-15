import { useEffect, useRef, useState } from "react";
import { useTraduction } from "../i18n/traduction";
import { sauvegardeAJour, type Sauvegarde } from "../hooks/useSauvegarde";

// Sauvegarde de l'établissement dans un fichier sur l'appareil (voir
// utils/fichierSauvegarde.ts) : écrite toute seule, relue à chaque retour de
// la connexion, et proposée à l'ouverture tant qu'aucun fichier n'est choisi.

const quand = (ts: number | undefined, tr: (k: string, v?: Record<string, string | number>) => string) => {
  if (!ts) return tr("jamais");
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return tr("à l'instant");
  if (min < 60) return tr("il y a {n} min", { n: min });
  const h = Math.round(min / 60);
  if (h < 48) return tr("il y a {n} h", { n: h });
  return new Date(ts).toLocaleDateString();
};

/** Bandeau en haut de la gestion tant que la sauvegarde n'est pas à jour. */
export function BandeauSauvegarde({ s, couleur, ouvrir }: { s: Sauvegarde; couleur: string; ouvrir: () => void }) {
  const { tr } = useTraduction();
  if (!s.pret || sauvegardeAJour(s)) return null;
  const enAttente = s.status?.pending || 0;
  const texte = s.automatique && s.etat.handle && s.autorisation !== "granted"
    ? tr("Autorisez Moftal à mettre à jour votre fichier « {nom} ».", { nom: s.etat.nomFichier || s.nomPropose })
    : enAttente > 0
      ? tr("{n} enregistrement(s) seulement sur cet appareil : enregistrez la sauvegarde de l'école dans votre fichier.", { n: enAttente })
      : tr("Créez le fichier de sauvegarde de l'établissement sur cet appareil : vous pourrez travailler sans connexion sans rien perdre.");
  return (
    <div style={{ background: "#fffbeb", borderBottom: "1px solid #fde68a", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flexShrink: 0 }}>
      <span style={{ fontSize: 18 }}>💾</span>
      <span style={{ flex: 1, minWidth: 200, fontSize: 13, color: "#78350f" }}>{texte}</span>
      <button disabled={s.occupe} onClick={() => { void (s.automatique && s.etat.handle && s.autorisation !== "granted" ? s.autoriser() : s.enregistrer()); }}
        style={{ padding: "7px 14px", background: couleur, color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
        💾 {s.automatique && s.etat.handle && s.autorisation !== "granted" ? tr("Autoriser") : tr("Sauvegarder l'école")}
      </button>
      <button onClick={ouvrir} style={{ padding: "7px 10px", background: "transparent", color: "#92400e", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>{tr("Détails")}</button>
    </div>
  );
}

/** Page « Sauvegarde » de la gestion. */
export function PanneauSauvegarde({ s, couleur }: { s: Sauvegarde; couleur: string }) {
  const { tr } = useTraduction();
  const entree = useRef<HTMLInputElement>(null);
  const enAttente = s.status?.pending || 0;
  const carte = { background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" } as const;
  const bouton = (principal: boolean) => ({ padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", border: principal ? "none" : `1px solid ${couleur}`, background: principal ? couleur : "white", color: principal ? "white" : couleur }) as const;

  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={carte}>
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>💾 {tr("Fichier de sauvegarde")}</h3>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
          {tr("Toute la gestion (élèves, personnel, classes, présences, notes, frais, bulletins…) et ce qui est fait sans connexion sont enregistrés dans un seul fichier sur cet appareil. Dès que la connexion revient, son contenu est récupéré et envoyé au serveur automatiquement, sans doublon.")}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10, marginBottom: 14 }}>
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{tr("Fichier")}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", wordBreak: "break-all" }}>{s.etat.nomFichier || s.nomPropose}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              {s.automatique
                ? s.etat.handle ? (s.autorisation === "granted" ? tr("Mis à jour tout seul · {quand}", { quand: quand(s.etat.derniereEcriture, tr) }) : tr("En attente de votre autorisation")) : tr("Pas encore créé")
                : tr("Dernier enregistrement : {quand}", { quand: quand(s.etat.dernierTelechargement, tr) })}
            </div>
          </div>
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{tr("Copie automatique sur l'appareil")}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{quand(s.etat.derniereCopieAuto, tr)}</div>
          </div>
          <div style={{ background: enAttente ? "#fffbeb" : "#f0fdf4", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{tr("En attente d'envoi au serveur")}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: enAttente ? "#b45309" : "#15803d" }}>
              {enAttente ? tr("{n} enregistrement(s)", { n: enAttente }) : tr("Tout est envoyé ✓")}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.status?.online === false ? tr("Hors connexion") : s.status?.syncing ? tr("Envoi en cours…") : tr("Connecté")}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {s.automatique && s.etat.handle && s.autorisation !== "granted" && (
            <button disabled={s.occupe} onClick={() => void s.autoriser()} style={bouton(true)}>{tr("Autoriser la mise à jour du fichier")}</button>
          )}
          <button disabled={s.occupe} onClick={() => void s.enregistrer()} style={bouton(!(s.automatique && s.etat.handle && s.autorisation !== "granted"))}>
            💾 {s.occupe ? tr("Enregistrement…") : tr("Sauvegarder l'école maintenant")}
          </button>
          {s.automatique && (
            <button disabled={s.occupe} onClick={() => void s.choisirEmplacement()} style={bouton(false)}>📁 {tr("Changer l'emplacement")}</button>
          )}
          <button disabled={s.occupe} onClick={() => entree.current?.click()} style={bouton(false)}>📂 {tr("Récupérer depuis un fichier")}</button>
          <input ref={entree} type="file" accept=".json,application/json" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void s.recupererFichier(f); }} />
        </div>
        {s.message && (
          <p style={{ margin: "12px 0 0", fontSize: 13, padding: "8px 12px", borderRadius: 8, background: s.message.ok ? "#f0fdf4" : "#fef2f2", color: s.message.ok ? "#15803d" : "#b91c1c" }}>{s.message.texte}</p>
        )}
      </div>

      <div style={carte}>
        <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{tr("Comment ça marche")}</h4>
        <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
          <li>{tr("Le nom proposé est « {nom} ». Vous pouvez garder l'emplacement proposé ou en choisir un autre.", { nom: s.nomPropose })}</li>
          {s.automatique
            ? <li>{tr("Sur cet appareil, le fichier est réécrit tout seul après chaque enregistrement, et relu à chaque retour de la connexion.")}</li>
            : <li>{tr("Sur ce téléphone, appuyez sur « Sauvegarder l'école maintenant » après avoir travaillé sans connexion. Une copie est aussi gardée toute seule dans l'application.")}</li>}
          <li>{tr("Nouvel appareil ou application effacée : « Récupérer depuis un fichier » remet les listes et renvoie au serveur ce qui n'avait pas été envoyé.")}</li>
          <li>{tr("Une même opération n'est jamais enregistrée deux fois sur le serveur, même si le fichier est récupéré plusieurs fois.")}</li>
        </ul>
        {s.automatique && s.etat.handle && (
          <button onClick={() => { if (confirm(tr("Ne plus mettre à jour ce fichier ? (le fichier reste sur l'appareil)"))) void s.oublier(); }}
            style={{ marginTop: 10, background: "none", border: "none", color: "#94a3b8", fontSize: 11, cursor: "pointer", textDecoration: "underline", padding: 0 }}>{tr("Ne plus utiliser ce fichier")}</button>
        )}
      </div>
    </div>
  );
}

/** Proposé à l'ouverture tant qu'aucun fichier de sauvegarde n'a été créé. */
export function ProposerSauvegarde({ s, couleur }: { s: Sauvegarde; couleur: string }) {
  const { tr } = useTraduction();
  const cle = `moftal-sauvegarde-proposee`;
  const [vu, setVu] = useState(() => { try { return sessionStorage.getItem(cle) === "1"; } catch { return false; } });
  const jamais = !s.etat.handle && !s.etat.dernierTelechargement;
  // Jamais par-dessus la fenêtre « Installer l'application » : on attend qu'elle soit fermée
  const [installationOuverte, setInstallationOuverte] = useState(true);
  useEffect(() => {
    const voir = () => setInstallationOuverte(!!document.querySelector("[data-fenetre-installation]"));
    const premiere = setTimeout(voir, 1200);
    const t = setInterval(voir, 700);
    return () => { clearTimeout(premiere); clearInterval(t); };
  }, []);
  if (!s.pret || vu || !jamais || installationOuverte) return null;
  const fermer = () => { try { sessionStorage.setItem(cle, "1"); } catch { /* navigation privée */ } setVu(true); };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "white", borderRadius: 16, padding: "24px 26px", width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ fontSize: 34, marginBottom: 6 }}>💾</div>
        <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{tr("Fichier de sauvegarde de l'établissement")}</h3>
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
          {tr("Pour travailler sans connexion sans rien perdre, toute la gestion est enregistrée dans un fichier sur cet appareil, puis envoyée au serveur dès que la connexion revient.")}
        </p>
        <p style={{ margin: "0 0 16px", fontSize: 12, color: "#64748b" }}>{tr("Fichier proposé : « {nom} » — vous pouvez changer l'emplacement.", { nom: s.nomPropose })}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { fermer(); void s.enregistrer(); }} style={{ flex: 1, padding: "10px 14px", background: couleur, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>💾 {tr("Créer le fichier")}</button>
          <button onClick={fermer} style={{ padding: "10px 14px", background: "#f1f5f9", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>{tr("Plus tard")}</button>
        </div>
      </div>
    </div>
  );
}
