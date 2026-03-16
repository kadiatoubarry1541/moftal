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

export default function ProfesseurIA() {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Bonjour ! Je peux vous assister en Français et en Mathématiques. Posez-moi une question.",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastExercice, setLastExercice] = useState<Exercice | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      text: inputValue.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Construire l'historique : paires (question utilisateur, réponse bot) pour le contexte
      const historyPairs: { question: string; reponse: string }[] = [];
      for (let i = 1; i < messages.length - 1; i += 2) {
        if (messages[i]?.isUser && !messages[i + 1]?.isUser) {
          historyPairs.push({
            question: messages[i].text,
            reponse: messages[i + 1].text
          });
        }
      }

      // Backend gère l'IA - URL directe pour éviter les erreurs de proxy
      const iaApiBase = import.meta.env.VITE_IA_API_URL || `${config.API_BASE_URL}/ia`;
      const response = await fetch(`${iaApiBase}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputValue.trim(),
          history: historyPairs,
          lastExercice: lastExercice
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const botMessage: Message = {
            text: data.response,
            isUser: false,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, botMessage]);
          // Stocker l'exercice généré pour pouvoir corriger la réponse de l'élève
          if (data.exercice) {
            setLastExercice(data.exercice);
          } else if (data.lastExercice === null) {
            setLastExercice(null);
          }
        } else {
          console.error('[ProfesseurIA] Réponse success=false:', data);
          const errorMessage: Message = {
            text: "Cher(e) élève, il y a eu une erreur. Vérifiez que le backend est démarré (port 5002).",
            isUser: false,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      } else {
        const errText = await response.text();
        console.error('[ProfesseurIA] Erreur HTTP', response.status, errText);
        const errorMessage: Message = {
          text: "Cher(e) élève, le serveur ne répond pas. Vérifiez que le backend (port 5002) est démarré.",
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      const errorMessage: Message = {
        text: "Cher(e) élève, impossible de joindre le serveur. Démarrez le backend (npm start dans le dossier backend) puis rafraîchissez la page.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg,#f0f9ff 0%,#e0f2fe 40%,#ede9fe 100%)" }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md"
                style={{ background: "linear-gradient(135deg,#0891b2,#2563eb)" }}>
                🎓
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900 leading-tight">Professeur IA</h1>
                <p className="text-xs text-gray-500">Français · Mathématiques · CP → Terminale</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/education')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Éducation
            </button>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100" style={{ height: 'calc(100vh - 200px)', minHeight: '420px' }}>
          {/* Messages Area */}
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.isUser
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                        : 'bg-white text-gray-900 border-2 border-cyan-200'
                    }`}
                  >
                    {!message.isUser && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🎓</span>
                        <span className="font-semibold">Assistant IA</span>
                      </div>
                    )}
                    {message.isUser ? (
                      <div className="whitespace-pre-wrap">{message.text}</div>
                    ) : (
                      <div className="markdown-body prose prose-sm max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ children }) => <h1 className="text-xl font-bold mt-3 mb-1 text-gray-900">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-1 text-gray-900">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base font-bold mt-2 mb-1 text-gray-800">{children}</h3>,
                            strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                            em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                            p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="text-gray-800">{children}</li>,
                            code: ({ children, className }) => {
                              const isBlock = className?.includes('language-');
                              return isBlock
                                ? <code className="block bg-gray-100 rounded p-2 text-sm font-mono my-2 overflow-x-auto">{children}</code>
                                : <code className="bg-gray-100 rounded px-1 text-sm font-mono text-cyan-700">{children}</code>;
                            },
                            pre: ({ children }) => <pre className="bg-gray-100 rounded p-3 my-2 overflow-x-auto text-sm">{children}</pre>,
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-3">
                                <table className="min-w-full border-collapse border border-gray-300 text-sm">{children}</table>
                              </div>
                            ),
                            thead: ({ children }) => <thead className="bg-cyan-50">{children}</thead>,
                            th: ({ children }) => <th className="border border-gray-300 px-3 py-1 font-semibold text-left text-cyan-800">{children}</th>,
                            td: ({ children }) => <td className="border border-gray-300 px-3 py-1">{children}</td>,
                            tr: ({ children }) => <tr className="even:bg-gray-50">{children}</tr>,
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-cyan-400 pl-3 my-2 italic text-gray-700 bg-cyan-50 py-1">{children}</blockquote>
                            ),
                            hr: () => <hr className="my-3 border-gray-300" />,
                          }}
                        >
                          {message.text}
                        </ReactMarkdown>
                      </div>
                    )}
                    <div className={`text-xs mt-2 ${message.isUser ? 'text-cyan-100' : 'text-gray-500'}`}>
                      {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border-2 border-cyan-200 rounded-lg p-4 max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🎓</span>
                      <span className="font-semibold">Assistant IA</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-gray-600">Je réfléchis à ta question...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Raccourcis rapides — deux lignes scrollables */}
            <div className="border-t border-gray-100 bg-gray-50/80 px-3 py-2 space-y-1.5">
              {/* Français */}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
                <span className="flex-shrink-0 text-[10px] font-bold text-blue-400 uppercase tracking-wider self-center pr-1">FR</span>
                {[
                  { label: '📖 Vocabulaire',    msg: 'exercice vocabulaire' },
                  { label: '📝 Grammaire',       msg: 'exercice grammaire' },
                  { label: '🔤 Homophones',      msg: 'exercice homophones' },
                  { label: '🔡 Conjugaison',     msg: 'exercice conjugaison' },
                  { label: '✍️ Exercice FR',     msg: 'donne moi un exercice de francais' },
                ].map(btn => (
                  <button key={btn.label} type="button" onClick={() => setInputValue(btn.msg)} disabled={isLoading}
                    className="flex-shrink-0 px-2.5 py-1 bg-white border border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 text-xs font-medium rounded-full transition-colors disabled:opacity-40">
                    {btn.label}
                  </button>
                ))}
              </div>
              {/* Maths */}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
                <span className="flex-shrink-0 text-[10px] font-bold text-green-500 uppercase tracking-wider self-center pr-1">MA</span>
                {[
                  { label: '➕ Addition',        msg: 'exercice addition' },
                  { label: '✖️ Multiplication',  msg: 'exercice multiplication' },
                  { label: '🔢 Fractions',        msg: 'exercice fraction' },
                  { label: '📊 Probabilités',     msg: 'exercice probabilite' },
                  { label: '📊 Moyenne',          msg: 'exercice moyenne' },
                  { label: '🔢 Décimaux',         msg: 'exercice decimaux' },
                  { label: '🔢 Puissance',        msg: 'exercice puissance' },
                  { label: '📝 Équation',         msg: 'exercice equation' },
                  { label: '🔢 Suites',           msg: 'exercice suite' },
                  { label: '⚡ Pythagore',        msg: 'exercice pythagore' },
                  { label: '📐 Aire triangle',    msg: 'exercice aire triangle' },
                ].map(btn => (
                  <button key={btn.label} type="button" onClick={() => setInputValue(btn.msg)} disabled={isLoading}
                    className="flex-shrink-0 px-2.5 py-1 bg-white border border-green-200 hover:border-green-400 hover:bg-green-50 text-gray-700 text-xs font-medium rounded-full transition-colors disabled:opacity-40">
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-100 bg-white px-4 py-3">
              {lastExercice && (
                <div className="mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <div className="flex items-start gap-2">
                    <span className="text-base flex-shrink-0">⏳</span>
                    <div className="min-w-0">
                      <p className="font-bold text-amber-800 mb-0.5">Exercice en cours</p>
                      <p className="text-amber-700 font-medium leading-snug line-clamp-2">{lastExercice.question}</p>
                      <p className="text-amber-500 text-[10px] mt-0.5">Tapez votre réponse directement ou &ldquo;reponse: ...&rdquo;</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={lastExercice ? '✏️ Votre réponse...' : '💬 Question, exercice, calcul...'}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 text-sm transition-colors"
                  disabled={isLoading}
                  autoComplete="off"
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  className="px-5 py-2.5 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg,#0891b2,#2563eb)" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-2xl p-4 border border-blue-100" style={{ background: "linear-gradient(135deg,#eff6ff,#eef2ff)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-sm">📖</span>
              <p className="font-bold text-blue-900 text-sm">Français</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {['Grammaire','Conjugaison','Orthographe','Homophones','Vocabulaire','Synonymes','Figures de style','Dissertation','Commentaire'].map(t => (
                <span key={t} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">{t}</span>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 mt-1.5 italic">"Explique le passé composé" · "exercice conjugaison"</p>
          </div>
          <div className="rounded-2xl p-4 border border-green-100" style={{ background: "linear-gradient(135deg,#f0fdf4,#ecfdf5)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center text-sm">📐</span>
              <p className="font-bold text-green-900 text-sm">Mathématiques</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {['Calculs','Fractions','Équations','Probabilités','Statistiques','Suites','Géométrie','Trigonométrie','Puissances','PGCD'].map(t => (
                <span key={t} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium">{t}</span>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 mt-1.5 italic">"x² + 5x + 6 = 0" · "sin(45)" · "aire cercle 7"</p>
          </div>
        </div>
      </div>
    </div>
  );
}

