/**
 * AddPersonModal — Modal universel pour trouver une personne
 * 5 méthodes : NumeroH | Téléphone | QR Code | Écrit | Vidéo
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import QrScanner from 'qr-scanner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';

type Mode = 'numeroh' | 'phone' | 'qr' | 'ecrit' | 'video';
type QrSub = 'show' | 'scan';
type PermState = 'unknown' | 'checking' | 'granted' | 'denied' | 'prompt';

interface FoundUser {
  numeroH: string;
  prenom?: string;
  nomFamille?: string;
}

interface Props {
  title: string;
  onSelect: (numeroH: string) => void;
  onClose: () => void;
  myNumeroH?: string;
  myPrenom?: string;
  myNom?: string;
}

export function AddPersonModal({ title, onSelect, onClose, myNumeroH, myPrenom, myNom }: Props) {
  const [mode, setMode] = useState<Mode>('numeroh');

  const [inputNumeroH, setInputNumeroH] = useState('');

  const [phoneInput, setPhoneInput] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [phoneResult, setPhoneResult] = useState<FoundUser | null>(null);

  const [qrSub, setQrSub] = useState<QrSub>('show');
  const [qrActive, setQrActive] = useState(false);
  const [qrError, setQrError] = useState('');
  const [qrFound, setQrFound] = useState<FoundUser | null>(null);
  const [qrScanning, setQrScanning] = useState(false);
  const [permState, setPermState] = useState<PermState>('unknown');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const permWatcherRef = useRef<PermissionStatus | null>(null);
  const qrCameraRef = useRef<HTMLInputElement>(null);
  const qrGalleryRef = useRef<HTMLInputElement>(null);

  const [ecritPrenom, setEcritPrenom] = useState('');
  const [ecritNom, setEcritNom] = useState('');
  const [ecritLoading, setEcritLoading] = useState(false);
  const [ecritError, setEcritError] = useState('');
  const [ecritResults, setEcritResults] = useState<FoundUser[]>([]);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoNumeroH, setVideoNumeroH] = useState('');
  const videoFileRef = useRef<HTMLInputElement>(null);

  // ── Stop scanner ──
  const stopLiveScanner = useCallback(() => {
    if (qrScannerRef.current) { qrScannerRef.current.stop(); qrScannerRef.current.destroy(); qrScannerRef.current = null; }
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setQrActive(false);
  }, []);

  // Nettoyage à la fermeture
  useEffect(() => {
    return () => {
      stopLiveScanner();
      if (permWatcherRef.current) { permWatcherRef.current.onchange = null; }
    };
  }, []);

  // ── Vérification permission caméra ──
  const checkPermission = useCallback(async (autoStart = false) => {
    if (!navigator.permissions) { setPermState('unknown'); return; }
    try {
      setPermState('checking');
      const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setPermState(status.state as PermState);

      // Surveiller les changements (utilisateur active dans les paramètres)
      permWatcherRef.current = status;
      status.onchange = () => {
        setPermState(status.state as PermState);
        if (status.state === 'granted') {
          setQrError('');
          // Démarrer automatiquement quand l'utilisateur vient d'activer
          startScanner();
        }
      };

      if (autoStart && status.state === 'granted') {
        startScanner();
      }
    } catch {
      setPermState('unknown');
    }
  }, []);

  // Vérifier la permission dès qu'on ouvre l'onglet scanner
  useEffect(() => {
    if (mode === 'qr' && qrSub === 'scan') {
      checkPermission(false);
    }
  }, [mode, qrSub]);

  // ── Démarrer le scanner en direct (qr-scanner WebAssembly — pro) ──
  const startScanner = useCallback(async () => {
    setQrError('');
    setQrFound(null);
    stopLiveScanner();

    // Afficher l'élément vidéo dans le DOM
    setQrActive(true);

    // Attendre que React monte <video> dans le DOM
    let video: HTMLVideoElement | null = null;
    for (let i = 0; i < 30; i++) {
      video = videoRef.current;
      if (video) break;
      await new Promise(r => requestAnimationFrame(r));
    }
    if (!video) { setQrActive(false); setQrError('unknown'); return; }

    try {
      const scanner = new QrScanner(
        video,
        (result) => {
          const data = typeof result === 'string' ? result : result.data;
          if (data.startsWith('ADAM://friend/')) {
            stopLiveScanner();
            setQrFound({ numeroH: data.replace('ADAM://friend/', '').trim() });
          }
        },
        {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          returnDetailedScanResult: true,
          maxScansPerSecond: 10,
        }
      );
      qrScannerRef.current = scanner;
      await scanner.start();
      setPermState('granted');
    } catch (err: any) {
      setQrActive(false);
      const name = err?.name || String(err) || '';
      if (name.includes('NotAllowed') || name.includes('Permission')) { setPermState('denied'); setQrError('denied'); }
      else if (name.includes('NotFound') || name.includes('Devices')) setQrError('not_found');
      else if (name.includes('NotReadable') || name.includes('TrackStart')) setQrError('busy');
      else setQrError('unknown');
    }
  }, [stopLiveScanner]);

  // ── Analyser une image fixe ──
  const processImageFile = useCallback((file: File) => {
    setQrError('');
    setQrScanning(true);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { setQrScanning(false); return; }
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code?.data.startsWith('ADAM://friend/')) {
          setQrFound({ numeroH: code.data.replace('ADAM://friend/', '').trim() });
        } else {
          setQrError('no_qr');
        }
      } finally {
        URL.revokeObjectURL(url);
        setQrScanning(false);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); setQrScanning(false); setQrError('bad_image'); };
    img.src = url;
  }, []);

  const searchByPhone = async () => {
    if (!phoneInput.trim()) return;
    setPhoneLoading(true); setPhoneError(''); setPhoneResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/friends/search-by-phone?tel=${encodeURIComponent(phoneInput.trim())}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success && data.user) setPhoneResult({ numeroH: data.user.numeroH, prenom: data.user.prenom, nomFamille: data.user.nomFamille });
      else setPhoneError(data.message || 'Aucun compte trouvé avec ce numéro.');
    } catch { setPhoneError('Erreur réseau. Vérifiez votre connexion.'); }
    finally { setPhoneLoading(false); }
  };

  const searchByName = async () => {
    if (!ecritPrenom.trim() && !ecritNom.trim()) return;
    setEcritLoading(true); setEcritError(''); setEcritResults([]);
    try {
      const params = new URLSearchParams();
      if (ecritPrenom.trim()) params.append('prenom', ecritPrenom.trim());
      if (ecritNom.trim()) params.append('nom', ecritNom.trim());
      const res = await fetch(`${API_BASE}/api/friends/search-by-name?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success && data.users?.length) setEcritResults(data.users.map((u: any) => ({ numeroH: u.numeroH, prenom: u.prenom, nomFamille: u.nomFamille })));
      else setEcritError(data.message || 'Aucun résultat trouvé.');
    } catch { setEcritError('Erreur réseau.'); }
    finally { setEcritLoading(false); }
  };

  const switchMode = (m: Mode) => {
    stopLiveScanner();
    setMode(m);
    setPhoneResult(null); setPhoneError('');
    setQrFound(null); setQrError(''); setQrScanning(false);
    setEcritResults([]); setEcritError('');
    setVideoFile(null); setVideoNumeroH('');
  };

  const handleClose = () => { stopLiveScanner(); onClose(); };
  const handleSelect = (n: string) => { stopLiveScanner(); onSelect(n); };

  // ── Rendu message d'erreur QR ──
  const renderQrError = () => {
    if (!qrError) return null;

    if (qrError === 'denied' || permState === 'denied') {
      return (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">🔒</span>
            <div>
              <p className="font-bold text-amber-800 text-sm">La caméra est bloquée dans Chrome</p>
              <p className="text-xs text-amber-700 mt-0.5">Suivez ces 3 étapes pour l'activer :</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {[
              { n: '1', icon: '🔒', text: 'Appuyez sur le cadenas 🔒 dans la barre d\'adresse du navigateur' },
              { n: '2', icon: '📋', text: 'Tapez sur "Autorisations du site"' },
              { n: '3', icon: '📷', text: 'Tapez "Caméra" puis sélectionnez "Autoriser"' },
            ].map(step => (
              <div key={step.n} className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step.n}</div>
                <p className="text-xs text-amber-800">{step.text}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-600 text-center">Après avoir activé, revenez ici et appuyez sur "Réessayer"</p>
          <div className="flex gap-2">
            <button
              onClick={() => { setQrError(''); setPermState('unknown'); startScanner(); }}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold"
            >
              🔄 Réessayer
            </button>
            <button
              onClick={() => { setQrError(''); qrCameraRef.current?.click(); }}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold"
            >
              📸 Photo
            </button>
          </div>
        </div>
      );
    }

    const messages: Record<string, string> = {
      not_supported: "Scan en direct non disponible sur ce navigateur.",
      not_found: "Aucune caméra détectée sur cet appareil.",
      busy: "La caméra est utilisée par une autre application. Fermez-la et réessayez.",
      no_qr: "Aucun QR Code Moftal trouvé dans cette image. Assurez-vous que le QR Code est net et bien cadré.",
      bad_image: "Impossible de lire cette image. Essayez une autre photo.",
      unknown: "Impossible d'accéder à la caméra.",
    };

    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-2">
        <p className="text-sm text-red-700">{messages[qrError] || qrError}</p>
        <div className="flex gap-2">
          <button onClick={() => { setQrError(''); startScanner(); }}
            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold">
            🔄 Réessayer
          </button>
          <button onClick={() => { setQrError(''); qrCameraRef.current?.click(); }}
            className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold">
            📸 Photo
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="bg-white rounded-2xl w-full shadow-2xl overflow-hidden" style={{ maxWidth: 460, maxHeight: '92vh' }}>

        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-lg font-bold text-gray-900">➕ {title}</h3>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-xl">&times;</button>
        </div>

        <div className="flex border-b border-gray-200 mx-5">
          {([
            { key: 'numeroh', label: '🔢 NumH' },
            { key: 'phone',   label: '📞 Tél.' },
            { key: 'qr',      label: '📷 QR' },
            { key: 'ecrit',   label: '✍️ Écrit' },
            { key: 'video',   label: '🎬 Vidéo' },
          ] as { key: Mode; label: string }[]).map(tab => (
            <button key={tab.key} onClick={() => switchMode(tab.key)}
              className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                mode === tab.key ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="mb-3" />

        <div className="px-5 pb-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 145px)' }}>

          {/* ── NumeroH ── */}
          {mode === 'numeroh' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">NumeroH de la personne</label>
                <input type="text" value={inputNumeroH}
                  onChange={e => setInputNumeroH(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && inputNumeroH.trim()) handleSelect(inputNumeroH.trim()); }}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  placeholder="Ex: G1C1P2R1E1F1 1" autoFocus />
              </div>
              <div className="flex gap-3">
                <button onClick={handleClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm">Annuler</button>
                <button onClick={() => inputNumeroH.trim() && handleSelect(inputNumeroH.trim())} disabled={!inputNumeroH.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold text-sm">
                  Confirmer →
                </button>
              </div>
            </>
          )}

          {/* ── Téléphone ── */}
          {mode === 'phone' && (
            <>
              <p className="text-sm text-gray-500">Entrez le numéro de téléphone pour trouver la personne.</p>
              <div className="flex gap-2">
                <input type="tel" value={phoneInput}
                  onChange={e => { setPhoneInput(e.target.value); setPhoneResult(null); setPhoneError(''); }}
                  onKeyDown={e => e.key === 'Enter' && searchByPhone()}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  placeholder="+224 6XX XXX XXX" autoFocus />
                <button onClick={searchByPhone} disabled={phoneLoading || !phoneInput.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm">
                  {phoneLoading ? '...' : 'Chercher'}
                </button>
              </div>
              {phoneError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{phoneError}</p>}
              {phoneResult && (
                <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-lg">{phoneResult.prenom?.[0] || '?'}</div>
                    <div>
                      <p className="font-semibold text-gray-900">{phoneResult.prenom} {phoneResult.nomFamille}</p>
                      <p className="text-xs text-gray-500">{phoneResult.numeroH}</p>
                    </div>
                  </div>
                  <button onClick={() => handleSelect(phoneResult.numeroH)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm">
                    Sélectionner cette personne →
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Écrit ── */}
          {mode === 'ecrit' && (
            <>
              <p className="text-sm text-gray-500">Recherchez par prénom ou nom de famille.</p>
              <div className="flex gap-2">
                <input type="text" value={ecritPrenom}
                  onChange={e => { setEcritPrenom(e.target.value); setEcritResults([]); setEcritError(''); }}
                  onKeyDown={e => e.key === 'Enter' && searchByName()}
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  placeholder="Prénom" autoFocus />
                <input type="text" value={ecritNom}
                  onChange={e => { setEcritNom(e.target.value); setEcritResults([]); setEcritError(''); }}
                  onKeyDown={e => e.key === 'Enter' && searchByName()}
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  placeholder="Nom" />
              </div>
              <button onClick={searchByName} disabled={ecritLoading || (!ecritPrenom.trim() && !ecritNom.trim())}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm">
                {ecritLoading ? 'Recherche...' : '🔍 Chercher'}
              </button>
              {ecritError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{ecritError}</p>}
              {ecritResults.map(u => (
                <div key={u.numeroH} className="border border-emerald-200 bg-emerald-50 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold shrink-0">{u.prenom?.[0] || '?'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{u.prenom} {u.nomFamille}</p>
                    <p className="text-xs text-gray-500 truncate">{u.numeroH}</p>
                  </div>
                  <button onClick={() => handleSelect(u.numeroH)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shrink-0">
                    Choisir
                  </button>
                </div>
              ))}
            </>
          )}

          {/* ── Vidéo ── */}
          {mode === 'video' && (
            <>
              <p className="text-sm text-gray-500">Enregistrez ou choisissez une vidéo, puis entrez le NumeroH.</p>
              <input ref={videoFileRef} type="file" accept="video/*" className="hidden"
                onChange={e => setVideoFile(e.target.files?.[0] || null)} />
              {!videoFile ? (
                <div className="flex gap-2">
                  <button onClick={() => { videoFileRef.current?.setAttribute('capture', 'user'); videoFileRef.current?.click(); }}
                    className="flex-1 py-3 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-600 text-sm font-semibold hover:bg-emerald-50">📹 Filmer</button>
                  <button onClick={() => { videoFileRef.current?.removeAttribute('capture'); videoFileRef.current?.click(); }}
                    className="flex-1 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 text-sm font-semibold hover:bg-gray-50">🎞️ Galerie</button>
                </div>
              ) : (
                <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-3 flex items-center gap-2">
                  <span className="text-2xl">🎬</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{videoFile.name}</p>
                    <p className="text-xs text-gray-500">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <button onClick={() => setVideoFile(null)} className="text-red-400 text-lg">✕</button>
                </div>
              )}
              <input type="text" value={videoNumeroH} onChange={e => setVideoNumeroH(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="NumeroH de la personne" />
              <button onClick={() => videoFile && videoNumeroH.trim() && handleSelect(videoNumeroH.trim())}
                disabled={!videoFile || !videoNumeroH.trim()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm">
                Confirmer →
              </button>
            </>
          )}

          {/* ── QR Code ── */}
          {mode === 'qr' && (
            <>
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                <button onClick={() => { stopLiveScanner(); setQrSub('show'); setQrFound(null); setQrError(''); }}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors ${qrSub === 'show' ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                  📱 Mon QR Code
                </button>
                <button onClick={() => setQrSub('scan')}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors ${qrSub === 'scan' ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                  📷 Scanner
                </button>
              </div>

              {qrSub === 'show' && myNumeroH && (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="bg-white border-4 border-emerald-500 rounded-2xl p-3 shadow-md">
                    <QRCodeSVG value={`ADAM://friend/${myNumeroH}`} size={180} level="M" marginSize={0} />
                  </div>
                  <p className="font-semibold text-gray-800">{myPrenom} {myNom}</p>
                  <p className="text-xs text-gray-400 text-center">Faites scanner ce QR Code pour être trouvé</p>
                </div>
              )}

              {qrSub === 'scan' && (
                <div className="flex flex-col gap-3">
                  {/* Inputs cachés */}
                  <input ref={qrCameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) processImageFile(f); e.target.value = ''; }} />
                  <input ref={qrGalleryRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) processImageFile(f); e.target.value = ''; }} />

                  {/* ── QR Code trouvé ── */}
                  {qrFound ? (
                    <div className="border-2 border-emerald-400 bg-emerald-50 rounded-2xl p-5 space-y-3 text-center">
                      <div className="text-5xl">✅</div>
                      <p className="font-bold text-gray-800 text-base">QR Code détecté !</p>
                      <p className="text-sm text-gray-600 font-mono bg-white rounded-lg px-3 py-2 border border-gray-200">{qrFound.numeroH}</p>
                      <button onClick={() => handleSelect(qrFound.numeroH)}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-base">
                        ✅ Sélectionner cette personne
                      </button>
                      <button onClick={() => { setQrFound(null); setQrError(''); stopLiveScanner(); }}
                        className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-semibold">
                        Scanner un autre
                      </button>
                    </div>

                  ) : qrScanning ? (
                    /* Analyse en cours */
                    <div className="flex flex-col items-center gap-3 py-8">
                      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-gray-600 font-medium">Analyse du QR Code...</p>
                    </div>

                  ) : qrActive ? (
                    /* ── Scanner vidéo en direct actif (qr-scanner WebAssembly) ── */
                    <div className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden bg-black" style={{ minHeight: 260 }}>
                        <video ref={videoRef} className="w-full" playsInline muted style={{ display: 'block' }} />
                        <canvas ref={canvasRef} className="hidden" />
                      </div>
                      <p className="text-center text-xs text-emerald-600 font-medium">
                        🎯 Pointez vers le QR Code Moftal — détection automatique
                      </p>
                      <button onClick={stopLiveScanner}
                        className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-sm font-semibold">
                        ⏹ Arrêter le scan
                      </button>
                    </div>

                  ) : (
                    /* ── État initial / après erreur ── */
                    <div className="space-y-3">
                      {/* Erreur / guide permission */}
                      {qrError && renderQrError()}

                      {!qrError && (
                        <>
                          {/* Vérification permission en cours */}
                          {permState === 'checking' && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                              Vérification de la caméra...
                            </div>
                          )}

                          {/* Bouton scan principal */}
                          <button
                            onClick={startScanner}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-3 shadow-lg"
                          >
                            <span className="text-2xl">📷</span>
                            <div className="text-left">
                              <div>Scanner en direct</div>
                              <div className="text-xs font-normal opacity-80">Ouverture de la caméra</div>
                            </div>
                          </button>

                          <div className="flex items-center gap-2">
                            <hr className="flex-1 border-gray-200" />
                            <span className="text-xs text-gray-400">ou</span>
                            <hr className="flex-1 border-gray-200" />
                          </div>

                          {/* Appareil photo natif */}
                          <button onClick={() => qrCameraRef.current?.click()}
                            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                            📸 Prendre une photo du QR Code
                          </button>

                          {/* Galerie */}
                          <button onClick={() => qrGalleryRef.current?.click()}
                            className="w-full py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-500 rounded-xl text-xs font-medium flex items-center justify-center gap-2">
                            🖼️ Choisir depuis la galerie
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-5 pb-4 pt-2 border-t border-gray-100">
          <button onClick={handleClose}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-semibold">
            Fermer
          </button>
        </div>
      </div>

      {/* Animation ligne de scan */}
      <style>{`
        @keyframes scanLine {
          0%, 100% { transform: translateY(-40px); opacity: 0.3; }
          50% { transform: translateY(40px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
