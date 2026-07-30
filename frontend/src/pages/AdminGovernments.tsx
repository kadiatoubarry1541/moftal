import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessionUser, isAdmin } from '../utils/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  role: string;
  [key: string]: any;
}

interface Government {
  id: number;
  name: string;
  country: string;
  region?: string;
  presidentNumeroH: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  description?: string;
  president?: {
    numeroH: string;
    prenom: string;
    nomFamille: string;
    photo?: string;
  };
  members?: GovernmentMember[];
}

interface GovernmentMember {
  id: number;
  governmentId: number;
  memberNumeroH: string;
  role: string;
  ministry?: string;
  rank: number;
  appointedDate?: string;
  isActive: boolean;
  member?: {
    numeroH: string;
    prenom: string;
    nomFamille: string;
    photo?: string;
  };
}

const ROLES = [
  { value: 'Premier Ministre', label: 'Premier Ministre', rank: 1 },
  { value: 'Vice-Premier Ministre', label: 'Vice-Premier Ministre', rank: 2 },
  { value: 'Ministre', label: 'Ministre', rank: 3 },
  { value: 'Ministre d\'État', label: 'Ministre d\'État', rank: 4 },
  { value: 'Secrétaire d\'État', label: 'Secrétaire d\'État', rank: 5 },
  { value: 'Gouverneur', label: 'Gouverneur', rank: 6 },
  { value: 'Préfet', label: 'Préfet', rank: 7 },
];

