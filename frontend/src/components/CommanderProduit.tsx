import { useEffect, useState } from "react";
import { config } from "../config/api";
import { getSessionUser, isAdmin } from "../utils/auth";
import { useTraduction } from "../i18n/traduction";

// Commandes de l'Échange : « Commander » sur une publication → la commande est
// enregistrée en base et arrive chez celui qui a publié (Espace Pro → Demandes,
// gestion interne, cloche + téléphone). L'admin voit toutes les commandes.

const API = `${config.API_BASE_URL}/exchange`;
const entetes = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}`, "Content-Type": "application/json" });
const montant = (v: any, devise?: string) => `${Number(v || 0).toLocaleString("fr-FR")} ${devise || "FG"}`;

const STATUTS: Record<string, { label: string; fond: string; texte: string }> = {
  nouvelle: { label: "Nouvelle", fond: "#fef3c7", texte: "#92400e" },
  acceptee: { label: "Acceptée", fond: "#dbeafe", texte: "#1e40af" },
  livree:   { label: "Livrée",   fond: "#dcfce7", texte: "#166534" },
  annulee:  { label: "Annulée",  fond: "#fee2e2", texte: "#991b1b" },
};

export interface ProduitACommander {
  id: string;
  title: string;
  price: number | string;
  currency?: string;
  sellerName?: string;
  location?: string;
}

/** Fenêtre « Commander » : quantité, téléphone, adresse, message → au vendeur. */
export function CommanderProduitModal({ product, couleur = "#16a34a", onClose }: { product: ProduitACommander; couleur?: string; onClose: () => void }) {
  const { tr } = useTraduction();
  const moi: any = getSessionUser() || {};
  const [quantite, setQuantite] = useState(1);
  const [nom, setNom] = useState([moi.prenom, moi.nomFamille].filter(Boolean).join(" "));
  const [telephone, setTelephone] = useState(moi.tel1 || moi.telephone || moi.phone || "");
  const [adresse, setAdresse] = useState("");
  const [message, setMessage] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [envoyee, setEnvoyee] = useState(false);
  const prix = Number(product.price) || 0;

  const commander = async () => {
    setErreur("");
    if (String(telephone).replace(/[^0-9]/g, "").length < 8) { setErreur(tr("Votre numéro de téléphone est obligatoire.")); return; }
    setEnvoi(true);
    try {
      const r = await fetch(`${API}/products/${encodeURIComponent(product.id)}/commander`, {
        method: "POST", headers: entetes(), body: JSON.stringify({ quantite, nom, telephone, adresse, message }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.message || tr("La commande n'a pas pu être envoyée."));
      setEnvoyee(true);
    } catch (e) {
      setErreur((e as Error).message || tr("La commande n'a pas pu être envoyée."));
    } finally { setEnvoi(false); }
  };

  const champ = "w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {envoyee ? (
          <div className="text-center py-4">
            <div className="text-6xl mb-3">✅</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{tr("Commande envoyée !")}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
              {tr("Le vendeur a reçu votre commande dans son espace et va vous recontacter. Vous suivez votre commande dans « Mes commandes » de l'Échange.")}
            </p>
            <button onClick={onClose} className="w-full py-3 text-white rounded-xl font-semibold" style={{ background: couleur }}>{tr("Fermer")}</button>
          </div>
        ) : (<>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">🛒 {tr("Commander")}</h3>
          <p className="font-semibold text-gray-800 dark:text-gray-100">{product.title}</p>
          {product.sellerName && <p className="text-xs text-gray-500 dark:text-gray-400">{product.sellerName}</p>}
          <p className="text-lg font-bold mt-1 mb-4" style={{ color: couleur }}>{montant(prix, product.currency)}</p>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{tr("Quantité")}
              <div className="flex items-center gap-2 mt-1">
                <button type="button" onClick={() => setQuantite(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 font-bold text-lg">−</button>
                <input type="number" min={1} value={quantite} onChange={(e) => setQuantite(Math.max(1, parseInt(e.target.value, 10) || 1))} className={`${champ} text-center`} />
                <button type="button" onClick={() => setQuantite(q => q + 1)} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 font-bold text-lg">+</button>
              </div>
            </label>
            <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={tr("Votre nom")} className={champ} />
            <input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder={tr("Votre téléphone *")} inputMode="tel" className={champ} />
            <input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder={tr("Adresse de livraison (quartier, ville)")} className={champ} />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder={tr("Un mot pour le vendeur (facultatif)")} className={champ} />
          </div>

          <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">{tr("Total")}</span>
            <span className="font-bold text-gray-900 dark:text-white">{montant(prix * quantite, product.currency)}</span>
          </div>
          {erreur && <p className="mt-3 text-sm text-red-600">{erreur}</p>}

          <div className="flex gap-3 mt-5">
            <button onClick={commander} disabled={envoi} className="flex-1 py-3 text-white rounded-xl font-semibold disabled:opacity-60" style={{ background: couleur }}>
              {envoi ? tr("Envoi…") : tr("🛒 Envoyer ma commande")}
            </button>
            <button onClick={onClose} className="px-5 py-3 bg-gray-500 text-white rounded-xl font-semibold">✕</button>
          </div>
        </>)}
      </div>
    </div>
  );
}

function BadgeStatut({ statut }: { statut: string }) {
  const { tr } = useTraduction();
  const s = STATUTS[statut] || STATUTS.nouvelle;
  return <span style={{ background: s.fond, color: s.texte }} className="px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap">{tr(s.label)}</span>;
}

/**
 * Commandes reçues (ce que la personne a publié sur l'Échange).
 * `tout` : l'admin voit toutes les commandes de tous les vendeurs.
 * Sans commande, le bloc ne s'affiche pas (sauf `toujoursVisible`).
 */
export function CommandesRecues({ tout = false, toujoursVisible = false }: { tout?: boolean; toujoursVisible?: boolean }) {
  const { tr } = useTraduction();
  const voirTout = tout && isAdmin(getSessionUser());
  const [commandes, setCommandes] = useState<any[] | null>(null);
  const [erreur, setErreur] = useState("");
  const [filtre, setFiltre] = useState<string>("toutes");

  const charger = () => {
    setErreur("");
    fetch(`${API}/orders/received${voirTout ? "?tout=1" : ""}`, { headers: entetes() })
      .then(r => r.json())
      .then(d => { if (!d.success) throw new Error(d.message); setCommandes(d.commandes || []); })
      .catch((e) => { setErreur(e.message || tr("Impossible de charger les commandes.")); setCommandes([]); });
  };
  useEffect(charger, [tr, voirTout]);

  const changer = async (id: number, statut: string) => {
    try {
      const r = await fetch(`${API}/orders/${id}`, { method: "PATCH", headers: entetes(), body: JSON.stringify({ statut }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.message || tr("La commande n'a pas pu être mise à jour."));
      setCommandes(cs => (cs || []).map(c => c.id === id ? { ...c, statut } : c));
    } catch (e) { alert((e as Error).message); }
  };

  if (commandes === null) return null;
  if (!commandes.length && !erreur && !toujoursVisible) return null;
  const nouvelles = commandes.filter(c => c.statut === "nouvelle").length;
  const visibles = filtre === "toutes" ? commandes : commandes.filter(c => c.statut === filtre);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-5 text-left">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
          🛒 {voirTout ? tr("Toutes les commandes de l'Échange") : tr("Commandes reçues")}
          {nouvelles > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{nouvelles}</span>}
        </h3>
        <div className="flex gap-2 items-center">
          <select value={filtre} onChange={(e) => setFiltre(e.target.value)} className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 dark:text-white">
            <option value="toutes">{tr("Toutes")} ({commandes.length})</option>
            {Object.entries(STATUTS).map(([k, s]) => <option key={k} value={k}>{tr(s.label)}</option>)}
          </select>
          <button onClick={charger} className="text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400">🔄</button>
        </div>
      </div>
      {erreur && <p className="text-sm text-red-600 mb-2">{erreur}</p>}
      {!visibles.length && !erreur && <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">{tr("Aucune commande pour le moment.")}</p>}
      <div className="space-y-3">
        {visibles.map(c => (
          <div key={c.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
            <div className="flex justify-between gap-2 items-start">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">{c.quantite} × {c.product_title}</p>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{montant(c.total, c.currency)}</p>
              </div>
              <BadgeStatut statut={c.statut} />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-2 space-y-0.5">
              <p>👤 {c.buyer_nom || c.buyer_numero_h} · <a href={`tel:${c.buyer_telephone}`} className="text-blue-600 font-medium">📞 {c.buyer_telephone}</a></p>
              {c.adresse && <p>📍 {c.adresse}</p>}
              {c.message && <p className="italic">« {c.message} »</p>}
              {voirTout && <p className="text-xs text-gray-500">{tr("Vendeur")} : {c.seller_nom || c.seller_numero_h}</p>}
              <p className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString("fr-FR")}</p>
            </div>
            {c.statut !== "livree" && c.statut !== "annulee" && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {c.statut === "nouvelle" && <button onClick={() => changer(c.id, "acceptee")} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold">✓ {tr("Accepter")}</button>}
                <button onClick={() => changer(c.id, "livree")} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold">📦 {tr("Livrée")}</button>
                <button onClick={() => changer(c.id, "annulee")} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold">{tr("Annuler")}</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Suivi des commandes passées par la personne (page Échange). */
export function MesCommandes() {
  const { tr } = useTraduction();
  const [commandes, setCommandes] = useState<any[] | null>(null);
  const charger = () => {
    fetch(`${API}/orders/mine`, { headers: entetes() })
      .then(r => r.json()).then(d => setCommandes(d.success ? d.commandes || [] : [])).catch(() => setCommandes([]));
  };
  useEffect(charger, []);

  const annuler = async (id: number) => {
    const r = await fetch(`${API}/orders/${id}`, { method: "PATCH", headers: entetes(), body: JSON.stringify({ statut: "annulee" }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.success) { alert(d.message || tr("La commande n'a pas pu être annulée.")); return; }
    charger();
  };

  if (!commandes?.length) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
      <h3 className="font-bold text-gray-900 mb-3">📦 {tr("Mes commandes")}</h3>
      <div className="space-y-2">
        {commandes.map(c => (
          <div key={c.id} className="flex justify-between items-center gap-2 border border-gray-100 rounded-xl p-3">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{c.quantite} × {c.product_title}</p>
              <p className="text-xs text-gray-500">{montant(c.total, c.currency)}{c.seller_nom ? ` · ${c.seller_nom}` : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              <BadgeStatut statut={c.statut} />
              {c.statut === "nouvelle" && <button onClick={() => annuler(c.id)} className="text-xs text-red-600 font-semibold">{tr("Annuler")}</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Admin : toutes les commandes et tous les messages envoyés depuis les sites
 * des établissements (boutiques, fournisseurs, commerçants…), sans limite.
 */
export function MessagesTousLesSites() {
  const { tr } = useTraduction();
  const [demandes, setDemandes] = useState<any[] | null>(null);
  const [erreur, setErreur] = useState("");
  const [filtre, setFiltre] = useState("toutes");
  const charger = () => {
    setErreur("");
    fetch(`${config.API_BASE_URL}/site-mgmt/admin/toutes-demandes`, { headers: entetes() })
      .then(r => r.json())
      .then(d => { if (!d.success) throw new Error(d.message); setDemandes(d.demandes || []); })
      .catch((e) => { setErreur(e.message || tr("Impossible de charger les messages.")); setDemandes([]); });
  };
  useEffect(charger, [tr]);
  if (demandes === null) return null;
  const visibles = filtre === "commandes" ? demandes.filter(d => /commande/i.test(d.objet || "")) : filtre === "nouveau" ? demandes.filter(d => d.statut === "nouveau") : demandes;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-left">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h3 className="font-bold text-gray-900 dark:text-white">📩 {tr("Commandes et messages reçus par les établissements")} ({demandes.length})</h3>
        <div className="flex gap-2 items-center">
          <select value={filtre} onChange={(e) => setFiltre(e.target.value)} className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 dark:text-white">
            <option value="toutes">{tr("Tout")}</option>
            <option value="commandes">{tr("Commandes")}</option>
            <option value="nouveau">{tr("Non traités")}</option>
          </select>
          <button onClick={charger} className="text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400">🔄</button>
        </div>
      </div>
      {erreur && <p className="text-sm text-red-600 mb-2">{erreur}</p>}
      {!visibles.length && !erreur && <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">{tr("Aucun message pour le moment.")}</p>}
      <div className="space-y-3">
        {visibles.map(d => (
          <div key={d.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
            <div className="flex justify-between gap-2 items-start">
              <p className="font-semibold text-gray-900 dark:text-white min-w-0">{d.objet || tr("Message")} · {d.nom}</p>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${d.statut === "nouveau" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>
                {d.statut === "nouveau" ? tr("Nouveau") : tr("Traité")}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">🏢 {d.etablissement || d.tenant_code}{d.type ? ` · ${d.type}` : ""}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap my-2">{d.message}</p>
            <div className="flex justify-between items-center text-sm flex-wrap gap-2">
              <a href={`tel:${d.telephone}`} className="text-blue-600 font-medium">📞 {d.telephone}</a>
              <span className="text-xs text-gray-400">{new Date(d.created_at).toLocaleString("fr-FR")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
