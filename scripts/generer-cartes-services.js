// Génère les 5 cartes « services Moftal » (frontend/public/banners/*.jpg).
// Usage : node scripts/generer-cartes-services.js (Playwright requis), puis
// conversion PNG -> JPG et incrément de BANNER_VERSION dans backend/src/routes/publicites.js.
const { chromium } = require('playwright');
const P = '/home/user/moftal/frontend/public';
const cards = [
  { slug:'info-moftal', logo:'icon-info-moftal.svg', name:'Moftal Info',
    bg:'linear-gradient(120deg,#0b2a7a 0%,#1d4ed8 45%,#0ea5e9 100%)', glow:'#38bdf8', accent:'#1d4ed8',
    emoji:'📢', side:['🎉','👶','💍'],
    title:'Annoncez à toute la communauté', sub:'Naissances, mariages, événements, avis : une annonce claire en un instant.', cta:'Publier une info' },
  { slug:'professeur-ia', logo:'icon-ia-education-moftal.svg', name:'Moftal IA Éducation',
    bg:'linear-gradient(120deg,#064e3b 0%,#047857 45%,#10b981 100%)', glow:'#6ee7b7', accent:'#047857',
    emoji:'🎓', side:['📐','📖','✏️'],
    title:'Un professeur particulier dans ta poche', sub:'Français et Mathématiques, du CP à la Terminale, expliqués pas à pas.', cta:'Poser une question' },
  { slug:'paiement-famille', logo:'logo-moftal-pay.svg', name:'Moftal Pay',
    bg:'linear-gradient(120deg,#060f24 0%,#0d2040 45%,#1e3a8a 100%)', glow:'#C9A227', accent:'#0d2040', gold:true,
    emoji:'💳', side:['💰','🔒','👨‍👩‍👧'],
    title:"Gérez l'argent de votre famille", sub:'Envoyez, recevez et épargnez ensemble, en toute sécurité.', cta:'Ouvrir mon compte' },
  { slug:'visibilite-gestion', logo:'logo-gestion-interne.svg', name:'Moftal Pro',
    bg:'linear-gradient(120deg,#1e0533 0%,#3b0764 45%,#7e22ce 100%)', glow:'#22d3ee', accent:'#3b0764',
    emoji:'💼', side:['⏰','📊','⭐'],
    title:'Faites connaître votre activité', sub:'Page publique, rendez-vous en ligne et gestion de votre établissement.', cta:'Créer mon espace pro' },
  { slug:'echange', logo:'logo-moftal.svg', name:'Moftal Échange',
    bg:'linear-gradient(120deg,#7c2d12 0%,#ea580c 50%,#f59e0b 100%)', glow:'#fde68a', accent:'#c2410c',
    emoji:'🛍️', side:['🏷️','🚚','🤝'],
    title:'Achetez, vendez, échangez', sub:'Le marché de votre communauté : produits, commandes et livraison.', cta:'Voir les annonces' },
];
const html = c => `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
body{width:1200px;height:300px;overflow:hidden;font-family:Inter,sans-serif}
.card{position:relative;width:1200px;height:300px;background:${c.bg};overflow:hidden}
.dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.10) 1.4px,transparent 1.6px);background-size:22px 22px;mask-image:linear-gradient(90deg,transparent 0%,#000 55%,#000 100%)}
.b1{position:absolute;width:520px;height:520px;border-radius:50%;right:-110px;top:-110px;background:radial-gradient(circle,${c.glow}55 0%,transparent 65%)}
.b2{position:absolute;width:420px;height:420px;border-radius:50%;left:-160px;bottom:-230px;background:radial-gradient(circle,rgba(255,255,255,.16) 0%,transparent 65%)}
.ring{position:absolute;border-radius:50%;border:2px solid rgba(255,255,255,.14)}
.text{position:absolute;left:70px;width:800px;top:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;color:#fff}
.badge{display:inline-flex;align-items:center;gap:10px;background:rgba(255,255,255,.96);padding:5px 18px 5px 5px;border-radius:999px;box-shadow:0 6px 18px rgba(0,0,0,.25)}
.badge img{width:38px;height:38px;border-radius:50%;background:#fff;object-fit:contain}
.badge span{font-weight:800;font-size:19px;letter-spacing:.3px;color:${c.accent};text-transform:uppercase}
h1{font-weight:900;font-size:50px;line-height:1.04;letter-spacing:-1px;text-shadow:0 3px 14px rgba(0,0,0,.30);white-space:nowrap}
p{font-weight:500;font-size:23px;line-height:1.2;color:rgba(255,255,255,.92);white-space:nowrap}
.cta{margin-top:4px;display:inline-flex;align-items:center;gap:10px;background:${c.gold?'linear-gradient(135deg,#f5d77a,#C9A227)':'#fff'};color:${c.gold?'#0d2040':c.accent};font-weight:800;font-size:23px;padding:11px 28px;border-radius:999px;box-shadow:0 8px 22px rgba(0,0,0,.28)}
.icon{position:absolute;left:885px;top:30px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.35),rgba(255,255,255,.08) 60%);border:2px solid rgba(255,255,255,.35);box-shadow:0 20px 50px rgba(0,0,0,.30),inset 0 0 30px rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center}
.icon .e{font-family:'Noto Color Emoji';font-size:132px;line-height:1;filter:drop-shadow(0 12px 16px rgba(0,0,0,.35))}
.s{position:absolute;font-family:'Noto Color Emoji';width:66px;height:66px;border-radius:20px;background:rgba(255,255,255,.95);display:flex;align-items:center;justify-content:center;font-size:38px;box-shadow:0 10px 24px rgba(0,0,0,.28)}
</style></head><body><div class="card">
<div class="dots"></div><div class="b1"></div><div class="b2"></div>
<div class="ring" style="width:330px;height:330px;left:840px;top:-15px"></div>
<div class="ring" style="width:420px;height:420px;left:795px;top:-60px;border-color:rgba(255,255,255,.07)"></div>
<div class="icon"><span class="e">${c.emoji}</span></div>
<div class="s" style="left:860px;top:22px;transform:rotate(-10deg)">${c.side[0]}</div>
<div class="s" style="left:1090px;top:40px;transform:rotate(8deg)">${c.side[1]}</div>
<div class="s" style="left:1075px;top:206px;transform:rotate(-6deg)">${c.side[2]}</div>
<div class="text">
 <div class="badge"><img src="file://${P}/${c.logo}"><span>${c.name}</span></div>
 <h1>${c.title}</h1><p>${c.sub}</p>
 <div class="cta">${c.cta} <span>→</span></div>
</div></div>
<script>
for (const sel of ['h1','p']) { const el=document.querySelector(sel); let fs=parseFloat(getComputedStyle(el).fontSize); while(el.scrollWidth>790 && fs>12){fs-=1;el.style.fontSize=fs+'px'} }
</script></body></html>`;
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport:{width:1200,height:300}, deviceScaleFactor:2 });
  const fs = require('fs');
  for (const c of cards) {
    fs.writeFileSync(c.slug+'.html', html(c));
    await page.goto('file://'+process.cwd()+'/'+c.slug+'.html');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'out/'+c.slug+'.png' });
  }
  await b.close();
})();
