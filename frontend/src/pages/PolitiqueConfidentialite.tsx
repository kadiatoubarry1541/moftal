import { useNavigate } from 'react-router-dom';

export default function PolitiqueConfidentialite() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: '#f8f9ff' }}>

      {/* Header */}
      <div className="w-full py-10 px-4 text-center" style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)' }}>
        <div className="text-4xl mb-3">🔒</div>
        <h1 className="text-white font-black text-2xl sm:text-3xl">Politique de Confidentialité</h1>
        <p className="text-blue-200 text-sm mt-1">Moftal — Les Enfants d'Adam · Mai 2026</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Intro */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <p className="text-gray-700 text-sm leading-relaxed">
            La plateforme <strong>Les Enfants d'Adam (Moftal)</strong> respecte votre vie privée.
            Ce document explique quelles données nous collectons, pourquoi, et comment nous les protégeons.
            En vous inscrivant, vous acceptez librement cette politique.
          </p>
        </div>

        {/* Section 1 */}
        <Section titre="1. Qui sommes-nous ?">
          <p>
            Les Enfants d'Adam est une plateforme numérique guinéenne proposant des services
            de généalogie familiale, santé, éducation, solidarité et échanges.
            Elle est hébergée sur des serveurs internationaux sécurisés (Cloudflare, Render).
          </p>
          <p className="mt-2">
            Contact : <strong>alphadjomodiza@gmail.com</strong>
          </p>
        </Section>

        {/* Section 2 */}
        <Section titre="2. Données collectées">
          <ul className="space-y-2 text-sm text-gray-700 list-none">
            <Ligne icon="👤" text="Identité : prénom, nom de famille, date de naissance" />
            <Ligne icon="📧" text="Contact : adresse email (pour la connexion et les notifications)" />
            <Ligne icon="🔐" text="Sécurité : mot de passe chiffré (jamais lisible, même par nous)" />
            <Ligne icon="👨‍👩‍👧" text="Famille : liens de parenté que vous ajoutez volontairement" />
            <Ligne icon="📍" text="Localisation : ville/pays (optionnel, pour les services locaux)" />
            <Ligne icon="🕌" text="Religion : uniquement si vous l'indiquez (pour la Zakat)" />
            <Ligne icon="🩺" text="Santé : rendez-vous médicaux que vous prenez volontairement" />
            <Ligne icon="🖼️" text="Photos/vidéos : uniquement celles que vous publiez vous-même" />
          </ul>
          <p className="mt-3 text-sm text-gray-500 italic">
            Nous ne collectons aucune donnée sans votre action explicite.
          </p>
        </Section>

        {/* Section 3 */}
        <Section titre="3. Pourquoi nous collectons ces données">
          <ul className="space-y-1 text-sm text-gray-700 list-disc list-inside">
            <li>Créer et gérer votre compte personnel</li>
            <li>Afficher votre arbre généalogique familial</li>
            <li>Faciliter les rendez-vous avec des professionnels de santé</li>
            <li>Vous permettre d'accéder aux services éducatifs et solidaires</li>
            <li>Vous envoyer des notifications importantes (confirmations, alertes)</li>
          </ul>
          <p className="mt-2 text-sm font-semibold text-red-600">
            Nous ne vendons jamais vos données à des tiers.
          </p>
        </Section>

        {/* Section 4 */}
        <Section titre="4. Comment nous protégeons vos données">
          <ul className="space-y-2 text-sm text-gray-700">
            <Ligne icon="🔒" text="Connexion HTTPS chiffrée sur toutes les pages (Cloudflare SSL)" />
            <Ligne icon="🔑" text="Mots de passe hachés avec bcrypt — impossible à lire même pour nous" />
            <Ligne icon="🎫" text="Authentification par tokens JWT sécurisés" />
            <Ligne icon="🌍" text="Serveurs hébergés hors de Guinée (protection internationale)" />
            <Ligne icon="🚫" text="Aucun accès tiers sans votre consentement explicite" />
            <Ligne icon="👮" text="Accès admin restreint et journalisé" />
          </ul>
        </Section>

        {/* Section 5 */}
        <Section titre="5. Vos droits">
          <ul className="space-y-1 text-sm text-gray-700 list-disc list-inside">
            <li><strong>Droit d'accès</strong> : vous pouvez voir toutes vos données depuis votre profil</li>
            <li><strong>Droit de modification</strong> : vous pouvez modifier vos informations à tout moment</li>
            <li><strong>Droit de suppression</strong> : vous pouvez supprimer votre compte et toutes vos données</li>
            <li><strong>Droit de retrait</strong> : vous pouvez retirer votre consentement à tout moment</li>
          </ul>
          <p className="mt-2 text-sm text-gray-600">
            Pour exercer ces droits, contactez-nous à <strong>alphadjomodiza@gmail.com</strong>
          </p>
        </Section>

        {/* Section 6 */}
        <Section titre="6. Données des mineurs">
          <p className="text-sm text-gray-700">
            Les enfants apparaissant dans les arbres généalogiques sont ajoutés par leurs
            parents ou tuteurs légaux. En ajoutant un enfant, le parent confirme qu'il en
            a l'autorité parentale. Nous ne collectons pas directement de données auprès
            des enfants de moins de 13 ans.
          </p>
        </Section>

        {/* Section 7 */}
        <Section titre="7. Données de santé">
          <p className="text-sm text-gray-700">
            Les rendez-vous médicaux sont strictement confidentiels. Seuls vous et le
            professionnel concerné y avez accès. Aucun tiers, aucun employeur, aucune
            autorité n'y a accès sans décision judiciaire.
          </p>
        </Section>

        {/* Section 8 */}
        <Section titre="8. Cookies et données de navigation">
          <p className="text-sm text-gray-700">
            Nous utilisons uniquement des cookies techniques nécessaires au fonctionnement
            (session de connexion). Nous n'utilisons pas de cookies publicitaires ni de
            traceurs tiers.
          </p>
        </Section>

        {/* Section 9 */}
        <Section titre="9. Modifications de cette politique">
          <p className="text-sm text-gray-700">
            En cas de modification importante, vous serez notifié par email et/ou
            notification dans l'application. La date de dernière mise à jour est indiquée
            en haut de ce document.
          </p>
        </Section>

        {/* Section 10 */}
        <Section titre="10. Conformité légale">
          <p className="text-sm text-gray-700">
            Cette politique est conforme aux principes de protection des données personnelles
            reconnus internationalement. La plateforme est un service volontaire — aucun
            utilisateur n'est obligé de s'inscrire. Toute collecte de données repose sur
            le consentement libre et éclairé de l'utilisateur.
          </p>
        </Section>

        {/* Contact */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
          <div className="text-2xl mb-2">✉️</div>
          <p className="text-sm text-gray-700">
            Pour toute question sur vos données personnelles :
          </p>
          <p className="font-bold text-green-700 mt-1">alphadjomodiza@gmail.com</p>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
        >
          ← Retour
        </button>

      </div>
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <h2 className="font-bold text-gray-800 text-base mb-3">{titre}</h2>
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
    </div>
  );
}

function Ligne({ icon, text }: { icon: string; text: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="flex-shrink-0">{icon}</span>
      <span>{text}</span>
    </li>
  );
}
