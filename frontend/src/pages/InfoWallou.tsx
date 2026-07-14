import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

type CardType =
  | "mariage" | "bapteme" | "deces" | "reunion_physique" | "reunion_ligne" | "sante"
  | "fiancailles" | "naissance" | "commemoration" | "conference" | "webinaire" | "urgence"
  | "anniversaire" | "fete" | "priere" | "aide" | "emploi"
  | "condoleances" | "felicitations" | "remerciement" | "appel_communaute"
  | "temoignage" | "communique" | "demande_pardon";

interface CardState {
  type: CardType;
  photoFF: string | null; photoFB: string | null;
  photoCouple: string | null; photoBebe: string | null;
  photoDefunt: string | null;
  epoux: string; epouse: string;
  prenomBebe: string; parents: string;
  nomDefunt: string;
  rencontreVideo: string | null;
  dateMarriage: string; lieuMarriage: string;
  dateBapteme: string; lieuBapteme: string;
  dateDeces: string; lieuDeces: string;
  dateEnterrement: string; lieuEnterrement: string;
  but: string; agenda: string[];
  dateReunion: string; lieuReunion: string;
  plateforme: string; lienReunion: string;
  videoSante: string | null;
  audioUrl: string | null; audioDuration: number;
  message: string;
  poids: string; taille: string; heureNaissance: string;
  titre: string; photoIntervenant: string | null; nomIntervenant: string;
  typeUrgence: string; etablissement: string;
  // Nouveaux champs
  age: string;
  dateAnniversaire: string;
  typeEvenement: string;
  typeAide: string;
  contact: string;
  posteEmploi: string;
  entreprise: string;
  destinataireNumeroH: string;
}

const defaultCard = (type: CardType): CardState => ({
  type,
  photoFF: null, photoFB: null, photoCouple: null, photoBebe: null, photoDefunt: null,
  epoux: "", epouse: "", prenomBebe: "", parents: "", nomDefunt: "",
  rencontreVideo: null,
  dateMarriage: "", lieuMarriage: "",
  dateBapteme: "", lieuBapteme: "",
  dateDeces: "", lieuDeces: "", dateEnterrement: "", lieuEnterrement: "",
  but: "", agenda: ["", "", "", "", "", ""],
  dateReunion: "", lieuReunion: "", plateforme: "", lienReunion: "",
  videoSante: null,
  audioUrl: null, audioDuration: 0,
  message: "",
  poids: "", taille: "", heureNaissance: "",
  titre: "", photoIntervenant: null, nomIntervenant: "",
  typeUrgence: "", etablissement: "",
  age: "", dateAnniversaire: "",
  typeEvenement: "",
  typeAide: "", contact: "",
  posteEmploi: "", entreprise: "",
  destinataireNumeroH: "",
});

// ─── Photo Slot ──────────────────────────────────────────────────────────────
function Photo({ value, onChange, label }: { value: string | null; onChange: (v: string | null) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => onChange(ev.target?.result as string);
    r.readAsDataURL(f);
  };
  return (
    <div className="relative w-20 h-20 flex-shrink-0 cursor-pointer group" onClick={() => ref.current?.click()}>
      {value
        ? <img src={value} className="w-full h-full object-cover rounded-xl shadow-lg" alt={label} />
        : <div className="w-full h-full rounded-xl border-2 border-dashed border-white/40 bg-white/10 flex flex-col items-center justify-center hover:bg-white/20 transition-colors gap-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/50">
              <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
            </svg>
            <span className="text-[9px] text-white/50 text-center leading-tight px-1">{label}</span>
          </div>
      }
      {value && (
        <button onClick={e => { e.stopPropagation(); onChange(null); }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 shadow font-bold">x</button>
      )}
      <input ref={ref} type="file" accept="image/*" onChange={handle} className="hidden" />
    </div>
  );
}

// ─── Champ texte ─────────────────────────────────────────────────────────────
function Field({ value, onChange, placeholder, className = "" }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`bg-transparent border-b border-white/30 focus:border-white/70 outline-none text-white placeholder-white/35 text-sm py-0.5 w-full ${className}`} />
  );
}

// ─── Label de section (guide visuel) ─────────────────────────────────────────
function Section({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <span className="text-base leading-none">{icon}</span>
      <span className="text-white/60 text-[10px] font-semibold uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ─── Date Row ────────────────────────────────────────────────────────────────
function DateRow({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 border border-white/20">
      <span className="text-sm">📅</span>
      <span className="text-white/60 text-xs flex-shrink-0">{label}</span>
      <input type="date" value={value} onChange={e => onChange(e.target.value)}
        className="bg-transparent outline-none text-white text-xs flex-1 min-w-0" />
    </div>
  );
}

function DateTimeRow({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 border border-white/20">
      <span className="text-sm">🕐</span>
      <span className="text-white/60 text-xs flex-shrink-0">{label}</span>
      <input type="datetime-local" value={value} onChange={e => onChange(e.target.value)}
        className="bg-transparent outline-none text-white text-xs flex-1 min-w-0" />
    </div>
  );
}

function LieuRow({ value, onChange, placeholder = "Lieu" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 border border-white/20">
      <span className="text-sm">📍</span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="bg-transparent outline-none text-white placeholder-white/35 text-xs flex-1" />
    </div>
  );
}

// ─── Messages prédéfinis (accessible aux non-lecteurs) ───────────────────────
function MessagePicker({ suggestions, value, onChange }: { suggestions: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map(s => (
          <button key={s} onClick={() => onChange(value === s ? "" : s)}
            className={`px-2.5 py-1.5 rounded-full text-xs border transition-all ${value === s ? "bg-white/35 border-white/60 text-white font-semibold" : "bg-white/10 border-white/25 text-white/65 hover:bg-white/20"}`}>
            {s}
          </button>
        ))}
      </div>
      <textarea value={value} onChange={e => onChange(e.target.value)}
        placeholder="Ou tapez votre message..."
        rows={2}
        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 outline-none text-white placeholder-white/30 text-xs resize-none" />
    </div>
  );
}

// ─── Micro ───────────────────────────────────────────────────────────────────
function Mic({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  const [rec, setRec] = useState(false);
  const [sec, setSec] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      recRef.current = mr;
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const r = new FileReader();
        r.onload = ev => setCard(p => ({ ...p, audioUrl: ev.target?.result as string, audioDuration: sec }));
        r.readAsDataURL(blob);
      };
      mr.start(); setRec(true); setSec(0);
      timerRef.current = setInterval(() => setSec(s => { if (s >= 59) { stop(); return 60; } return s + 1; }), 1000);
    } catch { alert("Microphone inaccessible."); }
  }, [sec]);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    recRef.current?.stop(); setRec(false);
  }, []);

  if (card.audioUrl) return (
    <div className="flex items-center gap-2">
      <audio src={card.audioUrl} controls className="h-8 flex-1" style={{ minWidth: 0 }} />
      <button onClick={() => setCard(p => ({ ...p, audioUrl: null }))}
        className="text-red-300 text-sm flex-shrink-0 font-bold w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">x</button>
    </div>
  );

  return (
    <button onClick={rec ? stop : start}
      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${rec ? "bg-red-500 text-white animate-pulse" : "bg-white/20 hover:bg-white/30 text-white border border-white/25"}`}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm6 10a1 1 0 0 1 2 0 8 8 0 0 1-7 7.94V21h2a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2h2v-2.06A8 8 0 0 1 4 11a1 1 0 0 1 2 0 6 6 0 0 0 12 0z"/>
      </svg>
      {rec ? `${sec}s — Appuyer pour stopper` : "🎤  Message vocal (cliquer pour enregistrer)"}
    </button>
  );
}

// ─── Vidéo slot ──────────────────────────────────────────────────────────────
function VideoSlot({ value, onChange, label = "Ajouter une video (max 1 min)" }: { value: string | null; onChange: (v: string | null) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const v = document.createElement("video"); v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      if (v.duration > 30) { alert("La vidéo ne doit pas dépasser 1 minute."); return; }
      const r = new FileReader();
      r.onload = ev => onChange(ev.target?.result as string);
      r.readAsDataURL(f);
    };
    v.src = URL.createObjectURL(f);
  };
  return (
    <div className="relative">
      {value
        ? <>
            <video src={value} controls className="w-full rounded-xl" style={{ maxHeight: 100 }} />
            <button onClick={() => onChange(null)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center">x</button>
          </>
        : <button onClick={() => ref.current?.click()}
            className="w-full h-16 rounded-xl border-2 border-dashed border-white/35 bg-white/10 hover:bg-white/20 flex items-center justify-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-medium">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
            {label}
          </button>
      }
      <input ref={ref} type="file" accept="video/*" onChange={handle} className="hidden" />
    </div>
  );
}

// ─── En-tete commun ───────────────────────────────────────────────────────────
function CardHeader({ title, emoji, subtitle }: { title: string; emoji: string; subtitle?: string }) {
  return (
    <div className="px-4 py-3 flex items-center justify-between border-b border-white/20">
      <div>
        <p className="text-[9px] tracking-[2px] text-white/40 uppercase">Moftal Info</p>
        <h2 className="text-xl font-black text-white leading-tight">{title}</h2>
        {subtitle && <p className="text-white/55 text-xs mt-0.5">{subtitle}</p>}
      </div>
      <span className="text-4xl">{emoji}</span>
    </div>
  );
}

// ─── Diagramme Soleil ─────────────────────────────────────────────────────────
function SunDiagram({ agenda, setAgenda, but, setBut }: { agenda: string[]; setAgenda: (a: string[]) => void; but: string; setBut: (v: string) => void }) {
  const W = 260; const H = 230;
  const cx = W / 2; const cy = H / 2;
  const rc = 28; const R = 88;
  const angles = [-90, -30, 30, 90, 150, 210];
  const pts = angles.map(deg => {
    const rad = deg * Math.PI / 180;
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad), lx: cx + rc * Math.cos(rad), ly: cy + rc * Math.sin(rad) };
  });
  return (
    <div className="relative mx-auto" style={{ width: W, height: H }}>
      <svg className="absolute inset-0 pointer-events-none" width={W} height={H}>
        {pts.map((p, i) => <line key={i} x1={p.lx} y1={p.ly} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />)}
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="rgba(255,255,255,0.45)" />)}
        <circle cx={cx} cy={cy} r={rc} fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ left: cx - 26, top: cy - 14, width: 52 }}>
        <span className="text-white text-[9px] font-black opacity-60">BUT</span>
        <input type="text" value={but} onChange={e => setBut(e.target.value)} placeholder="Objectif"
          className="w-full bg-transparent text-white text-[8px] text-center outline-none placeholder-white/25 leading-tight" />
      </div>
      {pts.map((p, i) => (
        <div key={i} className="absolute" style={{ left: p.x - 32, top: p.y - 10, width: 64 }}>
          <input type="text" value={agenda[i] || ""} onChange={e => { const a = [...agenda]; a[i] = e.target.value; setAgenda(a); }}
            placeholder={`Point ${i + 1}`}
            className="w-full bg-transparent border-b border-white/25 text-white text-[9px] text-center outline-none placeholder-white/20" />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARREAUX EXISTANTS (ameliores)
// ═══════════════════════════════════════════════════════════════════════════════

function CarreauMariage({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#7c1d3f,#be185d,#831843)" }}>
      <CardHeader title="Mariage" emoji="💍" subtitle="Annonce de mariage" />

      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="👨‍👩‍👧" label="Familles" />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center gap-1">
            <Photo value={card.photoFF} onChange={v => setCard(p => ({ ...p, photoFF: v }))} label="Famille de la fille" />
            <span className="text-white/40 text-[10px] text-center">Famille fille</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Photo value={card.photoFB} onChange={v => setCard(p => ({ ...p, photoFB: v }))} label="Famille du garcon" />
            <span className="text-white/40 text-[10px] text-center">Famille garcon</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="💑" label="Les maries" />
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-1 flex-1">
            <Photo value={card.photoCouple} onChange={v => setCard(p => ({ ...p, photoCouple: v }))} label="La fille" />
            <Field value={card.epouse} onChange={v => setCard(p => ({ ...p, epouse: v }))} placeholder="Prenom fille" className="text-center text-sm" />
          </div>
          <span className="text-white text-2xl font-black bg-white/20 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">=</span>
          <div className="flex flex-col items-center gap-1 flex-1">
            <Photo value={card.photoBebe} onChange={v => setCard(p => ({ ...p, photoBebe: v }))} label="Le garcon" />
            <Field value={card.epoux} onChange={v => setCard(p => ({ ...p, epoux: v }))} placeholder="Prenom garcon" className="text-center text-sm" />
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="🎬" label="Rencontre entre parents" />
        <div className="space-y-2">
          <VideoSlot value={card.rencontreVideo} onChange={v => setCard(p => ({ ...p, rencontreVideo: v }))} label="Video de la rencontre" />
          <Mic card={card} setCard={setCard} />
        </div>
      </div>

      <div className="px-4 py-3 space-y-2">
        <Section icon="📅" label="Date et lieu" />
        <DateRow value={card.dateMarriage} onChange={v => setCard(p => ({ ...p, dateMarriage: v }))} label="Date du mariage" />
        <LieuRow value={card.lieuMarriage} onChange={v => setCard(p => ({ ...p, lieuMarriage: v }))} placeholder="Lieu de la ceremonie" />
      </div>
    </div>
  );
}

function CarreauBapteme({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  const genre = card.message === "fille" || card.message === "garcon" ? card.message : null;
  const isFille = genre === "fille"; const isGarcon = genre === "garcon";
  const bg = isFille ? "linear-gradient(135deg,#831843,#db2777,#9d174d)" : isGarcon ? "linear-gradient(135deg,#1e3a5f,#1d4ed8,#1e3a5f)" : "linear-gradient(135deg,#0c4a6e,#0284c7,#075985)";
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: bg }}>
      <CardHeader title="Bapteme" emoji="👶" subtitle="Annonce de bapteme" />

      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="👶" label="L'enfant" />
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <div className="relative">
              <Photo value={card.photoBebe} onChange={v => setCard(p => ({ ...p, photoBebe: v }))} label="Photo bebe" />
              {genre && (
                <div className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-sm shadow border border-white/30 ${isFille ? "bg-pink-400" : "bg-blue-400"}`}>
                  {isFille ? "🎀" : "👦"}
                </div>
              )}
            </div>
            <Field value={card.prenomBebe} onChange={v => setCard(p => ({ ...p, prenomBebe: v }))} placeholder="Prenom" className="text-center w-20 font-bold" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <button onClick={() => setCard(p => ({ ...p, message: "fille" }))}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isFille ? "bg-pink-400 border-pink-300 text-white" : "bg-white/10 border-white/20 text-white/60"}`}>
                🎀 Fille
              </button>
              <button onClick={() => setCard(p => ({ ...p, message: "garcon" }))}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isGarcon ? "bg-blue-400 border-blue-300 text-white" : "bg-white/10 border-white/20 text-white/60"}`}>
                👦 Garcon
              </button>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Photo value={card.photoCouple} onChange={v => setCard(p => ({ ...p, photoCouple: v }))} label="Photo parents" />
              <Field value={card.parents} onChange={v => setCard(p => ({ ...p, parents: v }))} placeholder="Noms des parents" className="text-center text-sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="🎤" label="Message vocal" />
        <Mic card={card} setCard={setCard} />
      </div>

      <div className="px-4 py-3 space-y-2">
        <Section icon="📅" label="Date et lieu" />
        <DateRow value={card.dateBapteme} onChange={v => setCard(p => ({ ...p, dateBapteme: v }))} label="Date du bapteme" />
        <LieuRow value={card.lieuBapteme} onChange={v => setCard(p => ({ ...p, lieuBapteme: v }))} placeholder="Lieu de la ceremonie" />
      </div>
    </div>
  );
}

