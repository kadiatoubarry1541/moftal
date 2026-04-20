/**
 * Script pour générer la présentation PowerPoint du projet "1"
 * Installation: npm install pptxgenjs
 * Exécution: node generer_presentation.js
 */

const PptxGenJS = require('pptxgenjs');

// Créer une nouvelle présentation
const pptx = new PptxGenJS();

// Définir les propriétés de la présentation
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Projet 1';
pptx.company = 'Plateforme Communautaire Guinéenne';
pptx.title = 'Présentation Projet 1';

// Fonction pour créer un slide avec titre et contenu
function addSlide(title, content, options = {}) {
  const slide = pptx.addSlide();
  
  // Titre
  slide.addText(title, {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.8,
    fontSize: 36,
    bold: true,
    align: 'center',
    color: '363636'
  });
  
  // Contenu
  if (Array.isArray(content)) {
    content.forEach((item, index) => {
      slide.addText(item, {
        x: 0.8,
        y: 1.5 + (index * 0.6),
        w: 8.5,
        h: 0.5,
        fontSize: options.fontSize || 18,
        bullet: options.bullet !== false,
        color: '000000'
      });
    });
  } else {
    slide.addText(content, {
      x: 0.8,
      y: 1.5,
      w: 8.5,
      h: 5,
      fontSize: options.fontSize || 18,
      color: '000000'
    });
  }
  
  return slide;
}

// SLIDE 1 : PAGE DE COUVERTURE
const slide1 = pptx.addSlide();
slide1.background = { color: 'FFFFFF' };

// Ajouter l'image du logo au lieu du texte "1"
try {
  const fs = require('fs');
  const path = require('path');
  const logoPath = path.join(__dirname, '1.png');
  
  if (fs.existsSync(logoPath)) {
    slide1.addImage({
      path: logoPath,
      x: 3.5,
      y: 1.5,
      w: 3,
      h: 3
    });
  } else {
    // Fallback si l'image n'existe pas
    slide1.addText('1', {
      x: 1,
      y: 2,
      w: 8,
      h: 1.5,
      fontSize: 72,
      bold: true,
      align: 'center',
      color: '1E88E5'
    });
  }
} catch (error) {
  // Fallback en cas d'erreur
  slide1.addText('1', {
    x: 1,
    y: 2,
    w: 8,
    h: 1.5,
    fontSize: 72,
    bold: true,
    align: 'center',
    color: '1E88E5'
  });
}

slide1.addText('Plateforme Communautaire Guinéenne', {
  x: 1,
  y: 4.8,
  w: 8,
  h: 0.8,
  fontSize: 28,
  align: 'center',
  color: '666666'
});
slide1.addText('Hackathon Féminin', {
  x: 1,
  y: 5.8,
  w: 8,
  h: 0.6,
  fontSize: 20,
  align: 'center',
  color: '999999',
  italic: true
});

// SLIDE 2 : PROBLÉMATIQUE
addSlide('Le Problème', [
  '• Les Guinéens de la diaspora sont dispersés',
  '• Difficile de maintenir les liens familiaux et communautaires',
  '• Manque de plateforme centralisée pour les services communautaires',
  '• Perte de l\'histoire et de la généalogie familiale',
  '• Accès limité aux services de l\'État et aux échanges locaux'
]);

// SLIDE 3 : SOLUTION
addSlide('Notre Solution', [
  '🔗 Connecte les familles et préserve la généalogie',
  '🏘️ Organise la communauté par résidence et région',
  '🎯 Facilite les activités sociales (sport, art, entreprise)',
  '🏥 Gère la santé communautaire',
  '📋 Simplifie les services de l\'État (rendez-vous, documents)',
  '💼 Facilite les échanges commerciaux',
  '🎓 Offre l\'éducation et les formations',
  '🕌 Gère la foi et les dons (zakat)'
]);

// SLIDE 4 : FONCTIONNALITÉS
addSlide('Fonctionnalités Clés', [
  '1. Gestion Familiale',
  '   • Arbre généalogique visuel',
  '   • Gestion des membres vivants et défunts',
  '',
  '2. Communauté',
  '   • Groupes par résidence, région, organisation',
  '   • Activités sociales et événements',
  '',
  '3. Services de l\'État',
  '   • Prise de rendez-vous en ligne',
  '   • Demandes de documents',
  '   • Paiement marchand intégré'
]);

// SLIDE 5 : TECHNOLOGIES
addSlide('Technologies Utilisées', [
  'Frontend:',
  '  • React 18 + TypeScript',
  '  • Vite + Tailwind CSS',
  '  • 5 langues (fr, en, ar, man, pul)',
  '',
  'Backend:',
  '  • Node.js + Express',
  '  • PostgreSQL',
  '  • JWT Authentication',
  '',
  'Fonctionnalités:',
  '  • Upload de médias',
  '  • Paiement mobile (MTN)',
  '  • Système de badges et logos'
]);

