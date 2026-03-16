import { useState, useEffect } from 'react';
import { config } from '../config/api';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  [key: string]: any;
}

interface Game {
  id: number;
  status: 'waiting' | 'active' | 'paused' | 'finished';
  currentPlayerTurn: string;
  currentCycle: number;
  depositAmount: number;
  juryNumeroH: string | null;
  createdBy: string;
  players?: GamePlayer[];
  deposit?: GameDeposit;
  questions?: GameQuestion[];
}

interface GamePlayer {
  id: number;
  numeroH: string;
  role: 'player1' | 'player2' | 'guest';
  balance: number;
  debtCount: number;
  isActive: boolean;
  player?: {
    numeroH: string;
    prenom: string;
    nomFamille: string;
    photo?: string;
  };
}

interface GameDeposit {
  id: number;
  initialAmount: number;
  currentAmount: number;
  totalGainsPaid: number;
  totalPenaltiesReceived: number;
  lastRechargeBy?: string;
  lastRechargeDate?: string;
}

interface GameQuestion {
  id: number;
  askedBy: string;
  questionType: 'text' | 'audio' | 'video';
  questionContent: string;
  questionMediaUrl?: string;
  cycleNumber: number;
  status: 'pending' | 'answered' | 'validated' | 'closed';
  answers?: GameAnswer[];
}

interface GameAnswer {
  id: number;
  playerId: number;
  numeroH: string;
  answerContent?: string;
  answerType?: 'text' | 'audio' | 'video';
  answerMediaUrl?: string;
  isVoluntaryRefusal: boolean;
  status: 'pending' | 'validated_correct' | 'validated_wrong' | 'refused';
  pointsEarned: number;
  answerer?: {
    numeroH: string;
    prenom: string;
    nomFamille: string;
  };
}

interface GameTransaction {
  id: number;
  transactionType: 'gain' | 'penalty' | 'deposit_recharge' | 'deposit_payment' | 'voluntary_refusal';
  amount: number;
  playerBalanceBefore: number;
  playerBalanceAfter: number;
  description: string;
  createdAt: string;
  player?: {
    player: {
      numeroH: string;
      prenom: string;
      nomFamille: string;
    };
  };
}

interface DefiEducatifContentProps {
  userData: UserData | null;
}

