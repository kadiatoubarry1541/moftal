import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioRecorder } from '../components/AudioRecorder';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  activite2?: string;
  [key: string]: any;
}

interface Activity2Group {
  id: string;
  name: string;
  description: string;
  activity: string;
  members: UserData[];
  posts: Activity2Post[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  location?: string;
  meetingTime?: string;
  skillLevel?: 'débutant' | 'intermédiaire' | 'avancé' | 'expert';
}

interface Activity2Post {
  id: string;
  author: string;
  authorName: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'workshop' | 'collaboration';
  mediaUrl?: string;
  likes: string[];
  comments: Activity2Comment[];
  createdAt: string;
  workshopDetails?: {
    date: string;
    time: string;
    location: string;
    duration: number; // en heures
    maxParticipants: number;
    participants: string[];
    skillLevel: string;
    materials: string[];
  };
  collaborationDetails?: {
    projectType: string;
    skillsNeeded: string[];
    timeline: string;
    budget?: string;
    participants: string[];
  };
}

interface Activity2Comment {
  id: string;
  author: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export default function Activite2() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [groups, setGroups] = useState<Activity2Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<Activity2Group | null>(null);
  const [showWorkshopForm, setShowWorkshopForm] = useState(false);
  const [showCollaborationForm, setShowCollaborationForm] = useState(false);
  const navigate = useNavigate();

  const [newPost, setNewPost] = useState({
    content: '',
    type: 'text' as 'text' | 'image' | 'video' | 'audio' | 'workshop' | 'collaboration',
    mediaFile: null as File | null,
    workshopDetails: {
      date: '',
      time: '',
      location: '',
      duration: 2,
      maxParticipants: 10,
      skillLevel: 'intermédiaire',
      materials: ['']
    },
    collaborationDetails: {
      projectType: '',
      skillsNeeded: [''],
      timeline: '',
      budget: '',
      participants: []
    }
  });

  useEffect(() => {
    const session = localStorage.getItem("session_user");
    if (!session) {
      navigate("/login");
      return;
    }

    try {
      const parsed = JSON.parse(session);
      const user = parsed.userData || parsed;
      if (!user || !user.numeroH) {
        navigate("/login");
        return;
      }
      
      setUserData(user);
      loadGroups();
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  const loadGroups = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/activities/activity2/groups', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      } else {
        // Fallback avec des groupes par défaut
        setGroups(getDefaultGroups());
      }
    } catch (error) {
      console.error('Erreur lors du chargement des groupes:', error);
      setGroups(getDefaultGroups());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultGroups = (): Activity2Group[] => [
    {
      id: '1',
      name: 'Artisans Créatifs',
      description: 'Communauté d\'artisans et créateurs pour échanger techniques et projets',
      activity: 'Artisanat',
      members: userData ? [userData] : [],
      posts: [],
      isActive: true,
      createdBy: userData?.numeroH || 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString(),
      location: 'Conakry, Guinée',
      meetingTime: 'Samedi 15h00',
      skillLevel: 'intermédiaire'
    },
    {
      id: '2',
      name: 'Designers Graphiques',
      description: 'Rencontres entre designers pour partager créativité et projets',
      activity: 'Design Graphique',
      members: [],
      posts: [],
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      createdAt: new Date().toISOString(),
      location: 'Conakry, Guinée',
      meetingTime: 'Dimanche 10h00',
      skillLevel: 'avancé'
    }
  ];



  const joinGroup = async (groupId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/activities/activity2/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ numeroH: userData?.numeroH })
      });
      