function CarreauDeces({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  const condoleances = ["Nos sinceres condoleances", "Que son ame repose en paix", "Que Dieu accueille son ame", "Nous partageons votre douleur", "Priez pour lui/elle"];
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#1c1917,#44403c,#292524)" }}>
      <CardHeader title="Deces" emoji="🕯️" subtitle="Avis de deces" />

      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="🖼️" label="Le defunt(e)" />
        <div className="flex gap-4 items-center">
          <Photo value={card.photoDefunt} onChange={v => setCard(p => ({ ...p, photoDefunt: v }))} label="Photo" />
          <div className="flex-1 space-y-2">
            <Field value={card.nomDefunt} onChange={v => setCard(p => ({ ...p, nomDefunt: v }))} placeholder="Nom et prenom complet" className="font-bold text-base" />
            <DateRow value={card.dateDeces} onChange={v => setCard(p => ({ ...p, dateDeces: v }))} label="Deces le" />
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="💬" label="Message de condoleances" />
        <div className="flex justify-center text-2xl mb-2">🌹</div>
        <MessagePicker suggestions={condoleances} value={card.message} onChange={v => setCard(p => ({ ...p, message: v }))} />
      </div>

      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="🎤" label="Message vocal" />
        <Mic card={card} setCard={setCard} />
      </div>

      <div className="px-4 py-3 space-y-2">
        <Section icon="📅" label="Enterrement" />
        <DateRow value={card.dateEnterrement} onChange={v => setCard(p => ({ ...p, dateEnterrement: v }))} label="Date enterrement" />
        <LieuRow value={card.lieuEnterrement} onChange={v => setCard(p => ({ ...p, lieuEnterrement: v }))} placeholder="Lieu de l'enterrement" />
        <LieuRow value={card.lieuDeces} onChange={v => setCard(p => ({ ...p, lieuDeces: v }))} placeholder="Lieu du deces" />
      </div>
    </div>
  );
}

function CarreauReunionPhysique({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#78350f,#d97706,#92400e)" }}>
      <CardHeader title="Reunion Physique" emoji="🤝" subtitle="Invitation a une reunion" />
      <div className="border-b border-white/15">
        <SunDiagram but={card.but} setBut={v => setCard(p => ({ ...p, but: v }))}
          agenda={card.agenda} setAgenda={a => setCard(p => ({ ...p, agenda: a }))} />
      </div>
      <div className="px-4 py-3 space-y-2">
        <Section icon="📅" label="Quand et ou" />
        <DateTimeRow value={card.dateReunion} onChange={v => setCard(p => ({ ...p, dateReunion: v }))} label="Date et heure" />
        <LieuRow value={card.lieuReunion} onChange={v => setCard(p => ({ ...p, lieuReunion: v }))} placeholder="Adresse de la reunion" />
      </div>
    </div>
  );
}

function CarreauReunionLigne({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#3b0764,#7c3aed,#4c1d95)" }}>
      <CardHeader title="Reunion en Ligne" emoji="💻" subtitle="Connexion a distance" />
      <div className="border-b border-white/15">
        <SunDiagram but={card.but} setBut={v => setCard(p => ({ ...p, but: v }))}
          agenda={card.agenda} setAgenda={a => setCard(p => ({ ...p, agenda: a }))} />
      </div>
      <div className="px-4 py-3 border-b border-white/15 space-y-2">
        <Section icon="📡" label="Plateforme et lien" />
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 border border-white/20">
          <span className="text-sm">📡</span>
          <input type="text" value={card.plateforme} onChange={e => setCard(p => ({ ...p, plateforme: e.target.value }))}
            placeholder="Zoom, Teams, WhatsApp..." className="bg-transparent outline-none text-white placeholder-white/30 text-sm flex-1" />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 border border-white/20">
          <span className="text-sm">🔗</span>
          <input type="text" value={card.lienReunion} onChange={e => setCard(p => ({ ...p, lienReunion: e.target.value }))}
            placeholder="Lien de connexion" className="bg-transparent outline-none text-white placeholder-white/30 text-sm flex-1" />
        </div>
      </div>
      <div className="px-4 py-3">
        <Section icon="📅" label="Date et heure" />
        <DateTimeRow value={card.dateReunion} onChange={v => setCard(p => ({ ...p, dateReunion: v }))} label="Date/heure" />
      </div>
    </div>
  );
}

function CarreauSante({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#14532d,#1a8f1a,#0f4b0f)" }}>
      <CardHeader title="Sante" emoji="🏥" subtitle="Information de sante" />
      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="🎬" label="Video d'information (max 30s)" />
        <VideoSlot value={card.videoSante} onChange={v => setCard(p => ({ ...p, videoSante: v }))} label="Ajouter une video" />
      </div>
      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="🎤" label="Message vocal" />
        <Mic card={card} setCard={setCard} />
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/15 border border-white/20">
          <span className="text-white/60 text-xs">Date (automatique)</span>
          <span className="text-white text-sm font-bold">{new Date().toLocaleDateString("fr-FR")}</span>
        </div>
      </div>
    </div>
  );
}

function CarreauFiancailles({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  const msgs = ["Nous sommes fiances !", "Bientot maries", "Priez pour nous", "Que Dieu benisse notre union"];
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#78350f,#b45309,#92400e)" }}>
      <CardHeader title="Fiancailles" emoji="💛" subtitle="Annonce de fiancailles" />
      <div className="px-4 py-3 flex items-center justify-around border-b border-white/15">
        <div className="flex flex-col items-center gap-1">
          <Photo value={card.photoFF} onChange={v => setCard(p => ({ ...p, photoFF: v }))} label="Elle" />
          <Field value={card.epouse} onChange={v => setCard(p => ({ ...p, epouse: v }))} placeholder="Son prenom" className="text-center w-20 font-semibold" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-4xl">💛</span>
          <span className="text-white/30 text-xs">pour toujours</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Photo value={card.photoFB} onChange={v => setCard(p => ({ ...p, photoFB: v }))} label="Lui" />
          <Field value={card.epoux} onChange={v => setCard(p => ({ ...p, epoux: v }))} placeholder="Son prenom" className="text-center w-20 font-semibold" />
        </div>
      </div>
      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="💬" label="Message" />
        <MessagePicker suggestions={msgs} value={card.message} onChange={v => setCard(p => ({ ...p, message: v }))} />
      </div>
      <div className="px-4 py-2 border-b border-white/15">
        <Mic card={card} setCard={setCard} />
      </div>
      <div className="px-4 py-3 space-y-2">
        <DateRow value={card.dateMarriage} onChange={v => setCard(p => ({ ...p, dateMarriage: v }))} label="Ceremonie" />
        <LieuRow value={card.lieuMarriage} onChange={v => setCard(p => ({ ...p, lieuMarriage: v }))} placeholder="Lieu de la fete" />
      </div>
    </div>
  );
}

function CarreauNaissance({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#713f12,#ca8a04,#78350f)" }}>
      <CardHeader title="Naissance" emoji="🌟" subtitle="Annonce de naissance" />
      <div className="px-4 py-3 flex gap-4 items-start border-b border-white/15">
        <div className="flex flex-col items-center gap-1">
          <Photo value={card.photoBebe} onChange={v => setCard(p => ({ ...p, photoBebe: v }))} label="Photo bebe" />
          <Field value={card.prenomBebe} onChange={v => setCard(p => ({ ...p, prenomBebe: v }))} placeholder="Prenom" className="text-center w-20 font-bold text-sm" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 border border-white/20">
            <span className="text-sm">⚖️</span>
            <input type="text" value={card.poids} onChange={e => setCard(p => ({ ...p, poids: e.target.value }))}
              placeholder="Poids (ex: 3.2 kg)" className="bg-transparent outline-none text-white placeholder-white/30 text-sm flex-1" />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 border border-white/20">
            <span className="text-sm">📏</span>
            <input type="text" value={card.taille} onChange={e => setCard(p => ({ ...p, taille: e.target.value }))}
              placeholder="Taille (ex: 50 cm)" className="bg-transparent outline-none text-white placeholder-white/30 text-sm flex-1" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <Photo value={card.photoCouple} onChange={v => setCard(p => ({ ...p, photoCouple: v }))} label="Parents" />
            <Field value={card.parents} onChange={v => setCard(p => ({ ...p, parents: v }))} placeholder="Noms des parents" className="text-center text-xs" />
          </div>
        </div>
      </div>
      <div className="px-4 py-3 space-y-2">
        <Section icon="📅" label="Naissance" />
        <DateRow value={card.dateBapteme} onChange={v => setCard(p => ({ ...p, dateBapteme: v }))} label="Nee le" />
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 border border-white/20">
          <span className="text-sm">🕐</span>
          <span className="text-white/60 text-xs">Heure</span>
          <input type="time" value={card.heureNaissance} onChange={e => setCard(p => ({ ...p, heureNaissance: e.target.value }))}
            className="bg-transparent outline-none text-white text-xs flex-1" />
        </div>
        <LieuRow value={card.lieuBapteme} onChange={v => setCard(p => ({ ...p, lieuBapteme: v }))} placeholder="Maternite / Hopital" />
      </div>
    </div>
  );
}

function CarreauCommemoration({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  const hommages = ["Tu nous manques", "On ne t'oublie jamais", "Ton souvenir reste dans nos coeurs", "Que Dieu garde ton ame", "En ta memoire"];
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81,#1e1b4b)" }}>
      <CardHeader title="Commemoration" emoji="🕊️" subtitle="En memoire de..." />
      <div className="px-4 py-3 flex gap-4 border-b border-white/15">
        <Photo value={card.photoDefunt} onChange={v => setCard(p => ({ ...p, photoDefunt: v }))} label="Photo" />
        <div className="flex-1 space-y-2">
          <Field value={card.nomDefunt} onChange={v => setCard(p => ({ ...p, nomDefunt: v }))} placeholder="Nom du defunt(e)" className="font-bold text-base" />
          <DateRow value={card.dateDeces} onChange={v => setCard(p => ({ ...p, dateDeces: v }))} label="Decede le" />
        </div>
      </div>
      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="💬" label="Hommage" />
        <div className="flex justify-center text-2xl mb-2">🕊️</div>
        <MessagePicker suggestions={hommages} value={card.message} onChange={v => setCard(p => ({ ...p, message: v }))} />
      </div>
      <div className="px-4 py-2 border-b border-white/15">
        <Mic card={card} setCard={setCard} />
      </div>
      <div className="px-4 py-3 space-y-2">
        <DateRow value={card.dateEnterrement} onChange={v => setCard(p => ({ ...p, dateEnterrement: v }))} label="Ceremonie" />
        <LieuRow value={card.lieuDeces} onChange={v => setCard(p => ({ ...p, lieuDeces: v }))} placeholder="Lieu de la commemoration" />
      </div>
    </div>
  );
}

