import { useEffect, useState } from "react";
import { demanderCodeOuverture } from "../utils/codeOuverture";
import { setProBrand } from "./proBrand";
import { synchroniserIconeApp } from "../utils/appIcon";
import { appPlayInstallee, appSiteInstallee, estDansAppPlay, lienOuvrirAppPlay } from "../utils/appMoftalInstallee";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface Props {
  // Props pour la gestion interne (ignorées sur la page d'accueil)
  name?: string;
  logoUrl?: string;
  themeColor?: string;
  color?: string;
  label?: string;
  // "icon" (rond compact, par défaut) ou "banner" (rangée pleine largeur,
  // utilisée dans le panneau de notifications). Dans une gestion interne, le
  // bouton n'apparaît que dans les Paramètres ("settings") ; ailleurs il ne fait
  // que transmettre le nom et le logo du pro à la barre du haut.
  variant?: "icon" | "banner" | "settings";
}

// ─── Utilitaires ────────────────────────────────────────────────────────────

function isGestionPage() {
  const p = window.location.pathname;
  // Exige un tenant code (/gestion-xxx/CODE ou /espace-pro/ID) pour éviter d'installer Moftal en double
  return Boolean(p.match(/^\/espace-pro\/[^/]+/)) || Boolean(p.match(/^\/gestion-[^/]+\/[^/]+/));
}

function getTenantStorageKey() {
  const p = window.location.pathname;
  if (p.startsWith("/espace-pro/")) return `proInstalled_${p.split("/")[2]}`;
  if (p.startsWith("/gestion-"))   return `gestionInstalled_${p.split("/")[2]}`;
  return null;
}

function getShownKey() {
  const p = window.location.pathname;
  if (p.startsWith("/espace-pro/")) return `proCardShown_${p.split("/")[2]}`;
  if (p.startsWith("/gestion-"))   return `gestionCardShown_${p.split("/")[2]}`;
  return null;
}

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

// Vrai onglet Chrome sur Android (pas l'app Moftal, ni WhatsApp / Facebook…,
// ni un autre navigateur) : le seul endroit où le téléphone propose d'installer.
function estOngletChrome() {
  const ua = navigator.userAgent;
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  return isAndroid() && /Chrome\//.test(ua) && !/; wv\)|FBAN|FBAV|Instagram|SamsungBrowser|EdgA|OPR\/|MiuiBrowser/.test(ua) && !standalone;
}

// Lien Android qui rouvre la page actuelle dans Chrome lui-même. Une gestion ouverte
// depuis l'app Moftal (ou depuis WhatsApp, Facebook…) s'affiche dans une fenêtre
// intégrée (croix ✕ en haut) où le téléphone ne propose jamais l'installation :
// seul un vrai onglet Chrome peut installer l'app de la gestion. La session est
// transmise par un code à usage unique (jamais la session elle-même dans
// l'adresse) pour ne pas avoir à se reconnecter.
function lienOuvrirDansChrome(code?: string | null) {
  const { host, pathname, search } = window.location;
  const params = new URLSearchParams(search);
  params.delete("_t"); params.delete("_s"); params.delete("_c");
  if (code) params.set("_c", code);
  // À l'arrivée dans Chrome, la gestion affiche directement l'installation
  params.set("installer", "1");
  const q = params.toString();
  const cible = `${host}${pathname}${q ? `?${q}` : ""}`;
  const secours = encodeURIComponent(`https://${host}${pathname}`);
  return `intent://${cible}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${secours};end`;
}

// Code d'ouverture pour « Ouvrir dans Chrome », demandé seulement quand le lien
// est affiché, et renouvelé avant son expiration (10 min côté serveur).
function useCodeChrome(actif: boolean) {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    if (!actif) return;
    let fini = false;
    const charger = () => demanderCodeOuverture().then((c) => { if (!fini) setCode(c); });
    charger();
    const t = setInterval(charger, 8 * 60 * 1000);
    return () => { fini = true; clearInterval(t); };
  }, [actif]);
  return code;
}