      if (response.ok) {
        alert('Vous avez rejoint le Organisation !');
        loadGroups();
      } else {
        alert('Erreur lors de l\'adhésion au Organisation');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'adhésion au Organisation');
    }
  };

  const createPost = async () => {
    if (!selectedGroup || !newPost.content.trim()) return;
    
    try {
      const formData = new FormData();
      formData.append('content', newPost.content);
      formData.append('type', newPost.type);
      formData.append('author', userData?.numeroH || '');
      formData.append('authorName', `${userData?.prenom} ${userData?.nomFamille}`);
      
      if (newPost.type === 'workshop') {
        formData.append('workshopDetails', JSON.stringify(newPost.workshopDetails));
      } else if (newPost.type === 'collaboration') {
        formData.append('collaborationDetails', JSON.stringify(newPost.collaborationDetails));
      }
      
      if (newPost.mediaFile) {
        formData.append('media', newPost.mediaFile);
      }
      
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/activities/activity2/groups/${selectedGroup.id}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (response.ok) {
        alert('Publication créée avec succès !');
        setNewPost({ 
          content: '', 
          type: 'text', 
          mediaFile: null,
          workshopDetails: {
            date: '', time: '', location: '', duration: 2, maxParticipants: 10,
            skillLevel: 'intermédiaire', materials: ['']
          },
          collaborationDetails: {
            projectType: '', skillsNeeded: [''], timeline: '', budget: '', participants: []
          }
        });
        loadGroups();
      } else {
        alert('Erreur lors de la création de la publication');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création de la publication');
    }
  };

  const joinWorkshop = async (postId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/activities/activity2/posts/${postId}/join-workshop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ numeroH: userData?.numeroH })
      });
      
      if (response.ok) {
        alert('Vous avez rejoint l\'atelier !');
        loadGroups();
      } else {
        alert('Erreur lors de l\'inscription à l\'atelier');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'inscription à l\'atelier');
    }
  };

  const joinCollaboration = async (postId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/activities/activity2/posts/${postId}/join-collaboration`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ numeroH: userData?.numeroH })
      });
      
      if (response.ok) {
        alert('Vous avez rejoint la collaboration !');
        loadGroups();
      } else {
        alert('Erreur lors de l\'adhésion à la collaboration');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'adhésion à la collaboration');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Chargement des rencontres Activité2...</div>
        </div>
      </div>
    );
  }

  if (!userData) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => window.history.back()}
        className="mb-6 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
      >
        ← Retour
      </button>

      <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-green-500 border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="text-4xl">🔧</div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Activité2 - Échanges et Collaborations</h1>
            <p className="text-gray-600">Rencontrez des personnes pour échanger et collaborer dans votre domaine d'activité</p>
          </div>
        </div>
        
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">{groups.length}</div>
            <div className="text-sm text-green-800">Groupes actifs</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {groups.reduce((total, g) => total + g.members.length, 0)}
            </div>
            <div className="text-sm text-blue-800">Membres total</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {groups.reduce((total, g) => total + g.posts.length, 0)}
            </div>
            <div className="text-sm text-purple-800">Publications</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {groups.reduce((total, g) => total + g.posts.filter(p => p.type === 'workshop' || p.type === 'collaboration').length, 0)}
            </div>
            <div className="text-sm text-orange-800">Ateliers/Collab</div>
          </div>
        </div>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowWorkshopForm(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
          >
            🎨 Organiser un Atelier
          </button>
          <button
            onClick={() => setShowCollaborationForm(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center gap-2"
          >
            🤝 Proposer une Collaboration
          </button>
        </div>


        {/* Formulaire d'organisation d'atelier */}
        {showWorkshopForm && (
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Organiser un atelier</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre de l'atelier</label>
                <input
                  type="text"
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Atelier Poterie Traditionnelle"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={newPost.workshopDetails.date}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    workshopDetails: {...newPost.workshopDetails, date: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Heure</label>
                <input
                  type="time"
                  value={newPost.workshopDetails.time}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    workshopDetails: {...newPost.workshopDetails, time: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Durée (heures)</label>
                <input
                  type="number"
                  value={newPost.workshopDetails.duration}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    workshopDetails: {...newPost.workshopDetails, duration: parseInt(e.target.value)}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="8"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lieu</label>
                <input
                  type="text"
                  value={newPost.workshopDetails.location}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    workshopDetails: {...newPost.workshopDetails, location: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Atelier d'Art"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Niveau requis</label>
                <select
                  value={newPost.workshopDetails.skillLevel}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    workshopDetails: {...newPost.workshopDetails, skillLevel: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="débutant">Débutant</option>
                  <option value="intermédiaire">Intermédiaire</option>
                  <option value="avancé">Avancé</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre max de participants</label>
                <input
                  type="number"
                  value={newPost.workshopDetails.maxParticipants}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    workshopDetails: {...newPost.workshopDetails, maxParticipants: parseInt(e.target.value)}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="2"
                  max="20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Matériel nécessaire</label>
                <div className="space-y-2">
                  {newPost.workshopDetails.materials.map((material, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={material}
                        onChange={(e) => {
                          const newMaterials = [...newPost.workshopDetails.materials];
                          newMaterials[index] = e.target.value;
                          setNewPost({
                            ...newPost, 
                            workshopDetails: {...newPost.workshopDetails, materials: newMaterials}
                          });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Matériel..."
                      />
                      {newPost.workshopDetails.materials.length > 1 && (
                        <button
                          onClick={() => {
                            const newMaterials = newPost.workshopDetails.materials.filter((_, i) => i !== index);
                            setNewPost({
                              ...newPost, 
                              workshopDetails: {...newPost.workshopDetails, materials: newMaterials}
                            });
                          }}
                          className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setNewPost({
                      ...newPost, 
                      workshopDetails: {...newPost.workshopDetails, materials: [...newPost.workshopDetails.materials, '']}
                    })}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    ➕ Ajouter un matériel
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => {
                  setNewPost({...newPost, type: 'workshop'});
                  createPost();
                  setShowWorkshopForm(false);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                🎨 Créer l'Atelier
              </button>
              <button
                onClick={() => setShowWorkshopForm(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
              >
                ❌ Annuler
              </button>
            </div>
          </div>
        )}

        {/* Formulaire de collaboration */}
        {showCollaborationForm && (
          <div className="bg-purple-50 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Proposer une collaboration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre du projet</label>
                <input
                  type="text"
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: Collection Mode Africaine"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de projet</label>
                <select
                  value={newPost.collaborationDetails.projectType}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    collaborationDetails: {...newPost.collaborationDetails, projectType: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Sélectionner...</option>
                  <option value="créatif">Projet Créatif</option>
                  <option value="commercial">Projet Commercial</option>
                  <option value="social">Projet Social</option>
                  <option value="technologique">Projet Technologique</option>
                  <option value="culturel">Projet Culturel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Timeline</label>
                <input
                  type="text"
                  value={newPost.collaborationDetails.timeline}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    collaborationDetails: {...newPost.collaborationDetails, timeline: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: 3 mois"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Budget (optionnel)</label>
                <input
                  type="text"
                  value={newPost.collaborationDetails.budget}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    collaborationDetails: {...newPost.collaborationDetails, budget: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: 500,000 GNF"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Compétences recherchées</label>
                <div className="space-y-2">
                  {newPost.collaborationDetails.skillsNeeded.map((skill, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={skill}
                        onChange={(e) => {
                          const newSkills = [...newPost.collaborationDetails.skillsNeeded];
                          newSkills[index] = e.target.value;
                          setNewPost({
                            ...newPost, 
                            collaborationDetails: {...newPost.collaborationDetails, skillsNeeded: newSkills}
                          });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Compétence..."
                      />
                      {newPost.collaborationDetails.skillsNeeded.length > 1 && (
                        <button
                          onClick={() => {
                            const newSkills = newPost.collaborationDetails.skillsNeeded.filter((_, i) => i !== index);
                            setNewPost({
                              ...newPost, 
                              collaborationDetails: {...newPost.collaborationDetails, skillsNeeded: newSkills}
                            });
                          }}
                          className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setNewPost({
                      ...newPost, 
                      collaborationDetails: {...newPost.collaborationDetails, skillsNeeded: [...newPost.collaborationDetails.skillsNeeded, '']}
                    })}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    ➕ Ajouter une compétence
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => {
                  setNewPost({...newPost, type: 'collaboration'});
                  createPost();
                  setShowCollaborationForm(false);
                }}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
              >
                🤝 Créer la Collaboration
              </button>
              <button
                onClick={() => setShowCollaborationForm(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
              >
                ❌ Annuler
              </button>
            </div>
          </div>
        )}

        {/* Liste des groupes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div key={group.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{group.name}</h3>
                  <p className="text-sm text-gray-600">{group.activity}</p>
                </div>
                <div className="text-sm text-gray-500">
                  {group.members.length} membres
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">{group.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                {group.location && (
                  <div className="flex items-center gap-1">
                    <span>📍</span>
                    <span>{group.location}</span>
                  </div>
                )}
                {group.meetingTime && (
                  <div className="flex items-center gap-1">
                    <span>🕒</span>
                    <span>{group.meetingTime}</span>
                  </div>
                )}
                {group.skillLevel && (
                  <div className="flex items-center gap-1">
                    <span>🎯</span>
                    <span className="capitalize">{group.skillLevel}</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedGroup(group)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm"
                >
                  💬 Discussions
                </button>
                {!group.members.find(m => m.numeroH === userData?.numeroH) && (
                  <button
                    onClick={() => joinGroup(group.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm"
                  >
                    ➕ Rejoindre
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Interface de discussion */}
        {selectedGroup && (
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                💬 Discussions - {selectedGroup.name}
              </h3>
              <button
                onClick={() => setSelectedGroup(null)}
                className="px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
              >
                ✕ Fermer
              </button>
            </div>
            
            {/* Formulaire de publication */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-3">Publier quelque chose</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type de contenu</label>
                  <select
                    value={newPost.type}
                    onChange={(e) => setNewPost({...newPost, type: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="text">📝 Texte</option>
                    <option value="image">🖼️ Image</option>
                    <option value="video">🎥 Vidéo</option>
                    <option value="audio">🎵 Audio</option>
                    <option value="workshop">🎨 Atelier</option>
                    <option value="collaboration">🤝 Collaboration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contenu</label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={3}
                    placeholder="Partagez vos idées..."
                  />
                </div>
                {newPost.type === 'audio' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message vocal</label>
                    {newPost.mediaFile ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                        <span className="text-sm text-green-700 flex-1">🎙️ Audio prêt</span>
                        <button type="button" onClick={() => setNewPost({...newPost, mediaFile: null})} className="text-red-500 hover:text-red-700 text-xs font-medium">✕ Annuler</button>
                      </div>
                    ) : (
                      <AudioRecorder maxDuration={10} onAudioRecorded={(blob) => {
                        const file = new File([blob], 'vocal.webm', { type: blob.type });
                        setNewPost({...newPost, mediaFile: file});
                      }} />
                    )}
                  </div>
                )}
                {newPost.type !== 'text' && newPost.type !== 'workshop' && newPost.type !== 'collaboration' && newPost.type !== 'audio' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fichier média</label>
                    <input
                      type="file"
                      accept={newPost.type === 'image' ? 'image/*' : 'video/*'}
                      onChange={(e) => setNewPost({...newPost, mediaFile: e.target.files?.[0] || null})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                )}
                <button
                  onClick={createPost}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  📤 Publier
                </button>
              </div>
            </div>
            
            {/* Liste des publications */}
            <div className="space-y-4">
              {selectedGroup.posts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h5 className="font-medium text-gray-900">{post.authorName}</h5>
                      <p className="text-sm text-gray-500">{new Date(post.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-1 text-gray-400 hover:text-red-500">
                        ❤️ {post.likes.length}
                      </button>
                      <button className="p-1 text-gray-400 hover:text-blue-500">
                        💬 {post.comments.length}
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{post.content}</p>
                  
                  {/* Détails d'atelier */}
                  {post.type === 'workshop' && post.workshopDetails && (
                    <div className="bg-blue-50 rounded-lg p-4 mb-3">
                      <h6 className="font-medium text-blue-900 mb-2">🎨 Détails de l'atelier</h6>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><strong>Date:</strong> {post.workshopDetails.date}</div>
                        <div><strong>Heure:</strong> {post.workshopDetails.time}</div>
                        <div><strong>Durée:</strong> {post.workshopDetails.duration}h</div>
                        <div><strong>Lieu:</strong> {post.workshopDetails.location}</div>
                        <div><strong>Niveau:</strong> {post.workshopDetails.skillLevel}</div>
                        <div><strong>Participants:</strong> {post.workshopDetails.participants.length}/{post.workshopDetails.maxParticipants}</div>
                      </div>
                      {post.workshopDetails.materials.length > 0 && (
                        <div className="mt-2">
                          <strong>Matériel nécessaire:</strong>
                          <ul className="text-sm list-disc list-inside">
                            {post.workshopDetails.materials.map((material, index) => (
                              <li key={index}>{material}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {!post.workshopDetails.participants.includes(userData?.numeroH || '') && 
                       post.workshopDetails.participants.length < post.workshopDetails.maxParticipants && (
                        <button
                          onClick={() => joinWorkshop(post.id)}
                          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          🎨 Rejoindre l'atelier
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Détails de collaboration */}
                  {post.type === 'collaboration' && post.collaborationDetails && (
                    <div className="bg-purple-50 rounded-lg p-4 mb-3">
                      <h6 className="font-medium text-purple-900 mb-2">🤝 Détails de la collaboration</h6>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><strong>Type:</strong> {post.collaborationDetails.projectType}</div>
                        <div><strong>Timeline:</strong> {post.collaborationDetails.timeline}</div>
                        {post.collaborationDetails.budget && (
                          <div><strong>Budget:</strong> {post.collaborationDetails.budget}</div>
                        )}
                        <div><strong>Participants:</strong> {post.collaborationDetails.participants.length}</div>
                      </div>
                      {post.collaborationDetails.skillsNeeded.length > 0 && (
                        <div className="mt-2">
                          <strong>Compétences recherchées:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {post.collaborationDetails.skillsNeeded.map((skill, index) => (
                              <span key={index} className="px-2 py-1 bg-purple-200 text-purple-800 rounded-full text-xs">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {!post.collaborationDetails.participants.includes(userData?.numeroH || '') && (
                        <button
                          onClick={() => joinCollaboration(post.id)}
                          className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                        >
                          🤝 Rejoindre la collaboration
                        </button>
                      )}
                    </div>
                  )}
                  
                  {post.mediaUrl && (
                    <div className="mb-3">
                      {post.type === 'image' && (
                        <img src={post.mediaUrl} alt="Média" className="max-w-full h-auto rounded-lg" />
                      )}
                      {post.type === 'video' && (
                        <video src={post.mediaUrl} controls className="max-w-full h-auto rounded-lg" />
                      )}
                      {post.type === 'audio' && (
                        <audio src={post.mediaUrl} controls className="w-full" />
                      )}
                    </div>
                  )}
                  
                  {/* Commentaires */}
                  {post.comments.length > 0 && (
                    <div className="border-t pt-3 mt-3">
                      <h6 className="font-medium text-gray-900 mb-2">Commentaires</h6>
                      {post.comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 rounded-lg p-3 mb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h6 className="font-medium text-gray-900 text-sm">{comment.authorName}</h6>
                              <p className="text-gray-700 text-sm">{comment.content}</p>
                            </div>
                            <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {selectedGroup.posts.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <p>Aucune publication pour le moment.</p>
                  <p>Soyez le premier à partager quelque chose !</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
