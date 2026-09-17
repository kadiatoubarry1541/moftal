import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DefiEducatifContent from '../components/DefiEducatifContent';
import { config } from '../config/api';
import ProSection from '../components/ProSection';
import { sortByProximity, sortAnyByProximity, getUserGeoContext, requestGPS, type UserGeoContext } from '../utils/proximity';
import { useI18n } from '../i18n/useI18n';

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
  const { t } = useI18n();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState<'inscription-suivi' | 'defi-educatif'>('inscription-suivi');
  const [rawFormations, setRawFormations] = useState<Formation[]>([]);
  const [rawProfessors, setRawProfessors] = useState<Professor[]>([]);
  const [rawSchoolsList, setRawSchoolsList] = useState<School[]>([]);
  const [userGeo, setUserGeo] = useState<UserGeoContext>(getUserGeoContext());
  const formations = useMemo(() => sortByProximity(rawFormations, userGeo), [rawFormations, userGeo]);
  const professors = useMemo(() => sortByProximity(rawProfessors, userGeo), [rawProfessors, userGeo]);
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
  const schools = useMemo(() => sortAnyByProximity(rawSchoolsList, userGeo), [rawSchoolsList, userGeo]);
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

  // GPS silencieux
  useEffect(() => {
    requestGPS().then(coords => {
      if (coords) setUserGeo(prev => ({ ...prev, coords }));
    });
  }, []);

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
    if (activeTab === 'inscription-suivi') {
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
        setRawSchoolsList(data.schools || []);
      } else {
        setRawSchoolsList([]);
      }
    } catch {
      setRawSchoolsList([]);
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
        setRawFormations(data.formations || []);
      } else {
        setRawFormations([]);
      }
    } catch {
      setRawFormations([]);
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
        setRawProfessors(data.professors || []);
      } else {
        setRawProfessors([]);
      }
    } catch {
      setRawProfessors([]);
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
          <p className="mt-4 text-gray-600">{t('education.loading')}</p>
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
              <h1 className="text-3xl font-bold text-gray-900">🎓 {t('education.title')}</h1>
              <p className="mt-2 text-gray-600">{t('education.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => navigate('/professeur-ia')}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold shadow-sm flex items-center gap-2"
              >
                <span>🤖</span> {t('education.my_ai_btn')}
              </button>
              <button
                onClick={() => navigate('/famille/inspir')}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white px-4 py-2 rounded-lg transition-colors font-semibold shadow-sm flex items-center gap-2"
              >
                <span>💡</span> {t('education.inspire_btn')}
              </button>
              <button
                onClick={() => navigate('/moi')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                {t('btn.back_arrow')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Écoles & Professeurs — remonté en haut pour leur donner la visibilité
          en priorité (comme les professionnels sur la page Santé), avec leur
          barre de recherche intégrée (ProSection) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <ProSection
          type="school"
          title={t('education.schools_professors_title')}
          icon="🎓"
          description=""
        />
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1 py-2">
            {[
              { id: 'inscription-suivi', label: t('education.tab_cours_inscription'), icon: '📚' },
              { id: 'defi-educatif', label: t('education.tab_defi_educatif'), icon: '🏆' }
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
              className={`flex flex-col items-center justify-center gap-1 px-2 py-2 sm:px-4 sm:py-3 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="text-base sm:text-lg">{tab.icon}</span>
              <span className="text-center leading-tight">{tab.label}</span>
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
                <h2 className="text-xl font-bold text-gray-900 mb-1">{t('education.want_to_register_title')}</h2>
                <p className="text-gray-600 text-sm">{t('education.want_to_register_desc')} <strong>{t('education.mon_profil_actions')}</strong>.</p>
              </div>
              <button
                onClick={() => navigate('/moi')}
                className="flex-shrink-0 px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors shadow-md"
              >
                {t('education.go_to_profile_btn')}
              </button>
            </div>

            {/* Statut professeur si déjà inscrit */}
            {myProfessorProfile && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">🎓 {t('education.my_professor_status')}</h3>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">{t('education.registered_as_professor')}</p>
                  <p className="text-gray-700 text-sm mt-1">{t('education.subject_label')} <strong>{myProfessorProfile.specialty}</strong>{myProfessorProfile.bio ? ` • ${myProfessorProfile.bio}` : ''}</p>
                  {!myProfessorProfile.isActive && (
                    <p className="text-amber-700 text-sm mt-2">{t('education.pending_validation')}</p>
                  )}
                  {myProfessorProfile.isActive && (
                    <p className="text-green-700 text-sm mt-2">{t('education.account_validated')}</p>
                  )}
                </div>
              </div>
            )}

            {/* Suivi des apprenants */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">👨‍👩‍👧 {t('education.student_tracking_title')}</h3>
              <p className="text-gray-700 mb-4">{t('education.student_tracking_desc')}</p>
              {userData?.numeroH && (
                <p className="text-sm text-gray-600 mb-3">{t('education.your_numeroh')} <strong className="text-blue-600">{userData.numeroH}</strong></p>
              )}
              <form onSubmit={handleLinkChildByNumeroH} className="flex flex-wrap items-end gap-3 mb-4 max-w-xl">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('education.student_numeroh_label')}</label>
                  <input type="text" value={linkChildNumeroH} onChange={(e) => setLinkChildNumeroH(e.target.value)} placeholder={t('education.student_numeroh_placeholder')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <button type="submit" disabled={linkChildLoading} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium disabled:opacity-50">
                  {linkChildLoading ? t('education.sending') : t('education.link_student_btn')}
                </button>
              </form>
              {linkChildMessage && (
                <p className={`text-sm mb-4 ${linkChildMessage.startsWith('Demande') ? 'text-green-600' : 'text-red-600'}`}>{linkChildMessage}</p>
              )}
              {childrenProgress.length === 0 ? (
                <p className="text-gray-500 italic">{t('education.no_linked_student')}</p>
              ) : (
                <div className="space-y-4">
                  {childrenProgress.map((child) => (
                    <div key={child.childNumeroH} className="bg-amber-50 rounded-lg border border-amber-200 p-4">
                      <h4 className="font-bold text-gray-900 mb-1">👤 {t('education.student_label')}</h4>
                      <p className="text-sm text-gray-500 mb-2">{child.childNumeroH}</p>
                      {child.formations.length === 0 ? (
                        <p className="text-gray-500 text-sm">{t('education.no_formation_registered')}</p>
                      ) : (
                        <ul className="space-y-2">
                          {child.formations.map((f) => (
                            <li key={f.id} className="flex flex-wrap justify-between items-center text-sm border-b border-amber-100 pb-2 gap-2">
                              <span className="font-medium">{f.formationTitle || t('education.formation_fallback')}</span>
                              <span className="text-gray-500">{f.category} • {f.level}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${f.status === 'approved' ? 'bg-green-100 text-green-800' : f.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                {f.status === 'approved' ? t('education.status_approved') : f.status === 'pending' ? t('education.status_pending') : f.status}
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
                <h3 className="text-lg font-bold text-gray-900 mb-1">{t('education.schools_professors_title')}</h3>
                <p className="text-gray-600 text-sm">{t('education.schools_professors_desc')}</p>
              </div>
              <button
                onClick={() => navigate('/ecoles')}
                className="flex-shrink-0 px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors shadow-md"
              >
                {t('education.see_schools_btn')}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'inscription-suivi' && (
          <div className="space-y-8">
            {/* Section 1: Formations Disponibles */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 border-2 border-blue-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-2xl">
                  📚
                </div>
                <h2 className="text-3xl font-bold text-gray-900">{t('education.available_formations_title')}</h2>
              </div>
            {formations.length === 0 ? (
              <p className="text-gray-500 italic text-center py-4">{t('education.no_formation_available')}</p>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {formations.map((formation) => (
                  <div key={formation.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{formation.title}</h3>
                    <p className="text-gray-600 mb-4">{formation.description}</p>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">{t('education.category_label')}</span>
                        <span className="text-sm font-medium">{formation.category}</span>
                    </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">{t('education.duration_label')}</span>
                        <span className="text-sm font-medium">{formation.duration} {t('education.duration_months')}</span>
                    </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">{t('education.level_label')}</span>
                        <span className="text-sm font-medium">{formation.level}</span>
                  </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">{t('education.price_label')}</span>
                        <span className="text-sm font-medium">{formation.price.toLocaleString()} FG</span>
                  </div>
                    </div>
                    <button
                      onClick={() => handleFormationRegistration(formation)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                    >
                      {t('education.register_btn')}
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
                  <h3 className="text-2xl font-bold text-gray-900">{t('education.my_registrations_title')}</h3>
                </div>
                <div className="space-y-4">
                  {myRegistrations.map((registration) => (
                    <div key={registration.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{registration.formationTitle}</h4>
                          <p className="text-sm text-gray-600">{t('education.registered_on')} {new Date(registration.registeredAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          registration.status === 'approved' ? 'bg-green-100 text-green-800' :
                          registration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {registration.status === 'approved' ? t('education.status_approved') :
                           registration.status === 'pending' ? t('education.status_pending') : t('education.status_rejected')}
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
                <h2 className="text-3xl font-bold text-gray-900">{t('education.available_professors_title')}</h2>
              </div>
            {professors.length === 0 ? (
              <p className="text-gray-500 italic text-center py-4">{t('education.no_professor_available')}</p>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {professors.map((professor) => (
                  <div key={professor.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{professor.name}</h3>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">{t('sante.specialties_label')}</span>
                        <span className="text-sm font-medium">{professor.specialties.join(', ')}</span>
                    </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">{t('education.experience_label')}</span>
                        <span className="text-sm font-medium">{professor.experience} {t('education.years_suffix')}</span>
                    </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">{t('education.city_label')}</span>
                        <span className="text-sm font-medium">{professor.city}</span>
                  </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">{t('education.rate_label')}</span>
                        <span className="text-sm font-medium">{professor.consultationFee.toLocaleString()} FG</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">{t('education.note_label')}</span>
                        <span className="text-sm font-medium">⭐ {professor.ratings}/5</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleProfessorRequest(professor)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                      >
                        {t('education.request_btn')}
                      </button>
                      <a href={`tel:${professor.phone}`} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors text-center">
                        {t('sante.contact_btn')}
                      </a>
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
                  <h3 className="text-2xl font-bold text-gray-900">{t('education.my_requests_title')}</h3>
                </div>
                <div className="space-y-4">
                  {myRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{request.professorName}</h4>
                          <p className="text-sm text-gray-600">{t('education.subject_colon')} {request.subject}</p>
                          <p className="text-sm text-gray-600">{t('education.requested_on')} {new Date(request.requestedAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {request.status === 'approved' ? t('education.status_approved') :
                           request.status === 'pending' ? t('education.status_pending') : t('education.status_rejected')}
                        </span>
                      </div>
                    </div>
                  ))}
                  </div>
                  </div>
            )}

          </div>
        )}

        {activeTab === 'inscription-suivi' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl shadow-lg p-6 border-2 border-indigo-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-2xl">
                  🎯
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">{t('education.tab_mes_cours')}</h2>
                  {linkedCourses.length > 0 && (
                    <p className="text-sm text-indigo-700 mt-1">
                      📚 {linkedCourses.length} {t('education.linked_courses_count')}
                    </p>
                  )}
                </div>
              </div>
              <nav className="flex space-x-4 mb-6">
                {[
                  { id: 'audio', label: t('education.tab_audio'), icon: '🎵' },
                  { id: 'video', label: t('education.tab_video'), icon: '🎥' },
                  { id: 'written', label: t('education.tab_written'), icon: '📝' },
                  { id: 'exercice', label: t('education.tab_exercice'), icon: '📝' },
                  { id: 'library', label: t('education.tab_library'), icon: '📚' },
                  { id: 'publier', label: t('education.tab_publier'), icon: '➕' },
                  { id: 'progress', label: t('education.tab_progress'), icon: '📊' },
                  { id: 'certificates', label: t('education.tab_certificates'), icon: '🏆' }
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
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('education.audio_courses_title')}</h3>
                    {linkedCourses.filter(c => c.type === 'audio').length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-bold text-indigo-600 uppercase mb-2">{t('education.from_your_professor')}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {linkedCourses.filter(c => c.type === 'audio').map((course) => (
                            <div key={course.id} className="border-2 border-indigo-300 rounded-lg p-4 bg-indigo-50">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">{t('education.prof_badge')}</span>
                                <h4 className="font-semibold text-gray-900">{course.title}</h4>
                              </div>
                              <p className="text-gray-600 text-sm mb-2">{course.description}</p>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">{t('education.duration_label')} {course.duration} {t('education.minutes_suffix')}</span>
                                <button onClick={() => setSelectedCourse(course)} className="bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-3 rounded text-sm">{t('education.listen_btn')}</button>
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
                            <span className="text-sm text-gray-500">{t('education.duration_label')} {course.duration} {t('education.minutes_suffix')}</span>
                            <button onClick={() => setSelectedCourse(course)} className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm">{t('education.listen_btn')}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeCourseTab === 'video' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('education.video_courses_title')}</h3>
                    {linkedCourses.filter(c => c.type === 'video').length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-bold text-indigo-600 uppercase mb-2">{t('education.from_your_professor')}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {linkedCourses.filter(c => c.type === 'video').map((course) => (
                            <div key={course.id} className="border-2 border-indigo-300 rounded-lg p-4 bg-indigo-50">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">{t('education.prof_badge')}</span>
                                <h4 className="font-semibold text-gray-900">{course.title}</h4>
                              </div>
                              <p className="text-gray-600 text-sm mb-2">{course.description}</p>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">{t('education.duration_label')} {course.duration} {t('education.minutes_suffix')}</span>
                                <button onClick={() => setSelectedCourse(course)} className="bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-3 rounded text-sm">{t('education.watch_btn')}</button>
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
                            <span className="text-sm text-gray-500">{t('education.duration_label')} {course.duration} {t('education.minutes_suffix')}</span>
                            <button onClick={() => setSelectedCourse(course)} className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm">{t('education.watch_btn')}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeCourseTab === 'written' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('education.written_courses_title')}</h3>
                    {linkedCourses.filter(c => c.type === 'written').length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-bold text-indigo-600 uppercase mb-2">{t('education.from_your_professor')}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {linkedCourses.filter(c => c.type === 'written').map((course) => (
                            <div key={course.id} className="border-2 border-indigo-300 rounded-lg p-4 bg-indigo-50">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">{t('education.prof_badge')}</span>
                                <h4 className="font-semibold text-gray-900">{course.title}</h4>
                              </div>
                              <p className="text-gray-600 text-sm mb-2">{course.description}</p>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">{t('education.pages_label')} {course.duration}</span>
                                <button onClick={() => setSelectedCourse(course)} className="bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-3 rounded text-sm">{t('education.read_btn')}</button>
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
                            <span className="text-sm text-gray-500">{t('education.pages_label')} {course.duration}</span>
                            <button onClick={() => setSelectedCourse(course)} className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm">{t('education.read_btn')}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeCourseTab === 'exercice' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('education.exercises_title')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {courses.filter(c => c.type === 'test').map((course) => (
                        <div key={course.id} className="border rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">{course.title}</h4>
                          <p className="text-gray-600 text-sm mb-2">{course.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">{course.category} • {course.level}</span>
                            <button onClick={() => setSelectedCourse(course)} className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm">
                              {t('education.take_test_btn')}
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">{t('education.interactive_exercises_title')}</h4>
                        <p className="text-gray-600 text-sm mb-4">{t('education.interactive_exercises_desc')}</p>
                        <button
                          onClick={() => alert('Les exercices interactifs arrivent bientôt.')}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm"
                        >
                          {t('education.ai_start_btn')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeCourseTab === 'publier' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('education.publish_title')}</h3>
                    <p className="text-gray-600 text-sm mb-6">{t('education.publish_desc')}</p>
                    <form onSubmit={handlePublishCourse} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 max-w-2xl">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('education.content_type_label')}</label>
                        <select
                          value={publishForm.type}
                          onChange={(e) => setPublishForm({ ...publishForm, type: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="written">{t('education.content_type_written')}</option>
                          <option value="video">{t('education.content_type_video')}</option>
                          <option value="audio">{t('education.content_type_audio')}</option>
                          <option value="test">{t('education.content_type_test')}</option>
                          <option value="library">{t('education.content_type_library')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('education.title_label')}</label>
                        <input
                          type="text"
                          value={publishForm.title}
                          onChange={(e) => setPublishForm({ ...publishForm, title: e.target.value })}
                          placeholder={t('education.title_placeholder')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('education.description_label')}</label>
                        <textarea
                          value={publishForm.description}
                          onChange={(e) => setPublishForm({ ...publishForm, description: e.target.value })}
                          placeholder={t('education.description_placeholder')}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('education.category_input_label')}</label>
                          <input
                            type="text"
                            value={publishForm.category}
                            onChange={(e) => setPublishForm({ ...publishForm, category: e.target.value })}
                            placeholder={t('education.category_placeholder')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('education.level_input_label')}</label>
                          <select
                            value={publishForm.level}
                            onChange={(e) => setPublishForm({ ...publishForm, level: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="débutant">{t('education.level_beginner')}</option>
                            <option value="intermédiaire">{t('education.level_intermediate')}</option>
                            <option value="avancé">{t('education.level_advanced')}</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('education.duration_minutes_label')}</label>
                        <input
                          type="number"
                          min="1"
                          value={publishForm.duration}
                          onChange={(e) => setPublishForm({ ...publishForm, duration: e.target.value })}
                          placeholder={t('education.duration_placeholder')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      {(publishForm.type === 'video' || publishForm.type === 'audio') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {publishForm.type === 'video' ? t('education.video_file_label') : t('education.audio_file_label')} *
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
                            {publishForm.type === 'test' ? t('education.test_content_label') : t('education.course_content_label')}
                          </label>
                          <textarea
                            value={publishForm.content}
                            onChange={(e) => setPublishForm({ ...publishForm, content: e.target.value })}
                            placeholder={publishForm.type === 'test' ? t('education.test_content_placeholder') : t('education.course_content_placeholder')}
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                      {publishForm.type === 'library' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('education.library_file_label')}</label>
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
                            {t('education.assign_students_label')}
                          </label>
                          <p className="text-xs text-gray-500 mb-2">{t('education.assign_students_desc')}</p>
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
                            <p className="text-xs text-gray-400 mt-1">{t('education.none_selected_note')}</p>
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
                        {publishLoading ? t('education.publishing') : t('education.publish_btn')}
                      </button>
                    </form>
                  </div>
                )}

                {activeCourseTab === 'library' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('education.library_title')}</h3>
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
                          <button onClick={() => setSelectedCourse(course)} className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm">
                            {t('education.consult_btn')}
                          </button>
                  </div>
                      ))}
                  </div>
                </div>
                )}
            
                {activeCourseTab === 'progress' && (
            <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('education.my_progress_title')}</h3>
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
                            <span>{t('education.time_spent')} {progress.totalTimeSpent} {t('education.minutes_suffix')}</span>
                            <span>{t('education.last_time')} {new Date(progress.lastAccessed).toLocaleDateString()}</span>
                </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeCourseTab === 'certificates' && (
                    <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('education.my_certificates_title')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myCertificates.map((certificate) => (
                        <div key={certificate.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-900">{certificate.courseTitle}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              certificate.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {certificate.isValid ? t('education.valid') : t('education.expired')}
                            </span>
                    </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {t('education.issued_on')} {new Date(certificate.issuedAt).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600 mb-3">
                            {t('education.issued_by')} {certificate.issuedBy}
                          </p>
                          <a
                            href={certificate.badgeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="block text-center w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm"
                          >
                            {t('education.download_btn')}
                          </a>
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

      {/* Modal de consultation d'un cours */}
      {selectedCourse && (() => {
        const c = selectedCourse.content;
        const mediaUrl = typeof c === 'string' ? c : c?.mediaUrl;
        const text = typeof c === 'string' ? undefined : c?.text;
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">{selectedCourse.title}</h3>
                <button onClick={() => setSelectedCourse(null)} className="text-gray-500 hover:text-gray-700 text-2xl">
                  x
                </button>
              </div>
              {selectedCourse.instructor && <p className="text-sm text-gray-500 mb-4">{t('education.by_instructor')} {selectedCourse.instructor}</p>}
              {selectedCourse.type === 'audio' && mediaUrl && (
                <audio controls className="w-full mb-4"><source src={mediaUrl} /></audio>
              )}
              {selectedCourse.type === 'video' && mediaUrl && (
                <video controls className="w-full rounded-lg mb-4"><source src={mediaUrl} /></video>
              )}
              {(selectedCourse.type === 'written' || selectedCourse.type === 'library' || selectedCourse.type === 'test') && text && (
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed mb-4">{text}</div>
              )}
              {!mediaUrl && !text && (
                <p className="text-center text-gray-500 py-8">{t('education.content_not_available')}</p>
              )}
              <button
                onClick={() => setSelectedCourse(null)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
              >
                {t('btn.close')}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Modal d'inscription à une formation */}
        {showRegistrationForm && selectedFormation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {t('education.register_for')} {selectedFormation.title}
              </h3>
              <div className="space-y-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('education.numeroh_connected_label')}
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
                  {t('education.motivation_label')}
                </label>
                  <textarea
                  value={registrationForm.motivation}
                  onChange={(e) => setRegistrationForm({...registrationForm, motivation: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  placeholder={t('education.motivation_placeholder')}
                  />
                </div>
              </div>
            <div className="flex space-x-3 mt-6">
                <button
                onClick={() => setShowRegistrationForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                >
                {t('btn.cancel')}
                </button>
                <button
                onClick={submitFormationRegistration}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                {t('education.send_request_btn')}
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
              {t('education.request_from')} {selectedProfessor.name}
              </h3>
              <div className="space-y-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('education.numeroh_connected_label')}
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
                  {t('education.subject_input_label')}
                </label>
                <input
                  type="text"
                  value={professorRequestForm.subject}
                  onChange={(e) => setProfessorRequestForm({...professorRequestForm, subject: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('education.subject_placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('education.message_label')}
                </label>
                  <textarea
                  value={professorRequestForm.message}
                  onChange={(e) => setProfessorRequestForm({...professorRequestForm, message: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder={t('education.message_placeholder')}
                  />
                </div>
              </div>
            <div className="flex space-x-3 mt-6">
                <button
                onClick={() => setShowProfessorRequestForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                >
                {t('btn.cancel')}
                </button>
                <button
                onClick={submitProfessorRequest}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                {t('education.send_request_btn')}
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
    </div>
  );
}