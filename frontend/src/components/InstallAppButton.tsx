import { useEffect, useState } from "react";
import { demanderCodeOuverture } from "../utils/codeOuverture";
import { setProBrand } from "./proBrand";
import { synchroniserIconeApp } from "../utils/appIcon";
import { appPlayInstallee, appSiteInstallee, estDansAppPlay, lienOuvrirAppPlay } from "../utils/appMoftalInstallee";
import { useTraduction } from "../i18n/traduction";

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

// Texte traduit avec des passages en gras marqués **ainsi** (les consignes
// d'installation gardent leurs mots en gras dans les deux langues).
function gras(texte: string) {
  return texte.split("**").map((morceau, i) => (i % 2 ? <strong key={i}>{morceau}</strong> : morceau));
}

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

// Sur iPhone, seuls Safari (et, depuis iOS 16.4, Chrome / Edge) savent mettre
// une page sur l'écran d'accueil, par le bouton Partager. Les fenêtres intégrées
// (autres applications, app Moftal…) ne le permettent jamais.
function estNavigateurIntegreIOS() {
  return isIOS() && /FBAN|FBAV|Instagram|WhatsApp|Line\/|; wv\)|GSA\//.test(navigator.userAgent);
}

function estAutreNavigateurIOS() {
  return isIOS() && /CriOS|EdgiOS|FxiOS|OPiOS/.test(navigator.userAgent);
}

// Marche à suivre sur iPhone / iPad (aucune installation automatique possible :
// Apple ne propose pas de bouton « Installer » aux sites).
function ConsignesIPhone({ couleur }: { couleur: string }) {
  const { tr } = useTraduction();
  const integre = estNavigateurIntegreIOS();
  const autre = estAutreNavigateurIOS();
  return (
    <>
      {integre && (<>
        <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{tr("Ici, l'iPhone ne permet pas d'installer. Ouvrez la page dans Safari :")}</div>
        <BoutonCopierLien couleur={couleur} />
        <div style={{ color: "#64748b", marginBottom: 6 }}>{tr("Copiez le lien, ouvrez Safari, collez-le dans la barre d'adresse, connectez-vous, puis :")}</div>
      </>)}
      {autre ? (<>
        <div>{gras(tr("1. Appuyez sur le bouton **Partager ⎙** (dans la barre d'adresse, ou dans le menu **•••**)"))}</div>
        <div>{gras(tr("2. Faites défiler et choisissez « **Sur l'écran d'accueil** »"))}</div>
        <div>{gras(tr("3. Appuyez sur **Ajouter**."))}</div>
        <div style={{ marginTop: 4, color: "#64748b" }}>{tr("Si « Sur l'écran d'accueil » n'apparaît pas, ouvrez la page dans Safari et recommencez.")}</div>
      </>) : (<>
        <div>{gras(tr("1. Appuyez sur le bouton **Partager ⎙** en bas de Safari"))}</div>
        <div>{gras(tr("2. Faites défiler et choisissez « **Sur l'écran d'accueil** »"))}</div>
        <div>{gras(tr("3. Appuyez sur **Ajouter**."))}</div>
      </>)}
      <div style={{ marginTop: 4, color: "#64748b" }}>{tr("Le bouton Partager est caché ? Touchez le bas de l'écran ou faites défiler un peu vers le haut.")}</div>
    </>
  );
}

// Ordinateur (ni téléphone ni tablette) : l'installation se fait par le menu
// du navigateur, et seuls certains navigateurs savent installer une application.
function estOrdinateur() {
  return !isIOS() && !/Android|Mobi|Tablet/i.test(navigator.userAgent);
}

