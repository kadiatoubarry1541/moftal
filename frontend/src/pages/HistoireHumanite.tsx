import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { hideIncrement } from '../utils/formatNumeroH';

// ── Calcul automatique des périodes (Adam = 4004 av. J.-C., 63 ans/génération)
const ADAM_YEAR = -4004;
const GEN_LENGTH = 63;
function getGenPeriod(gen: number): string {
  const start = ADAM_YEAR + (gen - 1) * GEN_LENGTH;
  const end = start + GEN_LENGTH - 1;
  const fmt = (y: number) => `${Math.abs(y)} ${y < 0 ? 'av. J.-C.' : 'ap. J.-C.'}`;
  return `${fmt(start)} — ${fmt(end)}`;
}

interface HistoricalEntry {
  generation: number;
  title: string;
  era: string;
  icon: string;
  content: string;
  keyEvents: string[];
  figures: string[];
}

interface WitnessProfile { numeroH: string; name: string; age: number | null; testimoniedAt: string; }
interface PublishedStory {
  id: number; numeroH: string; authorName: string; authorPhoto?: string | null; sectionId: string; sectionTitle: string;
  content: string; photos: string[]; videos: string[]; generation: string | null;
  region: string | null; country: string | null; publishedAt: string;
  likes: number; witnesses: WitnessProfile[];
}

