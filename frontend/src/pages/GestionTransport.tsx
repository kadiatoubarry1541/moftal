import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import DynamicAppManifest from "../components/DynamicAppManifest";
import InstallAppButton from "../components/InstallAppButton";

const token = () => localStorage.getItem("token") || "";
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

async function api(path: string, opts: RequestInit = {}) {
  const r = await fetch(`/api/transport-mgmt${path}`, { ...opts, headers: { ...h(), ...(opts.headers || {}) } });
  return r.json();
}

type Tab = "dashboard" | "vehicles" | "drivers" | "trips" | "bookings" | "deliveries" | "announcements";

const BLUE = "#1e40af";
const BLUE_LIGHT = "#eff6ff";
const BLUE_BORDER = "#bfdbfe";

export default function GestionTransport() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const code = tenantCode!;
  const [tab, setTab] = useState<Tab>("dashboard");
  const [tenant, setTenant] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [vForm, setVForm] = useState({ immatriculation: "", type_vehicule: "voiture", marque: "", capacite: "4", driver_id: "", description: "" });
  const [dForm, setDForm] = useState({ nom: "", prenom: "", telephone: "", permis: "", type_permis: "B", salaire: "", notes: "" });
  const [tForm, setTForm] = useState({ lieu_depart: "", lieu_arrivee: "", date_depart: "", heure_depart: "", prix: "", places_total: "4", driver_id: "", vehicle_id: "", notes: "" });
  const [bForm, setBForm] = useState({ trip_id: "", client_nom: "", client_telephone: "", places: "1", montant: "", notes: "" });
  const [livForm, setLivForm] = useState({ client_nom: "", client_telephone: "", adresse_collecte: "", adresse_livraison: "", description: "", poids: "", montant: "", driver_id: "", vehicle_id: "", notes: "" });
  const [aForm, setAForm] = useState({ titre: "", contenu: "", type: "general" });

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3500); };

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [info, d, v, dr, tr, bk, liv, an] = await Promise.all([
      api(`/${code}/info`),
      api(`/${code}/dashboard`),
      api(`/${code}/vehicles`),
      api(`/${code}/drivers`),
      api(`/${code}/trips`),
      api(`/${code}/bookings`),
      api(`/${code}/deliveries`),
      api(`/${code}/announcements`),
    ]);
    if (info.success) setTenant(info.tenant);
    if (d.success) setDash(d);
    if (v.success) setVehicles(v.vehicles || []);
    if (dr.success) setDrivers(dr.drivers || []);
    if (tr.success) setTrips(tr.trips || []);
    if (bk.success) setBookings(bk.bookings || []);
    if (liv.success) setDeliveries(liv.deliveries || []);
    if (an.success) setAnnouncements(an.announcements || []);
    setLoading(false);
  }, [code]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // VEHICLES
  const addVehicle = async () => {
    if (!vForm.immatriculation) return flash("Immatriculation requise");
    const r = await api(`/${code}/vehicles`, { method: "POST", body: JSON.stringify(vForm) });
    if (r.success) { flash("Véhicule ajouté ✓"); setVForm({ immatriculation: "", type_vehicule: "voiture", marque: "", capacite: "4", driver_id: "", description: "" }); loadAll(); }
    else flash("Erreur : " + r.message);
  };
  const patchVehicle = async (id: number, statut: string) => { await api(`/${code}/vehicles/${id}`, { method: "PATCH", body: JSON.stringify({ statut }) }); loadAll(); };
  const deleteVehicle = async (id: number) => { if (!confirm("Supprimer ?")) return; await api(`/${code}/vehicles/${id}`, { method: "DELETE" }); loadAll(); };

  // DRIVERS
  const addDriver = async () => {
    if (!dForm.nom) return flash("Nom requis");
    const r = await api(`/${code}/drivers`, { method: "POST", body: JSON.stringify(dForm) });
    if (r.success) { flash("Chauffeur ajouté ✓"); setDForm({ nom: "", prenom: "", telephone: "", permis: "", type_permis: "B", salaire: "", notes: "" }); loadAll(); }
    else flash("Erreur : " + r.message);
  };
  const patchDriver = async (id: number, statut: string) => { await api(`/${code}/drivers/${id}`, { method: "PATCH", body: JSON.stringify({ statut }) }); loadAll(); };
  const deleteDriver = async (id: number) => { if (!confirm("Supprimer ?")) return; await api(`/${code}/drivers/${id}`, { method: "DELETE" }); loadAll(); };

  // TRIPS
  const addTrip = async () => {
    if (!tForm.lieu_depart || !tForm.lieu_arrivee || !tForm.date_depart) return flash("Départ, arrivée et date requis");
    const r = await api(`/${code}/trips`, { method: "POST", body: JSON.stringify(tForm) });
    if (r.success) { flash("Trajet ajouté ✓"); setTForm({ lieu_depart: "", lieu_arrivee: "", date_depart: "", heure_depart: "", prix: "", places_total: "4", driver_id: "", vehicle_id: "", notes: "" }); loadAll(); }
    else flash("Erreur : " + r.message);
  };
  const patchTrip = async (id: number, statut: string) => { await api(`/${code}/trips/${id}`, { method: "PATCH", body: JSON.stringify({ statut }) }); loadAll(); };
  const deleteTrip = async (id: number) => { if (!confirm("Supprimer ?")) return; await api(`/${code}/trips/${id}`, { method: "DELETE" }); loadAll(); };

  // BOOKINGS
  const addBooking = async () => {
    if (!bForm.client_nom) return flash("Nom client requis");
    const r = await api(`/${code}/bookings`, { method: "POST", body: JSON.stringify(bForm) });
    if (r.success) { flash("Réservation ajoutée ✓"); setBForm({ trip_id: "", client_nom: "", client_telephone: "", places: "1", montant: "", notes: "" }); loadAll(); }
    else flash("Erreur : " + r.message);
  };
  const patchBooking = async (id: number, statut: string) => { await api(`/${code}/bookings/${id}`, { method: "PATCH", body: JSON.stringify({ statut }) }); loadAll(); };

  // DELIVERIES
  const addDelivery = async () => {
    if (!livForm.client_nom || !livForm.adresse_collecte || !livForm.adresse_livraison) return flash("Nom client, adresse collecte et livraison requis");
    const r = await api(`/${code}/deliveries`, { method: "POST", body: JSON.stringify(livForm) });
    if (r.success) { flash("Livraison créée ✓"); setLivForm({ client_nom: "", client_telephone: "", adresse_collecte: "", adresse_livraison: "", description: "", poids: "", montant: "", driver_id: "", vehicle_id: "", notes: "" }); loadAll(); }
    else flash("Erreur : " + r.message);
  };
  const patchDelivery = async (id: number, statut: string) => { await api(`/${code}/deliveries/${id}`, { method: "PATCH", body: JSON.stringify({ statut }) }); loadAll(); };
  const deleteDelivery = async (id: number) => { if (!confirm("Supprimer ?")) return; await api(`/${code}/deliveries/${id}`, { method: "DELETE" }); loadAll(); };

  // ANNOUNCEMENTS
  const addAnnouncement = async () => {
    if (!aForm.titre || !aForm.contenu) return flash("Titre et contenu requis");
    const r = await api(`/${code}/announcements`, { method: "POST", body: JSON.stringify(aForm) });
    if (r.success) { flash("Annonce publiée ✓"); setAForm({ titre: "", contenu: "", type: "general" }); loadAll(); }
    else flash("Erreur : " + r.message);
  };
  const deleteAnnouncement = async (id: number) => { await api(`/${code}/announcements/${id}`, { method: "DELETE" }); loadAll(); };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "dashboard",     label: "Tableau de bord", icon: "📊" },
    { key: "vehicles",      label: "Véhicules",        icon: "🚌" },
    { key: "drivers",       label: "Chauffeurs",       icon: "👤" },
    { key: "trips",         label: "Trajets",           icon: "🗺️" },
    { key: "bookings",      label: "Réservations",     icon: "🎫" },
    { key: "deliveries",    label: "Livraisons",       icon: "📦" },
    { key: "announcements", label: "Annonces",         icon: "📢" },
  ];

  const inp: React.CSSProperties = { border: `1px solid ${BLUE_BORDER}`, borderRadius: 8, padding: "8px 12px", fontSize: 14, width: "100%", outline: "none" };
  const btnP: React.CSSProperties = { background: BLUE, color: "white", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontWeight: 600, fontSize: 14 };
  const btnSm = (bg: string): React.CSSProperties => ({ background: bg, color: "white", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 });

  const STATUT_COLORS: Record<string, { bg: string; color: string }> = {
    prevu:          { bg: BLUE_LIGHT,  color: BLUE },
    en_cours:       { bg: "#fef9c3",   color: "#854d0e" },
    termine:        { bg: "#dcfcdc",   color: "#156315" },
    annule:         { bg: "#fee2e2",   color: "#b91c1c" },
    en_attente:     { bg: "#fef3c7",   color: "#92400e" },
    confirme:       { bg: "#dcfcdc",   color: "#156315" },
    en_livraison:   { bg: "#e0f2fe",   color: "#0369a1" },
    livre:          { bg: "#dcfcdc",   color: "#156315" },
  };
  const badge = (s: string) => {
    const c = STATUT_COLORS[s] || { bg: "#f1f5f9", color: "#475569" };
    return <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{s.replace("_", " ")}</span>;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
      <DynamicAppManifest
        name={tenant?.name || "Gestion"}
        description={`Gestion transport — ${tenant?.name || ""}`}
        startUrl={`/gestion-transport/${tenantCode}`}
        themeColor={BLUE}
      />
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${BLUE}, #1d4ed8)`, color: "white", padding: "20px 24px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Gestion Interne · Transport & Livraison</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🚌 {tenant?.name || "Transport & Livraison"}</h1>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Code : {code}</div>
          </div>
          <div style={{ flexShrink: 0 }}><InstallAppButton name={tenant?.name} logoUrl={tenant?.logo_url} themeColor={BLUE} /></div>
        </div>
      </div>

      {msg && (
        <div style={{ background: msg.startsWith("Erreur") ? "#fee2e2" : "#dcfcdc", color: msg.startsWith("Erreur") ? "#b91c1c" : "#156315", padding: "10px 24px", fontWeight: 600, fontSize: 14, textAlign: "center" }}>
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ background: "white", borderBottom: `2px solid ${BLUE_BORDER}`, overflowX: "auto" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "flex" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "12px 16px", border: "none", background: "transparent", cursor: "pointer", fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? BLUE : "#64748b", borderBottom: tab === t.key ? `3px solid ${BLUE}` : "3px solid transparent", fontSize: 13, whiteSpace: "nowrap" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>
        {loading && <div style={{ textAlign: "center", color: BLUE, padding: 40, fontSize: 16 }}>Chargement…</div>}

        {/* ── DASHBOARD ── */}
        {!loading && tab === "dashboard" && dash && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 16, marginBottom: 28 }}>
              {[
                { label: "Véhicules actifs",         val: dash.vehiculesActifs,        icon: "🚌" },
                { label: "Chauffeurs dispos",         val: dash.chauffeursDisponibles,  icon: "👤" },
                { label: "Trajets aujourd'hui",       val: dash.trajetsAujourdhui,      icon: "🗓️" },
                { label: "CA ce mois (GNF)",          val: (dash.caMonth || 0).toLocaleString(), icon: "💰" },
                { label: "Réservations en attente",   val: dash.reservationsEnAttente,  icon: "🎫" },
                { label: "Livraisons en cours",       val: deliveries.filter(d => d.statut === "en_livraison").length, icon: "📦" },
                { label: "Annonces",                  val: dash.totalAnnonces,          icon: "📢" },
              ].map(s => (
                <div key={s.label} style={{ background: "white", border: `1px solid ${BLUE_BORDER}`, borderRadius: 12, padding: "16px 18px", textAlign: "center" }}>
                  <div style={{ fontSize: 24 }}>{s.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: BLUE, marginTop: 6 }}>{s.val}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {dash.recentTrips?.length > 0 && (
              <div style={{ background: "white", border: `1px solid ${BLUE_BORDER}`, borderRadius: 12, padding: 20 }}>
                <h3 style={{ margin: "0 0 16px", color: BLUE, fontSize: 16 }}>Derniers trajets</h3>
                {dash.recentTrips.map((t: any) => (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{t.lieu_depart} → {t.lieu_arrivee}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{t.date_depart?.slice(0, 10)} · {t.chauffeur_nom || "Sans chauffeur"}</div>
                    </div>
                    {badge(t.statut)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VEHICLES ── */}
        {!loading && tab === "vehicles" && (
          <div>
            <div style={{ background: "white", border: `1px solid ${BLUE_BORDER}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <h3 style={{ margin: "0 0 16px", color: BLUE }}>Ajouter un véhicule</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input style={inp} placeholder="Immatriculation *" value={vForm.immatriculation} onChange={e => setVForm(p => ({ ...p, immatriculation: e.target.value }))} />
                <select style={inp} value={vForm.type_vehicule} onChange={e => setVForm(p => ({ ...p, type_vehicule: e.target.value }))}>
                  {["voiture","minibus","bus","camion","moto","taxi","camionnette"].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <input style={inp} placeholder="Marque" value={vForm.marque} onChange={e => setVForm(p => ({ ...p, marque: e.target.value }))} />
                <input style={inp} type="number" placeholder="Capacité (places)" value={vForm.capacite} onChange={e => setVForm(p => ({ ...p, capacite: e.target.value }))} />
                <select style={inp} value={vForm.driver_id} onChange={e => setVForm(p => ({ ...p, driver_id: e.target.value }))}>
                  <option value="">— Chauffeur assigné —</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.nom} {d.prenom}</option>)}
                </select>
                <input style={inp} placeholder="Description" value={vForm.description} onChange={e => setVForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <button style={{ ...btnP, marginTop: 14 }} onClick={addVehicle}>+ Ajouter</button>
            </div>
            <div style={{ background: "white", border: `1px solid ${BLUE_BORDER}`, borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: BLUE_LIGHT }}>
                  <tr>{["Immatriculation","Type","Marque","Places","Chauffeur","Statut",""].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, color: BLUE, fontWeight: 700 }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {vehicles.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>Aucun véhicule</td></tr>}
                  {vehicles.map(v => (
                    <tr key={v.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600 }}>{v.immatriculation}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13 }}>{v.type_vehicule}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13 }}>{v.marque || "—"}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13 }}>{v.capacite}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13 }}>{v.chauffeur_nom ? `${v.chauffeur_nom} ${v.chauffeur_prenom || ""}` : "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <select value={v.statut} onChange={e => patchVehicle(v.id, e.target.value)} style={{ fontSize: 12, border: `1px solid ${BLUE_BORDER}`, borderRadius: 6, padding: "3px 6px" }}>
                          {["actif","en_maintenance","inactif"].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "10px 14px" }}><button style={btnSm("#ef4444")} onClick={() => deleteVehicle(v.id)}>Suppr.</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── DRIVERS ── */}
        {!loading && tab === "drivers" && (
          <div>
            <div style={{ background: "white", border: `1px solid ${BLUE_BORDER}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <h3 style={{ margin: "0 0 16px", color: BLUE }}>Ajouter un chauffeur</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input style={inp} placeholder="Nom *" value={dForm.nom} onChange={e => setDForm(p => ({ ...p, nom: e.target.value }))} />
                <input style={inp} placeholder="Prénom" value={dForm.prenom} onChange={e => setDForm(p => ({ ...p, prenom: e.target.value }))} />
                <input style={inp} placeholder="Téléphone" value={dForm.telephone} onChange={e => setDForm(p => ({ ...p, telephone: e.target.value }))} />
                <input style={inp} placeholder="N° Permis" value={dForm.permis} onChange={e => setDForm(p => ({ ...p, permis: e.target.value }))} />
                <select style={inp} value={dForm.type_permis} onChange={e => setDForm(p => ({ ...p, type_permis: e.target.value }))}>
                  {["A","B","C","D","E"].map(c => <option key={c} value={c}>Catégorie {c}</option>)}
                </select>
                <input style={inp} type="number" placeholder="Salaire (GNF)" value={dForm.salaire} onChange={e => setDForm(p => ({ ...p, salaire: e.target.value }))} />
                <input style={{ ...inp, gridColumn: "span 2" }} placeholder="Notes" value={dForm.notes} onChange={e => setDForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <button style={{ ...btnP, marginTop: 14 }} onClick={addDriver}>+ Ajouter</button>
            </div>
            <div style={{ background: "white", border: `1px solid ${BLUE_BORDER}`, borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: BLUE_LIGHT }}>
                  <tr>{["Nom","Téléphone","Permis","Salaire","Statut",""].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, color: BLUE, fontWeight: 700 }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {drivers.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>Aucun chauffeur</td></tr>}
                  {drivers.map(d => (
                    <tr key={d.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600 }}>{d.nom} {d.prenom}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13 }}>{d.telephone || "—"}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13 }}>{d.permis || "—"}{d.type_permis ? ` (Cat. ${d.type_permis})` : ""}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13 }}>{d.salaire ? d.salaire.toLocaleString() + " GNF" : "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <select value={d.statut} onChange={e => patchDriver(d.id, e.target.value)} style={{ fontSize: 12, border: `1px solid ${BLUE_BORDER}`, borderRadius: 6, padding: "3px 6px" }}>
                          {["disponible","en_service","conge","inactif"].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "10px 14px" }}><button style={btnSm("#ef4444")} onClick={() => deleteDriver(d.id)}>Suppr.</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TRIPS ── */}
        {!loading && tab === "trips" && (
          <div>
            <div style={{ background: "white", border: `1px solid ${BLUE_BORDER}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <h3 style={{ margin: "0 0 16px", color: BLUE }}>Nouveau trajet</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input style={inp} placeholder="Lieu de départ *" value={tForm.lieu_depart} onChange={e => setTForm(p => ({ ...p, lieu_depart: e.target.value }))} />
                <input style={inp} placeholder="Lieu d'arrivée *" value={tForm.lieu_arrivee} onChange={e => setTForm(p => ({ ...p, lieu_arrivee: e.target.value }))} />
                <input style={inp} type="date" value={tForm.date_depart} onChange={e => setTForm(p => ({ ...p, date_depart: e.target.value }))} />
                <input style={inp} type="time" value={tForm.heure_depart} onChange={e => setTForm(p => ({ ...p, heure_depart: e.target.value }))} />
                <input style={inp} type="number" placeholder="Prix (GNF)" value={tForm.prix} onChange={e => setTForm(p => ({ ...p, prix: e.target.value }))} />
                <input style={inp} type="number" placeholder="Nombre de places" value={tForm.places_total} onChange={e => setTForm(p => ({ ...p, places_total: e.target.value }))} />
                <select style={inp} value={tForm.driver_id} onChange={e => setTForm(p => ({ ...p, driver_id: e.target.value }))}>
                  <option value="">— Chauffeur —</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.nom} {d.prenom}</option>)}
                </select>
                <select style={inp} value={tForm.vehicle_id} onChange={e => setTForm(p => ({ ...p, vehicle_id: e.target.value }))}>
                  <option value="">— Véhicule —</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.immatriculation} ({v.type_vehicule})</option>)}
                </select>
                <input style={{ ...inp, gridColumn: "span 2" }} placeholder="Notes" value={tForm.notes} onChange={e => setTForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <button style={{ ...btnP, marginTop: 14 }} onClick={addTrip}>+ Créer le trajet</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {trips.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucun trajet</div>}
              {trips.map(t => (
                <div key={t.id} style={{ background: "white", border: `1px solid ${BLUE_BORDER}`, borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>📍 {t.lieu_depart} → {t.lieu_arrivee}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                      {t.date_depart?.slice(0, 10)} {t.heure_depart ? `à ${t.heure_depart}` : ""} · {t.places_restantes}/{t.places_total} places · {t.prix ? t.prix.toLocaleString() + " GNF" : "Gratuit"}
                    </div>
                    {(t.chauffeur_nom || t.vehicule_immat) && (
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                        {t.chauffeur_nom && `👤 ${t.chauffeur_nom}`}{t.vehicule_immat && ` · 🚌 ${t.vehicule_immat}`}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select value={t.statut} onChange={e => patchTrip(t.id, e.target.value)} style={{ fontSize: 12, border: `1px solid ${BLUE_BORDER}`, borderRadius: 6, padding: "4px 8px" }}>
                      {["prevu","en_cours","termine","annule"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button style={btnSm("#ef4444")} onClick={() => deleteTrip(t.id)}>Suppr.</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BOOKINGS ── */}
        {!loading && tab === "bookings" && (
          <div>
            <div style={{ background: "white", border: `1px solid ${BLUE_BORDER}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <h3 style={{ margin: "0 0 16px", color: BLUE }}>Nouvelle réservation</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <select style={inp} value={bForm.trip_id} onChange={e => setBForm(p => ({ ...p, trip_id: e.target.value }))}>
                  <option value="">— Trajet (optionnel) —</option>
                  {trips.filter(t => t.statut === "prevu").map(t => <option key={t.id} value={t.id}>{t.lieu_depart} → {t.lieu_arrivee} ({t.date_depart?.slice(0, 10)})</option>)}
                </select>
                <input style={inp} placeholder="Nom du client *" value={bForm.client_nom} onChange={e => setBForm(p => ({ ...p, client_nom: e.target.value }))} />
                <input style={inp} placeholder="Téléphone" value={bForm.client_telephone} onChange={e => setBForm(p => ({ ...p, client_telephone: e.target.value }))} />
                <input style={inp} type="number" placeholder="Nombre de places" value={bForm.places} onChange={e => setBForm(p => ({ ...p, places: e.target.value }))} />
                <input style={{ ...inp, gridColumn: "span 2" }} type="number" placeholder="Montant (GNF)" value={bForm.montant} onChange={e => setBForm(p => ({ ...p, montant: e.target.value }))} />
                <input style={{ ...inp, gridColumn: "span 2" }} placeholder="Notes" value={bForm.notes} onChange={e => setBForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <button style={{ ...btnP, marginTop: 14 }} onClick={addBooking}>+ Enregistrer</button>
            </div>
            <div style={{ background: "white", border: `1px solid ${BLUE_BORDER}`, borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: BLUE_LIGHT }}>
                  <tr>{["Client","Trajet","Places","Montant","Statut","Date"].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, color: BLUE, fontWeight: 700 }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {bookings.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>Aucune réservation</td></tr>}
                  {bookings.map(b => (
                    <tr key={b.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600 }}>{b.client_nom}<br /><span style={{ fontSize: 11, color: "#64748b" }}>{b.client_telephone}</span></td>
                      <td style={{ padding: "10px 14px", fontSize: 13 }}>{b.lieu_depart ? `${b.lieu_depart} → ${b.lieu_arrivee}` : "—"}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13 }}>{b.places}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13 }}>{b.montant ? b.montant.toLocaleString() + " GNF" : "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <select value={b.statut} onChange={e => patchBooking(b.id, e.target.value)} style={{ fontSize: 12, border: `1px solid ${BLUE_BORDER}`, borderRadius: 6, padding: "3px 6px" }}>
                          {["en_attente","confirme","annule"].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "#94a3b8" }}>{b.created_at?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── LIVRAISONS ── */}
        {!loading && tab === "deliveries" && (
          <div>
            <div style={{ background: "white", border: `1px solid ${BLUE_BORDER}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <h3 style={{ margin: "0 0 16px", color: BLUE }}>📦 Nouvelle livraison</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input style={inp} placeholder="Nom du client *" value={livForm.client_nom} onChange={e => setLivForm(p => ({ ...p, client_nom: e.target.value }))} />
                <input style={inp} placeholder="Téléphone" value={livForm.client_telephone} onChange={e => setLivForm(p => ({ ...p, client_telephone: e.target.value }))} />
                <input style={inp} placeholder="Adresse de collecte (départ) *" value={livForm.adresse_collecte} onChange={e => setLivForm(p => ({ ...p, adresse_collecte: e.target.value }))} />
                <input style={inp} placeholder="Adresse de livraison (arrivée) *" value={livForm.adresse_livraison} onChange={e => setLivForm(p => ({ ...p, adresse_livraison: e.target.value }))} />
                <input style={{ ...inp, gridColumn: "span 2" }} placeholder="Description du colis / contenu" value={livForm.description} onChange={e => setLivForm(p => ({ ...p, description: e.target.value }))} />
                <input style={inp} type="number" placeholder="Poids (kg)" value={livForm.poids} onChange={e => setLivForm(p => ({ ...p, poids: e.target.value }))} />
                <input style={inp} type="number" placeholder="Montant (GNF)" value={livForm.montant} onChange={e => setLivForm(p => ({ ...p, montant: e.target.value }))} />
                <select style={inp} value={livForm.driver_id} onChange={e => setLivForm(p => ({ ...p, driver_id: e.target.value }))}>
                  <option value="">— Chauffeur assigné —</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.nom} {d.prenom}</option>)}
                </select>
                <select style={inp} value={livForm.vehicle_id} onChange={e => setLivForm(p => ({ ...p, vehicle_id: e.target.value }))}>
                  <option value="">— Véhicule assigné —</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.immatriculation} ({v.type_vehicule})</option>)}
                </select>
                <input style={{ ...inp, gridColumn: "span 2" }} placeholder="Notes internes" value={livForm.notes} onChange={e => setLivForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <button style={{ ...btnP, marginTop: 14 }} onClick={addDelivery}>+ Enregistrer la livraison</button>
            </div>

            {/* Stats rapides */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "En attente",   count: deliveries.filter(d => d.statut === "en_attente").length,   color: "#92400e", bg: "#fef3c7" },
                { label: "En livraison", count: deliveries.filter(d => d.statut === "en_livraison").length, color: "#0369a1", bg: "#e0f2fe" },
                { label: "Livrées",      count: deliveries.filter(d => d.statut === "livre").length,         color: "#156315", bg: "#dcfcdc" },
                { label: "Annulées",     count: deliveries.filter(d => d.statut === "annule").length,        color: "#b91c1c", bg: "#fee2e2" },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.bg}`, borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: 12, color: s.color, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {deliveries.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucune livraison enregistrée</div>}
              {deliveries.map(liv => (
                <div key={liv.id} style={{ background: "white", border: `1px solid ${BLUE_BORDER}`, borderRadius: 12, padding: "14px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>📦 {liv.client_nom}</div>
                      {liv.client_telephone && <div style={{ fontSize: 12, color: "#64748b" }}>📞 {liv.client_telephone}</div>}
                      <div style={{ fontSize: 13, color: "#374151", marginTop: 6 }}>
                        <span style={{ color: "#6b7280" }}>Collecte :</span> {liv.adresse_collecte}
                      </div>
                      <div style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>
                        <span style={{ color: "#6b7280" }}>Livraison :</span> {liv.adresse_livraison}
                      </div>
                      {liv.description && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Colis : {liv.description}</div>}
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {liv.poids > 0 && <span>⚖️ {liv.poids} kg</span>}
                        {liv.montant > 0 && <span>💰 {liv.montant.toLocaleString()} GNF</span>}
                        {liv.chauffeur_nom && <span>👤 {liv.chauffeur_nom}</span>}
                        {liv.vehicule_immat && <span>🚌 {liv.vehicule_immat}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                      <select value={liv.statut} onChange={e => patchDelivery(liv.id, e.target.value)} style={{ fontSize: 12, border: `1px solid ${BLUE_BORDER}`, borderRadius: 6, padding: "4px 8px" }}>
                        {["en_attente","en_livraison","livre","annule"].map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                      </select>
                      <button style={btnSm("#ef4444")} onClick={() => deleteDelivery(liv.id)}>Suppr.</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{liv.created_at?.slice(0, 10)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ANNOUNCEMENTS ── */}
        {!loading && tab === "announcements" && (
          <div>
            <div style={{ background: "white", border: `1px solid ${BLUE_BORDER}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <h3 style={{ margin: "0 0 16px", color: BLUE }}>Nouvelle annonce</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input style={inp} placeholder="Titre *" value={aForm.titre} onChange={e => setAForm(p => ({ ...p, titre: e.target.value }))} />
                <textarea style={{ ...inp, minHeight: 90, resize: "vertical" }} placeholder="Contenu *" value={aForm.contenu} onChange={e => setAForm(p => ({ ...p, contenu: e.target.value }))} />
                <select style={inp} value={aForm.type} onChange={e => setAForm(p => ({ ...p, type: e.target.value }))}>
                  {["general","trajet","livraison","promo","urgent"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button style={{ ...btnP, marginTop: 14 }} onClick={addAnnouncement}>Publier</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {announcements.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Aucune annonce</div>}
              {announcements.map(a => (
                <div key={a.id} style={{ background: "white", border: `1px solid ${BLUE_BORDER}`, borderRadius: 12, padding: "14px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <span style={{ background: BLUE_LIGHT, color: BLUE, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, marginRight: 8 }}>{a.type}</span>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{a.titre}</span>
                    </div>
                    <button style={btnSm("#ef4444")} onClick={() => deleteAnnouncement(a.id)}>Suppr.</button>
                  </div>
                  <p style={{ margin: "8px 0 4px", fontSize: 13, color: "#475569" }}>{a.contenu}</p>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{a.created_at?.slice(0, 10)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
