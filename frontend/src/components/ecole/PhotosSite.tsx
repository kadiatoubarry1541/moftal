import { useCallback, useEffect, useState } from "react";
import { config } from "../../config/api";
import { getPhotoUrl } from "../../utils/auth";
import { compressImage } from "../../utils/compressImage";
import { useTraduction } from "../../i18n/traduction";

// Gestion de l'école → « Photos du site » : le responsable ajoute les photos qui
// valorisent l'établissement sur son site (locaux, vie scolaire, événements…).
// Tout est enregistré sur le serveur ; une photo peut servir de couverture.

export interface PhotoSite { id: number; image_url: string; legende?: string | null; categorie?: string | null; est_couverture?: boolean }

// Rubriques proposées : celles d'une école, ou celles de tous les établissements
const CATEGORIES_ECOLE = ["Nos locaux", "Vie scolaire", "Activités", "Événements", "Résultats", "Autre"];
const CATEGORIES_PRO = ["Nos locaux", "Nos produits", "Nos services", "Nos réalisations", "Notre équipe", "Événements", "Autre"];
const jeton = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}`, "Content-Type": "application/json" });

const lireImage = (f: File) => new Promise<string>((ok, ko) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result));
  r.onerror = ko;
  r.readAsDataURL(f);
});

export default function PhotosSite({ tenantCode, apiName, couleur, lienSite, ecole = true }: { tenantCode: string; apiName: string; couleur: string; lienSite?: string; ecole?: boolean }) {
  const { tr } = useTraduction();
  const CATEGORIES = ecole ? CATEGORIES_ECOLE : CATEGORIES_PRO;
  const base = `${config.API_BASE_URL}/${apiName}/${encodeURIComponent(tenantCode)}/photos-site`;
  const [photos, setPhotos] = useState<PhotoSite[] | null>(null);
  const [erreur, setErreur] = useState("");
  const [legende, setLegende] = useState("");
  const [categorie, setCategorie] = useState(ecole ? "Vie scolaire" : "Nos produits");
  const [envoi, setEnvoi] = useState<string>("");

  const charger = useCallback(() => {
    fetch(base, { headers: jeton() })
      .then(async r => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .then(({ ok, d }) => { if (ok && d.success) { setPhotos(d.photos); setErreur(""); } else setErreur(d.message || "Impossible de charger les photos."); })
      .catch(() => setErreur("Erreur de connexion. Réessayez."));
  }, [base]);
  useEffect(() => { charger(); }, [charger]);

  const ajouter = async (fichiers: FileList | null) => {
    if (!fichiers?.length) return;
    setErreur("");
    const liste = Array.from(fichiers);
    for (let i = 0; i < liste.length; i++) {
      setEnvoi(tr("Envoi de la photo {n} sur {total}…", { n: i + 1, total: liste.length }));
      try {
        const image = await lireImage(await compressImage(liste[i], 1600, 0.82));
        const r = await fetch(base, { method: "POST", headers: jeton(), body: JSON.stringify({ image, legende, categorie, couverture: !photos?.length && i === 0 }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.success) { setErreur(d.message || "La photo n'a pas été enregistrée."); break; }
      } catch { setErreur("Cette photo n'a pas pu être lue. Essayez une autre image."); break; }
    }
    setEnvoi(""); setLegende("");
    charger();
  };

  const modifier = async (p: PhotoSite, champs: Partial<{ legende: string; categorie: string; couverture: boolean }>) => {
    const r = await fetch(`${base}/${p.id}`, { method: "PUT", headers: jeton(), body: JSON.stringify(champs) }).catch((): null => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok || !d.success) setErreur(d.message || "Modification non enregistrée.");
    charger();
  };

  const supprimer = async (p: PhotoSite) => {
    if (!confirm(tr("Retirer cette photo du site ?"))) return;
    const r = await fetch(`${base}/${p.id}`, { method: "DELETE", headers: jeton() }).catch((): null => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok || !d.success) setErreur(d.message || "Suppression impossible.");
    charger();
  };

  const champ = { border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 10px", fontSize: 13, background: "white" } as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 16 }}>
        <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{tr("📸 Ajouter des photos à votre site")}</p>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>{ecole
          ? tr("Les images parlent mieux : montrez vos locaux, vos apprenants en activité, vos fêtes et vos résultats. Elles apparaissent sur votre site, visible par tout le monde.")
          : tr("Les images parlent mieux que les mots : montrez vos produits, vos services, vos réalisations et vos locaux. Elles apparaissent sur votre site, visible par tout le monde.")}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={legende} onChange={e => setLegende(e.target.value)} placeholder={tr("Légende (facultatif) — ex. Remise des prix 2026")} style={{ ...champ, flex: "1 1 220px" }} maxLength={255} />
          <select value={categorie} onChange={e => setCategorie(e.target.value)} style={{ ...champ, flex: "0 1 160px" }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{tr(c)}</option>)}
          </select>
          <label style={{ flex: "0 0 auto", background: couleur, color: "white", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: envoi ? "wait" : "pointer", opacity: envoi ? 0.7 : 1 }}>
            {envoi || tr("＋ Choisir des photos")}
            <input type="file" accept="image/*" multiple hidden disabled={!!envoi} onChange={e => { const f = e.target.files; e.target.value = ""; void ajouter(f); }} />
          </label>
        </div>
        {lienSite && <a href={lienSite} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: couleur, fontWeight: 600 }}>{tr("🌐 Voir mon site")}</a>}
      </div>

      {erreur && <p style={{ margin: 0, fontSize: 13, color: "#b91c1c", background: "#fef2f2", borderRadius: 8, padding: "10px 12px" }}>{tr(erreur)}</p>}
      {photos === null && !erreur && <p style={{ fontSize: 13, color: "#64748b" }}>{tr("Chargement…")}</p>}
      {photos?.length === 0 && (
        <div style={{ background: "white", borderRadius: 12, border: "1px dashed #cbd5e1", padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          {tr("Aucune photo pour le moment. La première ajoutée devient la photo de couverture du site.")}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {photos?.map(p => (
          <div key={p.id} style={{ background: "white", borderRadius: 12, border: `1.5px solid ${p.est_couverture ? couleur : "#e2e8f0"}`, overflow: "hidden" }}>
            <div style={{ position: "relative", aspectRatio: "4 / 3", background: "#f1f5f9" }}>
              <img src={getPhotoUrl(p.image_url) || ""} alt={p.legende || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              {p.est_couverture && <span style={{ position: "absolute", top: 8, insetInlineStart: 8, background: couleur, color: "white", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "3px 8px" }}>{tr("⭐ Couverture")}</span>}
            </div>
            <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <input defaultValue={p.legende || ""} placeholder={tr("Légende")} maxLength={255}
                onBlur={e => { if (e.target.value !== (p.legende || "")) void modifier(p, { legende: e.target.value }); }} style={{ ...champ, padding: "6px 8px", fontSize: 12 }} />
              <select value={p.categorie || "Autre"} onChange={e => void modifier(p, { categorie: e.target.value })} style={{ ...champ, padding: "6px 8px", fontSize: 12 }}>
                {(CATEGORIES.includes(p.categorie || "Autre") ? CATEGORIES : [p.categorie as string, ...CATEGORIES]).map(c => <option key={c} value={c}>{tr(c)}</option>)}
              </select>
              <div style={{ display: "flex", gap: 6 }}>
                {!p.est_couverture && (
                  <button onClick={() => void modifier(p, { couverture: true })} style={{ flex: 1, background: `${couleur}14`, color: couleur, border: "none", borderRadius: 8, padding: "7px 6px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{tr("⭐ Mettre en couverture")}</button>
                )}
                <button onClick={() => void supprimer(p)} style={{ flex: p.est_couverture ? 1 : "0 0 auto", background: "#fef2f2", color: "#ef4444", border: "none", borderRadius: 8, padding: "7px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{tr("Retirer")}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
