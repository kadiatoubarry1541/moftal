import { useState } from 'react';
import { config } from '../config/api';

type Secteur = 'primaire' | 'secondaire' | 'tertiaire' | 'quaternaire';

interface Props {
  /** Si fourni, le secteur est fixé (page détaillée). Sinon, l'utilisateur le choisit (page d'accueil). */
  secteur?: Secteur;
  className?: string;
}

const SECTEUR_OPTIONS: { value: Secteur; label: string }[] = [
  { value: 'primaire', label: 'Primaire — Céréales, Légumes, Animaux, Poissons' },
  { value: 'secondaire', label: 'Secondaire — Habits, Chaussures, Sacs, Cosmétiques' },
  { value: 'tertiaire', label: 'Tertiaire — Meubles, Électroménager, Matériaux, Outils' },
  { value: 'quaternaire', label: 'Quaternaire — Téléphones, Ordinateurs, TV, Voitures' },
];

export function DevenirVendeurButton({ secteur, className }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nomBoutique: '',
    secteur: secteur || ('' as Secteur | ''),
    telephone: '',
    ville: '',
    description: '',
  });

  const submit = async () => {
    if (!form.nomBoutique.trim()) { setError('Le nom de la boutique est obligatoire'); return; }
    if (!form.secteur) { setError('Choisissez un secteur'); return; }
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${config.API_BASE_URL}/exchange/register-vendor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nomBoutique: form.nomBoutique.trim(),
          secteur: form.secteur,
          telephone: form.telephone.trim(),
          ville: form.ville.trim(),
          description: form.description.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
      } else {
        setError(data.message || "Erreur lors de l'envoi de la demande.");
      }
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => { if (!submitting) setOpen(false); };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || 'flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors'}
      >
        🏪 Devenir vendeur
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={close}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {sent ? (
              <>
                <div className="text-center py-4">
                  <div className="text-4xl mb-3">✅</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Demande envoyée !</h3>
                  <p className="text-sm text-gray-600">Un administrateur examinera votre dossier sous peu.</p>
                </div>
                <button onClick={() => setOpen(false)} className="mt-4 w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors">
                  Fermer
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Devenir vendeur</h3>
                <p className="text-xs text-gray-500 mb-4">Votre demande sera examinée par un administrateur avant approbation.</p>
                <div className="space-y-3">
                  {!secteur && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Secteur *</label>
                      <select
                        value={form.secteur}
                        onChange={e => setForm(f => ({ ...f, secteur: e.target.value as Secteur }))}
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                      >
                        <option value="">— Choisir —</option>
                        {SECTEUR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nom de la boutique *</label>
                    <input
                      type="text"
                      value={form.nomBoutique}
                      onChange={e => setForm(f => ({ ...f, nomBoutique: e.target.value }))}
                      placeholder="Ex : Boutique Fatoumata"
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={form.telephone}
                      onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Ville</label>
                    <input
                      type="text"
                      value={form.ville}
                      onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Description <span className="font-normal text-gray-400">(optionnel)</span>
                    </label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 resize-none"
                    />
                  </div>
                  {error && <p className="text-xs text-red-500">{error}</p>}
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={close} disabled={submitting} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors disabled:opacity-50">
                    Annuler
                  </button>
                  <button onClick={submit} disabled={submitting} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-60">
                    {submitting ? 'Envoi...' : 'Envoyer'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
