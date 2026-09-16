import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSessionUser } from "../utils/auth";
import { useI18n } from "../i18n/useI18n";

function getCategories(t: (key: string) => string) {
  return [
    { id: "actualites",    label: t('info.cat_actualites'),    emoji: "📰",  color: "#0891b2", bg: "#ecfeff",  unread: 0 },
    { id: "opportunites",  label: t('info.cat_opportunites'),  emoji: "💼",  color: "#1a8f1a", bg: "#f0fdf0",  unread: 0 },
    { id: "sante",         label: t('info.cat_sante'),         emoji: "🏥", color: "#1a8f1a", bg: "#f0fdfa",  unread: 0 },
    { id: "education",     label: t('info.cat_education'),     emoji: "🎓",  color: "#7c3aed", bg: "#f5f3ff",  unread: 0 },
    { id: "religion",      label: t('info.cat_religion'),      emoji: "☪️",  color: "#1a8f1a", bg: "#f0fdf0",  unread: 0 },
    { id: "economie",      label: t('info.cat_economie'),      emoji: "📊",  color: "#d97706", bg: "#fffbeb",  unread: 0 },
    { id: "culture",       label: t('info.cat_culture'),       emoji: "🎭",  color: "#db2777", bg: "#fdf2f8",  unread: 0 },
    { id: "technologie",   label: t('info.cat_technologie'),   emoji: "💡",  color: "#6366f1", bg: "#eef2ff",  unread: 0 },
    { id: "environnement", label: t('info.cat_environnement'), emoji: "🌿",  color: "#156315", bg: "#f0fdf0",  unread: 0 },
    { id: "sport",         label: t('info.cat_sport'),         emoji: "⚽",  color: "#ea580c", bg: "#fff7ed",  unread: 0 },
    { id: "securite",      label: t('info.cat_securite'),      emoji: "🛡️",  color: "#dc2626", bg: "#fef2f2",  unread: 0 },
    { id: "international", label: t('info.cat_international'), emoji: "🌍",  color: "#64748b", bg: "#f8fafc",  unread: 0 },
  ];
}

// Pages qui bénéficient de notifications
function getPagesNotif(t: (key: string) => string) {
  return [
    { label: t('info.notif_group_messages'),      emoji: "💬", pages: ["Mes Amours / Messenger"] },
    { label: t('info.notif_group_rdv'),          emoji: "📅", pages: ["Espace Pro", "Prendre RDV"] },
    { label: t('info.notif_group_actualites'),           emoji: "📰", pages: ["Page Info", "À Retenir", "Histoire Humanité"] },
    { label: t('info.notif_group_opportunites'),         emoji: "💼", pages: ["Activité", "Échanges", "Solidarité"] },
    { label: t('info.notif_group_science'),  emoji: "🔬", pages: ["Science"] },
    { label: t('info.notif_group_education'),            emoji: "🎓", pages: ["Éducation", "Mes Cours"] },
    { label: t('info.notif_group_reseau'), emoji: "🤝", pages: ["Réseau Imam", "Gestion Interne"] },
    { label: t('info.notif_group_famille'),              emoji: "👨‍👩‍👧", pages: ["Famille", "Galerie Famille"] },
  ];
}