function CarreauConference({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#093809,#156315,#0f4b0f)" }}>
      <CardHeader title="Conference" emoji="🎙️" subtitle="Invitation a une conference" />
      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="📌" label="Titre de la conference" />
        <input type="text" value={card.titre} onChange={e => setCard(p => ({ ...p, titre: e.target.value }))}
          placeholder="Titre de la conference"
          className="bg-transparent border-b border-white/30 focus:border-white/70 outline-none text-white placeholder-white/30 text-base font-bold w-full text-center py-1" />
      </div>
      <div className="px-4 py-3 flex gap-3 items-center border-b border-white/15">
        <div className="flex flex-col items-center gap-1">
          <Photo value={card.photoIntervenant} onChange={v => setCard(p => ({ ...p, photoIntervenant: v }))} label="Intervenant" />
          <span className="text-white/40 text-[10px] text-center">Orateur</span>
        </div>
        <div className="flex-1 space-y-2">
          <Field value={card.nomIntervenant} onChange={v => setCard(p => ({ ...p, nomIntervenant: v }))} placeholder="Nom de l'orateur" className="font-semibold" />
          <Field value={card.but} onChange={v => setCard(p => ({ ...p, but: v }))} placeholder="Theme / Sujet" />
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/15 border border-white/20">
            <span className="text-sm">🪑</span>
            <input type="text" value={card.message} onChange={e => setCard(p => ({ ...p, message: e.target.value }))}
              placeholder="Entree libre / Capacite" className="bg-transparent outline-none text-white placeholder-white/30 text-xs flex-1" />
          </div>
        </div>
      </div>
      <div className="px-4 py-3 space-y-2">
        <Section icon="📅" label="Date et lieu" />
        <DateTimeRow value={card.dateReunion} onChange={v => setCard(p => ({ ...p, dateReunion: v }))} label="Date et heure" />
        <LieuRow value={card.lieuReunion} onChange={v => setCard(p => ({ ...p, lieuReunion: v }))} placeholder="Salle / Lieu" />
      </div>
    </div>
  );
}

function CarreauWebinaire({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#1e1b4b,#4338ca,#312e81)" }}>
      <CardHeader title="Webinaire" emoji="📡" subtitle="Evenement en ligne" />
      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="📌" label="Titre" />
        <input type="text" value={card.titre} onChange={e => setCard(p => ({ ...p, titre: e.target.value }))}
          placeholder="Titre du webinaire"
          className="bg-transparent border-b border-white/30 focus:border-white/70 outline-none text-white placeholder-white/30 text-base font-bold w-full text-center py-1" />
      </div>
      <div className="px-4 py-3 flex gap-3 items-center border-b border-white/15">
        <div className="flex flex-col items-center gap-1">
          <Photo value={card.photoIntervenant} onChange={v => setCard(p => ({ ...p, photoIntervenant: v }))} label="Orateur" />
          <span className="text-white/40 text-[10px]">Orateur</span>
        </div>
        <div className="flex-1 space-y-2">
          <Field value={card.nomIntervenant} onChange={v => setCard(p => ({ ...p, nomIntervenant: v }))} placeholder="Nom de l'orateur" className="font-semibold" />
          <Field value={card.but} onChange={v => setCard(p => ({ ...p, but: v }))} placeholder="Sujet aborde" />
        </div>
      </div>
      <div className="px-4 py-3 border-b border-white/15 space-y-2">
        <Section icon="📡" label="Acces en ligne" />
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 border border-white/20">
          <span className="text-sm">📡</span>
          <input type="text" value={card.plateforme} onChange={e => setCard(p => ({ ...p, plateforme: e.target.value }))}
            placeholder="Zoom, Teams, YouTube..." className="bg-transparent outline-none text-white placeholder-white/30 text-sm flex-1" />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 border border-white/20">
          <span className="text-sm">🔗</span>
          <input type="text" value={card.lienReunion} onChange={e => setCard(p => ({ ...p, lienReunion: e.target.value }))}
            placeholder="Lien d'inscription" className="bg-transparent outline-none text-white placeholder-white/30 text-sm flex-1" />
        </div>
      </div>
      <div className="px-4 py-3">
        <DateTimeRow value={card.dateReunion} onChange={v => setCard(p => ({ ...p, dateReunion: v }))} label="Date et heure" />
      </div>
    </div>
  );
}

function CarreauUrgence({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  const types = ["Accident", "Epidemie", "Incendie", "Inondation", "Blessure grave", "Malaise", "Autre urgence"];
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#450a0a,#b91c1c,#7f1d1d)" }}>
      <CardHeader title="Urgence Medicale" emoji="🚨" subtitle="Alerte — Agir vite" />
      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="🆘" label="Type d'urgence" />
        <div className="flex flex-wrap gap-1.5 mb-2">
          {types.map(t => (
            <button key={t} onClick={() => setCard(p => ({ ...p, typeUrgence: t }))}
              className={`px-2.5 py-1.5 rounded-lg text-xs border font-medium transition-all ${card.typeUrgence === t ? "bg-red-500 border-red-400 text-white" : "bg-white/10 border-white/25 text-white/65 hover:bg-white/20"}`}>
              {t}
            </button>
          ))}
        </div>
        <Field value={card.typeUrgence} onChange={v => setCard(p => ({ ...p, typeUrgence: v }))} placeholder="Ou precisez le type d'urgence..." className="font-bold text-sm" />
      </div>
      <div className="px-4 py-3 border-b border-white/15 space-y-2">
        <Section icon="🏥" label="Etablissement et lieu" />
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 border border-white/20">
          <span className="text-sm">🏥</span>
          <input type="text" value={card.etablissement} onChange={e => setCard(p => ({ ...p, etablissement: e.target.value }))}
            placeholder="Hopital / Clinique / Contact" className="bg-transparent outline-none text-white placeholder-white/30 text-sm flex-1" />
        </div>
        <LieuRow value={card.lieuDeces} onChange={v => setCard(p => ({ ...p, lieuDeces: v }))} placeholder="Lieu de l'urgence" />
      </div>
      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="📝" label="Instructions a suivre" />
        <textarea value={card.message} onChange={e => setCard(p => ({ ...p, message: e.target.value }))}
          placeholder="Consignes importantes..."
          rows={2}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 outline-none text-white placeholder-white/30 text-sm resize-none" />
      </div>
      <div className="px-4 py-2 border-b border-white/15">
        <Mic card={card} setCard={setCard} />
      </div>
      <div className="px-4 py-3">
        <DateTimeRow value={card.dateReunion} onChange={v => setCard(p => ({ ...p, dateReunion: v }))} label="Date et heure" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOUVEAUX CARREAUX
// ═══════════════════════════════════════════════════════════════════════════════

function CarreauAnniversaire({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  const msgs = ["🎂 Joyeux Anniversaire !", "Que Dieu te benisse encore longtemps", "Belle sante et longue vie !", "Beaucoup de bonheur et de reussite", "Nous t'aimons fort", "Que cette annee soit benie"];
  const isFille = card.but === "fille"; const isGarcon = card.but === "garcon";
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#4c1d95,#7c3aed,#5b21b6)" }}>
      <CardHeader title="Anniversaire" emoji="🎂" subtitle="Celebration d'anniversaire" />

      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="🎉" label="La personne" />
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <Photo value={card.photoBebe} onChange={v => setCard(p => ({ ...p, photoBebe: v }))} label="Photo" />
          </div>
          <div className="flex-1 space-y-2">
            <Field value={card.prenomBebe} onChange={v => setCard(p => ({ ...p, prenomBebe: v }))} placeholder="Prenom / Nom" className="text-lg font-bold" />
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 border border-white/20">
              <span className="text-sm">🎂</span>
              <input type="number" value={card.age} onChange={e => setCard(p => ({ ...p, age: e.target.value }))}
                placeholder="Age" min="1" max="120"
                className="bg-transparent outline-none text-white placeholder-white/30 text-sm flex-1 w-12" />
              <span className="text-white/50 text-xs">ans</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCard(p => ({ ...p, but: p.but === "fille" ? "" : "fille" }))}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isFille ? "bg-pink-400 border-pink-300 text-white" : "bg-white/10 border-white/20 text-white/60"}`}>
                🎀 Fille
              </button>
              <button onClick={() => setCard(p => ({ ...p, but: p.but === "garcon" ? "" : "garcon" }))}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isGarcon ? "bg-blue-400 border-blue-300 text-white" : "bg-white/10 border-white/20 text-white/60"}`}>
                👦 Garcon
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="💬" label="Message de voeux" />
        <MessagePicker suggestions={msgs} value={card.message} onChange={v => setCard(p => ({ ...p, message: v }))} />
      </div>

      <div className="px-4 py-2 border-b border-white/15">
        <Mic card={card} setCard={setCard} />
      </div>

      <div className="px-4 py-3 space-y-2">
        <Section icon="📅" label="Date et lieu" />
        <DateRow value={card.dateAnniversaire} onChange={v => setCard(p => ({ ...p, dateAnniversaire: v }))} label="Le" />
        <LieuRow value={card.lieuMarriage} onChange={v => setCard(p => ({ ...p, lieuMarriage: v }))} placeholder="Lieu de la fete" />
      </div>
    </div>
  );
}