export default function AdminGovernments() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [governments, setGovernments] = useState<Government[]>([]);
  const [selectedGovernment, setSelectedGovernment] = useState<Government | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const navigate = useNavigate();

  const [newGovernment, setNewGovernment] = useState({
    name: '',
    country: '',
    region: '',
    presidentNumeroH: '',
    startDate: '',
    description: ''
  });

  const [newMember, setNewMember] = useState({
    memberNumeroH: '',
    role: 'Ministre',
    ministry: '',
    rank: 3
  });

  useEffect(() => {
    // Vérifier la session de manière plus robuste
    const user = getSessionUser();
    const token = localStorage.getItem("token");
    
    if (!user) {
      // Si pas de session mais token existe, l'utilisateur peut être connecté
      // Ne pas rediriger immédiatement, permettre l'accès si admin
      if (!token) {
        navigate("/login");
        setLoading(false);
        return;
      }
      // Si token existe mais pas de session, essayer de continuer
      // L'utilisateur peut être connecté mais la session peut être corrompue
      console.warn("Token trouvé mais session manquante - tentative de récupération");
      // Ne pas rediriger, permettre l'accès si c'est un admin
      // L'utilisateur pourra toujours accéder aux données via le token
      setLoading(false);
      return;
    }
    
    // Vérifier si c'est un admin
    if (!isAdmin(user)) {
      alert("Accès refusé - Privilèges administrateur requis");
      navigate("/moi");
      setLoading(false);
      return;
    }
    
    setUserData(user);
    loadGovernments();
    loadUsers();
  }, [navigate]);

  const loadGovernments = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/governments?active=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGovernments(data.governments || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des gouvernements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGovernmentDetails = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/governments/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedGovernment(data.government);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du gouvernement:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    }
  };

  const handleCreateGovernment = async () => {
    if (!newGovernment.name || !newGovernment.country || !newGovernment.presidentNumeroH) {
      alert('Veuillez remplir tous les champs requis');
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/governments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newGovernment)
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('Gouvernement créé avec succès !');
        setShowCreateForm(false);
        setNewGovernment({ name: '', country: '', region: '', presidentNumeroH: '', startDate: '', description: '' });
        loadGovernments();
      } else {
        alert('Erreur : ' + data.message);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création du gouvernement');
    }
  };

  const handleAddMember = async () => {
    if (!selectedGovernment || !newMember.memberNumeroH || !newMember.role) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const selectedRole = ROLES.find(r => r.value === newMember.role);
      const response = await fetch(`${API_BASE}/api/governments/${selectedGovernment.id}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newMember,
          rank: selectedRole?.rank || newMember.rank
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('Membre ajouté au gouvernement avec succès !');
        setShowAddMemberForm(false);
        setNewMember({ memberNumeroH: '', role: 'Ministre', ministry: '', rank: 3 });
        loadGovernmentDetails(selectedGovernment.id);
      } else {
        alert('Erreur : ' + data.message);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'ajout du membre');
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!selectedGovernment) return;
    if (!confirm('Êtes-vous sûr de vouloir retirer ce membre du gouvernement ?')) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/governments/${selectedGovernment.id}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('Membre retiré du gouvernement avec succès !');
        loadGovernmentDetails(selectedGovernment.id);
      } else {
        alert('Erreur : ' + data.message);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du retrait du membre');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🏛️ Gestion des Gouvernements</h1>
              <p className="mt-2 text-gray-600">Créez et gérez les gouvernements avec leurs membres</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/moi')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                ← Retour
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Gouvernements ({governments.length})
          </h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
          >
            ➕ Créer un Gouvernement
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {governments.map((government) => (
            <div 
              key={government.id} 
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500"
              onClick={() => {
                setSelectedGovernment(government);
                loadGovernmentDetails(government.id);
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-lg font-bold shadow-lg">
                  {government.president?.photo ? (
                    <img
                      src={government.president.photo}
                      alt={government.president.prenom}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    government.president?.prenom?.charAt(0) || "P"
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{government.name}</h3>
                  <p className="text-sm text-gray-600">👑 {government.president?.prenom} {government.president?.nomFamille}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600"><span className="font-semibold">Pays:</span> {government.country}</p>
                {government.region && (
                  <p className="text-gray-600"><span className="font-semibold">Région:</span> {government.region}</p>
                )}
                {government.startDate && (
                  <p className="text-gray-600"><span className="font-semibold">Début:</span> {new Date(government.startDate).toLocaleDateString()}</p>
                )}
                {government.members && (
                  <p className="text-blue-600 font-semibold">{government.members.length} membre(s)</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {selectedGovernment && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">🏛️ {selectedGovernment.name}</h3>
                <p className="text-gray-600 mt-1">
                  👑 Président: {selectedGovernment.president?.prenom} {selectedGovernment.president?.nomFamille}
                </p>
              </div>
              <button
                onClick={() => setShowAddMemberForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ➕ Ajouter un Membre
              </button>
            </div>

            {selectedGovernment.members && selectedGovernment.members.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedGovernment.members
                  .sort((a, b) => a.rank - b.rank)
                  .map((member) => (
                    <div key={member.id} className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-purple-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-sm font-bold shadow-lg">
                          {member.member?.photo ? (
                            <img
                              src={member.member.photo}
                              alt={member.member.prenom}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            member.member?.prenom?.charAt(0) || "M"
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{member.member?.prenom} {member.member?.nomFamille}</h4>
                          <p className="text-sm text-blue-600 font-semibold">{member.role}</p>
                          {member.ministry && (
                            <p className="text-xs text-gray-600">{member.ministry}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveMember(member.id);
                        }}
                        className="w-full text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 hover:bg-red-50 rounded mt-2"
                      >
                        Retirer du gouvernement
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Aucun membre dans ce gouvernement</p>
                <p className="text-gray-400 mt-2 text-sm">Cliquez sur "Ajouter un Membre" pour commencer</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de création de gouvernement */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              🏛️ Créer un Gouvernement
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom du gouvernement</label>
                <input
                  type="text"
                  value={newGovernment.name}
                  onChange={(e) => setNewGovernment({...newGovernment, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Gouvernement de la République de Guinée"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pays *</label>
                <input
                  type="text"
                  value={newGovernment.country}
                  onChange={(e) => setNewGovernment({...newGovernment, country: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Guinée"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Région (optionnel)</label>
                <input
                  type="text"
                  value={newGovernment.region}
                  onChange={(e) => setNewGovernment({...newGovernment, region: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Fouta Djallon"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Président *</label>
                <select
                  value={newGovernment.presidentNumeroH}
                  onChange={(e) => setNewGovernment({...newGovernment, presidentNumeroH: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Sélectionner un président</option>
                  {users.map(user => (
                    <option key={user.numeroH} value={user.numeroH}>
                      {user.prenom} {user.nomFamille} ({user.numeroH})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
                <input
                  type="date"
                  value={newGovernment.startDate}
                  onChange={(e) => setNewGovernment({...newGovernment, startDate: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newGovernment.description}
                  onChange={(e) => setNewGovernment({...newGovernment, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Description du gouvernement..."
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateGovernment}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'ajout de membre */}
      {showAddMemberForm && selectedGovernment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              ➕ Ajouter un Membre au Gouvernement
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Membre *</label>
                <select
                  value={newMember.memberNumeroH}
                  onChange={(e) => setNewMember({...newMember, memberNumeroH: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Sélectionner un membre</option>
                  {users.map(user => (
                    <option key={user.numeroH} value={user.numeroH}>
                      {user.prenom} {user.nomFamille} ({user.numeroH})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rôle *</label>
                <select
                  value={newMember.role}
                  onChange={(e) => {
                    const selectedRole = ROLES.find(r => r.value === e.target.value);
                    setNewMember({
                      ...newMember,
                      role: e.target.value,
                      rank: selectedRole?.rank || newMember.rank
                    });
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {ROLES.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ministère (si applicable)</label>
                <input
                  type="text"
                  value={newMember.ministry}
                  onChange={(e) => setNewMember({...newMember, ministry: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Ministère de la Santé"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAddMemberForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAddMember}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

