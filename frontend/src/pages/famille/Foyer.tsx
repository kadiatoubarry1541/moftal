import { Link, useNavigate } from 'react-router-dom'

function FoyerCard({ to, emoji, label }: { to: string; emoji: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center gap-2 py-8 px-3 rounded-2xl bg-white border border-gray-100 shadow-sm transition hover:bg-emerald-50 hover:border-emerald-200 active:scale-95"
    >
      <span className="text-4xl leading-none">{emoji}</span>
      <span className="text-sm font-semibold text-gray-700 text-center">{label}</span>
    </Link>
  )
}

export default function Foyer() {
  const navigate = useNavigate()

  return (
    <div className="max-w-md mx-auto px-4 py-4">
      <button
        type="button"
        onClick={() => navigate('/famille')}
        className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg transition-colors text-sm border border-gray-200 dark:border-gray-600"
      >
        ← Famille
      </button>

      <div className="mb-5 flex items-center gap-3 rounded-2xl bg-emerald-600 px-4 py-3 text-white shadow-md">
        <span className="text-3xl leading-none">🏠</span>
        <div>
          <h1 className="text-base font-bold leading-tight">Foyer</h1>
          <p className="text-xs text-emerald-100 mt-0.5">Parents, enfants et conjoint</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FoyerCard to="/famille/parents" emoji="👨‍👩‍👦" label="Parents"   />
        <FoyerCard to="/famille/enfants" emoji="👶"    label="Enfants"   />
        <FoyerCard to="/famille/femmes"  emoji="👰"    label="Ma femme"  />
        <FoyerCard to="/famille/mari"    emoji="🤵"    label="Mon homme" />
      </div>
    </div>
  )
}
