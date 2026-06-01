import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config/api';

interface School {
  id: string;
  name: string;
  address?: string;
  contact?: string;
  description?: string;
  createdByNumeroH: string;
  isActive: boolean;
}

export default function Ecoles() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', contact: '', description: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${config.API_BASE_URL}/education/schools`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setSchools(data.schools || []);
      }
    } catch {
      setSchools([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setFormLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${config.API_BASE_URL}/education/register-school`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message || 'École enregistrée avec succès.', ok: true });
        setForm({ name: '', address: '', contact: '', description: '' });
        setShowForm(false);
        loadSchools();
      } else {
        setMessage({ text: data.message || 'Erreur lors de l\'inscription.', ok: false });
      }
    } catch {
      setMessage({ text: 'Erreur de connexion.', ok: false });
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🏫 Écoles &amp; Établissements</h1>
            <p className="text-gray-600 mt-1">Liste des écoles partenaires de la communauté</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
            >
              + Inscrire mon école
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Retour
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Formulaire d'inscription */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-violet-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Inscrire mon établissement</h2>
            <p className="text-gray-600 text-sm mb-4">
              Votre école sera visible dans cette liste après validation par un administrateur.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l&apos;établissement <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex : Lycée Moftal"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse (optionnel)</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Ville, pays"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact (optionnel)</label>
                <input
                  type="text"
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  placeholder="Téléphone ou email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Présentation (optionnel)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Quelques mots sur l'établissement..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              {message && (
                <p className={`text-sm font-medium ${message.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {message.text}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {formLoading ? 'Enregistrement...' : 'Enregistrer mon école'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {message && !showForm && (
          <div className={`p-4 rounded-lg ${message.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {/* Liste des écoles */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Écoles partenaires
            {!loading && <span className="ml-2 text-sm font-normal text-gray-500">({schools.length})</span>}
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
            </div>
          ) : schools.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-5xl mb-3">🏫</div>
              <p className="text-lg font-medium text-gray-600 mb-1">Aucune école enregistrée pour l&apos;instant</p>
              <p className="text-sm">Soyez le premier à inscrire votre établissement !</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
              >
                Inscrire mon école
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schools.map((s) => (
                <div key={s.id} className="border border-violet-100 rounded-xl p-4 hover:shadow-md transition-shadow bg-violet-50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-violet-200 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                      🏫
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-base">{s.name}</h3>
                      {s.address && (
                        <p className="text-gray-500 text-sm mt-0.5">📍 {s.address}</p>
                      )}
                      {s.contact && (
                        <p className="text-gray-500 text-sm mt-0.5">📞 {s.contact}</p>
                      )}
                      {s.description && (
                        <p className="text-gray-600 text-sm mt-1">{s.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
