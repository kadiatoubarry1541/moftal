import { useState } from "react";
import { compressImage } from "../utils/compressImage";
import { useTraduction } from "../i18n/traduction";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5002";

function lireFichier(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/**
 * Admin : placer une personne n'importe où dans l'arbre, sans limite.
 * On donne la personne déjà dans l'arbre (NuméroH), la position (son enfant,
 * son père / sa mère), puis la personne à placer : un compte Moftal (NuméroH)
 * ou un enfant sans compte (prénom, photo, date, pièce hôpital ou mairie).
 */
export default function PlacerDansArbreAdmin({ onDone }: { onDone?: () => void }) {
  const { tr } = useTraduction();
  const [ouvert, setOuvert] = useState(false);
  const [personne, setPersonne] = useState("");
  const [position, setPosition] = useState<"enfant" | "parent">("enfant");
  const [avecCompte, setAvecCompte] = useState(true);
  const [autre, setAutre] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nomFamille, setNomFamille] = useState("");
  const [genre, setGenre] = useState<"" | "HOMME" | "FEMME">("");
  const [estVivant, setEstVivant] = useState(true);
  const [dateNaissance, setDateNaissance] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [pieceType, setPieceType] = useState<"mairie" | "hopital">("mairie");
  const [numero, setNumero] = useState("");
  const [etablissement, setEtablissement] = useState("");
  const [annee, setAnnee] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  const sansCompte = position === "enfant" && !avecCompte;

  const envoyer = async () => {
    setMessage(null);
    if (!personne.trim()) return setMessage({ ok: false, texte: tr("Indiquez le NuméroH de la personne déjà dans l'arbre.") });
    if (!sansCompte && !autre.trim()) return setMessage({ ok: false, texte: tr("Indiquez le NuméroH de la personne à placer.") });
    const corps: Record<string, unknown> = { personneNumeroH: personne.trim(), position };
    if (sansCompte) {
      corps.sansCompte = {
        prenom: prenom.trim(), nomFamille: nomFamille.trim(), genre, estVivant,
        dateNaissance: dateNaissance || null, photo,
        ...(numero.trim() || etablissement.trim() || annee.trim()
          ? { pieceType, extraitNumero: numero.trim(), extraitCommune: etablissement.trim(), extraitAnnee: annee.trim() }
          : {}),
      };
    } else {
      corps.autreNumeroH = autre.trim();
    }
    setEnvoi(true);
    try {
      const res = await fetch(`${API_BASE}/api/parent-child/admin/placer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify(corps),
      });
      const d = await res.json().catch(() => ({}));
      setMessage({ ok: res.ok && d.success, texte: tr(d.message || "Erreur") });
      if (res.ok && d.success) {
        setAutre(""); setPrenom(""); setNomFamille(""); setGenre(""); setDateNaissance(""); setPhoto(null);
        setNumero(""); setEtablissement(""); setAnnee("");
        onDone?.();
      }
    } catch {
      setMessage({ ok: false, texte: tr("Erreur de connexion. Réessayez.") });
    } finally {
      setEnvoi(false);
    }
  };

  const champ = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
  const choix = (actif: boolean) => `py-2 rounded-lg text-sm font-semibold border-2 ${actif ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600"}`;

  return (
    <section className="mb-8 bg-white rounded-xl shadow border border-emerald-200">
      <button type="button" onClick={() => setOuvert((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span className="font-semibold text-emerald-800">➕ {tr("Placer une personne dans un arbre")}</span>
        <span className="text-gray-400">{ouvert ? "▲" : "▼"}</span>
      </button>
      {ouvert && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-gray-500">{tr("En tant qu'administrateur, vous pouvez ajouter une personne à n'importe quelle place. Indiquez la personne déjà dans l'arbre et la position.")}</p>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{tr("NuméroH de la personne déjà dans l'arbre")}</label>
            <input className={champ} value={personne} onChange={(e) => setPersonne(e.target.value)} placeholder="G1C1P1R1E1F1 1" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{tr("La personne à placer est…")}</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={choix(position === "enfant")} onClick={() => setPosition("enfant")}>{tr("👶 Son enfant")}</button>
              <button type="button" className={choix(position === "parent")} onClick={() => { setPosition("parent"); setAvecCompte(true); }}>{tr("👨‍👩 Son père / sa mère")}</button>
            </div>
          </div>
          {position === "enfant" && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={choix(avecCompte)} onClick={() => setAvecCompte(true)}>{tr("A un compte Moftal")}</button>
              <button type="button" className={choix(!avecCompte)} onClick={() => setAvecCompte(false)}>{tr("N'a pas de compte")}</button>
            </div>
          )}

          {!sansCompte ? (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{tr("NuméroH de la personne à placer")}</label>
              <input className={champ} value={autre} onChange={(e) => setAutre(e.target.value)} />
              {position === "parent" && <p className="text-xs text-gray-500 mt-1">{tr("Père ou mère selon le sexe enregistré dans son compte.")}</p>}
            </div>
          ) : (
            <div className="space-y-2 rounded-lg bg-gray-50 p-3">
              <div className="grid grid-cols-2 gap-2">
                <input className={champ} value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder={tr("Prénom *")} />
                <input className={champ} value={nomFamille} onChange={(e) => setNomFamille(e.target.value)} placeholder={tr("Nom de famille")} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={choix(genre === "HOMME")} onClick={() => setGenre("HOMME")}>{tr("👦 Garçon")}</button>
                <button type="button" className={choix(genre === "FEMME")} onClick={() => setGenre("FEMME")}>{tr("👧 Fille")}</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={choix(estVivant)} onClick={() => setEstVivant(true)}>{tr("🌱 Vivant")}</button>
                <button type="button" className={choix(!estVivant)} onClick={() => setEstVivant(false)}>{tr("🕊️ Décédé")}</button>
              </div>
              <label className="block text-xs font-semibold text-gray-700">{tr("Date de naissance")}</label>
              <input type="date" className={champ} value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} />
              <label className="block text-xs font-semibold text-gray-700">{tr("Photo")}</label>
              <input type="file" accept="image/*" className="text-sm" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try { setPhoto(await lireFichier(await compressImage(f, 800, 0.8))); } catch { setMessage({ ok: false, texte: tr("Impossible de lire cette photo.") }); }
              }} />
              {photo && <img src={photo} alt="" className="w-16 h-16 rounded-full object-cover" />}
              <label className="block text-xs font-semibold text-gray-700">{tr("Numéro de l'hôpital ou de la mairie")}</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={choix(pieceType === "mairie")} onClick={() => setPieceType("mairie")}>{tr("🏛️ Mairie")}</button>
                <button type="button" className={choix(pieceType === "hopital")} onClick={() => setPieceType("hopital")}>{tr("🏥 Hôpital")}</button>
              </div>
              <input className={champ} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder={tr("Numéro")} />
              <input className={champ} value={etablissement} onChange={(e) => setEtablissement(e.target.value)} placeholder={pieceType === "hopital" ? tr("Nom de l'hôpital") : tr("Commune")} />
              <input className={champ} inputMode="numeric" maxLength={4} value={annee} onChange={(e) => setAnnee(e.target.value.replace(/\D/g, ""))} placeholder={tr("Année (ex : 2015)")} />
            </div>
          )}

          {message && <p className={`text-sm rounded-lg px-3 py-2 ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{message.texte}</p>}
          <button type="button" disabled={envoi} onClick={() => void envoyer()} className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-60">
            {envoi ? tr("Enregistrement…") : tr("✓ Placer dans l'arbre")}
          </button>
        </div>
      )}
    </section>
  );
}
