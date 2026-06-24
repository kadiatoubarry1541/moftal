import { useEffect, useMemo, useRef, useState, useCallback, lazy, Suspense } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { hideIncrement } from '../../utils/formatNumeroH'
import { ArbreGenealogique } from '../../components/ArbreGenealogique'
import { buildFamilyTree, getCercleDesRacinesCounts } from '../../services/FamilyTreeBuilder'
import { useI18n } from '../../i18n/useI18n'
import { getSocket, disconnectSocket } from '../../services/socket'
import CallModal from '../../components/CallModal'

const ParentsInline    = lazy(() => import('./Parents'))
const EnfantsInline    = lazy(() => import('./Enfants'))
const PartenaireInline = lazy(() => import('./Partenaire'))

interface UserData {
  numeroH: string
  prenom: string
  nomFamille: string
  genre: 'HOMME' | 'FEMME' | 'AUTRE'
  [key: string]: any
}

interface PartnerInfo {
  numeroH: string
  prenom: string
  nomFamille: string
  genre?: 'HOMME' | 'FEMME' | 'AUTRE'
  photo?: string
}

interface ParentLinkInfo {
  id: string
  parentNumeroH: string
  childNumeroH: string
  parentType: 'pere' | 'mere'
  parent?: {
    numeroH: string
    prenom: string
    nomFamille: string
    photo?: string
    genre?: 'HOMME' | 'FEMME' | 'AUTRE'
  }
}

interface FamilyMessage {
  id: string
  numeroH: string
  authorName?: string
  content: string
  messageType?: 'text' | 'image' | 'video' | 'audio'
  mediaUrl?: string | null
  created_at?: string
  createdAt?: string
  familyName?: string
}

interface GalleryItem {
  id: string
  familyName: string
  uploaderNumeroH: string
  uploaderName: string
  album: string
  url: string
  type: 'image' | 'video'
  created_at: string
}

// Durées disponibles : 5 ans = 1 part, 10 ans = 2 parts, 15 ans = 3 parts, 20 ans = 4 parts
const DUREES = [
  { ans: 5,  label: '5 ans',  parts: 1 },
  { ans: 10, label: '10 ans', parts: 2 },
  { ans: 15, label: '15 ans', parts: 3 },
  { ans: 20, label: '20 ans', parts: 4 },
]

function ActivationArbreCard({ treeId, apiBase }: { treeId: string; apiBase: string }) {
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');
  const [prixBase, setPrixBase] = useState<number | null>(null);
  const [zone, setZone] = useState('');
  const [dureeIdx, setDureeIdx] = useState(0); // 0 = 5 ans par défaut

  const dureeChoisie = DUREES[dureeIdx];
  const montantTotal = prixBase !== null ? prixBase * dureeChoisie.parts : null;

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${apiBase}/api/payment/prix-activation`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { if (d.success) { setPrixBase(d.prix); setZone(d.label); } })
      .catch(() => { setPrixBase(100000); setZone('Tarif Afrique'); });
  }, [apiBase]);

  async function payer() {
    if (!montantTotal) return;
    setLoading(true);
    setErreur('');
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${apiBase}/api/payment/initiate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: montantTotal,
          currency: 'GNF',
          purpose: 'activation_famille',
          relatedId: treeId,
          dureeAns: dureeChoisie.ans,
          description: `Activation arbre familial Moftal — ${dureeChoisie.ans} ans — ${montantTotal.toLocaleString()} GNF`,
        }),
      });
      const d = await r.json();
      if (d.success && d.paymentUrl) {
        window.location.href = d.paymentUrl;
      } else {
        setErreur(d.message || 'Impossible d\'initier le paiement. Réessayez.');
      }
    } catch {
      setErreur('Erreur de connexion. Vérifiez votre internet.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-4 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">🔒</span>
        <div className="flex-1">
          <p className="font-black text-sm text-amber-900">Numéro de sang familial — Non activé</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            Votre lignée est enregistrée. Activez votre arbre pour révéler votre <strong>code de sang unique</strong> et débloquer toutes les fonctionnalités familiales.
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="font-black text-2xl tracking-widest" style={{ color: '#fbbf24' }}>F?S?</span>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-amber-200 px-3 py-2 mb-3 text-xs text-amber-800 space-y-1">
        <p>✅ Code de sang unique de votre lignée, jamais répété</p>
        <p>✅ Accès complet à l'arbre généalogique familial</p>
        <p>✅ Moftal Pay familial activé (caisse commune)</p>
        <p>✅ Désignation des chefs de famille</p>
      </div>

      {/* Choix de la durée d'activation */}
      <div className="mb-3">
        <p className="text-xs font-bold text-amber-900 mb-2">⏳ Choisissez la durée d'activation :</p>
        <div className="grid grid-cols-4 gap-1.5">
          {DUREES.map((d, i) => (
            <button
              key={d.ans}
              type="button"
              onClick={() => setDureeIdx(i)}
              className={`rounded-xl py-2 text-xs font-black transition-all border-2 ${
                dureeIdx === i
                  ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-[1.04]'
                  : 'bg-white text-amber-800 border-amber-200 hover:border-amber-400'
              }`}
            >
              {d.label}
              {prixBase !== null && (
                <span className={`block text-[9px] font-medium mt-0.5 ${dureeIdx === i ? 'text-amber-100' : 'text-amber-500'}`}>
                  {(prixBase * d.parts).toLocaleString()} GNF
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-amber-600 mt-1.5 text-center">
          Renouvelable tous les {dureeChoisie.ans} ans · {prixBase !== null ? `${prixBase.toLocaleString()} GNF / 5 ans` : '…'}
        </p>
      </div>

      {/* Prix total selon zone géographique */}
      {montantTotal !== null && (
        <div className="flex items-center justify-between rounded-xl bg-amber-100 border border-amber-200 px-3 py-2 mb-3">
          <div>
            <p className="text-xs font-bold text-amber-800">{zone} · {dureeChoisie.ans} ans</p>
            <p className="text-xs text-amber-600">{zone === 'Tarif Afrique' ? '🌍 Continent africain' : '🌎 Hors Afrique'}</p>
          </div>
          <span className="font-black text-lg text-amber-900">{montantTotal.toLocaleString()} GNF</span>
        </div>
      )}

      {erreur && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-2">{erreur}</p>
      )}

      <button
        onClick={payer}
        disabled={loading || montantTotal === null}
        className="w-full py-3 rounded-xl font-black text-sm text-white disabled:opacity-50 transition-all active:scale-95"
        style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}
      >
        {loading
          ? '⏳ Redirection vers le paiement...'
          : montantTotal === null
            ? 'Chargement du prix...'
            : `🩸 Activer mon arbre — ${dureeChoisie.ans} ans — ${montantTotal.toLocaleString()} GNF`}
      </button>
      <p className="text-xs text-center text-amber-600 mt-1.5">Paiement sécurisé via FedaPay · Orange Money / Carte</p>
    </div>
  );
}


export default function Arbre() {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserData | null>(null)
  const [partner, setPartner] = useState<PartnerInfo | null>(null)
  const [parentsLinks, setParentsLinks] = useState<ParentLinkInfo[]>([])
  const [activeTab, setActiveTab] = useState<'arbre' | 'arbre-conjoint' | 'echanges' | 'foyer'>('arbre')
  const [foyerSection, setFoyerSection] = useState<'parents' | 'enfants' | 'femme' | 'homme' | null>(null)
  const { t } = useI18n()

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002'

  // Messagerie familiale (style WhatsApp)
  const [familyMessages, setFamilyMessages] = useState<FamilyMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Médias, audio, appels
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Appels (WebRTC)
  const [outgoingCall, setOutgoingCall] = useState<{ to: string; toName: string; callType: 'audio' | 'video' } | null>(null)
  const [incomingCall, setIncomingCall] = useState<{ from: string; callerName: string; offer: RTCSessionDescriptionInit; callType: 'audio' | 'video' } | null>(null)
  const [showCall, setShowCall] = useState(false)

  // Galerie famille partagée
  const [showGallery, setShowGallery] = useState(false)
  const [sharedItems, setSharedItems] = useState<GalleryItem[]>([])
  const [sharedLoading, setSharedLoading] = useState(false)
  const [activeAlbum, setActiveAlbum] = useState('rencontre')
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewerMedia, setViewerMedia] = useState<GalleryItem | null>(null)
  const [galleryView, setGalleryView] = useState<'list' | 'detail'>('list')

  // Personnes masquées dans mon arbre (je ne les vois plus)
  const [treeHidden, setTreeHidden] = useState<string[]>([])

  // Méta de l'arbre (familyCode, bloodNumber — visible admin)
  const [treeInfo, setTreeInfo] = useState<any>(null)

  // Filtre vivants / décédés / tous
  const [filtreArbre, setFiltreArbre] = useState<'vivants' | 'defunts' | 'tous'>('vivants')

  // Modal signalement de décès
  const [showDecesModal, setShowDecesModal] = useState(false)
  const [memberToReport, setMemberToReport] = useState<any>(null)
  const [dateDeces, setDateDeces] = useState('')
  const [anneeDeces, setAnneeDeces] = useState('')
  const [causeDeces, setCauseDeces] = useState('')
  const [submittingDeces, setSubmittingDeces] = useState(false)
  const [msgDeces, setMsgDeces] = useState('')

  // Modal détail défunt
  const [showDefuntDetail, setShowDefuntDetail] = useState(false)
  const [defuntDetail, setDefuntDetail] = useState<any>(null)
  const [loadingDefunt, setLoadingDefunt] = useState(false)

  // Désignation des chefs de l'arbre (Gérant 1, Gérant 2, Conseiller)
  const [fund, setFund] = useState<any>(null)
  const [showDesignerChefs, setShowDesignerChefs] = useState(false)
  const [newGerant1, setNewGerant1] = useState('')
  const [newGerant2, setNewGerant2] = useState('')
  const [newConseiller, setNewConseiller] = useState('')
  const [savingChefs, setSavingChefs] = useState(false)
  const [msgChefs, setMsgChefs] = useState('')

  const location = useLocation()

  // Onglet ou galerie auto-sélectionné depuis le hub Famille (navigation state)
  useEffect(() => {
    const st = location.state as { tab?: string; openGallery?: boolean } | null
    if (st?.tab === 'echanges') setActiveTab('echanges')
    if (st?.openGallery) setShowGallery(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveUser = useMemo<UserData>(() => user ?? {
    numeroH: '',
    prenom: 'Invité',
    nomFamille: '',
    genre: 'HOMME'
  }, [user])

useEffect(() => {
  const sessionData = JSON.parse(localStorage.getItem('session_user') || '{}')
  const u = sessionData.userData || sessionData
  if (u?.numeroH) setUser(u)
  return () => { disconnectSocket() }
}, [])

useEffect(() => {
  const loadTreeHidden = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/auth/me/tree-hidden`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success && Array.isArray(data.treeHidden)) setTreeHidden(data.treeHidden)
      }
    } catch {
      // ignore
    }
  }
  loadTreeHidden()
}, [API_BASE])

