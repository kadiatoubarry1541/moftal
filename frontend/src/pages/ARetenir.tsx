import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  [key: string]: any;
}

interface StorySection {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  reference: string;
  content: string;
  icon: string;
  photos?: string[];
  videos?: string[];
}

const sections: StorySection[] = [
  {
    id: 'naissance',
    title: 'Naissance et Enfance',
    subtitle: 'Les fondations de votre histoire',
    description: 'Racontez votre naissance, votre enfance, les personnes qui vous ont élevé et les valeurs qui vous ont été transmises dès le plus jeune âge.',
    reference: 'Inspiré de la création d\'Adam, le premier être humain créé par Dieu, placé au Paradis et doté de la connaissance des noms de toutes choses.',
    content: '',
    icon: '👶',
    photos: [],
    videos: []
  },
  {
    id: 'jeunesse',
    title: 'Jeunesse et Apprentissage',
    subtitle: 'Vos premières expériences et votre développement',
    description: 'Partagez vos premières expériences professionnelles, vos apprentissages, les compétences que vous avez développées et les personnes qui vous ont guidé.',
    reference: 'Inspiré d\'Adam qui reçut la connaissance et apprit les noms de toutes choses, démontrant la capacité humaine d\'apprendre et de comprendre le monde.',
    content: '',
    icon: '🌱',
    photos: [],
    videos: []
  },
  {
    id: 'mariage',
    title: 'Union et Engagement',
    subtitle: 'Votre vie de couple et vos engagements familiaux',
    description: 'Décrivez votre rencontre avec votre partenaire, votre mariage, la construction de votre foyer et les valeurs que vous partagez ensemble.',
    reference: 'Inspiré de l\'union d\'Adam et Ève, le premier couple de l\'humanité, créés pour être compagnons et pour peupler la terre ensemble.',
    content: '',
    icon: '💍',
    photos: [],
    videos: []
  },
  {
    id: 'revelation',
    title: 'Réalisation et Mission',
    subtitle: 'Votre prise de conscience et votre vocation',
    description: 'Narratez le moment où vous avez découvert votre vocation, votre mission dans la vie, les valeurs qui vous animent et les causes qui vous tiennent à cœur.',
    reference: 'Inspiré de la mission confiée à Adam de peupler la terre, de la cultiver et de transmettre les valeurs divines aux générations futures.',
    content: '',
    icon: '✨',
    photos: [],
    videos: []
  },
  {
    id: 'persecution',
    title: 'Épreuves et Résilience',
    subtitle: 'Les défis que vous avez surmontés',
    description: 'Racontez les difficultés que vous avez rencontrées, les obstacles que vous avez surmontés, et comment ces épreuves vous ont rendu plus fort.',
    reference: 'Inspiré des épreuves d\'Adam et Ève après leur désobéissance, leur repentir sincère et leur résilience pour reconstruire leur vie sur terre.',
    content: '',
    icon: '🛡️',
    photos: [],
    videos: []
  },
  {
    id: 'unification',
    title: 'Réalisation et Unification',
    subtitle: 'Vos accomplissements et votre impact',
    description: 'Partagez vos réalisations, les projets que vous avez menés à bien, les communautés que vous avez unifiées ou aidées, et l\'impact positif que vous avez eu.',
    reference: 'Inspiré de la réunion d\'Adam et Ève sur terre, marquant le début de l\'humanité et la fondation de la première famille, base de toutes les générations futures.',
    content: '',
    icon: '🏆',
    photos: [],
    videos: []
  },
  {
    id: 'heritage',
    title: 'Héritage et Transmission',
    subtitle: 'Ce que vous laissez derrière vous',
    description: 'Décrivez l\'héritage que vous souhaitez laisser, les valeurs que vous transmettez à vos descendants, et les enseignements que vous voulez que l\'on retienne de votre vie.',
    reference: 'Inspiré d\'Adam qui transmit ses enseignements à ses enfants (Caïn, Abel, Seth), établissant les fondements de la transmission des valeurs et de la continuité générationnelle.',
    content: '',
    icon: '📜',
    photos: [],
    videos: []
  }
];