// SLIDE 6 : INNOVATION
addSlide('Ce qui nous rend unique', [
  '✅ Système NumeroH unique : Identification automatique',
  '✅ Interface multilingue : 5 langues pour la diaspora',
  '✅ Plateforme tout-en-un : Tous les services en un seul endroit',
  '✅ Généalogie complète : Arbre familial visuel',
  '✅ Paiement intégré : Numéro marchand pour transactions faciles',
  '✅ Sécurisé : Authentification JWT, gestion des rôles'
]);

// SLIDE 7 : IMPACT
addSlide('Impact sur la Communauté', [
  '🌍 Rapprochement de la diaspora guinéenne',
  '👨‍👩‍👧‍👦 Préservation de l\'histoire et de la généalogie',
  '💼 Facilitation des échanges commerciaux locaux',
  '🏛️ Simplification des démarches administratives',
  '🎓 Accès facilité aux formations',
  '🏥 Meilleure gestion de la santé communautaire',
  '🤝 Gestion transparente des dons et zakat'
]);

// SLIDE 8 : MODÈLE ÉCONOMIQUE
addSlide('Modèle Économique', [
  'Financement:',
  '  💵 Dons et contributions volontaires',
  '  🕌 Zakat et dons religieux',
  '  🤝 Partenariats avec organisations',
  '  🏛️ Subventions (si applicable)',
  '',
  'Partenaires:',
  '  • Opérateurs mobiles (MTN)',
  '  • Organisations guinéennes',
  '  • Institutions religieuses et éducatives'
]);

// SLIDE 9 : DÉMO
const slide9 = pptx.addSlide();
slide9.addText('Aperçu de la Plateforme', {
  x: 0.5,
  y: 0.5,
  w: 9,
  h: 0.8,
  fontSize: 36,
  bold: true,
  align: 'center',
  color: '363636'
});
slide9.addText('Insérer captures d\'écran:', {
  x: 0.8,
  y: 1.5,
  w: 8.5,
  h: 0.5,
  fontSize: 18,
  bold: true,
  color: '000000'
});
slide9.addText('1. Page d\'accueil avec logo "1"', {
  x: 0.8,
  y: 2.2,
  w: 8.5,
  h: 0.5,
  fontSize: 18,
  bullet: true,
  color: '000000'
});
slide9.addText('2. Arbre généalogique', {
  x: 0.8,
  y: 2.8,
  w: 8.5,
  h: 0.5,
  fontSize: 18,
  bullet: true,
  color: '000000'
});
slide9.addText('3. Services de l\'État (Rendez-vous)', {
  x: 0.8,
  y: 3.4,
  w: 8.5,
  h: 0.5,
  fontSize: 18,
  bullet: true,
  color: '000000'
});
slide9.addText('4. Page des échanges', {
  x: 0.8,
  y: 4.0,
  w: 8.5,
  h: 0.5,
  fontSize: 18,
  bullet: true,
  color: '000000'
});

// SLIDE 10 : ROADMAP
addSlide('Prochaines Étapes', [
  'Court terme:',
  '  ✅ Développement des fonctionnalités de base (TERMINÉ)',
  '  🔄 Tests utilisateurs',
  '  📢 Lancement beta',
  '',
  'Moyen terme:',
  '  🤝 Partenariats avec organisations guinéennes',
  '  📈 Amélioration de l\'expérience utilisateur',
  '',
  'Long terme:',
  '  📱 Application mobile',
  '  🌍 Expansion à d\'autres pays africains'
]);

// SLIDE 11 : ÉQUIPE
addSlide('Notre Équipe', [
  '[Votre nom] - Fondateur & Développeur',
  '',
  'Vision:',
  'Créer une plateforme qui unit et sert',
  'la communauté guinéenne'
]);

// SLIDE 12 : MERCI
const slide12 = pptx.addSlide();
slide12.background = { color: 'F5F5F5' };
slide12.addText('Merci pour votre attention !', {
  x: 1,
  y: 2.5,
  w: 8,
  h: 1,
  fontSize: 48,
  bold: true,
  align: 'center',
  color: '1E88E5'
});
slide12.addText('Questions ?', {
  x: 1,
  y: 4,
  w: 8,
  h: 0.8,
  fontSize: 32,
  align: 'center',
  color: '666666'
});
slide12.addText('1 - Plateforme Communautaire Guinéenne', {
  x: 1,
  y: 5.5,
  w: 8,
  h: 0.6,
  fontSize: 20,
  align: 'center',
  color: '999999',
  italic: true
});

// Sauvegarder la présentation
const outputFile = 'Presentation_Projet_1.pptx';
pptx.writeFile({ fileName: outputFile })
  .then(() => {
    console.log(`✅ Présentation créée avec succès: ${outputFile}`);
    console.log(`📊 Nombre de slides: ${pptx.slides.length}`);
    console.log('\n💡 Vous pouvez maintenant ouvrir le fichier PowerPoint et:');
    console.log('   - Ajouter le logo "1.png" sur la première slide');
    console.log('   - Ajouter des captures d\'écran sur la slide 9');
    console.log('   - Personnaliser avec vos informations');
  })
  .catch((err) => {
    console.error('❌ Erreur lors de la création:', err);
    console.log('\n📦 Assurez-vous d\'avoir installé pptxgenjs:');
    console.log('   npm install pptxgenjs');
  });

