import { Navigate, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { hideIncrement } from '../../utils/formatNumeroH'
import { InvitationManager } from '../../utils/invitationManager'
import type { Invitation } from '../../types/invitation.ts'

interface UserData {
  numeroH: string
  prenom: string
  nomFamille: string
}

interface FamilyMember {
  numeroH: string
  nomComplet: string
  relation: string
  statut: Invitation['status']
}

function getStatutLabel(statut: FamilyMember['statut']) {
  switch (statut) {
    case 'accepted': return 'Acceptée'
    case 'declined': return 'Refusée'
    default: return 'En attente'
  }
}

function lireSession(): UserData | null {
  try {
    const sessionData = JSON.parse(localStorage.getItem('session_user') || '{}')
    const u = sessionData.userData || sessionData
    return u?.numeroH ? u : null
  } catch {
    return null
  }
}

export default function Membres() {
  // Session lue tout de suite (sinon redirection vers /login avant le chargement)
  const [user] = useState<UserData | null>(() => lireSession())
  const [membres, setMembres] = useState<FamilyMember[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    if (!user) return
    // Membres invités : invitations familiales enregistrées en base (/api/family-data)
    InvitationManager.getInvitations()
      .then(({ received, sent }) => {
        const envoyees: FamilyMember[] = sent.map((inv) => ({
          numeroH: inv.toNumeroH,
          nomComplet: inv.toName || inv.toNumeroH,
          relation: inv.relation,
          statut: inv.status
        }))
        const recuesAcceptees: FamilyMember[] = received
          .filter((inv) => inv.status === 'accepted')
          .map((inv) => ({
            numeroH: inv.fromNumeroH,
            nomComplet: inv.fromName || inv.fromNumeroH,
            relation: inv.relation,
            statut: inv.status
          }))
        setMembres([...envoyees, ...recuesAcceptees])
      })
      .catch((e: Error) => setErreur(e.message || 'Impossible de charger les membres.'))
      .finally(() => setChargement(false))
  }, [user])

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to="/famille"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors shadow-sm border border-gray-200 dark:border-gray-600"
        >
          <span aria-hidden>←</span>
          Retour à Famille
        </Link>
      </div>
      <div className="card">
        <h2 className="text-2xl font-bold mb-2">📋 Membres invités ({membres.length})</h2>
        {chargement ? (
          <div className="text-gray-500">Chargement…</div>
        ) : erreur ? (
          <div className="text-red-600">{erreur}</div>
        ) : membres.length === 0 ? (
          <div className="text-gray-500">Aucun membre ajouté pour le moment.</div>
        ) : (
          <div className="stack">
            {membres.map((m, i) => (
              <div key={i} className="p-3 bg-white rounded-xl ring-1 ring-gray-200">
                <div className="row">
                  <div className="col-6 font-medium">{m.nomComplet}</div>
                  <div className="col-3 text-blue-700 font-semibold">{hideIncrement(m.numeroH)}</div>
                  <div className="col-3">{m.relation} · {getStatutLabel(m.statut)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
