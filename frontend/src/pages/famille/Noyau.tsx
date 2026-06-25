import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getPhotoUrl, getSessionUser, isAdmin } from '../../utils/auth'
import { AudioRecorder } from '../../components/AudioRecorder'
import { VideoRecorder } from '../../components/VideoRecorder'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002'

function getToken() {
  return localStorage.getItem('token')
}

interface Member {
  numeroH: string
  prenom: string
  nomFamille: string
  photo?: string | null
  genre?: string
  type?: string
  dateDeces?: string | null
}

interface LivreEntry {
  id: string
  type: 'texte' | 'audio' | 'video'
  title?: string | null
  content: string
  visibility: 'visible' | 'scelle'
  createdAt: string
}

interface NoyauData {
  exists: boolean
  isFounder?: boolean
  founder?: Member
  wives?: Member[]
  children?: Member[]
  status?: 'actif' | 'archive'
  entries?: LivreEntry[]
}

type TabKey = 'mine' | 'pere' | 'mere'

const EMPTY: NoyauData = { exists: false }

const DEMO_ENTRIES: LivreEntry[] = [
  {
    id: 'demo-entry-1',
    type: 'texte',
    title: 'Message pour mes enfants',
    content: "Ceci est un exemple de message que vous pourrez écrire pour votre famille : vos conseils, votre histoire, vos valeurs... Il sera visible par les membres de votre noyau dès aujourd'hui.",
    visibility: 'visible',
    createdAt: new Date().toISOString()
  },
  {
    id: 'demo-entry-2',
    type: 'texte',
    title: 'Un message scellé',
    content: "Ce type de message reste caché tant que vous êtes en vie, puis il est révélé automatiquement à vos enfants après votre décès.",
    visibility: 'scelle',
    createdAt: new Date().toISOString()
  }
]

function buildDemoData(user: ReturnType<typeof getSessionUser>, entries: LivreEntry[]): NoyauData {
  const founder: Member = {
    numeroH: user?.numeroH || 'DEMO-0',
    prenom: user?.prenom || 'Vous',
    nomFamille: user?.nomFamille || '',
    photo: user?.photo || null,
    genre: user?.genre || 'HOMME',
    type: 'vivant'
  }
  return {
    exists: true,
    isFounder: true,
    founder,
    wives: [
      { numeroH: 'DEMO-EPOUSE-1', prenom: 'Mariama', nomFamille: founder.nomFamille, genre: 'FEMME', type: 'vivant' },
      { numeroH: 'DEMO-EPOUSE-2', prenom: 'Aïssatou', nomFamille: founder.nomFamille, genre: 'FEMME', type: 'vivant' }
    ],
    children: [
      { numeroH: 'DEMO-ENFANT-1', prenom: 'Ibrahima', nomFamille: founder.nomFamille, genre: 'HOMME', type: 'vivant' },
      { numeroH: 'DEMO-ENFANT-2', prenom: 'Fatoumata', nomFamille: founder.nomFamille, genre: 'FEMME', type: 'vivant' },
      { numeroH: 'DEMO-ENFANT-3', prenom: 'Mamadou', nomFamille: founder.nomFamille, genre: 'HOMME', type: 'vivant' }
    ],
    status: 'actif',
    entries
  }
}

async function fetchNoyau(path: string): Promise<NoyauData> {
  try {
    const res = await fetch(`${API_BASE}/api/family-core/${path}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    const data = await res.json()
    if (!data.success) return EMPTY
    return data
  } catch {
    return EMPTY
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function MemberAvatar({ member, size = 'md' }: { member: Member; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'w-10 h-10 text-lg', md: 'w-14 h-14 text-2xl', lg: 'w-20 h-20 text-3xl' }
  const photoUrl = getPhotoUrl(member.photo)
  const emoji = member.genre === 'FEMME' ? '👩' : member.genre === 'HOMME' ? '👨' : '🧑'
  return (
    <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center ring-2 ring-emerald-200 dark:ring-emerald-800 flex-shrink-0`}>
      {photoUrl ? (
        <img src={photoUrl} alt={member.prenom} className="w-full h-full object-cover" />
      ) : (
        <span>{emoji}</span>
      )}
      {member.type === 'defunt' && (
        <span className="absolute -bottom-0.5 -right-0.5 text-xs bg-white dark:bg-gray-800 rounded-full p-0.5" title="Défunt(e)">🕊️</span>
      )}
    </div>
  )
}

function MemberCard({ member }: { member: Member }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white dark:bg-gray-800 dark:border-emerald-900/40 p-3 shadow-sm">
      <MemberAvatar member={member} />
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white truncate">{member.prenom} {member.nomFamille}</p>
        {member.type === 'defunt' && <p className="text-xs text-gray-400">Défunt(e)</p>}
      </div>
    </div>
  )
}