export default function Info() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const CATEGORIES = getCategories(t);
  const PAGES_NOTIF = getPagesNotif(t);
  const user = getSessionUser();
  const [activeTab, setActiveTab] = useState<"info" | "notif">("info");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center p-8">
          <div className="text-5xl mb-4">📰</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{t('info.not_logged_title')}</h2>
          <p className="text-slate-500 mb-6">{t('info.not_logged_desc')}</p>
          <button onClick={() => navigate("/login")} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            {t('info.login_btn')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-700 to-blue-600 text-white px-4 py-10 text-center">
        <div className="text-5xl mb-3">📰</div>
        <h1 className="text-3xl font-extrabold mb-2">{t('info.hero_title')}</h1>
        <p className="text-indigo-100 text-base max-w-lg mx-auto">
          {t('info.hero_desc')}
        </p>
      </div>

      {/* Onglets */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab("info")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === "info" ? "bg-indigo-600 text-white shadow" : "bg-white text-slate-600 border hover:border-indigo-300"}`}
          >
            {t('info.tab_info')}
          </button>
          <button
            onClick={() => setActiveTab("notif")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === "notif" ? "bg-indigo-600 text-white shadow" : "bg-white text-slate-600 border hover:border-indigo-300"}`}
          >
            {t('info.tab_notif')}
          </button>
        </div>

        {/* Tab : Informations */}
        {activeTab === "info" && (
          <>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-800">{t('info.categories_title')}</h2>
              <p className="text-slate-500 text-sm mt-1">
                {t('info.categories_desc')}
              </p>
            </div>

            {/* Badge non-lus (futur) */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-5 flex items-start gap-3">
              <div className="text-2xl">💡</div>
              <div>
                <p className="font-bold text-indigo-800 text-sm">{t('info.unread_principle_title')}</p>
                <p className="text-indigo-600 text-xs mt-1 leading-relaxed">
                  {t('info.unread_principle_desc')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                  className="relative flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border-2 transition-all duration-200 hover:shadow-md text-center"
                  style={{ borderColor: activeCategory === cat.id ? cat.color : "#e2e8f0", background: activeCategory === cat.id ? cat.bg : "white" }}
                >
                  {cat.unread > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {cat.unread}
                    </span>
                  )}
                  <div className="text-3xl">{cat.emoji}</div>
                  <div className="font-semibold text-slate-800 text-xs leading-tight">{cat.label}</div>
                </button>
              ))}
            </div>

            {activeCategory && (() => {
              const cat = CATEGORIES.find(c => c.id === activeCategory)!;
              return (
                <div className="mt-5 bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: cat.color + "44" }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-3xl">{cat.emoji}</div>
                    <h3 className="font-bold text-slate-800 text-lg">{cat.label}</h3>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-6 text-center">
                    <div className="text-4xl mb-3">📝</div>
                    <p className="text-slate-600 font-medium">{t('info.no_publication_yet')}</p>
                    <p className="text-slate-400 text-sm mt-1">
                      {t('info.publications_will_appear')}
                    </p>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* Tab : Pages avec notifications */}
        {activeTab === "notif" && (
          <>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-800">{t('info.notif_pages_title')}</h2>
              <p className="text-slate-500 text-sm mt-1">
                {t('info.notif_pages_desc')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PAGES_NOTIF.map((item, i) => (
                <div key={i} className="bg-white rounded-xl border p-4 flex items-start gap-3 hover:shadow-sm transition-shadow">
                  <div className="text-2xl w-10 h-10 flex items-center justify-center bg-slate-50 rounded-xl flex-shrink-0">{item.emoji}</div>
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{item.label}</div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {item.pages.map((p, j) => (
                        <span key={j} className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">{p}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="font-bold text-amber-800 text-sm mb-1">{t('info.unread_first_title')}</p>
              <p className="text-amber-700 text-xs leading-relaxed">
                {t('info.unread_first_desc')}
              </p>
            </div>
          </>
        )}

        {/* Raccourcis */}
        <div className="mt-8 mb-8">
          <h3 className="font-bold text-slate-800 mb-3">{t('info.quick_access_title')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button onClick={() => navigate("/a-retenir")} className="flex flex-col items-center gap-1.5 p-3 bg-white border rounded-xl hover:shadow-sm transition-all text-center">
              <span className="text-xl">📌</span><span className="text-xs font-semibold text-slate-700">{t('info.shortcut_a_retenir')}</span>
            </button>
            <button onClick={() => navigate("/histoire-humanite")} className="flex flex-col items-center gap-1.5 p-3 bg-white border rounded-xl hover:shadow-sm transition-all text-center">
              <span className="text-xl">📜</span><span className="text-xs font-semibold text-slate-700">{t('info.shortcut_histoire')}</span>
            </button>
            <button onClick={() => navigate("/science")} className="flex flex-col items-center gap-1.5 p-3 bg-white border rounded-xl hover:shadow-sm transition-all text-center">
              <span className="text-xl">🔬</span><span className="text-xs font-semibold text-slate-700">{t('science.title')}</span>
            </button>
            <button onClick={() => navigate("/solidarite")} className="flex flex-col items-center gap-1.5 p-3 bg-white border rounded-xl hover:shadow-sm transition-all text-center">
              <span className="text-xl">🤝</span><span className="text-xs font-semibold text-slate-700">{t('famille.menu.solidarite')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
