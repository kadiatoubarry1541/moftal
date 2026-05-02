import { useState, useEffect, useRef } from 'react';

const TERMS_KEY = 'terms_accepted_v1';

export function hasAcceptedTerms(): boolean {
  return localStorage.getItem(TERMS_KEY) === 'true';
}

export function resetTermsAcceptance(): void {
  localStorage.removeItem(TERMS_KEY);
}

export const CONDITIONS = [
  {
    num: 1,
    titre: 'Identification de la plateforme',
    texte: "La plateforme Moftal (« Les Enfants d'Adam ») est exploitée par son fondateur, entrepreneur individuel enregistré en République de Guinée (RCCM Conakry). Pour tout contact : moftal.contact@gmail.com. En créant un compte, vous concluez un accord juridiquement contraignant avec Moftal.",
  },
  {
    num: 2,
    titre: 'Responsabilité & Contenu',
    texte: "En utilisant Moftal, vous assumez l'entière responsabilité de ce que vous publiez. Vous vous engagez à ne jamais publier de contenu sexuel, haineux, violent, illégal ou portant atteinte à autrui sans son consentement. Tout manquement entraîne la suspension immédiate et définitive du compte, sans remboursement.",
  },
  {
    num: 3,
    titre: 'Collecte et finalité des données personnelles',
    texte: "Moftal collecte uniquement les données que vous saisissez volontairement (nom, prénom, date de naissance, liens familiaux, coordonnées). Ces données sont utilisées exclusivement pour : (1) faire fonctionner votre compte et votre arbre généalogique, (2) vous mettre en relation avec des membres de votre famille, (3) vous proposer les services de la plateforme. Aucune donnée n'est vendue à des tiers. Conformément à la Loi L/2016/037/AN de la République de Guinée relative à la cybersécurité et à la protection des données à caractère personnel.",
  },
  {
    num: 4,
    titre: 'Données généalogiques — Saisie volontaire',
    texte: "Toutes les informations généalogiques (arbres familiaux, liens de parenté, dates, lieux) sont saisies librement et volontairement par vous-même. Moftal ne collecte, ne copie ni n'extrait aucune donnée provenant de bases gouvernementales, d'état civil ou de registres officiels. Vous certifiez avoir le droit de publier les informations concernant les membres de votre famille que vous ajoutez.",
  },
  {
    num: 5,
    titre: 'Identité mémorielle des personnes décédées — NumeroHD',
    texte: "Les personnes décédées n'ont pas de compte actif sur Moftal. Elles existent uniquement comme identité mémorielle permanente dans l'arbre généalogique afin de préserver la continuité familiale. Chaque défunt reçoit automatiquement un NumeroHD (identifiant unique de défunt) qui remplace son NumeroH de vivant. Ce NumeroHD garantit son identité unique, fixe et inaltérable dans la mémoire de la plateforme. Dès qu'un décès est enregistré : (1) le compte devient inactif, (2) toutes les actions du compte sont gelées, (3) le NumeroHD est attribué définitivement. Ces données mémoriales ne peuvent pas être supprimées car elles appartiennent à l'histoire familiale collective de toute l'humanité. Seule une erreur d'identité signalée par la famille peut faire l'objet d'une correction.",
  },
  {
    num: 6,
    titre: 'Protection des mineurs',
    texte: "Les enfants de moins de 18 ans ne peuvent pas créer de compte personnel. Leurs informations ne peuvent apparaître dans un arbre généalogique que si un parent ou tuteur légal les a ajoutées. Tout compte d'un mineur détecté sera immédiatement suspendu. Si vous avez connaissance d'un mineur sans supervision sur la plateforme, signalez-le à moftal.contact@gmail.com.",
  },
  {
    num: 7,
    titre: 'Liberté & Contrôle de vos données personnelles',
    texte: "Tout utilisateur actif (NumeroH) a le droit à tout moment de : (1) consulter ses données personnelles, (2) les corriger ou les modifier, (3) demander la suppression de son compte actif en écrivant à moftal.contact@gmail.com — traité dans un délai de 30 jours. Important : ce droit s'applique uniquement aux comptes actifs des personnes vivantes. Les identités mémorielles des défunts (NumeroHD) dans l'arbre généalogique ne peuvent pas être supprimées car elles appartiennent à l'histoire familiale collective de l'humanité et sont protégées par le droit mémoriel. Si un défunt a été ajouté par erreur, seule une correction d'identité est possible sur demande écrite d'un membre de la famille.",
  },
  {
    num: 8,
    titre: 'Numéro de Sang familial — Code F[x]S[y]',
    texte: "Lorsqu'un arbre généalogique atteint 10 membres, il reçoit automatiquement un Numéro de Sang unique et permanent au format F[x]S[y]. Le chiffre F identifie le rang de la lignée familiale parmi toutes les familles de la plateforme. Le chiffre S est un numéro global attribué dans l'ordre d'obtention du seuil. Exemple : F2S1 signifie 2ème famille enregistrée, 1ère à avoir certifié son arbre. Ce code est définitif et inaltérable. Il reste gelé et invisible tant que l'arbre compte moins de 10 membres.",
  },
  {
    num: 9,
    titre: 'Accès à l\'arbre du conjoint',
    texte: "Lorsque deux membres forment un couple sur Moftal, chacun peut accéder à l'arbre familial de l'autre avec des droits progressifs. Durant la première année d'union sur la plateforme, l'accès est limité : le conjoint peut voir uniquement la liste des membres de la famille (prénom et nom), via le bouton 'Voir plus' disponible sur la carte du partenaire. Après 1 an de lien actif sur Moftal, l'accès devient complet : le conjoint peut voir l'arbre généalogique complet. Les autres membres de la famille du conjoint (beaux-frères, belles-sœurs, etc.) n'ont accès qu'à la liste des membres, sans jamais accéder aux détails complets. Cette règle est symétrique et s'applique dans les deux sens.",
  },
  {
    num: 10,
    titre: 'Vérité & Témoignage',
    texte: "Toute information publiée sur Moftal qui ne dispose pas d'au moins 4 témoins est affichée comme non vérifiée. La plateforme se réserve le droit de signaler ou de retirer tout contenu manifestement faux ou trompeur, sans préavis.",
  },
  {
    num: 11,
    titre: 'Droits d\'Auteur & Propriété intellectuelle',
    texte: "Tout contenu que vous publiez sur Moftal (textes, photos, vidéos, informations généalogiques) vous appartient. Vous accordez à Moftal une licence limitée pour afficher ce contenu aux membres autorisés. Aucun contenu de la plateforme ne peut être copié, extrait ou diffusé en dehors sans autorisation écrite. Tout contrevenant s'expose à des poursuites.",
  },
  {
    num: 12,
    titre: 'Moftal Pay — Système de paiement interne Moftal',
    texte: "Moftal Pay est le système de paiement interne exclusif de Moftal. Il permet aux familles de collecter, gérer et utiliser de l'argent à l'intérieur de la plateforme sans frais de transaction. Les fonds déposés dans un Wallal familial sont répartis automatiquement selon les règles définies par la famille (réserve, santé, nourriture, urgence, projet collectif). Toutes les transactions entre membres Moftal — famille vers clinique, famille vers fournisseur, famille vers tout service enregistré — sont gratuites et instantanées. Seuls les dépôts depuis l'extérieur et les retraits vers des comptes externes (Orange Money, banque) sont soumis aux frais du prestataire de paiement (FedaPay). Les retraits vers l'extérieur sont réservés exclusivement aux comptes professionnels enregistrés sur Moftal. Les fonds familiaux ne peuvent pas être retirés en dehors de la plateforme.",
  },
  {
    num: 13,
    titre: 'Sécurité des données',
    texte: "Moftal met en œuvre des mesures techniques de sécurité (chiffrement, authentification sécurisée, protection des serveurs) pour protéger vos données. En cas de violation de données susceptible de vous affecter, vous serez notifié dans les 72 heures. Moftal ne peut être tenu responsable de violations résultant de la divulgation de votre mot de passe ou de l'accès non autorisé à votre appareil.",
  },
  {
    num: 14,
    titre: 'Droit applicable & Juridiction',
    texte: "Les présentes conditions sont régies par le droit de la République de Guinée, notamment la Loi L/2016/037/AN relative à la cybersécurité et à la protection des données à caractère personnel, et le Code Civil guinéen. Tout litige sera soumis à la compétence exclusive des tribunaux de Conakry, République de Guinée.",
  },
  {
    num: 15,
    titre: 'Modification des conditions',
    texte: "Moftal se réserve le droit de modifier ces conditions à tout moment. Vous serez informé par notification lors de votre prochaine connexion. Si vous continuez à utiliser la plateforme après modification, vous acceptez les nouvelles conditions. En cas de désaccord, vous pouvez supprimer votre compte sans frais.",
  },
];

