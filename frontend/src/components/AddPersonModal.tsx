/**
 * AddPersonModal — Modal universel pour trouver une personne
 * 3 méthodes : NumeroH | Téléphone | QR Code
 * Usage : onSelect(numeroH) est appelé quand une personne est identifiée
 */
import { useState, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';

type Mode = 'numeroh' | 'phone' | 'qr';
type QrSub = 'show' | 'scan';

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

  // NumeroH
  const [inputNumeroH, setInputNumeroH] = useState('');

  // Téléphone
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [phoneResult, setPhoneResult] = useState<FoundUser | null>(null);

  // QR
  const [qrSub, setQrSub] = useState<QrSub>('show');
  const [qrActive, setQrActive] = useState(false);
  const [qrError, setQrError] = useState('');
  const [qrFound, setQrFound] = useState<FoundUser | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopScanner = useCallback(() => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setQrActive(false);
  }, []);

  const startScanner = useCallback(async () => {
    setQrError('');
    setQrFound(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setQrActive(true);

      scanIntervalRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx || video.videoWidth === 0) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data.startsWith('ADAM://friend/')) {
          const num = code.data.replace('ADAM://friend/', '').trim();
          stopScanner();
          setQrFound({ numeroH: num });
        }
      }, 300);
    } catch {
      setQrError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  }, [stopScanner]);

  const searchByPhone = async () => {
    if (!phoneInput.trim()) return;
    setPhoneLoading(true);
    setPhoneError('');
    setPhoneResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/friends/search-by-phone?tel=${encodeURIComponent(phoneInput.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.user) {
        setPhoneResult({ numeroH: data.user.numeroH, prenom: data.user.prenom, nomFamille: data.user.nomFamille });
      } else {
        setPhoneError(data.message || 'Aucun compte trouvé avec ce numéro.');
      }
    } catch {
      setPhoneError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setPhoneLoading(false);
    }
  };

  const switchMode = (m: Mode) => { stopScanner(); setMode(m); setPhoneResult(null); setPhoneError(''); setQrFound(null); setQrError(''); };

  const handleClose = () => { stopScanner(); onClose(); };

  const handleSelect = (numeroH: string) => { stopScanner(); onSelect(numeroH); };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="bg-white rounded-2xl w-full shadow-2xl overflow-hidden" style={{ maxWidth: 460, maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-lg font-bold text-gray-900">➕ {title}</h3>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all text-xl">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mx-5 mb-4">
          {([
            { key: 'numeroh', label: '🔢 NumeroH' },
            { key: 'phone',   label: '📞 Téléphone' },
            { key: 'qr',      label: '📷 QR Code' },
          ] as { key: Mode; label: string }[]).map(tab => (
            <button key={tab.key} onClick={() => switchMode(tab.key)}
              className={`flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                mode === tab.key ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="px-5 pb-5 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>

          {/* ── NumeroH ── */}
          {mode === 'numeroh' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">NumeroH de la personne</label>
                <input
                  type="text"
                  value={inputNumeroH}
                  onChange={e => setInputNumeroH(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && inputNumeroH.trim()) handleSelect(inputNumeroH.trim()); }}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  placeholder="Ex: G1C1P2R1E1F1 1"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={handleClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition-all">Annuler</button>
                <button
                  onClick={() => inputNumeroH.trim() && handleSelect(inputNumeroH.trim())}
                  disabled={!inputNumeroH.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold text-sm transition-all"
                >
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
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={e => { setPhoneInput(e.target.value); setPhoneResult(null); setPhoneError(''); }}
                  onKeyDown={e => e.key === 'Enter' && searchByPhone()}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  placeholder="+224 6XX XXX XXX"
                  autoFocus
                />
                <button onClick={searchByPhone} disabled={phoneLoading || !phoneInput.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition-all">
                  {phoneLoading ? '...' : 'Chercher'}
                </button>
              </div>

              {phoneError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{phoneError}</p>}

              {phoneResult && (
                <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-lg">
                      {phoneResult.prenom?.[0] || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{phoneResult.prenom} {phoneResult.nomFamille}</p>
                      <p className="text-xs text-gray-500">{phoneResult.numeroH}</p>
                    </div>
                  </div>
                  <button onClick={() => handleSelect(phoneResult.numeroH)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all">
                    Sélectionner cette personne →
                  </button>
                </div>
              )}

              {!phoneResult && !phoneError && (
                <div className="flex justify-end">
                  <button onClick={handleClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold">Annuler</button>
                </div>
              )}
            </>
          )}

          {/* ── QR Code ── */}
          {mode === 'qr' && (
            <>
              {/* Sous-tabs */}
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                <button onClick={() => { stopScanner(); setQrSub('show'); setQrFound(null); setQrError(''); }}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors ${qrSub === 'show' ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                  📱 Mon QR Code
                </button>
                <button onClick={() => setQrSub('scan')}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors ${qrSub === 'scan' ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                  📷 Scanner
                </button>
              </div>

              {/* Mon QR Code */}
              {qrSub === 'show' && myNumeroH && (
                <div className="flex flex-col items-center gap-3 py-3">
                  <div className="bg-white border-4 border-emerald-500 rounded-2xl p-3 shadow-md">
                    <QRCodeSVG value={`ADAM://friend/${myNumeroH}`} size={180} level="M" marginSize={0} />
                  </div>
                  <p className="font-semibold text-gray-800">{myPrenom} {myNom}</p>
                  <p className="text-xs text-gray-500 text-center">Faites scanner ce QR Code pour être trouvé</p>
                </div>
              )}

              {/* Scanner */}
              {qrSub === 'scan' && (
                <div className="flex flex-col items-center gap-3">
                  {!qrActive && !qrFound && (
                    <button onClick={startScanner}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all">
                      📷 Activer la caméra
                    </button>
                  )}
                  {qrActive && (
                    <div className="w-full relative">
                      <video ref={videoRef} className="w-full rounded-xl" playsInline muted />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute inset-0 border-2 border-emerald-400 rounded-xl pointer-events-none" />
                      <p className="text-center text-xs text-gray-500 mt-2">Pointez vers un QR Code Adam...</p>
                      <button onClick={stopScanner}
                        className="mt-2 w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-sm font-semibold">
                        ⏹ Arrêter
                      </button>
                    </div>
                  )}
                  {qrError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 w-full">{qrError}</p>}
                  {qrFound && (
                    <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 w-full space-y-3">
                      <p className="text-sm font-semibold text-gray-800">✅ QR Code détecté</p>
                      <p className="text-xs text-gray-600">{qrFound.prenom || qrFound.numeroH}</p>
                      <button onClick={() => handleSelect(qrFound.numeroH)}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all">
                        Sélectionner →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