// Vérifie auprès du navigateur (Chrome/Edge/Android uniquement — API absente sur
// iOS Safari et Firefox) si l'app est toujours réellement installée. Si le drapeau
// local dit "installée" mais que le navigateur ne la voit plus, on le corrige pour
// faire réapparaître le bouton Installer.
export async function reconcileInstalledFlag(storageKey: string | null, setInstalled: (v: boolean) => void) {
  if (!storageKey) return;
  const nav = navigator as any;
  if (typeof nav.getInstalledRelatedApps !== "function") return;
  try {
    const related = await nav.getInstalledRelatedApps();
    if (!related || related.length === 0) {
      localStorage.removeItem(storageKey);
      setInstalled(false);
    }
  } catch { /* silencieux */ }
}

// Petit logo Moftal cliquable pour revenir au site principal — jamais un bouton de
// navigation complet : chaque app (Gestion Interne, IA Education, Info Moftal) reste
// une app à part entière, comme Messenger et Facebook.
export function BackToMoftalBadge() {
  return (
    <a
      href="https://moftal.com/"
      title="Retour au site principal Moftal"
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 34, height: 34, borderRadius: 10, background: "#ffffff",
        border: "1.5px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        flexShrink: 0,
      }}
    >
      <img src="/logo-moftal.svg" alt="Moftal" style={{ width: 20, height: 20 }} />
    </a>
  );
}

// ─── Message automatique « Installez l'application » ────────────────────────
// Proposé tout seul au plus 2 fois (une fois par visite), puis plus jamais :
// l'installation reste ensuite disponible dans les Paramètres (gestion) ou
// dans le panneau des notifications (Moftal). Jamais proposé une fois installée.
const MAX_INVITATIONS = 2;

function invitationPossible(cle: string) {
  try {
    if (sessionStorage.getItem(`${cle}_vue`) === "1") return false;
    return Number(localStorage.getItem(cle) || 0) < MAX_INVITATIONS;
  } catch { return false; }
}

function noterInvitation(cle: string) {
  try {
    sessionStorage.setItem(`${cle}_vue`, "1");
    localStorage.setItem(cle, String(Number(localStorage.getItem(cle) || 0) + 1));
  } catch { /* ignore */ }
}

function estEnModeApp() {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
}

// ─── Composant ──────────────────────────────────────────────────────────────

