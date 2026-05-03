import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DefiEducatifContent from '../components/DefiEducatifContent';
import { config } from '../config/api';
import ProSection from '../components/ProSection';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  [key: string]: any;
}

interface Formation {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: number;
  level: string;
  requirements: string[];
  curriculum: string[];
  isActive: boolean;
  createdBy: string;
  maxStudents: number;
  price: number;
  startDate: string;
  endDate: string;
}

interface Professor {
  id: string;
  name: string;
  specialties: string[];
  qualifications: string[];
  experience: number;
  city: string;
  address: string;
  phone: string;
  email: string;
  consultationFee: number;
  availability: any;
  languages: string[];
  isActive: boolean;
  isAvailable: boolean;
  ratings: number;
  reviews: any[];
  createdBy: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  type: 'audio' | 'video' | 'written' | 'library' | 'test';
  content: string | { mediaUrl?: string; text?: string };
  duration: number;
  level: string;
  category: string;
  instructor?: string;
  materials?: string[];
  isActive: boolean;
  createdBy: string;
}

interface FormationRegistration {
  id: string;
  studentNumeroH: string;
  studentName: string;
  formationId: string;
  formationTitle: string;
  status: 'pending' | 'approved' | 'rejected';
  registeredAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

interface ProfessorRequest {
  id: string;
  studentNumeroH: string;
  studentName: string;
  professorId: string;
  professorName: string;
  subject: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  respondedAt?: string;
}

interface Stage {
  id: string;
  title: string;
  description: string;
  specialties: string[];
  qualifications: string[];
  experience: number;
  city: string;
  address: string;
  phone: string;
  email: string;
  consultationFee: number;
  availability: any;
  languages: string[];
  isActive: boolean;
  isAvailable: boolean;
  ratings: number;
  reviews: any[];
  createdBy: string;
}

interface StageRequest {
  id: string;
  studentNumeroH: string;
  studentName: string;
  stageId: string;
  stageTitle: string;
  subject: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  respondedAt?: string;
}

interface Progress {
  id: string;
  studentNumeroH: string;
  courseId: string;
  courseTitle: string;
  progress: number;
  completedLessons: string[];
  lastAccessed: string;
  totalTimeSpent: number;
}

interface Certificate {
  id: string;
  studentNumeroH: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  issuedAt: string;
  issuedBy: string;
  badgeUrl: string;
  isValid: boolean;
}

interface School {
  id: string;
  name: string;
  address?: string;
  contact?: string;
  description?: string;
  createdByNumeroH: string;
  isActive: boolean;
}

export default function Education() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'inscription-suivi' | 'formation-scientifique' | 'mes-cours' | 'defi-educatif'>('formation-scientifique');
  const [formations, setFormations] = useState<Formation[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [linkedCourses, setLinkedCourses] = useState<Course[]>([]);
  const [linkedStudents, setLinkedStudents] = useState<Array<{ numeroH: string; name: string }>>([]);
  const [publishAssignedStudents, setPublishAssignedStudents] = useState<string[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<FormationRegistration[]>([]);
  const [myRequests, setMyRequests] = useState<ProfessorRequest[]>([]);
  const [myStageRequests, setMyStageRequests] = useState<StageRequest[]>([]);
  const [myProgress, setMyProgress] = useState<Progress[]>([]);
  const [myCertificates, setMyCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [showProfessorRequestForm, setShowProfessorRequestForm] = useState(false);
  const [showStageRequestForm, setShowStageRequestForm] = useState(false);
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [activeCourseTab, setActiveCourseTab] = useState<'audio' | 'video' | 'written' | 'exercice' | 'library' | 'progress' | 'certificates' | 'publier'>('audio');
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [myProfessorProfile, setMyProfessorProfile] = useState<Professor | null>(null);
  const [childrenProgress, setChildrenProgress] = useState<Array<{ childNumeroH: string; childName: string; formations: Array<{ id: string; formationTitle?: string; category?: string; level?: string; status: string; progress: number; registeredAt: string }> }>>([]);
  const [linkChildNumeroH, setLinkChildNumeroH] = useState('');
  const [linkChildLoading, setLinkChildLoading] = useState(false);
  const [linkChildMessage, setLinkChildMessage] = useState<string | null>(null);
  const [registerProfessorForm, setRegisterProfessorForm] = useState({ specialty: 'Français', bio: '' });
  const [registerProfessorLoading, setRegisterProfessorLoading] = useState(false);
  const [registerProfessorSuccess, setRegisterProfessorSuccess] = useState<string | null>(null);
  const [inscriptionStep, setInscriptionStep] = useState<'button' | 'choice' | 'professeur' | 'apprenant'>('button');
  const [apprenantParent1, setApprenantParent1] = useState('');
  const [apprenantParent2, setApprenantParent2] = useState('');
  const [registerParentsLoading, setRegisterParentsLoading] = useState(false);
  const [registerParentsMessage, setRegisterParentsMessage] = useState<string | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolForm, setSchoolForm] = useState({ name: '', address: '', contact: '', description: '' });
  const [schoolLoading, setSchoolLoading] = useState(false);
  const [schoolMessage, setSchoolMessage] = useState<string | null>(null);
  const [publishForm, setPublishForm] = useState({
    type: 'written' as 'written' | 'video' | 'audio' | 'test' | 'library',
    title: '',
    description: '',
    category: 'Général',
    level: 'débutant',
    duration: '',
    content: '',
    mediaFile: null as File | null
  });
  const navigate = useNavigate();

  const [registrationForm, setRegistrationForm] = useState({
    numeroH: '',
    motivation: ''
  });

  const [professorRequestForm, setProfessorRequestForm] = useState({
    numeroH: '',
    subject: '',
    message: ''
  });

  const [stageRequestForm, setStageRequestForm] = useState({
    numeroH: '',
    subject: '',
    message: ''
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
      loadData();
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    // Charger formations et professeurs en priorité → affiche la page rapidement
    await Promise.allSettled([loadFormations(), loadProfessors()]);
    setLoading(false);
    // Charger le reste en arrière-plan sans bloquer l'affichage
    Promise.allSettled([
      loadStages(),
      loadMyRegistrations(),
      loadMyRequests(),
      loadMyStageRequests(),
      loadMyProfessorProfile(),
      loadChildrenProgress(),
      loadSchools()
    ]).catch(() => {});
  };

  useEffect(() => {
    if (activeTab === 'mes-cours') {
      loadCourses();
      loadLinkedCourses();
      loadLinkedStudents();
      loadMyProgress();
      loadMyCertificates();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMyProfessorProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/education/my-professor-profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMyProfessorProfile(data.professor || null);
      }
    } catch {
      setMyProfessorProfile(null);
    }
  };

  const loadChildrenProgress = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/education/my-children-progress`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setChildrenProgress(data.children || []);
      } else {
        setChildrenProgress([]);
      }
    } catch {
      setChildrenProgress([]);
    }
  };

  const loadLinkedCourses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/education/my-linked-courses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLinkedCourses(data.courses || []);
      } else {
        setLinkedCourses([]);
      }
    } catch {
      setLinkedCourses([]);
    }
  };

  const loadLinkedStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/education/my-linked-students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLinkedStudents(data.students || []);
      } else {
        setLinkedStudents([]);
      }
    } catch {
      setLinkedStudents([]);
    }
  };

  const handleRegisterProfessor = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterProfessorLoading(true);
    setRegisterProfessorSuccess(null);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/education/register-professor`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(registerProfessorForm)
      });
      const data = await response.json();
      if (data.success) {
        setRegisterProfessorSuccess(data.message || 'Demande enregistrée. Un administrateur confirmera votre statut.');
        setMyProfessorProfile(data.professor);
      } else {
        setRegisterProfessorSuccess(data.message || 'Erreur');
      }
    } catch {
      setRegisterProfessorSuccess('Erreur de connexion');
    } finally {
      setRegisterProfessorLoading(false);
    }
  };

  const handleLinkChildByNumeroH = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = linkChildNumeroH.trim();
    if (!trimmed) return;
    setLinkChildLoading(true);
    setLinkChildMessage(null);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/parent-child/link`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ childNumeroH: trimmed })
      });
      const data = await response.json();
      if (data.success) {
        setLinkChildMessage('Demande envoyée. L\'apprenant devra confirmer le lien depuis Famille.');
        setLinkChildNumeroH('');
        loadChildrenProgress();
      } else {
        setLinkChildMessage(data.message || 'Erreur');
      }
    } catch {
      setLinkChildMessage('Erreur de connexion');
    } finally {
      setLinkChildLoading(false);
    }
  };

  const handleRegisterParents = async (e: React.FormEvent) => {
    e.preventDefault();
    const p1 = apprenantParent1.trim();
    if (!p1) return;
    setRegisterParentsLoading(true);
    setRegisterParentsMessage(null);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/parent-child/register-parents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent1NumeroH: p1, parent2NumeroH: apprenantParent2.trim() || undefined })
      });
      const data = await response.json();
      if (data.success) {
        setRegisterParentsMessage(data.message || 'NumeroH des parents enregistrés.');
        if (data.created && data.created > 0) {
          setApprenantParent1('');
          setApprenantParent2('');
        }
      } else {
        setRegisterParentsMessage(data.message || 'Erreur');
      }
    } catch {
      setRegisterParentsMessage('Erreur de connexion');
    } finally {
      setRegisterParentsLoading(false);
    }
  };

  const loadSchools = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/education/schools`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        setSchools(data.schools || []);
      } else {
        setSchools([]);
      }
    } catch {
      setSchools([]);
    }
  };

  const handleRegisterSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolForm.name.trim()) return;
    setSchoolLoading(true);
    setSchoolMessage(null);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/education/register-school`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(schoolForm)
      });
      const data = await response.json();
      if (data.success) {
        setSchoolMessage(data.message || 'École enregistrée. Elle sera visible après validation.');
        setSchoolForm({ name: '', address: '', contact: '', description: '' });
        loadSchools();
      } else {
        setSchoolMessage(data.message || 'Erreur');
      }
    } catch {
      setSchoolMessage('Erreur de connexion');
    } finally {
      setSchoolLoading(false);
    }
  };

  const fetchWithTimeout = (url: string, options: RequestInit, ms = 6000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
  };

  const loadFormations = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetchWithTimeout(`${config.API_BASE_URL}/education/formations`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setFormations(data.formations || []);
      } else {
        setFormations([]);
      }
    } catch {
      setFormations([]);
    }
  };

  const loadProfessors = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetchWithTimeout(`${config.API_BASE_URL}/education/professors`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setProfessors(data.professors || []);
      } else {
        setProfessors([]);
      }
    } catch {
      setProfessors([]);
    }
  };

  const loadCourses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetchWithTimeout(`${config.API_BASE_URL}/education/courses`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      } else {
        setCourses([]);
      }
    } catch {
      setCourses([]);
    }
  };

  const handlePublishCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishForm.title.trim()) return;
    setPublishLoading(true);
    setPublishSuccess(null);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append('title', publishForm.title.trim());
      formData.append('description', publishForm.description);
      formData.append('type', publishForm.type);
      formData.append('category', publishForm.category);
      formData.append('level', publishForm.level);
      if (publishForm.duration) formData.append('duration', publishForm.duration);
      if ((publishForm.type === 'written' || publishForm.type === 'test') && publishForm.content) {
        formData.append('content', publishForm.content);
      }
      if (publishForm.mediaFile) {
        formData.append('media', publishForm.mediaFile);
      }
      // Apprenants assignés par le professeur
      if (publishAssignedStudents.length > 0) {
        formData.append('assignedStudents', publishAssignedStudents.join(','));
      }
      const response = await fetch(`${config.API_BASE_URL}/education/courses/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setPublishSuccess('Contenu publié avec succès !');
        setPublishForm({
          type: 'written',
          title: '',
          description: '',
          category: 'Général',
          level: 'débutant',
          duration: '',
          content: '',
          mediaFile: null
        });
        loadCourses();
      } else {
        setPublishSuccess(data.message || 'Erreur lors de la publication');
      }
    } catch (err) {
      console.error(err);
      setPublishSuccess('Erreur de connexion. Réessayez.');
    } finally {
      setPublishLoading(false);
    }
  };

  const loadMyRegistrations = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/education/my-registrations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMyRegistrations(data.registrations || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des inscriptions:', error);
    }
  };

  const loadMyRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/education/my-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMyRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des demandes:', error);
    }
  };

  const loadStages = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/education/stages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStages(data.stages || []);
      } else {
        setStages(getDefaultStages());
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stages:', error);
      setStages(getDefaultStages());
    }
  };

  const loadMyStageRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/education/my-stage-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMyStageRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des demandes de stages:', error);
    }
  };

  const loadMyProgress = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/education/my-progress`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMyProgress(data.progress || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du progrès:', error);
    }
  };

  const loadMyCertificates = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/education/my-certificates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMyCertificates(data.certificates || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des certificats:', error);
    }
  };

  const handleFormationRegistration = async (formation: Formation) => {
    setSelectedFormation(formation);
    setRegistrationForm({
      numeroH: userData?.numeroH || '',
      motivation: ''
    });
    setShowRegistrationForm(true);
  };

  const submitFormationRegistration = async () => {
    const numeroH = userData?.numeroH || registrationForm.numeroH;
    if (!selectedFormation || !numeroH) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/education/register-formation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          formationId: selectedFormation.id,
          studentNumeroH: userData?.numeroH || registrationForm.numeroH,
          motivation: registrationForm.motivation
        })
      });
      
      if (response.ok) {
        alert('Demande d\'inscription envoyée avec succès !');
        setShowRegistrationForm(false);
        loadMyRegistrations();
      } else {
        alert('Erreur lors de l\'envoi de la demande');
      }
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      alert('Erreur lors de l\'envoi de la demande');
    }
  };

  const handleProfessorRequest = async (professor: Professor) => {
    setSelectedProfessor(professor);
    setProfessorRequestForm({
      numeroH: userData?.numeroH || '',
      subject: '',
      message: ''
    });
    setShowProfessorRequestForm(true);
  };

  const submitProfessorRequest = async () => {
    const numeroH = userData?.numeroH || professorRequestForm.numeroH;
    if (!selectedProfessor || !numeroH) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/education/request-professor`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          professorId: selectedProfessor.id,
          studentNumeroH: userData?.numeroH || professorRequestForm.numeroH,
          subject: professorRequestForm.subject,
          message: professorRequestForm.message
        })
      });
      
      if (response.ok) {
        alert('Demande envoyée au professeur avec succès !');
        setShowProfessorRequestForm(false);
        loadMyRequests();
      } else {
        alert('Erreur lors de l\'envoi de la demande');
      }
    } catch (error) {
      console.error('Erreur lors de la demande:', error);
      alert('Erreur lors de l\'envoi de la demande');
    }
  };

  const handleStageRequest = async (stage: Stage) => {
    setSelectedStage(stage);
    setStageRequestForm({
      numeroH: userData?.numeroH || '',
      subject: '',
      message: ''
    });
    setShowStageRequestForm(true);
  };

  const submitStageRequest = async () => {
    const numeroH = userData?.numeroH || stageRequestForm.numeroH;
    if (!selectedStage || !numeroH) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.API_BASE_URL}/education/request-stage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          stageId: selectedStage.id,
          studentNumeroH: numeroH,
          subject: stageRequestForm.subject,
          message: stageRequestForm.message
        })
      });
      
      if (response.ok) {
        alert('Demande de stage envoyée avec succès !');
        setShowStageRequestForm(false);
        loadMyStageRequests();
      } else {
        alert('Erreur lors de l\'envoi de la demande');
      }
    } catch (error) {
      console.error('Erreur lors de la demande de stage:', error);
      alert('Erreur lors de l\'envoi de la demande');
    }
  };

  const getDefaultFormations = (): Formation[] => [
    {
      id: '1',
      title: 'Formation en Informatique',
      description: 'Apprenez les bases de l\'informatique et de la programmation',
      category: 'Technologie',
      duration: 6,
      level: 'Débutant',
      requirements: ['Aucun prérequis'],
      curriculum: ['Introduction', 'Bases de données', 'Programmation'],
      isActive: true,
      createdBy: 'admin',
      maxStudents: 30,
      price: 50000,
      startDate: '2024-01-15',
      endDate: '2024-07-15'
    },
    {
      id: '2',
      title: 'Formation en Langues',
      description: 'Apprenez l\'anglais et le français',
      category: 'Langues',
      duration: 4,
      level: 'Intermédiaire',
      requirements: ['Niveau scolaire'],
      curriculum: ['Grammaire', 'Vocabulaire', 'Conversation'],
      isActive: true,
      createdBy: 'admin',
      maxStudents: 25,
      price: 30000,
      startDate: '2024-02-01',
      endDate: '2024-06-01'
    }
  ];

  const getDefaultProfessors = (): Professor[] => [
    {
      id: '1',
      name: 'Dr. Alpha Diallo',
      specialties: ['Mathématiques', 'Physique'],
      qualifications: ['PhD Mathématiques', 'Master Physique'],
      experience: 15,
      city: 'Conakry',
      address: 'Hamdallaye',
      phone: '+224 123 456 789',
      email: 'alpha.diallo@email.com',
      consultationFee: 25000,
      availability: { monday: true, tuesday: true },
      languages: ['Français', 'Anglais'],
      isActive: true,
      isAvailable: true,
      ratings: 4.8,
      reviews: [],
      createdBy: 'admin'
    },
    {
      id: '2',
      name: 'Prof. Fatou Camara',
      specialties: ['Français', 'Littérature'],
      qualifications: ['Master Français', 'Licence Littérature'],
      experience: 10,
      city: 'Conakry',
      address: 'Kaloum',
      phone: '+224 987 654 321',
      email: 'fatou.camara@email.com',
      consultationFee: 20000,
      availability: { wednesday: true, thursday: true },
      languages: ['Français', 'Soussou'],
      isActive: true,
      isAvailable: true,
      ratings: 4.5,
      reviews: [],
      createdBy: 'admin'
    }
  ];

  const getDefaultStages = (): Stage[] => [
    {
      id: '1',
      title: 'Stage en Arabe - Coran',
      description: 'Apprenez le Coran et la langue arabe',
      specialties: ['Coran', 'Arabe', 'Tajwid'],
      qualifications: ['Maîtrise du Coran', 'Diplôme en Arabe'],
      experience: 10,
      city: 'Conakry',
      address: 'Hamdallaye',
      phone: '+224 123 456 789',
      email: 'stage.arabe@email.com',
      consultationFee: 15000,
      availability: { monday: true, tuesday: true, wednesday: true },
      languages: ['Arabe', 'Français'],
      isActive: true,
      isAvailable: true,
      ratings: 4.9,
      reviews: [],
      createdBy: 'admin'
    },
    {
      id: '2',
      title: 'Stage en Arabe - Hadith',
      description: 'Étude des Hadiths et sciences islamiques',
      specialties: ['Hadith', 'Fiqh', 'Arabe'],
      qualifications: ['Maîtrise en Hadith', 'Diplôme en Fiqh'],
      experience: 8,
      city: 'Conakry',
      address: 'Kaloum',
      phone: '+224 987 654 321',
      email: 'stage.hadith@email.com',
      consultationFee: 18000,
      availability: { thursday: true, friday: true },
      languages: ['Arabe', 'Français'],
      isActive: true,
      isAvailable: true,
      ratings: 4.7,
      reviews: [],
      createdBy: 'admin'
    }
  ];

  const getDefaultCourses = (): Course[] => [
    {
      id: '1',
      title: 'Cours de Mathématiques',
      description: 'Cours complet de mathématiques niveau lycée',
      type: 'video',
      content: 'Contenu vidéo du cours',
      duration: 120,
      level: 'Lycée',
      category: 'Sciences',
      instructor: 'Dr. Alpha Diallo',
      materials: ['Livre de cours', 'Exercices'],
      isActive: true,
      createdBy: 'admin'
    },
    {
      id: '2',
      title: 'Cours de Français',
      description: 'Cours de français niveau collège',
      type: 'audio',
      content: 'Contenu audio du cours',
      duration: 90,
      level: 'Collège',
      category: 'Langues',
      instructor: 'Prof. Fatou Camara',
      materials: ['Manuel', 'Dictées'],
      isActive: true,
      createdBy: 'admin'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des données éducatives...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🎓 Éducation</h1>
              <p className="mt-2 text-gray-600">Formations, professeurs et cours</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => navigate('/famille/inspir')}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white px-4 py-2 rounded-lg transition-colors font-semibold shadow-sm flex items-center gap-2"
              >
                <span>💡</span> Inspire
              </button>
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

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'inscription-suivi', label: 'Inscription & suivi', icon: '👥' },
              { id: 'formation-scientifique', label: 'Formation scientifique', icon: '📚' },
              { id: 'mes-cours', label: 'Mes Cours', icon: '🎯' },
              { id: 'defi-educatif', label: 'Défi éducatif', icon: '🏆' }
            ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if ('link' in tab && tab.link) {
                  navigate(tab.link);
                } else {
                  setActiveTab(tab.id as any);
                  if (tab.id === 'inscription-suivi') setInscriptionStep('button');
                }
              }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
                <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
          </nav>
        </div>
        </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'inscription-suivi' && (
          <div className="space-y-6">
            {/* Bannière : inscriptions dans Mon Profil */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="text-4xl">🚀</div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Vous souhaitez vous inscrire ?</h2>
                <p className="text-gray-600 text-sm">Les inscriptions (professeur, apprenant, école) se font depuis votre profil. Cliquez sur <strong>Mon Profil &gt; Actions</strong>.</p>
              </div>
              <button
                onClick={() => navigate('/moi')}
                className="flex-shrink-0 px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors shadow-md"
              >
                Aller dans Mon Profil
              </button>
            </div>

            {/* Statut professeur si déjà inscrit */}
            {myProfessorProfile && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">🎓 Mon statut professeur</h3>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">Inscrit comme professeur / guide</p>
                  <p className="text-gray-700 text-sm mt-1">Matière : <strong>{myProfessorProfile.specialty}</strong>{myProfessorProfile.bio ? ` • ${myProfessorProfile.bio}` : ''}</p>
                  {!myProfessorProfile.isActive && (
                    <p className="text-amber-700 text-sm mt-2">⏳ En attente de validation par l&apos;administrateur.</p>
                  )}
                  {myProfessorProfile.isActive && (
                    <p className="text-green-700 text-sm mt-2">✅ Compte validé — vous êtes visible dans la liste des professeurs.</p>
                  )}
                </div>
              </div>
            )}

            {/* Suivi des apprenants */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">👨‍👩‍👧 Suivi des apprenants</h3>
              <p className="text-gray-700 mb-4">En tant que parent, liez les apprenants à votre compte pour suivre leur progression (formations, cours).</p>
              {userData?.numeroH && (
                <p className="text-sm text-gray-600 mb-3">Votre NumeroH : <strong className="text-blue-600">{userData.numeroH}</strong></p>
              )}
              <form onSubmit={handleLinkChildByNumeroH} className="flex flex-wrap items-end gap-3 mb-4 max-w-xl">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">NumeroH de l&apos;apprenant</label>
                  <input type="text" value={linkChildNumeroH} onChange={(e) => setLinkChildNumeroH(e.target.value)} placeholder="Ex : G0C0P0R0E0F0 0" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <button type="submit" disabled={linkChildLoading} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium disabled:opacity-50">
                  {linkChildLoading ? 'Envoi...' : 'Lier cet apprenant'}
                </button>
              </form>
              {linkChildMessage && (
                <p className={`text-sm mb-4 ${linkChildMessage.startsWith('Demande') ? 'text-green-600' : 'text-red-600'}`}>{linkChildMessage}</p>
              )}
              {childrenProgress.length === 0 ? (
                <p className="text-gray-500 italic">Aucun apprenant lié. Saisissez le NumeroH ci-dessus pour commencer le suivi.</p>
              ) : (
                <div className="space-y-4">
                  {childrenProgress.map((child) => (
                    <div key={child.childNumeroH} className="bg-amber-50 rounded-lg border border-amber-200 p-4">
                      <h4 className="font-bold text-gray-900 mb-1">👤 Apprenant</h4>
                      <p className="text-sm text-gray-500 mb-2">{child.childNumeroH}</p>
                      {child.formations.length === 0 ? (
                        <p className="text-gray-500 text-sm">Aucune formation inscrite pour le moment.</p>
                      ) : (
                        <ul className="space-y-2">
                          {child.formations.map((f) => (
                            <li key={f.id} className="flex flex-wrap justify-between items-center text-sm border-b border-amber-100 pb-2 gap-2">
                              <span className="font-medium">{f.formationTitle || 'Formation'}</span>
                              <span className="text-gray-500">{f.category} • {f.level}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${f.status === 'approved' ? 'bg-green-100 text-green-800' : f.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                {f.status === 'approved' ? 'Approuvé' : f.status === 'pending' ? 'En attente' : f.status}
                              </span>
                              <span className="text-indigo-600 font-semibold">{f.progress}%</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lien vers la page Écoles */}
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="text-4xl">🏫</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Écoles & Professeurs</h3>
                <p className="text-gray-600 text-sm">Consultez la liste de toutes les écoles partenaires et des professeurs disponibles.</p>
              </div>
              <button
                onClick={() => navigate('/ecoles')}
                className="flex-shrink-0 px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors shadow-md"
              >
                Voir les écoles
              </button>
            </div>
          </div>
        )}

        {activeTab === 'formation-scientifique' && (
          <div className="space-y-8">
            {/* Section 0: Assistant IA - Français et Mathématiques */}
            <div className="bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 rounded-xl shadow-xl p-8 border-4 border-cyan-400 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-4xl shadow-lg">
                    🤖
                  </div>
                  <div>
                    <h2 className="text-4xl font-bold text-gray-900 mb-2">
                      Assistant IA
                    </h2>
                    <p className="text-lg text-gray-600">
                      Capable de vous assister en <strong>Français</strong> et en <strong>Mathématiques</strong>.
                    </p>
                  </div>
                  <div className="ml-auto">
                    <button
                      onClick={() => navigate('/professeur-ia')}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white py-3 px-6 rounded-lg font-bold text-lg transition-all shadow-lg"
                    >
                      Commencer
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 1: Formations Disponibles */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 border-2 border-blue-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-2xl">
                  📚
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Formations Disponibles</h2>
              </div>
            {formations.length === 0 ? (
              <p className="text-gray-500 italic text-center py-4">Aucune formation disponible pour le moment. Les enseignants peuvent en proposer via l&apos;onglet Publier.</p>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {formations.map((formation) => (
                  <div key={formation.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{formation.title}</h3>
                    <p className="text-gray-600 mb-4">{formation.description}</p>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Catégorie:</span>
                        <span className="text-sm font-medium">{formation.category}</span>
                    </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Durée:</span>
                        <span className="text-sm font-medium">{formation.duration} mois</span>
                    </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Niveau:</span>
                        <span className="text-sm font-medium">{formation.level}</span>
                  </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Prix:</span>
                        <span className="text-sm font-medium">{formation.price.toLocaleString()} FG</span>
                  </div>
                    </div>
                    <button
                      onClick={() => handleFormationRegistration(formation)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                    >
                      S'inscrire
                    </button>
                  </div>
                ))}
              </div>
            )}
            </div>

            {/* Section 2: Mes Inscriptions */}
            {myRegistrations.length > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg p-6 border-2 border-green-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-2xl">
                    ✅
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Mes Inscriptions</h3>
                </div>
                <div className="space-y-4">
                  {myRegistrations.map((registration) => (
                    <div key={registration.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{registration.formationTitle}</h4>
                          <p className="text-sm text-gray-600">Inscrit le: {new Date(registration.registeredAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          registration.status === 'approved' ? 'bg-green-100 text-green-800' :
                          registration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {registration.status === 'approved' ? 'Approuvé' :
                           registration.status === 'pending' ? 'En attente' : 'Rejeté'}
                        </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

            {/* Section 3: Professeurs Disponibles */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg p-6 border-2 border-purple-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-2xl">
                  👨‍🏫
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Professeurs Disponibles</h2>
              </div>
            {professors.length === 0 ? (
              <p className="text-gray-500 italic text-center py-4">Aucun professeur disponible pour le moment. Les enseignants peuvent s&apos;inscrire via Mon Profil &gt; Actions.</p>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {professors.map((professor) => (
                  <div key={professor.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{professor.name}</h3>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Spécialités:</span>
                        <span className="text-sm font-medium">{professor.specialties.join(', ')}</span>
                    </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Expérience:</span>
                        <span className="text-sm font-medium">{professor.experience} ans</span>
                    </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Ville:</span>
                        <span className="text-sm font-medium">{professor.city}</span>
                  </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Tarif:</span>
                        <span className="text-sm font-medium">{professor.consultationFee.toLocaleString()} FG</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Note:</span>
                        <span className="text-sm font-medium">⭐ {professor.ratings}/5</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleProfessorRequest(professor)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                      >
                        Demander
                      </button>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
                        Contacter
                      </button>
                    </div>
                  </div>
                      ))}
                    </div>
            )}
                  </div>

            {/* Section 4: Mes Demandes */}
            {myRequests.length > 0 && (
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl shadow-lg p-6 border-2 border-yellow-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center text-2xl">
                    📝
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Mes Demandes</h3>
                </div>
                <div className="space-y-4">
                  {myRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{request.professorName}</h4>
                          <p className="text-sm text-gray-600">Sujet: {request.subject}</p>
                          <p className="text-sm text-gray-600">Demandé le: {new Date(request.requestedAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {request.status === 'approved' ? 'Approuvé' :
                           request.status === 'pending' ? 'En attente' : 'Rejeté'}
                        </span>
                      </div>
                    </div>
                  ))}
                  </div>
                  </div>
            )}

          </div>
        )}

        {activeTab === 'mes-cours' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl shadow-lg p-6 border-2 border-indigo-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-2xl">
                  🎯
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Mes Cours</h2>
                  {linkedCourses.length > 0 && (
                    <p className="text-sm text-indigo-700 mt-1">
                      📚 {linkedCourses.length} cours de votre professeur lié
                    </p>
                  )}
                </div>
              </div>
              <nav className="flex space-x-4 mb-6">
                {[
                  { id: 'audio', label: 'Audio', icon: '🎵' },
                  { id: 'video', label: 'Vidéo', icon: '🎥' },
                  { id: 'written', label: 'Écrit', icon: '📝' },
                  { id: 'exercice', label: 'Exercice', icon: '📝' },
                  { id: 'library', label: 'Bibliothèque', icon: '📚' },
                  { id: 'publier', label: 'Publier', icon: '➕' },
                  { id: 'progress', label: 'Progrès', icon: '📊' },
                  { id: 'certificates', label: 'Certificats', icon: '🏆' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCourseTab(tab.id as any)}
                    className={`py-2 px-4 rounded-lg font-medium ${
                      activeCourseTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>

              {/* Contenu des cours */}
              <div className="space-y-6">
                {activeCourseTab === 'audio' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">🎵 Cours Audio</h3>
                    {linkedCourses.filter(c => c.type === 'audio').length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-bold text-indigo-600 uppercase mb-2">📌 De votre professeur</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {linkedCourses.filter(c => c.type === 'audio').map((course) => (
                            <div key={course.id} className="border-2 border-indigo-300 rounded-lg p-4 bg-indigo-50">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Prof</span>
                                <h4 className="font-semibold text-gray-900">{course.title}</h4>
                              </div>
                              <p className="text-gray-600 text-sm mb-2">{course.description}</p>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Durée: {course.duration} min</span>
                                <button className="bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-3 rounded text-sm">Écouter</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {courses.filter(c => c.type === 'audio').map((course) => (
                        <div key={course.id} className="border rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">{course.title}</h4>
                          <p className="text-gray-600 text-sm mb-2">{course.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Durée: {course.duration} min</span>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm">Écouter</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeCourseTab === 'video' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">🎥 Cours Vidéo</h3>
                    {linkedCourses.filter(c => c.type === 'video').length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-bold text-indigo-600 uppercase mb-2">📌 De votre professeur</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {linkedCourses.filter(c => c.type === 'video').map((course) => (
                            <div key={course.id} className="border-2 border-indigo-300 rounded-lg p-4 bg-indigo-50">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Prof</span>
                                <h4 className="font-semibold text-gray-900">{course.title}</h4>
                              </div>
                              <p className="text-gray-600 text-sm mb-2">{course.description}</p>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Durée: {course.duration} min</span>
                                <button className="bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-3 rounded text-sm">Regarder</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {courses.filter(c => c.type === 'video').map((course) => (
                        <div key={course.id} className="border rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">{course.title}</h4>
                          <p className="text-gray-600 text-sm mb-2">{course.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Durée: {course.duration} min</span>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm">Regarder</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeCourseTab === 'written' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">📝 Cours Écrits</h3>
                    {linkedCourses.filter(c => c.type === 'written').length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-bold text-indigo-600 uppercase mb-2">📌 De votre professeur</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {linkedCourses.filter(c => c.type === 'written').map((course) => (
                            <div key={course.id} className="border-2 border-indigo-300 rounded-lg p-4 bg-indigo-50">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Prof</span>
                                <h4 className="font-semibold text-gray-900">{course.title}</h4>
                              </div>
                              <p className="text-gray-600 text-sm mb-2">{course.description}</p>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Pages: {course.duration}</span>
                                <button className="bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-3 rounded text-sm">Lire</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {courses.filter(c => c.type === 'written').map((course) => (
                        <div key={course.id} className="border rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">{course.title}</h4>
                          <p className="text-gray-600 text-sm mb-2">{course.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Pages: {course.duration}</span>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm">Lire</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeCourseTab === 'exercice' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">📝 Exercices et tests</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {courses.filter(c => c.type === 'test').map((course) => (
                        <div key={course.id} className="border rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">{course.title}</h4>
                          <p className="text-gray-600 text-sm mb-2">{course.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">{course.category} • {course.level}</span>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm">
                              Passer le test
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Exercices interactifs</h4>
                        <p className="text-gray-600 text-sm mb-4">Pratiquez avec des exercices supplémentaires</p>
                        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm">
                          Commencer
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeCourseTab === 'publier' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">➕ Publier un cours, une vidéo, un audio ou un test</h3>
                    <p className="text-gray-600 text-sm mb-6">Publiez du contenu éducatif : cours écrit, vidéo, audio ou test/quiz.</p>
                    <form onSubmit={handlePublishCourse} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 max-w-2xl">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type de contenu *</label>
                        <select
                          value={publishForm.type}
                          onChange={(e) => setPublishForm({ ...publishForm, type: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="written">📝 Cours écrit</option>
                          <option value="video">🎥 Vidéo</option>
                          <option value="audio">🎵 Audio</option>
                          <option value="test">📋 Test / Quiz</option>
                          <option value="library">📚 Bibliothèque / Ressources</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                        <input
                          type="text"
                          value={publishForm.title}
                          onChange={(e) => setPublishForm({ ...publishForm, title: e.target.value })}
                          placeholder="Ex : Grammaire française - Les accords"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={publishForm.description}
                          onChange={(e) => setPublishForm({ ...publishForm, description: e.target.value })}
                          placeholder="Décrivez brièvement le contenu..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                          <input
                            type="text"
                            value={publishForm.category}
                            onChange={(e) => setPublishForm({ ...publishForm, category: e.target.value })}
                            placeholder="Ex : Langues, Sciences"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
                          <select
                            value={publishForm.level}
                            onChange={(e) => setPublishForm({ ...publishForm, level: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="débutant">Débutant</option>
                            <option value="intermédiaire">Intermédiaire</option>
                            <option value="avancé">Avancé</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Durée (minutes)</label>
                        <input
                          type="number"
                          min="1"
                          value={publishForm.duration}
                          onChange={(e) => setPublishForm({ ...publishForm, duration: e.target.value })}
                          placeholder="Ex : 30"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      {(publishForm.type === 'video' || publishForm.type === 'audio') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {publishForm.type === 'video' ? 'Fichier vidéo' : 'Fichier audio'} *
                          </label>
                          <input
                            type="file"
                            accept={publishForm.type === 'video' ? 'video/*' : 'audio/*'}
                            onChange={(e) => setPublishForm({ ...publishForm, mediaFile: e.target.files?.[0] || null })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      )}
                      {(publishForm.type === 'written' || publishForm.type === 'test') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {publishForm.type === 'test' ? 'Contenu du test (questions, consignes)' : 'Contenu du cours (texte)'}
                          </label>
                          <textarea
                            value={publishForm.content}
                            onChange={(e) => setPublishForm({ ...publishForm, content: e.target.value })}
                            placeholder={publishForm.type === 'test' ? 'Ex : Q1. Quelle est la bonne orthographe ? ...' : 'Collez ou écrivez le contenu du cours...'}
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                      {publishForm.type === 'library' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Fichier (PDF, document ou média)</label>
                          <input
                            type="file"
                            accept=".pdf,image/*,video/*,audio/*"
                            onChange={(e) => setPublishForm({ ...publishForm, mediaFile: e.target.files?.[0] || null })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      )}
                      {/* Assigner à des apprenants liés (si professeur) */}
                      {linkedStudents.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            👨‍🎓 Assigner à des apprenants (optionnel)
                          </label>
                          <p className="text-xs text-gray-500 mb-2">Cochez les apprenants qui doivent voir ce cours dans leur espace "Mes Cours".</p>
                          <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                            {linkedStudents.map(student => (
                              <label key={student.numeroH} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={publishAssignedStudents.includes(student.numeroH)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setPublishAssignedStudents(prev => [...prev, student.numeroH]);
                                    } else {
                                      setPublishAssignedStudents(prev => prev.filter(n => n !== student.numeroH));
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-gray-800">{student.name}</span>
                                <span className="text-xs text-gray-500">({student.numeroH})</span>
                              </label>
                            ))}
                          </div>
                          {publishAssignedStudents.length === 0 && (
                            <p className="text-xs text-gray-400 mt-1">Aucun sélectionné = visible par tous les apprenants liés</p>
                          )}
                        </div>
                      )}
                      {publishSuccess && (
                        <p className={`text-sm ${publishSuccess.startsWith('Contenu') ? 'text-green-600' : 'text-red-600'}`}>
                          {publishSuccess}
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={publishLoading || !publishForm.title.trim()}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
                      >
                        {publishLoading ? 'Publication en cours...' : 'Publier'}
                      </button>
                    </form>
                  </div>
                )}

                {activeCourseTab === 'library' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">📚 Bibliothèque</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {courses.filter(c => c.type === 'library').map((course) => (
                        <div key={course.id} className="border rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">{course.title}</h4>
                          <p className="text-gray-600 text-sm mb-2">{course.description}</p>
                          <div className="space-y-1">
                            {(course.materials || []).map((material, index) => (
                              <div key={index} className="text-sm text-gray-500">• {material}</div>
                            ))}
                  </div>
                          <button className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm">
                            Consulter
                          </button>
                  </div>
                      ))}
                  </div>
                </div>
                )}
            
                {activeCourseTab === 'progress' && (
            <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 Mon Progrès</h3>
                    <div className="space-y-4">
                      {myProgress.map((progress) => (
                        <div key={progress.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-900">{progress.courseTitle}</h4>
                            <span className="text-sm text-gray-500">{progress.progress}%</span>
                    </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress.progress}%` }}
                            ></div>
                  </div>
                          <div className="flex justify-between text-sm text-gray-500">
                            <span>Temps passé: {progress.totalTimeSpent} min</span>
                            <span>Dernière fois: {new Date(progress.lastAccessed).toLocaleDateString()}</span>
                </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeCourseTab === 'certificates' && (
                    <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">🏆 Mes Certificats</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myCertificates.map((certificate) => (
                        <div key={certificate.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-900">{certificate.courseTitle}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              certificate.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {certificate.isValid ? 'Valide' : 'Expiré'}
                            </span>
                    </div>
                          <p className="text-sm text-gray-600 mb-2">
                            Émis le: {new Date(certificate.issuedAt).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600 mb-3">
                            Par: {certificate.issuedBy}
                          </p>
                          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm">
                            Télécharger
                          </button>
                  </div>
                      ))}
                </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {activeTab === 'defi-educatif' && (
          <DefiEducatifContent userData={userData} />
        )}
      </div>

      {/* Modal d'inscription à une formation */}
        {showRegistrationForm && selectedFormation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              S'inscrire à: {selectedFormation.title}
              </h3>
              <div className="space-y-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Votre NumeroH (compte connecté)
                </label>
                  <input
                    type="text"
                  value={userData?.numeroH ?? registrationForm.numeroH}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-700"
                  />
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivation
                </label>
                  <textarea
                  value={registrationForm.motivation}
                  onChange={(e) => setRegistrationForm({...registrationForm, motivation: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  placeholder="Pourquoi voulez-vous suivre cette formation ?"
                  />
                </div>
              </div>
            <div className="flex space-x-3 mt-6">
                <button
                onClick={() => setShowRegistrationForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                >
                Annuler
                </button>
                <button
                onClick={submitFormationRegistration}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                Envoyer la demande
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Modal de demande de professeur */}
      {showProfessorRequestForm && selectedProfessor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Demander: {selectedProfessor.name}
              </h3>
              <div className="space-y-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Votre NumeroH (compte connecté)
                </label>
                  <input
                    type="text"
                  value={userData?.numeroH ?? professorRequestForm.numeroH}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-700"
                  />
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sujet
                </label>
                <input
                  type="text"
                  value={professorRequestForm.subject}
                  onChange={(e) => setProfessorRequestForm({...professorRequestForm, subject: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Sujet de votre demande"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                  <textarea
                  value={professorRequestForm.message}
                  onChange={(e) => setProfessorRequestForm({...professorRequestForm, message: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Décrivez votre demande..."
                  />
                </div>
              </div>
            <div className="flex space-x-3 mt-6">
                <button
                onClick={() => setShowProfessorRequestForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                >
                Annuler
                </button>
                <button
                onClick={submitProfessorRequest}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                Envoyer la demande
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Modal de demande de stage */}
      {showStageRequestForm && selectedStage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Demander: {selectedStage.title}
              </h3>
              <div className="space-y-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Votre NumeroH (compte connecté)
                </label>
                  <input
                    type="text"
                  value={userData?.numeroH ?? stageRequestForm.numeroH}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-700"
                  />
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sujet
                </label>
                <input
                  type="text"
                  value={stageRequestForm.subject}
                  onChange={(e) => setStageRequestForm({...stageRequestForm, subject: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Sujet de votre demande"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                  <textarea
                  value={stageRequestForm.message}
                  onChange={(e) => setStageRequestForm({...stageRequestForm, message: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Décrivez votre demande..."
                  />
                </div>
              </div>
            <div className="flex space-x-3 mt-6">
                <button
                onClick={() => setShowStageRequestForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                >
                Annuler
                </button>
                <button
                onClick={submitStageRequest}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                Envoyer la demande
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Section Écoles & Professeurs (approuvés par l'admin) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <ProSection
          type="school"
          title="Écoles & Professeurs"
          icon="🎓"
          description=""
        />
      </div>
    </div>
  );
}