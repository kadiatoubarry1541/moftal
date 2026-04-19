import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { config } from '../config/api';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface Exercice {
  question: string;
  reponse: string | number;
  explication: string;
  type?: string;
}

type Tab = 'entrainement' | 'questions' | 'historique';

type ExerciceResult = 'correct' | 'incorrect' | null;

const FR_EXERCICES = [
  { label: '📖 Vocabulaire',  msg: 'exercice vocabulaire',   color: 'blue' },
  { label: '📝 Grammaire',    msg: 'exercice grammaire',     color: 'blue' },
  { label: '🔤 Homophones',   msg: 'exercice homophones',    color: 'blue' },
  { label: '🔡 Conjugaison',  msg: 'exercice conjugaison',   color: 'blue' },
  { label: '✍️ Français aléatoire', msg: 'donne moi un exercice de francais', color: 'blue' },
];

const MA_EXERCICES = [
  { label: '➕ Addition',        msg: 'exercice addition',        color: 'green' },
  { label: '➖ Soustraction',    msg: 'exercice soustraction',    color: 'green' },
  { label: '✖️ Multiplication',  msg: 'exercice multiplication',  color: 'green' },
  { label: '➗ Division',        msg: 'exercice division',        color: 'green' },
  { label: '🔢 Fractions',      msg: 'exercice fraction',        color: 'green' },
  { label: '📊 Probabilités',   msg: 'exercice probabilite',     color: 'green' },
  { label: '📊 Moyenne',        msg: 'exercice moyenne',         color: 'green' },
  { label: '🔢 Décimaux',       msg: 'exercice decimaux',        color: 'green' },
  { label: '🔢 Puissance',      msg: 'exercice puissance',       color: 'green' },
  { label: '📝 Équation',       msg: 'exercice equation',        color: 'green' },
  { label: '🔢 Suites',         msg: 'exercice suite',           color: 'green' },
  { label: '⚡ Pythagore',      msg: 'exercice pythagore',       color: 'green' },
  { label: '📐 Aire triangle',  msg: 'exercice aire triangle',   color: 'green' },
  { label: '🎲 Maths aléatoire', msg: 'donne moi un exercice de maths', color: 'green' },
];