interface TermsModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function TermsModal({ onAccept, onDecline }: TermsModalProps) {
  const [checked, setChecked] = useState(false);
  const [canAccept, setCanAccept] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Si tout le contenu est visible sans scroll, on autorise directement
    if (el.scrollHeight <= el.clientHeight + 5) {
      setCanAccept(true);
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 30) {
      setCanAccept(true);
    }
  };

  const handleAccept = () => {
    if (!checked) return;
    localStorage.setItem(TERMS_KEY, 'true');
    onAccept();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="relative flex flex-col rounded-2xl overflow-hidden w-full"
        style={{ maxWidth: 520, maxHeight: '88vh', background: '#fff', boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
          <span style={{ fontSize: 24 }}>⚖️</span>
          <div>
            <h2 className="text-white font-bold text-base leading-tight">Conditions d'Utilisation</h2>
            <p className="text-blue-200 text-xs">Moftal — À lire attentivement avant de continuer</p>
          </div>
        </div>

        {/* Corps scrollable */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
          onScroll={handleScroll} style={{ minHeight: 0 }}>
          {CONDITIONS.map(p => (
            <div key={p.num} className="flex gap-3">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
                {p.num}
              </span>
              <div>
                <p className="font-bold text-gray-900 text-sm">{p.titre}</p>
                <p className="text-gray-600 text-sm leading-relaxed">{p.texte}</p>
              </div>
            </div>
          ))}
          <div className="text-center text-xs text-gray-400 pt-2 pb-1 border-t">
            En acceptant, vous confirmez avoir lu et compris ces conditions.
          </div>
        </div>

        {/* Pied */}
        <div className="px-5 py-4 border-t flex-shrink-0 bg-gray-50 space-y-3">
          {!canAccept && (
            <p className="text-xs text-amber-600 text-center">⬇️ Faites défiler pour activer l'acceptation</p>
          )}
          <label className={`flex items-center gap-3 cursor-pointer select-none ${!canAccept ? 'opacity-40 pointer-events-none' : ''}`}>
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              className="w-5 h-5 accent-blue-700 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700">
              J'ai lu et j'accepte les <strong>Conditions d'Utilisation</strong> de la plateforme.
            </span>
          </label>
          <div className="flex gap-3">
            <button onClick={onDecline}
              className="flex-1 py-2.5 rounded-xl border-2 font-semibold text-sm text-gray-500 border-gray-200 hover:bg-gray-100 transition-all">
              Refuser
            </button>
            <button onClick={handleAccept}
              disabled={!checked || !canAccept}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
              Accepter ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
