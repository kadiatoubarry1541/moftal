import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioRecorder } from '../components/AudioRecorder';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  activite3?: string;
  [key: string]: any;
}

interface Activity3Group {
  id: string;
  name: string;
  description: string;
  activity: string;
  members: UserData[];
  posts: Activity3Post[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  location?: string;
  meetingTime?: string;
  artStyle?: 'traditionnel' | 'moderne' | 'contemporain' | 'mixte';
}

interface Activity3Post {
  id: string;
  author: string;
  authorName: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'exhibition' | 'performance' | 'project';
  mediaUrl?: string;
  likes: string[];
  comments: Activity3Comment[];
  createdAt: string;
  exhibitionDetails?: {
    title: string;
    date: string;
    time: string;
    location: string;
    duration: number; // en jours
    maxArtists: number;
    artists: string[];
    theme: string;
    artTypes: string[];
  };
  performanceDetails?: {
    title: string;
    date: string;
    time: string;
    location: string;
    duration: number; // en minutes
    maxPerformers: number;
    performers: string[];
    performanceType: string;
    requirements: string[];
  };
  projectDetails?: {
    title: string;
    description: string;
    timeline: string;
    budget?: string;
    participants: string[];
    artForms: string[];
    goals: string[];
  };
}

interface Activity3Comment {
  id: string;
  author: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export default function Activite3() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [groups, setGroups] = useState<Activity3Group[]>([]);
  const [myGroup, setMyGroup] = useState<Activity3Group | null>(null);
  const [activityValue, setActivityValue] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<Activity3Group | null>(null);
  const [showExhibitionForm, setShowExhibitionForm] = useState(false);
  const [showPerformanceForm, setShowPerformanceForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const navigate = useNavigate();

  const [newPost, setNewPost] = useState({
    content: '',
    type: 'text' as 'text' | 'image' | 'video' | 'audio' | 'exhibition' | 'performance' | 'project',
    mediaFile: null as File | null,
    exhibitionDetails: {
      title: '',
      date: '',
      time: '',
      location: '',
      duration: 7,
      maxArtists: 10,
      theme: '',
      artTypes: ['']
    },
    performanceDetails: {
      title: '',
      date: '',
      time: '',
      location: '',
      duration: 60,
      maxPerformers: 5,
      performanceType: '',
      requirements: ['']
    },
    projectDetails: {
      title: '',
      description: '',
      timeline: '',
      budget: '',
      artForms: [''],
      goals: ['']
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
      const response = await fetch('/api/activities/my-group?level=3', {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.group) {
          setMyGroup(data.group as Activity3Group);
          setGroups([data.group as Activity3Group]);
          setActivityValue(data.activityValue || '');
        } else {
          setMyGroup(null); setGroups([]); setActivityValue('');
        }
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du groupe:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async (groupId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/activities/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ numeroH: userData?.numeroH })
      });
      
      if (response.ok) {
        loadGroups();
      }
    } catch (error) {
      console.error('Erreur:', error);
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
      
      if (newPost.type === 'exhibition') {
        formData.append('exhibitionDetails', JSON.stringify(newPost.exhibitionDetails));
      } else if (newPost.type === 'performance') {
        formData.append('performanceDetails', JSON.stringify(newPost.performanceDetails));
      } else if (newPost.type === 'project') {
        formData.append('projectDetails', JSON.stringify(newPost.projectDetails));
      }
      
      if (newPost.mediaFile) {
        formData.append('media', newPost.mediaFile);
      }
      
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/activities/groups/${selectedGroup.id}/messages`, {
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
          exhibitionDetails: {
            title: '', date: '', time: '', location: '', duration: 7, maxArtists: 10,
            theme: '', artTypes: ['']
          },
          performanceDetails: {
            title: '', date: '', time: '', location: '', duration: 60, maxPerformers: 5,
            performanceType: '', requirements: ['']
          },
          projectDetails: {
            title: '', description: '', timeline: '', budget: '', artForms: [''], goals: ['']
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

  const joinExhibition = async (postId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/activities/activity3/posts/${postId}/join-exhibition`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ numeroH: userData?.numeroH })
      });
      
      if (response.ok) {
        alert('Vous avez rejoint l\'exposition !');
        loadGroups();
      } else {
        alert('Erreur lors de l\'inscription à l\'exposition');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'inscription à l\'exposition');
    }
  };

  const joinPerformance = async (postId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/activities/activity3/posts/${postId}/join-performance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ numeroH: userData?.numeroH })
      });
      
      if (response.ok) {
        alert('Vous avez rejoint la performance !');
        loadGroups();
      } else {
        alert('Erreur lors de l\'inscription à la performance');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'inscription à la performance');
    }
  };

  const joinProject = async (postId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/activities/activity3/posts/${postId}/join-project`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ numeroH: userData?.numeroH })
      });
      
      if (response.ok) {
        alert('Vous avez rejoint le projet !');
        loadGroups();
      } else {
        alert('Erreur lors de l\'adhésion au projet');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'adhésion au projet');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Chargement des rencontres Activité3...</div>
        </div>
      </div>
    );
  }

  if (!userData) return null;

  if (!loading && !myGroup && !activityValue) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => window.history.back()} className="mb-6 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors flex items-center gap-2">← Retour</button>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">🎨</div>
          <h2 className="text-xl font-bold text-amber-800 mb-2">Activité 3 non renseignée</h2>
          <p className="text-amber-700">Pour rejoindre le groupe de votre troisième activité, renseignez votre Activité 3 dans votre profil.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => window.history.back()}
        className="mb-6 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
      >
        ← Retour
      </button>

      <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-purple-500 border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center gap-4 mb-2">
          <div className="text-4xl">🎨</div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Activité 3 — {activityValue}</h1>
            <p className="text-gray-600">Groupe des personnes ayant la même activité : <span className="font-semibold text-purple-700">{activityValue}</span></p>
          </div>
        </div>
        {myGroup && (
          <div className="mb-4 px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg text-purple-800 text-sm">
            ✅ Vous êtes automatiquement dans ce groupe avec tous les membres ayant l'activité <strong>{activityValue}</strong>.
          </div>
        )}
        
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">{groups.length}</div>
            <div className="text-sm text-purple-800">Groupes actifs</div>
          </div>
          <div className="bg-pink-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-pink-600 mb-1">
              {groups.reduce((total, g) => total + g.members.length, 0)}
            </div>
            <div className="text-sm text-pink-800">Artistes</div>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600 mb-1">
              {groups.reduce((total, g) => total + g.posts.length, 0)}
            </div>
            <div className="text-sm text-indigo-800">Publications</div>
          </div>
          <div className="bg-teal-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-teal-600 mb-1">
              {groups.reduce((total, g) => total + g.posts.filter(p => p.type === 'exhibition' || p.type === 'performance' || p.type === 'project').length, 0)}
            </div>
            <div className="text-sm text-teal-800">Événements</div>
          </div>
        </div>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowExhibitionForm(true)}
            className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors duration-200 flex items-center gap-2"
          >
            🖼️ Organiser une Exposition
          </button>
          <button
            onClick={() => setShowPerformanceForm(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center gap-2"
          >
            🎭 Organiser une Performance
          </button>
          <button
            onClick={() => setShowProjectForm(true)}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors duration-200 flex items-center gap-2"
          >
            🎨 Créer un Projet
          </button>
        </div>

        {/* Formulaire d'exposition */}
        {showExhibitionForm && (
          <div className="bg-pink-50 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Organiser une exposition</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre de l'exposition</label>
                <input
                  type="text"
                  value={newPost.exhibitionDetails.title}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    exhibitionDetails: {...newPost.exhibitionDetails, title: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Ex: Art Africain Contemporain"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Thème</label>
                <input
                  type="text"
                  value={newPost.exhibitionDetails.theme}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    exhibitionDetails: {...newPost.exhibitionDetails, theme: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Ex: Identité et Culture"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date d'ouverture</label>
                <input
                  type="date"
                  value={newPost.exhibitionDetails.date}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    exhibitionDetails: {...newPost.exhibitionDetails, date: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Heure d'ouverture</label>
                <input
                  type="time"
                  value={newPost.exhibitionDetails.time}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    exhibitionDetails: {...newPost.exhibitionDetails, time: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lieu</label>
                <input
                  type="text"
                  value={newPost.exhibitionDetails.location}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    exhibitionDetails: {...newPost.exhibitionDetails, location: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Ex: Galerie d'Art Moderne"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Durée (jours)</label>
                <input
                  type="number"
                  value={newPost.exhibitionDetails.duration}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    exhibitionDetails: {...newPost.exhibitionDetails, duration: parseInt(e.target.value)}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  min="1"
                  max="30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre max d'artistes</label>
                <input
                  type="number"
                  value={newPost.exhibitionDetails.maxArtists}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    exhibitionDetails: {...newPost.exhibitionDetails, maxArtists: parseInt(e.target.value)}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  min="2"
                  max="50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Types d'art</label>
                <div className="space-y-2">
                  {newPost.exhibitionDetails.artTypes.map((artType, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={artType}
                        onChange={(e) => {
                          const newArtTypes = [...newPost.exhibitionDetails.artTypes];
                          newArtTypes[index] = e.target.value;
                          setNewPost({
                            ...newPost, 
                            exhibitionDetails: {...newPost.exhibitionDetails, artTypes: newArtTypes}
                          });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        placeholder="Type d'art..."
                      />
                      {newPost.exhibitionDetails.artTypes.length > 1 && (
                        <button
                          onClick={() => {
                            const newArtTypes = newPost.exhibitionDetails.artTypes.filter((_, i) => i !== index);
                            setNewPost({
                              ...newPost, 
                              exhibitionDetails: {...newPost.exhibitionDetails, artTypes: newArtTypes}
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
                      exhibitionDetails: {...newPost.exhibitionDetails, artTypes: [...newPost.exhibitionDetails.artTypes, '']}
                    })}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    ➕ Ajouter un type d'art
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => {
                  setNewPost({...newPost, content: newPost.exhibitionDetails.title, type: 'exhibition'});
                  createPost();
                  setShowExhibitionForm(false);
                }}
                className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors duration-200"
              >
                🖼️ Créer l'Exposition
              </button>
              <button
                onClick={() => setShowExhibitionForm(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
              >
                ❌ Annuler
              </button>
            </div>
          </div>
        )}

        {/* Formulaire de performance */}
        {showPerformanceForm && (
          <div className="bg-indigo-50 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Organiser une performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre de la performance</label>
                <input
                  type="text"
                  value={newPost.performanceDetails.title}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    performanceDetails: {...newPost.performanceDetails, title: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ex: Récital de Musique Traditionnelle"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de performance</label>
                <select
                  value={newPost.performanceDetails.performanceType}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    performanceDetails: {...newPost.performanceDetails, performanceType: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Sélectionner...</option>
                  <option value="musique">Musique</option>
                  <option value="danse">Danse</option>
                  <option value="théâtre">Théâtre</option>
                  <option value="poésie">Poésie</option>
                  <option value="cirque">Cirque</option>
                  <option value="performance">Performance Art</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={newPost.performanceDetails.date}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    performanceDetails: {...newPost.performanceDetails, date: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Heure</label>
                <input
                  type="time"
                  value={newPost.performanceDetails.time}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    performanceDetails: {...newPost.performanceDetails, time: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lieu</label>
                <input
                  type="text"
                  value={newPost.performanceDetails.location}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    performanceDetails: {...newPost.performanceDetails, location: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ex: Centre Culturel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Durée (minutes)</label>
                <input
                  type="number"
                  value={newPost.performanceDetails.duration}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    performanceDetails: {...newPost.performanceDetails, duration: parseInt(e.target.value)}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  min="15"
                  max="180"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre max de performeurs</label>
                <input
                  type="number"
                  value={newPost.performanceDetails.maxPerformers}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    performanceDetails: {...newPost.performanceDetails, maxPerformers: parseInt(e.target.value)}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  min="1"
                  max="20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Exigences</label>
                <div className="space-y-2">
                  {newPost.performanceDetails.requirements.map((requirement, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={requirement}
                        onChange={(e) => {
                          const newRequirements = [...newPost.performanceDetails.requirements];
                          newRequirements[index] = e.target.value;
                          setNewPost({
                            ...newPost, 
                            performanceDetails: {...newPost.performanceDetails, requirements: newRequirements}
                          });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Exigence..."
                      />
                      {newPost.performanceDetails.requirements.length > 1 && (
                        <button
                          onClick={() => {
                            const newRequirements = newPost.performanceDetails.requirements.filter((_, i) => i !== index);
                            setNewPost({
                              ...newPost, 
                              performanceDetails: {...newPost.performanceDetails, requirements: newRequirements}
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
                      performanceDetails: {...newPost.performanceDetails, requirements: [...newPost.performanceDetails.requirements, '']}
                    })}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    ➕ Ajouter une exigence
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => {
                  setNewPost({...newPost, content: newPost.performanceDetails.title, type: 'performance'});
                  createPost();
                  setShowPerformanceForm(false);
                }}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
              >
                🎭 Créer la Performance
              </button>
              <button
                onClick={() => setShowPerformanceForm(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
              >
                ❌ Annuler
              </button>
            </div>
          </div>
        )}

        {/* Formulaire de projet */}
        {showProjectForm && (
          <div className="bg-teal-50 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Créer un projet artistique</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre du projet</label>
                <input
                  type="text"
                  value={newPost.projectDetails.title}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    projectDetails: {...newPost.projectDetails, title: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Ex: Mural Communautaire"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Timeline</label>
                <input
                  type="text"
                  value={newPost.projectDetails.timeline}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    projectDetails: {...newPost.projectDetails, timeline: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Ex: 3 mois"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Budget (optionnel)</label>
                <input
                  type="text"
                  value={newPost.projectDetails.budget}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    projectDetails: {...newPost.projectDetails, budget: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Ex: 1,000,000 GNF"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newPost.projectDetails.description}
                  onChange={(e) => setNewPost({
                    ...newPost, 
                    projectDetails: {...newPost.projectDetails, description: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  rows={3}
                  placeholder="Description du projet..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Formes d'art</label>
                <div className="space-y-2">
                  {newPost.projectDetails.artForms.map((artForm, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={artForm}
                        onChange={(e) => {
                          const newArtForms = [...newPost.projectDetails.artForms];
                          newArtForms[index] = e.target.value;
                          setNewPost({
                            ...newPost, 
                            projectDetails: {...newPost.projectDetails, artForms: newArtForms}
                          });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="Forme d'art..."
                      />
                      {newPost.projectDetails.artForms.length > 1 && (
                        <button
                          onClick={() => {
                            const newArtForms = newPost.projectDetails.artForms.filter((_, i) => i !== index);
                            setNewPost({
                              ...newPost, 
                              projectDetails: {...newPost.projectDetails, artForms: newArtForms}
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
                      projectDetails: {...newPost.projectDetails, artForms: [...newPost.projectDetails.artForms, '']}
                    })}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    ➕ Ajouter une forme d'art
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Objectifs</label>
                <div className="space-y-2">
                  {newPost.projectDetails.goals.map((goal, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={goal}
                        onChange={(e) => {
                          const newGoals = [...newPost.projectDetails.goals];
                          newGoals[index] = e.target.value;
                          setNewPost({
                            ...newPost, 
                            projectDetails: {...newPost.projectDetails, goals: newGoals}
                          });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="Objectif..."
                      />
                      {newPost.projectDetails.goals.length > 1 && (
                        <button
                          onClick={() => {
                            const newGoals = newPost.projectDetails.goals.filter((_, i) => i !== index);
                            setNewPost({
                              ...newPost, 
                              projectDetails: {...newPost.projectDetails, goals: newGoals}
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
                      projectDetails: {...newPost.projectDetails, goals: [...newPost.projectDetails.goals, '']}
                    })}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    ➕ Ajouter un objectif
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => {
                  setNewPost({...newPost, content: newPost.projectDetails.title, type: 'project'});
                  createPost();
                  setShowProjectForm(false);
                }}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors duration-200"
              >
                🎨 Créer le Projet
              </button>
              <button
                onClick={() => setShowProjectForm(false)}
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
                {group.artStyle && (
                  <div className="flex items-center gap-1">
                    <span>🎨</span>
                    <span className="capitalize">{group.artStyle}</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedGroup(group)}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 text-sm"
                >
                  💬 Discussions
                </button>
                {!group.members.find(m => m.numeroH === userData?.numeroH) && (
                  <button
                    onClick={() => joinGroup(group.id)}
                    className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors duration-200 text-sm"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="text">📝 Texte</option>
                    <option value="image">🖼️ Image</option>
                    <option value="video">🎥 Vidéo</option>
                    <option value="audio">🎵 Audio</option>
                    <option value="exhibition">🖼️ Exposition</option>
                    <option value="performance">🎭 Performance</option>
                    <option value="project">🎨 Projet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contenu</label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                {newPost.type !== 'text' && newPost.type !== 'exhibition' && newPost.type !== 'performance' && newPost.type !== 'project' && newPost.type !== 'audio' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fichier média</label>
                    <input
                      type="file"
                      accept={newPost.type === 'image' ? 'image/*' : 'video/*'}
                      onChange={(e) => setNewPost({...newPost, mediaFile: e.target.files?.[0] || null})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                )}
                <button
                  onClick={createPost}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
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
                  
                  {/* Détails d'exposition */}
                  {post.type === 'exhibition' && post.exhibitionDetails && (
                    <div className="bg-pink-50 rounded-lg p-4 mb-3">
                      <h6 className="font-medium text-pink-900 mb-2">🖼️ Détails de l'exposition</h6>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><strong>Titre:</strong> {post.exhibitionDetails.title}</div>
                        <div><strong>Thème:</strong> {post.exhibitionDetails.theme}</div>
                        <div><strong>Date:</strong> {post.exhibitionDetails.date}</div>
                        <div><strong>Heure:</strong> {post.exhibitionDetails.time}</div>
                        <div><strong>Lieu:</strong> {post.exhibitionDetails.location}</div>
                        <div><strong>Durée:</strong> {post.exhibitionDetails.duration} jours</div>
                        <div><strong>Artistes:</strong> {post.exhibitionDetails.artists.length}/{post.exhibitionDetails.maxArtists}</div>
                      </div>
                      {post.exhibitionDetails.artTypes.length > 0 && (
                        <div className="mt-2">
                          <strong>Types d'art:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {post.exhibitionDetails.artTypes.map((artType, index) => (
                              <span key={index} className="px-2 py-1 bg-pink-200 text-pink-800 rounded-full text-xs">
                                {artType}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {!post.exhibitionDetails.artists.includes(userData?.numeroH || '') && 
                       post.exhibitionDetails.artists.length < post.exhibitionDetails.maxArtists && (
                        <button
                          onClick={() => joinExhibition(post.id)}
                          className="mt-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm"
                        >
                          🖼️ Rejoindre l'exposition
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Détails de performance */}
                  {post.type === 'performance' && post.performanceDetails && (
                    <div className="bg-indigo-50 rounded-lg p-4 mb-3">
                      <h6 className="font-medium text-indigo-900 mb-2">🎭 Détails de la performance</h6>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><strong>Titre:</strong> {post.performanceDetails.title}</div>
                        <div><strong>Type:</strong> {post.performanceDetails.performanceType}</div>
                        <div><strong>Date:</strong> {post.performanceDetails.date}</div>
                        <div><strong>Heure:</strong> {post.performanceDetails.time}</div>
                        <div><strong>Lieu:</strong> {post.performanceDetails.location}</div>
                        <div><strong>Durée:</strong> {post.performanceDetails.duration} min</div>
                        <div><strong>Performeurs:</strong> {post.performanceDetails.performers.length}/{post.performanceDetails.maxPerformers}</div>
                      </div>
                      {post.performanceDetails.requirements.length > 0 && (
                        <div className="mt-2">
                          <strong>Exigences:</strong>
                          <ul className="text-sm list-disc list-inside">
                            {post.performanceDetails.requirements.map((requirement, index) => (
                              <li key={index}>{requirement}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {!post.performanceDetails.performers.includes(userData?.numeroH || '') && 
                       post.performanceDetails.performers.length < post.performanceDetails.maxPerformers && (
                        <button
                          onClick={() => joinPerformance(post.id)}
                          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                        >
                          🎭 Rejoindre la performance
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Détails de projet */}
                  {post.type === 'project' && post.projectDetails && (
                    <div className="bg-teal-50 rounded-lg p-4 mb-3">
                      <h6 className="font-medium text-teal-900 mb-2">🎨 Détails du projet</h6>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><strong>Titre:</strong> {post.projectDetails.title}</div>
                        <div><strong>Timeline:</strong> {post.projectDetails.timeline}</div>
                        {post.projectDetails.budget && (
                          <div><strong>Budget:</strong> {post.projectDetails.budget}</div>
                        )}
                        <div><strong>Participants:</strong> {post.projectDetails.participants.length}</div>
                      </div>
                      <div className="mt-2">
                        <strong>Description:</strong>
                        <p className="text-sm mt-1">{post.projectDetails.description}</p>
                      </div>
                      {post.projectDetails.artForms.length > 0 && (
                        <div className="mt-2">
                          <strong>Formes d'art:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {post.projectDetails.artForms.map((artForm, index) => (
                              <span key={index} className="px-2 py-1 bg-teal-200 text-teal-800 rounded-full text-xs">
                                {artForm}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {post.projectDetails.goals.length > 0 && (
                        <div className="mt-2">
                          <strong>Objectifs:</strong>
                          <ul className="text-sm list-disc list-inside">
                            {post.projectDetails.goals.map((goal, index) => (
                              <li key={index}>{goal}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {!post.projectDetails.participants.includes(userData?.numeroH || '') && (
                        <button
                          onClick={() => joinProject(post.id)}
                          className="mt-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
                        >
                          🎨 Rejoindre le projet
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
