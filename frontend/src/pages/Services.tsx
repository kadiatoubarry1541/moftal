import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { FavorisDropdown, FavorisDropdownItem } from '../components/FavorisDropdown'
import { AdCarousel } from '../components/AdCarousel'
import { useI18n } from '../i18n/useI18n'
import { api } from '../utils/api'
import IconeApp from '../components/IconeApp'

interface ServiceItem {
  to: string
  emoji: string
  label: string
}

// Les favoris sont enregistrés sur le serveur. Cette clé ne sert plus qu'à
// reprendre, une seule fois, les favoris qu'un ancien téléphone gardait.
const ANCIENNE_CLE_FAVORIS = 'services_favorites'
const MAX_FAVORITES = 4

function anciensFavorisDuTelephone(numeroH: string): string[] {
  try {
    const raw = localStorage.getItem(`${ANCIENNE_CLE_FAVORIS}_${numeroH}`)
    const ids = raw ? JSON.parse(raw) : []
    return Array.isArray(ids) ? ids.filter((x) => typeof x === 'string').slice(0, MAX_FAVORITES) : []
  } catch {
    return []
  }
}

function oublierAnciensFavoris(numeroH: string) {
  try { localStorage.removeItem(`${ANCIENNE_CLE_FAVORIS}_${numeroH}`) } catch { /* rien à oublier */ }
}

