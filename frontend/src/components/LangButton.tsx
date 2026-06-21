import { useRef, useState, useEffect } from 'react'
import { useI18n } from '../i18n/useI18n'
import { LANG_LABELS } from '../i18n/strings'

export function LangButton() {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div ref={ref} className="relative flex justify-end mb-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors whitespace-nowrap"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{t('header.language')}</span>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-9 w-40 bg-white rounded-xl shadow-2xl ring-1 ring-gray-200 z-50 overflow-hidden py-1"
        >
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
            {t('header.language')}
          </div>
          <div className="max-h-52 overflow-y-auto">
            {Object.entries(LANG_LABELS).map(([code, label]) => (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={lang === code}
                onClick={() => { setLang(code as 'fr' | 'en' | 'ar' | 'man' | 'pul'); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  lang === code
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="flex-1">{label}</span>
                {lang === code && <span className="text-blue-600">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
