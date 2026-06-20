import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config/api';

// ─── Base de connaissance complète du site ────────────────────────────────────
const SITE_KNOWLEDGE = [
  {
    keywords: ['compte', 'inscription', 'enregistrer', 'creer', 'créer', 's inscrire', 'inscris', 'nouveau', 'rejoindre', 'register', 'sign up'],
    response: `**Comment créer un compte sur Moftal ?**\n\nVous avez **2 types de comptes** :\n\n👤 **Compte Vivant** — Pour vous-même\n→ Cliquez sur "S'inscrire" puis choisissez **"Vivant"**\n→ Renseignez vos informations personnelles\n→ Un **Numéro H** unique vous est attribué (votre identifiant)\n\n🕊️ **Compte Défunt** — Pour un proche décédé\n→ Choisissez **"Défunt"** lors de l'inscription\n→ Créez un profil mémoriel pour votre proche\n\n📌 Liens directs :`,
    links: [{ label: 'Créer un compte', path: '/choix' }, { label: 'Se connecter', path: '/login' }]
  },
  {
    keywords: ['connecter', 'connexion', 'login', 'mot de passe', 'se connecter', 'oublié', 'acceder', 'accéder', 'mdp'],
    response: `**Comment se connecter ?**\n\nCliquez sur **"Connexion"** et entrez :\n- Votre **Numéro H** (ex: H-12345)\n- Votre **mot de passe**\n\n🔑 Mot de passe oublié ? Utilisez le lien dédié sur la page de connexion.\n\n📌 Accès rapide :`,
    links: [{ label: 'Se connecter', path: '/login' }, { label: 'Mot de passe oublié', path: '/mot-de-passe-oublie' }]
  },
  {
    keywords: ['famille', 'arbre', 'genealogique', 'généalogique', 'parents', 'enfants', 'partenaire', 'mari', 'femme', 'conjoint', 'familial'],
    response: `**La page Famille** 👨‍👩‍👧‍👦\n\nC'est le cœur du site ! Vous pouvez :\n\n🌳 **Arbre généalogique** — Visualisez votre arbre familial\n👨‍👩 **Parents** — Ajoutez et consultez vos parents\n👶 **Enfants** — Gérez vos enfants\n💑 **Partenaire** — Votre femme ou mari\n❤️ **Mes Amours** — Messagerie privée avec votre partenaire\n📸 **Galerie** — Photos de famille\n\n📌 Accéder :`,
    links: [{ label: 'Ma Famille', path: '/famille' }, { label: 'Mon Arbre Généalogique', path: '/famille/moi/arbre' }, { label: 'Mes Parents', path: '/famille/parents' }]
  },
  {
    keywords: ['sante', 'santé', 'médecin', 'medecin', 'rendez-vous', 'rendezvous', 'rdv', 'docteur', 'clinique', 'hopital', 'hôpital'],
    response: `**La page Santé** 🏥\n\nTrouvez des professionnels de santé et prenez rendez-vous :\n\n📋 Consultez la liste des médecins et cliniques\n📅 **Prenez un rendez-vous** directement en ligne\n🎥 Option **vidéo consultation** (30 secondes)\n📊 Suivez vos rendez-vous (En attente / Accepté / Refusé)\n\n📌 Accéder :`,
    links: [{ label: 'Page Santé', path: '/sante' }, { label: 'Trouver un professionnel', path: '/professionnels' }]
  },
  {
    keywords: ['securite', 'sécurité', 'police', 'protection', 'agence securite'],
    response: `**La page Sécurité** 🛡️\n\nAccédez aux **agences de sécurité** et services de protection enregistrés.\n\nVous pouvez contacter et prendre rendez-vous avec des professionnels de la sécurité.\n\n📌 Accéder :`,
    links: [{ label: 'Page Sécurité', path: '/securite' }]
  },
  {
    keywords: ['echange', 'échange', 'commerce', 'vente', 'achat', 'produit', 'nourriture', 'medicament', 'médicament', 'primaire', 'secondaire', 'tertiaire', 'annonce', 'publier'],
    response: `**La page Échanges** 🛒\n\nPlateforme de commerce et d'échanges entre membres :\n\n🥗 **Nourriture** — Aliments, produits frais\n💊 **Médicaments** — Produits pharmaceutiques\n🏭 **Primaire** — Matières premières, agriculture\n🔧 **Secondaire** — Industrie, transformation\n💼 **Tertiaire** — Services professionnels\n\n✏️ **Publier une annonce** — Proposez vos produits ou services\n\n📌 Accéder :`,
    links: [{ label: 'Tous les échanges', path: '/echange' }, { label: 'Publier une annonce', path: '/echange/publier' }, { label: 'Nourriture', path: '/echange/nourriture' }]
  },
  {
    keywords: ['science', 'recherche', 'scientifique', 'decouverte', 'découverte', 'laboratoire', 'chercheur'],
    response: `**La page Science** 🔬\n\nEspace dédié aux publications et découvertes scientifiques :\n\n📄 Consultez les publications des scientifiques membres\n🔬 Suivez les recherches en cours\n🧑‍🔬 Connectez-vous avec des chercheurs\n\n📌 Accéder :`,
    links: [{ label: 'Page Science', path: '/science' }]
  },
  {
    keywords: ['education', 'éducation', 'ecole', 'école', 'apprendre', 'cours', 'professeur', 'ia scolaire', 'maths', 'francais', 'français', 'etude', 'étude'],
    response: `**La page Éducation** 🎓\n\nAccès à l'éducation et au Professeur IA :\n\n🤖 **Professeur IA** — Spécialisé en Français et Mathématiques (CP → Terminale)\n   - Posez des questions de cours\n   - Faites des exercices interactifs avec correction automatique\n🏫 Trouvez des établissements scolaires membres\n\n📌 Accéder :`,
    links: [{ label: 'Page Éducation', path: '/education' }, { label: 'Professeur IA', path: '/professeur-ia' }]
  },
  {
    keywords: ['solidarite', 'solidarité', 'aide', 'don', 'humanitaire', 'ong', 'association', 'benevole', 'bénévole'],
    response: `**La page Solidarité** ❤️\n\nEspace dédié à l'entraide et à la solidarité :\n\n🤝 Trouvez des ONG et associations enregistrées\n💝 Faites des dons ou demandez de l'aide\n🌍 Actions humanitaires et communautaires\n\n📌 Accéder :`,
    links: [{ label: 'Page Solidarité', path: '/solidarite' }]
  },
  {
    keywords: ['zaka', 'zakat', 'islam', 'aumone', 'aumône', 'musulman', 'muslim'],
    response: `**La page Zaka (Zakat)** 🕌\n\nSection réservée aux membres de religion Islam :\n\n🕌 Calculez et gérez votre Zakat\n💰 Contributions selon les principes islamiques\n\n⚠️ Accessible uniquement aux profils Islam ou administrateurs.\n\n📌 Accéder :`,
    links: [{ label: 'Page Zaka', path: '/zaka' }]
  },
  {
    keywords: ['terre adam', 'pays', 'lieu', 'residence', 'carte', 'monde', 'territoire', 'geographie', 'géographie', 'region'],
    response: `**La page Terre Adam** 🌍\n\nVisualisez la répartition mondiale des membres :\n\n🗺️ Carte interactive des pays et régions\n📍 Découvrez où vivent les membres de la communauté\n🌐 Statistiques par pays et région\n\n📌 Accéder :`,
    links: [{ label: 'Terre Adam', path: '/terre-adam' }]
  },
  {
    keywords: ['histoire', 'historique', 'humanite', 'humanité', 'civilisation', 'origines', 'a retenir', 'à retenir'],
    response: `**Les pages Histoire** 📜\n\nDécouvrez l'histoire :\n\n🌍 **Histoire de l'Humanité** — 95 générations de G1 à aujourd'hui\n📌 **À Retenir (G96)** — Écrivez votre propre histoire\n\n📌 Accéder :`,
    links: [{ label: "Histoire de l'Humanité", path: '/histoire-humanite' }, { label: 'À Retenir — G96', path: '/a-retenir' }]
  },
  {
    keywords: ['pro', 'professionnel', 'compte pro', 'espace pro', 'inscription pro', 'creer compte pro', 'créer compte pro', 'dashboard pro'],
    response: `**Les Comptes Professionnels** 💼\n\nEnregistrez votre activité sur la plateforme :\n\n🏥 **Santé** — Médecins, cliniques\n🏢 **Activité** — Entreprises, écoles\n🔬 **Science** — Chercheurs\n❤️ **Solidarité** — ONG, associations\n🛡️ **Sécurité** — Agences de sécurité\n🛒 **Échanges** — Fournisseurs, journalistes\n\n✅ **Étapes pour créer un compte pro :**\n1. Cliquez sur "Inscription Professionnelle"\n2. Choisissez votre type de compte\n3. Renseignez les informations de votre organisation\n\n📌 Accéder :`,
    links: [{ label: 'Inscription Professionnelle', path: '/inscription-pro' }, { label: 'Mes Comptes Pro', path: '/mes-comptes-pro' }, { label: 'Liste des professionnels', path: '/professionnels' }]
  },
  {
    keywords: ['mon profil', 'profil', 'modifier profil', 'informations personnelles', 'photo profil', 'mes informations'],
    response: `**Mon Profil & Mon Compte** 👤\n\nGérez vos informations personnelles :\n\n✏️ **Modifier mon profil** — Photo, bio, informations\n🔐 **Mon Compte** — Paramètres et sécurité\n📋 Consultez vos activités et contributions\n\n📌 Accéder :`,
    links: [{ label: 'Mon Compte', path: '/compte' }, { label: 'Mon Profil', path: '/moi/profil' }]
  },
  {
    keywords: ['numeroh', 'numero h', 'numéro h', 'identifiant', 'numero unique', 'numéro unique', 'h-', 'mon numero'],
    response: `**Le Numéro H — Votre identifiant unique** 🆔\n\nChaque membre reçoit un Numéro H unique lors de l'inscription.\n\n- Format : **H-XXXXX** (ex: H-12345)\n- Utilisé pour se connecter (à la place d'un email)\n- Permet de vous retrouver dans l'arbre généalogique\n- Partagez-le avec vos proches pour les lier à votre profil\n\nConservez-le précieusement !`,
    links: []
  },
  {
    keywords: ['galerie', 'photo', 'image', 'album', 'photos famille'],
    response: `**La Galerie Famille** 📸\n\nPartagez et consultez vos photos de famille :\n\n🖼️ Créez des albums photos familiaux\n📤 Partagez des photos avec vos proches\n👨‍👩‍👧 Photos accessibles aux membres de votre famille\n\n📌 Accéder :`,
    links: [{ label: 'Galerie Famille', path: '/galerie-famille' }]
  },
  {
    keywords: ['aide', 'comment', 'utiliser', 'guide', 'tutoriel', 'commencer', 'debut', 'début', 'que faire', 'bonjour', 'salut', 'hello'],
    response: `**Bienvenue sur Moftal !** 🌟\n\nVoici les premières étapes pour bien démarrer :\n\n1️⃣ **Créer votre compte** → Choisissez Vivant ou Défunt\n2️⃣ **Vous connecter** avec votre Numéro H\n3️⃣ **Compléter votre profil**\n4️⃣ **Construire votre arbre familial** → Page Famille\n5️⃣ **Découvrir les services** → Santé, Échanges, Éducation...\n\n💬 Posez-moi n'importe quelle question, je suis là pour vous guider !`,
    links: [{ label: 'Créer un compte', path: '/choix' }, { label: 'Se connecter', path: '/login' }]
  },
];

