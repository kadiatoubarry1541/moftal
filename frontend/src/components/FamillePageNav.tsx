import { useEffect, useState } from 'react'
import { FamilleQuickNav } from './FamilleQuickNav'

/**
 * Bandeau navigation famille (Parents, Enfants, etc.) — lisible, contrasté, pictos visibles.
 */
export function FamillePageNav() {
  const [user, setUser] = useState<{
    genre?: 'HOMME' | 'FEMME' | 'AUTRE'
    role?: string
    isAdmin?: boolean
    numeroH?: string
  } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('session_user')
      if (!raw) return
      const parsed = JSON.parse(raw)
      const u = parsed.userData || parsed
      if (u?.numeroH) setUser(u)
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <section
      className="mb-6 overflow-hidden rounded-3xl border border-emerald-100/90 bg-gradient-to-b from-white via-emerald-50/40 to-white shadow-md shadow-emerald-900/5 dark:border-emerald-900/30 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900"
      aria-label="Menu famille"
    >
      <div className="border-b border-emerald-100/80 bg-emerald-600/5 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/30 sm:px-5 sm:py-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-sm dark:bg-emerald-700"
            aria-hidden
          >
            👨‍👩‍👧
          </span>
          <div>
            <h2 className="text-lg font-bold leading-tight text-gray-900 dark:text-white sm:text-xl">Menu famille</h2>
            <p className="mt-0.5 text-sm leading-snug text-gray-600 dark:text-gray-300">
              Touchez une image pour ouvrir la page
            </p>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <FamilleQuickNav user={user} variant="bar" scope="full" />
      </div>
    </section>
  )
}
