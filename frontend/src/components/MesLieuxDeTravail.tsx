import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getTypeInfo } from "./EspaceProModals";
import LogoEtablissement from "./LogoEtablissement";

// « Établissements où je travaille » : les gestions auxquelles un propriétaire
// m'a donné accès (voir AccesEmployes). Rien n'est affiché s'il n'y en a pas.
type Lieu = { tenant_code: string; type: string; name: string; logo_url: string | null; niveau: string; poste: string | null };

export default function MesLieuxDeTravail() {
  const [lieux, setLieux] = useState<Lieu[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${config.API_BASE_URL}/professionals/mes-acces-employe`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setLieux(d.etablissements || []); })
      .catch(() => {});
  }, []);

  if (!lieux.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", margin: "4px 0 8px" }}>👤 Établissements où je travaille</div>
      {lieux.map(l => {
        const info = getTypeInfo(l.type);
        return (
          <div key={l.tenant_code} style={{ display: "flex", alignItems: "center", gap: 12, background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 14px", marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, flexShrink: 0 }}><LogoEtablissement src={l.logo_url} name={l.name} type={l.type} fontSize={18} radius={10} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{l.name}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{l.poste ? `${l.poste} · ` : ""}Accès {l.niveau === "complet" ? "complet" : "limité"}</div>
            </div>
            <button onClick={() => navigate(`/${info.path}/${encodeURIComponent(l.tenant_code)}`)}
              style={{ padding: "8px 14px", background: info.color, color: "white", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
              Ouvrir
            </button>
          </div>
        );
      })}
    </div>
  );
}