export default function ProfesseurIA() {
  const [activeTab, setActiveTab] = useState<Tab>('entrainement');

  // === ONGLET QUESTIONS ===
  const [messages, setMessages] = useState<Message[]>([
    {
      text: 'Bonjour ! Je suis votre **Professeur IA**, spécialisé en **Français** et **Mathématiques** (du CP à la Terminale).\n\nPosez-moi une question : conjugaison, grammaire, calcul, géométrie...',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // === ONGLET HISTORIQUE ===
  const [iaHistory, setIaHistory] = useState<Array<{ id: string; userMessage: string; botResponse: string; created_at: string }>>([]);
  const [historyPageLoaded, setHistoryPageLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // === ONGLET ENTRAÎNEMENT ===
  const [currentExercice, setCurrentExercice] = useState<Exercice | null>(null);
  const [exerciceQuestion, setExerciceQuestion] = useState('');
  const [exerciceAnswer, setExerciceAnswer] = useState('');
  const [exerciceResult, setExerciceResult] = useState<ExerciceResult>(null);
  const [exerciceCorrection, setExerciceCorrection] = useState('');
  const [exerciceLoading, setExerciceLoading] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const answerInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (currentExercice && answerInputRef.current) {
      answerInputRef.current.focus();
    }
  }, [currentExercice]);

  // Charger l'historique des conversations au montage
  useEffect(() => {
    if (historyLoaded) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${config.API_BASE_URL}/ia/history`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.success && data.conversations?.length > 0) {
          const historical: Message[] = [];
          data.conversations.forEach((conv: { userMessage: string; botResponse: string; created_at: string }) => {
            historical.push({ text: conv.userMessage, isUser: true, timestamp: new Date(conv.created_at) });
            historical.push({ text: conv.botResponse, isUser: false, timestamp: new Date(conv.created_at) });
          });
          setMessages([
            { text: 'Bonjour ! Je suis votre **Professeur IA**, spécialisé en **Français** et **Mathématiques**.\n\n_Historique chargé — vos anciennes conversations sont affichées ci-dessous._', isUser: false, timestamp: new Date() },
            ...historical
          ]);
        }
        setHistoryLoaded(true);
      })
      .catch(() => setHistoryLoaded(true));
  }, [historyLoaded]);

  const iaApiBase = () =>
    import.meta.env.VITE_IA_API_URL || `${config.API_BASE_URL}/ia`;

  // ─── Questions libres ───────────────────────────────────────────────────────
  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: Message = { text: chatInput.trim(), isUser: true, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${iaApiBase()}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ message: userMsg.text, history: [], lastExercice: null }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMessages(prev => [...prev, { text: data.response, isUser: false, timestamp: new Date() }]);
        } else {
          setMessages(prev => [...prev, { text: '⚠️ Le serveur a renvoyé une erreur.', isUser: false, timestamp: new Date() }]);
        }
      } else {
        setMessages(prev => [...prev, { text: '⚠️ Serveur inaccessible. Vérifiez que le backend est démarré (port 5002).', isUser: false, timestamp: new Date() }]);
      }
    } catch {
      setMessages(prev => [...prev, { text: '⚠️ Impossible de joindre le serveur. Démarrez le backend puis rafraîchissez la page.', isUser: false, timestamp: new Date() }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ─── Entraînement : lancer un exercice ────────────────────────────────────
  const launchExercice = async (msg: string) => {
    if (exerciceLoading) return;
    setExerciceLoading(true);
    setExerciceResult(null);
    setExerciceCorrection('');
    setExerciceAnswer('');
    setCurrentExercice(null);
    setExerciceQuestion('');
    try {
      const res = await fetch(`${iaApiBase()}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: [], lastExercice: null }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.exercice) {
          setCurrentExercice(data.exercice);
          setExerciceQuestion(data.exercice.question);
        } else if (data.success) {
          // Réponse texte sans exercice structuré
          setExerciceQuestion(data.response);
        } else {
          setExerciceQuestion('⚠️ Erreur serveur. Réessayez.');
        }
      } else {
        setExerciceQuestion('⚠️ Serveur inaccessible. Vérifiez que le backend est démarré.');
      }
    } catch {
      setExerciceQuestion('⚠️ Impossible de joindre le serveur.');
    } finally {
      setExerciceLoading(false);
    }
  };

  // ─── Entraînement : soumettre la réponse ──────────────────────────────────
  const submitAnswer = async () => {
    if (!exerciceAnswer.trim() || exerciceLoading || !currentExercice) return;
    setExerciceLoading(true);
    const userAnswer = exerciceAnswer.trim();
    setExerciceAnswer('');
    try {
      const res = await fetch(`${iaApiBase()}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userAnswer, history: [], lastExercice: currentExercice }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const responseText: string = data.response || '';
          const isCorrect =
            responseText.includes('BRAVO') ||
            responseText.includes('PARFAIT') ||
            responseText.includes('TRÈS BIEN') ||
            responseText.includes('CORRECT');

          setExerciceResult(isCorrect ? 'correct' : 'incorrect');
          setExerciceCorrection(responseText);
          setScore(prev => ({
            correct: prev.correct + (isCorrect ? 1 : 0),
            total: prev.total + 1,
          }));

          // Si correct → prochain exercice chargé automatiquement
          if (isCorrect && data.exercice) {
            setTimeout(() => {
              setCurrentExercice(data.exercice);
              setExerciceQuestion(data.exercice.question);
              setExerciceResult(null);
              setExerciceCorrection('');
            }, 2500);
          } else if (!isCorrect) {
            setCurrentExercice(null);
          }
        }
      }
    } catch {
      setExerciceCorrection('⚠️ Erreur réseau. Réessayez.');
    } finally {
      setExerciceLoading(false);
    }
  };

  const handleChatKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
  };
  const handleAnswerKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAnswer(); }
  };

  // ─── Charger l'historique IA ──────────────────────────────────────────────
  const loadIaHistory = async () => {
    if (historyPageLoaded) return;
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { setHistoryLoading(false); return; }
      const res = await fetch(`${config.API_BASE_URL}/ia/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIaHistory(data.conversations || []);
      }
      setHistoryPageLoaded(true);
    } catch {
      setHistoryPageLoaded(true);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ─── Réinitialiser l'exercice ──────────────────────────────────────────────
  const resetExercice = () => {
    setCurrentExercice(null);
    setExerciceQuestion('');
    setExerciceAnswer('');
    setExerciceResult(null);
    setExerciceCorrection('');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">

      {/* ── Sidebar gauche style ChatGPT ── */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-gray-200" style={{ background: '#f9f9f9' }}>
        {/* Logo */}
        <div className="px-4 pt-5 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#0891b2,#2563eb)' }}>
              🎓
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 leading-tight">Professeur IA</p>
              <p className="text-[10px] text-gray-400">CP → Terminale</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1.5">
          <button
            onClick={() => setActiveTab('questions')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
              activeTab === 'questions'
                ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
                : 'text-gray-500 hover:bg-white hover:text-gray-800 hover:shadow-sm'
            }`}
          >
            <span className="text-lg">💬</span>
            <span>Questions</span>
          </button>

          <button
            onClick={() => setActiveTab('entrainement')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
              activeTab === 'entrainement'
                ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100'
                : 'text-gray-500 hover:bg-white hover:text-gray-800 hover:shadow-sm'
            }`}
          >
            <span className="text-lg">🏋️</span>
            <span>Entraînement</span>
          </button>

          <button
            onClick={() => { setActiveTab('historique'); loadIaHistory(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
              activeTab === 'historique'
                ? 'bg-white text-purple-700 shadow-sm border border-purple-100'
                : 'text-gray-500 hover:bg-white hover:text-gray-800 hover:shadow-sm'
            }`}
          >
            <span className="text-lg">🕐</span>
            <span>Historique</span>
          </button>
        </nav>

        {/* Retour */}
        <div className="px-3 pb-4 border-t border-gray-200 pt-3">
          <button
            onClick={() => navigate('/education')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-gray-700 hover:bg-white transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Retour Éducation
          </button>
        </div>
      </aside>

      {/* ── Zone principale ── */}
      <div className="flex-1 overflow-y-auto" style={{ background: 'linear-gradient(160deg,#f0f9ff 0%,#e0f2fe 40%,#ede9fe 100%)' }}>
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-5">

        {/* ══════════════════════════════════════════════
            ONGLET : ENTRAÎNEMENT
        ══════════════════════════════════════════════ */}
        {activeTab === 'entrainement' && (
          <div className="space-y-4">

            {/* Score */}
            {score.total > 0 && (
              <div className="flex items-center gap-3 bg-white rounded-2xl px-5 py-3 shadow-sm border border-gray-100">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="font-bold text-gray-800">Score session</p>
                  <p className="text-sm text-gray-500">{score.correct} bonne{score.correct > 1 ? 's' : ''} sur {score.total} — {Math.round((score.correct / score.total) * 100)}%</p>
                </div>
                <button onClick={() => setScore({ correct: 0, total: 0 })} className="ml-auto text-xs text-gray-400 hover:text-gray-600">Réinitialiser</button>
              </div>
            )}

            {/* Boutons de sélection (toujours visibles) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 pt-4 pb-2 border-b border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Choisissez un type d'exercice</p>
              </div>

              {/* Français */}
              <div className="px-5 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-xs">📖</span>
                  <p className="text-sm font-bold text-blue-800">Français</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {FR_EXERCICES.map(btn => (
                    <button
                      key={btn.msg}
                      onClick={() => { resetExercice(); launchExercice(btn.msg); }}
                      disabled={exerciceLoading}
                      className="px-3 py-1.5 bg-blue-50 border border-blue-200 hover:border-blue-500 hover:bg-blue-100 text-blue-800 text-sm font-medium rounded-xl transition-all disabled:opacity-40"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Maths */}
              <div className="px-5 py-3 border-t border-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-lg bg-green-600 flex items-center justify-center text-xs">📐</span>
                  <p className="text-sm font-bold text-green-800">Mathématiques</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {MA_EXERCICES.map(btn => (
                    <button
                      key={btn.msg}
                      onClick={() => { resetExercice(); launchExercice(btn.msg); }}
                      disabled={exerciceLoading}
                      className="px-3 py-1.5 bg-green-50 border border-green-200 hover:border-green-500 hover:bg-green-100 text-green-800 text-sm font-medium rounded-xl transition-all disabled:opacity-40"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Exercice en cours */}
            {exerciceLoading && !currentExercice && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
                <div className="flex gap-1">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <p className="text-gray-600 font-medium">Préparation de l'exercice...</p>
              </div>
            )}

            {exerciceQuestion && !exerciceLoading && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Question */}
                <div className="px-6 py-5 border-b border-gray-50" style={{ background: 'linear-gradient(135deg,#f0fdf4,#ecfdf5)' }}>
                  <div className="flex items-start gap-3">
                    <span className="text-3xl flex-shrink-0">❓</span>
                    <div>
                      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Question</p>
                      <p className="text-gray-900 font-bold text-lg leading-snug">{exerciceQuestion}</p>
                    </div>
                  </div>
                </div>

                {/* Résultat */}
                {exerciceResult === 'correct' && (
                  <div className="mx-5 mt-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                    <p className="font-bold text-green-800 text-base mb-1">✅ BRAVO ! Bonne réponse !</p>
                    <p className="text-green-700 text-sm">Prochain exercice dans 2 secondes...</p>
                  </div>
                )}

                {exerciceResult === 'incorrect' && exerciceCorrection && (
                  <div className="mx-5 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                    <p className="font-bold text-red-800 text-base">❌ Ce n'est pas la bonne réponse.</p>
                    <div className="text-sm text-gray-700 prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {exerciceCorrection}
                      </ReactMarkdown>
                    </div>
                    <button
                      onClick={resetExercice}
                      className="mt-2 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors"
                    >
                      Choisir un autre exercice
                    </button>
                  </div>
                )}

                {/* Zone de réponse */}
                {!exerciceResult && currentExercice && (
                  <div className="px-5 py-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Votre réponse</p>
                    <div className="flex gap-2">
                      <input
                        ref={answerInputRef}
                        type="text"
                        value={exerciceAnswer}
                        onChange={e => setExerciceAnswer(e.target.value)}
                        onKeyDown={handleAnswerKey}
                        placeholder="Tapez votre réponse ici..."
                        disabled={exerciceLoading}
                        className="flex-1 px-4 py-3 border-2 border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-base transition-colors disabled:opacity-40"
                        autoComplete="off"
                      />
                      <button
                        onClick={submitAnswer}
                        disabled={exerciceLoading || !exerciceAnswer.trim()}
                        className="px-5 py-3 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
                      >
                        {exerciceLoading ? '...' : 'Valider ✓'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Placeholder quand rien n'est sélectionné */}
            {!exerciceQuestion && !exerciceLoading && (
              <div className="text-center py-10 text-gray-400">
                <p className="text-5xl mb-3">🎯</p>
                <p className="font-bold text-gray-500 text-lg">Choisissez un exercice ci-dessus pour commencer !</p>
                <p className="text-sm mt-1">Vous pouvez faire autant d'exercices que vous voulez.</p>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            ONGLET : QUESTIONS AU PROFESSEUR
        ══════════════════════════════════════════════ */}
        {activeTab === 'questions' && (
          <div>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100" style={{ height: 'calc(100vh - 230px)', minHeight: '400px' }}>
              <div className="h-full flex flex-col">
                {/* Info en haut */}
                <div className="px-5 py-2 bg-cyan-50 border-b border-cyan-100">
                  <p className="text-xs text-cyan-700 font-medium">
                    💬 Posez n'importe quelle question en Français ou Maths — le Professeur IA vous répond.
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50">
                  {messages.map((message, index) => (
                    <div key={index} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                        message.isUser
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                      }`}>
                        {!message.isUser && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">🎓</span>
                            <span className="font-bold text-gray-800 text-sm">Professeur IA</span>
                          </div>
                        )}
                        {message.isUser ? (
                          <div className="whitespace-pre-wrap text-sm">{message.text}</div>
                        ) : (
                          <div className="prose prose-sm max-w-none text-gray-800">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1: ({ children }) => <h1 className="text-lg font-bold mt-2 mb-1">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-base font-bold mt-2 mb-1">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-bold mt-1 mb-0.5">{children}</h3>,
                                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                                p: ({ children }) => <p className="mb-1.5 leading-relaxed text-sm">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5 text-sm">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5 text-sm">{children}</ol>,
                                li: ({ children }) => <li>{children}</li>,
                                code: ({ children, className }) => {
                                  const isBlock = className?.includes('language-');
                                  return isBlock
                                    ? <code className="block bg-gray-100 rounded p-2 text-sm font-mono my-2">{children}</code>
                                    : <code className="bg-gray-100 rounded px-1 text-xs font-mono text-cyan-700">{children}</code>;
                                },
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-4 border-cyan-400 pl-3 my-2 italic text-gray-600 bg-cyan-50 py-1 text-sm">{children}</blockquote>
                                ),
                              }}
                            >
                              {message.text}
                            </ReactMarkdown>
                          </div>
                        )}
                        <div className={`text-[10px] mt-1 ${message.isUser ? 'text-cyan-100' : 'text-gray-400'}`}>
                          {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🎓</span>
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-gray-500 text-sm">Le professeur réfléchit...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-gray-100 bg-white px-4 py-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={handleChatKey}
                      placeholder="Posez votre question... ex: Explique le passé composé"
                      disabled={chatLoading}
                      className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 text-sm transition-colors"
                      autoComplete="off"
                    />
                    <button
                      onClick={sendChatMessage}
                      disabled={chatLoading || !chatInput.trim()}
                      className="px-5 py-2.5 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(135deg,#0891b2,#2563eb)' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Info cards */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-2xl p-4 border border-blue-100" style={{ background: 'linear-gradient(135deg,#eff6ff,#eef2ff)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-sm">📖</span>
                  <p className="font-bold text-blue-900 text-sm">Français — exemples</p>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  "Explique le passé composé" · "C'est quoi un homophone ?" · "Donne-moi un synonyme de beau" · "Figures de style dans une fable"
                </p>
              </div>
              <div className="rounded-2xl p-4 border border-green-100" style={{ background: 'linear-gradient(135deg,#f0fdf4,#ecfdf5)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center text-sm">📐</span>
                  <p className="font-bold text-green-900 text-sm">Maths — exemples</p>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  "x² + 5x + 6 = 0" · "sin(45°)" · "Aire d'un cercle de rayon 7" · "Probabilité de tirer un as"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            ONGLET : HISTORIQUE
        ══════════════════════════════════════════════ */}
        {activeTab === 'historique' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">🕐</span>
                <h2 className="text-xl font-bold text-gray-900">Historique de vos recherches</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Toutes vos questions posées au Professeur IA sont conservées ici.
                <span className="ml-1 text-purple-600 font-medium">L'historique est vidé automatiquement tous les 3 mois.</span>
              </p>

              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
                </div>
              ) : iaHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-5xl mb-3">📭</p>
                  <p className="text-base font-medium">Aucune recherche pour le moment</p>
                  <p className="text-sm mt-1">Posez une question dans l'onglet Questions pour commencer</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {iaHistory.map((conv) => (
                    <div key={conv.id} className="rounded-xl border border-gray-100 overflow-hidden">
                      {/* Question de l'utilisateur */}
                      <div className="bg-purple-50 px-4 py-3 flex items-start gap-3">
                        <span className="text-purple-500 text-lg mt-0.5">❓</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-purple-900 break-words">{conv.userMessage}</p>
                          <p className="text-xs text-purple-400 mt-1">
                            {new Date(conv.created_at).toLocaleDateString('fr-FR', {
                              day: '2-digit', month: 'long', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab('questions');
                            setChatInput(conv.userMessage);
                          }}
                          className="flex-shrink-0 px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg font-medium transition-colors"
                          title="Poser à nouveau cette question"
                        >
                          ↩ Reposer
                        </button>
                      </div>
                      {/* Réponse IA résumée */}
                      <div className="bg-white px-4 py-3 flex items-start gap-3">
                        <span className="text-cyan-500 text-lg mt-0.5">🤖</span>
                        <p className="text-xs text-gray-600 break-words line-clamp-3">
                          {conv.botResponse.length > 200 ? conv.botResponse.substring(0, 200) + '…' : conv.botResponse}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