// Age minimum requis par section
const SECTION_AGE_REQUIREMENTS: Record<string, number> = {
  naissance: 25,
  jeunesse: 25,
  mariage: 25,
  revelation: 40,
  persecution: 40,
  unification: 60,
  heritage: 60
};

interface PublishedSectionInfo {
  sectionId: string;
  publishedAt: string;
  authorName?: string;
}

export default function ARetenir() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [storySections, setStorySections] = useState<StorySection[]>(sections);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [publishedSections, setPublishedSections] = useState<PublishedSectionInfo[]>([]);
  const navigate = useNavigate();

  // Calculer l'âge de l'utilisateur
  const getUserAge = (): number => {
    if (!userData) return 0;
    if (userData.age && typeof userData.age === 'number') return userData.age;
    if (userData.dateNaissance) {
      const birth = new Date(userData.dateNaissance);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      return age;
    }
    return 0;
  };

  const canPublishSection = (sectionId: string): boolean => {
    const required = SECTION_AGE_REQUIREMENTS[sectionId] || 25;
    return getUserAge() >= required;
  };

  const isSectionPublished = (sectionId: string): boolean => {
    return publishedSections.some(p => p.sectionId === sectionId);
  };

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
      loadUserStories(user.numeroH);
      loadPublishedSections(user.numeroH);
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  const loadUserStories = async (numeroH: string) => {
    try {
      const session = localStorage.getItem("session_user");
      const token = session ? JSON.parse(session).token : null;
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002'}/api/user-stories/${numeroH}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        if (data.stories) {
          const updatedSections = sections.map(section => {
            const storyData = data.stories[section.id];
            if (typeof storyData === 'string') {
              return { ...section, content: storyData, photos: [], videos: [] };
            } else if (storyData && typeof storyData === 'object') {
              return {
                ...section,
                content: storyData.content || '',
                photos: storyData.photos || [],
                videos: storyData.videos || []
              };
            }
            return { ...section, content: '', photos: [], videos: [] };
          });
          setStorySections(updatedSections);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des histoires:', error);
    }
  };

  const loadPublishedSections = async (numeroH: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002'}/api/user-stories/published?numeroH=${encodeURIComponent(numeroH)}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        setPublishedSections((data.stories || []).map((s: any) => ({
          sectionId: s.sectionId,
          publishedAt: s.publishedAt,
          authorName: s.authorName
        })));
      }
    } catch {}
  };

  const handleContentChange = (sectionId: string, content: string) => {
    setStorySections(prev => 
      prev.map(section => 
        section.id === sectionId ? { ...section, content } : section
      )
    );
  };

  const handleSave = async (sectionId: string) => {
    if (!userData) return;

    setSaving(true);
    try {
      const section = storySections.find(s => s.id === sectionId);
      if (!section) return;

      const sectionData = {
        content: section.content,
        photos: section.photos || [],
        videos: section.videos || []
      };

      const session2 = localStorage.getItem("session_user");
      const authToken = session2 ? JSON.parse(session2).token : null;
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002'}/api/user-stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          numeroH: userData.numeroH,
          sectionId,
          data: sectionData
        })
      });

      if (response.ok) {
        toast.success('Histoire sauvegardée avec succès');
      } else if (response.status === 401) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => navigate('/login'), 1500);
        throw new Error('session_expired');
      } else {
        throw new Error('Erreur lors de la sauvegarde');
      }
    } catch (error: any) {
      if (error.message !== 'session_expired') {
        console.error('Erreur lors de la sauvegarde:', error);
        toast.error('Erreur lors de la sauvegarde. Vérifiez que le serveur est démarré.');
      }
      throw error; // rethrow pour bloquer la publication si la sauvegarde échoue
    } finally {
      setSaving(false);
    }
  };

  const handlePublishClick = async (sectionId: string) => {
    if (!userData) return;
    const section = storySections.find(s => s.id === sectionId);
    if (!section || !section.content || section.content.trim().length < 50) {
      toast.error('Veuillez remplir au moins 50 caractères avant de publier');
      return;
    }
    if (!canPublishSection(sectionId)) {
      const required = SECTION_AGE_REQUIREMENTS[sectionId] || 25;
      toast.error(`Vous devez avoir au moins ${required} ans pour publier cette section`);
      return;
    }

    setSaving(true);
    try {
      await handleSave(sectionId);
      const session = localStorage.getItem("session_user");
      const token = session ? JSON.parse(session).token : null;
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002'}/api/user-stories/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          numeroH: userData.numeroH,
          sectionId,
          witnesses: []
        })
      });
      if (response.ok) {
        toast.success('✨ Votre histoire a été publiée dans l\'Histoire de l\'Humanité !');
        loadPublishedSections(userData.numeroH);
      } else if (response.status === 401) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la publication');
      }
    } catch (error: any) {
      if (error.message?.includes('fetch') || error.name === 'TypeError') {
        toast.error('Impossible de contacter le serveur. Vérifiez que le backend est démarré.');
      } else {
        toast.error(error.message || 'Erreur lors de la publication');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePublication = async (sectionId: string) => {
    if (!userData) return;
    if (!window.confirm('Voulez-vous vraiment supprimer cette publication ? Elle sera retirée de l\'Histoire de l\'Humanité.')) return;
    try {
      const session = localStorage.getItem("session_user");
      const token = session ? JSON.parse(session).token : null;
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002'}/api/user-stories/publish/${sectionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ numeroH: userData.numeroH })
      });
      if (response.ok) {
        toast.success('Publication supprimée');
        setPublishedSections(prev => prev.filter(p => p.sectionId !== sectionId));
      } else {
        const d = await response.json();
        toast.error(d.message || 'Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur de connexion');
    }
  };

  const handleFileUpload = async (sectionId: string, file: File, type: 'photo' | 'video') => {
    if (!userData) return;

    // Vérifier la taille pour les vidéos (max 5 minutes = ~100MB pour une vidéo compressée)
    if (type === 'video' && file.size > 100 * 1024 * 1024) {
      toast.error('La vidéo est trop volumineuse. Maximum 100MB (environ 5 minutes)');
      return;
    }

    setUploading({ ...uploading, [`${sectionId}-${type}`]: true });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sectionId', sectionId);
      formData.append('type', type);
      formData.append('numeroH', userData.numeroH);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002'}/api/user-stories/upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        const section = storySections.find(s => s.id === sectionId);
        if (section) {
          if (type === 'photo') {
            setStorySections(prev => prev.map(s => 
              s.id === sectionId 
                ? { ...s, photos: [...(s.photos || []), data.fileUrl] }
                : s
            ));
          } else {
            setStorySections(prev => prev.map(s => 
              s.id === sectionId 
                ? { ...s, videos: [...(s.videos || []), data.fileUrl] }
                : s
            ));
          }
          toast.success(`${type === 'photo' ? 'Photo' : 'Vidéo'} uploadée avec succès`);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de l\'upload');
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'upload:', error);
      toast.error(error.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading({ ...uploading, [`${sectionId}-${type}`]: false });
    }
  };

  const handleRemoveMedia = (sectionId: string, mediaUrl: string, type: 'photo' | 'video') => {
    setStorySections(prev => prev.map(s => {
      if (s.id === sectionId) {
        if (type === 'photo') {
          return { ...s, photos: (s.photos || []).filter(p => p !== mediaUrl) };
        } else {
          return { ...s, videos: (s.videos || []).filter(v => v !== mediaUrl) };
        }
      }
      return s;
    }));
    toast.success(`${type === 'photo' ? 'Photo' : 'Vidéo'} supprimée`);
  };

  const handleSaveAll = async () => {
    if (!userData) return;

    setSaving(true);
    try {
      const stories: Record<string, any> = {};
      storySections.forEach(section => {
        stories[section.id] = {
          content: section.content,
          photos: section.photos || [],
          videos: section.videos || []
        };
      });

      const sessionAll = localStorage.getItem("session_user");
      const authTokenAll = sessionAll ? JSON.parse(sessionAll).token : null;
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002'}/api/user-stories/all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authTokenAll ? { 'Authorization': `Bearer ${authTokenAll}` } : {})
        },
        body: JSON.stringify({
          numeroH: userData.numeroH,
          stories
        })
      });

      if (response.ok) {
        toast.success('Toutes vos histoires ont été sauvegardées');
      } else {
        throw new Error('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (!userData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">📖 À Retenir</h1>
              <p className="text-blue-100 text-lg">
                Racontez votre histoire en 7 étapes inspirées de la vie d'Adam
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/histoire-humanite')}
                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
              >
                📚 Voir l'Histoire de l'Humanité
              </button>
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {saving ? 'Sauvegarde...' : '💾 Sauvegarder tout'}
              </button>
              <button
                onClick={() => navigate('/moi')}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg"
              >
                ← Retour
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">📚 Guide d'utilisation</h2>
          <p className="text-gray-700 leading-relaxed">
            Cette page vous permet de raconter votre histoire personnelle en vous inspirant des 7 étapes principales 
            de la vie d'Adam. Chaque section vous guide pour partager vos expériences, vos valeurs 
            et votre héritage. Remplissez chaque section avec vos propres récits, en vous référant aux références 
            historiques pour vous inspirer.
          </p>
        </div>

        <div className="space-y-6">
          {storySections.map((section, index) => (
            <div
              key={section.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow duration-300"
            >
              {/* Section Header */}
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 cursor-pointer"
                onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">{section.icon}</div>
                    <div>
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-white text-sm font-semibold bg-white bg-opacity-20 px-3 py-1 rounded-full">
                          Étape {index + 1}
                        </span>
                        <h3 className="text-2xl font-bold text-white">{section.title}</h3>
                        {/* Badge âge requis */}
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${canPublishSection(section.id) ? 'bg-green-400 text-green-900' : 'bg-yellow-300 text-yellow-900'}`}>
                          {canPublishSection(section.id) ? '✓ Publication débloquée' : `🔒 ${SECTION_AGE_REQUIREMENTS[section.id]} ans requis`}
                        </span>
                        {/* Badge publié */}
                        {isSectionPublished(section.id) && (
                          <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-400 text-emerald-900">✅ Publié</span>
                        )}
                      </div>
                      <p className="text-blue-100 mt-1">{section.subtitle}</p>
                    </div>
                  </div>
                  <div className="text-white text-2xl">
                    {expandedSection === section.id ? '▲' : '▼'}
                  </div>
                </div>
              </div>

              {/* Section Content */}
              {expandedSection === section.id && (
                <div className="p-6 space-y-6">
                  {/* Description */}
                  <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                    <h4 className="font-semibold text-blue-900 mb-2">📝 Description de la section</h4>
                    <p className="text-blue-800">{section.description}</p>
                  </div>

                  {/* Reference */}
                  <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                    <h4 className="font-semibold text-blue-900 mb-2">📖 Référence historique</h4>
                    <p className="text-blue-800 italic">{section.reference}</p>
                  </div>

                  {/* Text Editor */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Votre histoire - {section.title}
                    </label>
                    <textarea
                      value={section.content}
                      onChange={(e) => handleContentChange(section.id, e.target.value)}
                      placeholder={`Racontez votre histoire pour cette section...\n\nExemple : ${section.description}`}
                      className="w-full min-h-[300px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y font-serif text-gray-700 leading-relaxed"
                    />
                    <div className="mt-2 flex flex-col gap-2">
                      <p className="text-sm text-gray-500">
                        {section.content.length} caractères {section.content.length < 50 && '(minimum 50 pour publier)'}
                      </p>
                      {!canPublishSection(section.id) && (
                        <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                          🔒 Vous pouvez sauvegarder votre brouillon maintenant et publier lorsque vous aurez {SECTION_AGE_REQUIREMENTS[section.id]} ans.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => handleSave(section.id)}
                          disabled={saving}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                        >
                          {saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder brouillon'}
                        </button>
                        {canPublishSection(section.id) && !isSectionPublished(section.id) && (
                          <button
                            onClick={() => handlePublishClick(section.id)}
                            disabled={saving || !section.content || section.content.length < 50}
                            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg"
                          >
                            ✨ Publier dans l'Histoire de l'Humanité
                          </button>
                        )}
                        {isSectionPublished(section.id) && (
                          <>
                            <button
                              onClick={() => handlePublishClick(section.id)}
                              disabled={saving || !section.content || section.content.length < 50}
                              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors disabled:opacity-50 font-semibold shadow-lg"
                            >
                              🔄 Republier (mettre à jour)
                            </button>
                            <button
                              onClick={() => handleDeletePublication(section.id)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                            >
                              🗑️ Supprimer la publication
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Upload Photos */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📷 Photos
                    </label>
                    <div className="flex items-center gap-4 mb-4">
                      <label className="cursor-pointer px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold">
                        {uploading[`${section.id}-photo`] ? '⏳ Upload...' : '📷 Ajouter une photo'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(section.id, file, 'photo');
                              e.target.value = ''; // Reset input
                            }
                          }}
                          disabled={uploading[`${section.id}-photo`]}
                        />
                      </label>
                    </div>
                    {section.photos && section.photos.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        {section.photos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={`${import.meta.env.VITE_API_URL || 'http://localhost:5002'}${photo}`}
                              alt={`Photo ${index + 1}`}
                              className="w-full h-48 object-cover rounded-lg"
                              onError={(e) => {
                                e.currentTarget.src = photo.startsWith('http') ? photo : `${import.meta.env.VITE_API_URL || 'http://localhost:5002'}${photo}`;
                              }}
                            />
                            <button
                              onClick={() => handleRemoveMedia(section.id, photo, 'photo')}
                              className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Upload Videos */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      🎥 Vidéos (maximum 1 minute)
                    </label>
                    <div className="flex items-center gap-4 mb-4">
                      <label className="cursor-pointer px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold">
                        {uploading[`${section.id}-video`] ? '⏳ Upload...' : '🎥 Ajouter une vidéo'}
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const vid = document.createElement('video');
                            vid.preload = 'metadata';
                            vid.onloadedmetadata = () => {
                              URL.revokeObjectURL(vid.src);
                              if (vid.duration > 60) {
                                toast.error('La vidéo ne doit pas dépasser 1 minute.');
                                e.target.value = '';
                                return;
                              }
                              handleFileUpload(section.id, file, 'video');
                              e.target.value = '';
                            };
                            vid.src = URL.createObjectURL(file);
                          }}
                          disabled={uploading[`${section.id}-video`]}
                        />
                      </label>
                      <span className="text-sm text-gray-500">Max 1 minute</span>
                    </div>
                    {section.videos && section.videos.length > 0 && (
                      <div className="space-y-4 mb-4">
                        {section.videos.map((video, index) => (
                          <div key={index} className="relative group">
                            <video
                              src={`${import.meta.env.VITE_API_URL || 'http://localhost:5002'}${video}`}
                              controls
                              className="w-full rounded-lg"
                              onError={(e) => {
                                e.currentTarget.src = video.startsWith('http') ? video : `${import.meta.env.VITE_API_URL || 'http://localhost:5002'}${video}`;
                              }}
                            />
                            <button
                              onClick={() => handleRemoveMedia(section.id, video, 'video')}
                              className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500">
          <h3 className="text-xl font-bold text-gray-900 mb-3">💡 Conseils pour raconter votre histoire</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Soyez authentique et sincère dans vos récits</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Incluez des détails significatifs et des moments marquants</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Mentionnez les personnes qui ont influencé votre vie</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Partagez les valeurs et les enseignements que vous souhaitez transmettre</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Vous pouvez ajouter des photos et des vidéos (max 5 minutes) pour illustrer votre histoire</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Vous pouvez revenir modifier vos histoires à tout moment</span>
            </li>
          </ul>
        </div>
      </div>

    </div>
  );
}
