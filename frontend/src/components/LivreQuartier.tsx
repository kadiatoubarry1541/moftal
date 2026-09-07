import { useState, useCallback, forwardRef, useImperativeHandle } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface Props {
  scope: string;
  location: string;
  locationName: string;
  canPublish?: boolean;
}

interface DocumentItem {
  id: string;
  titre: string;
  description: string | null;
  fileUrl: string;
  fileName: string | null;
  uploadedByNom: string | null;
  uploadedByNumeroH: string;
  createdAt: string;
}

export interface LivreQuartierHandle {
  open: () => void;
}

function getMyNumeroH(): string | null {
  try {
    const parsed = JSON.parse(localStorage.getItem('session_user') || '{}');
    return (parsed.userData || parsed)?.numeroH || null;
  } catch { return null; }
}

const LivreQuartier = forwardRef<LivreQuartierHandle, Props>(function LivreQuartier(
  { scope, location, locationName, canPublish = false },
  ref
) {
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');
  const [showAjouter, setShowAjouter] = useState(false);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const myNumeroH = getMyNumeroH();

  const token = () => localStorage.getItem('token');

  const charger = useCallback(async () => {
    setLoading(true);
    setErreur('');
    try {
      const r = await fetch(
        `${API_BASE}/api/quartier-documents?scope=${encodeURIComponent(scope)}&location=${encodeURIComponent(location)}`,
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      const d = await r.json();
      if (d.success) setDocuments(d.documents || []);
      else setErreur(d.message || 'Erreur.');
    } catch {
      setErreur('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }, [scope, location]);

  useImperativeHandle(ref, () => ({
    open: () => { setOpen(true); charger(); }
  }), [charger]);

  async function ajouterDocument() {
    if (!titre.trim() || !fichier) return alert('Titre et fichier requis.');
    setEnvoiEnCours(true);
    try {
      const formData = new FormData();
      formData.append('scope', scope);
      formData.append('location', location);
      formData.append('locationName', locationName);
      formData.append('titre', titre.trim());
      if (description.trim()) formData.append('description', description.trim());
      formData.append('document', fichier);
      const r = await fetch(`${API_BASE}/api/quartier-documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData
      });
      const d = await r.json();
      if (d.success) {
        setTitre(''); setDescription(''); setFichier(null); setShowAjouter(false);
        charger();
      } else {
        alert(d.message || 'Erreur lors de l\'envoi.');
      }
    } catch {
      alert('Impossible de contacter le serveur.');
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function supprimerDocument(id: string) {
    if (!confirm('Retirer ce document ?')) return;
    try {
      const r = await fetch(`${API_BASE}/api/quartier-documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      });
      const d = await r.json();
      if (d.success) charger();
      else alert(d.message || 'Erreur.');
    } catch {
      alert('Impossible de contacter le serveur.');
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[88vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
          <h2 className="font-black text-base">📚 Livre — {locationName}</h2>
          <button onClick={() => setOpen(false)} className="text-gray-400 text-xl leading-none">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {erreur && <div className="bg-red-50 text-red-700 text-sm p-2 rounded-lg">{erreur}</div>}

          {canPublish && (
            !showAjouter ? (
              <button onClick={() => setShowAjouter(true)} className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold rounded-xl transition-colors">
                + Ajouter un document
              </button>
            ) : (
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Titre du document" className="w-full border rounded-lg px-3 py-2 text-sm" />
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optionnel)" rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={e => setFichier(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowAjouter(false)} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors">
                    Annuler
                  </button>
                  <button onClick={ajouterDocument} disabled={envoiEnCours} className="flex-1 py-2 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors">
                    {envoiEnCours ? 'Envoi...' : 'Publier'}
                  </button>
                </div>
              </div>
            )
          )}

          {loading && documents.length === 0 && <div className="text-center text-sm text-gray-400 py-6">Chargement...</div>}

          {!loading && documents.length === 0 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
              <p className="text-gray-500 text-sm font-medium">Aucun document pour l'instant</p>
            </div>
          )}

          <div className="space-y-2">
            {documents.map(doc => (
              <a
                key={doc.id}
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl flex-shrink-0">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">{doc.titre}</p>
                  {doc.description && <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{doc.description}</p>}
                  <p className="text-gray-400 text-xs mt-1">
                    {doc.uploadedByNom} · {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                {(canPublish || doc.uploadedByNumeroH === myNumeroH) && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); supprimerDocument(doc.id); }}
                    className="text-gray-300 hover:text-red-500 text-sm flex-shrink-0"
                  >
                    ✕
                  </button>
                )}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default LivreQuartier;