const QUICK_QUESTIONS = [
  { label: '🔑 Créer un compte', question: 'Comment créer un compte ?' },
  { label: '👨‍👩‍👧 Page Famille', question: 'Comment utiliser la page Famille ?' },
  { label: '🏥 Rendez-vous santé', question: 'Comment prendre un rendez-vous santé ?' },
  { label: '💼 Compte professionnel', question: 'Comment créer un compte professionnel ?' },
  { label: '🎓 Professeur IA', question: 'Comment utiliser le Professeur IA ?' },
  { label: '🛒 Publier une annonce', question: 'Comment publier une annonce dans les échanges ?' },
];

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  links?: { label: string; path: string }[];
  timestamp: Date;
}

let _id = 0;

function normalize(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function findAnswer(question: string) {
  const q = normalize(question);
  for (const entry of SITE_KNOWLEDGE) {
    if (entry.keywords.some(kw => q.includes(normalize(kw)))) {
      return { response: entry.response, links: entry.links };
    }
  }
  return null;
}

function RenderText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, li, arr) => (
        <span key={li}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, pi) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={pi}>{part.slice(2, -2)}</strong>
              : <span key={pi}>{part}</span>
          )}
          {li < arr.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

export function FloatingGuideIA() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: ++_id,
      text: `Bonjour ! Je suis l'**Assistant IA** des **Moftal** 🌳\n\nJe suis ici pour vous guider — pages du site, création de compte, rendez-vous, fonctionnalités...\n\nPosez-moi n'importe quelle question !`,
      isUser: false,
      links: [],
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addBot = (text: string, links: { label: string; path: string }[] = []) => {
    setMessages(prev => [...prev, { id: ++_id, text, isUser: false, links, timestamp: new Date() }]);
  };

  const handleSend = async (questionText?: string) => {
    const q = (questionText ?? input).trim();
    if (!q || loading) return;
    setInput('');
    setShowSuggestions(false);
    setMessages(prev => [...prev, { id: ++_id, text: q, isUser: true, links: [], timestamp: new Date() }]);
    setLoading(true);

    // 1. Réponse locale instantanée
    const local = findAnswer(q);
    if (local) {
      setTimeout(() => { addBot(local.response, local.links); setLoading(false); }, 500);
      return;
    }

    // 2. Fallback API IA
    try {
      const API = import.meta.env.MODE === 'production' ? '' : config.API_BASE_URL;
      const prompt = `Tu es l'Assistant Guide du site "Moftal" (plateforme généalogique et communautaire). Réponds de façon concise et professionnelle à cette question d'un utilisateur : ${q}`;
      const res = await fetch(`${API}/api/ia/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, history: [], lastExercice: null }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.response) {
          addBot(data.response);
          setLoading(false);
          return;
        }
      }
    } catch { /* réseau indisponible */ }

    addBot("Je n'ai pas trouvé de réponse précise. Essayez : **créer un compte**, **page Famille**, **rendez-vous santé**, **compte professionnel**...", []);
    setLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const goTo = (path: string) => { setOpen(false); navigate(path); };

  return (
    <>
      {/* ── Bouton flottant ── */}
      <button
        aria-label="Assistant IA - Guide du site"
        onClick={() => setOpen(o => !o)}
        className="fixed z-[60] flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95 select-none"
        style={{
          bottom: 'max(5rem, calc(env(safe-area-inset-bottom, 0px) + 4rem))',
          right: 'max(1.5rem, env(safe-area-inset-right, 0px))',
          width: 60, height: 60,
          background: 'linear-gradient(135deg,#16a34a 0%,#15803d 50%,#166534 100%)',
          boxShadow: open
            ? '0 8px 32px rgba(22,163,74,0.7)'
            : '0 8px 32px rgba(22,163,74,0.45)',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* ── Tooltip ── */}
      {!open && (
        <div
          className="fixed z-[59] px-3 py-1 rounded-xl text-xs font-semibold text-white pointer-events-none"
          style={{
            bottom: 'calc(max(5rem, calc(env(safe-area-inset-bottom, 0px) + 4rem)) + 68px)',
            right: 'max(1.5rem, env(safe-area-inset-right, 0px))',
            background: 'linear-gradient(135deg,#16a34a,#15803d)',
            whiteSpace: 'nowrap',
            opacity: 0.9,
          }}
        >
          Guide IA
        </div>
      )}

      {/* ── Panel chat ── */}
      {open && (
        <div
          className="fixed z-[59] flex flex-col rounded-2xl overflow-hidden"
          style={{
            bottom: 'calc(max(5rem, calc(env(safe-area-inset-bottom, 0px) + 4rem)) + 72px)',
            right: 'max(1.5rem, env(safe-area-inset-right, 0px))',
            width: 'min(400px, calc(100vw - 2rem))',
            height: 'min(600px, calc(100vh - 120px))',
            background: '#fff',
            border: '1.5px solid rgba(22,163,74,0.25)',
            boxShadow: '0 24px 64px rgba(22,163,74,0.2)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#16a34a 0%,#15803d 100%)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)', fontSize: 20 }}>🌳</div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight">Assistant IA</p>
              <p className="text-green-200 text-[11px]">Moftal • Guide officiel</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-lime-300 animate-pulse" />
                <span className="text-white/80 text-[11px]">En ligne</span>
              </div>
              {/* Bouton X pour fermer */}
              <button
                aria-label="Fermer l'assistant"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center rounded-lg transition-all hover:scale-110 active:scale-95"
                style={{
                  width: 30, height: 30,
                  background: 'rgba(255,255,255,0.2)',
                  border: '1.5px solid rgba(255,255,255,0.5)',
                  marginLeft: 4,
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Zone messages */}
          <div
            className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
            style={{ background: 'linear-gradient(180deg,#f0fdf4 0%,#f7fef9 100%)' }}
          >
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                {!msg.isUser && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5"
                    style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', fontSize: 13 }}
                  >🌿</div>
                )}
                <div className="max-w-[85%] space-y-2">
                  {/* Bulle */}
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.isUser ? 'text-white rounded-tr-sm' : 'text-gray-800 rounded-tl-sm shadow-sm'
                    }`}
                    style={msg.isUser
                      ? { background: 'linear-gradient(135deg,#16a34a,#15803d)' }
                      : { background: '#fff', border: '1px solid rgba(22,163,74,0.15)' }
                    }
                  >
                    <RenderText text={msg.text} />
                  </div>

                  {/* Liens navigables */}
                  {msg.links && msg.links.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-1">
                      {msg.links.map((lnk, i) => (
                        <button
                          key={i}
                          onClick={() => goTo(lnk.path)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all hover:shadow-md active:scale-95"
                          style={{
                            background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)',
                            borderColor: '#86efac',
                            color: '#15803d',
                          }}
                        >
                          {lnk.label} →
                        </button>
                      ))}
                    </div>
                  )}

                  <p className={`text-[10px] px-1 text-gray-400 ${msg.isUser ? 'text-right' : ''}`}>
                    {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Loader */}
            {loading && (
              <div className="flex justify-start">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', fontSize: 13 }}
                >🌿</div>
                <div
                  className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm"
                  style={{ border: '1px solid rgba(22,163,74,0.15)' }}
                >
                  <div className="flex gap-1 items-center">
                    {[0, 150, 300].map(d => (
                      <div
                        key={d}
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{ background: '#16a34a', animationDelay: `${d}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions rapides */}
          {showSuggestions && (
            <div
              className="px-3 py-2 flex-shrink-0 border-t"
              style={{ borderColor: 'rgba(22,163,74,0.15)', background: '#f0fdf4' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#16a34a' }}>
                Questions fréquentes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q.question)}
                    className="px-2.5 py-1.5 text-[11px] font-medium rounded-xl border transition-all hover:shadow-sm active:scale-95"
                    style={{ background: '#fff', borderColor: '#bbf7d0', color: '#15803d' }}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Zone de saisie */}
          <div
            className="px-3 py-3 border-t flex-shrink-0 bg-white"
            style={{ borderColor: 'rgba(22,163,74,0.15)' }}
          >
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Posez votre question..."
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 focus:outline-none transition-colors disabled:opacity-50"
                style={{
                  borderColor: input ? '#16a34a' : '#bbf7d0',
                  background: '#f0fdf4',
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
            <p className="text-center text-[10px] mt-1.5" style={{ color: '#86efac' }}>
              Moftal • Assistant IA
            </p>
          </div>
        </div>
      )}
    </>
  );
}