const HISTORICAL_DATA: HistoricalEntry[] = [
  { generation: 1, title: "Adam — Le Premier Homme", era: "Origines", icon: "🌿",
    content: "Adam fut le premier être humain créé par Dieu, façonné de terre et insufflé de l'esprit divin. Placé dans le Jardin d'Éden, il reçut la connaissance des noms de toutes choses. Son histoire marque le début du voyage de l'humanité sur terre, portant en lui la dignité et la responsabilité d'être le vicaire de Dieu.",
    keyEvents: ["Création d'Adam et Ève par Dieu", "Naissance de Caïn, Abel et Seth"],
    figures: ["Adam (Prophète, père de toute l'humanité)", "Hawa/Ève (mère de toute l'humanité)", "Caïn/Qayn (premier fils né sur Terre, fondateur de la première cité — tradition abrahamique)"] },

  { generation: 2, title: "Hawa et les Premiers Enfants", era: "Origines", icon: "🌸",
    content: "Hawa fut créée comme compagne d'Adam. Ensemble, ils eurent les premiers enfants de l'humanité : Qabil (Caïn), Habil (Abel) et Shayth (Seth). Le premier conflit humain eut lieu entre Qabil et Habil. Shayth devint le continuateur de la lignée prophétique.",
    keyEvents: ["Énosch/Enos invoque le nom de Dieu", "Premières communautés humaines fondées"],
    figures: ["Seth/Shayth (continuateur de la lignée prophétique)", "Énosch/Enos (petit-fils d'Adam, premier à invoquer Dieu)", "Tubal-Caïn (premier forgeron, maître des métaux et des outils — antédiluvien)"] },

  { generation: 3, title: "Shayth et les Patriarches Premiers", era: "Patriarches Anciens", icon: "📿",
    content: "Shayth reçut des révélations divines et transmit l'enseignement à ses descendants. Il fut le premier à établir des rites d'adoration organisés. Ses descendants construisirent les premières communautés humaines stables, développant l'agriculture, l'élevage et les premières formes de langage écrit.",
    keyEvents: ["Kenan et Méhaléel perpétuent la foi d'Adam", "Premières formes de calendrier lunaire"],
    figures: ["Méhaléel (patriarche, sage transmetteur)", "Jéred/Jared (patriarche, père du Prophète Idris)", "Lamech père de Noé (patriarche, annonciateur de Noé le Sauveur — temps antédiluviens)"] },

  { generation: 4, title: "Idris — Le Sage Écrivain", era: "Patriarches Anciens", icon: "✍️",
    content: "Idris (Hénoch) fut le premier humain à utiliser la plume pour écrire. Prophète et sage, il reçut des révélations divines. Il enseigna l'astronomie, les mathématiques et la couture. Sa connaissance des étoiles permit aux voyageurs de se repérer dans l'obscurité. Le Coran le mentionne comme homme de vérité élevé à un rang suprême.",
    keyEvents: ["Hénoch/Idris (Prophète) élevé vivant vers le ciel", "Invention des premiers outils en métal"],
    figures: ["Idris/Hénoch (Prophète, premier écrivain de l'humanité)", "Mathusalem (le plus longévif — 969 ans selon la tradition)", "Naama (sœur de Tubal-Caïn, première tisserande et musicienne — tradition judaïque)"] },

  { generation: 5, title: "Mathusalem et la Longévité", era: "Patriarches Anciens", icon: "⏳",
    content: "Mathusalem vécut selon la tradition 969 ans — le plus long de tous les humains. Sa longévité symbolise une époque de vitalité extraordinaire. Il fut le gardien de la sagesse ancestrale. C'est pendant cette génération que Nuh (Noé) commença à recevoir sa mission prophétique.",
    keyEvents: ["Nuh commence à recevoir la révélation divine", "Tubal-Caïn invente la forge, Jubal la musique"],
    figures: ["Nuh/Noé (Prophète, bâtisseur de l'Arche)", "Lamech (père de Noé, sage patriarche)", "Japhet (fils de Noé, ancêtre des peuples indo-européens — Europe/Asie centrale)"] },

  { generation: 6, title: "Nuh — L'Arche et le Déluge", era: "Déluge", icon: "⛵",
    content: "Nuh passa 950 ans à appeler son peuple vers Dieu. Sur ordre divin, il construisit l'Arche. Il embarqua sa famille, les croyants, et une paire de chaque espèce animale. Le Grand Déluge effaça la civilisation corrompue. L'arc-en-ciel scella l'alliance entre Dieu et l'humanité survivante.",
    keyEvents: ["Construction de l'Arche sur ordre divin", "Le Grand Déluge — purification et recommencement"],
    figures: ["Nuh/Noé (Prophète, constructeur de l'Arche — Mésopotamie)", "Sem, Cham, Japhet (trois fils de Noé, ancêtres des nations)", "Cham/Ham (fils de Noé, père des peuples africains, égyptiens et cananéens — Afrique/Proche-Orient)"] },

  { generation: 7, title: "Après le Déluge — Les Nations se Forment", era: "Déluge", icon: "🌈",
    content: "Les fils de Noé — Sem, Cham et Japhet — se dispersèrent aux quatre coins du monde, donnant naissance aux différentes races et nations. Les descendants de Sem s'établirent au Moyen-Orient, ceux de Cham en Afrique et en Asie, ceux de Japhet en Europe et en Asie centrale.",
    keyEvents: ["Sem, Cham, Japhet repeuplent la Terre", "Fondation de l'Égypte (Misraïm) et de Babylone"],
    figures: ["Arpachschad (fils de Sem, ancêtre des Sémites — Moyen-Orient)", "Cush (fils de Cham, père des peuples d'Afrique et d'Arabie)", "Nimrod (premier roi et conquérant de l'humanité, bâtisseur de Babylone — Mésopotamie/Irak)"] },

  { generation: 8, title: "La Tour de Babel et les Premières Cités", era: "Premières Civilisations", icon: "🏛️",
    content: "Nimrod bâtit Babylone et Ninive, premières grandes cités. La Tour de Babel vit la diversification des langues humaines. L'écriture cunéiforme se développa en Mésopotamie. Ces premières cités-États posèrent les bases de l'organisation politique et sociale de l'humanité.",
    keyEvents: ["Nimrod fonde Babylone et Ninive", "Diversification des langues humaines à Babel"],
    figures: ["Nimrod (roi de Babylone — Mésopotamie/Irak actuel)", "Héber (ancêtre des Hébreux — Canaan/Proche-Orient)", "Terah/Tarakh (père d'Abraham, quitta Ur pour conduire sa famille vers Canaan — Mésopotamie)"] },

  { generation: 9, title: "Ibrahim — Le Chercheur de Vérité", era: "Prophètes Abrahamiques", icon: "⭐",
    content: "Ibrahim naquit à Ur de Chaldée. Dans une société idolâtre, son intelligence le poussa à chercher la vérité. Il observa les étoiles, la lune et le soleil, et conclut qu'il ne pouvait adorer que Dieu seul. Il brisa les idoles de son peuple, fut jeté dans un feu qui devint frais pour lui.",
    keyEvents: ["Abraham brise les idoles et migre vers Canaan", "Alliance d'Abraham avec Dieu"],
    figures: ["Abraham/Ibrahim (Prophète, père des nations — Ur de Chaldée/Irak actuel)", "Hagar/Hajar (mère d'Ismaël, courageuse — Égypte/Arabie)", "Sara/Sarah (épouse d'Ibrahim, mère d'Isaac, femme de foi inébranlable — Canaan/Palestine)"] },

  { generation: 10, title: "Ibrahim — La Kaaba et le Sacrifice", era: "Prophètes Abrahamiques", icon: "🕋",
    content: "Ibrahim et son fils Ismaël élevèrent ensemble les murs de la Kaaba à La Mecque. Dieu mit Ibrahim à l'épreuve suprême du sacrifice de son fils ; père et fils acceptèrent avec soumission. Un bélier fut substitué. Cette épreuve est commémorée chaque année par l'Aïd el-Adha.",
    keyEvents: ["Construction de la Kaaba par Ibrahim et Ismaël", "Sacrifice d'Ismaël, épreuve suprême de foi"],
    figures: ["Ibrahim/Abraham (Prophète — Arabie/Canaan)", "Ismaël/Ismail (Prophète, ancêtre des Arabes — La Mecque, Arabie Saoudite)", "Lot/Lut (Prophète, neveu d'Ibrahim, sauvé de Sodome — Canaan/Jordanie actuelle)"] },

  { generation: 11, title: "Ishaq, Yaqoub et les Douze Tribus", era: "Prophètes Abrahamiques", icon: "🌟",
    content: "Ishaq (Isaac) fils d'Ibrahim, puis son fils Yaqoub (Jacob) qui reçut le nom d'Israël après avoir lutté avec un ange. Père de douze fils, Yaqoub fut l'ancêtre des douze tribus d'Israël. Le Code de Hammurabi (~1792 av. J.-C.) posa les premières lois écrites de l'humanité.",
    keyEvents: ["Jacob reçoit le nom Israël", "Code de Hammurabi — première loi codifiée ~1792 av."],
    figures: ["Isaac/Ishaq (Prophète — Canaan/Israël)", "Jacob/Yaqub (Prophète, père des 12 tribus — Canaan)", "Hammurabi (roi législateur — Babylone/Irak actuel)"] },

  { generation: 12, title: "Youssouf — La Providence Divine", era: "Prophètes Abrahamiques", icon: "👑",
    content: "Youssouf (Joseph), jeté dans un puits par ses frères jaloux, fut vendu comme esclave en Égypte. Emprisonné injustement, il garda sa foi intacte. Grâce au don d'interprétation des songes, il devint ministre de l'Égypte. Il nourrit les peuples pendant la famine et pardonna à ses frères.",
    keyEvents: ["Joseph/Yusuf vizir d'Égypte, sauve les peuples de la famine", "Les Hébreux s'installent en Égypte"],
    figures: ["Joseph/Yusuf (Prophète, vizir — Égypte)", "Imhotep (médecin, architecte, savant — Égypte)", "Thoutmosis III (pharaon conquérant — Égypte)"] },

  { generation: 13, title: "Musa — L'Exode et les Commandements", era: "Moïse et l'Exode", icon: "🔥",
    content: "Musa (Moïse) naquit pendant la terreur du Pharaon. Il reçut la révélation au buisson ardent, affronta Pharaon avec les dix fléaux, mena l'Exode d'Égypte et reçut sur le mont Sinaï les Dix Commandements — premières grandes lois morales de l'humanité, fondement de la justice sociale.",
    keyEvents: ["L'Exode d'Égypte ~1446 av. J.-C.", "Les 10 Commandements au mont Sinaï"],
    figures: ["Moïse/Musa (Prophète, libérateur — Égypte/Sinaï)", "Aaron/Harun (Prophète, porte-parole — Égypte)", "Néfertiti (reine égyptienne, réformatrice — Égypte)"] },

  { generation: 14, title: "Josué et la Terre Promise", era: "Moïse et l'Exode", icon: "🏔️",
    content: "Josué, successeur de Musa, mena les Hébreux à la conquête de Canaan. L'alphabet phénicien (~1050 av. J.-C.) révolutionna l'écriture en la rendant accessible à tous. Déborah fut la première femme prophétesse et chef de guerre d'Israël, symbole de force et de justice.",
    keyEvents: ["Josué conduit Israël vers Canaan", "Alphabet phénicien ~1050 av. J.-C."],
    figures: ["Josué (successeur de Moïse — Canaan/Israël)", "Déborah (prophétesse et juge, première femme cheffe de guerre — Israël)", "Rahab (héroïne de Jéricho, sauve les espions hébreux — Canaan)", "Ruth (femme de loyauté absolue, arrière-grand-mère du roi David — Moab/Israël)"] },

  { generation: 15, title: "Samuel et le Royaume d'Israël", era: "Royaumes d'Israël", icon: "⚖️",
    content: "Samuel sacra Saül, premier roi d'Israël (~1020 av. J.-C.). Les Phéniciens fondèrent Carthage (~814 av. J.-C.) et développèrent le commerce maritime jusqu'en Espagne. Cette génération vit la transition du régime des juges à la monarchie unifiée d'Israël.",
    keyEvents: ["Samuel sacre Saül, premier roi d'Israël ~1020 av.", "Fondation de Carthage par les Phéniciens ~814 av."],
    figures: ["Samuel (Prophète, dernier juge — Israël)", "Saül (premier roi d'Israël)", "Didon (reine fondatrice de Carthage — Tunisie actuelle)"] },

  { generation: 16, title: "Dawoud — Roi, Prophète et Psalmiste", era: "Royaumes d'Israël", icon: "🎵",
    content: "Dawoud (David), jeune berger, vainquit le géant Goliath. Prophète et roi d'Israël, il reçut le Zabour (Psaumes), texte d'une beauté sublime. Il unifia les tribus d'Israël et fit de Jérusalem la capitale. Son règne illustre que la vraie royauté s'accompagne de sagesse et de piété.",
    keyEvents: ["David roi d'Israël ~1010-970 av. J.-C.", "Jérusalem proclamée capitale sainte"],
    figures: ["David/Dawud (Prophète, roi-poète — Israël)", "Abigaïl (femme sage et courageuse — Israël)", "Hiram Ier (roi bâtisseur — Phénicie/Liban actuel)"] },

  { generation: 17, title: "Souleyman — La Sagesse Royale", era: "Royaumes d'Israël", icon: "💎",
    content: "Souleyman (Salomon), fils de Dawoud, reçut le plus vaste royaume de son époque et une sagesse légendaire. Il comprenait le langage des oiseaux et des animaux. La reine de Saba vint éprouver sa sagesse. Il construisit le Temple de Jérusalem — chef-d'œuvre architectural de l'Antiquité.",
    keyEvents: ["Salomon roi ~970-931 av. J.-C. et Temple de Jérusalem construit", "La Reine de Saba visite Salomon"],
    figures: ["Salomon/Sulayman (Prophète, roi de sagesse — Israël)", "Reine de Saba/Balkis (reine savante — Éthiopie/Yémen)", "Hiram (architecte du Temple — Phénicie)"] },

  { generation: 18, title: "Les Prophètes d'Israël et les Empires", era: "Royaumes d'Israël", icon: "🛡️",
    content: "Élie/Ilyas défendit le monothéisme face aux idoles de Baal. Élisée accomplit des miracles. Les grands empires assyriens s'étendaient. Le prophète Isaïe commença à annoncer la venue d'un Messie. Le royaume de Salomon se divisa en Israël au nord et Juda au sud.",
    keyEvents: ["Élie défend le monothéisme contre les idoles", "Division du royaume de Salomon en deux"],
    figures: ["Élie/Ilyas (Prophète, défenseur de Dieu — Israël)", "Élisée (Prophète, successeur d'Élie — Israël)", "Assurbanipal (roi lettré — Assyrie/Irak actuel)"] },

  { generation: 19, title: "L'Exil à Babylone", era: "Royaumes d'Israël", icon: "😢",
    content: "Nébucadnetsar détruisit Jérusalem en 587 av. J.-C. et déporta les Hébreux à Babylone. Cet exil douloureux de 70 ans forgea l'identité du peuple juif. Jérémie pleurait sur la ville. Ézéchiel prophétisait. Isaïe annonçait la venue d'un sauveur. La foi résista à l'épreuve.",
    keyEvents: ["Chute de Jérusalem et destruction du Temple 587 av.", "Exil des Hébreux à Babylone"],
    figures: ["Isaïe (Prophète, annonceur du Messie — Israël)", "Jérémie (Prophète des larmes et de l'espoir — Israël)", "Nébucadnetsar II (roi de Babylone — Mésopotamie/Irak)"] },

  { generation: 20, title: "Cyrus et le Retour d'Exil", era: "Empires Anciens", icon: "🦁",
    content: "Cyrus le Grand de Perse permit aux peuples conquis de pratiquer leurs religions. Il libéra les Hébreux de Babylone en 538 av. J.-C. Le prophète Daniel maintint sa foi à la cour babylonienne. La Perse devint un modèle de gouvernance multiculturelle de l'Indus à l'Égypte.",
    keyEvents: ["Cyrus libère les Juifs de Babylone 538 av.", "Daniel, sage et visionnaire à la cour de Babylone"],
    figures: ["Daniel (Prophète, sage inébranlable — Babylone/Perse)", "Cyrus le Grand (roi libérateur, respectueux des religions — Perse/Iran actuel)", "Esther (reine courageuse, sauve son peuple — Perse)"] },

  { generation: 21, title: "L'Éveil Spirituel Mondial", era: "Empires Anciens", icon: "🌍",
    content: "Darius Ier codifa les lois persanes. Zoroastre enseigna la lutte du bien contre le mal. C'est l'époque remarquable où Confucius en Chine, Bouddha en Inde, Laozi et Mahavira émergèrent presque simultanément — comme si l'humanité entière s'éveillait spirituellement en même temps.",
    keyEvents: ["Darius Ier codifie les lois ~522 av.", "Zoroastre enseigne la lumière contre les ténèbres"],
    figures: ["Darius Ier (roi organisateur — Perse/Iran)", "Zoroastre (prophète, fondateur du zoroastrisme — Iran)", "Laozi (sage, auteur du Tao Te Ching — Chine)"] },

  { generation: 22, title: "Confucius, Bouddha et les Sages d'Orient", era: "Empires Anciens", icon: "🪔",
    content: "Confucius (~551 av. J.-C.) enseigne la vertu et l'harmonie sociale en Chine. Bouddha (~563 av. J.-C.) atteint l'Éveil et enseigne la compassion en Inde. Laozi écrit le Tao Te Ching. Mahavira fonde le jaïnisme. L'Axe du monde s'éveille simultanément sur plusieurs continents.",
    keyEvents: ["Confucius enseigne la vertu et l'harmonie ~551 av.", "Bouddha atteint l'Éveil sous l'arbre Bodhi ~528 av."],
    figures: ["Confucius (philosophe de la vertu — Chine)", "Bouddha Siddhartha Gautama (éveillé, fondateur du bouddhisme — Inde/Népal)", "Mahavira (fondateur du jaïnisme — Inde)"] },

  { generation: 23, title: "La Grèce — Naissance de la Philosophie", era: "Empires Anciens", icon: "🏺",
    content: "Solon d'Athènes établit les premières lois démocratiques (594 av. J.-C.). Pythagore découvre son théorème (~570 av. J.-C.). Hérodote voyage et rédige la première Histoire. La philosophie grecque, la démocratie athénienne et la médecine hippocratique transformèrent durablement la pensée humaine.",
    keyEvents: ["Solon d'Athènes instaure les premières lois démocratiques 594 av.", "Pythagore fonde sa communauté ~570 av."],
    figures: ["Solon (père de la démocratie — Grèce/Athènes)", "Pythagore (mathématicien, philosophe — Grèce/Samos)", "Hérodote (premier historien — Grèce/Asie Mineure)"] },

  { generation: 24, title: "Périclès et l'Âge d'Or d'Athènes", era: "Empires Anciens", icon: "🏛️",
    content: "Périclès dirigea l'âge d'or d'Athènes. Le Parthénon fut construit (~447 av. J.-C.). Sophocle et Eschyle écrivirent les tragédies grecques. Hérodote, père de l'histoire, décrivit les peuples du monde. Cette époque posa les fondements de la philosophie, de l'art et de la science occidentale.",
    keyEvents: ["Périclès dirige l'âge d'or d'Athènes ~495 av.", "Construction du Parthénon ~447 av."],
    figures: ["Périclès (homme d'État, bâtisseur — Grèce/Athènes)", "Sophocle (père de la tragédie grecque — Grèce/Athènes)", "Thucydide (père de l'histoire politique, Guerre du Péloponnèse — Grèce)", "Phidias (sculpteur du Parthénon — Grèce)"] },

  { generation: 25, title: "Socrate et Hippocrate — Raison et Médecine", era: "Empires Anciens", icon: "🧪",
    content: "Socrate (~469 av. J.-C.) enseigne la philosophie dans les rues d'Athènes et meurt pour ses convictions. Hippocrate (~460 av. J.-C.) fonde la médecine rationnelle et rédige le serment médical. Démocrite pose la théorie atomique. Ces géants posèrent les bases de la science moderne.",
    keyEvents: ["Socrate enseigne la philosophie à Athènes", "Hippocrate fonde la médecine scientifique ~460 av."],
    figures: ["Socrate (père de la philosophie morale — Grèce/Athènes)", "Hippocrate (père de la médecine — Grèce/Cos)", "Démocrite (savant, théorie atomique — Grèce/Thrace)"] },

  { generation: 26, title: "Platon, Aristote et Alexandre le Grand", era: "Empires Anciens", icon: "📚",
    content: "Platon fonde l'Académie (~387 av. J.-C.). Aristote enseigne toutes les sciences à Alexandre. Alexandre le Grand conquiert la Perse et l'Inde (~334 av. J.-C.) et fonde Alexandrie. Ce brassage culturel entre civilisations grecque, perse, égyptienne et orientale enrichit durablement la pensée humaine.",
    keyEvents: ["Platon fonde l'Académie ~387 av.", "Alexandre conquiert la Perse et fonde Alexandrie ~334 av."],
    figures: ["Platon (philosophe, fondateur de l'Académie — Grèce/Athènes)", "Aristote (philosophe universel — Grèce/Macédoine)", "Alexandre le Grand (roi conquérant, diffuseur de cultures — Macédoine/Grèce)"] },

  { generation: 27, title: "Archimède, Euclide et l'Empire Perse", era: "Empires Anciens", icon: "🔭",
    content: "Euclide écrit Les Éléments, fondement de la géométrie (~300 av. J.-C.). Archimède découvre la poussée et le principe des leviers (~287 av. J.-C.). Eratosthène mesure la circonférence de la Terre. Ashoka, converti au bouddhisme, gouverne l'Inde avec la paix comme principe.",
    keyEvents: ["Géométrie d'Euclide : Les Éléments ~300 av.", "Archimède : poussée, leviers, pi ~287 av."],
    figures: ["Archimède (mathématicien, ingénieur — Grèce/Sicile)", "Euclide (père de la géométrie — Égypte/Alexandrie)", "Ashoka (roi de la paix et du bouddhisme — Inde)"] },

  { generation: 28, title: "Rome — Jules César et Cléopâtre", era: "Empires Anciens", icon: "🏛️",
    content: "Jules César réforme Rome et ses lois (~100-44 av. J.-C.). Cléopâtre VII, dernière reine d'Égypte pharaonique (~51-30 av. J.-C.). Virgile écrit l'Énéide. Rome devient Empire sous Auguste (~27 av. J.-C.). L'ingénierie romaine — routes, aqueducs, ponts — reste un modèle de génie humain.",
    keyEvents: ["Jules César réforme Rome ~100-44 av.", "Cléopâtre VII dernière reine d'Égypte ~51 av."],
    figures: ["Jules César (général, réformateur — Rome/Italie)", "Cléopâtre VII (reine, savante en langues — Égypte)", "Virgile (poète épique — Rome/Italie)"] },

  { generation: 29, title: "Issa — La Lumière de l'Amour", era: "Issa et le Christianisme", icon: "✨",
    content: "Issa (Jésus) naquit miraculeusement de Maryam (Marie). Son Sermon sur la montagne — 'Bienheureux les pauvres en esprit, les artisans de paix' — demeure l'un des textes les plus influents de l'histoire. Il mangea avec les pécheurs, guérit les lépreux, accueillit les exclus. Son message : amour, pardon, miséricorde.",
    keyEvents: ["Naissance de Jésus-Christ/Isa (Prophète) ~4 av.", "Sermon sur la montagne — enseignements universels"],
    figures: ["Jésus-Christ/Isa (Prophète de l'amour — Palestine)", "Marie/Maryam (mère de Jésus, femme de foi — Palestine)", "Jean le Baptiste (Prophète précurseur — Palestine)"] },

  { generation: 30, title: "L'Église Primitive et l'Expansion Chrétienne", era: "Issa et le Christianisme", icon: "🕊️",
    content: "Pierre et Paul portèrent l'Évangile à travers l'Empire romain. La Pentecôte marqua la naissance de l'Église. Les premiers chrétiens, persécutés par Rome, maintinrent leur foi au prix de leur vie. La destruction du Temple de Jérusalem par Titus (70 ap. J.-C.) dispersa le peuple juif.",
    keyEvents: ["Pentecôte et naissance de l'Église chrétienne", "Destruction du Temple de Jérusalem 70 ap."],
    figures: ["Pierre/Kephas (apôtre fondateur — Palestine/Rome)", "Paul de Tarse (diffuseur de l'Évangile — Turquie actuelle/Rome)", "Marie de Magdala (première témoin de la Résurrection — Palestine)"] },

  { generation: 31, title: "Rome Impériale — Marc Aurèle et la Médecine", era: "Issa et le Christianisme", icon: "⚕️",
    content: "Marc Aurèle, emperor philosophe stoïcien (121-180). Galien révolutionne la médecine romaine (129-216). Ptolémée écrit l'Almageste, base de l'astronomie médiévale. Le christianisme se répand dans tout l'Empire romain malgré les persécutions. L'Afrique du Nord produit ses premiers théologiens.",
    keyEvents: ["Marc Aurèle, emperor philosophe (121-180)", "Galien révolutionne la médecine romaine (129-216)"],
    figures: ["Marc Aurèle (emperor philosophe)", "Galien (père de la médecine romaine)", "Septime Sévère (premier emperor africain de Rome — Libye/Rome)", "Tertullien (père de la théologie chrétienne — Carthage/Tunisie actuelle)"] },

  { generation: 32, title: "Néoplatonisme et Zénobie de Palmyre", era: "Transitions Mondiales", icon: "🌙",
    content: "Plotin fonde le néoplatonisme (~205-270). Zénobie, reine de Palmyre, défia Rome avec intelligence (~267-274). Diophante d'Alexandrie fonde l'algèbre symbolique (~280). Mani fonde le manichéisme. Cette période vit la montée des femmes de pouvoir et des penseurs révolutionnaires.",
    keyEvents: ["Plotin fonde le néoplatonisme ~205-270", "Zénobie, reine de Palmyre, défie Rome ~267"],
    figures: ["Plotin (philosophe néoplatonicien)", "Zénobie (reine de Palmyre)", "Diophante (père de l'algèbre symbolique — Alexandrie/Égypte)", "Mani (fondateur du manichéisme, religion universelle — Babylone/Perse)"] },

  { generation: 33, title: "Constantin et la Liberté Religieuse", era: "Transitions Mondiales", icon: "✝️",
    content: "L'Édit de Milan (313) accorda la liberté religieuse. Le Concile de Nicée (325) définit le Credo chrétien. Augustin d'Hippone naquit en Algérie (354). En 380, le christianisme devint religion d'État de l'Empire romain, changeant le destin du monde occidental.",
    keyEvents: ["Édit de Milan : liberté religieuse pour les chrétiens 313", "Concile de Nicée définit le Credo chrétien 325"],
    figures: ["Constantin Ier (premier emperor chrétien)", "Augustin d'Hippone (théologien, Algérie)", "Lactance (apologiste chrétien — Afrique du Nord berbère)", "Pachôme le Grand (fondateur du monachisme cénobitique — Égypte/Thèbes)"] },

  { generation: 34, title: "La Chute de Rome et Hypatia", era: "Transitions Mondiales", icon: "🕯️",
    content: "Alaric pille Rome (410). Hypatia d'Alexandrie, brillante mathématicienne et philosophe, est martyrisée (415). Augustin écrit La Cité de Dieu. Jérôme traduit la Bible en latin (Vulgate). La chute définitive de l'Empire romain d'Occident en 476 marque la fin de l'Antiquité.",
    keyEvents: ["Chute de Rome sous Alaric 410", "Hypatia d'Alexandrie, mathématicienne, martyrisée 415"],
    figures: ["Jérôme (traducteur de la Bible)", "Hypatia d'Alexandrie (mathématicienne et philosophe)", "Ambroise de Milan (évêque, défenseur des pauvres — Milan/Italie)", "Jean Chrysostome (archevêque d'or, défenseur des humbles — Constantinople/Turquie)"] },

  { generation: 35, title: "Les Grandes Migrations et Saint Patrick", era: "Transitions Mondiales", icon: "🚶",
    content: "Attila dirige les Huns (~434-453) et redistribue les peuples. Saint Patrick évangélise l'Irlande (~432). Théodoric le Grand fonde le royaume ostrogoth en Italie. Les monastères irlandais devinrent des lumières de l'Europe médiévale, préservant le savoir de l'Antiquité.",
    keyEvents: ["Attila dirige les Huns ~434-453", "Saint Patrick évangélise l'Irlande ~432"],
    figures: ["Attila (chef hun)", "Saint Patrick (évangélisateur d'Irlande)", "Geneviève de Paris (défenseure héroïque de Paris contre les Huns — France)", "Théodoric le Grand (roi ostrogoth, pont entre Rome et les nations barbares — Italie)"] },

  { generation: 36, title: "Justinien — Le Droit et Sainte-Sophie", era: "Transitions Mondiales", icon: "🔵",
    content: "Justinien Ier codifa le droit romain (Code Justinien, 529). Théodora cofonda avec lui l'Empire byzantin. Sainte-Sophie à Constantinople fut érigée comme icône de la foi et du génie architectural. L'Empire byzantin préserva le savoir grec pendant des siècles. La Pax Romana semblait renaître.",
    keyEvents: ["Justinien Ier codifie le droit romain 529", "Construction de Sainte-Sophie à Constantinople"],
    figures: ["Justinien Ier (emperor byzantin)", "Théodora (impératrice cofondatrice)", "Boèce (philosophe et martyr, dernier grand Romain — Italie)", "Khosrau Ier Anouchirvan (roi perse, mécène des sciences et des philosophes — Iran/Perse)"] },

  { generation: 37, title: "Grégoire le Grand — Naissance de l'Islam en Préparation", era: "Naissance de l'Islam", icon: "🌙",
    content: "Grégoire le Grand réforme l'Église et crée la musique grégorienne (~590). Boèce écrit La Consolation de la Philosophie (524). C'est dans ce contexte que Muhammad ibn Abdullah naît à La Mecque (~570 ap. J.-C.), destiné à sceller le message des prophètes pour toute l'humanité.",
    keyEvents: ["Mahomet ibn Abdullah naît à La Mecque ~570", "Grégoire le Grand réforme l'Église ~590"],
    figures: ["Grégoire le Grand (pape réformateur)", "Mahomet ibn Abdullah naît", "Colomb d'Iona (moine évangélisateur de l'Écosse — Irlande/Écosse)", "Isidore de Séville (encyclopédiste, père des Etymologiae — Espagne/Wisigothique)"] },

  { generation: 38, title: "Muhammad — La Révélation du Coran", era: "Naissance de l'Islam", icon: "📖",
    content: "À 40 ans, dans la grotte de Hira, Muhammad reçut la première révélation : 'Lis, au nom de ton Seigneur qui a créé.' Le Coran fut révélé pendant 23 ans. Khadija fut la première croyante. La Hijra vers Médine (622) fonda la communauté islamique et marqua le début du calendrier islamique.",
    keyEvents: ["Muhammad reçoit la révélation coranique 610", "Hégire de La Mecque à Médine 622"],
    figures: ["Muhammad (saw) (Prophète, Sceau des Prophètes)", "Khadija bint Khuwaylid (première croyante)", "Abu Bakr al-Siddiq (premier calife, compagnon fidèle — Arabie Saoudite)", "Bilal ibn Rabah (premier muezzin, ancien esclave affranchi, symbole de la liberté — Éthiopie/Arabie)"] },

  { generation: 39, title: "Les Quatre Califes — L'Âge d'Or Initial", era: "Expansion Islamique", icon: "🌟",
    content: "À la mort du Prophète, Abu Bakr, Umar, Uthman puis Ali guidèrent la communauté. La compilation du Coran en un livre unique (Uthman, 644). L'Islam s'étendit de la Perse à l'Égypte. La bataille de Karbala (680) et le martyre de Hussein marquèrent un tournant dans l'histoire islamique.",
    keyEvents: ["Compilation définitive du Coran sous Uthman 644", "Expansion de l'Islam en Perse, Syrie, Égypte"],
    figures: ["Omar ibn al-Khattab (deuxième calife)", "Aisha bint Abi Bakr (grande savante islamique)", "Ali ibn Abi Talib (quatrième calife, lion de Dieu — Arabie Saoudite)", "Khalid ibn al-Walid (stratège imbattu, l'Épée de Dieu — Arabie/Syrie)"] },

  { generation: 40, title: "Les Omeyyades et l'Islam en Espagne", era: "Expansion Islamique", icon: "🕌",
    content: "Ali ibn Abi Talib fut le quatrième calife. Hussein ibn Ali, martyr de Karbala (680). Tariq ibn Ziyad conquit Al-Andalus (Espagne, 711). L'Espagne islamique, carrefour culturel de l'Europe et de l'Islam, produisit des siècles de science, de philosophie et de coexistence entre les trois religions.",
    keyEvents: ["Tariq ibn Ziyad conquiert Al-Andalus (Espagne) 711", "Bataille de Karbala et martyre de Hussein 680"],
    figures: ["Ali ibn Abi Talib (quatrième calife)", "Tariq ibn Ziyad (conquérant de l'Espagne)", "Hussein ibn Ali (martyr de Karbala, symbole de justice — Arabie/Irak)", "Al-Hasan al-Basri (imam de la piété et de la spiritualité — Irak/Bassora)"] },

  { generation: 41, title: "Omar ibn Abd al-Aziz — Le Calife Juste", era: "Expansion Islamique", icon: "⚖️",
    content: "Omar ibn Abd al-Aziz (717-720) gouverna avec une justice et une piété légendaires. Al-Hasan al-Basri fonda le soufisme. L'Islam atteignit l'Asie centrale. Les premières mosquées s'élevèrent en Afrique de l'Ouest, portant le message de la foi aux peuples sahéliens.",
    keyEvents: ["Omar ibn Abd al-Aziz, calife de justice et réforme 717-720", "Premières mosquées en Afrique de l'Ouest"],
    figures: ["Omar ibn Abd al-Aziz (calife de justice)", "Al-Hasan al-Basri (fondateur du soufisme)", "Rabi'a al-Adawiyya (grande mystique soufie — Bassora/Irak)", "Wasil ibn Ata (fondateur du mutazilisme, raison et foi — Irak/Bassora)"] },

  { generation: 42, title: "Bagdad — Capitale Mondiale du Savoir", era: "Expansion Islamique", icon: "🔭",
    content: "Les Abbassides fondèrent Bagdad (762). Haroun al-Rachid régna dans la splendeur (786-809). Jabir ibn Hayyan fonda la chimie expérimentale. La Maison de la Sagesse (Bayt al-Hikma) rassembla des savants de toutes origines. Charlemagne fut couronné Emperor d'Occident (800).",
    keyEvents: ["Fondation de Bagdad par les Abbassides 762", "Charlemagne couronné Emperor d'Occident 800"],
    figures: ["Jabir ibn Hayyan (père de la chimie)", "Haroun al-Rachid (calife abbasside)", "Al-Kindi (premier philosophe arabe — Irak)", "Mansur al-Hallaj (mystique soufi, martyr de la vérité divine — Bagdad/Irak)"] },

  { generation: 43, title: "Al-Khwarizmi — L'Algèbre et l'Algorithmique", era: "Expansion Islamique", icon: "🔢",
    content: "Al-Khwarizmi inventa l'algèbre et l'algorithmique (830). La Maison de la Sagesse à Bagdad traduisit tout le savoir grec, perse et indien en arabe. Al-Battani calcula les éclipses avec précision. Al-Kindi fut le premier philosophe arabe. Ces savants islamiques transformèrent les mathématiques mondiales.",
    keyEvents: ["Al-Khwarizmi invente l'algèbre et l'algorithmique 830", "Maison de la Sagesse traduit les savoirs mondiaux"],
    figures: ["Al-Khwarizmi (père de l'algèbre)", "Al-Battani (astronome)", "Al-Farabi (philosophe, 'deuxième maître' après Aristote — Kazakhstan/Irak)", "Rhazes/Al-Razi (médecin, fondateur de la pédiatrie et psychiatrie — Iran/Perse)"] },

  { generation: 44, title: "Ibn Sina — La Médecine Universelle", era: "Expansion Islamique", icon: "⚕️",
    content: "Ibn Sina (Avicenne, 980-1037) écrivit le Canon de la Médecine, référence mondiale pendant 700 ans. Al-Biruni mesura la circonférence de la Terre. L'Empire du Ghana atteignit son apogée en Afrique de l'Ouest. Ibn al-Haytham révolutionna l'optique et la vision.",
    keyEvents: ["Ibn Sina écrit le Canon de la Médecine 1025", "Empire du Ghana à son apogée en Afrique"],
    figures: ["Ibn Sina/Avicenne (médecin universel)", "Al-Biruni (polymathe et géographe)", "Ibn al-Haytham (père de l'optique et de la méthode scientifique — Irak/Égypte)", "Firdousi (auteur du Shahnameh, épopée nationale perse — Iran/Khorasan)"] },

  { generation: 45, title: "Al-Ghazali et les Croisades", era: "Rencontres des Civilisations", icon: "⚔️",
    content: "Al-Ghazali écrivit La Revivification des sciences religieuses (1111), réconciliant foi et raison. Omar Khayyam réforma le calendrier perse. Ibn al-Haytham révolutionna l'optique. Les Croisades (1096) créèrent des échanges douloureux mais décisifs de savoir entre Islam et Chrétienté.",
    keyEvents: ["Al-Ghazali : La Revivification des sciences 1111", "Croisades : premiers croisés en Terre Sainte 1096"],
    figures: ["Al-Ghazali (philosophe soufi)", "Omar Khayyam (mathématicien et poète)", "Ibn Rushd/Averroès (philosophe, commentateur universel d'Aristote — Espagne islamique/Maroc)", "Hildegarde de Bingen (abbesse, savante et compositrice — Allemagne/Rhénanie)"] },

  { generation: 46, title: "Sundiata Keïta — L'Empire du Mali", era: "Empires Africains", icon: "🦁",
    content: "Sundiata Keïta, le 'Lion du Mali', vainquit Soumaoro Kanté à Kirina (1235) et fonda l'Empire du Mali. La Charte de Kouroukan Fouga est l'une des premières déclarations des droits humains de l'histoire. Thomas d'Aquin naît (1225), futur géant de la théologie chrétienne.",
    keyEvents: ["Soundiata Keita fonde l'Empire du Mali ~1235", "Thomas d'Aquin naît (1225)"],
    figures: ["Soundiata Keita (fondateur de l'Empire du Mali)", "Thomas d'Aquin (théologien universel)", "Nasir al-Din al-Tusi (mathématicien, astronome — Iran/Perse)", "Éléonore d'Aquitaine (reine de France et d'Angleterre, mécène — France/Angleterre)"] },

  { generation: 47, title: "Saladin et Maïmonide", era: "Rencontres des Civilisations", icon: "🌹",
    content: "Saladin libéra Jérusalem (1187) avec noblesse et clémence. Maïmonide écrivit Le Guide des perplexes, synthèse entre judaïsme et philosophie arabe. Les universités de Bologne, Oxford et Paris émergèrent. L'enseignement supérieur se démocratisait progressivement en Europe et dans le monde islamique.",
    keyEvents: ["Saladin libère Jérusalem avec clémence 1187", "Universités de Bologne, Oxford, Paris fondées"],
    figures: ["Saladin (sultan libérateur de Jérusalem)", "Maïmonide (philosophe et médecin juif)", "Hildegarde de Bingen (abbesse, savante universelle, musicienne — Allemagne)", "Ibn Jubayr (explorateur, géographe de l'Empire islamique — Andalousie/Espagne)"] },

  { generation: 48, title: "Gengis Khan et la Magna Carta", era: "Rencontres des Civilisations", icon: "🌍",
    content: "Gengis Khan unifia les steppes et fonda l'Empire mongol (1206). Ibn al-Nafis découvrit la circulation pulmonaire (1242). La Magna Carta en Angleterre posa les premiers droits fondamentaux (1215). Rumi composa le Masnavi, chef-d'œuvre de la mystique islamique.",
    keyEvents: ["Gengis Khan fonde l'Empire mongol 1206", "Magna Carta : premiers droits fondamentaux 1215"],
    figures: ["Gengis Khan (fondateur de l'Empire mongol)", "Rumi (poète soufi universel)", "Ibn al-Nafis (découverte de la circulation pulmonaire — Syrie/Égypte)", "Roger Bacon (moine scientifique, précurseur de la méthode expérimentale — Angleterre/Oxford)"] },

  { generation: 49, title: "Mansa Moussa — Le Pèlerinage du Siècle", era: "Empires Africains", icon: "🕋",
    content: "Mansa Moussa effectua en 1324 le pèlerinage à La Mecque avec 60 000 personnes et 80 chameaux chargés d'or, révélant au monde la richesse extraordinaire de l'Afrique. Marco Polo documenta la technologie chinoise. Dante écrit La Divine Comédie (1308). Tombouctou devenait capitale du savoir islamique africain.",
    keyEvents: ["Mansa Musa pèlerinage légendaire à La Mecque 1324", "Marco Polo voyage en Chine 1271-1295"],
    figures: ["Mansa Musa (emperor du Mali, plus riche homme)", "Ibn Battuta (plus grand voyageur du Moyen Âge)", "Dante Alighieri (auteur de La Divine Comédie — Italie/Florence)", "Pétrarque (père de l'humanisme, sonnetiste universel — Italie/Avignon)"] },

  { generation: 50, title: "Ibn Khaldoun — Le Père de la Sociologie", era: "Empires Africains", icon: "📚",
    content: "Ibn Khaldoun écrivit la Muqaddima (1377), fondation de la sociologie et de la philosophie de l'histoire. Askia Mohammed réforma l'Empire Songhaï. Les bibliothèques de Tombouctou rassemblaient des centaines de milliers de manuscrits. Hafez de Chiraz fut le grand poète mystique persan.",
    keyEvents: ["Ibn Khaldoun écrit la Muqaddima 1377", "Askia Mohammed réforme l'Empire Songhaï ~1493"],
    figures: ["Ibn Khaldoun (père de la sociologie)", "Hafez de Chiraz (poète mystique)", "Askia Mohammed (grand réformateur et savant de l'Empire Songhaï — Mali/Gao)", "Christine de Pizan (première femme de lettres, défenseuse des femmes — Italie/France)"] },

  { generation: 51, title: "Gutenberg et la Révolution de l'Imprimerie", era: "Rencontres des Civilisations", icon: "🖨️",
    content: "Gutenberg inventa l'imprimerie à caractères mobiles (~1450) — révolution qui démocratisa le savoir. Léonard de Vinci naît (1452). La chute de Constantinople (1453) marqua la fin de l'Empire byzantin. L'Empire Songhaï atteignait son apogée en Afrique de l'Ouest avec Tombouctou comme capitale intellectuelle.",
    keyEvents: ["Gutenberg invente l'imprimerie ~1450", "Chute de Constantinople 1453"],
    figures: ["Johannes Gutenberg (inventeur de l'imprimerie)", "Léonard de Vinci (génie universel, 1452)", "Zheng He (amiral explorateur, 7 grandes expéditions maritimes — Chine)", "Mehmed II (conquérant de Constantinople, mécène et polyglotte — Turquie/Empire ottoman)"] },

  { generation: 52, title: "Colomb, Vasco de Gama et les Grandes Découvertes", era: "Colonisation", icon: "🚢",
    content: "Christophe Colomb atteignit les Amériques en 1492. Vasco de Gama contourna l'Afrique pour atteindre l'Inde (1498). Michel-Ange peint la Sixtine (1508-1512). Ces 'découvertes' ouvrirent de nouvelles routes mais inaugurèrent aussi l'ère coloniale et la déportation des Africains.",
    keyEvents: ["Christophe Colomb atteint les Amériques 1492", "Vasco de Gama ouvre la route des Indes 1498"],
    figures: ["Michel-Ange (artiste universel)", "Christophe Colomb (explorateur)", "Cuauhtémoc (dernier emperor aztèque, résistant héroïque contre l'invasion — Mexique/Tenochtitlan)", "Érasme de Rotterdam (prince des humanistes, Éloge de la Folie — Pays-Bas/Europe)"] },

  { generation: 53, title: "Luther et la Révolution Protestante", era: "Révolutions", icon: "📜",
    content: "Martin Luther publia ses 95 thèses (1517), lançant la Réforme protestante. Copernic révolutionna l'astronomie (1543). Soliman le Magnifique régna sur l'Empire ottoman. Érasme diffusa l'humanisme en Europe. La Bible fut traduite dans les langues nationales, démocratisant la foi.",
    keyEvents: ["Martin Luther publie les 95 thèses 1517", "Copernic publie l'héliocentrisme 1543"],
    figures: ["Martin Luther (réformateur protestant)", "Copernic (révolution astronomique)", "Soliman le Magnifique (sultan législateur, apogée ottomane — Turquie/Empire ottoman)", "Jean Calvin (réformateur protestant, théocratie de Genève — France/Suisse)"] },

  { generation: 54, title: "Galilée et Shakespeare", era: "Révolutions", icon: "🔭",
    content: "Galilée observe les lunes de Jupiter avec son télescope (1610) et confirme le système de Copernic. Shakespeare écrit Hamlet, Macbeth, Roméo et Juliette (~1600). Cervantes publie Don Quichotte (1605). La méthode scientifique et la littérature universelle transformèrent la pensée humaine.",
    keyEvents: ["Galilée observe les lunes de Jupiter avec son télescope 1610", "Shakespeare écrit ses chefs-d'œuvre ~1600"],
    figures: ["Galilée (astronome et physicien)", "William Shakespeare (dramaturge universel)", "Johannes Kepler (astronome, lois du mouvement planétaire — Allemagne)", "Francis Bacon (père de la méthode scientifique inductive — Angleterre)"] },

  { generation: 55, title: "Descartes et Pascal — Le Rationalisme", era: "Révolutions", icon: "💭",
    content: "Descartes fonde le rationalisme avec le Discours de la méthode (1637). Pascal invente la calculatrice (1642) et écrit les Pensées. Rembrandt van Rijn illumine la peinture. Kepler formule les lois du mouvement planétaire (1619). La Raison devient le moteur de la civilisation européenne.",
    keyEvents: ["Descartes publie le Discours de la méthode 1637", "Pascal invente la calculatrice 1642"],
    figures: ["René Descartes (père du rationalisme)", "Blaise Pascal (mathématicien et philosophe)", "Rembrandt van Rijn (maître de la lumière en peinture — Pays-Bas)", "Spinoza (philosophe de la liberté et de l'Éthique — Pays-Bas/Amsterdam)"] },

  { generation: 56, title: "Newton — La Gravitation Universelle", era: "Révolutions", icon: "🍎",
    content: "Newton publie les Principia Mathematica (1687), base de la physique. Locke fonde le libéralisme politique (1689). Leibniz invente le calcul infinitésimal. Louis XIV bâtit Versailles. Ces découvertes et idées posèrent les fondements des Lumières et des révolutions démocratiques du siècle suivant.",
    keyEvents: ["Newton publie les Principia Mathematica 1687", "Locke publie ses traités politiques 1689"],
    figures: ["Isaac Newton (père de la physique classique)", "John Locke (père du libéralisme)", "Gottfried Leibniz (mathématicien, inventeur du calcul infinitésimal — Allemagne)", "Molière (maître de la comédie universelle, critique sociale — France/Paris)"] },

  { generation: 57, title: "Les Lumières — Voltaire et Rousseau", era: "Révolutions", icon: "💡",
    content: "Bach compose la Messe en si mineur (~1749). Voltaire publie Candide (1759). Rousseau publie Du Contrat Social (1762). Montesquieu crée la théorie de la séparation des pouvoirs. Ces philosophes des Lumières préparèrent intellectuellement les révolutions américaine et française.",
    keyEvents: ["Voltaire publie Candide 1759", "Rousseau publie Du Contrat Social 1762"],
    figures: ["Bach (compositeur universel)", "Voltaire (philosophe des Lumières)", "Jean-Jacques Rousseau (théoricien du contrat social et de l'éducation — Suisse/France)", "Montesquieu (inventeur de la séparation des pouvoirs — France/Bordeaux)"] },

  { generation: 58, title: "La Révolution Française et l'Indépendance Américaine", era: "Révolutions", icon: "🔵",
    content: "La Déclaration d'Indépendance américaine (1776) et la Révolution française (1789) proclamèrent que tous les hommes naissent libres et égaux. Toussaint Louverture mena la révolution haïtienne (1804) — premier État noir libre du monde. Adam Smith fonda l'économie moderne.",
    keyEvents: ["Déclaration d'Indépendance américaine 1776", "Révolution française : Liberté, Égalité, Fraternité 1789"],
    figures: ["Toussaint Louverture (libérateur d'Haïti)", "Adam Smith (père de l'économie moderne)", "Olympe de Gouges (pionnière des droits des femmes, martyrisée — France)", "Kant (philosophe de la raison pure, Critique de la raison pure — Prusse/Allemagne)"] },

  { generation: 59, title: "Napoléon et Beethoven", era: "Révolutions", icon: "⚔️",
    content: "Napoléon Bonaparte réforma le droit européen (Code civil, 1804). Beethoven composa la 9e Symphonie avec l'Ode à la Joie (1824). Tipu Sultan résista aux Britanniques jusqu'à la mort (1799). L'Haïti indépendante devint le premier État noir libre du monde moderne.",
    keyEvents: ["Napoléon Code civil 1804", "Indépendance d'Haïti premier État noir libre 1804"],
    figures: ["Napoléon Bonaparte (réformateur)", "Beethoven (compositeur universel)", "Tipu Sultan (résistant indien contre les Britanniques — Inde/Mysore)", "Goethe (poète universel, Faust — Allemagne/Weimar)"] },

  { generation: 60, title: "Bolívar et Chaka Zoulou — Libérations", era: "Colonisation", icon: "🛡️",
    content: "Simón Bolívar libéra 6 nations d'Amérique du Sud (1810-1825). Chaka Zoulou unifia les clans et créa une nation puissante en Afrique du Sud (~1816). El Hadj Umar Tall résista aux Français en Afrique de l'Ouest. Ces héros rappellent que l'Afrique et l'Amérique ne se soumirent pas sans combattre.",
    keyEvents: ["Simón Bolívar libère 6 nations d'Amérique du Sud 1810-1825", "Shaka Zulu fonde le royaume zoulou ~1816"],
    figures: ["Simón Bolívar (libérateur d'Amérique latine)", "Shaka Zulu (roi guerrier)", "Nzinga Mbande (reine guerrière, résistante contre le Portugal — Angola)", "Harriet Beecher Stowe (auteure de La Case de l'Oncle Tom, contre l'esclavage — États-Unis)"] },

  { generation: 61, title: "El Hadj Umar Tall et Victor Hugo", era: "Colonisation", icon: "📖",
    content: "El Hadj Oumar Tall fonda l'Empire toucouleur (1852-1864) et résista aux Français en Afrique de l'Ouest. Victor Hugo publia Les Misérables (1862), chef-d'œuvre universel sur la dignité humaine. Les révolutions de 1848 agitèrent l'Europe. La grande famine d'Irlande dispersa des millions de personnes.",
    keyEvents: ["El Hadj Oumar Tall fonde l'Empire toucouleur 1852", "Victor Hugo publie Les Misérables 1862"],
    figures: ["El Hadj Oumar Tall (résistant africain)", "Victor Hugo (écrivain universel)", "Abd el-Kader (résistant algérien contre la France, roi de la clémence — Algérie)", "Louis Braille (inventeur de l'alphabet braille, lumière pour les aveugles — France)"] },

  { generation: 62, title: "Lincoln, Darwin et Marie Curie", era: "Révolutions", icon: "⚗️",
    content: "Abraham Lincoln abolit l'esclavage aux États-Unis (1865). Louis Pasteur démontra que les microbes causent les maladies (1859). Darwin publia L'Origine des espèces (1859). Harriet Tubman guida des centaines d'esclaves vers la liberté guidée par sa foi inébranlable.",
    keyEvents: ["Lincoln abolit l'esclavage aux États-Unis 1865", "Darwin publie L'Origine des espèces 1859"],
    figures: ["Abraham Lincoln (président abolitionniste)", "Harriet Tubman (héroïne de la liberté)", "Karl Marx (théoricien de la justice sociale — Allemagne/Angleterre)", "Florence Nightingale (fondatrice des soins infirmiers modernes — Angleterre/Italie)"] },

  { generation: 63, title: "Samori Touré — La Résistance Héroïque", era: "Colonisation", icon: "⚔️",
    content: "Samori Touré résista héroïquement à la colonisation française pendant seize ans (1882-1898). Mendeleïev présenta le tableau périodique des éléments (1869). La Conférence de Berlin (1884-1885) partagea l'Afrique entre puissances européennes sans consulter un seul Africain.",
    keyEvents: ["Samori Touré résiste à la colonisation 1882-1898", "Conférence de Berlin partage l'Afrique 1884-1885"],
    figures: ["Samori Touré (héros de la résistance africaine)", "Mendeleïev (tableau périodique 1869)", "Yaa Asantewaa (reine guerrière, résistance contre les Britanniques — Ghana/Ashanti)", "Nikola Tesla (inventeur du courant alternatif, génie méconnu — Serbie/États-Unis)"] },

  { generation: 64, title: "Edison, Tesla et Marie Curie", era: "Révolutions", icon: "⚡",
    content: "Edison inventa l'ampoule électrique et le phonographe (1879). Tesla inventa le moteur à courant alternatif (1888). Marie Curie découvrit le radium et le polonium (1898) — première femme prix Nobel. Les frères Lumière créèrent le cinéma (1895). La révolution électrique transforma le monde.",
    keyEvents: ["Edison invente l'ampoule électrique 1879", "Marie Curie découvre le radium et polonium 1898"],
    figures: ["Thomas Edison (inventeur)", "Marie Curie (première femme prix Nobel)", "Behanzin (roi résistant, dernier souverain indépendant du Dahomey — Bénin)", "Sigmund Freud (père de la psychanalyse — Autriche/Vienne)"] },

  { generation: 65, title: "Einstein, Gandhi et la Grande Guerre", era: "Guerres Mondiales", icon: "🌍",
    content: "Einstein publia la relativité restreinte (1905) et générale (1915), révolutionnant la physique. Gandhi développa la non-violence en Afrique du Sud. Cheikh Amadou Bamba fonda le mouridisme au Sénégal. La Première Guerre mondiale (1914-1918) fit des millions de morts, dont des centaines de milliers de soldats africains.",
    keyEvents: ["Einstein publie la relativité 1905 et 1915", "Première Guerre mondiale 1914-1918"],
    figures: ["Einstein (physicien révolutionnaire)", "Gandhi (pionnier de la non-violence)", "Cheikh Ahmadou Bamba (résistant spirituel, fondateur de Touba — Sénégal)", "Bertrand Russell (philosophe, prix Nobel de la paix, défenseur de la raison — Angleterre)"] },

  { generation: 66, title: "La Négritude et le Panafricanisme", era: "Luttes pour la Liberté", icon: "✊",
    content: "Léopold Sédar Senghor et Aimé Césaire fondèrent la Négritude (~1934), célébrant la dignité africaine. Marcus Garvey lança le mouvement panafricain (1914). La Harlem Renaissance vit l'essor des arts africains-américains. Cheikh Ahmadou Bamba résistait pacifiquement à la colonisation française.",
    keyEvents: ["Négritude : Senghor, Césaire, Damas ~1934", "Marcus Garvey lance le mouvement panafricain 1914"],
    figures: ["Léopold Sédar Senghor (fondateur de la Négritude)", "Marcus Garvey (leader panafricain)", "Aimé Césaire (poète de la Négritude, 'Cahier d'un retour' — Martinique/France)", "Langston Hughes (poète de la Harlem Renaissance — États-Unis/New York)"] },

  { generation: 67, title: "Nkrumah et l'Année de l'Afrique", era: "Indépendances", icon: "🌍",
    content: "Kwame Nkrumah libéra le Ghana en 1957 — premier pays d'Afrique subsaharienne indépendant. En 1960, l'Année de l'Afrique, 17 nations accédèrent à l'indépendance. Patrice Lumumba fut le premier Premier ministre du Congo indépendant avant d'être assassiné en 1961.",
    keyEvents: ["Kwame Nkrumah libère le Ghana 1957", "L'Année de l'Afrique : 17 pays indépendants 1960"],
    figures: ["Kwame Nkrumah (père du Ghana indépendant)", "Patrice Lumumba (martyr congolais)", "Amilcar Cabral (théoricien et résistant de la décolonisation — Guinée-Bissau/Cap-Vert)", "Jawaharlal Nehru (premier Premier ministre de l'Inde indépendante — Inde)"] },

  { generation: 68, title: "Martin Luther King — Je Fais un Rêve", era: "Luttes pour la Dignité", icon: "🕊️",
    content: "Martin Luther King mena la Marche sur Washington (1963) avec son discours 'I Have a Dream'. Nelson Mandela fut emprisonné (1964), symbole universel de résistance. Frantz Fanon publia Les Damnés de la Terre (1961). L'OUA — Organisation de l'Unité Africaine — fut créée (1963).",
    keyEvents: ["Martin Luther King 'I Have a Dream' 1963", "OUA fondée, Organisation de l'Unité Africaine 1963"],
    figures: ["Martin Luther King (leader des droits civiques)", "Nelson Mandela (emprisonné, symbole de résistance)", "Frantz Fanon (théoricien de la libération des peuples colonisés — Martinique/Algérie)", "Malcolm X (leader des droits civiques, défenseur de la dignité noire — États-Unis)"] },

  { generation: 69, title: "Sékou Touré — Non à la France", era: "Indépendances", icon: "✊",
    content: "Sékou Touré déclara : 'Nous préférons la liberté dans la pauvreté à la richesse dans l'esclavage' (1958). Thomas Sankara révolutionna le Burkina Faso (1983-1987). Wangari Maathai planta des millions d'arbres. Steve Biko fonda le mouvement de la conscience noire en Afrique du Sud.",
    keyEvents: ["Sékou Touré dit Non à De Gaulle, Guinée indépendante 1958", "Thomas Sankara révolutionne le Burkina Faso 1983-1987"],
    figures: ["Sékou Touré (leader guinéen)", "Thomas Sankara (révolutionnaire burkinabé)", "Steve Biko (fondateur de la conscience noire, martyr — Afrique du Sud)", "Salvador Allende (premier président socialiste élu démocratiquement — Chili)"] },

  { generation: 70, title: "Mandela Libéré — La Réconciliation", era: "Luttes pour la Dignité", icon: "🌈",
    content: "Nelson Mandela fut libéré après 27 ans de prison (1990) et élu président d'Afrique du Sud (1994). Il choisit la réconciliation plutôt que la vengeance. Desmond Tutu reçut le prix Nobel de la paix (1984). Kofi Annan devint secrétaire général de l'ONU (1997).",
    keyEvents: ["Nelson Mandela libéré après 27 ans 1990", "Fin de l'apartheid et premières élections libres 1994"],
    figures: ["Nelson Mandela (président réconciliateur)", "Desmond Tutu (prix Nobel de la paix)", "Wangari Maathai (écologiste, prix Nobel de la paix, 30 millions d'arbres — Kenya)", "Rigoberta Menchú (militante indigène guatémaltèque, prix Nobel de la paix — Guatemala)"] },

  { generation: 71, title: "Sembène Ousmane — Le Cinéma Africain", era: "Luttes pour la Dignité", icon: "🎬",
    content: "Amadou Hampâté Bâ préserva les traditions orales africaines. Sembène Ousmane créa le cinéma africain (1963). Wole Soyinka reçut le premier prix Nobel africain de littérature (1986). Ces artistes et penseurs prouvèrent que l'Afrique avait sa propre tradition intellectuelle et artistique de premier rang.",
    keyEvents: ["Sembène Ousmane crée le cinéma africain 1963", "Wole Soyinka reçoit le prix Nobel de littérature 1986"],
    figures: ["Amadou Hampâté Bâ (gardien des traditions)", "Sembène Ousmane (père du cinéma africain)", "Wole Soyinka (premier Nobel africain de littérature — Nigeria)", "Toni Morrison (prix Nobel de littérature, Beloved — États-Unis/Ohio)"] },

  { generation: 72, title: "Internet — La Révolution de l'Information", era: "Ère Numérique", icon: "🌐",
    content: "Tim Berners-Lee inventa le World Wide Web (1991). Mae Jemison devint la première femme noire dans l'espace (1992). Nelson Mandela fut élu président d'Afrique du Sud (1994). La fin de la Guerre Froide et l'essor d'internet transformèrent fondamentalement le monde.",
    keyEvents: ["Tim Berners-Lee invente le World Wide Web 1991", "Nelson Mandela élu président d'Afrique du Sud 1994"],
    figures: ["Tim Berners-Lee (inventeur du Web)", "Mae Jemison (première femme noire dans l'espace)", "Stephen Hawking (physicien révolutionnaire, théorie des trous noirs — Angleterre)", "Nelson Mandela (libéré, élu président, symbole universel — Afrique du Sud)"] },

  { generation: 73, title: "Barack Obama et le Printemps Arabe", era: "Ère Numérique", icon: "🇺🇸",
    content: "Barack Obama devint le premier président afro-américain des États-Unis (2008). Son élection fut ressentie dans toute l'Afrique comme une victoire symbolique. Le Printemps arabe (2011) secoua le monde arabe. Malala Yousafzai, blessée au Pakistan, devint la plus jeune lauréate du prix Nobel (2014).",
    keyEvents: ["Barack Obama élu 44e président américain 2008", "Printemps arabe et quête de liberté 2011"],
    figures: ["Barack Obama (premier président afro-américain)", "Malala Yousafzai (défenseuse de l'éducation)", "Ellen Johnson Sirleaf (première femme présidente africaine, prix Nobel — Libéria)", "Aung San Suu Kyi (résistante birmane, prix Nobel de la paix — Myanmar)"] },

  { generation: 74, title: "COVID-19 — L'Humanité à l'Épreuve", era: "Ère Numérique", icon: "🦠",
    content: "En 2020, le coronavirus Covid-19 frappa l'humanité entière. Des millions de vies furent perdues. Mais la pandémie révéla aussi le meilleur de l'humanité : des soignants héroïques, des scientifiques qui développèrent un vaccin en temps record. L'Accord de Paris sur le Climat (2015) tenta de répondre à l'urgence environnementale.",
    keyEvents: ["COVID-19 : pandémie mondiale et résilience humaine 2020", "Accord de Paris sur le Climat 2015"],
    figures: ["Maryam Mirzakhani (première Médaille Fields féminine)", "Simone Biles (athlète universelle)", "Tu Youyou (prix Nobel de médecine, découverte antipaludique — Chine)", "Boyan Slat (inventeur du nettoyage des océans, The Ocean Cleanup — Pays-Bas)"] },

  { generation: 75, title: "L'Afrobeats Conquiert le Monde", era: "Présent", icon: "🎵",
    content: "Burna Boy remporta le Grammy Award (2021). Wizkid collabora avec Beyoncé. Kylian Mbappé devint champion du monde à 19 ans (2018). La renaissance culturelle africaine rayonna mondialement. Ngozi Okonjo-Iweala prit la tête de l'OMC (2021), première Africaine à ce poste.",
    keyEvents: ["Afrobeats aux Grammy Awards et charts mondiaux 2021", "Kylian Mbappé champion du monde 2018"],
    figures: ["Burna Boy (artiste global)", "Ngozi Okonjo-Iweala (directrice de l'OMC)", "Kylian Mbappé (champion du monde à 19 ans — France/Cameroun)", "Sanna Marin (première femme PM de Finlande, symbole de la nouvelle politique — Finlande)"] },

  { generation: 76, title: "Black Lives Matter et la Littérature Africaine", era: "Présent", icon: "✊",
    content: "Le mouvement Black Lives Matter (2020) mobilisa des millions de personnes contre le racisme systémique. Leïla Slimani reçut le prix Goncourt (2016). Chimamanda Adichie publia Americanah. La mode africaine rayonnait à Lagos, Dakar et Nairobi. La révolution numérique atteignit 500 millions de smartphones en Afrique.",
    keyEvents: ["#BlackLivesMatter : conscience mondiale 2020", "Leïla Slimani remporte le prix Goncourt 2016"],
    figures: ["Leïla Slimani (écrivaine primée)", "Chimamanda Adichie (voix féministe africaine)", "Aliou Diallo (entrepreneur panafricain, mines — Guinée)", "Naomi Osaka (championne de tennis, militante contre le racisme — Japon/États-Unis)"] },

  { generation: 77, title: "La Jeunesse Africaine en Marche", era: "Présent", icon: "📈",
    content: "L'Afrique connut une décennie de croissance économique soutenue. Le mouvement panafricain de la nouvelle génération prit de l'ampleur. Les institutions démocratiques africaines se renforcèrent. La jeunesse africaine, la plus jeune du monde, devint le moteur démographique de la planète.",
    keyEvents: ["Entrepreneuriat africain : croissance des startups tech", "Mouvement panafricain de la nouvelle génération"],
    figures: ["Nouvelles figures politiques africaines", "Entrepreneurs tech africains", "Flutterwave, M-Pesa (révolutionnaires du paiement numérique — Nigeria/Kenya)", "Strive Masiyiwa (entrepreneur visionnaire des télécoms — Zimbabwe)"] },

  { generation: 78, title: "La Guinée — Culture et Rayonnement", era: "Présent", icon: "🎶",
    content: "Le Ballet Africain de Guinée rayonne sur la scène mondiale comme ambassadeur de la culture africaine. Famoudou Konaté est reconnu mondialement comme maître du djembé. Les traditions musicales de Guinée sont classées par l'UNESCO. L'héritage culturel guinéen appartient au patrimoine mondial.",
    keyEvents: ["Ballet Africain de Guinée en tournée mondiale", "Traditions musicales de Guinée classées UNESCO"],
    figures: ["Famoudou Konaté (maître mondial du djembé)", "Artistes du Ballet National de Guinée", "Fodéba Keïta (fondateur du Ballet Africain de Guinée — Guinée)", "Miriam Makeba (Mama Africa, exilée pour la liberté — Afrique du Sud/Guinée)"] },

  { generation: 79, title: "Les Résistants Africains du XIXe Siècle", era: "Colonisation", icon: "🛡️",
    content: "El Hadj Oumar Tall réforma l'Islam en Afrique de l'Ouest (~1840). Alfa Yaya Diallo résista à la colonisation française (~1900). Les savants de Tombouctou préservèrent des milliers de manuscrits. Ces résistants africains rappellent que l'Afrique a lutté pour sa dignité avec force et intelligence.",
    keyEvents: ["El Hadj Oumar Tall réforme l'Islam en Afrique ~1840", "Alfa Yaya Diallo résiste à la colonisation ~1900"],
    figures: ["El Hadj Oumar Tall (réformateur islamique)", "Thierno Aliou Bah (grand savant guinéen)", "Alfa Yaya Diallo (roi de Labé, résistant contre la colonisation — Guinée)", "Blaise Diagne (premier député africain à l'Assemblée française — Sénégal/Dakar)"] },

  { generation: 80, title: "Menelik II — La Victoire d'Adoua", era: "Colonisation", icon: "⚔️",
    content: "Samori Touré résista héroïquement aux Français (1882-1898). Menelik II battit l'armée italienne à la bataille d'Adoua (1896) — première grande victoire africaine contre une armée coloniale européenne. Cette victoire inspira toute l'Afrique et préserva l'indépendance de l'Éthiopie.",
    keyEvents: ["Samori Touré résiste héroïquement aux Français 1882-1898", "Menelik II bat l'Italie à Adoua 1896"],
    figures: ["Samori Touré (héros de la résistance)", "Menelik II (roi d'Éthiopie, vainqueur d'Adoua)", "Taytu Betul (impératrice stratège à la victoire d'Adoua — Éthiopie)", "Paul Robeson (chanteur, acteur, militant des droits civiques — États-Unis/New York)"] },

  { generation: 81, title: "Ahmadou Bamba — La Résistance Spirituelle", era: "Luttes pour la Liberté", icon: "🌙",
    content: "Cheikh Ahmadou Bamba fonda la Mouridiyya au Sénégal (1883) et résista pacifiquement à la colonisation française. Mohammed Abduh appela à la réforme islamique en Égypte (~1899). Marcus Garvey prôna la fierté noire (1914). Le mouvement de la Négritude naquit aux Antilles et à Paris.",
    keyEvents: ["Ahmadou Bamba fonde la Mouridiyya au Sénégal 1883", "Marcus Garvey prône la fierté noire 1914"],
    figures: ["Cheikh Ahmadou Bamba (résistance spirituelle)", "Marcus Garvey (panafricaniste)", "Muhammad Ahmad al-Mahdi (résistant soudanais contre les Britanniques — Soudan)", "Nana Asma'u (princesse savante, éducatrice des femmes — Nigeria/Sokoto)"] },

  { generation: 82, title: "W.E.B. Du Bois et le Mouvement pour les Droits", era: "Luttes pour la Liberté", icon: "✊",
    content: "W.E.B. Du Bois fonda la NAACP pour les droits civiques (1909). Sun Yat-sen fonda la République de Chine (1912). Gandhi dirigea la résistance non-violente contre l'Empire britannique. La Première Guerre mondiale mobilisa des soldats africains pour des empires qui leur déniaient leurs droits.",
    keyEvents: ["W.E.B. Du Bois fonde la NAACP 1909", "Gandhi dirige la résistance non-violente en Inde"],
    figures: ["W.E.B. Du Bois (intellectuel et militant)", "Gandhi (pionnier de la non-violence)", "Sojourner Truth (ancienne esclave, militante féministe pionnière — États-Unis)", "Booker T. Washington (éducateur, fondateur de Tuskegee, leader noir — États-Unis)"] },

  { generation: 83, title: "Les Indépendances Asiatiques", era: "Indépendances", icon: "🌏",
    content: "Atatürk fonda la Turquie moderne (1923). Ho Chi Minh résista au colonialisme. Ahmed Ben Bella conduisit l'Algérie à l'indépendance (1962). Jawaharlal Nehru dirigea l'Inde indépendante (1947). La Conférence de Bandung (1955) proclama le droit de tous les peuples à l'autodétermination.",
    keyEvents: ["Atatürk fonde la Turquie moderne 1923", "Conférence de Bandung, droit à l'autodétermination 1955"],
    figures: ["Atatürk (père de la Turquie moderne)", "Ho Chi Minh (résistant vietnamien)", "Ahmed Ben Bella (premier président algérien, libérateur — Algérie)", "Sylvia Pankhurst (suffragette, militante panafricaine — Angleterre)"] },

  { generation: 84, title: "Fanon, Nyerere et les Architectes Africains", era: "Indépendances", icon: "🏗️",
    content: "Frantz Fanon publia Les Damnés de la Terre, bible de la décolonisation (1961). Julius Nyerere fonda la Tanzanie sur les principes du ujamaa (solidarité) (1964). Félix Houphouët-Boigny bâtit la Côte d'Ivoire. Ces leaders construisirent des États africains à partir des ruines de la colonisation.",
    keyEvents: ["Fanon publie Les Damnés de la Terre 1961", "Julius Nyerere fonde la Tanzanie et le ujamaa 1964"],
    figures: ["Frantz Fanon (théoricien de la décolonisation)", "Julius Nyerere (père de la Tanzanie)", "Léon-Gontran Damas (poète de la Négritude, 'Pigments' — Guyane française)", "Che Guevara (révolutionnaire latino-américain, symbole mondial de résistance — Argentine/Cuba)"] },

  { generation: 85, title: "Senghor et les Arts Africains Universels", era: "Luttes pour la Dignité", icon: "🎨",
    content: "Senghor fut le premier Africain à l'Académie française (1983). Sembène Ousmane créa Xala, satire sociale africaine (1975). Seydou Keïta et Malick Sidibé immortalisèrent l'Afrique par la photographie. Le Festival Mondial des Arts Nègres à Dakar (1966) célébra la grandeur artistique africaine.",
    keyEvents: ["Festival Mondial des Arts Nègres, Dakar 1966", "Senghor représente l'Afrique à l'Académie française 1983"],
    figures: ["Léopold Sédar Senghor (poète et président)", "Seydou Keïta (photographe de l'Afrique)", "Miriam Makeba (Mama Africa, voix contre l'apartheid — Afrique du Sud/Guinée)", "Lorraine Hansberry (dramaturge afro-américaine, A Raisin in the Sun — États-Unis)"] },

  { generation: 86, title: "Youssou N'Dour et la Musique Africaine Mondiale", era: "Luttes pour la Dignité", icon: "🎶",
    content: "Youssou N'Dour chanta la gloire de l'Afrique au monde entier (1977-). Fela Kuti inventa l'Afrobeat et dénonça l'injustice musicalement (1970-). Miriam Makeba, voix de l'Afrique contre l'apartheid, porta le combat de son peuple sur les scènes du monde. La musique africaine fut reconnue patrimoine mondial par l'UNESCO.",
    keyEvents: ["Youssou N'Dour chante pour l'Afrique au monde entier", "Fela Kuti invente l'Afrobeat, musique de résistance"],
    figures: ["Youssou N'Dour (voix de l'Afrique)", "Fela Kuti (créateur de l'Afrobeat)", "Salif Keita (voix d'or de la Mandingue, albinos-roi — Mali/Guinée)", "Nina Simone (voix des droits civiques, 'prêtresse du soul' — États-Unis)"] },

  { generation: 87, title: "Sékou Touré et la Construction de la Guinée", era: "Indépendances", icon: "🇬🇳",
    content: "Ahmed Sékou Touré dirigea la Guinée indépendante de 1958 à 1984. Modibo Keïta fut le premier président du Mali. Indira Gandhi devint la première femme Premier ministre de l'Inde (1966). Ces leaders de la première heure de l'indépendance durent construire des États neufs dans un contexte international difficile.",
    keyEvents: ["Sékou Touré dirige la Guinée indépendante 1958-1984", "Indira Gandhi, première femme Premier ministre d'Inde 1966"],
    figures: ["Sékou Touré (père de l'indépendance guinéenne)", "Modibo Keïta (premier président du Mali)", "Indira Gandhi (première femme Premier ministre de l'Inde — Inde)", "Bob Marley (ambassadeur du reggae et de la liberté — Jamaïque/monde entier)"] },

  { generation: 88, title: "Mandela et la Réconciliation en Afrique du Sud", era: "Luttes pour la Dignité", icon: "🌈",
    content: "Nelson Mandela libéré et élu président d'Afrique du Sud (1990-1994). Desmond Tutu guida la Commission Vérité et Réconciliation. Walter Sisulu et Oliver Tambo furent les piliers de l'ANC. La fin de l'apartheid en 1994 fut une victoire universelle de la dignité humaine et du pardon.",
    keyEvents: ["Mandela libéré et élu président 1990-1994", "Commission Vérité et Réconciliation en Afrique du Sud"],
    figures: ["Nelson Mandela (président réconciliateur)", "Desmond Tutu (Commission Vérité et Réconciliation)", "Oliver Tambo (pilier de l'ANC, diplomate de la libération — Afrique du Sud)", "Winnie Mandela (militante inébranlable pour la libération — Afrique du Sud)"] },

  { generation: 89, title: "Soyinka, Achebe — La Littérature Africaine Universelle", era: "Luttes pour la Dignité", icon: "📖",
    content: "Wole Soyinka reçut le premier prix Nobel africain de littérature (1986). Chinua Achebe publia Things Fall Apart, traduit en 50 langues. Ngugi wa Thiong'o écrivit en kikuyu, langue africaine. Aminata Sow Fall, romancière sénégalaise universelle. L'Afrique prouvait sa richesse littéraire et intellectuelle.",
    keyEvents: ["Wole Soyinka reçoit le prix Nobel de littérature 1986", "Chinua Achebe, Things Fall Apart lu dans le monde entier"],
    figures: ["Wole Soyinka (premier Nobel africain de littérature)", "Chinua Achebe (romancier universel)", "Ngugi wa Thiong'o (romancier en kikuyu, décolonisation culturelle — Kenya)", "Derek Walcott (poète des Caraïbes, prix Nobel de littérature — Sainte-Lucie/Trinidad)"] },

  { generation: 90, title: "Kofi Annan et la Diplomatie Africaine", era: "Luttes pour la Dignité", icon: "🌍",
    content: "Kofi Annan guida l'ONU vers la paix et le développement (1997-2006). Ellen Johnson Sirleaf fut la première femme présidente africaine (2006). Wangari Maathai reçut le prix Nobel de la paix pour son action écologique (2004). Ces figures africaines à la tête des institutions mondiales symbolisèrent l'émergence d'une Afrique influente.",
    keyEvents: ["Kofi Annan guide l'ONU 1997-2006", "Wangari Maathai prix Nobel de la paix pour l'écologie 2004"],
    figures: ["Kofi Annan (secrétaire général de l'ONU)", "Ellen Johnson Sirleaf (première présidente africaine)", "Wangari Maathai (écologiste, 30 millions d'arbres, prix Nobel — Kenya)", "Mo Ibrahim (entrepreneur soudanais, fondation de la bonne gouvernance africaine — Soudan/Angleterre)"] },

  { generation: 91, title: "Obama, Adichie et la Génération Connectée", era: "Ère Numérique", icon: "💻",
    content: "Barack Obama élu premier président afro-américain (2008). Chimamanda Adichie publia Americanah, roman universel (2013). Ngozi Okonjo-Iweala fut nommée directrice de l'OMC (2021). Aliko Dangote devint le premier entrepreneur africain milliardaire. La génération africaine connectée prenait sa place dans le monde.",
    keyEvents: ["Barack Obama élu premier président afro-américain 2008", "Chimamanda Adichie publie Americanah 2013"],
    figures: ["Barack Obama (premier président afro-américain)", "Chimamanda Adichie (romancière féministe)", "Aliko Dangote (premier entrepreneur africain milliardaire — Nigeria)", "Arundhati Roy (auteure et militante écologiste et sociale — Inde)"] },

  { generation: 92, title: "L'Afrobeats Domine les Charts Mondiaux", era: "Présent", icon: "🎤",
    content: "Burna Boy remporta le Grammy Award (2021). Wizkid et Beyoncé collaborèrent sur l'album Lion King (2019). Kylian Mbappé fut champion du monde à 19 ans (2018). Timnit Gebru alerta sur les biais dans l'intelligence artificielle (2020). La culture africaine rayonnait comme jamais auparavant dans le monde.",
    keyEvents: ["Burna Boy remporte le Grammy Award 2021", "Kylian Mbappé champion du monde à 19 ans 2018"],
    figures: ["Burna Boy (artiste mondial)", "Timnit Gebru (chercheuse en IA éthique)", "Wizkid (roi de l'Afrobeats mondial, Made in Lagos — Nigeria)", "Chadwick Boseman (acteur, Black Panther, icône de la dignité africaine — États-Unis)"] },

  { generation: 93, title: "L'Intelligence Artificielle et le Défi Climatique", era: "Présent", icon: "🤖",
    content: "L'intelligence artificielle générative révolutionna le monde en 2023. Greta Thunberg lança Fridays for Future (2018). Simone Biles s'imposa comme athlète olympique universelle. Maryam Mirzakhani fut la première femme à recevoir la Médaille Fields (2014). Ces figures définissent les enjeux de notre époque.",
    keyEvents: ["IA générative révolutionne le monde 2023", "Greta Thunberg lance Fridays for Future 2018"],
    figures: ["Maryam Mirzakhani (première Médaille Fields féminine)", "Greta Thunberg (militante climatique)", "Geoffrey Hinton (père de l'intelligence artificielle moderne — Canada/Angleterre)", "Stéphane Hessel (diplomate, auteur d'Indignez-vous, résistant — France/Allemagne)"] },

  { generation: 94, title: "L'Union Africaine et la Renaissance Panafricaine", era: "Présent", icon: "🤝",
    content: "L'Union Africaine fut intégrée au G20 en 2023 — reconnaissance que l'Afrique doit compter dans les décisions mondiales. L'agenda 2063 'L'Afrique que nous voulons' trace une vision de prospérité et de paix. Davido, Yemi Alade, Fatoumata Diawara portent la culture africaine aux quatre coins du globe.",
    keyEvents: ["Union Africaine intégrée au G20 2023", "Agenda 2063 : L'Afrique que nous voulons"],
    figures: ["Ngozi Okonjo-Iweala (à l'OMC)", "Fatoumata Diawara (voix africaine mondiale)", "Paul Kagame (bâtisseur du Rwanda moderne, modèle de renaissance — Rwanda)", "Lupita Nyong'o (actrice primée, ambassadrice de la dignité africaine — Kenya/Mexique)"] },

  { generation: 95, title: "Moftal — Une Seule Humanité", era: "Présent", icon: "🌍",
    content: "Nous sommes tous les enfants d'Adam et Hawa — une seule humanité, diverse dans ses cultures, unie dans son origine. De la première famille qui marcha sur cette terre aux milliards d'êtres humains d'aujourd'hui, le fil est ininterrompu. Chaque génération reçoit l'héritage de celles qui l'ont précédée et a la responsabilité de le transmettre enrichi. Notre défi : construire un monde de justice, de paix et de dignité.",
    keyEvents: ["L'Afrique continent de l'avenir — 1,4 milliard d'habitants", "Votre génération écrit son propre chapitre"],
    figures: ["Toutes les femmes et hommes de bonne volonté", "Les enfants d'Adam de chaque nation", "La jeunesse africaine — avenir de l'humanité (continent africain)"] },
];

