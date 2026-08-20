interface VerifiedBadgeProps {
  size?: number
  title?: string
}

/** Sceau "Compte vérifié" — accordé manuellement par l'admin à un compte complet
 *  et digne de confiance (voir critères : /api/verification/status). */
export function VerifiedBadge({ size = 18, title = 'Compte vérifié par Moftal' }: VerifiedBadgeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="verified-badge-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2bbf2b" />
          <stop offset="100%" stopColor="#1a8f1a" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.5l2.4 2.02 3.1-.47 1.05 2.96 2.9 1.24-.5 3.12 1.9 2.63-1.9 2.63.5 3.12-2.9 1.24-1.05 2.96-3.1-.47L12 22.5l-2.4-2.02-3.1.47-1.05-2.96-2.9-1.24.5-3.12-1.9-2.63 1.9-2.63-.5-3.12 2.9-1.24 1.05-2.96 3.1.47L12 1.5z"
        fill="url(#verified-badge-grad)"
      />
      <path
        d="M8.2 12.3l2.5 2.5 5-5.4"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
