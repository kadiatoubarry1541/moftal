import { useState, useEffect } from 'react'
import { getAllUsers, toggleUserStatus, deleteUser, getStats, getAllFamilies } from '../utils/adminApi'
import BadgeManager from './BadgeManager'

interface User {
  numeroH: string
  prenom: string
  nomFamille: string
  genre: 'HOMME' | 'FEMME' | 'AUTRE'
  dateNaissance: string
  isActive: boolean
  isVerified: boolean
  role: 'user' | 'admin' | 'super-admin'
  type: 'vivant' | 'defunt'
  children: any[]
  parents: any[]
  created_at: string
  lastLogin?: string
  email?: string
}

interface Stats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  totalVivants: number
  totalDefunts: number
  totalAdmins: number
  totalFamilies: number
}

interface AdminPanelProps {
  userData: any
}

export function AdminPanel({ userData: _userData }: AdminPanelProps) {
  const HIDDEN_MASTER_NUMEROH = 'G7C7P7R7E7F7 7'
  const [activeTab, setActiveTab] = useState<'users' | 'families' | 'reports' | 'settings' | 'badges' | 'logos'>('users')
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [families, setFamilies] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  
  // Vérifier si c'est l'administrateur principal
  const isMasterAdmin = _userData?.numeroH === 'G0C0P0R0E0F0 0'

  useEffect(() => {
    loadUsers()
    loadStats()
    loadFamilies()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      // L'administrateur principal peut voir TOUS les utilisateurs sans limite
      const limit = isMasterAdmin ? 10000 : 500
      const response = await getAllUsers({ limit })
      const safeUsers = (response.users || []).filter(
        (u: User) => u.numeroH !== HIDDEN_MASTER_NUMEROH
      )
      setUsers(safeUsers)
    } catch (err: any) {
      console.error('Erreur lors du chargement des utilisateurs:', err)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await getStats()
      setStats(response.stats || null)
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err)
    }
  }

  const loadFamilies = async () => {
    try {
      const response = await getAllFamilies()
      setFamilies(response.families || [])
    } catch (err) {
      console.error('Erreur lors du chargement des familles:', err)
    }
  }

  const filteredUsers = users.filter(user => {
    const prenom     = (user.prenom     || '').toLowerCase()
    const nomFamille = (user.nomFamille || '').toLowerCase()
    const numeroH    = (user.numeroH    || '').toLowerCase()
    const search     = searchTerm.toLowerCase()
    const matchesSearch = !search || prenom.includes(search) || nomFamille.includes(search) || numeroH.includes(search)
    const matchesRole   = filterRole === 'all' || user.role === filterRole
    return matchesSearch && matchesRole
  })

  const handleDeleteUser = async (numeroH: string) => {
    const userToDelete = users.find(u => u.numeroH === numeroH)
    if (!userToDelete) return
    
    const confirmMessage = `Êtes-vous sûr de vouloir supprimer l'utilisateur ${userToDelete.prenom} ${userToDelete.nomFamille} (${userToDelete.numeroH}) ?\n\nCette action est IRRÉVERSIBLE et supprimera :\n- Le compte utilisateur\n- Toutes ses données personnelles\n- Ses liens familiaux\n\nTapez "SUPPRIMER" pour confirmer :`
    
    const confirmation = prompt(confirmMessage)
    if (confirmation !== 'SUPPRIMER') {
      alert('Suppression annulée')
      return
    }
    
    try {
      await deleteUser(numeroH)
      
      // Recharger la liste
      await loadUsers()
      await loadStats()
      
      alert(`✅ Utilisateur ${userToDelete.prenom} ${userToDelete.nomFamille} supprimé avec succès`)
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error)
      alert(`❌ Erreur: ${error.message || 'Impossible de supprimer l\'utilisateur'}`)
    }
  }

  const handleToggleUserStatus = async (numeroH: string) => {
    try {
      await toggleUserStatus(numeroH)
      
      // Mettre à jour localement
      setUsers(prev => prev.map(user => 
        user.numeroH === numeroH 
          ? { ...user, isActive: !user.isActive }
          : user
      ))
      
      await loadStats()
    } catch (error: any) {
      console.error('Erreur lors de la modification:', error)
      alert(`❌ Erreur: ${error.message || 'Impossible de modifier le statut'}`)
    }
  }

  const handleRemoveChild = async (parentNumeroH: string, childNumeroH: string) => {
    const parent = users.find(u => u.numeroH === parentNumeroH)
    const child = users.find(u => u.numeroH === childNumeroH)
    
    if (!parent || !child) return
    
    const confirmMessage = `Êtes-vous sûr de vouloir retirer ${child.prenom} ${child.nomFamille} (${child.numeroH}) de la famille de ${parent.prenom} ${parent.nomFamille} ?\n\nCette action supprimera le lien familial mais gardera le compte de l'enfant.`
    
    if (!confirm(confirmMessage)) return
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002'
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/parent-child/link-by-users`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ parentNumeroH, childNumeroH })
      })
      const data = await res.json()
      if (data.success) {
        await loadUsers()
        alert(`Lien familial supprimé entre ${parent.prenom} et ${child.prenom}`)
      } else {
        alert(`Erreur: ${data.message || 'Impossible de supprimer le lien'}`)
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du lien:', error)
      alert('Erreur réseau lors de la suppression du lien')
    }
  }

  const handleDeleteChild = async (parentNumeroH: string, childNumeroH: string) => {
    await handleDeleteUser(childNumeroH)
  }

  const getRoleBadge = (role: string) => {
    const map: Record<string, { text: string; cls: string }> = {
      'user': { text: 'Utilisateur', cls: 'bg-gray-100 text-gray-700' },
      'admin': { text: 'Admin', cls: 'bg-sky-100 text-sky-700' },
      'super-admin': { text: 'Super Admin', cls: 'bg-emerald-100 text-emerald-700' }
    }
    const badge = map[role] || map['user']
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
        {badge.text}
      </span>
    )
  }

  const getStatusBadge = (isActive: boolean) => (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
      isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
    }`}>
      {isActive ? 'Actif' : 'Inactif'}
    </span>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-gray-600">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-500" />
          <p className="text-sm">Chargement du panneau d'administration...</p>
        </div>
      </div>
    )
  }


  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800">
          Panneau d'Administration {isMasterAdmin && '👑'}
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 ${
            isMasterAdmin 
              ? 'bg-purple-50 text-purple-700' 
              : 'bg-emerald-50 text-emerald-700'
          }`}>
            {isMasterAdmin ? '👑 Super Admin' : 'Admin'}
          </span>
          {isMasterAdmin && (
            <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-0.5 text-yellow-700">
              Accès Complet
            </span>
          )}
        </div>
      </div>
      <div className="px-6 pt-3">
        <div className="flex gap-2 border-b border-gray-200">
          {([
            { key: 'users', label: 'Utilisateurs' },
            { key: 'families', label: 'Familles' },
            { key: 'reports', label: 'Rapports' },
            { key: 'settings', label: 'Paramètres' },
            { key: 'badges', label: 'Badges' },
            { key: 'logos', label: 'Logos' }
          ] as const).map(tab => (
            <button
              key={tab.key}
              data-tab={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`-mb-px px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-emerald-500 text-emerald-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-6">
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <h4 className="text-base font-semibold text-gray-800">Gestion des Utilisateurs</h4>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-72 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  <option value="all">Tous les rôles</option>
                  <option value="user">Utilisateurs</option>
                  <option value="admin">Admins</option>
                  <option value="super-admin">Super Admins</option>
                </select>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Utilisateur</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">NumeroH</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Rôle</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Dernière connexion</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredUsers.map(user => (
                    <tr key={user.numeroH} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                            {user.prenom.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.prenom} {user.nomFamille}</div>
                            <div className="text-xs text-gray-500">{user.genre} • {user.dateNaissance}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{user.numeroH}</td>
                      <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                      <td className="px-4 py-3">{getStatusBadge(user.isActive)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('fr-FR') : 'Jamais'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            className="inline-flex items-center rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
                            onClick={() => setSelectedUser(user)}
                          >
                            Voir
                          </button>
                          <button
                            className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium ring-1 ${
                              user.isActive
                                ? 'bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100'
                            }`}
                            onClick={() => handleToggleUserStatus(user.numeroH)}
                          >
                            {user.isActive ? 'Désactiver' : 'Activer'}
                          </button>
                          <button
                            className="inline-flex items-center rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
                            onClick={() => handleDeleteUser(user.numeroH)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'families' && (
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-gray-800">Gestion des Familles</h4>
            <div className="grid gap-4 md:grid-cols-2">
              {families.map((family, index) => (
                <div key={index} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h5 className="text-sm font-semibold text-gray-800">Famille {family.nomFamille}</h5>
                    <span className="text-xs text-gray-500">{family.memberCount} membres</span>
                  </div>
                  
                  <div className="space-y-2">
                    {family.members.slice(0, 5).map((member: User) => (
                      <div key={member.numeroH} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                            {member.prenom.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{member.prenom} {member.nomFamille}</div>
                            <div className="text-xs text-gray-500">{member.numeroH} • {member.type}</div>
                          </div>
                        </div>
                        {getRoleBadge(member.role)}
                      </div>
                    ))}
                    {family.memberCount > 5 && (
                      <div className="text-center text-xs text-gray-500 pt-2">
                        ... et {family.memberCount - 5} autres membres
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-gray-800">Rapports et Statistiques</h4>
            {stats ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Total Utilisateurs', value: stats.totalUsers, cls: 'from-emerald-50 to-white text-emerald-700' },
                  { label: 'Utilisateurs Actifs', value: stats.activeUsers, cls: 'from-sky-50 to-white text-sky-700' },
                  { label: 'Vivants', value: stats.totalVivants, cls: 'from-green-50 to-white text-green-700' },
                  { label: 'Défunts', value: stats.totalDefunts, cls: 'from-gray-50 to-white text-gray-700' },
                  { label: 'Administrateurs', value: stats.totalAdmins, cls: 'from-amber-50 to-white text-amber-700' },
                  { label: 'Familles', value: stats.totalFamilies, cls: 'from-purple-50 to-white text-purple-700' },
                  { label: 'Utilisateurs Inactifs', value: stats.inactiveUsers, cls: 'from-rose-50 to-white text-rose-700' },
                ].map((s, i) => (
                  <div key={i} className={`rounded-xl border border-gray-200 bg-gradient-to-b ${s.cls} p-4 shadow-sm`}>
                    <div className="text-2xl font-bold">{s.value}</div>
                    <div className="text-sm text-gray-600">{s.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Chargement des statistiques...
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-gray-800">Paramètres du Système</h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Nom de la plateforme</label>
                <input className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm" type="text" value="Moftal" readOnly />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Version</label>
                <input className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm" type="text" value="1.0.0" readOnly />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Base de données</label>
                <input className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm" type="text" value="PostgreSQL - conakry" readOnly />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'badges' && (
          <BadgeManager userData={_userData} />
        )}

        {activeTab === 'logos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-gray-800">Gestion des Logos</h4>
              <button
                onClick={() => window.open('/admin/logos', '_blank')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm"
              >
                🎨 Ouvrir Gestionnaire de Logos
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { name: 'Profil Standard', icon: '👤', color: '#3B82F6' },
                { name: 'Famille', icon: '👨‍👩‍👧‍👦', color: '#8B5CF6' },
                { name: 'Étudiant', icon: '🎓', color: '#F59E0B' },
                { name: 'Professionnel', icon: '💼', color: '#10B981' },
                { name: 'Religieux', icon: '🕌', color: '#EF4444' },
                { name: 'Communautaire', icon: '👥', color: '#06B6D4' },
                { name: 'VIP', icon: '⭐', color: '#F59E0B' },
                { name: 'Modérateur', icon: '🛡️', color: '#8B5CF6' }
              ].map((logo, index) => (
                <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 text-center hover:shadow-md transition-shadow duration-200">
                  <div 
                    className="text-2xl mb-2 mx-auto w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${logo.color}20`, color: logo.color }}
                  >
                    {logo.icon}
                  </div>
                  <div className="text-xs font-medium text-gray-700">{logo.name}</div>
                </div>
              ))}
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-blue-600 text-xl">💡</div>
                <div>
                  <h5 className="font-medium text-blue-900 mb-1">Gestion des Logos</h5>
                  <p className="text-sm text-blue-700">
                    Utilisez le gestionnaire de logos pour créer, modifier et assigner des logos personnalisés à vos utilisateurs. 
                    Les logos permettent d'identifier rapidement le statut et le rôle de chaque membre.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de détails utilisateur */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h4 className="text-base font-semibold text-gray-800">Détails de l'utilisateur</h4>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                onClick={() => setSelectedUser(null)}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-lg font-semibold">
                  {selectedUser.prenom.charAt(0)}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="text-gray-900 font-medium">{selectedUser.prenom} {selectedUser.nomFamille}</div>
                  <div className="text-gray-700"><strong>NumeroH:</strong> <span className="font-mono">{selectedUser.numeroH}</span></div>
                  <div className="text-gray-700"><strong>Genre:</strong> {selectedUser.genre}</div>
                  <div className="text-gray-700"><strong>Date de naissance:</strong> {selectedUser.dateNaissance}</div>
                  <div className="text-gray-700 flex items-center gap-2"><strong>Rôle:</strong> {getRoleBadge(selectedUser.role)}</div>
                  <div className="text-gray-700 flex items-center gap-2"><strong>Statut:</strong> {getStatusBadge(selectedUser.isActive)}</div>
                  <div className="text-gray-700"><strong>Enfants:</strong> {selectedUser.children.length}</div>
                  <div className="text-gray-700"><strong>Membre depuis:</strong> {new Date(selectedUser.created_at).toLocaleDateString('fr-FR')}</div>
                  <div className="text-gray-700"><strong>Type:</strong> {selectedUser.type === 'vivant' ? 'Vivant' : 'Défunt'}</div>
                  {selectedUser.email && <div className="text-gray-700"><strong>Email:</strong> {selectedUser.email}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