const sectionIcons: Record<string, string> = {
  naissance: '👶', jeunesse: '🌱', mariage: '💍',
  revelation: '✨', persecution: '🛡️', unification: '🏆', heritage: '📜'
};

export default function HistoireHumanite({ estAbonne = true }: { estAbonne?: boolean }) {
  const [stories, setStories] = useState<PublishedStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedGeneration, setSelectedGeneration] = useState('all');
  const [stats, setStats] = useState<any>(null);
  const [currentUserNumeroH, setCurrentUserNumeroH] = useState<string | null>(null);
  const [narrateurContact, setNarrateurContact] = useState('');
  const [narrateurContactSave, setNarrateurContactSave] = useState('');
  const [narrateurSaving, setNarrateurSaving] = useState(false);
  const [narrateurMsg, setNarrateurMsg] = useState('');
  const [showNarrateurForm, setShowNarrateurForm] = useState(false);
  const [testifyingId, setTestifyingId] = useState<number | null>(null);
  const [selectedStory, setSelectedStory] = useState<PublishedStory | null>(null);
  const [selectedHistorical, setSelectedHistorical] = useState<HistoricalEntry | null>(null);
  const [jumpInput, setJumpInput] = useState('');
  const [highlightedGen, setHighlightedGen] = useState<number | null>(null);
  const [expandedGens, setExpandedGens] = useState<Set<number>>(new Set());
  const [expandedBookSections, setExpandedBookSections] = useState<Set<string>>(new Set());
  const [witnessesVisible, setWitnessesVisible] = useState<Set<string>>(new Set());
  const genRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const navigate = useNavigate();

  const sections = [
    { id: 'all', title: 'Toutes les sections', icon: '📚' },
    { id: 'naissance', title: 'Naissance et Enfance', icon: '👶' },
    { id: 'jeunesse', title: 'Jeunesse et Apprentissage', icon: '🌱' },
    { id: 'mariage', title: 'Union et Engagement', icon: '💍' },
    { id: 'revelation', title: 'Réalisation et Mission', icon: '✨' },
    { id: 'persecution', title: 'Épreuves et Résilience', icon: '🛡️' },
    { id: 'unification', title: 'Réalisation et Unification', icon: '🏆' },
    { id: 'heritage', title: 'Héritage et Transmission', icon: '📜' }
  ];

  const mediaSrc = (url: string) =>
    url.startsWith('data:') || url.startsWith('http')
      ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:5002'}${url}`;

  useEffect(() => {
    const session = localStorage.getItem("session_user");
    if (session) {
      try {
        const parsed = JSON.parse(session);
        const user = parsed.userData || parsed;
        if (user?.numeroH) {
          setCurrentUserNumeroH(user.numeroH);
          // Charger le numéro narrateur
          const token = localStorage.getItem('token') || parsed.token;
          if (token) {
            fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002'}/api/user-stories/mon-contact-narrateur`, {
              headers: { Authorization: `Bearer ${token}` }
            }).then(r => r.json()).then(d => {
              if (d.success && d.contact) { setNarrateurContact(d.contact); setNarrateurContactSave(d.contact); }
            }).catch(() => {});
          }
        }
      } catch {}
    }
    loadStories();
    loadStats();
  }, [selectedSection, selectedGeneration, searchTerm]);

  const loadStories = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSection !== 'all') params.append('sectionId', selectedSection);
      if (selectedGeneration !== 'all') params.append('generation', selectedGeneration);
      if (searchTerm) params.append('search', searchTerm);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002'}/api/user-stories/published?${params}`);
      if (res.ok) { const d = await res.json(); setStories(d.stories || []); }
    } catch {}
    finally { setLoading(false); }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002'}/api/user-stories/published/stats`);
      if (res.ok) { const d = await res.json(); setStats(d.stats); }
    } catch {}
  };

  const handleTestify = async (storyId: number) => {
    if (!currentUserNumeroH) { navigate('/login'); return; }
    setTestifyingId(storyId);
    try {
      const session = localStorage.getItem("session_user");
      const token = session ? JSON.parse(session).token : null;
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002'}/api/user-stories/testify/${storyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      if (res.ok) { toast.success('Témoignage enregistré !'); setStories(p => p.map(s => s.id === storyId ? { ...s, witnesses: data.witnesses } : s)); }
      else toast.error(data.message || 'Erreur');
    } catch { toast.error('Erreur de connexion'); }
    finally { setTestifyingId(null); }
  };

  const handleJump = () => {
    const n = parseInt(jumpInput, 10);
    if (isNaN(n) || n < 1 || n > 95) return;
    setHighlightedGen(n);
    setSelectedGeneration('all');
    setTimeout(() => {
      genRefs.current[n]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setHighlightedGen(null), 2500);
    }, 100);
  };

  const filteredStories = stories.filter(story => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return story.content.toLowerCase().includes(s) || story.authorName.toLowerCase().includes(s) || story.sectionTitle.toLowerCase().includes(s);
  });

  const filteredHistorical = HISTORICAL_DATA.filter(e => {
    if (selectedGeneration !== 'all' && `G${e.generation}` !== selectedGeneration) return false;
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return e.title.toLowerCase().includes(s) || e.content.toLowerCase().includes(s) || e.era.toLowerCase().includes(s);
  });

  const SECTION_ORDER = ['naissance','jeunesse','mariage','revelation','persecution','unification','heritage'];

  const storiesByAuthor = useMemo(() => {
    const byAuthor: Record<string, { authorName: string; authorPhoto: string | null; numeroH: string; bySection: Record<string, PublishedStory[]> }> = {};
    filteredStories.forEach(story => {
      if (!byAuthor[story.numeroH]) {
        byAuthor[story.numeroH] = { authorName: story.authorName, authorPhoto: story.authorPhoto || null, numeroH: story.numeroH, bySection: {} };
      }
      if (!byAuthor[story.numeroH].bySection[story.sectionId]) {
        byAuthor[story.numeroH].bySection[story.sectionId] = [];
      }
      byAuthor[story.numeroH].bySection[story.sectionId].push(story);
    });
    return Object.values(byAuthor);
  }, [filteredStories]);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const toggleBookSection = (key: string) => {
    setExpandedBookSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const sauvegarderContact = async () => {
    if (!narrateurContact.trim()) return;
    setNarrateurSaving(true);
    setNarrateurMsg('');
    try {
      const session = localStorage.getItem("session_user");
      const token = session ? (JSON.parse(session).token || localStorage.getItem('token')) : localStorage.getItem('token');
      const r = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002'}/api/user-stories/mon-contact-narrateur`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: narrateurContact }),
      });
      const d = await r.json();
      if (d.success) { setNarrateurContactSave(narrateurContact); setNarrateurMsg('✅ Numéro enregistré !'); setShowNarrateurForm(false); }
      else setNarrateurMsg(d.message || 'Erreur');
    } catch { setNarrateurMsg('Erreur de connexion'); }
    finally { setNarrateurSaving(false); }
  };

  const toggleWitnesses = (key: string) => {
    setWitnessesVisible(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleGen = (gen: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGens(prev => {
      const next = new Set(prev);
      next.has(gen) ? next.delete(gen) : next.add(gen);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8 flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">📚 Histoire de l'Humanité</h1>
              <p className="text-blue-100 text-lg">De la Génération 1 à aujourd'hui — 95 générations historiques + récits personnels</p>
              <div className="mt-3 flex gap-5 text-blue-100 flex-wrap">
                <span><strong className="text-2xl">95</strong> générations historiques</span>
                {stats && <span><strong className="text-2xl">{stats.totalStories}</strong> récits de membres</span>}
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => navigate('/a-retenir')}
                className="bg-white text-indigo-700 px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg text-sm">
                ✍️ Écrire mon histoire (G96)
              </button>
              <button onClick={() => navigate(-1)}
                className="bg-white text-indigo-700 px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-md text-sm border-2 border-white">
                ← Retour
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bloc Narrateur — numéro Orange Money pour paiement admin ── */}
      {currentUserNumeroH && (
        <div className="bg-indigo-900 border-b border-indigo-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-indigo-200 text-xs">📜 Narrateur Reci :</span>
              {narrateurContactSave ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-white bg-indigo-700 px-3 py-1 rounded-full">📞 {narrateurContactSave}</span>
                  <button onClick={() => setShowNarrateurForm(true)} className="text-indigo-300 hover:text-white text-xs underline">Modifier</button>
                </div>
              ) : (
                <button onClick={() => setShowNarrateurForm(true)}
                  className="text-xs text-amber-300 hover:text-amber-100 underline font-semibold">
                  + Laisser mon numéro pour être payé par l'admin
                </button>
              )}
              {showNarrateurForm && (
                <div className="flex items-center gap-2 ml-2">
                  <input type="tel" value={narrateurContact} onChange={e => setNarrateurContact(e.target.value)}
                    placeholder="Ex: 628000000"
                    className="text-xs px-3 py-1.5 rounded-lg bg-indigo-800 text-white border border-indigo-500 outline-none focus:border-amber-400 w-36" />
                  <button onClick={sauvegarderContact} disabled={narrateurSaving}
                    className="text-xs px-3 py-1.5 bg-amber-400 text-indigo-900 font-bold rounded-lg hover:bg-amber-300 disabled:opacity-50">
                    {narrateurSaving ? '...' : 'Enregistrer'}
                  </button>
                  <button onClick={() => setShowNarrateurForm(false)} className="text-indigo-400 hover:text-white text-xs">✕</button>
                </div>
              )}
              {narrateurMsg && <span className="text-xs text-green-300">{narrateurMsg}</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── Note G96 ── */}
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-amber-800 text-sm">
            <strong>📜 Générations 1–95 :</strong> leur histoire a été racontée par d'autres — historiens, traditions, transmetteurs.&nbsp;
            <strong>👤 Génération 96 :</strong> pour la première fois, chaque personne est l'auteur de sa propre histoire — utilisez le bouton <em>"Écrire mon histoire"</em> ci-dessus.
          </p>
        </div>
      </div>

      {/* ── Filtres + Navigation ── */}
      <div className="bg-white shadow-md border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">

            {/* Recherche */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">🔍 Rechercher</label>
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Titre, époque, personnage..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>

            {/* Génération */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">👥 Génération</label>
              <select value={selectedGeneration} onChange={e => setSelectedGeneration(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm">
                <option value="all">Toutes les générations</option>
                {Array.from({ length: 95 }, (_, i) => i + 1).map(g => (
                  <option key={g} value={`G${g}`}>Génération {g}{g === 95 ? ' (premières histoires personnelles)' : ''}</option>
                ))}
                <option value="G96">Génération 96 (notre époque)</option>
              </select>
            </div>

            {/* Section (pour les récits membres) */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">📖 Section (récits membres)</label>
              <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm">
                {sections.map(s => <option key={s.id} value={s.id}>{s.icon} {s.title}</option>)}
              </select>
            </div>

            {/* Aller à la génération */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">⚡ Aller à la génération</label>
              <div className="flex gap-2">
                <input type="number" min={1} max={95} placeholder="1 – 95" value={jumpInput}
                  onChange={e => setJumpInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleJump()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
                <button onClick={handleJump}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-semibold text-sm whitespace-nowrap">
                  Voir
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Contenu principal ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

        {/* ══ SECTION PATRIMOINE HISTORIQUE ══ */}
        {filteredHistorical.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-px bg-amber-300"></div>
              <h2 className="text-lg font-bold text-amber-800 flex items-center gap-2 whitespace-nowrap">
                📜 Patrimoine Historique
                <span className="text-sm font-normal bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  {filteredHistorical.length} génération{filteredHistorical.length > 1 ? 's' : ''}
                </span>
              </h2>
              <div className="flex-1 h-px bg-amber-300"></div>
            </div>
            <p className="text-xs text-amber-700 mb-5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
              Contenu mis à disposition par la plateforme <strong>Moftal</strong>. Ces histoires couvrent l'humanité depuis Adam jusqu'à aujourd'hui, racontées par les historiens, les traditions et les transmetteurs de chaque époque.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredHistorical.map(entry => (
                <div
                  key={entry.generation}
                  ref={el => { genRefs.current[entry.generation] = el; }}
                  onClick={() => setSelectedHistorical(entry)}
                  className={`bg-white rounded-xl border-l-4 border-amber-500 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer p-5 flex flex-col ${highlightedGen === entry.generation ? 'ring-2 ring-amber-500 ring-offset-2 shadow-lg scale-[1.02]' : ''}`}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">G{entry.generation}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{entry.era}</span>
                    </div>
                    <span className="text-2xl">{entry.icon}</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-gray-900 mb-1 leading-snug">{entry.title}</h3>
                  <p className="text-xs text-gray-400 mb-3">{getGenPeriod(entry.generation)}</p>

                  {/* Description courte */}
                  <p className={`text-gray-600 text-sm mb-4 flex-1 ${expandedGens.has(entry.generation) ? '' : 'line-clamp-3'}`}>{entry.content}</p>

                  {/* Événements & figures */}
                  <div className="space-y-1 border-t border-gray-100 pt-3">
                    {(expandedGens.has(entry.generation) ? entry.keyEvents : entry.keyEvents.slice(0, 2)).map((ev, i) => (
                      <p key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                        <span>📅</span><span className={expandedGens.has(entry.generation) ? '' : 'line-clamp-1'}>{ev}</span>
                      </p>
                    ))}
                    {(expandedGens.has(entry.generation) ? entry.figures : entry.figures.slice(0, 1)).map((fig, i) => (
                      <p key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                        <span>👑</span><span className={expandedGens.has(entry.generation) ? '' : 'line-clamp-1'}>{fig}</span>
                      </p>
                    ))}
                    <button
                      onClick={e => toggleGen(entry.generation, e)}
                      className="mt-2 text-xs text-amber-600 hover:text-amber-800 font-semibold flex items-center gap-1"
                    >
                      {expandedGens.has(entry.generation) ? '▲ Voir moins' : '▼ Voir plus'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══ SECTION RÉCITS PERSONNELS ══ */}
        <section>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-px bg-indigo-300"></div>
            <h2 className="text-lg font-bold text-indigo-800 flex items-center gap-2 whitespace-nowrap">
              📖 Récits Personnels — Nos Membres Racontent Leur Vie
              {!estAbonne && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">🔒 Abonnement requis</span>}
              {!loading && (
                <span className="text-sm font-normal bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  {filteredStories.length} récit{filteredStories.length > 1 ? 's' : ''}
                </span>
              )}
            </h2>
            <div className="flex-1 h-px bg-indigo-300"></div>
          </div>
          <p className="text-xs text-indigo-700 mb-5 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2">
            Chaque membre de la plateforme raconte <strong>sa propre vie</strong> — son histoire personnelle, sa famille, ses épreuves et ses joies.
          </p>

          {!estAbonne ? (
            /* ── Paywall récits ── */
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-8 text-center">
              <div className="text-5xl mb-3">🔒</div>
              <h3 className="font-black text-lg text-amber-900 mb-2">Lisez les récits de nos membres</h3>
              <p className="text-sm text-amber-700 mb-5 leading-relaxed">
                Des centaines de membres ont partagé leur vie ici. Abonnez-vous pour lire leurs témoignages, leurs joies et leurs épreuves.
              </p>
              <div className="rounded-xl bg-white border border-amber-200 px-4 py-3 mb-5 inline-block">
                <p className="font-black text-xl text-amber-900">{stats?.totalStories || 0} récits disponibles</p>
                <p className="text-xs text-amber-600">Accès annuel · paiement unique</p>
              </div>
              <br />
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-xl font-black text-white text-sm"
                style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}
              >
                📜 S'abonner pour lire les récits
              </button>
              <p className="text-xs text-amber-500 mt-3">Vous pouvez quand même publier votre propre récit librement ✍️</p>
            </div>
          ) : loading ? (
            <div className="text-center py-12 text-gray-500">Chargement des récits...</div>
          ) : filteredStories.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-indigo-100">
              <div className="text-5xl mb-3">✍️</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {selectedGeneration !== 'all'
                  ? `Aucun membre n'a encore partagé son récit pour ${selectedGeneration}`
                  : 'Aucun récit de membre trouvé'}
              </h3>
              <p className="text-gray-500 mb-5 text-sm">Soyez le premier à raconter votre propre vie !</p>
              <button onClick={() => navigate('/a-retenir')}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700">
                ✍️ Écrire mon histoire
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {storiesByAuthor.map(author => (
                <div key={author.numeroH} className="bg-white rounded-2xl shadow-md border border-indigo-100 overflow-hidden">

                  {/* ── En-tête du livre (photo + nom + NumeroH) ── */}
                  <div className="bg-gradient-to-r from-indigo-700 to-blue-600 p-5 flex items-center gap-4">
                    {author.authorPhoto
                      ? <img src={author.authorPhoto} alt={author.authorName} className="w-14 h-14 rounded-full object-cover border-2 border-white/60 flex-shrink-0 shadow" />
                      : <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">{getInitials(author.authorName)}</div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-lg leading-tight truncate">{author.authorName}</p>
                      <p className="text-indigo-200 text-sm font-mono mt-0.5">{hideIncrement(author.numeroH)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full">
                        📖 {Object.keys(author.bySection).length} section{Object.keys(author.bySection).length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* ── Sections du livre ── */}
                  <div className="divide-y divide-gray-100">
                    {[
                      ...SECTION_ORDER.filter(sid => author.bySection[sid]),
                      ...Object.keys(author.bySection).filter(sid => !SECTION_ORDER.includes(sid))
                    ].map(sid => {
                      const sectionStories = author.bySection[sid];
                      const firstStory = sectionStories[0];
                      const bookKey = `${author.numeroH}-${sid}`;
                      const isExpanded = expandedBookSections.has(bookKey);
                      return (
                        <div key={sid} className="p-4">
                          {/* Titre de section */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-lg">{sectionIcons[sid] || '📖'}</span>
                              <span className="font-semibold text-gray-800 text-sm">{firstStory.sectionTitle}</span>
                              {firstStory.generation && (
                                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{firstStory.generation}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Bouton témoins — toujours visible */}
                              <button
                                onClick={() => toggleWitnesses(bookKey)}
                                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-semibold transition-colors ${
                                  witnessesVisible.has(bookKey)
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : (firstStory.witnesses?.length || 0) >= 4
                                      ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                                      : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                }`}
                              >
                                🤝 {firstStory.witnesses?.length || 0}/4
                              </button>
                              <span className="text-xs text-gray-400">{new Date(firstStory.publishedAt).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </div>

                          {/* Mini-panel témoins — s'affiche au clic sans avoir besoin d'étendre */}
                          {witnessesVisible.has(bookKey) && (
                            <div className="mb-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">🤝 Témoins ({firstStory.witnesses?.length || 0}/4)</span>
                                {currentUserNumeroH && currentUserNumeroH !== firstStory.numeroH &&
                                  !(firstStory.witnesses || []).some(w => w.numeroH === currentUserNumeroH) &&
                                  (firstStory.witnesses?.length || 0) < 4 && (
                                    <button
                                      onClick={() => handleTestify(firstStory.id)}
                                      disabled={testifyingId === firstStory.id}
                                      className="px-2.5 py-1 bg-indigo-600 text-white text-xs rounded-full disabled:opacity-50 font-semibold hover:bg-indigo-700"
                                    >
                                      {testifyingId === firstStory.id ? '⏳' : '✋ Témoigner'}
                                    </button>
                                  )
                                }
                                {(firstStory.witnesses || []).some(w => w.numeroH === currentUserNumeroH) && (
                                  <span className="text-xs text-green-600 font-semibold">✅ Vous avez témoigné</span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-1.5">
                                {Array.from({ length: 4 }, (_, i) => {
                                  const w = (firstStory.witnesses || [])[i];
                                  return (
                                    <div key={i} className={`rounded-lg px-2 py-1.5 border text-xs flex items-center gap-1.5 ${w ? 'bg-white border-indigo-200' : 'bg-gray-50 border-dashed border-gray-200'}`}>
                                      {w ? (
                                        <>
                                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                                            {w.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-semibold text-indigo-900 truncate">{w.name}</p>
                                            {w.age && <p className="text-gray-400">{w.age} ans</p>}
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">?</div>
                                          <p className="text-gray-400 italic">Témoin {i + 1}</p>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Aperçu du contenu */}
                          <p className={`text-gray-700 text-sm leading-relaxed whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-2'}`}>
                            {firstStory.content}
                          </p>

                          {/* Médias (visibles seulement si développé) */}
                          {isExpanded && (
                            <>
                              {firstStory.photos && firstStory.photos.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                  {firstStory.photos.slice(0, 4).map((photo, i) => (
                                    <img key={i} src={mediaSrc(photo)} alt="" className="w-full h-28 object-cover rounded-lg cursor-pointer" onClick={() => setSelectedStory(firstStory)} />
                                  ))}
                                </div>
                              )}
                              {firstStory.videos && firstStory.videos.length > 0 && (
                                <div className="space-y-2 mt-3">
                                  {firstStory.videos.map((v, i) => <video key={i} src={mediaSrc(v)} controls className="w-full rounded-lg" />)}
                                </div>
                              )}

                            </>
                          )}

                          {/* Bouton Lire Plus */}
                          <button
                            onClick={() => toggleBookSection(bookKey)}
                            className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            {isExpanded ? '▲ Réduire' : '▼ Lire plus'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── MODAL PATRIMOINE HISTORIQUE ── */}
      {selectedHistorical && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setSelectedHistorical(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-amber-600 to-yellow-600 p-5 flex items-start justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedHistorical.icon}</span>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-bold bg-white/25 text-white px-2 py-0.5 rounded-full">G{selectedHistorical.generation}</span>
                    <span className="text-xs bg-white/20 text-white/90 px-2 py-0.5 rounded-full">{selectedHistorical.era}</span>
                    <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">📜 Patrimoine</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{selectedHistorical.title}</h2>
                  <p className="text-white/80 text-sm">{getGenPeriod(selectedHistorical.generation)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedHistorical(null)} className="text-white/70 hover:text-white text-2xl font-bold ml-4 flex-shrink-0">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              <p className="text-gray-800 leading-relaxed text-base">{selectedHistorical.content}</p>
              <div className="border-t border-amber-100 pt-4 space-y-2">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">📅 Événements clés</p>
                {selectedHistorical.keyEvents.map((ev, i) => <p key={i} className="text-sm text-gray-700 flex gap-2"><span>•</span>{ev}</p>)}
              </div>
              <div className="border-t border-amber-100 pt-4 space-y-2">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">👑 Figures importantes</p>
                {selectedHistorical.figures.map((fig, i) => <p key={i} className="text-sm text-gray-700 flex gap-2"><span>•</span>{fig}</p>)}
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-3 border-t border-amber-100 bg-amber-50 flex-shrink-0">
              <span className="text-sm text-amber-700 font-medium">🏛️ Moftal — Patrimoine Historique</span>
              <button onClick={() => setSelectedHistorical(null)} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL RÉCIT MEMBRE ── */}
      {selectedStory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setSelectedStory(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-5 flex items-start justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{sectionIcons[selectedStory.sectionId] || '📖'}</span>
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedStory.sectionTitle}</h2>
                  <p className="text-indigo-100 text-sm">📖 {selectedStory.authorName} raconte sa propre histoire{selectedStory.generation && ` • ${selectedStory.generation}`}</p>
                </div>
              </div>
              <button onClick={() => setSelectedStory(null)} className="text-white/70 hover:text-white text-2xl font-bold ml-4 flex-shrink-0">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{selectedStory.content}</p>
              {selectedStory.photos?.length > 0 && (
                <div><p className="text-xs font-semibold text-gray-500 uppercase mb-2">📷 Photos</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedStory.photos.map((p, i) => <img key={i} src={mediaSrc(p)} alt="" className="w-full h-40 object-cover rounded-xl" />)}
                  </div></div>
              )}
              {selectedStory.videos?.length > 0 && (
                <div><p className="text-xs font-semibold text-gray-500 uppercase mb-2">🎥 Vidéos</p>
                  {selectedStory.videos.map((v, i) => <video key={i} src={mediaSrc(v)} controls className="w-full rounded-xl mb-2" />)}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50 flex-shrink-0">
              <span className="text-sm text-gray-500">Publié le {new Date(selectedStory.publishedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <button onClick={() => setSelectedStory(null)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
