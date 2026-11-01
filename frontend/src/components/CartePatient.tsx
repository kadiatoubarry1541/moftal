import { QRCodeSVG } from "qrcode.react";
import { getPhotoUrl } from "../utils/auth";

/**
 * Carte patient, faite toute seule à partir de la fiche du patient :
 * logo et nom de la clinique, photo (si elle existe), nom, numéro de patient,
 * date de naissance, groupe sanguin, allergies, téléphone, et un code QR qui
 * porte le numéro de patient. Elle s'imprime ou s'envoie au patient (qui la
 * retrouve dans son espace patient). Aucun champ n'est obligatoire.
 */
export interface DonneesCartePatient {
  nom?: string | null;
  prenom?: string | null;
  numero_matricule?: string | null;
  date_naissance?: string | null;
  sexe?: string | null;
  groupe_sanguin?: string | null;
  allergies?: string | null;
  telephone?: string | null;
  photo_url?: string | null;
}

export interface CliniqueCarte {
  name?: string | null;
  logo_url?: string | null;
  phone?: string | null;
  address?: string | null;
}

const dateCourte = (d?: string | null) => {
  if (!d) return "";
  const x = new Date(String(d).slice(0, 10) + "T12:00:00");
  return Number.isNaN(x.getTime()) ? "" : x.toLocaleDateString("fr-FR");
};

export default function CartePatient({ patient, clinique, couleur = "#0d9488" }: { patient: DonneesCartePatient; clinique: CliniqueCarte; couleur?: string }) {
  const photo = getPhotoUrl(patient.photo_url);
  const logo = getPhotoUrl(clinique.logo_url);
  const ligne = (libelle: string, valeur?: string | null, rouge = false) => valeur ? (
    <div style={{ display: "flex", gap: 6, fontSize: 11, lineHeight: 1.45 }}>
      <span style={{ color: "#64748b", minWidth: 74 }}>{libelle}</span>
      <span style={{ fontWeight: 700, color: rouge ? "#b91c1c" : "#0f172a" }}>{valeur}</span>
    </div>
  ) : null;

  return (
    <div className="carte-patient" style={{
      width: 340, maxWidth: "100%", aspectRatio: "85.6 / 54", borderRadius: 16, overflow: "hidden", background: "white",
      boxShadow: "0 10px 30px rgba(15,23,42,0.18)", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column",
      fontFamily: "Inter, Arial, sans-serif", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact",
    }}>
      <div style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}cc)`, color: "white", padding: "7px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        {logo && <img src={logo} alt="" style={{ width: 26, height: 26, borderRadius: 6, background: "white", objectFit: "contain" }} />}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{clinique.name || "Clinique"}</div>
          <div style={{ fontSize: 9, opacity: 0.9, letterSpacing: "0.12em", fontWeight: 700 }}>CARTE PATIENT</div>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", gap: 10, padding: "8px 12px", minHeight: 0 }}>
        <div style={{ width: 66, height: 80, borderRadius: 10, overflow: "hidden", background: "#f1f5f9", border: "1px solid #e2e8f0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: couleur, fontSize: 26, fontWeight: 800 }}>
          {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (patient.prenom || "?").charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", lineHeight: 1.15, marginBottom: 4 }}>{[patient.prenom, patient.nom].filter(Boolean).join(" ")}</div>
          {ligne("Né(e) le", dateCourte(patient.date_naissance))}
          {ligne("Sexe", patient.sexe === "M" ? "Masculin" : patient.sexe === "F" ? "Féminin" : patient.sexe || "")}
          {ligne("Gr. sanguin", patient.groupe_sanguin, true)}
          {ligne("Allergies", patient.allergies, true)}
          {ligne("Téléphone", patient.telephone)}
        </div>
        {patient.numero_matricule && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 3 }}>
            <QRCodeSVG value={patient.numero_matricule} size={58} level="M" />
          </div>
        )}
      </div>
      <div style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "4px 12px", display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569" }}>
        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>{patient.numero_matricule || ""}</span>
        <span>{clinique.phone || ""}</span>
      </div>
    </div>
  );
}