export default function DefiEducatifContent({ userData }: DefiEducatifContentProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [currentView, setCurrentView] = useState<'menu' | 'player' | 'jury'>('menu');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<GameTransaction[]>([]);
  const [newQuestion, setNewQuestion] = useState({ content: '', type: 'text' as 'text' | 'audio' | 'video' });
  const [newAnswer, setNewAnswer] = useState({ content: '', type: 'text' as 'text' | 'audio' | 'video' });
  const [juryNumeroH, setJuryNumeroH] = useState('');
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [gameIdInput, setGameIdInput] = useState('');
  const [questionMode, setQuestionMode] = useState<'text' | 'audio' | 'video'>('text');
  const [responseMode, setResponseMode] = useState<'text' | 'audio' | 'video'>('text');
  const [transactionLog, setTransactionLog] = useState<Array<{sender: string, message: string, time: string}>>([]);
  const [guestNumeroH, setGuestNumeroH] = useState('');
  const [selectedReceiver, setSelectedReceiver] = useState<string>('');
  
  // États pour l'enregistrement audio/vidéo
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string>('');
  const [recordingType, setRecordingType] = useState<'question' | 'response' | null>(null);
  
  // Récupérer userData si non fourni
  useEffect(() => {
    if (!userData) {
      const session = localStorage.getItem('session_user');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          const user = parsed.userData || parsed;
          if (user && user.numeroH) {
            // Le composant recevra userData via props, sinon on l'utilise depuis session
          }
        } catch (e) {
          // Ignorer
        }
      }
    }
  }, [userData]);

  // Récupérer le token
  const getToken = () => {
    return localStorage.getItem('token') || '';
  };

  // Charger un jeu
  const loadGame = async (gameId: number) => {
    try {
      const session = localStorage.getItem('session_user');
      const parsed = session ? JSON.parse(session) : {};
      const userNumeroH = parsed.numeroH || parsed.userData?.numeroH;
      const token = getToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (userNumeroH) headers['X-Admin-Numero-H'] = userNumeroH;

      const response = await fetch(`${API_BASE_URL}/defi-educatif/games/${gameId}`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setGame(data.game || data);
        
        // Charger les transactions
        const txResponse = await fetch(`${API_BASE_URL}/defi-educatif/games/${gameId}/transactions`, {
          headers
        });
        if (txResponse.ok) {
          const txData = await txResponse.json();
          setTransactions(txData.transactions || []);
        }
      }
    } catch (error) {
      // Erreur silencieuse
    }
  };

  // Créer un nouveau jeu (avec mode simulation si backend inaccessible)
  const createGame = async () => {
    try {
      setLoading(true);
      
      // Pour l'admin principal G0C0P0R0E0F0 0, utiliser directement ce numéro
      let userNumeroH = 'G0C0P0R0E0F0 0';
      
      const session = localStorage.getItem('session_user');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          userNumeroH = parsed.numeroH || parsed.userData?.numeroH || 'G0C0P0R0E0F0 0';
        } catch (e) {
          // Utiliser la valeur par défaut
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Admin-Numero-H': userNumeroH
      };
      
      const token = getToken();
      if (token && token.trim() !== '') {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Essayer de créer le jeu via l'API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(`${API_BASE_URL}/defi-educatif/games`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ juryNumeroH: null }),
          mode: 'cors',
          credentials: 'omit',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const gameData = data.game || data;
          
          if (gameData && gameData.id) {
            setGame(gameData);
            setCurrentView('player');
            setLoading(false);
            addLog('system', `Bienvenue au jeu de partage ! Total initial de 50 000 points. ${userNumeroH} doit poser une question.`);
            return;
          }
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        // Si le backend n'est pas accessible, créer un jeu en mode simulation
        console.log('Mode simulation activé - backend non accessible');
      }

      // MODE SIMULATION - Créer un jeu localement sans backend
      const simulatedGame: Game = {
        id: Date.now(), // ID temporaire
        status: 'waiting',
        currentPlayerTurn: userNumeroH,
        currentCycle: 1,
        depositAmount: 50000.00,
        juryNumeroH: null,
        createdBy: userNumeroH,
        players: [{
          id: 1,
          numeroH: userNumeroH,
          role: 'player1',
          balance: 0.00,
          debtCount: 0,
          isActive: true
        }],
        deposit: {
          id: 1,
          gameId: Date.now(),
          initialAmount: 50000.00,
          currentAmount: 50000.00,
          totalGainsPaid: 0.00,
          totalPenaltiesReceived: 0.00
        },
        questions: []
      };

      setGame(simulatedGame);
      setCurrentView('player');
      addLog('system', `Bienvenue au jeu de partage ! Total initial de 50 000 points. ${userNumeroH} doit poser une question.`);
      
    } catch (error: any) {
      // En cas d'erreur totale, créer quand même un jeu en simulation
      const userNumeroH = 'G0C0P0R0E0F0 0';
      const simulatedGame: Game = {
        id: Date.now(),
        status: 'waiting',
        currentPlayerTurn: userNumeroH,
        currentCycle: 1,
        depositAmount: 50000.00,
        juryNumeroH: null,
        createdBy: userNumeroH,
        players: [{
          id: 1,
          numeroH: userNumeroH,
          role: 'player1',
          balance: 0.00,
          debtCount: 0,
          isActive: true
        }],
        deposit: {
          id: 1,
          gameId: Date.now(),
          initialAmount: 50000.00,
          currentAmount: 50000.00,
          totalGainsPaid: 0.00,
          totalPenaltiesReceived: 0.00
        },
        questions: []
      };
      setGame(simulatedGame);
      setCurrentView('player');
      addLog('system', `Bienvenue au jeu de partage ! Total initial de 50 000 points. ${userNumeroH} doit poser une question.`);
    } finally {
      setLoading(false);
    }
  };

  // Ajouter un log
  const addLog = (sender: string, message: string) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    setTransactionLog(prev => [{ sender, message, time: timeString }, ...prev]);
  };

  // Ajouter un invité/joueur
  const addGuest = async () => {
    if (!game || !guestNumeroH.trim()) return;
    try {
      setLoading(true);
      const session = localStorage.getItem('session_user');
      const parsed = session ? JSON.parse(session) : {};
      const userNumeroH = parsed.numeroH || parsed.userData?.numeroH;
      const token = getToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (userNumeroH) headers['X-Admin-Numero-H'] = userNumeroH;

      // Simuler l'ajout d'un invité (en mode simulation, on l'ajoute localement)
      if (game.id && game.id > 1000000000) {
        // Mode simulation - ajouter localement
        const newPlayer: GamePlayer = {
          id: Date.now(),
          numeroH: guestNumeroH.trim(),
          role: 'guest',
          balance: 0.00,
          debtCount: 0,
          isActive: true
        };
        
        setGame({
          ...game,
          players: [...(game.players || []), newPlayer]
        });
        
        addLog('system', `Un invité a rejoint le jeu : ${guestNumeroH.trim()}`);
        setGuestNumeroH('');
      } else {
        // Mode API - utiliser l'endpoint join
        const response = await fetch(`${API_BASE_URL}/defi-educatif/games/${game.id}/join`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ numeroH: guestNumeroH.trim() })
        });

        if (response.ok) {
          await loadGame(game.id);
          addLog('system', `Un invité a rejoint le jeu : ${guestNumeroH.trim()}`);
          setGuestNumeroH('');
        }
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setLoading(false);
    }
  };

  // Rejoindre un jeu
  const joinGame = async (gameId: number) => {
    try {
      setLoading(true);
      const session = localStorage.getItem('session_user');
      const parsed = session ? JSON.parse(session) : {};
      const userNumeroH = parsed.numeroH || parsed.userData?.numeroH;
      const token = getToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (userNumeroH) headers['X-Admin-Numero-H'] = userNumeroH;

      const response = await fetch(`${API_BASE_URL}/defi-educatif/games/${gameId}/join`, {
        method: 'POST',
        headers
      });

      if (response.ok) {
        await loadGame(gameId);
        setCurrentView('player');
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setLoading(false);
    }
  };

  // Démarrer le jeu
  const startGame = async () => {
    if (!game) return;
    try {
      setLoading(true);
      const session = localStorage.getItem('session_user');
      const parsed = session ? JSON.parse(session) : {};
      const userNumeroH = parsed.numeroH || parsed.userData?.numeroH;
      const token = getToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (userNumeroH) headers['X-Admin-Numero-H'] = userNumeroH;

      const response = await fetch(`${API_BASE_URL}/defi-educatif/games/${game.id}/start`, {
        method: 'POST',
        headers
      });

      if (response.ok) {
        await loadGame(game.id);
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setLoading(false);
    }
  };

  // Démarrer l'enregistrement audio/vidéo
  const startRecording = async (type: 'audio' | 'video', context: 'question' | 'response') => {
    try {
      const constraints = type === 'audio' 
        ? { audio: true } 
        : { audio: true, video: true };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setRecordingStream(stream);
      setRecordingType(context);
      
      const recorder = new MediaRecorder(stream, {
        mimeType: type === 'audio' ? 'audio/webm' : 'video/webm'
      });
      
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: type === 'audio' ? 'audio/webm' : 'video/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        
        // Arrêter tous les tracks
        stream.getTracks().forEach(track => track.stop());
        setRecordingStream(null);
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      addLog('system', `Enregistrement ${type === 'audio' ? 'audio' : 'vidéo'} démarré`);
    } catch (error: any) {
      addLog('system', `Erreur: ${error.message || 'Impossible d\'accéder au microphone/caméra'}`);
    }
  };

  // Arrêter l'enregistrement
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
      addLog('system', 'Enregistrement terminé');
    }
  };

  // Upload un fichier média
  const uploadMedia = async (blob: Blob, type: 'audio' | 'video'): Promise<string | null> => {
    try {
      const formData = new FormData();
      const file = new File([blob], `recording.${type === 'audio' ? 'webm' : 'webm'}`, {
        type: blob.type
      });
      formData.append('media', file);
      formData.append('type', type);

      const session = localStorage.getItem('session_user');
      const parsed = session ? JSON.parse(session) : {};
      const userNumeroH = parsed.numeroH || parsed.userData?.numeroH;
      const token = getToken();

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (userNumeroH) headers['X-Admin-Numero-H'] = userNumeroH;

      const response = await fetch(`${API_BASE_URL}/defi-educatif/upload-media`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        return data.url || data.mediaUrl || null;
      }
    } catch (error) {
      console.error('Erreur upload média:', error);
    }
    return null;
  };

  // Poser une question
  const askQuestion = async () => {
    if (!game) return;
    
    // Vérifier qu'on a du contenu
    if (questionMode === 'text' && !newQuestion.content.trim()) return;
    if ((questionMode === 'audio' || questionMode === 'video') && !recordedBlob) return;
    
    try {
      setLoading(true);
      const session = localStorage.getItem('session_user');
      const parsed = session ? JSON.parse(session) : {};
      const userNumeroH = parsed.numeroH || parsed.userData?.numeroH;
      const token = getToken();

      let questionContent = newQuestion.content;
      let questionMediaUrl = null;

      // Si c'est audio ou vidéo, uploader le fichier
      if ((questionMode === 'audio' || questionMode === 'video') && recordedBlob) {
        const mediaUrl = await uploadMedia(recordedBlob, questionMode);
        if (mediaUrl) {
          questionMediaUrl = mediaUrl;
          questionContent = questionMode === 'audio' ? 'Question audio' : 'Question vidéo';
        } else {
          addLog('system', 'Erreur lors de l\'upload du média');
          return;
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (userNumeroH) headers['X-Admin-Numero-H'] = userNumeroH;

      const response = await fetch(`${API_BASE_URL}/defi-educatif/games/${game.id}/questions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          questionContent,
          questionType: questionMode,
          questionMediaUrl
        })
      });

      if (response.ok) {
        await loadGame(game.id);
        setNewQuestion({ content: '', type: 'text' });
        setQuestionMode('text');
        setRecordedBlob(null);
        setRecordedUrl('');
        addLog(userNumeroH || 'Joueur', 'A posé une question');
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setLoading(false);
    }
  };

  // Répondre à une question
  const submitAnswer = async (questionId: number, isRefusal = false) => {
    if (!game) return;
    
    // Vérifier qu'on a du contenu
    if (!isRefusal) {
      if (responseMode === 'text' && !newAnswer.content.trim()) return;
      if ((responseMode === 'audio' || responseMode === 'video') && !recordedBlob) return;
    }
    
    try {
      setLoading(true);
      const session = localStorage.getItem('session_user');
      const parsed = session ? JSON.parse(session) : {};
      const userNumeroH = parsed.numeroH || parsed.userData?.numeroH;
      const token = getToken();

      let answerContent = newAnswer.content;
      let answerMediaUrl = null;

      // Si c'est audio ou vidéo, uploader le fichier
      if (!isRefusal && (responseMode === 'audio' || responseMode === 'video') && recordedBlob) {
        const mediaUrl = await uploadMedia(recordedBlob, responseMode);
        if (mediaUrl) {
          answerMediaUrl = mediaUrl;
          answerContent = responseMode === 'audio' ? 'Réponse audio' : 'Réponse vidéo';
        } else {
          addLog('system', 'Erreur lors de l\'upload du média');
          return;
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (userNumeroH) headers['X-Admin-Numero-H'] = userNumeroH;

      const response = await fetch(`${API_BASE_URL}/defi-educatif/games/${game.id}/answers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          questionId,
          answerContent: isRefusal ? null : answerContent,
          answerType: isRefusal ? null : responseMode,
          answerMediaUrl: isRefusal ? null : answerMediaUrl,
          isVoluntaryRefusal: isRefusal
        })
      });

      if (response.ok) {
        await loadGame(game.id);
        setNewAnswer({ content: '', type: 'text' });
        setResponseMode('text');
        setRecordedBlob(null);
        setRecordedUrl('');
        addLog(userNumeroH || 'Joueur', isRefusal ? 'A refusé de répondre' : 'A répondu à la question');
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setLoading(false);
    }
  };

  // Valider une réponse (jury)
  const validateAnswer = async (answerId: number, validation: 'correct' | 'wrong' | 'refuse') => {
    if (!game) return;
    try {
      setLoading(true);
      const session = localStorage.getItem('session_user');
      const parsed = session ? JSON.parse(session) : {};
      const userNumeroH = parsed.numeroH || parsed.userData?.numeroH;
      const token = getToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (userNumeroH) headers['X-Admin-Numero-H'] = userNumeroH;

      const response = await fetch(`${API_BASE_URL}/defi-educatif/games/${game.id}/validate-answer`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          answerId,
          validation
        })
      });

      if (response.ok) {
        await loadGame(game.id);
        const messages = {
          correct: 'Bonne réponse !',
          wrong: 'Mauvaise réponse !',
          refuse: 'Réponse refusée !'
        };
        addLog('system', messages[validation]);
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setLoading(false);
    }
  };

  // Recharger les points
  const rechargeDeposit = async () => {
    if (!game || !rechargeAmount) return;
    try {
      setLoading(true);
      const session = localStorage.getItem('session_user');
      const parsed = session ? JSON.parse(session) : {};
      const userNumeroH = parsed.numeroH || parsed.userData?.numeroH;
      const token = getToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (userNumeroH) headers['X-Admin-Numero-H'] = userNumeroH;

      const response = await fetch(`${API_BASE_URL}/defi-educatif/games/${game.id}/recharge-points`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: parseFloat(rechargeAmount)
        })
      });

      if (response.ok) {
        await loadGame(game.id);
        setRechargeAmount('');
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setLoading(false);
    }
  };

  // Obtenir le joueur actuel
  const getCurrentPlayer = () => {
    if (!game || !userData) return null;
    return game.players?.find(p => p.numeroH === userData.numeroH);
  };

  // Obtenir tous les joueurs
  const getAllPlayers = () => {
    if (!game) return [];
    return game.players || [];
  };

  // Obtenir la question en cours
  const getCurrentQuestion = () => {
    if (!game) return null;
    return game.questions?.find(q => q.status === 'pending' || q.status === 'answered');
  };

  // Obtenir les réponses en attente de validation
  const getPendingAnswers = () => {
    const question = getCurrentQuestion();
    if (!question) return [];
    return question.answers?.filter(a => a.status === 'pending') || [];
  };

  // Vérifier si c'est le tour du joueur
  const isMyTurn = () => {
    if (!game || !userData) return false;
    return game.currentPlayerTurn === userData.numeroH;
  };

  // Vérifier si l'utilisateur est le jury
  const isJury = () => {
    if (!game || !userData) return false;
    return game.juryNumeroH === userData.numeroH;
  };

  // Vérifier si le joueur a déjà répondu à la question
  const hasAnswered = (questionId: number) => {
    const player = getCurrentPlayer();
    if (!player || !game) return false;
    const question = game.questions?.find(q => q.id === questionId);
    return question?.answers?.some(a => a.playerId === player.id) || false;
  };

  // Rafraîchir automatiquement le jeu si actif
  useEffect(() => {
    if (game && (game.status === 'active' || game.status === 'waiting')) {
      const interval = setInterval(() => {
        if (game.id) loadGame(game.id);
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [game?.id, game?.status]);

  // Vue Menu
  if (currentView === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-yellow-400 mb-2">
                <i className="fas fa-coins mr-2"></i> Défi Éducatif
              </h1>
              <p className="text-white/80 text-lg">
                Partagez les 50 000 points selon vos performances éducatives
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-sm text-white/70 mb-4">
                  {userData ? `Connecté: ${userData.numeroH}` : 'Non connecté'}
                </p>
                <button
                  onClick={createGame}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg text-lg font-semibold transition-all transform hover:scale-105"
                >
                  {loading ? '⏳ Création en cours...' : '📚 Lancer un défi maintenant'}
                </button>
                <button
                  onClick={() => {
                    const id = prompt('Entrez l\'ID du jeu à rejoindre:');
                    if (id) joinGame(parseInt(id));
                  }}
                  disabled={loading}
                  className="w-full mt-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Rejoindre un défi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vue Joueur - Interface réorganisée selon l'exemple
  if (currentView === 'player' && game) {
    const player = getCurrentPlayer();
    const currentQuestion = getCurrentQuestion();
    const allPlayers = getAllPlayers();
    const depositAmount = game.deposit?.currentAmount || game.depositAmount || 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <header className="text-center bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h1 className="text-3xl font-bold text-yellow-400 mb-2">
              <i className="fas fa-coins mr-2"></i> Défi Éducatif
            </h1>
            <p className="text-white/80">
              {allPlayers.map(p => p.numeroH).join(', ')} - Partagez les 50 000 points selon vos performances éducatives
            </p>
          </header>

          {/* Comptes des joueurs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {allPlayers.map((p) => (
              <div key={p.id} className={`bg-gradient-to-br ${p.numeroH === userData?.numeroH ? 'from-green-500/20 to-emerald-500/20' : 'from-blue-500/20 to-indigo-500/20'} rounded-xl p-4 border border-white/20 backdrop-blur-lg`}>
                <div className="flex items-center gap-2 mb-2">
                  <i className={`fas ${p.role === 'player1' ? 'fa-crown' : p.role === 'player2' ? 'fa-bullseye' : 'fa-user'} text-white`}></i>
                  <span className="text-white font-semibold">{p.numeroH}</span>
                </div>
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {p.balance.toLocaleString()} pts
                </div>
                <div className="text-sm text-white/70">Points: {p.balance.toLocaleString()} pts</div>
              </div>
            ))}
            
            {/* Total de points */}
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-white/20 backdrop-blur-lg">
              <div className="flex items-center gap-2 mb-2">
                <i className="fas fa-star text-white"></i>
                <span className="text-white font-semibold">Total de points</span>
              </div>
              <div className="text-2xl font-bold text-yellow-400 mb-1">
                {depositAmount.toLocaleString()} pts
              </div>
              <div className="text-sm text-white/70">Total: {depositAmount.toLocaleString()} pts</div>
            </div>
          </div>

          {/* Section Ajouter un invité */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <i className="fas fa-user-plus text-2xl text-purple-400"></i>
              <h2 className="text-xl font-bold text-white">Ajouter un invité</h2>
            </div>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="NumeroH de l'invité"
                value={guestNumeroH}
                onChange={(e) => setGuestNumeroH(e.target.value)}
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50"
              />
              <button
                onClick={addGuest}
                disabled={loading || !guestNumeroH.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold transition-all"
              >
                <i className="fas fa-plus mr-2"></i> Ajouter invité
              </button>
            </div>
            <p className="text-white/70 text-sm">Les invités peuvent participer aux questions et gagner des points !</p>
            
            {/* Liste des invités */}
            {allPlayers.filter(p => p.role === 'guest').length > 0 && (
              <div className="mt-4 space-y-2">
                <h3 className="text-white font-semibold mb-2">Invités actifs:</h3>
                <div className="flex flex-wrap gap-2">
                  {allPlayers.filter(p => p.role === 'guest').map((guest) => (
                    <div key={guest.id} className="bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                      <i className="fas fa-user text-white/70 mr-2"></i>
                      <span className="text-white">{guest.numeroH}</span>
                      <span className="text-green-400 ml-2">{guest.balance.toLocaleString()} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Panneau de question */}
          {isMyTurn() && !currentQuestion && (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-4">
                <i className="fas fa-user-circle text-2xl text-white"></i>
                <h2 className="text-xl font-bold text-yellow-400">{userData?.numeroH} - Pose la question</h2>
              </div>
              
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setQuestionMode('text')}
                  className={`px-4 py-2 rounded-lg ${questionMode === 'text' ? 'bg-white text-gray-900' : 'bg-white/10 text-white'}`}
                >
                  Texte
                </button>
                <button
                  onClick={() => setQuestionMode('audio')}
                  className={`px-4 py-2 rounded-lg ${questionMode === 'audio' ? 'bg-white text-gray-900' : 'bg-white/10 text-white'}`}
                >
                  Audio
                </button>
                <button
                  onClick={() => setQuestionMode('video')}
                  className={`px-4 py-2 rounded-lg ${questionMode === 'video' ? 'bg-white text-gray-900' : 'bg-white/10 text-white'}`}
                >
                  Vidéo
                </button>
              </div>

              {questionMode === 'text' && (
                <textarea
                  placeholder="Écris ta question ici..."
                  value={newQuestion.content}
                  onChange={(e) => setNewQuestion({ ...newQuestion, content: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-white/50 mb-4"
                  rows={4}
                />
              )}

              {questionMode === 'audio' && (
                <div className="space-y-4 mb-4">
                  {!isRecording && !recordedBlob && (
                    <button
                      onClick={() => startRecording('audio', 'question')}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white py-3 rounded-lg font-semibold transition-all"
                    >
                      <i className="fas fa-microphone mr-2"></i> Enregistrer une question audio
                    </button>
                  )}
                  
                  {isRecording && recordingType === 'question' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-red-400">
                        <span className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></span>
                        Enregistrement en cours...
                      </div>
                      <button
                        onClick={stopRecording}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg"
                      >
                        <i className="fas fa-stop mr-2"></i> Arrêter l'enregistrement
                      </button>
                    </div>
                  )}

                  {recordedBlob && recordingType === 'question' && recordedUrl && (
                    <div className="space-y-2">
                      <audio src={recordedUrl} controls className="w-full"></audio>
                      <button
                        onClick={() => {
                          setRecordedBlob(null);
                          setRecordedUrl('');
                        }}
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg"
                      >
                        <i className="fas fa-redo mr-2"></i> Réenregistrer
                      </button>
                    </div>
                  )}
                </div>
              )}

              {questionMode === 'video' && (
                <div className="space-y-4 mb-4">
                  {!isRecording && !recordedBlob && (
                    <button
                      onClick={() => startRecording('video', 'question')}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-lg font-semibold transition-all"
                    >
                      <i className="fas fa-video mr-2"></i> Enregistrer une question vidéo
                    </button>
                  )}
                  
                  {isRecording && recordingType === 'question' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-red-400">
                        <span className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></span>
                        Enregistrement en cours...
                      </div>
                      <button
                        onClick={stopRecording}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg"
                      >
                        <i className="fas fa-stop mr-2"></i> Arrêter l'enregistrement
                      </button>
                    </div>
                  )}

                  {recordedBlob && recordingType === 'question' && recordedUrl && (
                    <div className="space-y-2">
                      <video src={recordedUrl} controls className="w-full rounded-lg"></video>
                      <button
                        onClick={() => {
                          setRecordedBlob(null);
                          setRecordedUrl('');
                        }}
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg"
                      >
                        <i className="fas fa-redo mr-2"></i> Réenregistrer
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Sélecteur de destinataire */}
              {allPlayers.filter(p => p.numeroH !== userData?.numeroH).length > 0 && (
                <div className="mb-4">
                  <label className="text-white mb-2 block">Destinataire :</label>
                  <select
                    value={selectedReceiver}
                    onChange={(e) => setSelectedReceiver(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="">Sélectionner un destinataire</option>
                    {allPlayers.filter(p => p.numeroH !== userData?.numeroH).map((p) => (
                      <option key={p.id} value={p.numeroH} className="bg-gray-800">
                        {p.numeroH}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={askQuestion}
                disabled={loading || 
                  (questionMode === 'text' && !newQuestion.content.trim()) ||
                  ((questionMode === 'audio' || questionMode === 'video') && !recordedBlob) ||
                  (allPlayers.filter(p => p.numeroH !== userData?.numeroH).length > 0 && !selectedReceiver)}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition-all"
              >
                <i className="fas fa-paper-plane mr-2"></i> Envoyer la question
              </button>
            </div>
          )}

          {/* Panneau de réponse */}
          {currentQuestion && !hasAnswered(currentQuestion.id) && (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-4">
                <i className="fas fa-user-circle text-2xl text-white"></i>
                <h2 className="text-xl font-bold text-white">Répondant</h2>
              </div>

              <div className="bg-white/5 rounded-lg p-4 mb-4">
                <strong className="text-white">Question en cours :</strong>
                <div className="text-white/80 mt-2">
                  {currentQuestion.questionType === 'text' && currentQuestion.questionContent}
                  {currentQuestion.questionType === 'audio' && currentQuestion.questionMediaUrl && (
                    <div>
                      <p className="mb-2">Question audio</p>
                      <audio src={currentQuestion.questionMediaUrl.startsWith('http') ? currentQuestion.questionMediaUrl : `http://localhost:5002${currentQuestion.questionMediaUrl.startsWith('/') ? currentQuestion.questionMediaUrl : '/' + currentQuestion.questionMediaUrl}`} controls className="w-full"></audio>
                    </div>
                  )}
                  {currentQuestion.questionType === 'video' && currentQuestion.questionMediaUrl && (
                    <div>
                      <p className="mb-2">Question vidéo</p>
                      <video src={currentQuestion.questionMediaUrl.startsWith('http') ? currentQuestion.questionMediaUrl : `http://localhost:5002${currentQuestion.questionMediaUrl.startsWith('/') ? currentQuestion.questionMediaUrl : '/' + currentQuestion.questionMediaUrl}`} controls className="w-full rounded-lg"></video>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setResponseMode('text')}
                  className={`px-4 py-2 rounded-lg ${responseMode === 'text' ? 'bg-white text-gray-900' : 'bg-white/10 text-white'}`}
                >
                  Texte
                </button>
                <button
                  onClick={() => setResponseMode('audio')}
                  className={`px-4 py-2 rounded-lg ${responseMode === 'audio' ? 'bg-white text-gray-900' : 'bg-white/10 text-white'}`}
                >
                  Audio
                </button>
                <button
                  onClick={() => setResponseMode('video')}
                  className={`px-4 py-2 rounded-lg ${responseMode === 'video' ? 'bg-white text-gray-900' : 'bg-white/10 text-white'}`}
                >
                  Vidéo
                </button>
              </div>

              {responseMode === 'text' && (
                <textarea
                  placeholder="Écris ta réponse ici..."
                  value={newAnswer.content}
                  onChange={(e) => setNewAnswer({ ...newAnswer, content: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-white/50 mb-4"
                  rows={4}
                />
              )}

              {responseMode === 'audio' && (
                <div className="space-y-4 mb-4">
                  {!isRecording && !recordedBlob && (
                    <button
                      onClick={() => startRecording('audio', 'response')}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white py-3 rounded-lg font-semibold transition-all"
                    >
                      <i className="fas fa-microphone mr-2"></i> Enregistrer une réponse audio
                    </button>
                  )}
                  
                  {isRecording && recordingType === 'response' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-red-400">
                        <span className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></span>
                        Enregistrement en cours...
                      </div>
                      <button
                        onClick={stopRecording}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg"
                      >
                        <i className="fas fa-stop mr-2"></i> Arrêter l'enregistrement
                      </button>
                    </div>
                  )}

                  {recordedBlob && recordingType === 'response' && recordedUrl && (
                    <div className="space-y-2">
                      <audio src={recordedUrl} controls className="w-full"></audio>
                      <button
                        onClick={() => {
                          setRecordedBlob(null);
                          setRecordedUrl('');
                        }}
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg"
                      >
                        <i className="fas fa-redo mr-2"></i> Réenregistrer
                      </button>
                    </div>
                  )}
                </div>
              )}

              {responseMode === 'video' && (
                <div className="space-y-4 mb-4">
                  {!isRecording && !recordedBlob && (
                    <button
                      onClick={() => startRecording('video', 'response')}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-lg font-semibold transition-all"
                    >
                      <i className="fas fa-video mr-2"></i> Enregistrer une réponse vidéo
                    </button>
                  )}
                  
                  {isRecording && recordingType === 'response' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-red-400">
                        <span className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></span>
                        Enregistrement en cours...
                      </div>
                      <button
                        onClick={stopRecording}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg"
                      >
                        <i className="fas fa-stop mr-2"></i> Arrêter l'enregistrement
                      </button>
                    </div>
                  )}

                  {recordedBlob && recordingType === 'response' && recordedUrl && (
                    <div className="space-y-2">
                      <video src={recordedUrl} controls className="w-full rounded-lg"></video>
                      <button
                        onClick={() => {
                          setRecordedBlob(null);
                          setRecordedUrl('');
                        }}
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg"
                      >
                        <i className="fas fa-redo mr-2"></i> Réenregistrer
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => submitAnswer(currentQuestion.id, false)}
                  disabled={loading || 
                    (responseMode === 'text' && !newAnswer.content.trim()) ||
                    ((responseMode === 'audio' || responseMode === 'video') && !recordedBlob)}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition-all"
                >
                  <i className="fas fa-share mr-2"></i> Envoyer la réponse
                </button>
                <button
                  onClick={() => submitAnswer(currentQuestion.id, true)}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                >
                  Refuser
                </button>
              </div>
            </div>
          )}

          {/* Section Validation (Jury) */}
          {isJury() && (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-4">
                <i className="fas fa-check-circle text-2xl text-yellow-400"></i>
                <h2 className="text-xl font-bold text-yellow-400">Validation</h2>
              </div>
              
              {getPendingAnswers().length > 0 ? (
                <div className="space-y-4">
                  {getPendingAnswers().map((answer) => (
                    <div key={answer.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="mb-3">
                        <strong className="text-white">Réponse reçue :</strong>
                        <div className="text-white/80 mt-2">
                          {answer.isVoluntaryRefusal ? (
                            <span className="text-red-400 font-semibold">Refus volontaire</span>
                          ) : answer.answerType === 'text' ? (
                            <span>{answer.answerContent}</span>
                          ) : answer.answerType === 'audio' && answer.answerMediaUrl ? (
                            <div>
                              <p className="mb-2">Réponse audio</p>
                              <audio src={answer.answerMediaUrl.startsWith('http') ? answer.answerMediaUrl : `http://localhost:5002${answer.answerMediaUrl}`} controls className="w-full"></audio>
                            </div>
                          ) : answer.answerType === 'video' && answer.answerMediaUrl ? (
                            <div>
                              <p className="mb-2">Réponse vidéo</p>
                              <video src={answer.answerMediaUrl.startsWith('http') ? answer.answerMediaUrl : `http://localhost:5002${answer.answerMediaUrl.startsWith('/') ? answer.answerMediaUrl : '/' + answer.answerMediaUrl}`} controls className="w-full rounded-lg"></video>
                            </div>
                          ) : (
                            <span>{answer.answerContent || 'Réponse média'}</span>
                          )}
                        </div>
                        <div className="text-white/60 text-sm mt-1">De: {answer.numeroH}</div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => validateAnswer(answer.id, 'correct')}
                          disabled={loading}
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-2 rounded-lg font-semibold transition-all"
                        >
                          <i className="fas fa-check-circle mr-2"></i> Bonne réponse
                        </button>
                        <button
                          onClick={() => validateAnswer(answer.id, 'wrong')}
                          disabled={loading}
                          className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-2 rounded-lg font-semibold transition-all"
                        >
                          <i className="fas fa-times-circle mr-2"></i> Mauvaise réponse
                        </button>
                        <button
                          onClick={() => validateAnswer(answer.id, 'refuse')}
                          disabled={loading}
                          className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-4 py-2 rounded-lg"
                        >
                          <i className="fas fa-ban mr-2"></i> Refuser la réponse
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <p className="text-white/70">Aucune réponse en attente de validation</p>
                </div>
              )}
            </div>
          )}

          {/* Journal des transactions */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-2 mb-4">
              <i className="fas fa-clipboard-list text-yellow-400"></i>
              <h2 className="text-xl font-bold text-red-400">Journal des transactions</h2>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {transactionLog.length > 0 ? (
                transactionLog.map((log, idx) => (
                  <div key={idx} className="bg-white/5 rounded-lg p-3 border-l-4 border-yellow-400">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-white font-semibold">{log.sender === 'system' ? 'Système' : log.sender}</span>
                      <span className="text-white/70 text-sm">{log.time}</span>
                    </div>
                    <div className="text-white/80">{log.message}</div>
                  </div>
                ))
              ) : (
                <div className="text-white/70 text-center py-4">Aucune transaction pour le moment</div>
              )}
            </div>
          </div>

          {/* Barre de statut */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 flex justify-between items-center">
            <div className="text-white">
              <strong>Statut :</strong> <span>{game.status === 'waiting' ? 'En attente d\'une question' : game.status === 'active' ? 'Jeu actif' : game.status}</span>
            </div>
            <div className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-full font-semibold">
              Tour actuel : {game.currentPlayerTurn || 'En attente'}
            </div>
          </div>

          <button
            onClick={() => setCurrentView('menu')}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
          >
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  // Vue Jury
  if (currentView === 'jury' && game) {
    const pendingAnswers = getPendingAnswers();
    const currentQuestion = getCurrentQuestion();

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">⚖️ Vue Jury</h2>
              <button
                onClick={() => setCurrentView('menu')}
                className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
              >
                Retour au menu
              </button>
            </div>

            {/* Total de points */}
            <div className="bg-white/5 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-white">Total de points actuel</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {(game.deposit?.currentAmount || game.depositAmount || 0).toLocaleString()} pts
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Nombre de points"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50"
                />
                <button
                  onClick={rechargeDeposit}
                  disabled={loading || !rechargeAmount}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                >
                  Recharger
                </button>
              </div>
            </div>

            {/* Question en cours */}
            {currentQuestion && (
              <div className="bg-white/5 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-white mb-2">Question en cours</h3>
                <div className="text-white/80">
                  {currentQuestion.questionType === 'text' && currentQuestion.questionContent}
                  {currentQuestion.questionType === 'audio' && currentQuestion.questionMediaUrl && (
                    <div>
                      <p className="mb-2">Question audio</p>
                      <audio src={currentQuestion.questionMediaUrl.startsWith('http') ? currentQuestion.questionMediaUrl : `http://localhost:5002${currentQuestion.questionMediaUrl.startsWith('/') ? currentQuestion.questionMediaUrl : '/' + currentQuestion.questionMediaUrl}`} controls className="w-full"></audio>
                    </div>
                  )}
                  {currentQuestion.questionType === 'video' && currentQuestion.questionMediaUrl && (
                    <div>
                      <p className="mb-2">Question vidéo</p>
                      <video src={currentQuestion.questionMediaUrl.startsWith('http') ? currentQuestion.questionMediaUrl : `http://localhost:5002${currentQuestion.questionMediaUrl.startsWith('/') ? currentQuestion.questionMediaUrl : '/' + currentQuestion.questionMediaUrl}`} controls className="w-full rounded-lg"></video>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Réponses en attente */}
            {pendingAnswers.length > 0 ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-white">Réponses en attente de validation</h3>
                {pendingAnswers.map((answer) => (
                  <div key={answer.id} className="bg-white/5 rounded-lg p-4 border-2 border-white/20">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-white">{answer.numeroH}</p>
                        {answer.isVoluntaryRefusal ? (
                          <p className="text-red-400 font-semibold">Refus volontaire</p>
                        ) : (
                          <p className="text-white/80">{answer.answerContent}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => validateAnswer(answer.id, 'correct')}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                      >
                        ✓ Bonne réponse
                      </button>
                      <button
                        onClick={() => validateAnswer(answer.id, 'wrong')}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                      >
                        ✗ Mauvaise réponse
                      </button>
                      <button
                        onClick={() => validateAnswer(answer.id, 'refuse')}
                        disabled={loading}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg"
                      >
                        Refuser la réponse
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-white/80">Aucune réponse en attente</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Chargement...</div>;
}
