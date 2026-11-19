import { useState } from 'react'
import { DESTINATIONS_PUBLICITE, devinerDestination, labelDestination } from '../utils/destinationsPublicite'

const AUTRE = '__autre__'

interface PubTexte {
  titre?: string | null
  description?: string | null
  bouton_texte?: string | null
}

/** Liste des pages de Moftal + « Autre lien » — contrôlée par son parent. */
export function SelectDestination({ value, onChange, pub }: {
  value: string
  onChange: (lien: string) => void
  /** Texte de l'annonce : sert à montrer la page choisie automatiquement */
  pub?: PubTexte
}) {
  const connue = !value || DESTINATIONS_PUBLICITE.some(d => d.chemin === value)
  const [autre, setAutre] = useState(!connue)
  const devinee = pub ? devinerDestination(pub) : null

  return (
    <div className="space-y-2">
      <select
        value={autre ? AUTRE : value}
        onChange={e => {
          const v = e.target.value
          if (v === AUTRE) { setAutre(true); return }
          setAutre(false)
          onChange(v)
        }}
        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
      >
        <option value="">
          Automatique{devinee ? ` — ${labelDestination(devinee)}` : ' (selon le texte de l\'annonce)'}
        </option>
        {DESTINATIONS_PUBLICITE.map(d => <option key={d.chemin} value={d.chemin}>{d.label}</option>)}
        <option value={AUTRE}>Autre lien…</option>
      </select>
      {autre && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Ex : /services ou https://..."
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      )}
    </div>
  )
}

/** Change la page d'une annonce déjà publiée, enregistrée sur le serveur. */
export function ModifierLienPublicite({ pub, enregistrer }: {
  pub: PubTexte & { id: string; lien?: string | null }
  /** Envoie le lien au serveur ; renvoie un message d'erreur ou null si c'est enregistré */
  enregistrer: (id: string, lien: string) => Promise<string | null>
}) {
  const initial = pub.lien || ''
  const [lien, setLien] = useState(initial)
  const [enregistre, setEnregistre] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)

  const sauver = async () => {
    setBusy(true); setMessage(null)
    const erreur = await enregistrer(pub.id, lien.trim())
    setBusy(false)
    if (erreur) { setMessage({ ok: false, texte: erreur }); return }
    setEnregistre(lien.trim())
    setMessage({ ok: true, texte: 'Lien enregistré.' })
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-xs font-bold text-gray-600 mb-1.5">🔗 Page ouverte quand on appuie sur l'annonce</p>
      <SelectDestination value={lien} onChange={v => { setLien(v); setMessage(null) }} pub={pub} />
      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={sauver}
          disabled={busy || lien.trim() === enregistre}
          className="text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold px-3 py-1.5 rounded-lg"
        >
          {busy ? 'Enregistrement…' : 'Enregistrer le lien'}
        </button>
        {message && <span className={`text-xs font-semibold ${message.ok ? 'text-green-600' : 'text-red-600'}`}>{message.texte}</span>}
      </div>
    </div>
  )
}
