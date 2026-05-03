import { useState, useRef, useEffect } from 'react';

interface AudioRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => void;
  /** Durée max en secondes (défaut 10) */
  maxDuration?: number;
  /** Mode compact pour les barres de chat (défaut false) */
  compact?: boolean;
}

export function AudioRecorder({ onAudioRecorded, maxDuration = 10, compact = false }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const maxDurationMs = maxDuration * 1000;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onAudioRecorded(blob);
        setIsRecording(false);
        setDuration(0);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(1000);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          const next = prev + 1000;
          if (next >= maxDurationMs) {
            stopRecording();
            return maxDurationMs;
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      setError("Impossible d'accéder au micro. Vérifiez les permissions.");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  /* ── Mode compact (barre de chat) ── */
  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-1">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-medium transition-colors"
          >
            <span className="w-2 h-2 bg-white rounded-full" />
            🎙️ Enregistrer
          </button>
        ) : (
          <>
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
            <span className="text-sm font-medium text-red-700 flex-shrink-0">{formatTime(duration)}</span>
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-300"
                style={{ width: `${(duration / maxDurationMs) * 100}%` }}
              />
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="flex-shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-medium transition-colors"
            >
              ⏹ Stop
            </button>
          </>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  /* ── Mode normal (plein) ── */
  return (
    <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
      {!isRecording ? (
        <>
          <p className="text-sm text-slate-600 mb-2">
            Cliquez pour enregistrer un message vocal (max {maxDuration}s).
          </p>
          <button
            type="button"
            onClick={startRecording}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium flex items-center gap-2"
          >
            <span className="w-3 h-3 bg-white rounded-full" />
            Démarrer l'enregistrement
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-slate-700">
              {formatTime(duration)} / {maxDuration}s
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(duration / maxDurationMs) * 100}%` }}
            />
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
          >
            Arrêter
          </button>
        </>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
