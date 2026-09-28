import { Link } from "react-router-dom";

// Bouton « 🤝 Inspir » commun à tout le site — même design que le bouton
// « 📚 Bibliothèque » de l'en-tête de la page Inspir (dégradé orange, texte
// blanc en gras, coins arrondis, légère ombre).
export default function InspirButton({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/famille/inspir"
      className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl font-bold text-white shadow-sm transition-opacity hover:opacity-90 ${
        compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
      }`}
      style={{ background: "linear-gradient(135deg,#f59e0b,#ea580c)" }}
    >
      🤝 Inspir
    </Link>
  );
}