export default function InstallAppButton({ name, logoUrl, themeColor, color, label, variant = "icon" }: Props = {}) {

  const onGestionPage = isGestionPage();

  // ══════════════════════════════════════════════════════════════════════════
  // MODE 1 — PAGE D'ACCUEIL : installer l'application Moftal principale
  // ══════════════════════════════════════════════════════════════════════════
  if (!onGestionPage) {
    return <MainAppInstallButton variant={variant === "banner" ? "banner" : "icon"} />;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODE 2 — GESTION INTERNE : installer l'espace de gestion du professionnel
  // ══════════════════════════════════════════════════════════════════════════
  const couleur = themeColor || color || "#1d4ed8";
  if (variant !== "settings") return (
    <>
      <ProBrandPublisher name={name} logoUrl={logoUrl} color={couleur} />
      <InstallationALArrivee name={name} logoUrl={logoUrl} themeColor={couleur} />
    </>
  );
  return <GestionInstallButton name={name} logoUrl={logoUrl} themeColor={couleur} label={label} />;
}

// La barre du haut affiche le logo du professionnel (pas celui de Moftal)
function ProBrandPublisher({ name, logoUrl, color }: { name?: string; logoUrl?: string; color: string }) {
  useEffect(() => { setProBrand({ name, logoUrl, color }); }, [name, logoUrl, color]);
  // Icône PNG de l'app installée (sur l'écran d'accueil), toujours à jour du logo
  useEffect(() => {
    const code = window.location.pathname.match(/^\/gestion-[^/]+\/([^/]+)/)?.[1];
    if (code && (name || logoUrl)) synchroniserIconeApp(decodeURIComponent(code), name, logoUrl, color);
  }, [name, logoUrl, color]);
  useEffect(() => () => setProBrand(null), []);
  return null;
}

// Arrivée dans Chrome par « Ouvrir dans Chrome » (?installer=1) : au lieu de
// laisser le pro sur l'accueil de sa gestion, on lui présente tout de suite
// l'installation de son application. (Le téléphone exige un appui pour installer.)
function InstallationALArrivee({ name, logoUrl, themeColor }: { name?: string; logoUrl?: string; themeColor: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [etat, setEtat] = useState<"" | "installation" | "installee" | "manuel">("");
  const codeChrome = useCodeChrome(etat === "manuel" && isAndroid());

  useEffect(() => {
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    const params = new URLSearchParams(window.location.search);
    if (params.get("installer") === "1") {
      params.delete("installer");
      const q = params.toString();
      window.history.replaceState(window.history.state, "", window.location.pathname + (q ? `?${q}` : "") + window.location.hash);
      setOuvert(true);
    } else {
      // Arrivée normale dans la gestion : on propose l'installation tout seul
      // (2 fois au plus), sauf si l'app de cette gestion est déjà installée.
      const cleInstallee = getTenantStorageKey();
      const cleInvitation = cleInstallee ? `installInvite_${cleInstallee}` : null;
      let depuisMoftal = false;
      try { depuisMoftal = sessionStorage.getItem("gestionOuverteDepuisMoftal") === "1"; } catch { /* ignore */ }
      const dejaInstallee = (estEnModeApp() && !depuisMoftal) || (cleInstallee && localStorage.getItem(cleInstallee) === "1");
      if (!cleInvitation || dejaInstallee || !invitationPossible(cleInvitation)) return;
      minuterie = setTimeout(() => { noterInvitation(cleInvitation); setOuvert(true); }, 2500);
    }

    const existing = (window as any).__pwaGestionPrompt;
    if (existing) setPrompt(existing);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaGestionPrompt = e;
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onReady = () => {
      const p = (window as any).__pwaGestionPrompt;
      if (p) setPrompt(p);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("pwa-prompt-ready", onReady);
    return () => {
      if (minuterie) clearTimeout(minuterie);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("pwa-prompt-ready", onReady);
    };
  }, []);

  if (!ouvert) return null;

  const installer = async () => {
    setEtat("installation");
    let p = prompt || (window as any).__pwaGestionPrompt as BeforeInstallPromptEvent | null;
    // Hors d'un vrai onglet Chrome (app Moftal, WhatsApp…) : on ouvre Chrome directement
    if (!p && isAndroid() && !estOngletChrome()) {
      const code = await demanderCodeOuverture();
      window.location.href = lienOuvrirDansChrome(code);
      setTimeout(() => setEtat(""), 4000);
      return;
    }
    // Chrome peut mettre quelques secondes à proposer l'installation après l'ouverture
    for (let i = 0; !p && i < 10; i++) {
      await new Promise(r => setTimeout(r, 400));
      p = (window as any).__pwaGestionPrompt;
    }
    if (!p) { setEtat("manuel"); return; }
    try {
      await p.prompt();
      const { outcome } = await p.userChoice;
      if (outcome === "accepted") {
        const key = getTenantStorageKey();
        if (key) localStorage.setItem(key, "1");
        setEtat("installee");
      } else setEtat("");
    } catch {
      setEtat("manuel");
    } finally {
      setPrompt(null);
      (window as any).__pwaGestionPrompt = null;
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) setOuvert(false); }}>
      <div style={{ background: "white", borderRadius: "24px 24px 0 0", padding: "28px 24px 36px", width: "100%", maxWidth: 480, boxShadow: "0 -8px 40px rgba(0,0,0,0.22)", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          {logoUrl
            ? <img src={logoUrl} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "contain", background: "#fff", border: "1px solid #e2e8f0" }} />
            : <div style={{ width: 56, height: 56, borderRadius: 12, background: themeColor, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800 }}>{((name || "").trim()[0] || "•").toUpperCase()}</div>}
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Installer {name || "l'application"}</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>L'icône apparaîtra sur votre écran d'accueil</div>
          </div>
        </div>
        {etat === "installee" ? (
          <p style={{ fontSize: 14, fontWeight: 700, color: "#166534", margin: "0 0 12px" }}>✅ Application installée — ouvrez-la depuis son icône sur l'écran d'accueil.</p>
        ) : etat === "manuel" ? (
          <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.7, marginBottom: 12 }}>
            {isAndroid() && !estOngletChrome() && (
              <a href={lienOuvrirDansChrome(codeChrome)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: themeColor, color: "white", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none", marginBottom: 8 }}>
                🌐 Ouvrir dans Chrome
              </a>
            )}
            {estOngletChrome() && (
              <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Elle est peut-être déjà installée : cherchez son icône sur votre écran d'accueil. Sinon :</div>
            )}
            <div>1. Appuyez sur le menu <strong>⋮</strong> de Chrome (en haut à droite)</div>
            <div>2. Choisissez « <strong>Installer l'application</strong> » ou « <strong>Ajouter à l'écran d'accueil</strong> »</div>
            <div>3. Confirmez.</div>
            <div style={{ marginTop: 4, color: "#64748b" }}>Si le menu dit « Ouvrir l'application », elle est déjà installée : cherchez-la dans vos applications.</div>
          </div>
        ) : (
          <button onClick={installer} disabled={etat === "installation"} style={{ width: "100%", padding: 14, background: themeColor, color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer", marginBottom: 10, opacity: etat === "installation" ? 0.75 : 1 }}>
            {etat === "installation" ? "⏳ Installation…" : "📲 Installer maintenant"}
          </button>
        )}
        <button onClick={() => setOuvert(false)} style={{ width: "100%", padding: 12, background: "#f1f5f9", color: "#334155", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {etat === "installee" ? "Fermer" : "Plus tard"}
        </button>
      </div>
    </div>
  );
}

// ─── Message automatique : installer l'application Moftal ───────────────────
// Affiché tout seul à l'utilisateur connecté (2 fois au plus), sans qu'il ait à
// ouvrir les notifications. Ensuite, le bouton reste dans le panneau des notifications.
export function InvitationInstallerMoftal() {
  const [ouvert, setOuvert] = useState(false);
  const [etat, setEtat] = useState<"" | "installation" | "installee" | "manuel">("");

  useEffect(() => {
    // Jamais si Moftal est déjà sur le téléphone (app du site OU du Play Store)
    if (isGestionPage() || estEnModeApp() || localStorage.getItem("mainAppInstalled") === "1" || appPlayInstallee()) return;
    const cle = "installInvite_moftal";
    if (!invitationPossible(cle)) return;
    const minuterie = setTimeout(() => { noterInvitation(cle); setOuvert(true); }, 2500);
    const onInstalled = () => setOuvert(false);
    window.addEventListener("appinstalled", onInstalled);
    return () => { clearTimeout(minuterie); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (!ouvert) return null;

  const installer = async () => {
    setEtat("installation");
    let p = (window as any).__pwaInstallPrompt as BeforeInstallPromptEvent | null;
    for (let i = 0; !p && i < 10; i++) {
      await new Promise(r => setTimeout(r, 400));
      p = (window as any).__pwaInstallPrompt;
    }
    if (!p) { setEtat("manuel"); return; }
    try {
      await p.prompt();
      const { outcome } = await p.userChoice;
      if (outcome === "accepted") {
        localStorage.setItem("mainAppInstalled", "1");
        setEtat("installee");
      } else setEtat("");
    } catch {
      setEtat("manuel");
    } finally {
      (window as any).__pwaInstallPrompt = null;
    }
  };

  const ios = isIOS();
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) setOuvert(false); }}>
      <div style={{ background: "white", borderRadius: "24px 24px 0 0", padding: "28px 24px 36px", width: "100%", maxWidth: 480, boxShadow: "0 -8px 40px rgba(0,0,0,0.22)", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <img src="/logo-moftal.svg" alt="" style={{ width: 56, height: 56, borderRadius: 12 }} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Installer l'application Moftal</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>Gratuite — l'icône apparaîtra sur votre écran d'accueil</div>
          </div>
        </div>
        {etat === "installee" ? (
          <p style={{ fontSize: 14, fontWeight: 700, color: "#166534", margin: "0 0 12px" }}>✅ Application installée — ouvrez-la depuis son icône sur l'écran d'accueil.</p>
        ) : etat === "manuel" || (ios && etat === "") ? (
          <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.7, marginBottom: 12 }}>
            {ios ? (
              <>
                <div>1. Appuyez sur le bouton <strong>Partager ⎙</strong> en bas de Safari</div>
                <div>2. Choisissez « <strong>Sur l'écran d'accueil</strong> »</div>
                <div>3. Appuyez sur <strong>Ajouter</strong>.</div>
              </>
            ) : (
              <>
                <div>1. Ouvrez le menu <strong>⋮</strong> du navigateur</div>
                <div>2. Choisissez « <strong>Installer l'application</strong> » ou « <strong>Ajouter à l'écran d'accueil</strong> »</div>
                <div>3. Confirmez.</div>
              </>
            )}
          </div>
        ) : (
          <button onClick={installer} disabled={etat === "installation"} style={{ width: "100%", padding: 14, background: "#1a8f1a", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer", marginBottom: 10, opacity: etat === "installation" ? 0.75 : 1 }}>
            {etat === "installation" ? "⏳ Installation…" : "📲 Installer maintenant"}
          </button>
        )}
        <button onClick={() => setOuvert(false)} style={{ width: "100%", padding: 12, background: "#f1f5f9", color: "#334155", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {etat === "installee" ? "Fermer" : "Plus tard"}
        </button>
      </div>
    </div>
  );
}

// ─── Bouton installation app principale (page d'accueil) ────────────────────

function MainAppInstallButton({ variant = "icon" }: { variant?: "icon" | "banner" }) {
  const isBanner = variant === "banner";
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setInstalled(standalone);
    if (!standalone) reconcileInstalledFlag("mainAppInstalled", setInstalled);

    // Récupérer le prompt déjà capturé dans main.tsx
    const existing = (window as any).__pwaInstallPrompt;
    if (existing) setPrompt(existing);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaInstallPrompt = e;
      setPrompt(e as BeforeInstallPromptEvent);
      // Le navigateur propose d'installer → il ne considère pas l'app comme installée
      // (ex: elle a été désinstallée depuis la dernière visite). On corrige l'état local.
      localStorage.removeItem("mainAppInstalled");
      setInstalled(false);
    };
    const onReady = () => {
      const p = (window as any).__pwaInstallPrompt;
      if (p) setPrompt(p);
    };
    const onInstalled = () => {
      localStorage.setItem("mainAppInstalled", "1");
      setInstalled(true);
      setPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("pwa-prompt-ready", onReady);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("pwa-prompt-ready", onReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const [showHelpCard, setShowHelpCard] = useState(false);

  // Moftal déjà installée depuis le Play Store sur ce téléphone : on propose de
  // l'OUVRIR, jamais d'installer une deuxième fois la même application.
  const pkgPlay = appPlayInstallee();
  if (pkgPlay && !installed) {
    return (
      <a
        href={lienOuvrirAppPlay(pkgPlay)}
        title="Ouvrir l'application Moftal"
        aria-label="Ouvrir l'application Moftal"
        style={isBanner
          ? { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "#f0fdf4", borderBottom: "1px solid #f0f0f0", textDecoration: "none" }
          : { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, minWidth: 44, minHeight: 44, background: "#1a8f1a", color: "white", borderRadius: "50%", fontSize: 20, textDecoration: "none", boxShadow: "0 4px 14px rgba(26,143,26,0.35)" }}
      >
        {isBanner ? (
          <>
            <span style={{ fontSize: 22 }}>📱</span>
            <span>
              <span style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#166534" }}>Ouvrir l'application Moftal</span>
              <span style={{ display: "block", fontSize: 11, color: "#4b7c5c" }}>Déjà installée sur ce téléphone</span>
            </span>
          </>
        ) : "📱"}
      </a>
    );
  }

  if (installed) {
    if (!isBanner) return null;
    return (
      <div
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#f0fdf4", color: "#166534", borderBottom: "1px solid #f0f0f0" }}
      >
        <span style={{ fontSize: 18 }}>✅</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Application installée</span>
      </div>
    );
  }

  if (!prompt) {
    // Le navigateur n'a pas (encore) déclenché beforeinstallprompt — ça arrive souvent
    // (Chrome/Android sous certaines conditions, ou simplement pas encore prêt). On ne
    // masque jamais le bouton pour autant : on affiche des instructions manuelles, en
    // adaptant le texte selon l'appareil (iOS vs Android/desktop générique).
    const ios = isIOS();
    const steps = ios
      ? [
          { icon: "⎙", text: "Appuyez sur le bouton Partager en bas de Safari" },
          { icon: "＋", text: "Choisissez « Sur l'écran d'accueil »" },
          { icon: "✅", text: "Appuyez sur Ajouter — c'est fait !" },
        ]
      : [
          { icon: "⋮", text: "Ouvrez le menu de votre navigateur (en haut ou en bas de l'écran)" },
          { icon: "＋", text: "Choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil »" },
          { icon: "✅", text: "Confirmez — c'est fait !" },
        ];
    return (
      <>
        <button
          onClick={() => setShowHelpCard(true)}
          title="Installer l'application"
          aria-label="Installer l'application"
          style={isBanner
            ? { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "#f0fdf4", border: "none", borderBottom: "1px solid #f0f0f0", cursor: "pointer", textAlign: "left" }
            : { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, minWidth: 44, minHeight: 44, background: "#1a8f1a", color: "white", border: "none", borderRadius: "50%", fontSize: 20, cursor: "pointer", boxShadow: "0 4px 14px rgba(26,143,26,0.35)" }
          }
        >
          {isBanner ? (
            <>
              <span style={{ fontSize: 22 }}>📲</span>
              <span>
                <span style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#166534" }}>Installer l'application</span>
                <span style={{ display: "block", fontSize: 11, color: "#4b7c5c" }}>Application mobile gratuite</span>
              </span>
            </>
          ) : "📲"}
        </button>
        {showHelpCard && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) setShowHelpCard(false); }}>
            <div style={{ background: "white", borderRadius: "24px 24px 0 0", padding: "28px 24px 36px", width: "100%", maxWidth: 480, boxShadow: "0 -8px 40px rgba(0,0,0,0.22)" }}>
              <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 2, margin: "0 auto 24px" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                <img src="/logo-moftal.svg" alt="" style={{ width: 56, height: 56, borderRadius: 12 }} />
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>Installer Moftal</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>Application mobile gratuite</div>
                </div>
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>
                {ios ? "Installer sur iPhone / iPad :" : "Installer sur ce téléphone :"}
              </p>
              {steps.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: "#1a8f1a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, flexShrink: 0 }}>{s.icon}</div>
                  <span style={{ fontSize: 13, color: "#374151" }}>{s.text}</span>
                </div>
              ))}
              <button onClick={() => setShowHelpCard(false)} style={{ width: "100%", marginTop: 16, padding: "14px", background: "#1a8f1a", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                J'ai compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  const handleInstall = async () => {
    setLoading(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        localStorage.setItem("mainAppInstalled", "1");
        setInstalled(true);
      }
    } finally {
      setPrompt(null);
      (window as any).__pwaInstallPrompt = null;
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleInstall}
        disabled={loading}
        title={loading ? "Installation…" : "Installer l'application"}
        aria-label={loading ? "Installation…" : "Installer l'application"}
        style={isBanner
          ? { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "#f0fdf4", border: "none", borderBottom: "1px solid #f0f0f0", cursor: loading ? "default" : "pointer", textAlign: "left", opacity: loading ? 0.75 : 1 }
          : {
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 44, height: 44, minWidth: 44, minHeight: 44,
              background: "#1a8f1a", color: "white",
              border: "none", borderRadius: "50%",
              fontSize: 20, cursor: "pointer",
              boxShadow: "0 4px 14px rgba(26,143,26,0.35)",
              opacity: loading ? 0.75 : 1,
            }
        }
      >
        {isBanner ? (
          <>
            <span style={{ fontSize: 22 }}>{loading ? "⏳" : "📲"}</span>
            <span>
              <span style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#166534" }}>
                {loading ? "Installation…" : "Installer l'application"}
              </span>
              <span style={{ display: "block", fontSize: 11, color: "#4b7c5c" }}>Application mobile gratuite</span>
            </span>
          </>
        ) : (loading ? "⏳" : "📲")}
      </button>
      {loading && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#1e293b", color: "white", padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "moftal-spin 0.8s linear infinite" }} />
          ⏳ Installation en cours…
        </div>
      )}
      <style>{`@keyframes moftal-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

// ─── Bouton installation gestion interne (espace professionnel) ─────────────

function GestionInstallButton({ name, logoUrl, themeColor, label }: {
  name?: string; logoUrl?: string; themeColor: string; label?: string;
}) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  // true = on tourne DANS l'app installée de cette gestion (certitude)
  const [dansLApp, setDansLApp] = useState(false);
  // true = le téléphone confirme que l'app est sur l'écran d'accueil
  const [dejaSurEcran, setDejaSurEcran] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const STORAGE_KEY = getTenantStorageKey();
  const android = isAndroid();
  const codeChrome = useCodeChrome(showToast && android);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    // L'app d'une gestion s'ouvre sur gestions.moftal.com ; en mode app sur
    // moftal.com, c'est l'app Moftal principale, pas celle de la gestion.
    // Une gestion ouverte depuis l'app Moftal s'affiche dans la fenêtre de Moftal
    // (donc aussi en mode app) : ce n'est pas l'app de la gestion.
    const h = window.location.hostname;
    let depuisMoftal = false;
    try { depuisMoftal = sessionStorage.getItem("gestionOuverteDepuisMoftal") === "1"; } catch { /* ignore */ }
    const appGestion = standalone && !depuisMoftal && (h.startsWith("gestions.") || !/moftal\.com$/.test(h));
    setDansLApp(appGestion);

    // Le navigateur propose l'installation → l'app N'EST PAS installée
    const existing = (window as any).__pwaGestionPrompt;
    if (existing) {
      setPrompt(existing);
      if (STORAGE_KEY) localStorage.removeItem(STORAGE_KEY);
    }
    // On n'affirme « installée » que si c'est certain (dans l'app, ou confirmé par
    // le téléphone plus bas) — jamais sur la seule foi d'une note locale.
    setInstalled(appGestion);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaGestionPrompt = e;
      setPrompt(e as BeforeInstallPromptEvent);
      if (STORAGE_KEY) localStorage.removeItem(STORAGE_KEY);
      setInstalled(false);
    };
    const onReady = () => {
      const p = (window as any).__pwaGestionPrompt;
      if (p) {
        setPrompt(p);
        if (STORAGE_KEY) localStorage.removeItem(STORAGE_KEY);
        setInstalled(false);
      }
    };

    // Demande au téléphone si CETTE app de gestion est sur l'écran d'accueil
    // (Chrome Android ; le manifest de la gestion la déclare dans
    // related_applications). Réponse positive = certitude : installée.
    const nav = navigator as any;
    if (!appGestion && typeof nav.getInstalledRelatedApps === "function") {
      nav.getInstalledRelatedApps()
        .then((apps: any[]) => {
          // Chrome ne renvoie que les apps déclarées par le manifest de cette gestion
          const trouvee = (apps || []).some(a => a.platform === "webapp");
          if (trouvee) {
            if (STORAGE_KEY) localStorage.setItem(STORAGE_KEY, "1");
            setInstalled(true);
            setDejaSurEcran(true);
          }
        })
        .catch(() => {});
    }

    // (Plus d'écoute de « appinstalled » ici : cet événement arrive aussi quand on
    // installe l'app Moftal principale, ce qui marquait à tort la gestion installée.
    // L'installation n'est notée que si l'utilisateur accepte NOTRE demande.)
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("pwa-prompt-ready", onReady);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("pwa-prompt-ready", onReady);
    };
  }, []);

  const handleInstall = async () => {
    if (!prompt) {
      // Android, hors d'un vrai onglet Chrome (app Moftal, WhatsApp, Facebook…) :
      // l'installation n'est possible que dans Chrome → on l'ouvre directement,
      // session transmise, et l'installation s'y propose toute seule.
      if (isAndroid() && !estOngletChrome()) {
        setInstalling(true);
        const code = await demanderCodeOuverture();
        window.location.href = lienOuvrirDansChrome(code);
        setTimeout(() => setInstalling(false), 4000);
        return;
      }
      // Sinon (pas encore prêt, iPhone…) : on explique comment faire.
      setShowToast(v => !v);
      return;
    }
    setInstalling(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        if (STORAGE_KEY) localStorage.setItem(STORAGE_KEY, "1");
        setInstalled(true);
        setDejaSurEcran(true);
      }
    } finally {
      setPrompt(null);
      (window as any).__pwaGestionPrompt = null;
      setInstalling(false);
    }
  };

  if (installed && dejaSurEcran && !dansLApp) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#166534" }}>
        ✅ Application installée sur votre écran d'accueil — ouvrez-la depuis l'icône.
      </span>
    );
  }
  if (installed && dansLApp) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#166534" }}>
        ✅ Application installée
      </span>
    );
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      <button
        onClick={handleInstall}
        disabled={installing}
        style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", background: themeColor, color: "white", border: "none", borderRadius: 10, cursor: installing ? "default" : "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.18)", opacity: installing ? 0.75 : 1 }}
      >
        <span style={{ fontSize: 16 }}>{installing ? "⏳" : "📲"}</span>
        {installing ? "Installation…" : (label || "Installer")}
      </button>
      {showToast && (
        <div style={{ flexBasis: "100%", marginTop: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, color: "#334155", lineHeight: 1.6 }}>
          {android && (
            <>
              <strong>Pour installer, ouvrez cette page dans Chrome.</strong>
              <div style={{ margin: "4px 0 8px" }}>
                Ici (fenêtre avec une croix ✕ en haut), le téléphone ne permet pas d'installer.
              </div>
              <a
                href={lienOuvrirDansChrome(codeChrome)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: themeColor, color: "white", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none", marginBottom: 8 }}
              >
                🌐 Ouvrir dans Chrome
              </a>
              <div>Chrome s'ouvre et propose tout de suite d'installer l'application.</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>Si rien ne s'ouvre :</div>
            </>
          )}
          {!android && <strong>Le téléphone n'a pas ouvert l'installation. Faites-le à la main :</strong>}
          <div>1. Menu <strong>⋮</strong> du navigateur (en haut à droite)</div>
          {android && <div>2. Si vous voyez « <strong>Ouvrir dans Chrome</strong> », choisissez-le, puis rouvrez le menu <strong>⋮</strong></div>}
          <div>{android ? "3" : "2"}. « <strong>Installer l'application</strong> » ou « <strong>Ajouter à l'écran d'accueil</strong> »</div>
          <div>{android ? "4" : "3"}. Confirmez. L'icône avec votre logo apparaît sur l'écran d'accueil.</div>
          <div style={{ marginTop: 4, color: "#64748b" }}>Si le menu dit « Ouvrir l'application », elle est déjà installée : cherchez-la dans la liste de vos applications.</div>
        </div>
      )}
      {installing && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#1e293b", color: "white", padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "moftal-spin 0.8s linear infinite" }} />
          ⏳ Installation en cours…
        </div>
      )}
      <style>{`@keyframes moftal-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}


// ─── Moftal installée deux fois sur le même téléphone ───────────────────────
// (installations faites avant cette vérification) : on le dit une fois, avec la
// marche à suivre — une application ne peut pas en supprimer une autre.
export function AvertissementDoubleInstallation() {
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => {
    if (isGestionPage() || !estEnModeApp()) return;
    const double = estDansAppPlay() ? appSiteInstallee() : !!appPlayInstallee();
    if (!double) return;
    try {
      const vu = Number(localStorage.getItem("moftalDoubleVu") || 0);
      if (Date.now() - vu < 30 * 24 * 3600 * 1000) return;
    } catch { return; }
    const t = setTimeout(() => setOuvert(true), 3000);
    return () => clearTimeout(t);
  }, []);
  if (!ouvert) return null;
  const fermer = () => { try { localStorage.setItem("moftalDoubleVu", String(Date.now())); } catch { /* */ } setOuvert(false); };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) fermer(); }}>
      <div style={{ background: "white", borderRadius: "24px 24px 0 0", padding: "28px 24px 32px", width: "100%", maxWidth: 480, boxShadow: "0 -8px 40px rgba(0,0,0,0.22)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <img src="/logo-moftal.svg" alt="" style={{ width: 52, height: 52, borderRadius: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Moftal est installée deux fois</div>
        </div>
        <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, margin: "0 0 10px" }}>
          Ce téléphone a deux icônes Moftal (celle du Play Store et celle du site). Une seule suffit :
          vos données sont les mêmes dans les deux.
        </p>
        <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.7, marginBottom: 14 }}>
          <div>1. Sur l'écran d'accueil, <strong>appuyez longuement</strong> sur l'une des deux icônes Moftal</div>
          <div>2. Choisissez « <strong>Désinstaller</strong> » (ou « Supprimer »)</div>
          <div>3. Gardez l'autre — <strong>de préférence celle du Play Store</strong>, mise à jour automatiquement.</div>
        </div>
        <button onClick={fermer} style={{ width: "100%", padding: 14, background: "#1a8f1a", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
          J'ai compris
        </button>
      </div>
    </div>
  );
}
