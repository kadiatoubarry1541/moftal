import { useEffect, useState } from "react";

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
  // utilisée dans le panneau de notifications)
  variant?: "icon" | "banner";
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

// ─── Composant ──────────────────────────────────────────────────────────────

export default function InstallAppButton({ name, logoUrl, themeColor, color, label, variant = "icon" }: Props = {}) {

  const onGestionPage = isGestionPage();

  // ══════════════════════════════════════════════════════════════════════════
  // MODE 1 — PAGE D'ACCUEIL : installer l'application Moftal principale
  // ══════════════════════════════════════════════════════════════════════════
  if (!onGestionPage) {
    return <MainAppInstallButton variant={variant} />;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODE 2 — GESTION INTERNE : installer l'espace de gestion du professionnel
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <GestionInstallButton
      name={name}
      logoUrl={logoUrl}
      themeColor={themeColor || color || "#1d4ed8"}
      label={label}
    />
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
  );
}

// ─── Bouton installation gestion interne (espace professionnel) ─────────────

function GestionInstallButton({ name, logoUrl, themeColor, label }: {
  name?: string; logoUrl?: string; themeColor: string; label?: string;
}) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isInsidePWA, setIsInsidePWA] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const STORAGE_KEY = getTenantStorageKey();

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInsidePWA(standalone);

    const alreadyInstalled = STORAGE_KEY ? localStorage.getItem(STORAGE_KEY) === "1" : false;
    setInstalled(alreadyInstalled);
    // Pas de reconcileInstalledFlag ici : le manifest de chaque tenant est généré
    // dynamiquement (URL différente selon l'origine/le startUrl), donc getInstalledRelatedApps()
    // ne peut pas s'y référencer de façon fiable. On se fie uniquement à la réapparition
    // d'un beforeinstallprompt (juste en dessous) pour détecter une désinstallation.

    const existing = (window as any).__pwaGestionPrompt;
    if (existing) setPrompt(existing);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaGestionPrompt = e;
      setPrompt(e as BeforeInstallPromptEvent);
      // Le navigateur propose d'installer → il ne considère pas cette espace comme
      // installé (ex: désinstallé depuis la dernière visite). On corrige l'état local.
      if (STORAGE_KEY) localStorage.removeItem(STORAGE_KEY);
      setInstalled(false);
    };
    const onReady = () => {
      const p = (window as any).__pwaGestionPrompt;
      if (p) setPrompt(p);
    };
    const onInstalled = () => {
      if (STORAGE_KEY) localStorage.setItem(STORAGE_KEY, "1");
      setInstalled(true);
      setPrompt(null);
      (window as any).__pwaGestionPrompt = null;
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

  const handleInstall = async () => {
    if (!prompt) {
      // Prompt pas encore prêt : ouvrir un nouvel onglet pour forcer Chrome à proposer l'install
      if (isInsidePWA) { window.open(window.location.href, '_blank'); return; }
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
      return;
    }
    setInstalling(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        if (STORAGE_KEY) localStorage.setItem(STORAGE_KEY, "1");
        setInstalled(true);
      }
    } finally {
      setPrompt(null);
      (window as any).__pwaGestionPrompt = null;
      setInstalling(false);
    }
  };

  if (installed) {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#f0fdf4", color: "#166534", border: "1.5px solid #bbf7d0", borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
          <span style={{ fontSize: 15 }}>✅</span> Application installée
        </div>
        <BackToMoftalBadge />
      </div>
    );
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={handleInstall}
        disabled={installing}
        style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", background: themeColor, color: "white", border: "none", borderRadius: 10, cursor: installing ? "default" : "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.18)", opacity: installing ? 0.75 : 1 }}
      >
        <span style={{ fontSize: 16 }}>{installing ? "⏳" : "📲"}</span>
        {installing ? "Installation…" : (label || "Installer")}
      </button>
      <BackToMoftalBadge />
      {showToast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#1e293b", color: "white", padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap" }}>
          📲 Appuyez sur l'icône d'installation dans la barre du navigateur
        </div>
      )}
    </div>
  );
}