function EntryCard({
  entry,
  isFounder,
  founderAlive,
  onToggleVisibility,
  onRemove
}: {
  entry: LivreEntry
  isFounder: boolean
  founderAlive: boolean
  onToggleVisibility: () => Promise<void>
  onRemove: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const typeIcon = entry.type === 'audio' ? '🎙️' : entry.type === 'video' ? '🎥' : '📝'
  const date = new Date(entry.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const toggleVisibility = async () => {
    setBusy(true)
    try {
      await onToggleVisibility()
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirm('Retirer cette entrée du livre ?')) return
    setBusy(true)
    try {
      await onRemove()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{typeIcon}</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{entry.title || 'Sans titre'}</p>
            <p className="text-xs text-gray-400">{date}</p>
          </div>
        </div>
        {entry.visibility === 'scelle' && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 whitespace-nowrap">
            {founderAlive ? '🔒 Scellé' : '🔓 Révélé'}
          </span>
        )}
      </div>

      {entry.type === 'texte' && (
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">{entry.content}</p>
      )}
      {entry.type === 'audio' && <audio controls src={entry.content} className="w-full" />}
      {entry.type === 'video' && <video controls src={entry.content} className="w-full rounded-lg max-h-64" />}

      {isFounder && (
        <div className="mt-3 flex gap-2">
          <button
            disabled={busy}
            onClick={toggleVisibility}
            className="text-xs px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-50"
          >
            {entry.visibility === 'scelle' ? 'Rendre visible maintenant' : "Sceller jusqu'à mon décès"}
          </button>
          <button
            disabled={busy}
            onClick={remove}
            className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-600 dark:border-red-800 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
          >
            Retirer
          </button>
        </div>
      )}
    </div>
  )
}

function AddEntryModal({ onClose, onSave }: {
  onClose: () => void
  onSave: (payload: { type: 'texte' | 'audio' | 'video'; title: string; content: string; visibility: 'visible' | 'scelle' }) => Promise<{ success: boolean; message?: string }>
}) {
  const [type, setType] = useState<'texte' | 'audio' | 'video'>('texte')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [media, setMedia] = useState<string | null>(null)
  const [visibility, setVisibility] = useState<'visible' | 'scelle'>('visible')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleMedia = async (blob: Blob) => {
    const base64 = await blobToBase64(blob)
    setMedia(base64)
  }

  const handleSubmit = async () => {
    const content = type === 'texte' ? text.trim() : media
    if (!content) {
      setError(type === 'texte' ? 'Écrivez un message.' : 'Enregistrez un audio ou une vidéo.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const result = await onSave({ type, title, content, visibility })
      if (!result.success) {
        setError(result.message || "Erreur lors de l'enregistrement.")
        return
      }
      onClose()
    } catch {
      setError('Erreur réseau.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">📖 Ajouter au Livre</h3>

        <div className="flex gap-2 mb-4">
          {(['texte', 'audio', 'video'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setType(t)
                setMedia(null)
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                type === t
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300'
              }`}
            >
              {t === 'texte' ? '📝 Texte' : t === 'audio' ? '🎙️ Audio' : '🎥 Vidéo'}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre (optionnel)"
          className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
        />

        {type === 'texte' && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Votre message pour vos enfants..."
            className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm resize-none"
          />
        )}
        {type === 'audio' && (
          <div className="mb-3">
            <AudioRecorder onAudioRecorded={handleMedia} maxDuration={120} />
            {media && <audio controls src={media} className="w-full mt-2" />}
          </div>
        )}
        {type === 'video' && (
          <div className="mb-3">
            <VideoRecorder onVideoRecorded={handleMedia} maxDuration={120} />
            {media && <video controls src={media} className="w-full mt-2 rounded-lg max-h-48" />}
          </div>
        )}

        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Visibilité</p>
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="radio" checked={visibility === 'visible'} onChange={() => setVisibility('visible')} className="mt-1" />
              <span>
                <strong>Partager maintenant</strong> — visible par les membres du noyau dès aujourd'hui.
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="radio" checked={visibility === 'scelle'} onChange={() => setVisibility('scelle')} className="mt-1" />
              <span>
                <strong>Garder scellé</strong> — restera caché et sera révélé à mes enfants seulement après mon décès.
              </span>
            </label>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'Enregistrement...' : 'Ajouter au livre'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Noyau() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Record<TabKey, NoyauData>>({ mine: EMPTY, pere: EMPTY, mere: EMPTY })
  const [activeTab, setActiveTab] = useState<TabKey | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [demoEntries, setDemoEntries] = useState<LivreEntry[]>(DEMO_ENTRIES)

  const user = useMemo(() => getSessionUser(), [])

  const load = useCallback(async () => {
    setLoading(true)
    const [mine, pere, mere] = await Promise.all([
      fetchNoyau('mine'),
      fetchNoyau('parent/pere'),
      fetchNoyau('parent/mere')
    ])
    const next: Record<TabKey, NoyauData> = { mine, pere, mere }
    setData(next)
    setActiveTab((prev) => {
      if (prev && next[prev].exists) return prev
      if (next.mine.exists) return 'mine'
      if (next.pere.exists) return 'pere'
      if (next.mere.exists) return 'mere'
      return null
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const tabs: { key: TabKey; label: string }[] = []
  if (data.mine.exists) tabs.push({ key: 'mine', label: 'Mon Noyau' })
  if (data.pere.exists) tabs.push({ key: 'pere', label: 'Noyau de mon Père' })
  if (data.mere.exists) tabs.push({ key: 'mere', label: 'Noyau de ma Mère' })

  const isDemo = !activeTab && isAdmin(user)
  const isMyNoyau = activeTab === 'mine' || isDemo
  const current = activeTab ? data[activeTab] : (isDemo ? buildDemoData(user, demoEntries) : EMPTY)

  const addEntry = async (payload: { type: 'texte' | 'audio' | 'video'; title: string; content: string; visibility: 'visible' | 'scelle' }) => {
    if (isDemo) {
      const newEntry: LivreEntry = {
        id: `demo-entry-${Date.now()}`,
        type: payload.type,
        title: payload.title?.trim() || null,
        content: payload.content,
        visibility: payload.visibility,
        createdAt: new Date().toISOString()
      }
      setDemoEntries((prev) => [newEntry, ...prev])
      return { success: true }
    }
    try {
      const res = await fetch(`${API_BASE}/api/family-core/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload)
      })
      const result = await res.json()
      if (result.success) await load()
      return result
    } catch {
      return { success: false, message: 'Erreur réseau.' }
    }
  }

  const toggleEntryVisibility = async (entry: LivreEntry) => {
    if (isDemo) {
      setDemoEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, visibility: e.visibility === 'scelle' ? 'visible' : 'scelle' } : e))
      return
    }
    await fetch(`${API_BASE}/api/family-core/entries/${entry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ visibility: entry.visibility === 'scelle' ? 'visible' : 'scelle' })
    })
    await load()
  }

  const removeEntry = async (entry: LivreEntry) => {
    if (isDemo) {
      setDemoEntries((prev) => prev.filter((e) => e.id !== entry.id))
      return
    }
    await fetch(`${API_BASE}/api/family-core/entries/${entry.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    await load()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-900">
        <p className="text-emerald-600 dark:text-emerald-400 font-medium">Chargement du noyau familial...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-900">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-6 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mt-1 flex items-center gap-2">🏠 Noyau Familial</h1>
          <p className="text-emerald-50 mt-1 text-sm">
            La famille restreinte : un fondateur, ses épouses, ses enfants — et le Livre qu'il laisse aux siens.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">
        {!activeTab && !isDemo ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🏠</p>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
              Vous n'avez pas encore de noyau familial. Un noyau apparaît dès que vous avez au moins un enfant
              confirmé dans votre arbre, ou dès que votre père ou votre mère y est enregistré.
            </p>
          </div>
        ) : (
          <>
            {isDemo && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                <strong>Aperçu (mode démo, visible par les admins)</strong> — vous n'avez pas encore de noyau réel.
                Cet aperçu montre à quoi ressemblera cette page une fois que vous aurez un enfant confirmé dans votre arbre.
              </div>
            )}

            {tabs.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                      activeTab === tab.key
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {current.founder && (
              <>
                <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-white dark:bg-gray-800 p-4 sm:p-5 shadow-sm mb-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <MemberAvatar member={current.founder} size="lg" />
                      <div>
                        <p className="font-bold text-lg text-gray-900 dark:text-white">
                          {current.founder.prenom} {current.founder.nomFamille}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Fondateur du noyau{isMyNoyau ? ' (vous)' : ''}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        current.status === 'actif'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}
                    >
                      {current.status === 'actif' ? '🟢 Actif' : '📕 Archivé'}
                    </span>
                  </div>
                  {current.status === 'archive' && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Ce noyau est archivé : il devient une page d'histoire, consultable par les générations futures.
                    </p>
                  )}
                </div>

                {!!current.wives?.length && (
                  <div className="mb-4">
                    <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                      Épouses
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {current.wives.map((w) => (
                        <MemberCard key={w.numeroH} member={w} />
                      ))}
                    </div>
                  </div>
                )}

                {!!current.children?.length && (
                  <div className="mb-4">
                    <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                      Enfants
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {current.children.map((c) => (
                        <MemberCard key={c.numeroH} member={c} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      📖 Le Livre
                    </h2>
                    {isMyNoyau && (
                      <button
                        onClick={() => setShowModal(true)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
                      >
                        + Ajouter
                      </button>
                    )}
                  </div>
                  {!current.entries?.length ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      {isMyNoyau
                        ? "Vous n'avez encore rien écrit dans votre livre."
                        : `${current.founder.prenom} n'a encore rien laissé dans son livre.`}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {current.entries.map((entry) => (
                        <EntryCard
                          key={entry.id}
                          entry={entry}
                          isFounder={!!current.isFounder}
                          founderAlive={current.founder?.type !== 'defunt'}
                          onToggleVisibility={() => toggleEntryVisibility(entry)}
                          onRemove={() => removeEntry(entry)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {showModal && <AddEntryModal onClose={() => setShowModal(false)} onSave={addEntry} />}
    </div>
  )
}