function CarreauFete({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  const types = ["🎉 Soiree", "🏆 Victoire sportive", "🎓 Diplome", "🏠 Inauguration maison", "✈️ Depart voyage", "🎊 Succes professionnel", "👔 Promotion", "🙏 Action de grace", "💼 Creation d'entreprise", "🎁 Occasion speciale"];
  const msgs = ["Venez nombreux feter avec nous !", "Soyez les bienvenus", "C'est la fete, rejoignez-nous", "Ensemble pour celebrer ce beau moment", "Votre presence nous ferait honneur"];
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#093809,#1a8f1a,#0f4b0f)" }}>
      <CardHeader title="Fete & Celebration" emoji="🎉" subtitle="Invitation a la fete" />

      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="✨" label="Quel type d'evenement ?" />
        <div className="flex flex-wrap gap-1.5">
          {types.map(t => (
            <button key={t} onClick={() => setCard(p => ({ ...p, typeEvenement: p.typeEvenement === t ? "" : t }))}
              className={`px-2.5 py-1.5 rounded-lg text-xs border font-medium transition-all ${card.typeEvenement === t ? "bg-white/35 border-white/60 text-white" : "bg-white/10 border-white/25 text-white/65 hover:bg-white/20"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 flex items-center gap-4 border-b border-white/15">
        <div className="flex flex-col items-center gap-1">
          <Photo value={card.photoBebe} onChange={v => setCard(p => ({ ...p, photoBebe: v }))} label="Photo" />
        </div>
        <div className="flex-1 space-y-2">
          <Field value={card.prenomBebe} onChange={v => setCard(p => ({ ...p, prenomBebe: v }))} placeholder="Nom / Personne concernee" className="font-bold text-base" />
          <Field value={card.parents} onChange={v => setCard(p => ({ ...p, parents: v }))} placeholder="Organise par..." />
        </div>
      </div>

      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="💬" label="Message d'invitation" />
        <MessagePicker suggestions={msgs} value={card.message} onChange={v => setCard(p => ({ ...p, message: v }))} />
      </div>

      <div className="px-4 py-2 border-b border-white/15">
        <Mic card={card} setCard={setCard} />
      </div>

      <div className="px-4 py-3 space-y-2">
        <Section icon="📅" label="Date et lieu" />
        <DateTimeRow value={card.dateReunion} onChange={v => setCard(p => ({ ...p, dateReunion: v }))} label="Quand" />
        <LieuRow value={card.lieuReunion} onChange={v => setCard(p => ({ ...p, lieuReunion: v }))} placeholder="Adresse / Maison / Salle" />
      </div>
    </div>
  );
}

function CarreauPriere({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  const types = ["🙏 Priere generale", "⚡ Intercession urgente", "🕯️ Veille de nuit", "🍞 Jeune et priere", "🙌 Action de grace", "📖 Etude biblique / Cours coranique", "🎶 Louange et adoration", "👶 Dedicace d'enfant"];
  const msgs = ["Venez nombreux prier 🙏", "Tous sont les bienvenus", "Entree libre, soyez presents", "La priere change tout", "Priez pour nous et nos familles", "Que Dieu nous rassemble"];
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#1e3a5f,#1d4ed8,#1e3a5f)" }}>
      <CardHeader title="Priere / Culte" emoji="🙏" subtitle="Invitation spirituelle" />

      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="✨" label="Type de rassemblement" />
        <div className="flex flex-wrap gap-1.5">
          {types.map(t => (
            <button key={t} onClick={() => setCard(p => ({ ...p, typeEvenement: p.typeEvenement === t ? "" : t }))}
              className={`px-2.5 py-1.5 rounded-lg text-xs border font-medium transition-all ${card.typeEvenement === t ? "bg-white/35 border-white/60 text-white" : "bg-white/10 border-white/25 text-white/65 hover:bg-white/20"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="📖" label="Theme ou message spirituel" />
        <Field value={card.titre} onChange={v => setCard(p => ({ ...p, titre: v }))} placeholder="Theme de la priere / Sujet..." className="text-sm font-semibold mb-3" />
        <MessagePicker suggestions={msgs} value={card.message} onChange={v => setCard(p => ({ ...p, message: v }))} />
      </div>

      <div className="px-4 py-2 border-b border-white/15">
        <Mic card={card} setCard={setCard} />
      </div>

      <div className="px-4 py-3 space-y-2">
        <Section icon="📅" label="Date et lieu" />
        <DateTimeRow value={card.dateReunion} onChange={v => setCard(p => ({ ...p, dateReunion: v }))} label="Date et heure" />
        <LieuRow value={card.lieuReunion} onChange={v => setCard(p => ({ ...p, lieuReunion: v }))} placeholder="Eglise / Mosquee / Maison" />
      </div>
    </div>
  );
}

function CarreauAide({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  const types = ["🩸 Don de sang", "💊 Medicaments", "🍞 Nourriture", "💰 Collecte de fonds", "🏥 Transport medical", "📦 Vetements", "🏠 Hebergement", "📚 Fournitures scolaires", "💧 Eau potable", "🔧 Ouvriers / Aide physique"];
  const niveaux = ["⚡ Tres urgent", "📌 Important", "ℹ️ Normal"];
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#7c2d12,#ea580c,#9a3412)" }}>
      <CardHeader title="Aide Communautaire" emoji="🤲" subtitle="Appel a l'aide" />

      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="🆘" label="De quoi avez-vous besoin ?" />
        <div className="flex flex-wrap gap-1.5">
          {types.map(t => (
            <button key={t} onClick={() => setCard(p => ({ ...p, typeAide: p.typeAide === t ? "" : t }))}
              className={`px-2.5 py-1.5 rounded-lg text-xs border font-medium transition-all ${card.typeAide === t ? "bg-white/35 border-white/60 text-white" : "bg-white/10 border-white/25 text-white/65 hover:bg-white/20"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-2 border-b border-white/15">
        <Section icon="⚠️" label="Niveau d'urgence" />
        <div className="flex gap-2">
          {niveaux.map(n => (
            <button key={n} onClick={() => setCard(p => ({ ...p, typeEvenement: p.typeEvenement === n ? "" : n }))}
              className={`flex-1 py-2 rounded-lg text-xs border font-semibold transition-all ${card.typeEvenement === n ? "bg-white/35 border-white/60 text-white" : "bg-white/10 border-white/25 text-white/55"}`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="📝" label="Description de la situation" />
        <textarea value={card.message} onChange={e => setCard(p => ({ ...p, message: e.target.value }))}
          placeholder="Expliquez brievement la situation..."
          rows={3}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 outline-none text-white placeholder-white/30 text-sm resize-none" />
      </div>

      <div className="px-4 py-2 border-b border-white/15">
        <Mic card={card} setCard={setCard} />
      </div>

      <div className="px-4 py-3 space-y-2">
        <Section icon="📞" label="Contact et lieu" />
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 border border-white/20">
          <span className="text-sm">📞</span>
          <input type="tel" value={card.contact} onChange={e => setCard(p => ({ ...p, contact: e.target.value }))}
            placeholder="Numero a appeler" className="bg-transparent outline-none text-white placeholder-white/30 text-sm flex-1" />
        </div>
        <LieuRow value={card.lieuDeces} onChange={v => setCard(p => ({ ...p, lieuDeces: v }))} placeholder="Ou se rendre / Adresse" />
      </div>
    </div>
  );
}

function CarreauEmploi({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  const contrats = ["CDI", "CDD", "Stage", "Apprentissage", "Benevolat", "Mission ponctuelle", "Temps partiel"];
  const msgs = ["Envoyez votre CV", "Presentez-vous directement", "Contactez-nous par telephone", "Experience non necessaire", "Formation assures sur place"];
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#0c4a6e,#0284c7,#075985)" }}>
      <CardHeader title="Offre d'emploi" emoji="💼" subtitle="Annonce professionnelle" />

      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="💼" label="Poste recherche" />
        <Field value={card.posteEmploi} onChange={v => setCard(p => ({ ...p, posteEmploi: v }))} placeholder="Ex: Infirmier, Maçon, Secretaire, Comptable..." className="text-lg font-bold mb-2" />
        <Field value={card.entreprise} onChange={v => setCard(p => ({ ...p, entreprise: v }))} placeholder="Nom de l'entreprise / Organisation" />
      </div>

      <div className="px-4 py-2 border-b border-white/15">
        <Section icon="📋" label="Type de contrat" />
        <div className="flex flex-wrap gap-1.5">
          {contrats.map(c => (
            <button key={c} onClick={() => setCard(p => ({ ...p, typeEvenement: p.typeEvenement === c ? "" : c }))}
              className={`px-2.5 py-1.5 rounded-lg text-xs border font-medium transition-all ${card.typeEvenement === c ? "bg-white/35 border-white/60 text-white" : "bg-white/10 border-white/25 text-white/65 hover:bg-white/20"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="📝" label="Description / Conditions" />
        <textarea value={card.message} onChange={e => setCard(p => ({ ...p, message: e.target.value }))}
          placeholder="Salaire, horaires, conditions, profil recherche..."
          rows={3}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 outline-none text-white placeholder-white/30 text-sm resize-none mb-2" />
        <MessagePicker suggestions={msgs} value={card.but} onChange={v => setCard(p => ({ ...p, but: v }))} />
      </div>

      <div className="px-4 py-2 border-b border-white/15">
        <Mic card={card} setCard={setCard} />
      </div>

      <div className="px-4 py-3 space-y-2">
        <Section icon="📞" label="Contact et lieu" />
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 border border-white/20">
          <span className="text-sm">📞</span>
          <input type="tel" value={card.contact} onChange={e => setCard(p => ({ ...p, contact: e.target.value }))}
            placeholder="Telephone / Email de contact" className="bg-transparent outline-none text-white placeholder-white/30 text-sm flex-1" />
        </div>
        <LieuRow value={card.lieuReunion} onChange={v => setCard(p => ({ ...p, lieuReunion: v }))} placeholder="Lieu de travail / Quartier" />
        <DateRow value={card.dateMarriage} onChange={v => setCard(p => ({ ...p, dateMarriage: v }))} label="Date limite" />
      </div>
    </div>
  );
}

// ─── Condoléances ────────────────────────────────────────────────────────────
function CarreauCondoleances({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  const msgs = ["Nos pensées accompagnent votre famille 🙏", "Que son âme repose en paix", "Soyez forts, vous n'êtes pas seuls", "Toutes nos condoléances à toute la famille", "Que Dieu vous accorde patience et réconfort"];
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#1e293b,#334155,#1e293b)" }}>
      <CardHeader title="Condoléances" emoji="💙" subtitle="Message de soutien et compassion" />
      <div className="px-4 py-3 flex items-center gap-4 border-b border-white/15">
        <Photo value={card.photoDefunt} onChange={v => setCard(p => ({ ...p, photoDefunt: v }))} label="Photo" />
        <div className="flex-1 space-y-2">
          <Field value={card.nomDefunt} onChange={v => setCard(p => ({ ...p, nomDefunt: v }))} placeholder="Nom du défunt / de la personne endeuillée" className="font-bold text-base" />
          <Field value={card.prenomBebe} onChange={v => setCard(p => ({ ...p, prenomBebe: v }))} placeholder="De la part de (nom, famille...)" />
        </div>
      </div>
      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="💬" label="Message de soutien" />
        <MessagePicker suggestions={msgs} value={card.message} onChange={v => setCard(p => ({ ...p, message: v }))} />
      </div>
      <div className="px-4 py-2">
        <Mic card={card} setCard={setCard} />
      </div>
    </div>
  );
}

// ─── Félicitations ────────────────────────────────────────────────────────────
function CarreauFelicitations({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  const occasions = ["🎓 Diplôme / Réussite scolaire", "💍 Mariage", "👶 Naissance", "📈 Promotion professionnelle", "🏆 Victoire / Prix", "🏠 Nouvelle maison", "✈️ Nouveau départ", "💼 Création d'entreprise", "🎂 Anniversaire important", "🌟 Autre bonne nouvelle"];
  const msgs = ["Toutes nos félicitations ! 🎉", "Nous sommes si fiers de toi !", "Que ce succès soit le premier d'une longue série", "Bravo, tu le mérites vraiment !", "Que Dieu bénisse ce nouveau chapitre"];
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#78350f,#d97706,#92400e)" }}>
      <CardHeader title="Félicitations" emoji="🏆" subtitle="Partager une bonne nouvelle" />
      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="🌟" label="Pour quelle occasion ?" />
        <div className="flex flex-wrap gap-1.5">
          {occasions.map(o => (
            <button key={o} onClick={() => setCard(p => ({ ...p, typeEvenement: p.typeEvenement === o ? "" : o }))}
              className={`px-2.5 py-1.5 rounded-lg text-xs border font-medium transition-all ${card.typeEvenement === o ? "bg-white/35 border-white/60 text-white" : "bg-white/10 border-white/25 text-white/65 hover:bg-white/20"}`}>
              {o}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 py-3 flex items-center gap-4 border-b border-white/15">
        <Photo value={card.photoBebe} onChange={v => setCard(p => ({ ...p, photoBebe: v }))} label="Photo" />
        <div className="flex-1 space-y-2">
          <Field value={card.prenomBebe} onChange={v => setCard(p => ({ ...p, prenomBebe: v }))} placeholder="Nom de la personne / famille félicitée" className="font-bold text-base" />
        </div>
      </div>
      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="💬" label="Message" />
        <MessagePicker suggestions={msgs} value={card.message} onChange={v => setCard(p => ({ ...p, message: v }))} />
      </div>
      <div className="px-4 py-2">
        <Mic card={card} setCard={setCard} />
      </div>
    </div>
  );
}

// ─── Remerciement ────────────────────────────────────────────────────────────
function CarreauRemerciement({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  const msgs = ["Merci du fond du cœur 🙏", "Votre soutien a tout changé pour nous", "Nous n'oublierons jamais ce que vous avez fait", "Que Dieu vous récompense au centuple", "Votre générosité est un exemple pour tous"];
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#064e3b,#059669,#065f46)" }}>
      <CardHeader title="Remerciement" emoji="🙌" subtitle="Exprimer votre gratitude" />
      <div className="px-4 py-3 flex items-center gap-4 border-b border-white/15">
        <Photo value={card.photoFF} onChange={v => setCard(p => ({ ...p, photoFF: v }))} label="Photo" />
        <div className="flex-1 space-y-2">
          <Field value={card.prenomBebe} onChange={v => setCard(p => ({ ...p, prenomBebe: v }))} placeholder="À qui ? (nom, famille, organisation...)" className="font-bold text-base" />
          <Field value={card.titre} onChange={v => setCard(p => ({ ...p, titre: v }))} placeholder="Pour quoi ? (aide, soutien, service...)" />
        </div>
      </div>
      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="💬" label="Message de remerciement" />
        <MessagePicker suggestions={msgs} value={card.message} onChange={v => setCard(p => ({ ...p, message: v }))} />
      </div>
      <div className="px-4 py-2">
        <Mic card={card} setCard={setCard} />
      </div>
    </div>
  );
}

// ─── Appel à la communauté ───────────────────────────────────────────────────
function CarreauAppelCommunaute({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  const types = ["📢 Sensibilisation", "🤝 Mobilisation solidaire", "🏗️ Projet communautaire", "🗳️ Prise de décision collective", "📚 Initiative éducative", "🌿 Environnement", "🏥 Santé publique", "💰 Collecte de fonds"];
  const msgs = ["Soyons solidaires, agissons ensemble !", "Votre participation compte énormément", "Ensemble, nous pouvons changer les choses", "Ne restez pas indifférents, rejoignez-nous", "Chaque geste compte pour notre communauté"];
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#7c2d12,#ea580c,#9a3412)" }}>
      <CardHeader title="Appel à la Communauté" emoji="📣" subtitle="Mobiliser et sensibiliser" />
      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="🎯" label="Type d'appel" />
        <div className="flex flex-wrap gap-1.5">
          {types.map(t => (
            <button key={t} onClick={() => setCard(p => ({ ...p, typeEvenement: p.typeEvenement === t ? "" : t }))}
              className={`px-2.5 py-1.5 rounded-lg text-xs border font-medium transition-all ${card.typeEvenement === t ? "bg-white/35 border-white/60 text-white" : "bg-white/10 border-white/25 text-white/65 hover:bg-white/20"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="📌" label="Titre de l'appel" />
        <Field value={card.titre} onChange={v => setCard(p => ({ ...p, titre: v }))} placeholder="Ex: Collecte pour les sinistrés de Conakry" className="font-bold text-base mb-2" />
      </div>
      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="💬" label="Message" />
        <MessagePicker suggestions={msgs} value={card.message} onChange={v => setCard(p => ({ ...p, message: v }))} />
      </div>
      <div className="px-4 py-2 border-b border-white/15">
        <Mic card={card} setCard={setCard} />
      </div>
      <div className="px-4 py-3 space-y-2">
        <Section icon="📍" label="Rendez-vous / Contact" />
        <DateTimeRow value={card.dateReunion} onChange={v => setCard(p => ({ ...p, dateReunion: v }))} label="Date" />
        <LieuRow value={card.lieuReunion} onChange={v => setCard(p => ({ ...p, lieuReunion: v }))} placeholder="Lieu de rassemblement" />
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 border border-white/20">
          <span className="text-sm">📞</span>
          <input type="tel" value={card.contact} onChange={e => setCard(p => ({ ...p, contact: e.target.value }))}
            placeholder="Contact" className="bg-transparent outline-none text-white placeholder-white/30 text-sm flex-1" />
        </div>
      </div>
    </div>
  );
}

// ─── Témoignage ──────────────────────────────────────────────────────────────
function CarreauTemoignage({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  const themes = ["🏥 Guérison / Santé", "💼 Réussite professionnelle", "🎓 Succès scolaire", "🤲 Foi et spiritualité", "💪 Résilience et courage", "🏠 Nouveau logement", "💑 Famille / Mariage", "🌍 Migration / Voyage"];
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#3b0764,#7c3aed,#4c1d95)" }}>
      <CardHeader title="Témoignage" emoji="💬" subtitle="Partagez votre expérience" />
      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="🌟" label="Thème du témoignage" />
        <div className="flex flex-wrap gap-1.5">
          {themes.map(t => (
            <button key={t} onClick={() => setCard(p => ({ ...p, typeEvenement: p.typeEvenement === t ? "" : t }))}
              className={`px-2.5 py-1.5 rounded-lg text-xs border font-medium transition-all ${card.typeEvenement === t ? "bg-white/35 border-white/60 text-white" : "bg-white/10 border-white/25 text-white/65 hover:bg-white/20"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 py-3 flex items-center gap-4 border-b border-white/15">
        <Photo value={card.photoFF} onChange={v => setCard(p => ({ ...p, photoFF: v }))} label="Photo" />
        <div className="flex-1 space-y-2">
          <Field value={card.prenomBebe} onChange={v => setCard(p => ({ ...p, prenomBebe: v }))} placeholder="Votre nom (ou rester anonyme)" className="font-bold text-base" />
          <Field value={card.titre} onChange={v => setCard(p => ({ ...p, titre: v }))} placeholder="Titre de votre témoignage" />
        </div>
      </div>
      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="📝" label="Votre témoignage" />
        <textarea value={card.message} onChange={e => setCard(p => ({ ...p, message: e.target.value }))}
          placeholder="Racontez votre expérience, ce que vous avez vécu, ce que ça vous a appris..."
          rows={4}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 outline-none text-white placeholder-white/30 text-sm resize-none" />
      </div>
      <div className="px-4 py-2 border-b border-white/15">
        <Mic card={card} setCard={setCard} />
      </div>
      <div className="px-4 py-3">
        <Section icon="🎬" label="Vidéo témoignage (optionnel)" />
        <VideoSlot value={card.videoSante} onChange={v => setCard(p => ({ ...p, videoSante: v }))} label="Ajouter une vidéo (max 30s)" />
      </div>
    </div>
  );
}

// ─── Communiqué officiel ──────────────────────────────────────────────────────
function CarreauCommunique({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  const types = ["📜 Décision officielle", "📢 Annonce importante", "🔔 Information urgente", "📋 Compte-rendu", "🏛️ Communiqué politique", "🕌 Communiqué religieux", "🏥 Communiqué santé", "🎓 Communiqué éducatif"];
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#0c1445,#1d4ed8,#1e3a8a)" }}>
      <CardHeader title="Communiqué Officiel" emoji="📋" subtitle="Annonce formelle et institutionnelle" />
      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="🏛️" label="Type de communiqué" />
        <div className="flex flex-wrap gap-1.5">
          {types.map(t => (
            <button key={t} onClick={() => setCard(p => ({ ...p, typeEvenement: p.typeEvenement === t ? "" : t }))}
              className={`px-2.5 py-1.5 rounded-lg text-xs border font-medium transition-all ${card.typeEvenement === t ? "bg-white/35 border-white/60 text-white" : "bg-white/10 border-white/25 text-white/65 hover:bg-white/20"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 py-3 flex items-center gap-4 border-b border-white/15">
        <Photo value={card.photoIntervenant} onChange={v => setCard(p => ({ ...p, photoIntervenant: v }))} label="Logo / Photo" />
        <div className="flex-1 space-y-2">
          <Field value={card.parents} onChange={v => setCard(p => ({ ...p, parents: v }))} placeholder="Organisation / Autorité émettrice" className="font-bold text-base" />
          <Field value={card.titre} onChange={v => setCard(p => ({ ...p, titre: v }))} placeholder="Objet du communiqué" />
        </div>
      </div>
      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="📝" label="Contenu du communiqué" />
        <textarea value={card.message} onChange={e => setCard(p => ({ ...p, message: e.target.value }))}
          placeholder="Rédigez ici le texte officiel du communiqué..."
          rows={5}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 outline-none text-white placeholder-white/30 text-sm resize-none" />
      </div>
      <div className="px-4 py-3 space-y-2">
        <Section icon="📅" label="Date et contact" />
        <DateRow value={card.dateMarriage} onChange={v => setCard(p => ({ ...p, dateMarriage: v }))} label="Date d'émission" />
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 border border-white/20">
          <span className="text-sm">📞</span>
          <input type="text" value={card.contact} onChange={e => setCard(p => ({ ...p, contact: e.target.value }))}
            placeholder="Contact / Email officiel" className="bg-transparent outline-none text-white placeholder-white/30 text-sm flex-1" />
        </div>
      </div>
    </div>
  );
}

// ─── Demande de pardon ────────────────────────────────────────────────────────
function CarreauDemandePardon({ card, setCard }: { card: CardState; setCard: React.Dispatch<React.SetStateAction<CardState>> }) {
  const msgs = ["Je vous demande sincèrement pardon 🙏", "Je regrette profondément mes actes", "Je reconnais mes torts et vous demande de me pardonner", "Que Dieu nous aide à nous réconcilier", "Je tends la main en signe de paix et de réconciliation", "Mon cœur est sincère, je désire réparer"];
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#134e4a,#0f766e,#115e59)" }}>
      <CardHeader title="Demande de Pardon" emoji="🤝" subtitle="Réconciliation et paix" />
      <div className="px-4 py-3 flex items-center gap-4 border-b border-white/15">
        <Photo value={card.photoFF} onChange={v => setCard(p => ({ ...p, photoFF: v }))} label="Photo" />
        <div className="flex-1 space-y-2">
          <Field value={card.prenomBebe} onChange={v => setCard(p => ({ ...p, prenomBebe: v }))} placeholder="De qui ? (votre nom)" className="font-bold text-base" />
          <Field value={card.epoux} onChange={v => setCard(p => ({ ...p, epoux: v }))} placeholder="À qui ? (nom de la personne, famille, communauté...)" />
        </div>
      </div>
      <div className="px-4 py-3 border-b border-white/15">
        <Section icon="💬" label="Message de réconciliation" />
        <MessagePicker suggestions={msgs} value={card.message} onChange={v => setCard(p => ({ ...p, message: v }))} />
      </div>
      <div className="px-4 py-2">
        <Mic card={card} setCard={setCard} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

type TemplateGroup = { group: string; desc: string; items: { type: CardType; label: string; emoji: string; bg: string }[] };

function generateShareText(card: CardState, type: CardType): string {
  const fmtDate = (d: string) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); } catch { return d; }
  };
  const lines: string[] = [];
  switch (type) {
    case 'mariage':     lines.push('💍 *MARIAGE*'); if (card.epouse && card.epoux) lines.push(`${card.epouse} & ${card.epoux}`); break;
    case 'fiancailles': lines.push('💛 *FIANÇAILLES*'); if (card.epouse && card.epoux) lines.push(`${card.epouse} & ${card.epoux}`); break;
    case 'bapteme':     lines.push('👶 *BAPTÊME*'); if (card.prenomBebe) lines.push(`Enfant : ${card.prenomBebe}`); if (card.parents) lines.push(`Parents : ${card.parents}`); if (card.dateBapteme) lines.push(`📅 ${fmtDate(card.dateBapteme)}`); if (card.lieuBapteme) lines.push(`📍 ${card.lieuBapteme}`); break;
    case 'naissance':   lines.push('🌟 *NAISSANCE*'); if (card.prenomBebe) lines.push(`${card.prenomBebe}`); if (card.parents) lines.push(`Parents : ${card.parents}`); break;
    case 'deces':       lines.push('🕯️ *DÉCÈS*'); if (card.nomDefunt) lines.push(card.nomDefunt); if (card.dateDeces) lines.push(`📅 Le ${fmtDate(card.dateDeces)}`); if (card.lieuDeces) lines.push(`📍 ${card.lieuDeces}`); if (card.dateEnterrement) lines.push(`⚰️ Enterrement : ${fmtDate(card.dateEnterrement)}`); if (card.lieuEnterrement) lines.push(`📍 ${card.lieuEnterrement}`); break;
    case 'commemoration': lines.push('🕊️ *COMMÉMORATION*'); if (card.nomDefunt) lines.push(card.nomDefunt); if (card.dateReunion) lines.push(`📅 ${fmtDate(card.dateReunion)}`); if (card.lieuReunion) lines.push(`📍 ${card.lieuReunion}`); break;
    case 'anniversaire': lines.push('🎂 *ANNIVERSAIRE*'); if (card.prenomBebe) lines.push(card.prenomBebe); if (card.age) lines.push(`${card.age} ans`); if (card.dateAnniversaire) lines.push(`📅 ${fmtDate(card.dateAnniversaire)}`); if (card.lieuReunion) lines.push(`📍 ${card.lieuReunion}`); break;
    case 'fete':        lines.push('🎉 *FÊTE & CÉLÉBRATION*'); if (card.typeEvenement) lines.push(card.typeEvenement); if (card.prenomBebe) lines.push(card.prenomBebe); if (card.dateReunion) lines.push(`📅 ${fmtDate(card.dateReunion)}`); if (card.lieuReunion) lines.push(`📍 ${card.lieuReunion}`); break;
    case 'priere':      lines.push('🙏 *PRIÈRE / CULTE*'); if (card.typeEvenement) lines.push(card.typeEvenement); if (card.titre) lines.push(card.titre); if (card.dateReunion) lines.push(`📅 ${fmtDate(card.dateReunion)}`); if (card.lieuReunion) lines.push(`📍 ${card.lieuReunion}`); break;
    case 'reunion_physique': lines.push('🤝 *RÉUNION*'); if (card.but) lines.push(card.but); if (card.dateReunion) lines.push(`📅 ${fmtDate(card.dateReunion)}`); if (card.lieuReunion) lines.push(`📍 ${card.lieuReunion}`); break;
    case 'conference':  lines.push('🎙️ *CONFÉRENCE*'); if (card.titre) lines.push(card.titre); if (card.dateReunion) lines.push(`📅 ${fmtDate(card.dateReunion)}`); if (card.lieuReunion) lines.push(`📍 ${card.lieuReunion}`); break;
    case 'reunion_ligne': lines.push('💻 *RÉUNION EN LIGNE*'); if (card.but) lines.push(card.but); if (card.dateReunion) lines.push(`📅 ${fmtDate(card.dateReunion)}`); if (card.lienReunion) lines.push(`🔗 ${card.lienReunion}`); break;
    case 'webinaire':   lines.push('📡 *WEBINAIRE*'); if (card.titre) lines.push(card.titre); if (card.dateReunion) lines.push(`📅 ${fmtDate(card.dateReunion)}`); if (card.lienReunion) lines.push(`🔗 ${card.lienReunion}`); break;
    case 'sante':       lines.push('🏥 *INFORMATION SANTÉ*'); if (card.titre) lines.push(card.titre); break;
    case 'urgence':     lines.push('🚨 *URGENCE MÉDICALE*'); if (card.typeUrgence) lines.push(card.typeUrgence); if (card.etablissement) lines.push(`🏥 ${card.etablissement}`); if (card.contact) lines.push(`📞 ${card.contact}`); break;
    case 'aide':        lines.push('🤲 *AIDE COMMUNAUTAIRE*'); if (card.typeAide) lines.push(card.typeAide); if (card.typeEvenement) lines.push(card.typeEvenement); if (card.lieuDeces) lines.push(`📍 ${card.lieuDeces}`); if (card.contact) lines.push(`📞 ${card.contact}`); break;
    case 'emploi':      lines.push('💼 *OFFRE D\'EMPLOI*'); if (card.posteEmploi) lines.push(card.posteEmploi); if (card.entreprise) lines.push(`🏢 ${card.entreprise}`); if (card.typeEvenement) lines.push(card.typeEvenement); if (card.contact) lines.push(`📞 ${card.contact}`); break;
    case 'condoleances':   lines.push('💙 *CONDOLÉANCES*'); if (card.nomDefunt) lines.push(`Pour le décès de : ${card.nomDefunt}`); if (card.prenomBebe) lines.push(`De la part de : ${card.prenomBebe}`); break;
    case 'felicitations':  lines.push('🏆 *FÉLICITATIONS*'); if (card.prenomBebe) lines.push(`À : ${card.prenomBebe}`); if (card.typeEvenement) lines.push(`Pour : ${card.typeEvenement}`); break;
    case 'remerciement':   lines.push('🙌 *REMERCIEMENT*'); if (card.prenomBebe) lines.push(`À : ${card.prenomBebe}`); if (card.titre) lines.push(`Pour : ${card.titre}`); break;
    case 'appel_communaute': lines.push('📣 *APPEL À LA COMMUNAUTÉ*'); if (card.titre) lines.push(card.titre); if (card.dateReunion) lines.push(`📅 ${fmtDate(card.dateReunion)}`); if (card.lieuReunion) lines.push(`📍 ${card.lieuReunion}`); if (card.contact) lines.push(`📞 ${card.contact}`); break;
    case 'temoignage':     lines.push('💬 *TÉMOIGNAGE*'); if (card.prenomBebe) lines.push(`Par : ${card.prenomBebe}`); if (card.titre) lines.push(`Sujet : ${card.titre}`); break;
    case 'communique':     lines.push('📋 *COMMUNIQUÉ OFFICIEL*'); if (card.parents) lines.push(`Émis par : ${card.parents}`); if (card.titre) lines.push(card.titre); if (card.contact) lines.push(`📞 ${card.contact}`); break;
    case 'demande_pardon': lines.push('🤝 *DEMANDE DE PARDON*'); if (card.prenomBebe) lines.push(`De : ${card.prenomBebe}`); if (card.epoux) lines.push(`À : ${card.epoux}`); break;
  }
  if (card.message) lines.push(`\n${card.message}`);
  lines.push(`\n_Moftal Info · ${new Date().toLocaleDateString('fr-FR')}_`);
  return lines.join('\n');
}

const TEMPLATE_GROUPS: TemplateGroup[] = [
  {
    group: "Famille",
    desc: "Mariages et fiancailles",
    items: [
      { type: "mariage",     label: "Mariage",     emoji: "💍", bg: "from-rose-900 to-pink-700" },
      { type: "fiancailles", label: "Fiancailles", emoji: "💛", bg: "from-amber-900 to-yellow-700" },
    ],
  },
  {
    group: "Naissance & Grandir",
    desc: "Bebes et anniversaires",
    items: [
      { type: "bapteme",      label: "Bapteme",      emoji: "👶", bg: "from-sky-900 to-blue-600" },
      { type: "naissance",    label: "Naissance",    emoji: "🌟", bg: "from-yellow-900 to-amber-600" },
      { type: "anniversaire", label: "Anniversaire", emoji: "🎂", bg: "from-violet-900 to-purple-700" },
    ],
  },
  {
    group: "Joie & Celebration",
    desc: "Fetes et bonnes nouvelles",
    items: [
      { type: "fete", label: "Fete & Celebration", emoji: "🎉", bg: "from-emerald-900 to-green-700" },
    ],
  },
  {
    group: "Foi & Priere",
    desc: "Reunions spirituelles",
    items: [
      { type: "priere", label: "Priere / Culte", emoji: "🙏", bg: "from-blue-950 to-blue-800" },
    ],
  },
  {
    group: "Deces & Memoire",
    desc: "Accompagner et honorer",
    items: [
      { type: "deces",         label: "Deces",         emoji: "🕯️", bg: "from-stone-800 to-stone-600" },
      { type: "commemoration", label: "Commemoration", emoji: "🕊️", bg: "from-indigo-950 to-indigo-800" },
    ],
  },
  {
    group: "Reunions",
    desc: "Rencontres en personne ou en ligne",
    items: [
      { type: "reunion_physique", label: "Reunion Physique", emoji: "🤝", bg: "from-amber-900 to-orange-700" },
      { type: "conference",       label: "Conference",       emoji: "🎙️", bg: "from-teal-900 to-teal-700" },
      { type: "reunion_ligne",    label: "Reunion en Ligne", emoji: "💻", bg: "from-violet-900 to-purple-700" },
      { type: "webinaire",        label: "Webinaire",        emoji: "📡", bg: "from-indigo-900 to-blue-800" },
    ],
  },
  {
    group: "Sante & Urgence",
    desc: "Informations medicales",
    items: [
      { type: "sante",   label: "Sante",           emoji: "🏥", bg: "from-emerald-900 to-green-700" },
      { type: "urgence", label: "Urgence Medicale", emoji: "🚨", bg: "from-red-950 to-red-800" },
    ],
  },
  {
    group: "Communaute",
    desc: "Entraide et travail",
    items: [
      { type: "aide",   label: "Aide Communautaire", emoji: "🤲", bg: "from-orange-900 to-red-700" },
      { type: "emploi", label: "Offre d'emploi",     emoji: "💼", bg: "from-cyan-900 to-sky-700" },
    ],
  },
  {
    group: "Messages",
    desc: "Condoléances, félicitations, témoignages et réconciliation",
    items: [
      { type: "condoleances",      label: "Condoléances",          emoji: "💙", bg: "from-slate-900 to-slate-700" },
      { type: "felicitations",     label: "Félicitations",         emoji: "🏆", bg: "from-amber-900 to-yellow-700" },
      { type: "remerciement",      label: "Remerciement",          emoji: "🙌", bg: "from-emerald-900 to-teal-700" },
      { type: "appel_communaute",  label: "Appel Communauté",      emoji: "📣", bg: "from-orange-900 to-red-800" },
      { type: "temoignage",        label: "Témoignage",            emoji: "💬", bg: "from-violet-900 to-purple-800" },
      { type: "communique",        label: "Communiqué Officiel",   emoji: "📋", bg: "from-blue-950 to-blue-800" },
      { type: "demande_pardon",    label: "Demande de Pardon",     emoji: "🤝", bg: "from-teal-900 to-teal-700" },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MINI-CARREAU (vue compacte swipeable)
// ═══════════════════════════════════════════════════════════════════════════════

interface SavedCard { id: string; type: CardType; card: CardState; savedAt: number }

const CARD_BG: Record<CardType, string> = {
  mariage:          "linear-gradient(135deg,#7c1d3f,#be185d,#831843)",
  fiancailles:      "linear-gradient(135deg,#7e1d6e,#c026d3,#701a75)",
  bapteme:          "linear-gradient(135deg,#1e3a5f,#1d4ed8,#1e3a5f)",
  naissance:        "linear-gradient(135deg,#78350f,#d97706,#92400e)",
  anniversaire:     "linear-gradient(135deg,#4c1d95,#7c3aed,#4c1d95)",
  fete:             "linear-gradient(135deg,#14532d,#1a8f1a,#0f4b0f)",
  priere:           "linear-gradient(135deg,#172554,#1d4ed8,#1e3a8a)",
  deces:            "linear-gradient(135deg,#1c1917,#44403c,#292524)",
  commemoration:    "linear-gradient(135deg,#1e1b4b,#4338ca,#1e1b4b)",
  reunion_physique: "linear-gradient(135deg,#78350f,#ea580c,#9a3412)",
  conference:       "linear-gradient(135deg,#093809,#1a8f1a,#0f4b0f)",
  reunion_ligne:    "linear-gradient(135deg,#4c1d95,#7c3aed,#5b21b6)",
  webinaire:        "linear-gradient(135deg,#1e3a8a,#3b82f6,#1d4ed8)",
  sante:            "linear-gradient(135deg,#14532d,#1a8f1a,#0f4b0f)",
  urgence:          "linear-gradient(135deg,#450a0a,#dc2626,#7f1d1d)",
  aide:             "linear-gradient(135deg,#7c2d12,#ea580c,#9a3412)",
  emploi:           "linear-gradient(135deg,#0c4a6e,#0284c7,#075985)",
  condoleances:     "linear-gradient(135deg,#1e293b,#334155,#1e293b)",
  felicitations:    "linear-gradient(135deg,#78350f,#d97706,#92400e)",
  remerciement:     "linear-gradient(135deg,#064e3b,#059669,#065f46)",
  appel_communaute: "linear-gradient(135deg,#7c2d12,#ea580c,#9a3412)",
  temoignage:       "linear-gradient(135deg,#3b0764,#7c3aed,#4c1d95)",
  communique:       "linear-gradient(135deg,#0c1445,#1d4ed8,#1e3a8a)",
  demande_pardon:   "linear-gradient(135deg,#134e4a,#0f766e,#115e59)",
};

function getCardTitle(type: CardType): string {
  const titles: Record<CardType, string> = {
    mariage: "Mariage", fiancailles: "Fiançailles", bapteme: "Baptême",
    naissance: "Naissance", anniversaire: "Anniversaire", fete: "Fête",
    priere: "Prière", deces: "Décès", commemoration: "Commémoration",
    reunion_physique: "Réunion", conference: "Conférence",
    reunion_ligne: "Réunion en ligne", webinaire: "Webinaire",
    sante: "Santé", urgence: "Urgence", aide: "Aide", emploi: "Emploi",
    condoleances: "Condoléances", felicitations: "Félicitations",
    remerciement: "Remerciement", appel_communaute: "Appel Communauté",
    temoignage: "Témoignage", communique: "Communiqué", demande_pardon: "Demande de Pardon",
  };
  return titles[type] || type;
}
function getCardEmoji(type: CardType): string {
  const emojis: Record<CardType, string> = {
    mariage:"💍", fiancailles:"💜", bapteme:"👶", naissance:"🌟", anniversaire:"🎂",
    fete:"🎉", priere:"🙏", deces:"🕯️", commemoration:"🕊️",
    reunion_physique:"🤝", conference:"🎙️", reunion_ligne:"💻", webinaire:"📡",
    sante:"🏥", urgence:"🚨", aide:"🤲", emploi:"💼",
    condoleances:"💙", felicitations:"🏆", remerciement:"🙌",
    appel_communaute:"📣", temoignage:"💬", communique:"📋", demande_pardon:"🤝",
  };
  return emojis[type] || "📋";
}

function getMainPhoto(card: CardState): string | null {
  return card.photoCouple || card.photoFF || card.photoFB || card.photoBebe || card.photoDefunt || card.photoIntervenant || null;
}

function getCardSummary(type: CardType, card: CardState): string {
  if (type === "mariage" || type === "fiancailles") return [card.epouse, card.epoux].filter(Boolean).join(" & ") || "—";
  if (type === "bapteme" || type === "naissance") return card.prenomBebe || card.parents || "—";
  if (type === "deces" || type === "commemoration") return card.nomDefunt || "—";
  if (type === "anniversaire") return card.prenomBebe || card.nomDefunt || "—";
  if (type === "fete") return card.titre || card.but || "—";
  if (type === "emploi") return card.posteEmploi || card.entreprise || "—";
  if (type === "condoleances") return card.nomDefunt || card.prenomBebe || "—";
  if (type === "felicitations" || type === "remerciement" || type === "demande_pardon") return card.prenomBebe || card.titre || "—";
  if (type === "appel_communaute" || type === "temoignage" || type === "communique") return card.titre || card.parents || "—";
  return card.titre || card.but || "—";
}

function getCardDate(type: CardType, card: CardState): string {
  return card.dateMarriage || card.dateBapteme || card.dateDeces || card.dateReunion || card.dateAnniversaire || "";
}

// Composant MiniCard : carte compacte style photo professionnelle
function MiniCard({ saved, onView, onEdit, onDelete }: { saved: SavedCard; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const photo = getMainPhoto(saved.card);
  const title = getCardTitle(saved.type);
  const emoji = getCardEmoji(saved.type);
  const summary = getCardSummary(saved.type, saved.card);
  const date = getCardDate(saved.type, saved.card);
  const bg = CARD_BG[saved.type] || "linear-gradient(135deg,#1f2937,#374151)";
  const hasVideo = !!(saved.card.rencontreVideo || saved.card.videoSante);
  const hasAudio = !!saved.card.audioUrl;

  return (
    <div
      className="relative flex-shrink-0 rounded-3xl overflow-hidden cursor-pointer select-none group"
      style={{ width: 158, height: 248, background: bg, boxShadow: "0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.07)" }}
      onClick={onView}
    >
      {/* Photo plein format */}
      {photo && <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />}

      {/* Overlay gradient : léger en haut, dense en bas */}
      <div className="absolute inset-0" style={{
        background: photo
          ? "linear-gradient(170deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.12) 45%, rgba(0,0,0,0.88) 100%)"
          : "linear-gradient(170deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.6) 100%)"
      }} />

      {/* Badge type - coin supérieur gauche */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/15">
        <span className="text-sm leading-none">{emoji}</span>
        <span className="text-white/80 text-[9px] font-bold uppercase tracking-wider">{title}</span>
      </div>

      {/* Actions - coin supérieur droit (visibles au hover) */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
        <button type="button" onClick={e => { e.stopPropagation(); onEdit(); }}
          className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-xs hover:bg-white/40 transition-colors shadow-lg">
          ✏️
        </button>
        <button type="button" onClick={e => { e.stopPropagation(); onDelete(); }}
          className="w-7 h-7 rounded-full bg-red-500/70 backdrop-blur-md border border-red-400/30 flex items-center justify-center text-white text-xs font-bold hover:bg-red-500 transition-colors shadow-lg">
          ✕
        </button>
      </div>

      {/* Emoji centré quand pas de photo */}
      {!photo && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <span className="text-7xl drop-shadow-2xl" style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.5))" }}>{emoji}</span>
          </div>
        </div>
      )}

      {/* Zone info en bas */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-3 pb-3 pt-8">
        <p className="text-white font-black text-sm leading-tight line-clamp-2 drop-shadow-md">{summary}</p>
        {date && (
          <p className="text-white/55 text-[10px] mt-1 font-medium">
            {new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
        {/* Badges media petits */}
        {(hasVideo || hasAudio) && (
          <div className="flex gap-1 mt-2">
            {hasVideo && <span className="px-1.5 py-0.5 bg-white/15 backdrop-blur-sm rounded-full text-[8px] text-white/75 font-semibold border border-white/10">▶ Vidéo</span>}
            {hasAudio && <span className="px-1.5 py-0.5 bg-white/15 backdrop-blur-sm rounded-full text-[8px] text-white/75 font-semibold border border-white/10">♫ Audio</span>}
          </div>
        )}
      </div>

      {/* Reflet subtil en haut */}
      <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none" style={{
        background: "linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, transparent 100%)"
      }} />
    </div>
  );
}

// Modal de visualisation complète — design premium
function CardViewModal({ saved, onClose }: { saved: SavedCard; onClose: () => void }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const photos = [saved.card.photoCouple, saved.card.photoFF, saved.card.photoFB, saved.card.photoBebe, saved.card.photoDefunt, saved.card.photoIntervenant].filter(Boolean) as string[];
  const mainPhoto = photos[0] || null;
  const bg = CARD_BG[saved.type] || "linear-gradient(135deg,#1f2937,#374151)";
  const date = getCardDate(saved.type, saved.card);

  const infoLines: { icon: string; label: string; value: string }[] = [
    ...(saved.card.epoux    ? [{ icon: "👤", label: "Époux",    value: saved.card.epoux }]    : []),
    ...(saved.card.epouse   ? [{ icon: "👤", label: "Épouse",   value: saved.card.epouse }]   : []),
    ...(saved.card.prenomBebe ? [{ icon: "👶", label: "Prénom", value: saved.card.prenomBebe }] : []),
    ...(saved.card.parents  ? [{ icon: "👨‍👩‍👧", label: "Parents", value: saved.card.parents }]  : []),
    ...(saved.card.nomDefunt ? [{ icon: "✝️", label: "Défunt",  value: saved.card.nomDefunt }] : []),
    ...(saved.card.posteEmploi ? [{ icon: "💼", label: "Poste", value: saved.card.posteEmploi }] : []),
    ...(saved.card.entreprise ? [{ icon: "🏢", label: "Structure", value: saved.card.entreprise }] : []),
    ...(saved.card.titre    ? [{ icon: "📌", label: "Thème",    value: saved.card.titre }]    : []),
    ...(saved.card.but      ? [{ icon: "🎯", label: "Objectif", value: saved.card.but }]      : []),
    ...(date ? [{ icon: "📅", label: "Date", value: new Date(date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) }] : []),
    ...(saved.card.lieuMarriage  ? [{ icon: "📍", label: "Lieu", value: saved.card.lieuMarriage }]  : []),
    ...(saved.card.lieuBapteme   ? [{ icon: "📍", label: "Lieu", value: saved.card.lieuBapteme }]   : []),
    ...(saved.card.lieuReunion   ? [{ icon: "📍", label: "Lieu", value: saved.card.lieuReunion }]   : []),
    ...(saved.card.lieuDeces     ? [{ icon: "📍", label: "Lieu", value: saved.card.lieuDeces }]     : []),
    ...(saved.card.lienReunion   ? [{ icon: "🔗", label: "Lien", value: saved.card.lienReunion }]   : []),
    ...(saved.card.contact       ? [{ icon: "📞", label: "Contact", value: saved.card.contact }]    : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backdropFilter: "blur(8px)", backgroundColor: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden relative"
        style={{ maxHeight: "92vh", overflowY: "auto", boxShadow: "0 40px 120px rgba(0,0,0,0.8)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Hero ── */}
        <div className="relative" style={{ minHeight: 200, background: bg }}>
          {mainPhoto && (
            <img src={mainPhoto} alt="" className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: 0.55 }} />
          )}
          {/* Gradient overlay hero */}
          <div className="absolute inset-0" style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.7) 100%)"
          }} />
          {/* Bouton fermer */}
          <button onClick={onClose}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center font-bold text-white"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
            ✕
          </button>
          {/* Branding */}
          <div className="absolute top-4 left-4 z-20">
            <span className="text-[9px] font-bold uppercase tracking-[3px] text-white/40">Moftal Info</span>
          </div>
          {/* Info hero */}
          <div className="relative z-10 px-5 pt-14 pb-5">
            <div className="flex items-end gap-3">
              <span className="text-5xl drop-shadow-2xl">{getCardEmoji(saved.type)}</span>
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">{getCardTitle(saved.type)}</p>
                <h2 className="text-2xl font-black text-white leading-tight drop-shadow-md">{getCardSummary(saved.type, saved.card)}</h2>
                {date && (
                  <p className="text-white/55 text-xs mt-0.5">
                    {new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Corps ── */}
        <div className="bg-gray-950 px-4 py-4 space-y-4">

          {/* Galerie photos */}
          {photos.length > 1 && (
            <div>
              <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-2">Photos</p>
              <div className="grid grid-cols-3 gap-3">
                {photos.map((p, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden cursor-pointer group relative border-2 border-white/10" onClick={() => setLightbox(p)}>
                    <img src={p} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Infos clés */}
          {infoLines.length > 0 && (
            <div className="rounded-2xl overflow-hidden border border-white/6" style={{ background: "rgba(255,255,255,0.04)" }}>
              {infoLines.map((line, i) => (
                <div key={i} className={`flex items-start gap-3 px-4 py-3 ${i < infoLines.length - 1 ? "border-b border-white/6" : ""}`}>
                  <span className="text-base flex-shrink-0 mt-0.5">{line.icon}</span>
                  <div className="min-w-0">
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider leading-none mb-0.5">{line.label}</p>
                    <p className="text-white/85 text-sm font-medium leading-snug break-words">{line.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Message */}
          {saved.card.message && saved.card.message.length > 2 && (
            <div className="rounded-2xl px-4 py-3 border border-white/6" style={{ background: "rgba(255,255,255,0.04)" }}>
              <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-2">💬 Message</p>
              <p className="text-white/80 text-sm leading-relaxed italic">"{saved.card.message}"</p>
            </div>
          )}

          {/* Agenda / Programme */}
          {saved.card.agenda.some(Boolean) && (
            <div className="rounded-2xl overflow-hidden border border-white/6" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="px-4 py-3 border-b border-white/6">
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">📋 Programme</p>
              </div>
              <div className="px-4 py-2">
                {saved.card.agenda.filter(Boolean).map((a, i) => (
                  <div key={i} className="flex items-start gap-3 py-2">
                    <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/50 font-bold flex-shrink-0 mt-0.5">{i+1}</span>
                    <p className="text-white/75 text-sm">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vidéo */}
          {(saved.card.rencontreVideo || saved.card.videoSante) && (
            <div>
              <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-2">▶ Vidéo</p>
              <video src={(saved.card.rencontreVideo || saved.card.videoSante)!} controls
                className="w-full rounded-2xl" style={{ background: "#000" }} />
            </div>
          )}

          {/* Audio */}
          {saved.card.audioUrl && (
            <div className="rounded-2xl px-4 py-3 border border-white/6" style={{ background: "rgba(255,255,255,0.04)" }}>
              <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-2">🎤 Message vocal</p>
              <audio src={saved.card.audioUrl} controls className="w-full" style={{ height: 36 }} />
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-[9px] text-gray-700 uppercase tracking-widest pb-2">Moftal · Moftal Info</p>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.97)" }}
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl" />
          <button className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 text-white text-xl font-bold flex items-center justify-center hover:bg-white/20 transition-colors">✕</button>
        </div>
      )}
    </div>
  );
}

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5002').replace(/\/api\/?$/, '');

export default function InfoWallou() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<CardType | null>(null);
  const [card, setCard] = useState<CardState>(defaultCard("mariage"));
  const [showPublish, setShowPublish] = useState(false);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [viewingCard, setViewingCard] = useState<SavedCard | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Système de points InfoWallou
  const [pointsDisponibles, setPointsDisponibles] = useState<number | null>(null);
  const [userNumeroH, setUserNumeroH] = useState<string | null>(null);
  const [showAcheterPoints, setShowAcheterPoints] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [sendToNumeroH, setSendToNumeroH] = useState('');
  const [sendStatus, setSendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [sendError, setSendError] = useState('');

  // PWA : manifest indépendant pour Info Moftal
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);

  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    const originalHref = link?.href;
    if (link) link.href = '/manifest-info-moftal.webmanifest';

    if (window.matchMedia('(display-mode: standalone)').matches) setPwaInstalled(true);

    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setPwaInstalled(true));

    return () => {
      if (link && originalHref) link.href = originalHref;
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  useEffect(() => {
    const session = localStorage.getItem("session_user");
    if (!session) return;
    try {
      const parsed = JSON.parse(session);
      const user = parsed.userData || parsed;
      if (user?.numeroH) {
        setUserNumeroH(user.numeroH);
        const token = localStorage.getItem("token");
        fetch(`${API_BASE}/api/quotas/my-points`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json()).then(d => {
          if (d.success) setPointsDisponibles(d.pointsDisponibles);
        }).catch(() => {});
      }
    } catch {}
  }, []);

  // "Carte gratuite" = première carte créée dans cette session (trackée par localStorage par user)
  const freeCardKey = userNumeroH ? `iw_free_${userNumeroH}` : null;
  const freeCardUsed = freeCardKey ? localStorage.getItem(freeCardKey) === "1" : false;

  // Touch swipe pour le carousel
  const touchStartX = useRef(0);
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(dx) > 60) el.scrollBy({ left: dx < 0 ? 180 : -180, behavior: "smooth" });
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => { el.removeEventListener("touchstart", onStart); el.removeEventListener("touchend", onEnd); };
  }, [savedCards]);

  const handleSaveCard = async () => {
    if (!selected) return;

    // Mode édition : pas de coût
    if (editingId) {
      setSavedCards(prev => prev.map(s => s.id === editingId ? { ...s, card, type: selected } : s));
      setEditingId(null);
      setSelected(null);
      return;
    }

    // Nouvelle carte : vérifier si la carte gratuite a déjà été utilisée
    if (!freeCardUsed) {
      // Première carte → GRATUITE, on marque dans localStorage
      if (freeCardKey) localStorage.setItem(freeCardKey, "1");
      setSavedCards(prev => [...prev, { id: Date.now().toString(), type: selected, card, savedAt: Date.now() }]);
      setSelected(null);
      return;
    }

    // Cartes suivantes → coûtent 2 points (= 1 000 FG)
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Connectez-vous pour créer une carte payante.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/quotas/consume-infowallou`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setShowAcheterPoints(true);
        return;
      }

      setPointsDisponibles(data.pointsRestants);
      setSavedCards(prev => [...prev, { id: Date.now().toString(), type: selected, card, savedAt: Date.now() }]);
      setSelected(null);
    } catch {
      alert("Erreur réseau. Vérifiez votre connexion et réessayez.");
    }
  };

  const handleEditSaved = (saved: SavedCard) => {
    setSelected(saved.type);
    setCard(saved.card);
    setEditingId(saved.id);
  };

  const handleDeleteSaved = (id: string) => {
    setSavedCards(prev => prev.filter(s => s.id !== id));
  };

  const copyToClipboard = async (text: string, format: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedFormat(format); setTimeout(() => setCopiedFormat(null), 2500); } catch { alert(text); }
  };

  const handleSendToMember = async () => {
    if (!sendToNumeroH.trim()) return;
    setSendStatus('loading'); setSendError('');
    const token = localStorage.getItem('token');
    if (!token) { setSendStatus('error'); setSendError('Connectez-vous pour envoyer.'); return; }
    try {
      const shareText = generateShareText(card, selected!);
      const res = await fetch(`${API_BASE}/api/notifications/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipientNumeroH: sendToNumeroH.trim(), message: shareText, title: getCardTitle(selected!) })
      });
      const data = await res.json();
      if (data.success) { setSendStatus('success'); setSendToNumeroH(''); setTimeout(() => setSendStatus('idle'), 3000); }
      else { setSendStatus('error'); setSendError(data.message || 'Erreur lors de l\'envoi.'); }
    } catch { setSendStatus('error'); setSendError('Erreur réseau.'); }
  };

  const handleSelect = (type: CardType) => { setSelected(type); setCard(defaultCard(type)); setSendStatus('idle'); setSendToNumeroH(''); };

  const downloadCard = () => {
    const el = document.getElementById("iw-card");
    if (!el) return;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Moftal Info</title>
<style>body{margin:0;padding:16px;background:#0f172a;display:flex;justify-content:center;align-items:flex-start;min-height:100vh;font-family:sans-serif;}</style>
</head><body>${el.outerHTML}</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `moftal-info-${card.type}-${Date.now()}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  const renderCard = () => {
    const p = { card, setCard };
    switch (selected) {
      case "mariage":          return <CarreauMariage {...p} />;
      case "fiancailles":      return <CarreauFiancailles {...p} />;
      case "bapteme":          return <CarreauBapteme {...p} />;
      case "naissance":        return <CarreauNaissance {...p} />;
      case "deces":            return <CarreauDeces {...p} />;
      case "commemoration":    return <CarreauCommemoration {...p} />;
      case "reunion_physique": return <CarreauReunionPhysique {...p} />;
      case "conference":       return <CarreauConference {...p} />;
      case "reunion_ligne":    return <CarreauReunionLigne {...p} />;
      case "webinaire":        return <CarreauWebinaire {...p} />;
      case "sante":            return <CarreauSante {...p} />;
      case "urgence":          return <CarreauUrgence {...p} />;
      case "anniversaire":     return <CarreauAnniversaire {...p} />;
      case "fete":             return <CarreauFete {...p} />;
      case "priere":           return <CarreauPriere {...p} />;
      case "aide":             return <CarreauAide {...p} />;
      case "emploi":           return <CarreauEmploi {...p} />;
      case "condoleances":     return <CarreauCondoleances {...p} />;
      case "felicitations":    return <CarreauFelicitations {...p} />;
      case "remerciement":     return <CarreauRemerciement {...p} />;
      case "appel_communaute": return <CarreauAppelCommunaute {...p} />;
      case "temoignage":       return <CarreauTemoignage {...p} />;
      case "communique":       return <CarreauCommunique {...p} />;
      case "demande_pardon":   return <CarreauDemandePardon {...p} />;
    }
  };

  // ── Ecran de choix ──────────────────────────────────────────────────────────
  if (!selected) return (
    <div className="min-h-screen py-0 px-0" style={{ background: "linear-gradient(160deg, #0a0a0f 0%, #0f1623 50%, #0a0a0f 100%)" }}>

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden px-5 pt-10 pb-8" style={{
        background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 50%, rgba(6,182,212,0.06) 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)"
      }}>
        {/* Cercles décoratifs en fond */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #818cf8, transparent 70%)" }} />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full opacity-8" style={{ background: "radial-gradient(circle, #06b6d4, transparent 70%)" }} />

        <div className="relative max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              📢
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[3px] text-gray-500 font-bold">Moftal</p>
              <h1 className="text-2xl font-black text-white leading-tight">Moftal Info</h1>
            </div>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
            Créez et partagez vos annonces familiales et communautaires en quelques secondes.
          </p>
          <div className="mt-4 flex gap-2 flex-wrap">
            {[["📷", "Photos"], ["🎤", "Vocal"], ["🎬", "Vidéo"], ["📅", "Dates"]].map(([icon, label]) => (
              <span key={label} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-gray-400 border border-white/8"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                {icon} {label}
              </span>
            ))}
          </div>

          {/* Bouton installer PWA */}
          {!pwaInstalled && installPrompt && (
            <button onClick={handleInstallPwa}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 4px 16px rgba(79,70,229,0.4)" }}>
              <img src="/icon-info-moftal.svg" alt="Info Moftal" width="22" height="22" style={{ borderRadius: 5, background: "#fff" }} />
              Installer Info Moftal
            </button>
          )}
          {pwaInstalled && (
            <span className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-emerald-300 border border-emerald-500/30"
              style={{ background: "rgba(16,185,129,0.08)" }}>
              <img src="/icon-info-moftal.svg" alt="" width="16" height="16" style={{ borderRadius: 3 }} />
              Application installée
            </span>
          )}

          {/* Badge points / statut freemium */}
          <div className="mt-4 flex items-center gap-3">
            {!freeCardUsed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-300 border border-emerald-500/30"
                style={{ background: "rgba(16,185,129,0.1)" }}>
                🎁 1ère carte GRATUITE disponible
              </span>
            ) : (
              <button onClick={() => setShowAcheterPoints(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors"
                style={{
                  background: (pointsDisponibles ?? 0) > 0 ? "rgba(99,102,241,0.15)" : "rgba(239,68,68,0.1)",
                  borderColor: (pointsDisponibles ?? 0) > 0 ? "rgba(99,102,241,0.4)" : "rgba(239,68,68,0.4)",
                  color: (pointsDisponibles ?? 0) > 0 ? "#a5b4fc" : "#fca5a5"
                }}>
                🪙 {pointsDisponibles ?? "—"} pts · {(pointsDisponibles ?? 0) > 0 ? `${Math.floor((pointsDisponibles ?? 0) / 2)} cartes restantes` : "Acheter des points →"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4">

        {/* ── Galerie carousel ── */}
        {savedCards.length > 0 && (
          <div className="pt-6 pb-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white font-bold text-sm">Mes annonces</p>
                <p className="text-gray-600 text-[11px]">{savedCards.length} carte{savedCards.length > 1 ? "s" : ""} sauvegardée{savedCards.length > 1 ? "s" : ""}</p>
              </div>
              <span className="text-gray-700 text-[11px]">Glisser →</span>
            </div>
            <div
              ref={carouselRef}
              className="flex gap-3 overflow-x-auto py-2 -mx-1 px-1"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {savedCards.map(saved => (
                <MiniCard
                  key={saved.id}
                  saved={saved}
                  onView={() => setViewingCard(saved)}
                  onEdit={() => handleEditSaved(saved)}
                  onDelete={() => handleDeleteSaved(saved.id)}
                />
              ))}
            </div>
            {/* Séparateur */}
            <div className="mt-6 flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              <p className="text-gray-600 text-[11px] uppercase tracking-widest font-bold">Nouveau</p>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>
          </div>
        )}

        {/* ── Grille des templates ── */}
        <div className={`space-y-6 ${savedCards.length === 0 ? "pt-6" : "pt-4"} pb-10`}>
          {TEMPLATE_GROUPS.map(g => (
            <div key={g.group}>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 font-bold text-sm">{g.group}</p>
                  <p className="text-gray-600 text-[11px]">{g.desc}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {g.items.map(t => (
                  <button key={t.type} onClick={() => handleSelect(t.type)}
                    className={`bg-gradient-to-br ${t.bg} rounded-2xl overflow-hidden border border-white/8 active:scale-95 transition-all duration-200 group`}
                    style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
                    <div className="px-4 py-5 flex flex-col items-start gap-2">
                      <span className="text-4xl group-hover:scale-110 transition-transform duration-200">{t.emoji}</span>
                      <span className="text-white font-bold text-sm leading-tight text-left">{t.label}</span>
                    </div>
                    <div className="px-4 pb-3">
                      <div className="h-px w-full bg-white/10 mb-2" />
                      <p className="text-white/40 text-[10px] font-medium">Créer →</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-[10px] text-gray-800 uppercase tracking-widest pb-8">Moftal · Moftal Info</p>
      </div>

      {viewingCard && <CardViewModal saved={viewingCard} onClose={() => setViewingCard(null)} />}

      {/* Modal : Points insuffisants (écran de choix) */}
      {showAcheterPoints && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="rounded-2xl w-full max-w-sm overflow-hidden" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="p-6 text-center">
              <div className="text-4xl mb-3">🪙</div>
              <h3 className="text-white font-black text-lg mb-1">Points insuffisants</h3>
              <p className="text-gray-400 text-sm mb-4">
                Chaque carte coûte <strong className="text-white">1 000 FG</strong> (2 points).<br/>
                Achetez des points pour continuer à créer des annonces.
              </p>
              <div className="rounded-xl p-4 mb-4 text-left" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <p className="text-indigo-300 text-xs font-bold mb-2">Offre disponible</p>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-bold text-sm">Pack mensuel</p>
                    <p className="text-gray-400 text-xs">Cartes illimitées pendant 1 mois</p>
                  </div>
                  <span className="text-indigo-300 font-black text-base">10 000 FG</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAcheterPoints(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)" }}>
                  Annuler
                </button>
                <button onClick={() => { setShowAcheterPoints(false); navigate('/acheter-points'); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                  Acheter des points
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Ecran edition ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen py-0" style={{ background: "linear-gradient(160deg, #0a0a0f 0%, #0f1623 50%, #0a0a0f 100%)" }}>

      {/* Barre de navigation édition */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between" style={{
        background: "rgba(10,10,15,0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)"
      }}>
        <button onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span className="text-sm font-medium">Retour</span>
        </button>
        <div className="text-center">
          <p className="text-white font-bold text-sm">{getCardTitle(selected!)}</p>
          <p className="text-gray-600 text-[10px]">Moftal Info</p>
        </div>
        <button onClick={handleSaveCard}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all"
          style={{ background: "linear-gradient(135deg, #1a8f1a, #22a722)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/>
          </svg>
          {editingId ? "Mettre à jour" : "Sauvegarder"}
        </button>
      </div>

      <div className="max-w-sm mx-auto px-4 py-6">
        <div id="iw-card">{renderCard()}</div>

        <p className="text-center text-[9px] text-gray-800 mt-2 uppercase tracking-widest">
          Moftal · Moftal Info · {new Date().toLocaleDateString("fr-FR")}
        </p>

        {/* Actions */}
        <div className="mt-5 space-y-2">
          {/* Bouton principal Sauvegarder */}
          <button onClick={handleSaveCard}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-98"
            style={{ background: "linear-gradient(135deg, #1a8f1a, #22a722)", boxShadow: "0 8px 32px rgba(16,185,129,0.35)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
            </svg>
            {editingId ? "Mettre à jour la carte" : "Sauvegarder dans ma galerie"}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={downloadCard}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-gray-300 transition-all border border-white/10 hover:border-white/20 hover:text-white"
              style={{ background: "rgba(255,255,255,0.06)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Télécharger
            </button>
            <button onClick={() => setShowPublish(true)}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white transition-all"
              style={{ background: "linear-gradient(135deg, #2563eb, #3b82f6)", boxShadow: "0 4px 16px rgba(59,130,246,0.3)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              Publier
            </button>
          </div>

          {/* ── Partager via messagerie ── */}
          <div className="mt-5 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="px-4 pt-4 pb-2">
              <p className="text-white font-bold text-sm mb-1">📤 Formats de partage</p>
              <p className="text-gray-500 text-[11px] mb-3">Copiez le texte dans le format de votre choix</p>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => copyToClipboard(generateShareText(card, selected!), 'whatsapp')}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: copiedFormat === 'whatsapp' ? "rgba(37,211,102,0.25)" : "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.25)", color: copiedFormat === 'whatsapp' ? "#4ade80" : "#22c55e" }}>
                  <span className="text-xl">📱</span>
                  {copiedFormat === 'whatsapp' ? '✅ Copié !' : 'WhatsApp'}
                </button>
                <button onClick={() => {
                    const txt = generateShareText(card, selected!).replace(/\*/g, '').replace(/_/g, '');
                    copyToClipboard(txt, 'sms');
                  }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: copiedFormat === 'sms' ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: copiedFormat === 'sms' ? "#a5b4fc" : "#818cf8" }}>
                  <span className="text-xl">💬</span>
                  {copiedFormat === 'sms' ? '✅ Copié !' : 'SMS'}
                </button>
                <button onClick={() => {
                    const txt = generateShareText(card, selected!).replace(/\*/g, '').replace(/_/g, '');
                    const subject = encodeURIComponent(getCardTitle(selected!));
                    const body = encodeURIComponent(txt);
                    window.open(`mailto:?subject=${subject}&body=${body}`);
                  }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: "rgba(234,88,12,0.1)", border: "1px solid rgba(234,88,12,0.25)", color: "#fb923c" }}>
                  <span className="text-xl">📧</span>
                  Email
                </button>
              </div>
            </div>

            {/* ── Envoyer à un membre Moftal ── */}
            <div className="px-4 pt-3 pb-4 border-t border-white/8 mt-3">
              <p className="text-white font-bold text-sm mb-1">🔔 Envoyer à un membre Moftal</p>
              <p className="text-gray-500 text-[11px] mb-3">Le destinataire recevra ce message dans ses notifications</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sendToNumeroH}
                  onChange={e => { setSendToNumeroH(e.target.value); setSendStatus('idle'); }}
                  placeholder="NuméroH du destinataire..."
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none text-white placeholder-gray-600"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                />
                <button onClick={handleSendToMember} disabled={sendStatus === 'loading' || !sendToNumeroH.trim()}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                  style={{ background: sendStatus === 'success' ? "rgba(16,185,129,0.7)" : "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                  {sendStatus === 'loading' ? '⏳' : sendStatus === 'success' ? '✅' : '→'}
                </button>
              </div>
              {sendStatus === 'success' && <p className="mt-2 text-xs text-emerald-400">✅ Message envoyé avec succès !</p>}
              {sendStatus === 'error' && <p className="mt-2 text-xs text-red-400">❌ {sendError}</p>}
            </div>
          </div>
        </div>
      </div>

      {showPublish && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-xs p-5">
            <h3 className="text-base font-bold text-white mb-1">Publier l'information</h3>
            <p className="text-xs text-gray-500 mb-4">Choisissez la page de destination</p>
            <div className="space-y-2">
              {[["Ma page Famille", "/famille"], ["Page Sante", "/sante"], ["Page Activites", "/activite"], ["Page Solidarite", "/solidarite"]].map(([label, path]) => (
                <button key={path} onClick={() => { setShowPublish(false); alert(`Pret pour "${label}". Publication en deploiement.`); }}
                  className="w-full text-left px-4 py-3 border border-gray-700 rounded-xl hover:bg-white/10 text-sm text-gray-200 transition-colors">
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowPublish(false)} className="mt-3 w-full py-2 text-xs text-gray-600 hover:text-gray-400">Annuler</button>
          </div>
        </div>
      )}

      {viewingCard && <CardViewModal saved={viewingCard} onClose={() => setViewingCard(null)} />}

      {/* Modal : Points insuffisants → acheter */}
      {showAcheterPoints && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="rounded-2xl w-full max-w-sm overflow-hidden" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="p-6 text-center">
              <div className="text-4xl mb-3">🪙</div>
              <h3 className="text-white font-black text-lg mb-1">Points insuffisants</h3>
              <p className="text-gray-400 text-sm mb-4">
                Chaque carte coûte <strong className="text-white">1 000 FG</strong> (2 points).<br/>
                Achetez des points pour continuer à créer des annonces.
              </p>
              <div className="rounded-xl p-4 mb-4 text-left" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <p className="text-indigo-300 text-xs font-bold mb-2">Offre disponible</p>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-bold text-sm">Pack mensuel</p>
                    <p className="text-gray-400 text-xs">Cartes illimitées pendant 1 mois</p>
                  </div>
                  <span className="text-indigo-300 font-black text-base">10 000 FG</span>
                </div>
              </div>
              <p className="text-gray-600 text-xs mb-4">
                Contactez l'administrateur via WhatsApp pour acheter vos points.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowAcheterPoints(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)" }}>
                  Annuler
                </button>
                <button onClick={() => { setShowAcheterPoints(false); navigate('/acheter-points'); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                  Acheter des points
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
