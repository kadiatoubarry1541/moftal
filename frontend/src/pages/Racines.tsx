import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getSessionUser, isAdmin } from "../utils/auth";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5002").replace(/\/api\/?$/, "");

interface Member {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  photo: string | null;
  pays: string;
  ville: string;
  generation: string;
  regionOrigine: string;
}

function Avatar({ member }: { member: Member }) {
  const initials = `${member.prenom?.[0] || ""}${member.nomFamille?.[0] || ""}`.toUpperCase();
  if (member.photo) {
    return (
      <img
        src={member.photo}
        alt={member.prenom}
        style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid #d1fae5" }}
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div style={{
      width: 56, height: 56, borderRadius: "50%",
      background: "linear-gradient(135deg, #10b981, #059669)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: 20, letterSpacing: 1
    }}>
      {initials || "?"}
    </div>
  );
}

function MemberCard({ member, isMe }: { member: Member; isMe: boolean }) {
  const location = [member.ville, member.pays].filter(Boolean).join(", ");
  return (
    <div style={{
      background: "#fff",
      border: isMe ? "2px solid #10b981" : "1px solid #e2e8f0",
      borderRadius: 14,
      padding: "16px 14px",
      display: "flex",
      alignItems: "center",
      gap: 14,
      position: "relative",
      boxShadow: isMe ? "0 2px 12px rgba(16,185,129,0.15)" : "0 1px 4px rgba(0,0,0,0.05)"
    }}>
      <Avatar member={member} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {member.prenom} {member.nomFamille}
          {isMe && (
            <span style={{ marginLeft: 8, fontSize: 11, background: "#d1fae5", color: "#065f46", padding: "1px 8px", borderRadius: 20, fontWeight: 600 }}>
              Moi
            </span>
          )}
        </div>
        {location && (
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            {location}
          </div>
        )}
        {member.generation && (
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
            Génération {member.generation}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Racines() {
  const navigate = useNavigate();
  const user = getSessionUser() as any;

  const [members, setMembers] = useState<Member[]>([]);
  const [ethnie, setEthnie] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    const token = localStorage.getItem("token");
    fetch(`${API}/api/racines/ma-communaute`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setEthnie(data.ethnie);
          setMembers(data.members || []);
          setTotal(data.total || 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const userIsAdmin = isAdmin(user as any);
  const myNumeroH = user?.numeroH || user?.numero_h || "";

  const filtered = members.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (m.prenom + " " + m.nomFamille).toLowerCase().includes(q) ||
      m.pays.toLowerCase().includes(q) ||
      m.ville.toLowerCase().includes(q)
    );
  });

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#10b981", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // Pas d'ethnie dans le profil — utilisateur normal
  if (!ethnie && !userIsAdmin) return (
    <div style={{ maxWidth: 480, margin: "60px auto", padding: "0 24px", textAlign: "center" }}>
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: "linear-gradient(135deg, #d1fae5, #a7f3d0)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 24px"
      }}>
        <svg width="36" height="36" fill="none" stroke="#059669" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5z" />
          <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
        Tes Racines t'attendent
      </h2>
      <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
        Pour rejoindre ta communauté automatiquement, tu dois renseigner ton ethnie dans ton profil.
      </p>
      <button
        onClick={() => navigate("/moi/profil")}
        style={{
          background: "linear-gradient(135deg, #10b981, #059669)",
          color: "#fff", border: "none", borderRadius: 12,
          padding: "12px 28px", fontSize: 15, fontWeight: 600,
          cursor: "pointer"
        }}
      >
        Compléter mon profil
      </button>
    </div>
  );

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>

      {/* Retour Mon arbre */}
      <div style={{ marginBottom: 16 }}>
        <Link
          to="/famille/moi/arbre"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", background: "#f1f5f9", borderRadius: 8,
            color: "#475569", fontSize: 13, fontWeight: 600,
            textDecoration: "none", border: "1px solid #e2e8f0"
          }}
        >
          ← Mon arbre
        </Link>
      </div>

      {/* Bannière admin si pas d'ethnie */}
      {userIsAdmin && !ethnie && (
        <div style={{
          background: "#fffbeb", border: "2px solid #f59e0b", borderRadius: 14,
          padding: "16px 20px", marginBottom: 20,
          display: "flex", gap: 14, alignItems: "flex-start"
        }}>
          <span style={{ fontSize: 26, flexShrink: 0 }}>👑</span>
          <div>
            <div style={{ fontWeight: 700, color: "#92400e", fontSize: 15, marginBottom: 6 }}>
              Mode aperçu administrateur
            </div>
            <div style={{ fontSize: 13, color: "#78350f", lineHeight: 1.6 }}>
              Votre ethnie n'est pas renseignée. Vos utilisateurs verront ici tous les membres qui partagent leur ethnie — avec leurs noms, photos, villes et générations.
              Ajoutez votre ethnie dans votre profil pour voir votre vraie communauté.
            </div>
            <button
              onClick={() => navigate("/moi/profil")}
              style={{
                marginTop: 10, background: "#f59e0b", color: "#fff",
                border: "none", borderRadius: 8, padding: "7px 16px",
                fontSize: 13, fontWeight: 600, cursor: "pointer"
              }}
            >
              Compléter mon profil
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #065f46, #059669, #10b981)",
        borderRadius: 20,
        padding: "28px 28px 24px",
        marginBottom: 24,
        color: "#fff"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            {/* Icône racines — arbre */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 22v-7M12 15c-3 0-6-2-6-6 0-2 1-4 3-5M12 15c3 0 6-2 6-6 0-2-1-4-3-5M9 4c0 0 1 2 3 2s3-2 3-2" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>
              Tes Racines
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>
              {ethnie ? `Communauté ${ethnie}` : "Aperçu — Page Racines"}
            </h1>
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{total}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>membre{total > 1 ? "s" : ""}</div>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,0.2)" }} />
          <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.5, maxWidth: 340 }}>
            {ethnie
              ? <>Tous les membres de la plateforme qui partagent l'ethnie <strong>{ethnie}</strong> sont automatiquement ici.</>
              : "Ici s'affichent automatiquement tous les membres qui partagent la même ethnie que l'utilisateur."
            }
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      {total > 5 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ position: "relative" }}>
            <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
              width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher un membre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "10px 14px 10px 40px",
                border: "1.5px solid #e2e8f0", borderRadius: 10,
                fontSize: 14, color: "#1e293b", outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>
          {search && (
            <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>
              {filtered.length} résultat{filtered.length > 1 ? "s" : ""} pour « {search} »
            </div>
          )}
        </div>
      )}

      {/* Grille des membres */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 15 }}>
          {!ethnie && userIsAdmin
            ? <><div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>Les membres s'afficheront ici selon leur ethnie commune</>
            : "Aucun membre trouvé"
          }
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12
        }}>
          {filtered.map(m => (
            <MemberCard key={m.numeroH} member={m} isMe={m.numeroH === myNumeroH} />
          ))}
        </div>
      )}

    </div>
  );
}
