// Génère moftal-spiral.svg et moftal-spiral.pptx à la racine du projet
const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

// ── Paramètres spirale ────────────────────────────────────────────────────────
const W = 420, H = 420;
const cx = W / 2, cy = H / 2;
const rMin = 28;
const rMax = 196;
const turns = 5.5;
const numPts = 1500;

// θ=0 → droite, rotation anti-horaire, rayon décroissant vers le centre
const thetaMax = turns * 2 * Math.PI;
const pts = [];
for (let i = 0; i <= numPts; i++) {
  const t = i / numPts;
  const theta = t * thetaMax;
  const r = rMax - (rMax - rMin) * t;
  pts.push({
    x: cx + r * Math.cos(theta),
    y: cy - r * Math.sin(theta), // CCW visuel (y inversé SVG)
  });
}

// ── Chemin SVG ────────────────────────────────────────────────────────────────
let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
for (let i = 1; i < pts.length; i++) {
  d += ` L ${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`;
}

// ── Flèche à l'extrémité intérieure ──────────────────────────────────────────
const tip = pts[numPts];
const base = pts[numPts - 25];
const dx = tip.x - base.x, dy = tip.y - base.y;
const len = Math.sqrt(dx * dx + dy * dy);
const ux = dx / len, uy = dy / len;
const perp = { x: -uy, y: ux };
const as = 10;
const arrowPts = [
  `${tip.x.toFixed(1)},${tip.y.toFixed(1)}`,
  `${(tip.x - as * ux + as * 0.45 * perp.x).toFixed(1)},${(tip.y - as * uy + as * 0.45 * perp.y).toFixed(1)}`,
  `${(tip.x - as * ux - as * 0.45 * perp.x).toFixed(1)},${(tip.y - as * uy - as * 0.45 * perp.y).toFixed(1)}`,
].join(' ');

// ── SVG ───────────────────────────────────────────────────────────────────────
const dot = pts[0]; // point noir côté droit (début extérieur)

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 ${W} ${H}"
     width="${W}" height="${H}">

  <!-- FOND — changer fill pour la couleur de fond -->
  <rect id="fond" x="0" y="0" width="${W}" height="${H}" fill="white"/>

  <!-- SPIRALE — changer stroke pour la couleur, stroke-width pour l'épaisseur -->
  <path id="spirale"
        d="${d}"
        fill="none"
        stroke="black"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"/>

  <!-- POINT DE DEPART (extrémité extérieure droite) -->
  <circle id="point-depart"
          cx="${dot.x.toFixed(1)}"
          cy="${dot.y.toFixed(1)}"
          r="5.5"
          fill="black"/>

  <!-- FLECHE DIRECTION (extrémité intérieure) -->
  <polygon id="fleche"
           points="${arrowPts}"
           fill="black"/>

  <!-- TEXTE MOFTAL — changer fill, font-size, font-family librement -->
  <text id="texte-moftal"
        x="${cx}"
        y="${cy}"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="30"
        font-weight="bold"
        fill="#16a34a">Moftal</text>

</svg>`;

// ── Sauvegarde SVG ────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, '..');
const svgFile = path.join(outDir, 'moftal-spiral.svg');
fs.writeFileSync(svgFile, svg, 'utf8');
console.log('✅ SVG enregistré :', svgFile);

// ── Création PPTX ─────────────────────────────────────────────────────────────
const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE'; // 13.33" x 7.5"

const slide = pptx.addSlide();
slide.background = { color: 'FFFFFF' };

const svgB64 = Buffer.from(svg, 'utf8').toString('base64');

slide.addImage({
  data: `data:image/svg+xml;base64,${svgB64}`,
  x: 2.17,
  y: 0.1,
  w: 9,
  h: 7.3,
});

slide.addText('Moftal — Spirale', {
  x: 0, y: 0, w: '100%', h: 0.4,
  align: 'center',
  fontSize: 16,
  color: '16a34a',
  bold: true,
  fontFace: 'Arial',
});

slide.addText(
  'Astuce PowerPoint : Clic droit sur l\'image → "Convertir en forme" pour éditer chaque élément séparément',
  {
    x: 0.3, y: 7.15, w: 12.73, h: 0.3,
    align: 'center',
    fontSize: 9,
    color: '888888',
    italic: true,
    fontFace: 'Arial',
  }
);

const pptxFile = path.join(outDir, 'moftal-spiral.pptx');
pptx.writeFile({ fileName: pptxFile })
  .then(() => {
    console.log('✅ PPTX enregistré :', pptxFile);
    console.log('\n🎉 Fichiers disponibles dans :', outDir);
    console.log('   📄 moftal-spiral.svg  → Inkscape / navigateur / Word (Insertion > Image)');
    console.log('   📊 moftal-spiral.pptx → PowerPoint / LibreOffice Impress');
    console.log('\n📝 Pour modifier dans PowerPoint :');
    console.log('   1. Ouvrez moftal-spiral.pptx');
    console.log('   2. Clic droit sur la spirale → "Convertir en forme"');
    console.log('   3. Éditez chaque élément librement (couleur, épaisseur, texte...)');
    console.log('\n📝 Pour modifier dans Word :');
    console.log('   1. Insertion > Images > moftal-spiral.svg');
    console.log('   2. Clic droit → "Convertir en formes dessinées"');
  })
  .catch(err => console.error('❌ Erreur PPTX :', err));
