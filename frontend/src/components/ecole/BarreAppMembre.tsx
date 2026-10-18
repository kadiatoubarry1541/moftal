import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoEtablissement from "../LogoEtablissement";
import { MoftalMark } from "../GestionBrand";
import InstallAppButton from "../InstallAppButton";
import { useTraduction } from "../../i18n/traduction";
import { cheminAppEcole, droitsMembreEcole, type ModeEcole, type PageMembre } from "../../utils/appEcole";

// Application de l'école, côté membres : parents (leurs enfants), enseignants
// (leurs cours) et bibliothèque. Ces espaces sont dans l'application de l'école
// (/gestion-ecole/:code/…), jamais sur son site vitrine, qui sert à la visibilité.
// Chacun ne voit que les onglets auxquels ses droits lui donnent accès.

function retourMoftal(navigate: ReturnType<typeof useNavigate>) {
  if (window.location.hostname.startsWith("gestions.")) window.location.href = "https://moftal.com/compte";
  else navigate("/compte");
}

export default function BarreAppMembre({ mode, tenantCode, nom, logoUrl, actif }: {
  mode: ModeEcole; tenantCode: string; nom?: string; logoUrl?: string | null; actif: PageMembre;
}) {
  const navigate = useNavigate();
  const { tr } = useTraduction();
  const couleur = mode === "madrasa" ? "#0891b2" : "#1a8f1a";
  const [droits, setDroits] = useState<{ enseignant: boolean; parent: boolean } | null>(null);

  useEffect(() => {
    let fini = false;
    droitsMembreEcole(mode, tenantCode).then(d => { if (!fini) setDroits(d); });
    return () => { fini = true; };
  }, [mode, tenantCode]);

  const onglets: { id: PageMembre; label: string; visible: boolean }[] = [
    { id: "parent", label: tr("👪 Mes enfants"), visible: actif === "parent" || !!droits?.parent },
    { id: "enseignant", label: tr("🧑‍🏫 Mes cours"), visible: actif === "enseignant" || !!droits?.enseignant },
    { id: "bibliotheque", label: tr("📚 Bibliothèque"), visible: true },
    { id: "notifications", label: tr("🔔 Notifications"), visible: true },
    { id: "parametres", label: tr("⚙️ Paramètres"), visible: true },
  ];

  return (
    <div style={{ background: "white", borderBottom: "1px solid #e2e8f0" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "10px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 42, height: 42, flexShrink: 0 }}>
            <LogoEtablissement src={logoUrl} name={nom || ""} type={mode} fontSize={18} />
          </div>
          <p style={{ flex: 1, minWidth: 0, margin: 0, fontWeight: 800, fontSize: 15, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nom}</p>
          {nom && <InstallAppButton name={nom} logoUrl={logoUrl || undefined} themeColor={couleur} color={couleur} />}
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "10px 0" }}>
          {onglets.filter(o => o.visible).map(o => {
            const est = o.id === actif;
            return (
              <button key={o.id} onClick={() => { if (!est) navigate(cheminAppEcole(mode, tenantCode, o.id)); }}
                style={{ flexShrink: 0, padding: "7px 12px", borderRadius: 20, border: `1.5px solid ${est ? couleur : "#e2e8f0"}`, background: est ? couleur : "white", color: est ? "white" : "#334155", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {o.label}
              </button>
            );
          })}
          <button onClick={() => retourMoftal(navigate)}
            style={{ flexShrink: 0, marginInlineStart: "auto", display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 20, border: "none", background: "transparent", color: "#475569", fontSize: 12, cursor: "pointer" }}>
            <MoftalMark size={14} /> {tr("Retour sur Moftal")}
          </button>
        </div>
      </div>
    </div>
  );
}
