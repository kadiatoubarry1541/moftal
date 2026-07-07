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
}

// ─── Utilitaires ────────────────────────────────────────────────────────────

function isGestionPage() {
  const p = window.location.pathname;
  return p.startsWith("/espace-pro/") || p.startsWith("/gestion-");
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

// ─── Composant ──────────────────────────────────────────────────────────────

export default function InstallAppButton({ name, logoUrl, themeColor, color, label }: Props = {}) {

  const onGestionPage = isGestionPage();

  // ══════════════════════════════════════════════════════════════════════════
  // MODE 1 — PAGE D'ACCUEIL : installer l'application Moftal principale
  // ══════════════════════════════════════════════════════════════════════════
  if (!onGestionPage) {
    return <MainAppInstallButton />;
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

function MainAppInstallButton() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setInstalled(standalone);

    // Récupérer le prompt déjà capturé dans main.tsx
    const existing = (window as any).__pwaInstallPrompt;
    if (existing) setPrompt(existing);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaInstallPrompt = e;
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onReady = () => {
      const p = (window as any).__pwaInstallPrompt;
      if (p) setPrompt(p);
    };
    const onInstalled = () => {
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

  const [showIOSCard, setShowIOSCard] = useState(false);

  if (installed) return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#f0fdf4", color: "#166534", border: "1.5px solid #bbf7d0", borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
      <span>✅</span> Application installée
    </div>
  );

  if (!prompt) {
    if (!isIOS()) return null;
    return (
      <>
        <button
          onClick={() => setShowIOSCard(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "#1a8f1a", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 14px rgba(26,143,26,0.35)" }}
        >
          <span style={{ fontSize: 20 }}>📲</span> Installer l'application
        </button>
        {showIOSCard && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) setShowIOSCard(false); }}>
            <div style={{ background: "white", borderRadius: "24px 24px 0 0", padding: "28px 24px 36px", width: "100%", maxWidth: 480, boxShadow: "0 -8px 40px rgba(0,0,0,0.22)" }}>
              <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 2, margin: "0 auto 24px" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                <img src="/logo-moftal.svg" alt="" style={{ width: 56, height: 56, borderRadius: 12 }} />
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>Installer Moftal</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>Application mobile gratuite</div>
                </div>
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Installer sur iPhone / iPad :</p>
              {[
                { icon: "⎙", text: "Appuyez sur le bouton Partager en bas de Safari" },
                { icon: "＋", text: "Choisissez « Sur l'écran d'accueil »" },
                { icon: "✅", text: "Appuyez sur Ajouter — c'est fait !" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: "#1a8f1a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, flexShrink: 0 }}>{s.icon}</div>
                  <span style={{ fontSize: 13, color: "#374151" }}>{s.text}</span>
                </div>
              ))}
              <button onClick={() => setShowIOSCard(false)} style={{ width: "100%", marginTop: 16, padding: "14px", background: "#1a8f1a", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
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
      if (outcome === "accepted") setInstalled(true);
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
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "12px 24px",
        background: "#1a8f1a", color: "white",
        border: "none", borderRadius: 12,
        fontSize: 15, fontWeight: 800, cursor: "pointer",
        boxShadow: "0 4px 14px rgba(26,143,26,0.35)",
        opacity: loading ? 0.75 : 1,
      }}
    >
      <span style={{ fontSize: 20 }}>{loading ? "⏳" : "📲"}</span>
      {loading ? "Installation…" : "Installer l'application"}
    </button>
  );
}

// ─── Carte installation gestion interne (espace professionnel) ──────────────

function GestionInstallButton({ name, logoUrl, themeColor, label }: {
  name?: string; logoUrl?: string; themeColor: string; label?: string;
}) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showCard, setShowCard] = useState(false);

  const STORAGE_KEY = getTenantStorageKey();
  const SHOWN_KEY   = getShownKey();
  const displayName = name || label || "votre espace pro";

  useEffect(() => {
    // Vérifier si déjà installé (uniquement via localStorage — jamais display-mode)
    const alreadyInstalled = STORAGE_KEY ? localStorage.getItem(STORAGE_KEY) === "1" : false;
    setInstalled(alreadyInstalled);

    // Récupérer le prompt de gestion (capturé dans main.tsx pour les pages gestion)
    const existing = (window as any).__pwaGestionPrompt;
    if (existing) setPrompt(existing);

    // Afficher la carte automatiquement à la 1ère visite
    if (!alreadyInstalled && SHOWN_KEY) {
      const shownAt = localStorage.getItem(SHOWN_KEY);
      const sept_jours = 7 * 24 * 60 * 60 * 1000;
      if (!shownAt || Date.now() - Number(shownAt) > sept_jours) {
        setTimeout(() => setShowCard(true), 1800);
      }
    }

    // Écouter les nouveaux prompts (si le manifest vient de se charger)
    const onPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaGestionPrompt = e;
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onReady = () => {
      const p = (window as any).__pwaGestionPrompt;
      if (p) setPrompt(p);
    };
    const onInstalled = () => {
      if (STORAGE_KEY) localStorage.setItem(STORAGE_KEY, "1");
      setInstalled(true);
      setShowCard(false);
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

  const dismissCard = () => {
    if (SHOWN_KEY) localStorage.setItem(SHOWN_KEY, String(Date.now()));
    setShowCard(false);
  };

  const handleInstall = async () => {
    if (!prompt) return;
    setInstalling(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        if (STORAGE_KEY) localStorage.setItem(STORAGE_KEY, "1");
        setInstalled(true);
        setShowCard(false);
      }
    } finally {
      setPrompt(null);
      (window as any).__pwaGestionPrompt = null;
      setInstalling(false);
    }
  };

  // Déjà installée → petit badge vert discret
  if (installed) {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#f0fdf4", color: "#166534", border: "1.5px solid #bbf7d0", borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
        <span style={{ fontSize: 15 }}>✅</span> Appli installée
      </div>
    );
  }

  return (
    <>
      {/* Petit bouton permanent dans le header */}
      <button
        onClick={() => prompt ? handleInstall() : setShowCard(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "8px 14px",
          background: themeColor, color: "white",
          border: "none", borderRadius: 10,
          cursor: "pointer", fontSize: 13, fontWeight: 700,
          whiteSpace: "nowrap", flexShrink: 0,
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        }}
      >
        <span style={{ fontSize: 16 }}>📲</span> Installer
      </button>

      {/* Carte d'installation (bottom sheet) */}
      {showCard && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget) dismissCard(); }}
        >
          <div style={{ background: "white", borderRadius: "24px 24px 0 0", padding: "28px 24px 36px", width: "100%", maxWidth: 480, boxShadow: "0 -8px 40px rgba(0,0,0,0.22)", animation: "slideUp 0.3s ease" }}>
            <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

            {/* Poignée */}
            <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 2, margin: "0 auto 24px" }} />

            {/* Logo + nom */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
              <div style={{ width: 68, height: 68, borderRadius: 16, overflow: "hidden", background: themeColor + "22", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${themeColor}44` }}>
                {logoUrl
                  ? <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 32 }}>🏢</span>
                }
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>{displayName}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>Votre application de gestion</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 3, background: "#1a8f1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 9, color: "white", fontWeight: 800 }}>M</span>
                  </div>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>Propulsé par Moftal</span>
                </div>
              </div>
            </div>

            {/* Info */}
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 14px", marginBottom: 20, display: "flex", gap: 10 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>📱</span>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                <strong style={{ color: "#0f172a" }}>Icône dédiée sur votre écran d'accueil</strong><br />
                Accédez à votre gestion en 1 tap, sans passer par le navigateur. Votre logo, votre nom.
              </div>
            </div>

            {/* Bouton natif (Android / Chrome Desktop) */}
            {prompt && (
              <button
                onClick={handleInstall}
                disabled={installing}
                style={{ width: "100%", padding: "16px", marginBottom: 10, background: themeColor, color: "white", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: installing ? "default" : "pointer", opacity: installing ? 0.75 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: `0 4px 16px ${themeColor}55` }}
              >
                <span style={{ fontSize: 22 }}>{installing ? "⏳" : "📲"}</span>
                {installing ? "Installation en cours…" : `Installer ${displayName}`}
              </button>
            )}

            {/* Instructions iOS */}
            {!prompt && isIOS() && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Installer sur iPhone / iPad :</p>
                {[
                  { icon: "⎙", text: "Appuyez sur le bouton Partager en bas de Safari" },
                  { icon: "＋", text: "Choisissez « Sur l'écran d'accueil »" },
                  { icon: "✅", text: "Appuyez sur Ajouter — c'est fait !" },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: themeColor, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, flexShrink: 0 }}>{s.icon}</div>
                    <span style={{ fontSize: 13, color: "#374151" }}>{s.text}</span>
                  </div>
                ))}
                <button onClick={dismissCard} style={{ width: "100%", marginTop: 10, padding: "14px", background: themeColor, color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                  J'ai compris
                </button>
              </div>
            )}

            {/* Instructions Android sans prompt */}
            {!prompt && !isIOS() && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Installer sur Android :</p>
                {[
                  { icon: "⋮", text: "Menu ⋮ en haut à droite du navigateur" },
                  { icon: "＋", text: "« Ajouter à l'écran d'accueil »" },
                  { icon: "✅", text: "Confirmer — votre appli est prête !" },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: themeColor, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, flexShrink: 0 }}>{s.icon}</div>
                    <span style={{ fontSize: 13, color: "#374151" }}>{s.text}</span>
                  </div>
                ))}
                <button onClick={dismissCard} style={{ width: "100%", marginTop: 10, padding: "14px", background: themeColor, color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                  J'ai compris
                </button>
              </div>
            )}

            <button onClick={dismissCard} style={{ width: "100%", padding: "12px", background: "transparent", color: "#94a3b8", border: "1.5px solid #e2e8f0", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Plus tard
            </button>
          </div>
        </div>
      )}
    </>
  );
}