function ConsignesOrdinateur({ couleur }: { couleur: string }) {
  const { tr } = useTraduction();
  const ua = navigator.userAgent;
  const edge = /Edg\//.test(ua);
  const chrome = !edge && /Chrome\//.test(ua) && !/OPR\/|Opera|YaBrowser|SamsungBrowser/.test(ua);
  if (!edge && !chrome) return (
    <>
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{tr("Ce navigateur ne sait pas installer d'application sur l'ordinateur.")}</div>
      <div>{gras(tr("1. Copiez le lien ci-dessous"))}</div>
      <BoutonCopierLien couleur={couleur} />
      <div>{gras(tr("2. Ouvrez **Microsoft Edge** (déjà présent sur Windows) ou **Google Chrome**, collez le lien dans la barre d'adresse et connectez-vous"))}</div>
      <div>{gras(tr("3. Cliquez de nouveau sur « **Installer l'application** »"))}</div>
    </>
  );
  return (
    <>
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{tr("Sur l'ordinateur, installez-la par le navigateur :")}</div>
      {edge ? (<>
        <div>{gras(tr("1. Cliquez sur le menu **⋯** en haut à droite"))}</div>
        <div>{gras(tr("2. Choisissez « **Applications** », puis « **Installer ce site en tant qu'application** »"))}</div>
      </>) : (<>
        <div>{gras(tr("1. Cliquez sur l'icône **d'installation** (un écran avec une flèche) à droite de la barre d'adresse"))}</div>
        <div style={{ color: "#64748b" }}>{gras(tr("(Pas d'icône ? Menu **⋮** → « **Caster, enregistrer et partager** » → « **Installer la page en tant qu'application** »)"))}</div>
      </>)}
      <div>{gras(tr("{n}. Cliquez sur « **Installer** ». L'application s'ouvre dans sa propre fenêtre, avec votre logo, et une icône est ajoutée au bureau et au menu Démarrer.", { n: edge ? 3 : 2 }))}</div>
      <div style={{ marginTop: 4, color: "#64748b" }}>{tr("Si le menu propose « Ouvrir dans l'application », elle est déjà installée.")}</div>
    </>
  );
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

// Vrai onglet Chrome sur Android (pas l'app Moftal ni une autre application,
// ni un autre navigateur) : le seul endroit où le téléphone propose d'installer.
function estOngletChrome() {
  const ua = navigator.userAgent;
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  return isAndroid() && /Chrome\//.test(ua) && !/; wv\)|FBAN|FBAV|Instagram|SamsungBrowser|EdgA|OPR\/|MiuiBrowser/.test(ua) && !standalone;
}

// Lien Android qui rouvre la page actuelle dans Chrome lui-même. Une gestion ouverte
// depuis l'app Moftal (ou depuis une autre application) s'affiche dans une fenêtre
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

// Essaie d'ouvrir la gestion dans Chrome. Vrai si le téléphone a bien quitté
// la page ; faux si rien ne s'est ouvert (Chrome absent ou désactivé, app
// qui bloque le lien…) : on montre alors une autre solution, jamais un
// bouton qui tourne sans rien faire.
async function essayerOuvrirChrome(): Promise<boolean> {
  const code = await Promise.race([
    demanderCodeOuverture(),
    new Promise<null>(r => setTimeout(() => r(null), 4000)),
  ]);
  let parti = false;
  const onCache = () => { if (document.hidden) parti = true; };
  document.addEventListener("visibilitychange", onCache);
  window.addEventListener("pagehide", onCache);
  window.location.href = lienOuvrirDansChrome(code);
  await new Promise(r => setTimeout(r, 2500));
  document.removeEventListener("visibilitychange", onCache);
  window.removeEventListener("pagehide", onCache);
  return parti || document.hidden;
}

// Adresse de la gestion à coller dans Chrome (sans aucun code de session)
function lienGestionACopier() {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?installer=1`;
}

function BoutonCopierLien({ couleur }: { couleur: string }) {
  const { tr } = useTraduction();
  const [copie, setCopie] = useState(false);
  const copier = async () => {
    const lien = lienGestionACopier();
    try { await navigator.clipboard.writeText(lien); setCopie(true); }
    catch { window.prompt(tr("Copiez ce lien :"), lien); }
  };
  return (
    <button type="button" onClick={copier}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "white", color: couleur, border: `1.5px solid ${couleur}`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 8, marginInlineStart: 6 }}>
      {copie ? tr("✅ Lien copié") : tr("📋 Copier le lien")}
    </button>
  );
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

// Demande au navigateur (Chrome/Edge/Android uniquement — API absente sur iOS
// Safari et Firefox) si l'app est installée. Une réponse positive confirme la note
// « installée ». Une réponse vide ne l'efface PAS : ce navigateur ne voit souvent
// pas l'app installée, et effacer la note faisait revenir le bouton « Installer »,
// d'où des installations en double. Si l'app a vraiment été désinstallée, le
// navigateur propose à nouveau l'installation (beforeinstallprompt) et la note est
// effacée à ce moment-là.
export async function reconcileInstalledFlag(storageKey: string | null, setInstalled: (v: boolean) => void) {
  if (!storageKey) return;
  const nav = navigator as any;
  if (typeof nav.getInstalledRelatedApps !== "function") return;
  try {
    const related = await nav.getInstalledRelatedApps();
    if (related && related.length > 0) {
      localStorage.setItem(storageKey, "1");
      setInstalled(true);
    }
  } catch { /* silencieux */ }
}

// Moftal (l'app principale) ne s'installe que depuis moftal.com, et une gestion
// que depuis gestions.moftal.com : la même page installée depuis deux adresses
// fait deux applications différentes sur le téléphone.
function surDomaineGestions() {
  return window.location.hostname.startsWith("gestions.");
}
function surSiteMoftal() {
  return /(^|\.)moftal\.com$/.test(window.location.hostname) && !surDomaineGestions();
}
// Adresse de la gestion sur gestions.moftal.com, pour l'installer au bon endroit
async function ouvrirGestionPourInstaller() {
  const m = window.location.pathname.match(/^\/gestion-[^/]+\/[^/]+/);
  if (!m) return;
  const code = await Promise.race([demanderCodeOuverture(), new Promise<null>(r => setTimeout(() => r(null), 4000))]);
  const q = new URLSearchParams({ installer: "1" });
  if (code) q.set("_c", code);
  window.location.href = `https://gestions.moftal.com${m[0]}?${q.toString()}`;
}

// Petit logo Moftal cliquable pour revenir au site principal — jamais un bouton de
// navigation complet : chaque app (Gestion Interne, IA Education, Info Moftal) reste
// une app à part entière.
export function BackToMoftalBadge() {
  const { tr } = useTraduction();
  return (
    <a
      href="https://moftal.com/"
      title={tr("Retour au site principal Moftal")}
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
  // Sur gestions.moftal.com (connexion…), jamais l'installation de Moftal
  if (!onGestionPage && surDomaineGestions()) return null;

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
  // iPhone : nom affiché sous l'icône ajoutée à l'écran d'accueil
  useEffect(() => {
    if (!name) return;
    let meta = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null;
    if (!meta) { meta = document.createElement("meta"); meta.name = "apple-mobile-web-app-title"; document.head.appendChild(meta); }
    meta.content = name;
  }, [name]);
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
  const { tr } = useTraduction();
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
      if (!cleInvitation || dejaInstallee || surSiteMoftal() || !invitationPossible(cleInvitation)) return;
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
    // Hors d'un vrai onglet Chrome (app Moftal ou autre application) : on ouvre Chrome directement
    if (!p && isAndroid() && !estOngletChrome()) {
      const parti = await essayerOuvrirChrome();
      setEtat(parti ? "" : "manuel");
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
      <div style={{ background: "white", borderRadius: "24px 24px 0 0", padding: "28px 24px 36px", width: "100%", maxWidth: 480, boxShadow: "0 -8px 40px rgba(0,0,0,0.22)", textAlign: "start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          {logoUrl
            ? <img src={logoUrl} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "contain", background: "#fff", border: "1px solid #e2e8f0" }} />
            : <div style={{ width: 56, height: 56, borderRadius: 12, background: themeColor, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800 }}>{((name || "").trim()[0] || "•").toUpperCase()}</div>}
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{name ? tr("Installer {nom}", { nom: name }) : tr("Installer l'application")}</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>{tr("L'icône apparaîtra sur votre écran d'accueil")}</div>
          </div>
        </div>
        {etat === "installee" ? (
          <p style={{ fontSize: 14, fontWeight: 700, color: "#166534", margin: "0 0 12px" }}>{tr("✅ Application installée — son icône apparaît sur l'écran d'accueil (cela peut prendre une minute). Ne l'installez pas une deuxième fois.")}</p>
        ) : isIOS() ? (
          <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.7, marginBottom: 12 }}>
            <ConsignesIPhone couleur={themeColor} />
          </div>
        ) : etat === "manuel" && estOrdinateur() ? (
          <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.7, marginBottom: 12 }}>
            <ConsignesOrdinateur couleur={themeColor} />
          </div>
        ) : etat === "manuel" ? (
          <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.7, marginBottom: 12 }}>
            {isAndroid() && !estOngletChrome() && (<>
              <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{tr("Ici, le téléphone ne permet pas d'installer. Ouvrez la gestion dans Chrome :")}</div>
              <a href={lienOuvrirDansChrome(codeChrome)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: themeColor, color: "white", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none", marginBottom: 8 }}>
                {tr("🌐 Ouvrir dans Chrome")}
              </a>
              <BoutonCopierLien couleur={themeColor} />
              <div style={{ color: "#64748b", marginBottom: 6 }}>{tr("Si Chrome ne s'ouvre pas : copiez le lien, ouvrez Chrome, collez-le dans la barre d'adresse, connectez-vous, puis :")}</div>
            </>)}
            {estOngletChrome() && (
              <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{tr("Elle est peut-être déjà installée : cherchez son icône sur votre écran d'accueil. Sinon :")}</div>
            )}
            <div>{gras(tr("1. Appuyez sur le menu **⋮** de Chrome (en haut à droite)"))}</div>
            <div>{gras(tr("2. Choisissez « **Installer l'application** » (ou « **Ajouter à l'écran d'accueil** » puis « **Installer** ») — jamais « Créer un raccourci », qui fait une icône en double"))}</div>
            <div>{tr("3. Confirmez.")}</div>
            <div style={{ marginTop: 4, color: "#64748b" }}>{tr("Si le menu dit « Ouvrir l'application », elle est déjà installée : cherchez-la dans vos applications.")}</div>
          </div>
        ) : (
          <button onClick={installer} disabled={etat === "installation"} style={{ width: "100%", padding: 14, background: themeColor, color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer", marginBottom: 10, opacity: etat === "installation" ? 0.75 : 1 }}>
            {etat === "installation" ? tr("⏳ Installation…") : tr("📲 Installer maintenant")}
          </button>
        )}
        <button onClick={() => setOuvert(false)} style={{ width: "100%", padding: 12, background: "#f1f5f9", color: "#334155", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {etat === "installee" ? tr("Fermer") : tr("Plus tard")}
        </button>
      </div>
    </div>
  );
}

// ─── Message automatique : installer l'application Moftal ───────────────────
// Affiché tout seul à l'utilisateur connecté (2 fois au plus), sans qu'il ait à
// ouvrir les notifications. Ensuite, le bouton reste dans le panneau des notifications.
export function InvitationInstallerMoftal() {
  const { tr } = useTraduction();
  const [ouvert, setOuvert] = useState(false);
  const [etat, setEtat] = useState<"" | "installation" | "installee" | "manuel">("");

  useEffect(() => {
    // Jamais si Moftal est déjà sur le téléphone (app du site OU du Play Store)
    if (isGestionPage() || surDomaineGestions() || estEnModeApp() || localStorage.getItem("mainAppInstalled") === "1" || appPlayInstallee()) return;
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
      <div style={{ background: "white", borderRadius: "24px 24px 0 0", padding: "28px 24px 36px", width: "100%", maxWidth: 480, boxShadow: "0 -8px 40px rgba(0,0,0,0.22)", textAlign: "start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <img src="/logo-moftal.svg" alt="" style={{ width: 56, height: 56, borderRadius: 12 }} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{tr("Installer l'application Moftal")}</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>{tr("Gratuite — l'icône apparaîtra sur votre écran d'accueil")}</div>
          </div>
        </div>
        {etat === "installee" ? (
          <p style={{ fontSize: 14, fontWeight: 700, color: "#166534", margin: "0 0 12px" }}>{tr("✅ Application installée — son icône apparaît sur l'écran d'accueil (cela peut prendre une minute). Ne l'installez pas une deuxième fois.")}</p>
        ) : etat === "manuel" || (ios && etat === "") ? (
          <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.7, marginBottom: 12 }}>
            {ios ? (
              <>
                <div>{gras(tr("1. Appuyez sur le bouton **Partager ⎙** en bas de Safari"))}</div>
                <div>{gras(tr("2. Choisissez « **Sur l'écran d'accueil** »"))}</div>
                <div>{gras(tr("3. Appuyez sur **Ajouter**."))}</div>
              </>
            ) : (
              <>
                <div>{gras(tr("1. Ouvrez le menu **⋮** du navigateur"))}</div>
                <div>{gras(tr("2. Choisissez « **Installer l'application** » (ou « **Ajouter à l'écran d'accueil** » puis « **Installer** ») — jamais « Créer un raccourci », qui fait une icône en double"))}</div>
                <div>{tr("3. Confirmez.")}</div>
              </>
            )}
          </div>
        ) : (
          <button onClick={installer} disabled={etat === "installation"} style={{ width: "100%", padding: 14, background: "#1a8f1a", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer", marginBottom: 10, opacity: etat === "installation" ? 0.75 : 1 }}>
            {etat === "installation" ? tr("⏳ Installation…") : tr("📲 Installer maintenant")}
          </button>
        )}
        <button onClick={() => setOuvert(false)} style={{ width: "100%", padding: 12, background: "#f1f5f9", color: "#334155", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {etat === "installee" ? tr("Fermer") : tr("Plus tard")}
        </button>
      </div>
    </div>
  );
}

// ─── Bouton installation app principale (page d'accueil) ────────────────────

function MainAppInstallButton({ variant = "icon" }: { variant?: "icon" | "banner" }) {
  const { tr } = useTraduction();
  const isBanner = variant === "banner";
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setInstalled(standalone || localStorage.getItem("mainAppInstalled") === "1");
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
        title={tr("Ouvrir l'application Moftal")}
        aria-label={tr("Ouvrir l'application Moftal")}
        style={isBanner
          ? { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "#f0fdf4", borderBottom: "1px solid #f0f0f0", textDecoration: "none" }
          : { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, minWidth: 44, minHeight: 44, background: "#1a8f1a", color: "white", borderRadius: "50%", fontSize: 20, textDecoration: "none", boxShadow: "0 4px 14px rgba(26,143,26,0.35)" }}
      >
        {isBanner ? (
          <>
            <span style={{ fontSize: 22 }}>📱</span>
            <span>
              <span style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#166534" }}>{tr("Ouvrir l'application Moftal")}</span>
              <span style={{ display: "block", fontSize: 11, color: "#4b7c5c" }}>{tr("Déjà installée sur ce téléphone")}</span>
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
        <span style={{ fontSize: 13, fontWeight: 700 }}>{tr("Application installée — ouvrez-la depuis son icône (elle peut mettre une minute à apparaître).")}</span>
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
          { icon: "⎙", text: tr("Appuyez sur le bouton Partager en bas de Safari") },
          { icon: "＋", text: tr("Choisissez « Sur l'écran d'accueil »") },
          { icon: "✅", text: tr("Appuyez sur Ajouter — c'est fait !") },
        ]
      : [
          { icon: "⋮", text: tr("Ouvrez le menu de votre navigateur (en haut ou en bas de l'écran)") },
          { icon: "＋", text: tr("Choisissez « Installer l'application » — jamais « Créer un raccourci », qui fait une icône en double") },
          { icon: "✅", text: tr("Confirmez — c'est fait !") },
        ];
    return (
      <>
        <button
          onClick={() => setShowHelpCard(true)}
          title={tr("Installer l'application")}
          aria-label={tr("Installer l'application")}
          style={isBanner
            ? { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "#f0fdf4", border: "none", borderBottom: "1px solid #f0f0f0", cursor: "pointer", textAlign: "start" }
            : { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, minWidth: 44, minHeight: 44, background: "#1a8f1a", color: "white", border: "none", borderRadius: "50%", fontSize: 20, cursor: "pointer", boxShadow: "0 4px 14px rgba(26,143,26,0.35)" }
          }
        >
          {isBanner ? (
            <>
              <span style={{ fontSize: 22 }}>📲</span>
              <span>
                <span style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#166534" }}>{tr("Installer l'application")}</span>
                <span style={{ display: "block", fontSize: 11, color: "#4b7c5c" }}>{tr("Application mobile gratuite")}</span>
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
                  <div style={{ fontSize: 17, fontWeight: 800 }}>{tr("Installer Moftal")}</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>{tr("Application mobile gratuite")}</div>
                </div>
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>
                {ios ? tr("Installer sur iPhone / iPad :") : tr("Installer sur ce téléphone :")}
              </p>
              {steps.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: "#1a8f1a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, flexShrink: 0 }}>{s.icon}</div>
                  <span style={{ fontSize: 13, color: "#374151" }}>{s.text}</span>
                </div>
              ))}
              <button onClick={() => setShowHelpCard(false)} style={{ width: "100%", marginTop: 16, padding: "14px", background: "#1a8f1a", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                {tr("J'ai compris")}
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
        title={loading ? tr("Installation…") : tr("Installer l'application")}
        aria-label={loading ? tr("Installation…") : tr("Installer l'application")}
        style={isBanner
          ? { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "#f0fdf4", border: "none", borderBottom: "1px solid #f0f0f0", cursor: loading ? "default" : "pointer", textAlign: "start", opacity: loading ? 0.75 : 1 }
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
                {loading ? tr("Installation…") : tr("Installer l'application")}
              </span>
              <span style={{ display: "block", fontSize: 11, color: "#4b7c5c" }}>{tr("Application mobile gratuite")}</span>
            </span>
          </>
        ) : (loading ? "⏳" : "📲")}
      </button>
      {loading && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#1e293b", color: "white", padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "moftal-spin 0.8s linear infinite" }} />
          {tr("⏳ Installation en cours…")}
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
  const { tr } = useTraduction();
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
    // Installée : dans l'app, ou notée sur ce téléphone lors de l'installation
    // (effacée dès que le navigateur propose à nouveau d'installer, plus haut et
    // dans onPrompt). Sans cette note, le bouton « Installer » revenait et l'on
    // installait la même gestion 2 ou 3 fois.
    const notee = !!STORAGE_KEY && localStorage.getItem(STORAGE_KEY) === "1" && !existing;
    setInstalled(appGestion || notee);
    setDejaSurEcran(notee);

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
    // Sur moftal.com : l'app de la gestion s'installe sur gestions.moftal.com
    if (surSiteMoftal()) { setInstalling(true); await ouvrirGestionPourInstaller(); setInstalling(false); return; }
    if (!prompt) {
      // Android, hors d'un vrai onglet Chrome (app Moftal ou autre application) :
      // l'installation n'est possible que dans Chrome → on l'ouvre directement,
      // session transmise, et l'installation s'y propose toute seule.
      if (isAndroid() && !estOngletChrome()) {
        setInstalling(true);
        const parti = await essayerOuvrirChrome();
        setInstalling(false);
        // Rien ne s'est ouvert : on explique tout de suite l'autre solution
        if (!parti) setShowToast(true);
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
        {tr("✅ Application déjà installée sur ce téléphone — ouvrez-la depuis son icône (elle peut mettre une minute à apparaître). Ne l'installez pas une deuxième fois.")}
      </span>
    );
  }
  if (installed && dansLApp) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#166534" }}>
        {tr("✅ Application installée")}
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
        {installing ? tr("Installation…") : (label || tr("Installer"))}
      </button>
      {showToast && (
        <div style={{ flexBasis: "100%", marginTop: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, color: "#334155", lineHeight: 1.6 }}>
          {android && (
            <>
              <strong>{tr("Pour installer, ouvrez cette page dans Chrome.")}</strong>
              <div style={{ margin: "4px 0 8px" }}>
                {tr("Ici (fenêtre avec une croix ✕ en haut), le téléphone ne permet pas d'installer.")}
              </div>
              <a
                href={lienOuvrirDansChrome(codeChrome)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: themeColor, color: "white", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none", marginBottom: 8 }}
              >
                {tr("🌐 Ouvrir dans Chrome")}
              </a>
              <BoutonCopierLien couleur={themeColor} />
              <div>{tr("Chrome s'ouvre et propose tout de suite d'installer l'application.")}</div>
              <div style={{ color: "#64748b" }}>{tr("Si Chrome ne s'ouvre pas : copiez le lien, ouvrez Chrome, collez-le dans la barre d'adresse et connectez-vous.")}</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>{tr("Si rien ne s'ouvre :")}</div>
            </>
          )}
          {isIOS() ? <ConsignesIPhone couleur={themeColor} /> : estOrdinateur() ? <ConsignesOrdinateur couleur={themeColor} /> : (<>
          {!android && <strong>{tr("Le téléphone n'a pas ouvert l'installation. Faites-le à la main :")}</strong>}
          <div>{gras(tr("1. Menu **⋮** du navigateur (en haut à droite)"))}</div>
          {android && <div>{gras(tr("2. Si vous voyez « **Ouvrir dans Chrome** », choisissez-le, puis rouvrez le menu **⋮**"))}</div>}
          <div>{gras(tr("{n}. « **Installer l'application** » (ou « **Ajouter à l'écran d'accueil** » puis « **Installer** ») — jamais « Créer un raccourci », qui fait une icône en double", { n: android ? 3 : 2 }))}</div>
          <div>{tr("{n}. Confirmez. L'icône avec votre logo apparaît sur l'écran d'accueil.", { n: android ? 4 : 3 })}</div>
          <div style={{ marginTop: 4, color: "#64748b" }}>{tr("Si le menu dit « Ouvrir l'application », elle est déjà installée : cherchez-la dans la liste de vos applications.")}</div>
          </>)}
        </div>
      )}
      {installing && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#1e293b", color: "white", padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "moftal-spin 0.8s linear infinite" }} />
          {tr("⏳ Installation en cours…")}
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
  const { tr } = useTraduction();
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
          <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{tr("Moftal est installée deux fois")}</div>
        </div>
        <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, margin: "0 0 10px" }}>
          {tr("Ce téléphone a deux icônes Moftal (celle du Play Store et celle du site). Une seule suffit : vos données sont les mêmes dans les deux.")}
        </p>
        <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.7, marginBottom: 14 }}>
          <div>{gras(tr("1. Sur l'écran d'accueil, **appuyez longuement** sur l'une des deux icônes Moftal"))}</div>
          <div>{gras(tr("2. Choisissez « **Désinstaller** » (ou « Supprimer »)"))}</div>
          <div>{gras(tr("3. Gardez l'autre — **de préférence celle du Play Store**, mise à jour automatiquement."))}</div>
        </div>
        <button onClick={fermer} style={{ width: "100%", padding: 14, background: "#1a8f1a", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
          {tr("J'ai compris")}
        </button>
      </div>
    </div>
  );
}
