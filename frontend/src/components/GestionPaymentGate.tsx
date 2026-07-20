import { useEffect, useState } from "react";

// Intercepte globalement les réponses API 402 (abonnement Gestion Interne non payé)
// renvoyées par le backend, où que l'utilisateur se trouve dans l'app, et affiche
// un écran plein écran qui bloque toute interaction tant qu'il n'a pas payé.
// Les données de l'utilisateur ne sont jamais touchées — c'est un blocage d'accès uniquement.

let installed = false;
let listeners: Array<(message: string) => void> = [];

function installFetchGuard() {
  if (installed) return;
  installed = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);
    if (response.status === 402) {
      try {
        const data = await response.clone().json();
        if (data?.code === "PAYMENT_REQUIRED") {
          const message = data.message || "Abonnement Gestion Interne expiré ou non payé.";
          listeners.forEach((listener) => listener(message));
        }
      } catch {
        // réponse 402 non-JSON : on ignore
      }
    }
    return response;
  };
}

export default function GestionPaymentGate() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    installFetchGuard();
    const listener = (msg: string) => setMessage(msg);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  if (!message) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.94)",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: "32px 28px",
          maxWidth: 420,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ fontSize: 48, lineHeight: 1 }}>🔒</div>
        <h2 style={{ margin: "14px 0 8px", color: "#0f172a", fontSize: 19, fontWeight: 700 }}>
          Accès bloqué — Paiement requis
        </h2>
        <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.55, margin: "0 0 6px" }}>{message}</p>
        <p style={{ color: "#64748b", fontSize: 12.5, lineHeight: 1.5, margin: "0 0 22px" }}>
          Vos données restent conservées et seront de nouveau accessibles dès le règlement de votre abonnement.
        </p>
        <a
          href="/gestion-interne"
          style={{
            display: "inline-block",
            background: "#1a8f1a",
            color: "#fff",
            padding: "12px 26px",
            borderRadius: 10,
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          Payer mon abonnement
        </a>
      </div>
    </div>
  );
}