export default function Services() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [connecte, setConnecte] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [erreurFavoris, setErreurFavoris] = useState('')

  // Favoris lus sur le serveur ; ceux qu'un ancien téléphone gardait y sont
  // enregistrés une fois, puis oubliés du téléphone.
  useEffect(() => {
    let annule = false
    const sessionData = JSON.parse(localStorage.getItem('session_user') || '{}')
    const user = sessionData.userData || sessionData
    if (!user?.numeroH || !localStorage.getItem('token')) return
    setConnecte(true)
    ;(async () => {
      const r = await api.lireFavorisServices()
      if (annule) return
      if (!r.success) { setErreurFavoris(r.message || 'Favoris indisponibles.'); return }
      if (r.favoris) {
        setFavoriteIds(r.favoris)
        oublierAnciensFavoris(user.numeroH)
        return
      }
      const anciens = anciensFavorisDuTelephone(user.numeroH)
      if (!anciens.length) return
      const envoi = await api.enregistrerFavorisServices(anciens)
      if (annule) return
      if (envoi.success) { setFavoriteIds(anciens); oublierAnciensFavoris(user.numeroH) }
    })()
    return () => { annule = true }
  }, [])

  const services: ServiceItem[] = [
    { to: '/sante',                                    emoji: '🏥', label: t('services.cat_sante') },
    { to: '/securite',                                 emoji: '🛡️', label: t('services.cat_securite') },
    { to: '/juridique',                                emoji: '⚖️', label: t('services.cat_juridique') },
    { to: '/immobilier',                               emoji: '🏠', label: t('services.cat_immobilier') },
    { to: '/education',                                emoji: '🎓', label: t('services.cat_education') },
    { to: '/madrasa',                                  emoji: '📖', label: t('services.cat_madrasa') },
    { to: '/commerce',                                  emoji: '🏪', label: t('services.cat_commerce') },
    { to: '/entreprise',                               emoji: '🏢', label: t('services.cat_entreprise') },
    { to: '/journalistes',                             emoji: '📰', label: t('services.cat_journalistes') },
    { to: '/science',                                  emoji: '🔬', label: t('services.cat_science') },
    { to: '/fournisseurs',                             emoji: '🚚', label: t('services.cat_fournisseurs') },
    { to: '/restaurants',                              emoji: '🍽️', label: t('services.cat_restaurant') },
    { to: '/transport',                                emoji: '🚌', label: t('services.cat_transport') },
    { to: '/beaute',                                   emoji: '💈', label: t('services.cat_beaute') },
    { to: '/artisans',                                 emoji: '🔧', label: t('services.cat_artisanat') },
    { to: '/reseau',                                   emoji: '🔗', label: t('services.cat_reseau') },
    { to: '/vendeurs',                                 emoji: '🛍️', label: t('services.cat_vendeurs') },
    { to: '/producteurs',                              emoji: '🌾', label: t('services.cat_producteurs') },
  ]

  // Enregistré sur le serveur ; en cas d'échec, le choix est annulé et un
  // message s'affiche (jamais un faux succès gardé seulement dans le téléphone)
  const toggleFavorite = async (to: string) => {
    if (!localStorage.getItem('token')) {
      setErreurFavoris('Connectez-vous pour enregistrer vos favoris.')
      return
    }
    const avant = favoriteIds
    let apres = avant
    if (avant.includes(to)) apres = avant.filter(id => id !== to)
    else if (avant.length < MAX_FAVORITES) apres = [...avant, to]
    if (apres === avant) return
    setErreurFavoris('')
    setFavoriteIds(apres)
    const r = await api.enregistrerFavorisServices(apres)
    if (!r.success) {
      setFavoriteIds(avant)
      setErreurFavoris(r.message || "Vos favoris n'ont pas pu être enregistrés.")
    }
  }

  // Favoris en premier (dans leur ordre d'origine), puis le reste
  const orderedServices = [
    ...services.filter(s => favoriteIds.includes(s.to)),
    ...services.filter(s => !favoriteIds.includes(s.to)),
  ]

  return (
    <>
      {/* Header (style Espace Gestion) */}
      <header style={{ background: '#0f172a', position: 'sticky', top: 0, zIndex: 40, borderBottom: '2px solid #1e293b', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
      {/* Retour + titre + Pub + Favoris — tous sur la même ligne */}
      <div className="max-w-lg mx-auto flex items-center gap-2" style={{ padding: '0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => navigate('/compte')}
            aria-label={t('services.back_aria')}
            style={{ background: 'none', color: 'white', border: 'none', padding: 0, cursor: 'pointer', fontSize: 34, fontWeight: 700, lineHeight: 1, opacity: 1 }}
          >
            ‹
          </button>
          <h1 style={{ color: 'white', fontWeight: 800, fontSize: 12, letterSpacing: '-0.2px', margin: 0 }}>💼 {t('services.title')}</h1>
        </div>
        {/* Pub — même ligne que le bouton Favoris, juste avant lui ; Favoris ne bouge pas */}
        <div className="flex-1 min-w-0 h-[74px]">
          <AdCarousel compact />
        </div>
        {connecte && (
          <FavorisDropdown
            headerLabel={`${t('services.favorites_label')} (${favoriteIds.length}/${MAX_FAVORITES})`}
            ariaLabel={t('services.favorites_aria')}
            title={t('services.favorites_label')}
            widthClassName="w-56"
          >
            {() => services.map(s => {
              const isSelected = favoriteIds.includes(s.to)
              const disabled = !isSelected && favoriteIds.length >= MAX_FAVORITES
              return (
                <FavorisDropdownItem
                  key={s.to}
                  icon={<span className="text-base leading-none">{s.emoji}</span>}
                  label={s.label}
                  selected={isSelected}
                  disabled={disabled}
                  multi
                  onClick={() => toggleFavorite(s.to)}
                />
              )
            })}
          </FavorisDropdown>
        )}
      </div>
      </header>
      {erreurFavoris && (
        <p role="alert" className="mx-3 mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">
          ⚠️ {erreurFavoris}
        </p>
      )}

    <div className="max-w-lg mx-auto px-2 pb-4 pt-3">
      {/* Grille d'icônes, comme l'écran d'accueil d'un téléphone */}
      <div className="grid grid-cols-5 gap-x-1.5 gap-y-4">
        {orderedServices.map(s => (
          <IconeApp
            key={s.to}
            to={s.to}
            nom={s.label}
            emoji={s.emoji}
            pastille={favoriteIds.includes(s.to) ? (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center leading-none border-2 border-white">✓</span>
            ) : undefined}
          />
        ))}
      </div>

      {/* Proposer votre service — en bas */}
      <button
        type="button"
        onClick={() => navigate('/inscription-pro')}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-3 mt-4 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-sm rounded-xl shadow-sm transition-colors"
      >
        {t('services.propose_btn')}
      </button>
    </div>
    </>
  )
}
