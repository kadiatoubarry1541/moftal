import { useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { useI18n } from '../i18n/useI18n';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface ProofItem {
  id: string;
  fileUrl: string;
  fileName: string | null;
  numeroH: string;
  createdAt: string;
}

interface MemberRef {
  numeroH: string;
  prenom?: string;
  nomFamille?: string;
}

interface Props {
  groupId: string;
  myNumeroH: string;
}

export interface ResidenceProofsHandle {
  openMine: () => void;
  openMember: (member: MemberRef) => void;
}

const ResidenceProofs = forwardRef<ResidenceProofsHandle, Props>(function ResidenceProofs(
  { groupId, myNumeroH },
  ref
) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'mine' | 'view'>('mine');
  const [viewedMember, setViewedMember] = useState<MemberRef | null>(null);
  const [proofs, setProofs] = useState<ProofItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const token = () => localStorage.getItem('token');

  const charger = useCallback(async (targetNumeroH: string, isMine: boolean) => {
    setLoading(true);
    try {
      const url = isMine
        ? `${API_BASE}/api/residence-proofs/mine?groupId=${encodeURIComponent(groupId)}`
        : `${API_BASE}/api/residence-proofs/member/${encodeURIComponent(targetNumeroH)}?groupId=${encodeURIComponent(groupId)}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
      const d = await r.json();
      if (d.success) setProofs(d.proofs || []);
    } catch {
      setProofs([]);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useImperativeHandle(ref, () => ({
    openMine: () => { setMode('mine'); setViewedMember(null); setOpen(true); charger(myNumeroH, true); },
    openMember: (member: MemberRef) => { setMode('view'); setViewedMember(member); setOpen(true); charger(member.numeroH, false); }
  }), [charger, myNumeroH]);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('groupId', groupId);
      formData.append('document', file);
      const r = await fetch(`${API_BASE}/api/residence-proofs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData
      });
      const d = await r.json();
      if (d.success) charger(myNumeroH, true);
      else alert(d.message || 'Erreur lors de l\'envoi.');
    } catch {
      alert('Impossible de contacter le serveur.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('terre_adam.confirm_delete_proof'))) return;
    try {
      const r = await fetch(`${API_BASE}/api/residence-proofs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      });
      const d = await r.json();
      if (d.success) charger(myNumeroH, true);
      else alert(d.message || 'Erreur.');
    } catch {
      alert('Impossible de contacter le serveur.');
    }
  }

  if (!open) return null;

  const title = mode === 'mine'
    ? t('terre_adam.my_residence_proof')
    : `${t('terre_adam.member_proofs_of')} ${viewedMember?.prenom || ''} ${viewedMember?.nomFamille || ''}`.trim();

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-emerald-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-bold text-base truncate">{title}</h2>
          <button onClick={() => setOpen(false)} className="text-white text-2xl font-bold leading-none flex-shrink-0 ml-2">×</button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {mode === 'mine' && (
            <>
              <p className="text-xs text-gray-500">{t('terre_adam.residence_proof_desc')}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm"
              >
                {uploading ? t('terre_adam.uploading') : `📎 ${t('terre_adam.upload_document')}`}
              </button>
            </>
          )}
          {loading ? (
            <p className="text-center text-gray-400 text-sm py-6">…</p>
          ) : proofs.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">{t('terre_adam.no_proof_uploaded')}</p>
          ) : (
            <div className="space-y-2">
              {proofs.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                  <a href={p.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 min-w-0 text-emerald-700 font-semibold text-sm">
                    📄 <span className="truncate">{p.fileName || t('terre_adam.view_document')}</span>
                  </a>
                  {mode === 'mine' && (
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 text-xs font-semibold flex-shrink-0">
                      {t('btn.delete')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default ResidenceProofs;