useEffect(() => {
  const loadTreeMeta = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/family-tree/tree`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.tree) setTreeInfo(data.tree)
      }
    } catch { /* ignore */ }
  }
  loadTreeMeta()
}, [API_BASE])

useEffect(() => {
  const loadPartnerAndParents = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const [partnerRes, parentsRes] = await Promise.all([
        fetch(`${API_BASE}/api/couple/my-partner`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }),
        fetch(`${API_BASE}/api/parent-child/my-parents`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      ])

      if (partnerRes.ok) {
        const data = await partnerRes.json()
        if (data.success && data.partner) {
          setPartner({
            numeroH: data.partner.numeroH,
            prenom: data.partner.prenom,
            nomFamille: data.partner.nomFamille,
            genre: (data.partner.genre || 'AUTRE') as PartnerInfo['genre'],
            photo: data.partner.photo
          })
        } else {
          setPartner(null)
        }
      }

      if (parentsRes.ok) {
        const data = await parentsRes.json()
        if (data.success && Array.isArray(data.parents)) {
          setParentsLinks(
            data.parents.map((p: any) => ({
              id: p.id,
              parentNumeroH: p.parentNumeroH,
              childNumeroH: p.childNumeroH,
              parentType: p.parentType,
              parent: p.parent
                ? {
                    numeroH: p.parent.numeroH,
                    prenom: p.parent.prenom,
                    nomFamille: p.parent.nomFamille,
                    photo: p.parent.photo,
                    genre: p.parent.genre
                  }
                : undefined
            }))
          )
        } else {
          setParentsLinks([])
        }
      }
    } catch {
      // Erreur réseau : ne pas bloquer l'affichage de l'arbre
    }
  }

  loadPartnerAndParents()
}, [API_BASE])

  // Charger les données du fonds famille (pour afficher/désigner les chefs)
  useEffect(() => {
    const loadFund = async () => {
      const token = localStorage.getItem('token')
      if (!token || !effectiveUser.nomFamille) return
      try {
        const res = await fetch(`${API_BASE}/api/family-fund/mon-compte`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.existe) setFund(data.compte)
        }
      } catch { /* ignore */ }
    }
    if (effectiveUser.numeroH) loadFund()
  }, [effectiveUser.numeroH, effectiveUser.nomFamille, API_BASE])

const enhancedUser: UserData = useMemo(() => {
  let base: UserData = { ...effectiveUser }

  // Conjoint(e) lié(e)
  if (partner) {
    base = {
      ...base,
      conjointPrenom: partner.prenom,
      conjointNumeroH: partner.numeroH,
      conjointNomFamille: partner.nomFamille,
      conjointGenre: partner.genre,
      conjointPhoto: partner.photo
    }
  }

  // Parents liés (via API parent-child/my-parents)
  const pereLink = parentsLinks.find((p) => p.parentType === 'pere' && p.parent)
  const mereLink = parentsLinks.find((p) => p.parentType === 'mere' && p.parent)

  if (pereLink?.parent) {
    base = {
      ...base,
      prenomPere: pereLink.parent.prenom,
      numeroHPere: pereLink.parent.numeroH,
      famillePere: pereLink.parent.nomFamille,
      perePhoto: pereLink.parent.photo
    }
  }

  if (mereLink?.parent) {
    base = {
      ...base,
      prenomMere: mereLink.parent.prenom,
      numeroHMere: mereLink.parent.numeroH,
      familleMere: mereLink.parent.nomFamille,
      merePhoto: mereLink.parent.photo
    }
  }

  return base
}, [effectiveUser, partner, parentsLinks])

  const familyMembers = useMemo(() => buildFamilyTree(enhancedUser), [enhancedUser])
  const cercleCounts = useMemo(
    () => getCercleDesRacinesCounts(enhancedUser, familyMembers),
    [enhancedUser, familyMembers]
  )

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const loadFamilyMessages = async () => {
    try {
      setLoadingMessages(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE}/api/family-tree/messages`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // On affiche du plus ancien au plus récent
        const messages: FamilyMessage[] = (data.messages || []).slice().reverse()
        setFamilyMessages(messages)
        setTimeout(scrollToBottom, 150)
      } else {
        console.error('Erreur chargement messages familiaux:', data.message || data.error)
      }
    } catch (error) {
      console.error('Erreur chargement messages familiaux:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  // Chargement initial des messages quand l'onglet échanges est actif
  useEffect(() => {
    if (activeTab === 'echanges') {
      loadFamilyMessages()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const sendFamilyMessage = async () => {
    if (!newMessage.trim() || isSending) return

    try {
      setIsSending(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE}/api/family-tree/messages`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newMessage.trim(), messageType: 'text' })
      })

      const data = await response.json()
      if (response.ok && data.success && data.message) {
        // Le socket diffuse aux autres membres ; on l'ajoute localement immédiatement
        setFamilyMessages((prev) => {
          if (prev.find(m => m.id === data.message.id)) return prev
          return [...prev, data.message]
        })
        setNewMessage('')
        setTimeout(scrollToBottom, 100)
      } else {
        alert(data.message || 'Erreur lors de l\'envoi du message')
      }
    } catch (error: any) {
      console.error('Erreur envoi message familial:', error)
      alert(error?.message || 'Erreur lors de l\'envoi du message')
    } finally {
      setIsSending(false)
    }
  }

  // Vérifie la durée d'un fichier vidéo ou audio avant envoi
  const checkMediaDuration = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const isVideo = file.type.startsWith('video/')
      const isAudio = file.type.startsWith('audio/')
      if (!isVideo && !isAudio) { resolve(true); return }

      const el = isVideo
        ? document.createElement('video')
        : document.createElement('audio')
      const url = URL.createObjectURL(file)
      el.src = url
      el.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        if (el.duration > 30) {
          alert(`⏱️ Durée maximale : 30 secondes.\nVotre fichier dure ${Math.round(el.duration)}s.`)
          resolve(false)
        } else {
          resolve(true)
        }
      }
      el.onerror = () => { URL.revokeObjectURL(url); resolve(true) }
    })
  }

  // Envoi d'un fichier (photo / vidéo max 30s / audio max 30s)
  const sendFamilyMediaMessage = useCallback(async (file: File) => {
    const token = localStorage.getItem('token')
    if (!token) return

    const ok = await checkMediaDuration(file)
    if (!ok) return

    setIsSending(true)
    try {
      const formData = new FormData()
      formData.append('media', file)
      const res = await fetch(`${API_BASE}/api/family-tree/messages/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (res.ok && data.success && data.message) {
        setFamilyMessages(prev => {
          if (prev.find(m => m.id === data.message.id)) return prev
          return [...prev, data.message]
        })
        setTimeout(scrollToBottom, 100)
      } else {
        alert(data.message || 'Erreur envoi média')
      }
    } catch {
      alert('Erreur de connexion au serveur')
    } finally {
      setIsSending(false)
    }
  }, [API_BASE])

  // Enregistrement vocal : appui = démarre, relâche = envoie
  const startRecording = useCallback(async () => {
    if (isRecording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `vocal-${Date.now()}.webm`, { type: 'audio/webm' })
        await sendFamilyMediaMessage(file)
        setRecordingSeconds(0)
      }
      mr.start(200)
      mediaRecorderRef.current = mr
      setIsRecording(true)
      let secs = 0
      recordingTimerRef.current = setInterval(() => {
        secs++
        setRecordingSeconds(secs)
        if (secs >= 30) stopRecording()
      }, 1000)
    } catch {
      alert('Impossible d\'accéder au microphone')
    }
  }, [isRecording, sendFamilyMediaMessage])

  const stopRecording = useCallback(() => {
    if (!isRecording) return
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null }
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }, [isRecording])

  // Lancer un appel vers un membre de la famille
  const startCall = useCallback((to: string, toName: string, callType: 'audio' | 'video') => {
    setOutgoingCall({ to, toName, callType })
    setShowCall(true)
  }, [])

  // Socket.io : connexion uniquement quand l'onglet messages est ouvert
  useEffect(() => {
    const familyName = effectiveUser.nomFamille
    if (!familyName || !effectiveUser.numeroH) return
    if (activeTab !== 'echanges') return

    const socket = getSocket()
    socket.emit('join-family', familyName)

    const onFamilyMsg = (msg: FamilyMessage) => {
      setFamilyMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      setTimeout(scrollToBottom, 100)
    }

    const onIncomingCall = (data: { from: string; callerName: string; offer: RTCSessionDescriptionInit; callType: 'audio' | 'video' }) => {
      setIncomingCall(data)
      setShowCall(true)
    }

    socket.on('family-message', onFamilyMsg)
    socket.on('incoming-call', onIncomingCall)

    return () => {
      socket.off('family-message', onFamilyMsg)
      socket.off('incoming-call', onIncomingCall)
    }
  }, [effectiveUser.nomFamille, effectiveUser.numeroH, activeTab])

  const loadSharedGallery = async () => {
    try {
      setSharedLoading(true)
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/family/shared-gallery`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSharedItems(data.items || [])
      }
    } catch (e) {
      console.error('Erreur chargement galerie partagée:', e)
    } finally {
      setSharedLoading(false)
    }
  }

  const openGallery = () => {
    setShowGallery(true)
    loadSharedGallery()
  }

  const uploadToSharedGallery = async (file: File) => {
    try {
      setUploading(true)
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('media', file)
      const res = await fetch(`${API_BASE}/api/family/shared-gallery/${activeAlbum}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      const data = await res.json()
      if (res.ok && data.item) {
        setSharedItems(prev => [data.item, ...prev])
      } else {
        alert(data.message || 'Erreur lors de la publication')
      }
    } catch {
      alert('Erreur de connexion au serveur')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteMedia = async (item: GalleryItem) => {
    await deleteFromSharedGallery(item.id)
  }

  const deleteFromSharedGallery = async (id: string) => {
    if (!confirm('Supprimer ce média ? Cette action est irréversible.')) return
    try {
      setDeletingId(id)
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/family/shared-gallery/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setSharedItems(prev => prev.filter(item => item.id !== id))
      } else {
        const data = await res.json()
        alert(data.message || 'Erreur lors de la suppression')
      }
    } catch {
      alert('Erreur de connexion au serveur')
    } finally {
      setDeletingId(null)
    }
  }

  // Sauvegarde des gérants désignés depuis l'arbre
  const sauvegarderChefs = async () => {
    if (!newGerant1 && !newGerant2 && !newConseiller) return
    setSavingChefs(true)
    setMsgChefs('')
    const token = localStorage.getItem('token')
    try {
      if (newGerant1 || newGerant2) {
        const r = await fetch(`${API_BASE}/api/family-fund/gerants`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gerant1NumeroH: newGerant1 || fund?.gerant1 || '',
            gerant2NumeroH: newGerant2 || fund?.gerant2 || ''
          })
        })
        const d = await r.json()
        if (!d.success) { setMsgChefs(d.message); setSavingChefs(false); return }
      }
      if (newConseiller) {
        const r = await fetch(`${API_BASE}/api/family-fund/conseiller`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ conseillerNumeroH: newConseiller })
        })
        const d = await r.json()
        if (!d.success) { setMsgChefs(d.message); setSavingChefs(false); return }
      }
      setMsgChefs('✅ Chefs désignés avec succès !')
      setNewGerant1(''); setNewGerant2(''); setNewConseiller('')
      // Recharger le fonds
      const res = await fetch(`${API_BASE}/api/family-fund/mon-compte`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success && data.existe) setFund(data.compte)
    } catch {
      setMsgChefs('Erreur de connexion.')
    } finally {
      setSavingChefs(false)
    }
  }

  const ouvrirDetailDefunt = async (d: any) => {
    setDefuntDetail(d)
    setShowDefuntDetail(true)
    if (d.numeroHD) {
      setLoadingDefunt(true)
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${API_BASE}/api/family-tree/deceased/${d.numeroHD}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.success) setDefuntDetail(data.deceased)
        }
      } catch { /* utilise les données locales */ }
      finally { setLoadingDefunt(false) }
    }
  }

  const signalerDeces = async () => {
    if (!memberToReport || submittingDeces) return
    setSubmittingDeces(true)
    setMsgDeces('')
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_BASE}/api/family-tree/report-death`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberNumeroH: memberToReport.numeroH,
          dateDeces: dateDeces || undefined,
          anneeDeces: anneeDeces || undefined,
          causeDeces: causeDeces || undefined
        })
      })
      const data = await res.json()
      if (data.success) {
        setMsgDeces(`✅ ${data.message}`)
        // Mettre à jour treeInfo localement
        setTreeInfo((prev: any) => {
          if (!prev) return prev
          return {
            ...prev,
            members: (prev.members || []).filter((m: any) => m.numeroH !== memberToReport.numeroH),
            deceasedMembers: [
              ...(prev.deceasedMembers || []),
              {
                numeroHD: data.numeroHD,
                prenom: memberToReport.prenom,
                nomFamille: memberToReport.nomFamille,
                photo: memberToReport.photo,
                anneeDeces: anneeDeces ? parseInt(anneeDeces) : new Date().getFullYear()
              }
            ]
          }
        })
        setTimeout(() => {
          setShowDecesModal(false)
          setMemberToReport(null)
          setDateDeces('')
          setAnneeDeces('')
          setCauseDeces('')
          setMsgDeces('')
        }, 2000)
      } else {
        setMsgDeces(data.message || 'Erreur')
      }
    } catch {
      setMsgDeces('Erreur de connexion.')
    } finally {
      setSubmittingDeces(false)
    }
  }

  const isVideo = (url: string) => /\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(url)

  // Gérer les URLs base64 (data:...), absolues (http...) et relatives (/uploads/...)
  const buildMediaUrl = (url: string) => (url.startsWith('http') || url.startsWith('data:') ? url : `${API_BASE}${url}`)

  // Rencontre en PREMIER comme demandé
  const ALBUM_CONFIG = [
    { key: 'rencontre' as const, label: 'Rencontre', emoji: '🤝' },
    { key: 'bapteme'  as const,  label: 'Baptême',   emoji: '🕊️' },
    { key: 'mariage'  as const,  label: 'Mariage',   emoji: '💍' },
    { key: 'deces'    as const,  label: 'Décès',     emoji: '🕯️' },
  ]

  const albums = useMemo(() => {
    const keys = ['rencontre', 'bapteme', 'mariage', 'deces'] as const
    const a: Record<string, GalleryItem[]> = {}
    for (const k of keys) a[k] = []
    for (const item of sharedItems) {
      const k = (item.album || 'rencontre') as string
      if (!a[k]) a[k] = []
      a[k].push(item)
    }
    return a
  }, [sharedItems])

  return (
    <div className="max-w-6xl mx-auto px-4 pb-6">

      {/* En-tête */}
      <div className="flex items-center justify-between pt-3 pb-2">
        <h1 className="text-2xl font-bold text-gray-900">Héritage</h1>
        <button className="w-9 h-9 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300 transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* Navigation — style Facebook plat */}
      <div className="bg-white border-b border-gray-200 mb-4">
        <nav className="flex" role="tablist">

          <button type="button" role="tab" aria-selected={activeTab === 'foyer'}
            onClick={() => setActiveTab('foyer')}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 border-b-[3px] transition-colors ${
              activeTab === 'foyer'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="text-lg leading-none">🏠</span>
            <span className="text-[9px] font-semibold leading-tight truncate w-full text-center">Foyer</span>
          </button>

          <button type="button" role="tab" aria-selected={activeTab === 'echanges'}
            onClick={() => setActiveTab('echanges')}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 border-b-[3px] transition-colors ${
              activeTab === 'echanges'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="text-lg leading-none">💬</span>
            <span className="text-[9px] font-semibold leading-tight truncate w-full text-center">Messages</span>
          </button>

          <button type="button"
            onClick={() => navigate('/probleme')}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 px-1 border-b-[3px] border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="text-lg leading-none">🚨</span>
            <span className="text-[9px] font-semibold leading-tight truncate w-full text-center">Problèmes</span>
          </button>

          <button type="button" role="tab" aria-selected={activeTab === 'arbre'}
            onClick={() => setActiveTab('arbre')}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 border-b-[3px] transition-colors ${
              activeTab === 'arbre'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="text-lg leading-none">🌳</span>
            <span className="text-[9px] font-semibold leading-tight truncate w-full text-center">Arbre</span>
          </button>

          {partner && (
            <button type="button" role="tab" aria-selected={activeTab === 'arbre-conjoint'}
              onClick={() => setActiveTab('arbre-conjoint')}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 border-b-[3px] transition-colors ${
                activeTab === 'arbre-conjoint'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {partner.photo
                ? <img src={partner.photo} alt={partner.prenom} className="w-5 h-5 rounded-full object-cover" />
                : <span className="text-lg leading-none">💑</span>
              }
              <span className="text-[9px] font-semibold leading-tight truncate w-full text-center">{partner.prenom}</span>
            </button>
          )}

        </nav>
      </div>

        {activeTab === 'arbre-conjoint' && partner && (
          <>
            <div className="flex items-center gap-3 mb-4">
              {partner.photo && (
                <img src={partner.photo} alt={partner.prenom} className="w-10 h-10 rounded-full object-cover border-2 border-pink-400" />
              )}
              <h2 className="text-2xl font-bold">💑 Arbre de {partner.prenom} {partner.nomFamille}</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Vous consultez l'arbre généalogique de votre conjoint(e). Votre lien apparaît dans cet arbre.
            </p>
            <ArbreGenealogique
              userData={{
                ...partner,
                genre: partner.genre || 'AUTRE',
                conjointPrenom: user?.prenom,
                conjointNumeroH: user?.numeroH,
                conjointNomFamille: user?.nomFamille,
                conjointGenre: user?.genre,
                conjointPhoto: (user as any)?.photo
              }}
              cercleCounts={cercleCounts}
              onOpenGallery={openGallery}
              treeHidden={[]}
              onTreeHiddenChange={() => {}}
            />
          </>
        )}

        {activeTab === 'arbre' && (
          <>
            <h2 className="text-2xl font-bold mb-4">🌳 Héritage</h2>

            {/* ─── Numéro de sang familial ─── */}
            {treeInfo?.familyCode ? (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 mb-4 flex items-center gap-3">
                <span className="text-2xl">🩸</span>
                <div className="flex-1">
                  <p className="font-black text-sm text-indigo-900">Numéro de sang familial</p>
                  <p className="text-xs text-indigo-600 mt-0.5">Identifiant unique de votre lignée — jamais répété</p>
                </div>
                <div className="text-right">
                  <span className="font-black text-xl text-indigo-800 tracking-widest">{treeInfo.familyCode}</span>
                  {treeInfo.bloodNumber && (
                    <p className="text-xs text-indigo-500">Sang n°{treeInfo.bloodNumber}</p>
                  )}
                </div>
              </div>
            ) : treeInfo?.codePaiementRequis ? (
              <ActivationArbreCard treeId={treeInfo.id} apiBase={API_BASE} />
            ) : null}

            {/* ─── Chefs de lignée ─── */}
            {fund && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 mb-3">
                <button
                  type="button"
                  onClick={() => { setShowDesignerChefs(v => !v); setMsgChefs('') }}
                  className="w-full flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-base leading-none">👑</span>
                    <p className="text-xs font-bold text-amber-900">Chefs de lignée</p>
                  </div>
                  {(() => {
                    const chefs = [
                      { role: 'Patriarche',   nom: fund.conseillerNom, photo: fund.conseillerPhoto, color: '#92400e' },
                      { role: 'Porte-parole', nom: fund.gerant1Nom,    photo: fund.gerant1Photo,    color: '#1e40af' },
                      { role: 'Délégué',      nom: fund.gerant2Nom,    photo: fund.gerant2Photo,    color: '#374151' },
                    ]
                    return (
                      <div className="flex items-center gap-4">
                        {chefs.map(chef => (
                          <div key={chef.role} className="flex flex-col items-center gap-0.5">
                            {chef.photo
                              ? <img src={chef.photo} alt={chef.nom || chef.role} className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" />
                              : <div className="w-8 h-8 rounded-full bg-white border border-amber-200 flex items-center justify-center text-xs font-bold shadow-sm" style={{ color: chef.color }}>
                                  {chef.nom ? chef.nom.charAt(0) : '—'}
                                </div>
                            }
                            <span className="text-[8px] text-gray-500 leading-tight">{chef.role}</span>
                          </div>
                        ))}
                        <span className="text-amber-600 text-xs">{showDesignerChefs ? '▲' : '▼'}</span>
                      </div>
                    )
                  })()}
                </button>
                {showDesignerChefs && (
                  <div className="mt-4 space-y-3 border-t border-amber-200 pt-4">
                    {(fund.estAdmin || !fund.gerant1) && (
                      <>
                        <p className="text-xs text-amber-800 font-semibold">Entrez le numéro H du membre à désigner. Laissez vide pour conserver l'actuel.</p>
                        {fund.estAdmin && (
                          <div>
                            <label className="text-xs font-bold text-amber-800 block mb-1">🦁 Patriarche — Chef à vie (actuel : {fund.conseillerNom || 'aucun'})</label>
                            <input type="text" value={newConseiller} onChange={e => setNewConseiller(e.target.value)} placeholder="Numéro H du Patriarche (le plus âgé)" className="w-full rounded-xl border border-amber-200 px-3 py-2 text-sm outline-none focus:border-amber-400 bg-white" />
                          </div>
                        )}
                        <div>
                          <label className="text-xs font-bold text-gray-700 block mb-1">🎙️ Porte-parole (actuel : {fund.gerant1 ? `#${fund.gerant1}` : 'aucun'})</label>
                          <input type="text" value={newGerant1} onChange={e => setNewGerant1(e.target.value)} placeholder="Numéro H du nouveau Porte-parole" className="w-full rounded-xl border border-amber-200 px-3 py-2 text-sm outline-none focus:border-amber-400 bg-white" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-700 block mb-1">🤲 Délégué (actuel : {fund.gerant2 ? `#${fund.gerant2}` : 'aucun'})</label>
                          <input type="text" value={newGerant2} onChange={e => setNewGerant2(e.target.value)} placeholder="Numéro H du nouveau Délégué" className="w-full rounded-xl border border-amber-200 px-3 py-2 text-sm outline-none focus:border-amber-400 bg-white" />
                        </div>
                        {msgChefs && (
                          <p className={`text-xs font-semibold text-center rounded-lg px-3 py-2 ${msgChefs.includes('✅') ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>{msgChefs}</p>
                        )}
                        <button onClick={sauvegarderChefs} disabled={savingChefs || (!newGerant1 && !newGerant2 && !newConseiller)} className="w-full py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#d97706,#b45309)' }}>
                          {savingChefs ? 'Enregistrement...' : '👑 Confirmer la désignation'}
                        </button>
                      </>
                    )}
                    {!fund.estAdmin && fund.gerant1 && (
                      <p className="text-xs text-amber-700 text-center">Seuls les administrateurs actuels peuvent changer les chefs.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─── Galerie + Mairie côte à côte ─── */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={openGallery}
                className="flex flex-col items-start gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left shadow-sm"
              >
                <span className="text-2xl">📷</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">Galerie</p>
                  <p className="text-[11px] text-gray-500 leading-tight">Rencontre · Baptême<br />Mariage · Décès</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  const session = JSON.parse(localStorage.getItem('session_user') || '{}')
                  const u = session.userData || session
                  const ville = u?.lieuResidence2 || u?.lieuResidence3 || u?.ville || ''
                  const params = new URLSearchParams({ type: 'mairie' })
                  if (ville) params.set('city', ville)
                  navigate(`/liste-professionnels?${params.toString()}`)
                }}
                className="flex flex-col items-start gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left shadow-sm"
              >
                <span className="text-2xl">🏛️</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">Mairie</p>
                  <p className="text-[11px] text-gray-500 leading-tight">Déclarer une naissance,<br />un mariage, un décès</p>
                </div>
              </button>
            </div>

            {/* ─── Filtre vivants / décédés ─── */}
            {treeInfo && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  {(['vivants', 'defunts', 'tous'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFiltreArbre(f)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                        filtreArbre === f
                          ? f === 'vivants'   ? 'bg-emerald-600 text-white border-emerald-600'
                          : f === 'defunts'   ? 'bg-gray-700 text-white border-gray-700'
                          :                     'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {f === 'vivants' ? `🌿 Vivants (${(treeInfo.members || []).length})` : f === 'defunts' ? `🕯️ Décédés (${(treeInfo.deceasedMembers || []).length})` : '📋 Tous'}
                    </button>
                  ))}
                </div>

                {/* Liste membres vivants */}
                {(filtreArbre === 'vivants' || filtreArbre === 'tous') && (treeInfo.members || []).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                    {(treeInfo.members as any[]).map((m: any) => (
                      <div key={m.numeroH} className="flex flex-col items-center gap-1 rounded-xl border border-emerald-100 bg-emerald-50 p-2 text-center relative">
                        {m.photo
                          ? <img src={m.photo} alt={m.prenom} className="w-10 h-10 rounded-full object-cover border-2 border-emerald-200" />
                          : <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center font-bold text-emerald-700">{(m.prenom || '?').charAt(0)}</div>
                        }
                        <p className="text-[11px] font-bold text-emerald-900 truncate w-full">{m.prenom} {m.nomFamille}</p>
                        <p className="text-[9px] text-gray-400">#{hideIncrement(m.numeroH)}</p>
                        {m.numeroH !== effectiveUser.numeroH && (
                          <button
                            onClick={() => { setMemberToReport(m); setShowDecesModal(true); setMsgDeces('') }}
                            className="mt-1 text-[9px] px-2 py-0.5 rounded-full border border-gray-300 text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                          >
                            Signaler décès
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Liste membres décédés — cliquables pour voir les détails */}
                {(filtreArbre === 'defunts' || filtreArbre === 'tous') && (treeInfo.deceasedMembers || []).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                    {(treeInfo.deceasedMembers as any[]).map((d: any) => (
                      <button
                        key={d.numeroHD}
                        onClick={() => ouvrirDetailDefunt(d)}
                        className="flex flex-col items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-2 text-center opacity-75 hover:opacity-100 hover:border-gray-400 hover:shadow transition-all cursor-pointer"
                      >
                        {d.photo
                          ? <img src={d.photo} alt={d.prenom} className="w-10 h-10 rounded-full object-cover border-2 border-gray-300 grayscale" />
                          : <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-600">{(d.prenom || '?').charAt(0)}</div>
                        }
                        <p className="text-[11px] font-bold text-gray-700 truncate w-full">{d.prenom} {d.nomFamille}</p>
                        <p className="text-[9px] text-gray-400">🕯️ {d.anneeDeces || 'Décédé'}</p>
                        <p className="text-[9px] text-indigo-400 font-mono">#{d.numeroHD}</p>
                        <p className="text-[9px] text-gray-400">Voir détails →</p>
                      </button>
                    ))}
                  </div>
                )}

                {filtreArbre === 'defunts' && (treeInfo.deceasedMembers || []).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">Aucun membre décédé enregistré dans cet arbre.</p>
                )}
              </div>
            )}

            <ArbreGenealogique
              userData={enhancedUser}
              cercleCounts={cercleCounts}
              onOpenGallery={openGallery}
              treeHidden={treeHidden}
              onTreeHiddenChange={async (newList) => {
                setTreeHidden(newList)
                const token = localStorage.getItem('token')
                if (!token) return
                try {
                  const res = await fetch(`${API_BASE}/api/auth/me/tree-hidden`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ treeHidden: newList })
                  })
                  if (res.ok) {
                    const data = await res.json()
                    if (data.success && Array.isArray(data.treeHidden)) setTreeHidden(data.treeHidden)
                  }
                } catch {
                  const refetch = await fetch(`${API_BASE}/api/auth/me/tree-hidden`, { headers: { Authorization: `Bearer ${token}` } })
                  if (refetch.ok) {
                    const data = await refetch.json()
                    if (data.success && Array.isArray(data.treeHidden)) setTreeHidden(data.treeHidden)
                  }
                }
              }}
            />
          </>
        )}

        {activeTab === 'echanges' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-xl font-bold text-gray-800">Messagerie familiale</h2>
              <p className="text-sm text-gray-500">
                Espace privé réservé aux membres de la famille{' '}
                <span className="font-semibold text-gray-700">
                  {effectiveUser.nomFamille ? `${effectiveUser.nomFamille}` : ''}
                </span>
              </p>
              <div className="flex items-center gap-3 mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-lg flex-shrink-0">
                  👨‍👩‍👧‍👦
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Famille {effectiveUser.nomFamille || 'ADAM'}</p>
                  <p className="text-xs text-gray-400">Discussion de groupe</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[340px] sm:h-[480px] bg-white">
                {/* Header style WhatsApp */}
                <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-xl">
                      👨‍👩‍👧‍👦
                    </div>
                    <div>
                      <p className="font-semibold">
                        Famille {effectiveUser.nomFamille || 'ADAM'}
                      </p>
                      <p className="text-xs text-green-100">Espace privé entre membres de la famille</p>
                    </div>
                  </div>
                  {/* Boutons appel (visible si conjoint lié) */}
                  {partner && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startCall(partner.numeroH, `${partner.prenom} ${partner.nomFamille}`, 'audio')}
                        className="w-9 h-9 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center text-lg transition-colors"
                        title="Appel audio"
                      >
                        📞
                      </button>
                      <button
                        onClick={() => startCall(partner.numeroH, `${partner.prenom} ${partner.nomFamille}`, 'video')}
                        className="w-9 h-9 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center text-lg transition-colors"
                        title="Appel vidéo"
                      >
                        📹
                      </button>
                    </div>
                  )}
                </div>

                {/* Zone de messages */}
                <div className="flex-1 bg-gray-100 px-3 py-3 overflow-y-auto">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <div className="h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Chargement des messages...</span>
                      </div>
                    </div>
                  ) : familyMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-gray-500 text-sm space-y-2">
                        <p>Aucun message pour le moment.</p>
                        <p>Soyez le premier à écrire à votre famille.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {familyMessages.map((msg) => {
                        const isMe = msg.numeroH === effectiveUser.numeroH
                        const createdAt =
                          msg.createdAt || msg.created_at || new Date().toISOString()

                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs sm:max-w-md px-3 py-2 rounded-2xl shadow-sm ${
                                isMe
                                  ? 'bg-green-500 text-white rounded-br-sm'
                                  : 'bg-white text-gray-900 rounded-bl-sm'
                              }`}
                            >
                              {!isMe && (
                                <p className="text-xs font-semibold mb-0.5 opacity-80">
                                  {msg.authorName || 'Membre de la famille'}
                                </p>
                              )}
                              {(msg.messageType === 'text' || !msg.messageType) && (
                                <p className="text-sm whitespace-pre-line">{msg.content}</p>
                              )}
                              {msg.mediaUrl && msg.messageType === 'image' && (
                                <img
                                  src={msg.mediaUrl}
                                  alt="Pièce jointe"
                                  className="mt-1 rounded-lg max-h-60 object-cover"
                                />
                              )}
                              {msg.mediaUrl && msg.messageType === 'video' && (
                                <video
                                  src={msg.mediaUrl}
                                  controls
                                  className="mt-1 rounded-lg max-h-60 w-full"
                                />
                              )}
                              {msg.mediaUrl && msg.messageType === 'audio' && (
                                <audio
                                  src={msg.mediaUrl}
                                  controls
                                  className="mt-1 w-full"
                                />
                              )}
                              <p
                                className={`text-[10px] mt-1 ${
                                  isMe ? 'text-green-100' : 'text-gray-500'
                                }`}
                              >
                                {new Date(createdAt).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Zone de saisie */}
                <div className="border-t border-gray-200 bg-gray-50 px-3 py-2">
                  {/* Indicateur d'enregistrement */}
                  {isRecording && (
                    <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-red-50 rounded-full border border-red-200">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs text-red-600 font-medium">
                        🎤 {recordingSeconds}s / 30s — relâchez pour envoyer
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {/* Bouton photo / vidéo */}
                    <label
                      className={`w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xl text-gray-500 hover:bg-gray-100 cursor-pointer transition-colors ${isSending ? 'opacity-50 pointer-events-none' : ''}`}
                      title="Envoyer une photo ou vidéo"
                    >
                      📷
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) sendFamilyMediaMessage(file)
                          e.target.value = ''
                        }}
                      />
                    </label>

                    {/* Bouton fichier audio */}
                    <label
                      className={`w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xl text-gray-500 hover:bg-gray-100 cursor-pointer transition-colors ${isSending ? 'opacity-50 pointer-events-none' : ''}`}
                      title="Envoyer un fichier audio"
                    >
                      🎵
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) sendFamilyMediaMessage(file)
                          e.target.value = ''
                        }}
                      />
                    </label>

                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendFamilyMessage()
                        }
                      }}
                      placeholder="Écrivez un message familial..."
                      className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm"
                    />

                    {/* Micro vocal : appui = enregistre, relâche = envoie */}
                    <button
                      type="button"
                      onMouseDown={startRecording}
                      onMouseUp={stopRecording}
                      onTouchStart={(e) => { e.preventDefault(); startRecording() }}
                      onTouchEnd={(e) => { e.preventDefault(); stopRecording() }}
                      disabled={isSending}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${
                        isRecording
                          ? 'bg-red-500 scale-110 shadow-lg'
                          : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'
                      }`}
                      title="Maintenir pour enregistrer un message vocal"
                    >
                      🎤
                    </button>

                    {/* Envoyer texte */}
                    {newMessage.trim() && (
                      <button
                        type="button"
                        onClick={sendFamilyMessage}
                        disabled={isSending}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg bg-green-600 hover:bg-green-700 transition-colors"
                      >
                        ➤
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'foyer' && (
          <div>
            {/* Nav 4 boutons Foyer */}
            <div className="bg-white border-b border-gray-200 shadow-sm rounded-xl overflow-hidden mt-2">
              <nav className="flex">
                {([
                  { id: 'parents', emoji: '👨‍👩‍👦', label: 'Parents'   },
                  { id: 'enfants', emoji: '👶',    label: 'Enfants'   },
                  { id: 'femme',   emoji: '👰',    label: 'Ma femme'  },
                  { id: 'homme',   emoji: '🤵',    label: 'Mon homme' },
                ] as const).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFoyerSection(foyerSection === item.id ? null : item.id)}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 border-b-2 transition-colors ${
                      foyerSection === item.id
                        ? 'border-emerald-600 text-emerald-700 bg-emerald-50'
                        : 'border-transparent text-gray-500 hover:text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <span className="text-2xl leading-none">{item.emoji}</span>
                    <span className="text-[9px] font-medium leading-tight truncate w-full text-center">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Contenu inline — s'ouvre sans navigation */}
            <Suspense fallback={<div className="flex justify-center py-10"><div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}>
              {foyerSection === 'parents' && <ParentsInline inline />}
              {foyerSection === 'enfants' && <EnfantsInline inline />}
              {foyerSection === 'femme'   && <PartenaireInline inline />}
              {foyerSection === 'homme'   && <PartenaireInline inline />}
            </Suspense>
          </div>
        )}

      {/* ── MODAL DÉTAIL DÉFUNT ── */}
      {showDefuntDetail && defuntDetail && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowDefuntDetail(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header gris */}
            <div className="bg-gray-800 text-white px-5 py-4 flex items-center gap-3">
              {defuntDetail.photo
                ? <img src={defuntDetail.photo} alt={defuntDetail.prenom} className="w-14 h-14 rounded-full object-cover border-2 border-gray-600 grayscale" />
                : <div className="w-14 h-14 rounded-full bg-gray-600 flex items-center justify-center text-2xl font-bold">{(defuntDetail.prenom || '?').charAt(0)}</div>
              }
              <div className="flex-1">
                <p className="font-black text-lg leading-tight">{defuntDetail.prenom} {defuntDetail.nomFamille}</p>
                <p className="text-gray-400 text-xs font-mono mt-0.5">#{defuntDetail.numeroHD}</p>
                <p className="text-gray-300 text-xs mt-1">🕯️ Défunt</p>
              </div>
              <button onClick={() => setShowDefuntDetail(false)} className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-300">✕</button>
            </div>

            {loadingDefunt ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {defuntDetail.dateNaissance && (
                    <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                      <p className="text-gray-400 mb-0.5">Naissance</p>
                      <p className="font-bold text-gray-800">{new Date(defuntDetail.dateNaissance).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                  {(defuntDetail.dateDeces || defuntDetail.anneeDeces) && (
                    <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                      <p className="text-gray-400 mb-0.5">Décès</p>
                      <p className="font-bold text-gray-800">
                        {defuntDetail.dateDeces ? new Date(defuntDetail.dateDeces).toLocaleDateString('fr-FR') : defuntDetail.anneeDeces}
                      </p>
                    </div>
                  )}
                  {defuntDetail.lieuDeces && (
                    <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                      <p className="text-gray-400 mb-0.5">Lieu du décès</p>
                      <p className="font-bold text-gray-800">{defuntDetail.lieuDeces}</p>
                    </div>
                  )}
                  {defuntDetail.causeDeces && (
                    <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                      <p className="text-red-400 mb-0.5">Cause du décès</p>
                      <p className="font-bold text-red-700">{defuntDetail.causeDeces}</p>
                    </div>
                  )}
                  {defuntDetail.religion && (
                    <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                      <p className="text-gray-400 mb-0.5">Religion</p>
                      <p className="font-bold text-gray-800">{defuntDetail.religion}</p>
                    </div>
                  )}
                  {defuntDetail.ethnie && (
                    <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                      <p className="text-gray-400 mb-0.5">Ethnie</p>
                      <p className="font-bold text-gray-800">{defuntDetail.ethnie}</p>
                    </div>
                  )}
                  {(defuntDetail.pays || defuntDetail.regionOrigine) && (
                    <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 col-span-2">
                      <p className="text-gray-400 mb-0.5">Origine</p>
                      <p className="font-bold text-gray-800">{[defuntDetail.regionOrigine, defuntDetail.pays].filter(Boolean).join(', ')}</p>
                    </div>
                  )}
                  {defuntDetail.generation && (
                    <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-2">
                      <p className="text-indigo-400 mb-0.5">Génération</p>
                      <p className="font-bold text-indigo-700">{defuntDetail.generation}</p>
                    </div>
                  )}
                  {defuntDetail.decet && (
                    <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-2">
                      <p className="text-indigo-400 mb-0.5">Décet</p>
                      <p className="font-bold text-indigo-700">{defuntDetail.decet}</p>
                    </div>
                  )}
                </div>

                {(defuntDetail.numeroHPere || defuntDetail.numeroHMere) && (
                  <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs">
                    <p className="text-amber-600 font-semibold mb-1">Parents</p>
                    {defuntDetail.numeroHPere && <p className="text-gray-700">Père : <span className="font-mono font-bold">#{hideIncrement(defuntDetail.numeroHPere)}</span></p>}
                    {defuntDetail.numeroHMere && <p className="text-gray-700">Mère : <span className="font-mono font-bold">#{hideIncrement(defuntDetail.numeroHMere)}</span></p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL SIGNALEMENT DE DÉCÈS ── */}
      {showDecesModal && memberToReport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => { if (!submittingDeces) setShowDecesModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              {memberToReport.photo
                ? <img src={memberToReport.photo} alt={memberToReport.prenom} className="w-12 h-12 rounded-full object-cover grayscale border-2 border-gray-200" />
                : <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-lg">{(memberToReport.prenom || '?').charAt(0)}</div>
              }
              <div>
                <h3 className="font-black text-gray-900">Signaler un décès</h3>
                <p className="text-sm text-gray-600">{memberToReport.prenom} {memberToReport.nomFamille}</p>
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Cette action est irréversible. Le compte sera fermé et un numéro de défunt (DM…) sera généré automatiquement.
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Date du décès</label>
                <input
                  type="date"
                  value={dateDeces}
                  onChange={e => { setDateDeces(e.target.value); if (e.target.value) setAnneeDeces(new Date(e.target.value).getFullYear().toString()) }}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Année seulement (si date inconnue)</label>
                <input
                  type="number"
                  value={anneeDeces}
                  onChange={e => setAnneeDeces(e.target.value)}
                  placeholder={`Ex: ${new Date().getFullYear()}`}
                  min="1900"
                  max={new Date().getFullYear()}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Cause du décès (optionnel)</label>
                <input
                  type="text"
                  value={causeDeces}
                  onChange={e => setCauseDeces(e.target.value)}
                  placeholder="Ex: maladie, accident, vieillesse..."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                />
              </div>
            </div>

            {msgDeces && (
              <p className={`text-xs font-semibold text-center rounded-lg px-3 py-2 mb-3 ${msgDeces.includes('✅') ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                {msgDeces}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setShowDecesModal(false); setMsgDeces(''); setDateDeces(''); setAnneeDeces(''); setCauseDeces('') }}
                disabled={submittingDeces}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={signalerDeces}
                disabled={submittingDeces || (!dateDeces && !anneeDeces)}
                className="flex-1 py-2.5 rounded-xl bg-gray-800 text-white font-bold text-sm hover:bg-gray-700 disabled:opacity-50"
              >
                {submittingDeces ? 'Enregistrement...' : '🕯️ Confirmer le décès'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GALERIE FAMILLE PAR ALBUMS (vue en deux colonnes) ── */}
      {showGallery && (
        <div className="fixed inset-0 bg-white flex flex-col z-50">

          {/* Header (style clair type WhatsApp Web) */}
          <div
            className="flex items-center justify-between px-4 py-3 bg-white text-gray-900 border-b border-gray-200"
            style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
          >
            {galleryView === 'detail' ? (
              <button
                onClick={() => setGalleryView('list')}
                className="flex items-center gap-2 text-gray-900 active:opacity-70"
              >
                <span className="text-xl leading-none">←</span>
                <span className="font-semibold text-base">
                  {ALBUM_CONFIG.find(c => c.key === activeAlbum)?.emoji}{' '}
                  {ALBUM_CONFIG.find(c => c.key === activeAlbum)?.label}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowGallery(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-sm text-gray-800"
                >
                  <span className="text-lg leading-none">←</span>
                  <span>Retour à l'arbre</span>
                </button>
                <h3 className="text-base font-bold">Galerie familiale</h3>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label
                  className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    uploading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95'
                  }`}
                >
                  {uploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>＋ Ajouter</>
                  )}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    disabled={uploading}
                    onChange={async e => {
                      const files = Array.from(e.target.files || [])
                      for (const file of files) {
                        await uploadToSharedGallery(file)
                      }
                      e.target.value = ''
                    }}
                  />
                </label>
              <button
                onClick={() => {
                  setShowGallery(false)
                  setGalleryView('list')
                  setViewerMedia(null)
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-lg"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Corps */}
          {sharedLoading ? (
            <div className="flex-1 flex items-center justify-center bg-white">
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <div className="w-10 h-10 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Chargement...</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 bg-[#f0f2f5]">
              {/* Colonne gauche : liste des albums */}
              <div className="w-64 border-r border-gray-200 overflow-y-auto bg-white">
                <div className="divide-y divide-gray-200">
                  {ALBUM_CONFIG.map(cfg => {
                    const albumItems = albums[cfg.key] || []
                    const count = albumItems.length
                    const thumb = albumItems[0]
                    const isActive = activeAlbum === cfg.key
                    return (
                      <button
                        key={cfg.key}
                        onClick={() => {
                          setActiveAlbum(cfg.key)
                          setGalleryView('detail')
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${
                          isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                          {thumb ? (
                            thumb.type === 'video' || isVideo(thumb.url) ? (
                              <video
                                src={buildMediaUrl(thumb.url)}
                                className="w-full h-full object-cover"
                                muted
                              />
                            ) : (
                              <img
                                src={buildMediaUrl(thumb.url)}
                                alt={cfg.label}
                                className="w-full h-full object-cover"
                              />
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">
                              {cfg.emoji}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {cfg.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {count === 0 ? 'Vide' : `${count} élément${count > 1 ? 's' : ''}`}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Colonne droite : contenu de l'album sélectionné */}
              <div className="flex-1 overflow-y-auto bg-[#f0f2f5]">
                {(albums[activeAlbum]?.length || 0) === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-20 text-gray-600">
                    <span className="text-7xl mb-4 opacity-20">
                      {ALBUM_CONFIG.find(c => c.key === activeAlbum)?.emoji}
                    </span>
                    <p className="text-sm font-medium text-gray-500">Aucune photo ni vidéo</p>
                    <p className="text-xs text-gray-600 mt-1">Appuyez sur "＋ Ajouter" pour commencer</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-0.5 p-4">
                    {albums[activeAlbum].map((item, idx) => (
                      <div
                        key={idx}
                        className="relative group overflow-hidden bg-white rounded-md shadow-sm"
                        style={{ aspectRatio: '1' }}
                      >
                        {item.type === 'video' || isVideo(item.url) ? (
                          <video
                            src={buildMediaUrl(item.url)}
                            className="w-full h-full object-cover cursor-pointer"
                            muted
                            onClick={() => setViewerMedia(item)}
                          />
                        ) : (
                          <img
                            src={buildMediaUrl(item.url)}
                            alt=""
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setViewerMedia(item)}
                          />
                        )}

                        {(item.type === 'video' || isVideo(item.url)) && (
                          <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded-full pointer-events-none">
                            ▶
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all opacity-0 group-hover:opacity-100 flex items-end justify-end p-1">
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              handleDeleteMedia(item)
                            }}
                            disabled={deletingId === item.id}
                            className="w-7 h-7 rounded-full bg-red-600/90 flex items-center justify-center text-white text-xs active:scale-90"
                          >
                            {deletingId === item.id ? '…' : '🗑️'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL APPEL WebRTC ─────────────────────────────────────────────── */}
      {showCall && effectiveUser.numeroH && (
        <CallModal
          socket={getSocket()}
          currentUser={{
            numeroH: effectiveUser.numeroH,
            prenom: effectiveUser.prenom,
            nomFamille: effectiveUser.nomFamille,
          }}
          outgoingCall={outgoingCall ?? undefined}
          incomingCall={incomingCall ?? undefined}
          onClose={() => {
            setShowCall(false)
            setOutgoingCall(null)
            setIncomingCall(null)
          }}
        />
      )}

      {/* ── VISIONNEUSE PLEIN ÉCRAN ── */}
      {viewerMedia && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4"
          onClick={() => setViewerMedia(null)}
        >
          <button className="absolute top-4 right-4 text-white text-3xl w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20" onClick={() => setViewerMedia(null)}>✕</button>
          {viewerMedia.type === 'video' || isVideo(viewerMedia.url) ? (
            <video
              src={buildMediaUrl(viewerMedia.url)}
              controls
              autoPlay
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <img
              src={buildMediaUrl(viewerMedia.url)}
              alt=""
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain"
              onClick={e => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  )
}
