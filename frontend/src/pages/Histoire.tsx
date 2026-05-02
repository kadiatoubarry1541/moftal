import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  [key: string]: any;
}

interface Generation {
  id: number;
  name: string;
  startYear: number;
  endYear: number;
  period: string;
  description: string;
  keyEvents: string[];
  importantFigures: string[];
  culturalDevelopments: string[];
  religiousEvents: string[];
  scientificAdvances: string[];
  images?: string[];
  videos?: string[];
  documents?: string[];
}

export default function Histoire() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchGen, setSearchGen] = useState<string>('');
  const navigate = useNavigate();

  // Calculer les 96 générations depuis Adam (4004 av. J.-C.)
  useEffect(() => {
    const adamYear = -4004; // 4004 av. J.-C.
    const generationLength = 63;
    const calculatedGenerations: Generation[] = [];
    
    for (let gen = 1; gen <= 96; gen++) {
      const startYear = adamYear + (gen - 1) * generationLength;
      const endYear = startYear + generationLength - 1;
      
      calculatedGenerations.push({
        id: gen,
        name: `Génération ${gen}`,
        startYear: startYear,
        endYear: endYear,
        period: `${Math.abs(startYear)} ${startYear < 0 ? 'av. J.-C.' : 'ap. J.-C.'} - ${Math.abs(endYear)} ${endYear < 0 ? 'av. J.-C.' : 'ap. J.-C.'}`,
        description: getGenerationDescription(gen),
        keyEvents: getKeyEvents(gen),
        importantFigures: getImportantFigures(gen),
        culturalDevelopments: getCulturalDevelopments(gen),
        religiousEvents: getReligiousEvents(gen),
        scientificAdvances: getScientificAdvances(gen)
      });
    }
    
    setGenerations(calculatedGenerations);
    setLoading(false);
  }, []);

  useEffect(() => {
    const session = localStorage.getItem("session_user");
    if (!session) {
      navigate("/login");
      return;
    }

    try {
      const parsed = JSON.parse(session);
      const user = parsed.userData || parsed;
      if (!user || !user.numeroH) {
        navigate("/login");
        return;
      }
      
      setUserData(user);
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  const getGenerationDescription = (gen: number): string => {
    const desc: Record<number, string> = {
      1: "Adam et Ève, premiers êtres humains, ancêtres de toute l'humanité selon les traditions abrahamiques.",
      2: "Seth, fils d'Adam, continuateur de la lignée de lumière. Premières communautés humaines.",
      3: "Énosch, fils de Seth. Les hommes commencent à invoquer le nom de Dieu collectivement.",
      4: "Hénoch/Idris (Prophète), l'homme juste élevé vers les cieux. Premières techniques métallurgiques.",
      5: "Mathusalem, le plus sage et le plus long-vivant. Transmission de la connaissance adamique.",
      6: "Noé/Nuh (Prophète), constructeur de l'Arche, sauveur de l'humanité et des espèces vivantes.",
      7: "Sem, Cham, Japhet : les fils de Noé repeuplent la Terre. Dispersion des peuples aux quatre horizons.",
      8: "Nimrod et la Tour de Babel. Diversification des langues et naissance des premières cités-États.",
      9: "Abraham/Ibrahim (Prophète) naît à Ur des Chaldéens. Fondation de la foi monothéiste pure.",
      10: "Abraham, le Grand Patriarche : père des nations, fondateur de la Kaaba avec Ismaël.",
      11: "Ismaël/Ismail et Isaac/Ishaq (Prophètes). Naissance des grandes civilisations mésopotamiennes.",
      12: "Jacob/Yaqub (Prophète), père des douze tribus. Joseph/Yusuf, sage vizir d'Égypte.",
      13: "Moïse/Musa (Prophète) : la Torah et l'Exode d'Égypte. Ramsès II, pharaon bâtisseur.",
      14: "Josué conquiert Canaan. Déborah, première femme chef. Civilisation phénicienne et commerce méditerranéen.",
      15: "Samuel, Saül : établissement du royaume d'Israël. Imhotep, génie médical de l'Égypte ancienne.",
      16: "David/Dawud (Prophète), roi-poète, auteur des Psaumes. Jérusalem, capitale sacrée.",
      17: "Salomon/Sulayman (Prophète), le plus sage des rois. La Reine de Saba et son voyage légendaire.",
      18: "Élie/Ilyas (Prophète), défenseur du monothéisme. Grands empires assyriens et babyloniens.",
      19: "Isaïe, Jérémie, Ézéchiel : les prophètes littéraires d'Israël. Exil à Babylone.",
      20: "Cyrus le Grand libère les captifs. Daniel, sage de Babylone. La Perse achéménide.",
      21: "Zoroastre (Perse), Confucius (Chine), Bouddha (Inde) : l'Éveil spirituel mondial simultané.",
      22: "Pythagore (mathématiques), Solon (démocratie), Laozi (taoïsme), Mahavira (jaïnisme).",
      23: "Périclès et l'âge d'or d'Athènes. Le Parthénon. Hérodote, père de l'histoire.",
      24: "Socrate, père de la philosophie. Hippocrate, père de la médecine. Thucydide, historien critique.",
      25: "Platon fonde l'Académie. Aristote, philosophe universel. Alexandre le Grand unifie Orient et Occident.",
      26: "Archimède et Euclide révolutionnent les sciences. Ashoka, l'emperor bouddhiste de la paix en Inde.",
      27: "Rome à son apogée : César, Cicéron, Virgile. Cléopâtre VII, reine d'Égypte.",
      28: "Jésus-Christ/Isa (Prophète) : naissance, ministère et enseignements. Marie, mère vénérée.",
      29: "Expansion du christianisme. Paul de Tarse, Pierre apôtre. Premier siècle de l'Église.",
      30: "Marc Aurèle, emperor philosophe. Ptolémée, astronome. Galien, médecin universel.",
      31: "Plotin et le néoplatonisme. Zénobie, reine de Palmyre. Pères de l'Église en Afrique du Nord.",
      32: "Constantin Ier légalise le christianisme. Augustin d'Hippone (Algérie), géant de la théologie.",
      33: "Jérôme traduit la Bible. Hypatia d'Alexandrie, mathématicienne. Chute de Rome (476).",
      34: "Grandes migrations : Attila, Théodoric. Saint Patrick évangélise l'Irlande.",
      35: "Justinien Ier codifie le droit romain. Théodora, impératrice de grande influence.",
      36: "Grégoire le Grand réforme l'Église. Boèce, philosophe. Naissance de Muhammad (PBSL) à La Mecque (570).",
      37: "Muhammad (PBSL) reçoit la révélation (610). Hégire vers Médine (622). Fondation de l'Islam.",
      38: "Abu Bakr, Omar, Uthman, Ali : les premiers califes. Expansion de l'Islam de la Perse à l'Espagne.",
      39: "Hussein ibn Ali, martyr de Karbala. Aisha, grande savante. Premières sciences islamiques.",
      40: "Les Omeyyades : Al-Andalus naît. Tariq ibn Ziyad conquiert l'Espagne (711). Islam en Asie centrale.",
      41: "Omar ibn Abd al-Aziz, calife de justice. Jabir ibn Hayyan fonde la chimie. Charlemagne en Europe.",
      42: "Al-Khwarizmi invente l'algèbre. Haroun al-Rachid règne à Bagdad. Maison de la Sagesse fondée.",
      43: "Avicenne/Ibn Sina révolutionne la médecine mondiale. Al-Biruni calcule le rayon de la Terre.",
      44: "Al-Ghazali, philosophe soufi. Omar Khayyam, mathématicien-poète. Ibn al-Haytham, père de l'optique.",
      45: "Soundiata Keita fonde l'Empire du Mali (~1235). Croisades. Thomas d'Aquin et la scolastique.",
      46: "Saladin libère Jérusalem (1187). Averroès commente Aristote. Maïmonide, génie philosophique.",
      47: "Gengis Khan unifie les steppes. Marco Polo part en Chine. Rumi compose le Masnavi.",
      48: "Dante écrit La Divine Comédie. Ibn Battuta voyage partout. Mansa Musa, l'homme le plus riche.",
      49: "Ibn Khaldun fonde la sociologie. Timur Lenk. Hafez de Chiraz, poète mystique persan.",
      50: "Gutenberg invente l'imprimerie (1450). Léonard de Vinci, génie universel. Chute de Constantinople.",
      51: "Colomb atteint l'Amérique (1492). Michel-Ange crée la Sixtine. Vasco de Gama ouvre la route des Indes.",
      52: "Martin Luther lance la Réforme (1517). Copernic révolutionne l'astronomie. Érasme, humaniste.",
      53: "Galilée confirme l'héliocentrisme. Shakespeare écrit ses chefs-d'œuvre. Cervantes et Don Quichotte.",
      54: "Descartes fonde le rationalisme. Pascal, mathématicien-philosophe. Rembrandt peint la lumière.",
      55: "Newton formule la gravitation. Locke fonde le libéralisme. Voltaire, Rousseau, Montesquieu.",
      56: "Bach compose. Les Lumières illuminent l'Europe. Fondation des États-Unis. Toussaint Louverture.",
      57: "Napoléon réforme l'Europe. Beethoven et Mozart, géants de la musique. Tipu Sultan résiste.",
      58: "Bolívar libère l'Amérique latine. Shaka Zulu, roi guerrier. Usman dan Fodio réforme l'Islam.",
      59: "Victor Hugo écrit Les Misérables. El Hadj Oumar Tall résiste. Alexandre Dumas et Dickens.",
      60: "Lincoln abolit l'esclavage. Pasteur et Darwin révolutionnent les sciences. Harriet Tubman libère.",
      61: "Samori Touré résiste héroïquement à la colonisation. Edison, Tesla, Marie Curie : ère de l'électricité.",
      62: "Einstein et la relativité. Gandhi, non-violence. Cheikh Amadou Bamba fonde le mouridisme.",
      63: "Sékou Touré, Nkrumah, Senghor, Lumumba : l'Afrique proclame son indépendance.",
      64: "Martin Luther King, Nelson Mandela, Fanon : lutte pour la dignité et les droits civiques.",
      65: "Thomas Sankara révolutionne le Burkina Faso. Wangari Maathai plante des millions d'arbres.",
      66: "Mandela libéré (1990). Desmond Tutu, prix Nobel. Wole Soyinka, premier Nobel africain de littérature.",
      67: "Amadou Hampâté Bâ préserve la tradition orale. Sembène Ousmane crée le cinéma africain.",
      68: "Tim Berners-Lee invente le Web (1991). Mae Jemison, première femme noire dans l'espace.",
      69: "Barack Obama, premier président américain d'origine africaine (2008). Malala défend l'éducation.",
      70: "Maryam Mirzakhani, première femme Médaille Fields. Simone Biles, athlète universelle.",
      71: "Afrobeats conquiert le monde : Burna Boy, Wizkid, Davido, Angélique Kidjo.",
      72: "Littérature africaine universelle : Leïla Slimani, Chimamanda Adichie. Féminisme africain.",
      73: "IA et éthique : Timnit Gebru. Kylian Mbappé, champion du monde. Innovation africaine.",
      74: "Mobilisation climatique de la jeunesse mondiale. COVID-19 et résilience collective.",
      75: "Startups africaines, tech africaine. Ngozi Okonjo-Iweala à l'OMC. Renaissance panafricaine.",
      76: "Génération digitale africaine. Entrepreneuriat, créativité, sciences.",
      77: "Jeunesse africaine moteur de changement. Institutions démocratiques renforcées.",
      78: "Premières générations post-indépendance. Figures fondatrices des nations africaines.",
      79: "Résistants africains du XIXe siècle : savants, rois, imams, guerriers de la dignité.",
      80: "Samori Touré, Menelik II, Bai Bureh : derniers grands résistants avant l'indépendance.",
      81: "Réformateurs islamiques d'Afrique de l'Ouest. Mouridisme, Tijaniyya, Qadiriyya.",
      82: "Panafrikanisme naissant : Marcus Garvey, Du Bois. Révolutions asiatiques et africaines.",
      83: "Anticolonialisme mondial : Ho Chi Minh, Gandhi, Atatürk, Ben Bella.",
      84: "Fanon, Cabral, Nyerere, Kenyatta : architectes des nations africaines libres.",
      85: "Négritude et arts africains : Senghor, Césaire, Sembène, Seydou Keïta.",
      86: "Musiques africaines qui ont nourri le monde : kora, djembé, griots, Afrobeat.",
      87: "Grandes figures qui ont bâti les États africains modernes après l'indépendance.",
      88: "Mandela, Tutu, Biko, Tambo : la lutte pour la dignité en Afrique du Sud.",
      89: "Littérature africaine universelle : Soyinka, Achebe, Ngugi, Cheikh Anta Diop.",
      90: "Diplomatie africaine : Kofi Annan, Wangari Maathai, Ellen Johnson Sirleaf.",
      91: "Obama, Malala, Adichie, Dangote : figures africaines et africaines-américaines de notre temps.",
      92: "Artistes africains mondiaux : Burna Boy, Wizkid, Mbappé, Timnit Gebru.",
      93: "Mathématiciens et scientifiques de notre époque. Greta Thunberg et la cause climatique.",
      94: "Davido, Yemi Alade, Fatoumata Diawara, Stromae : la culture africaine rayonne sur tous les continents.",
      95: "Votre génération. C'est ici que vous écrivez votre propre chapitre dans l'Histoire de l'Humanité.",
      96: "La génération d'aujourd'hui. Partagez votre histoire pour les générations futures."
    };
    return desc[gen] || "Période de développement et de rayonnement de l'humanité.";
  };

  const getKeyEvents = (gen: number): string[] => {
    const eventsMap: Record<number, string[]> = {
      1:  ["Création d'Adam et Ève", "Naissance de Seth, Abel et Caïn", "Fondation de la première famille humaine", "Premiers enseignements divins"],
      2:  ["Énosch invoque le nom de Dieu", "Premières communautés humaines", "Développement de l'agriculture et de l'élevage"],
      3:  ["Kenan et Méhaléel, patriarches sages", "Transmission de la connaissance originelle", "Premières formes de calendrier lunaire"],
      4:  ["Hénoch/Idris (Prophète) élevé vers le ciel", "Mathusalem vit 969 ans, symbole de sagesse", "Invention des premiers outils en métal"],
      5:  ["Noé/Nuh commence à recevoir la révélation divine", "Lamech père de Noé", "Tubal-Caïn invente la forge, Jubal la musique"],
      6:  ["Révélation à Noé/Nuh (Prophète)", "Construction de l'Arche", "Le Grand Déluge", "Noé sauve l'humanité et les espèces"],
      7:  ["Sem, Cham, Japhet repeuplent la Terre", "Naissance des premières nations africaines (Cush)", "Fondation de l'Égypte (Misraïm)", "Dispersion des peuples aux quatre coins du monde"],
      8:  ["Construction de la Tour de Babel", "Diversification des langues humaines par Dieu", "Nimrod fonde Babylone et Ninive", "Premières cités-États en Mésopotamie (~3000 av. J.-C.)"],
      9:  ["Naissance d'Abraham à Ur des Chaldéens (~2166 av. J.-C.)", "Abraham brise les idoles, cherche la vérité divine", "Migration d'Abraham vers Canaan selon la parole de Dieu"],
      10: ["Alliance solennelle entre Dieu et Abraham", "Naissance d'Ismaël (~2080 av. J.-C.)", "Construction de la Kaaba par Abraham et Ismaël à La Mecque", "Naissance d'Isaac (~2066 av. J.-C.)"],
      11: ["Jacob/Yaqub reçoit le nom Israël", "Les 12 tribus d'Israël fondées", "Premières pyramides égyptiennes (~2560 av. J.-C.)", "Code de Hammurabi, première loi écrite (~1792 av. J.-C.)"],
      12: ["Joseph/Yusuf vizir d'Égypte, sauve les peuples de la famine", "Les Hébreux s'installent en Égypte", "Imhotep, génie médical et architectural de l'Égypte", "Apogée de l'Empire Moyen égyptien"],
      13: ["Moïse/Musa naît et reçoit la révélation au Sinaï", "L'Exode d'Égypte (~1446 av. J.-C.)", "Les 10 Commandements donnés à Moïse", "Ramsès II signe le premier traité de paix de l'histoire (Kadesh)"],
      14: ["Josué conduit Israël vers Canaan", "Déborah, première femme chef de guerre en Israël", "Civilisations phéniciennes et commerce méditerranéen", "Développement de l'alphabet phénicien (~1050 av. J.-C.)"],
      15: ["Samuel sacre Saül, premier roi d'Israël (~1020 av. J.-C.)", "Fondation de Carthage par les Phéniciens (~814 av. J.-C.)", "Commerce maritime phénicien jusqu'en Espagne", "Civilisation mycénienne en Grèce"],
      16: ["David roi d'Israël (~1010-970 av. J.-C.)", "Jérusalem proclamée capitale sainte", "Composition des Psaumes, poésie spirituelle universelle", "Guerres d'Israël et Philistins"],
      17: ["Salomon roi d'Israël (~970-931 av. J.-C.)", "Construction du premier Temple de Jérusalem", "La reine de Saba visite Salomon", "Commerce maritime de Salomon jusqu'à Ophir (Afrique)"],
      18: ["Élie défend le monothéisme face aux idoles", "Élisée accomplit des miracles de guérison", "Grands empires assyriens en expansion", "Division du royaume de Salomon en deux royaumes"],
      19: ["Isaïe prédit la venue d'un sauveur (~742 av. J.-C.)", "Jérémie appelle à la paix avec Babylone (~626 av. J.-C.)", "Chute de Jérusalem et destruction du Temple (587 av. J.-C.)", "Exil des Hébreux à Babylone"],
      20: ["Cyrus le Grand libère les Juifs de Babylone (538 av. J.-C.)", "Daniel sage et visionnaire à la cour de Babylone", "Reconstruction du Temple par Esdras et Néhémie", "Empire perse achéménide de l'Inde à l'Égypte"],
      21: ["Darius Ier codifie les lois de l'Empire perse (~522 av. J.-C.)", "Zoroastre enseigne la lumière contre les ténèbres", "Nabuchodonosor bâtit les Jardins suspendus de Babylone", "Prophètes mineurs d'Israël (Amos, Osée, Joël)"],
      22: ["Confucius enseigne la vertu et l'harmonie sociale (~551 av. J.-C.)", "Bouddha atteint l'Éveil sous l'arbre Bodhi (~528 av. J.-C.)", "Laozi écrit le Tao Te Ching", "Mahavira fonde le jaïnisme (~527 av. J.-C.)"],
      23: ["Solon d'Athènes instaure les premières lois démocratiques (594 av. J.-C.)", "Pythagore fonde sa communauté philosophique (~570 av. J.-C.)", "Sun Tzu écrit L'Art de la Guerre (~500 av. J.-C.)", "Guerres médiques : Marathon (490 av. J.-C.)"],
      24: ["Périclès dirige l'âge d'or d'Athènes (~495 av. J.-C.)", "Construction du Parthénon (~447 av. J.-C.)", "Sophocle et Eschyle écrivent les tragédies grecques", "Hérodote voyage et rédige les premières Histoires"],
      25: ["Socrate enseigne la philosophie dans les rues d'Athènes (~469 av. J.-C.)", "Hippocrate fonde la médecine scientifique (~460 av. J.-C.)", "Guerre du Péloponnèse (~431 av. J.-C.)", "Thucydide écrit l'histoire critique et rigoureuse"],
      26: ["Platon fonde l'Académie (~387 av. J.-C.)", "Aristote enseigne toutes les sciences à Alexandre", "Alexandre le Grand conquiert la Perse et l'Inde (~334 av. J.-C.)", "Fondation d'Alexandrie, futur centre du savoir (331 av. J.-C.)"],
      27: ["Ashoka, emperor de paix, diffuse le bouddhisme (~268 av. J.-C.)", "Archimède découvre la poussée et les leviers (~287 av. J.-C.)", "Euclide fonde la géométrie (~300 av. J.-C.)", "Bibliothèque d'Alexandrie fondée : premier centre mondial du savoir"],
      28: ["Jules César réforme Rome et ses lois (~100-44 av. J.-C.)", "Cléopâtre VII, dernière reine d'Égypte pharaonique (~51-30 av. J.-C.)", "Virgile écrit l'Énéide, épopée de Rome", "Rome devient Empire sous Auguste (~27 av. J.-C.)"],
      29: ["Naissance de Jésus-Christ/Isa (Prophète) (~6-4 av. J.-C.)", "Baptême de Jésus par Jean-Baptiste", "Sermon sur la montagne, enseignements universels", "Miracles et ministère de Jésus en Galilée et Judée"],
      30: ["Crucifixion et Résurrection de Jésus-Christ (~30 ap. J.-C.)", "Pentecôte et naissance de l'Église chrétienne", "Paul de Tarse diffuse l'Évangile aux nations du monde", "Destruction du Temple de Jérusalem par Titus (70 ap. J.-C.)"],
      31: ["Marc Aurèle, emperor philosophe, réfléchit à la sagesse (121-180)", "Ptolémée écrit l'Almageste, base de l'astronomie", "Galien révolutionne la médecine romaine (129-216)", "Expansion du christianisme dans tout l'Empire romain"],
      32: ["Origène d'Alexandrie, théologien géant (185-254)", "Plotin fonde le néoplatonisme (~205-270)", "Zénobie, reine de Palmyre, défi à Rome (~267-274)", "Diophante invente l'algèbre symbolique (~250)"],
      33: ["Édit de Milan : liberté religieuse pour les chrétiens (313)", "Concile de Nicée définit le Credo chrétien (325)", "Augustin d'Hippone naît en Algérie (354)", "Bible traduite en latin par Jérôme (Vulgate, ~382-405)"],
      34: ["Chute de Rome sous Alaric (410)", "Hypatia d'Alexandrie, mathématicienne, martyrisée (415)", "Augustin écrit La Cité de Dieu", "Chute définitive de l'Empire romain d'Occident (476)"],
      35: ["Attila dirige les Huns, rassembleur des steppes (~434-453)", "Saint Patrick évangélise l'Irlande (~432)", "Théodoric le Grand fonde le royaume ostrogoth en Italie", "Grande migration des peuples en Europe"],
      36: ["Justinien Ier codifie le droit romain (Code Justinien, 529)", "Théodora cofonde l'Empire byzantin avec Justinien", "Construction de Sainte-Sophie à Constantinople", "Diffusion du christianisme en Afrique sub-saharienne"],
      37: ["Grégoire le Grand réforme l'Église et crée la musique grégorienne (~590)", "Mahomet ibn Abdullah naît à La Mecque (~570)", "Boèce écrit La Consolation de la Philosophie (524)", "Naissance de l'Islam en préparation divine"],
      38: ["Muhammad (PBSL) reçoit la révélation coranique (610)", "Hégire de La Mecque à Médine, fondation de l'État islamique (622)", "Charte de Médine, premier accord de coexistence plurielle", "Unification de l'Arabie (630) et entrée pacifique à La Mecque"],
      39: ["Mort du Prophète (632) et Abu Bakr premier calife", "Omar ibn al-Khattab conquiert Jérusalem et la Perse (637)", "Uthman compile le Coran (644)", "Expansion de l'Islam de la Perse à l'Égypte et l'Espagne"],
      40: ["Ali ibn Abi Talib quatrième calife (656-661)", "Bataille de Karbala et martyre de Hussein (680)", "Aisha préserve et transmet la Sunna du Prophète", "Fondation des premières écoles islamiques (madrasas)"],
      41: ["Omar ibn Abd al-Aziz, calife de justice et de réforme (717-720)", "Tariq ibn Ziyad conquiert Al-Andalus (Espagne, 711)", "Al-Andalus, carrefour culturel de l'Europe et de l'Islam", "Première mosquée en Afrique de l'Ouest"],
      42: ["Fondation de Bagdad par les Abbassides (762)", "Haroun al-Rachid règne dans la splendeur (786-809)", "Jabir ibn Hayyan fonde la chimie expérimentale", "Charlemagne couronné Emperor d'Occident (800)"],
      43: ["Al-Khwarizmi invente l'algèbre et l'algorithmique (830)", "Maison de la Sagesse à Bagdad traduit les savoirs grecs et indiens", "Al-Kindi, premier philosophe arabe, traite de la musique et la médecine", "Al-Battani calcule les éclipses avec précision"],
      44: ["Ibn Sina écrit le Canon de la Médecine (1025), médecine mondiale", "Al-Biruni mesure la circonférence de la Terre et décrit l'Inde", "Empire du Ghana à son apogée en Afrique de l'Ouest", "Al-Razi fonde la médecine clinique (854-925)"],
      45: ["Al-Ghazali écrit La Revivification des sciences religieuses (1111)", "Omar Khayyam réforme le calendrier perse et écrit ses Rubaiyat", "Ibn al-Haytham révolutionne l'optique et la vision", "Croisades : premiers croisés arrivent en Terre Sainte (1096)"],
      46: ["Soundiata Keita fonde l'Empire du Mali (~1235)", "Thomas d'Aquin naît (1225), futur géant de la théologie", "Hildegard von Bingen compose sa musique et ses écrits médicaux", "Averroès commente Aristote et nourrit la pensée européenne"],
      47: ["Saladin libère Jérusalem (1187) avec noblesse et clémence", "Maïmonide écrit Le Guide des perplexes pour juifs et musulmans", "Fondation de l'Université de Paris (~1150)", "Richard Cœur de Lion et les Croisades"],
      48: ["Gengis Khan unifie les peuples des steppes et fonde l'Empire mongol (1206)", "Ibn al-Nafis découvre que le sang passe par les poumons (1242)", "Roger Bacon prône l'observation et l'expérience en science (~1240)", "Magna Carta en Angleterre, premiers droits fondamentaux (1215)"],
      49: ["Marco Polo voyage de Venise à la cour de Koubilaï Khan (1271-1295)", "Mansa Musa règne sur le Mali (1312-1337), plus riche homme de l'histoire", "Dante commence La Divine Comédie (1308)", "Bibliothèques de Tombouctou rassemblent des milliers de manuscrits africains"],
      50: ["Ibn Khaldun écrit la Muqaddima, fondation de la sociologie (1377)", "Askia Mohammed réforme l'Empire Songhaï et développe l'éducation (~1493)", "Hafez de Chiraz, poète mystique universel (~1325-1390)", "Timur Lenk réunifie l'Asie centrale (1370-1405)"],
      51: ["Gutenberg invente l'imprimerie à caractères mobiles (1450)", "Chute de Constantinople fin de l'Empire byzantin (1453)", "Léonard de Vinci naît (1452)", "Sunni Ali fonde l'Empire Songhaï (1464)"],
      52: ["Christophe Colomb atteint les Amériques (1492)", "Vasco de Gama ouvre la route maritime vers l'Inde (1498)", "Michel-Ange peint la Sixtine (1508-1512)", "Civilisations aztèque, maya et inca à leur apogée"],
      53: ["Martin Luther publie les 95 thèses (1517)", "Copernic publie son héliocentrisme (1543)", "Soliman le Magnifique règne sur l'Empire ottoman (1520-1566)", "Érasme diffuse l'humanisme en Europe (1511)"],
      54: ["Galilée observe les lunes de Jupiter avec son télescope (1610)", "Shakespeare écrit Hamlet, Macbeth, Roméo et Juliette (~1600)", "Cervantes publie Don Quichotte (1605)", "Compagnie des Indes orientales fondée, commerce mondial"],
      55: ["Descartes publie le Discours de la méthode (1637)", "Pascal invente la calculatrice (1642)", "Rembrandt peint La Ronde de nuit (1642)", "Kepler formule les lois du mouvement planétaire (1619)"],
      56: ["Newton publie les Principia Mathematica, base de la physique (1687)", "Locke publie ses Deux Traités du gouvernement civil (1689)", "Louis XIV bâtit Versailles, symbole de civilisation", "Leibniz invente le calcul infinitésimal indépendamment de Newton"],
      57: ["Bach compose la Messe en si mineur (~1749)", "Voltaire publie Candide (1759)", "Rousseau publie Du Contrat Social (1762)", "Montesquieu publie L'Esprit des Lois (1748)"],
      58: ["Déclaration d'Indépendance américaine (1776)", "Révolution française (1789)", "Toussaint Louverture libère Haïti : premier État noir libre (1804)", "Adam Smith fonde l'économie moderne (1776)"],
      59: ["Napoléon Bonaparte réforme le droit européen (Code civil, 1804)", "Beethoven compose la 9e Symphonie avec l'Ode à la Joie (1824)", "Tipu Sultan résiste aux Britanniques jusqu'à la mort (1799)", "Jean-Jacques Dessalines fonde Haïti (1804)"],
      60: ["Simón Bolívar libère 6 nations d'Amérique du Sud (1810-1825)", "Cheikh Usman dan Fodio réforme l'Islam au Sahel (1804)", "Shaka Zulu fonde le puissant royaume zoulou (~1816)", "Naissance du mouvement d'indépendance latino-américain"],
      61: ["El Hadj Oumar Tall fonde l'Empire toucouleur (1852-1864)", "Victor Hugo publie Les Misérables (1862)", "Révolutions de 1848 agitent l'Europe", "Fondation du Parti républicain américain (1854)"],
      62: ["Abraham Lincoln abolit l'esclavage aux États-Unis (1865)", "Louis Pasteur démontre que les microbes causent les maladies (1859)", "Darwin publie L'Origine des espèces (1859)", "Harriet Tubman guide des centaines d'esclaves vers la liberté"],
      63: ["Samori Touré résiste héroïquement à la colonisation (1882-1898)", "Mendeleïev présente le tableau périodique des éléments (1869)", "Conférence de Berlin partage l'Afrique entre puissances européennes (1884-1885)", "Ouverture du Canal de Suez (1869)"],
      64: ["Edison invente l'ampoule électrique et le phonographe (1879)", "Tesla invente le moteur à courant alternatif (1888)", "Marie Curie découvre le radium et le polonium (1898)", "Premiers films des frères Lumière (1895)"],
      65: ["Einstein publie la relativité restreinte (1905) et générale (1915)", "Gandhi dirige la résistance non-violente en Afrique du Sud (1906)", "Cheikh Amadou Bamba fonde le mouridisme au Sénégal", "Première Guerre mondiale (1914-1918)"],
      66: ["Cheikh Amadou Bamba résiste pacifiquement à la colonisation française", "Léopold Sédar Senghor fonde la négritude avec Aimé Césaire (~1934)", "Marcus Garvey lance le mouvement panafricain (1914)", "Mouvement de la Harlem Renaissance (1920-1930)"],
      67: ["Kwame Nkrumah libère le Ghana (premier pays d'Afrique noire, 1957)", "Patrice Lumumba premier ministre du Congo indépendant (1960)", "Gamal Abdel Nasser nationalise le Canal de Suez (1956)", "L'Année de l'Afrique : 17 pays indépendants (1960)"],
      68: ["Martin Luther King conduit la Marche sur Washington (1963)", "Nelson Mandela emprisonné (1964), symbole de résistance", "Frantz Fanon publie Les Damnés de la Terre (1961)", "Création de l'OUA, Organisation de l'Unité Africaine (1963)"],
      69: ["Ahmed Sékou Touré dit Non à De Gaulle, Guinée indépendante (1958)", "Thomas Sankara révolutionne le Burkina Faso (1983-1987)", "Wangari Maathai plante 30 millions d'arbres pour l'environnement", "Steve Biko fonde le mouvement de la conscience noire"],
      70: ["Nelson Mandela libéré après 27 ans de prison (1990)", "Desmond Tutu prix Nobel de la paix (1984)", "Fin de l'apartheid et premières élections libres en Afrique du Sud (1994)", "Kofi Annan devient secrétaire général de l'ONU (1997)"],
      71: ["Amadou Hampâté Bâ préserve les traditions orales africaines", "Sembène Ousmane crée le cinéma africain (1963)", "Diallo Telli, premier secrétaire général de l'OUA, Guinée", "Wole Soyinka reçoit le prix Nobel de littérature (1986)"],
      72: ["Tim Berners-Lee invente le World Wide Web (1991)", "Mae Jemison, première femme noire dans l'espace (1992)", "Nelson Mandela élu président d'Afrique du Sud (1994)", "Fin de la Guerre Froide et nouveau monde multipolaire"],
      73: ["Barack Obama élu 44e président américain (2008)", "Malala Yousafzai blessée au Pakistan, puis prix Nobel de la paix (2014)", "Ngozi Okonjo-Iweala nommée directrice de l'OMC (2021)", "Printemps arabe et mouvements de liberté (2011)"],
      74: ["Maryam Mirzakhani, première femme Médaille Fields (2014)", "COVID-19 : pandémie mondiale et résilience humaine (2020)", "Accord de Paris sur le Climat (2015)", "Simone Biles, gymnaste la plus titrée de l'histoire"],
      75: ["Afrobeats conquiert les charts mondiaux et les Grammy Awards (2021)", "Kylian Mbappé champion du monde avec la France (2018)", "Ngozi Okonjo-Iweala à la tête de l'OMC (2021)", "Renaissance culturelle africaine dans le monde entier"],
      76: ["Leïla Slimani remporte le prix Goncourt (2016)", "Fatoumata Diawara, voix africaine internationale (2011-)", "Mouvement #BlackLivesMatter : conscience mondiale (2020)", "Révolution numérique en Afrique : 500 millions de smartphones"],
      77: ["Transition politique en Guinée (2021)", "Entrepreneuriat africain : croissance des startups tech", "Mouvement panafricain de la nouvelle génération", "Renforcement des institutions démocratiques africaines"],
      78: ["Grands musiciens et artistes de Guinée rayonnent sur le monde", "Ballet Africain de Guinée, ambassadeur de la culture africaine", "Famoudou Konaté, maître du djembé reconnu mondialement", "Traditions musicales de Guinée classées par l'UNESCO"],
      79: ["El Hadj Oumar Tall réforme l'Islam en Afrique de l'Ouest (~1840)", "Alfa Yaya Diallo résiste à la colonisation française (~1900)", "Savants de Tombouctou préservent des milliers de manuscrits", "Résistances anticoloniales en Afrique de l'Ouest"],
      80: ["Samori Touré résiste héroïquement aux Français (1882-1898)", "Menelik II bat l'armée italienne à Adoua (1896)", "Bai Bureh mène la guerre de Hut-Hut en Sierra Leone (1898)", "Résistances africaines contre la colonisation européenne"],
      81: ["Cheikh Ahmadou Bamba, résistance spirituelle à la colonisation française", "Mohammed Abduh appelle à la réforme islamique en Égypte (~1899)", "Marcus Garvey prône le retour d'Afrique et la fierté noire (1914)", "Mouvement de la Négritude naît aux Antilles et à Paris"],
      82: ["W.E.B. Du Bois fonde la NAACP pour les droits civiques (1909)", "Sun Yat-sen fonde la République de Chine (1912)", "Gandhi dirige la résistance non-violente contre l'Empire britannique", "Première Guerre mondiale : l'Afrique sacrifiée pour les autres"],
      83: ["Atatürk fonde la Turquie moderne (1923)", "Ho Chi Minh résiste au colonialisme français puis américain", "Ahmed Ben Bella conduit l'Algérie à l'indépendance (1962)", "Jawaharlal Nehru dirige l'Inde indépendante (1947)"],
      84: ["Fanon publie Les Damnés de la Terre, bible de la décolonisation (1961)", "Julius Nyerere fonde la Tanzanie sur les principes du ujamaa (1964)", "Félix Houphouët-Boigny bâtit la Côte d'Ivoire (1960)", "Vague d'indépendances africaines (1960-1965)"],
      85: ["Senghor représente l'Afrique à l'Académie française (1983)", "Sembène Ousmane crée le film Xala, satire sociale africaine (1975)", "Seydou Keïta et Malick Sidibé immortalisent l'Afrique par la photo", "Arts africains exposés dans les grands musées du monde"],
      86: ["Youssou N'Dour chante la gloire de l'Afrique au monde entier (1977-)", "Fela Kuti invente l'Afrobeat et dénonce l'injustice musicalement (1970-)", "Miriam Makeba, voix de l'Afrique contre l'apartheid", "Musique africaine reconnue patrimoine mondial UNESCO"],
      87: ["Ahmed Sékou Touré dirige la Guinée indépendante (1958-1984)", "Modibo Keita, premier président du Mali socialiste (1960-1968)", "Sirimavo Bandaranaike, première femme Premier ministre (Sri Lanka, 1960)", "Indira Gandhi, première femme Premier ministre de l'Inde (1966)"],
      88: ["Nelson Mandela libéré et élu président d'Afrique du Sud (1990-1994)", "Desmond Tutu guide la Commission Vérité et Réconciliation", "Walter Sisulu et Oliver Tambo, piliers de l'ANC", "Fin de l'apartheid, victoire de la dignité humaine (1994)"],
      89: ["Wole Soyinka reçoit le premier prix Nobel africain de littérature (1986)", "Chinua Achebe publie Things Fall Apart, lu dans le monde entier", "Ngugi wa Thiong'o écrit en langue africaine (kikuyu)", "Aminata Sow Fall, romancière sénégalaise universelle"],
      90: ["Kofi Annan guide l'ONU vers la paix et le développement (1997-2006)", "Ellen Johnson Sirleaf, première femme présidente africaine (2006)", "Wangari Maathai prix Nobel de la paix, écologie africaine (2004)", "Abdoulaye Wade dirige le Sénégal vers la démocratie"],
      91: ["Barack Obama élu premier président afro-américain (2008)", "Chimamanda Adichie publie Americanah, roman universel (2013)", "Ngozi Okonjo-Iweala nommée directrice de l'OMC (2021)", "Aliko Dangote, premier entrepreneur africain milliardaire"],
      92: ["Burna Boy remporte le Grammy Award (2021)", "Wizkid et Beyoncé collaborent sur l'album Lion King (2019)", "Kylian Mbappé champion du monde à 19 ans (2018)", "Timnit Gebru alerte sur les biais dans l'intelligence artificielle (2020)"],
      93: ["Greta Thunberg lance le mouvement Fridays for Future (2018)", "Simone Biles s'impose comme athlète olympique universelle", "Maryam Mirzakhani, première Médaille Fields féminine (2014)", "Chadwick Boseman incarne Black Panther, fierté africaine (2018)"],
      94: ["Davido et Wizkid font rayonner l'Afrique aux Grammy Awards (2021-2023)", "Yemi Alade, première artiste africaine à 10 millions sur YouTube", "Fatoumata Diawara chante en français, bambara et anglais", "Angélique Kidjo reçoit son 4e Grammy Award (2021)"],
      95: ["C'est ici que commence votre récit personnel", "Votre génération fait partie de l'histoire vivante de l'humanité", "Partagez vos histoires pour les transmettre aux générations futures", "Chaque vie est un trésor inestimable pour l'humanité"],
      96: ["Vous êtes la 96e génération depuis Adam", "Votre vie est un chapitre vivant de l'Histoire de l'Humanité", "Écrivez votre histoire dès aujourd'hui", "Les Enfants d'Adam continuent la grande aventure humaine"]
    };
    return (eventsMap[gen] || ["Période de développement de l'humanité."]).slice(0, 5);
  };

  const getImportantFigures = (gen: number): string[] => {
    const figuresMap: Record<number, string[]> = {
      1:  ["Adam (Prophète, père de l'humanité)", "Ève (mère de l'humanité)", "Abel (fils d'Adam, symbole de bonté)", "Caïn (fils d'Adam)", "Seth (fils d'Adam, continuateur de la lignée de lumière)"],
      2:  ["Énosch/Enos (petit-fils d'Adam, premier à invoquer Dieu)", "Kenan (patriarche antédiluvien)"],
      3:  ["Méhaléel (patriarche)", "Jéred/Jared (père d'Énoch)"],
      4:  ["Hénoch/Idris (Prophète, élevé vivant vers le ciel)", "Mathusalem (le plus âgé et sage des hommes)", "Lamech (père de Noé)"],
      5:  ["Noé/Nuh (Prophète), préparation à l'Arche", "Tubal-Caïn (maître forgeron, inventeur des outils)", "Jubal (inventeur de la musique instrumentale)", "Naamah (fille de Lamech)"],
      6:  ["Noé/Nuh (Prophète, constructeur de l'Arche)", "Sem (fils aîné de Noé, ancêtre des Sémites)", "Cham (fils de Noé, ancêtre des peuples africains)", "Japhet (fils de Noé, ancêtre des peuples indo-européens)"],
      7:  ["Arpachschad (fils de Sem)", "Cush (père des peuples africains)", "Misraïm (père de l'Égypte)", "Canaan (père des Cananéens)", "Phut (père des Libyens)"],
      8:  ["Nimrod (roi de Babylone et fondateur de Ninive)", "Héber (ancêtre des Hébreux)", "Péleg (patriarche)", "Joqtan (ancêtre des Arabes du Sud)"],
      9:  ["Réhu (patriarche)", "Sirug (patriarche)", "Nahor (patriarche)", "Térach (père d'Abraham)", "Abraham/Ibrahim naît à Ur des Chaldéens"],
      10: ["Abraham/Ibrahim (Prophète, père des nations)", "Agar/Hajar (mère d'Ismaël, femme de courage)", "Ismaël/Ismail (Prophète, ancêtre des Arabes)", "Lot/Lût (Prophète, neveu d'Abraham)", "Sarah/Sara (mère d'Isaac)"],
      11: ["Isaac/Ishaq (Prophète)", "Rébecca (matriarche sage)", "Jacob/Yaqub (Prophète, père des 12 tribus)", "Léa et Rachel (mères des tribus d'Israël)", "Hammurabi (roi de Babylone, premier législateur, ~1792 av. J.-C.)"],
      12: ["Joseph/Yusuf (Prophète, vizir d'Égypte)", "Judah (ancêtre du roi David)", "Imhotep (architecte, médecin et sage égyptien)", "Sésostris Ier (pharaon bâtisseur)", "Hatchepsout (grande reine d'Égypte)"],
      13: ["Moïse/Musa (Prophète, libérateur d'Israël)", "Aaron/Harun (Prophète, frère de Moïse)", "Jéthro/Shuaib (Prophète, beau-père de Moïse)", "Ramsès II (grand pharaon bâtisseur, ~1279 av. J.-C.)", "Akhnaton (pharaon monothéiste d'Égypte)"],
      14: ["Josué (successeur de Moïse, conquérant)", "Caleb (courageux explorateur)", "Déborah (prophétesse et juge, première femme chef de guerre)", "Gédéon (juge d'Israël)", "Toutankhamon (pharaon d'Égypte)"],
      15: ["Samson (juge au courage légendaire)", "Ruth (symbole de loyauté et de fidélité)", "Samuel (Prophète et dernier juge)", "Saül (premier roi d'Israël)", "Hiram de Tyr (architecte phénicien génial)"],
      16: ["David/Dawud (Prophète et roi, auteur des Psaumes)", "Abigaïl (femme sage et courageuse)", "Joab (général fidèle)", "Bathsheba (mère de Salomon)", "Élihu (sage ami de Job)"],
      17: ["Salomon/Sulayman (Prophète, le plus sage des rois)", "La reine de Saba/Balkis (reine de légende, Éthiopie/Yémen)", "Élie/Ilyas (Prophète, défenseur du monothéisme)", "Élisée (Prophète, successeur d'Élie)", "Reine Jezabel (reine de Phénicie)"],
      18: ["Élie/Ilyas (Prophète, emporté par un char de feu)", "Élisée (Prophète, miracles et guérisons)", "Isaïe (Prophète, auteur du livre prophétique majeur)", "Hézécias (roi juste d'Israël)", "Ézéchiel (Prophète visionnaire)"],
      19: ["Isaïe (Prophète, vision du Messie à venir)", "Jérémie (Prophète des larmes et de l'espoir)", "Ézéchiel (Prophète de la restauration)", "Amos (Prophète de la justice sociale)", "Osée (Prophète de l'amour divin)"],
      20: ["Daniel (Prophète et sage de Babylone)", "Esdras (prêtre réformateur)", "Néhémie (reconstructeur de Jérusalem)", "Cyrus le Grand (roi de Perse, libérateur des captifs, ~559 av. J.-C.)", "Esther (héroïne juive à la cour perse)"],
      21: ["Darius Ier (roi de Perse, codificateur des lois, ~522 av. J.-C.)", "Zoroastre (fondateur du zoroastrisme, Perse)", "Nabuchodonosor II (roi bâtisseur de Babylone)", "Joël (Prophète)", "Abdias (Prophète)"],
      22: ["Confucius/Kongzi (philosophe, père de la morale, Chine ~551 av. J.-C.)", "Laozi (fondateur du taoïsme, Chine)", "Bouddha Siddhartha Gautama (fondateur du bouddhisme, Inde ~563 av. J.-C.)", "Mahavira (fondateur du jaïnisme, Inde)", "Sun Tzu (stratège, auteur de L'Art de la Guerre)"],
      23: ["Solon d'Athènes (père de la démocratie, ~594 av. J.-C.)", "Pythagore (mathématicien et philosophe, ~570 av. J.-C.)", "Héraclite (philosophe grec)", "Thalès de Milet (père de la philosophie occidentale)", "Cléisthène (père de la démocratie athénienne)"],
      24: ["Périclès (homme d'État athénien, ~495 av. J.-C.)", "Phidias (sculpteur du Parthénon)", "Hérodote (père de l'histoire, ~484 av. J.-C.)", "Thémistocle (stratège d'Athènes)", "Sophocle (tragédien grec)"],
      25: ["Socrate (père de la philosophie, ~469-399 av. J.-C.)", "Hippocrate (père de la médecine, ~460 av. J.-C.)", "Thucydide (historien critique, ~460 av. J.-C.)", "Démocrite (père de la théorie atomique)", "Aristophane (père de la comédie grecque)"],
      26: ["Platon (philosophe, auteur de La République, ~428 av. J.-C.)", "Aristote (philosophe universel, ~384 av. J.-C.)", "Alexandre le Grand (roi conquérant, ~356-323 av. J.-C.)", "Démosthène (grand orateur grec)", "Diogène (philosophe cynique)"],
      27: ["Archimède (mathématicien et ingénieur, ~287 av. J.-C.)", "Euclide (père de la géométrie, ~300 av. J.-C.)", "Eratosthène (calculateur de la circonférence terrestre)", "Ashoka (emperor bouddhiste de la paix, Inde, ~268 av. J.-C.)", "Chandragupta Maurya (fondateur de l'empire Maurya)"],
      28: ["Jules César (général et réformateur romain, 100-44 av. J.-C.)", "Cicéron (orateur et philosophe, 106-43 av. J.-C.)", "Virgile (poète auteur de l'Énéide, 70-19 av. J.-C.)", "Cléopâtre VII (reine d'Égypte, 69-30 av. J.-C.)", "Ovide (poète latin, 43 av. J.-C.)"],
      29: ["Jésus-Christ/Isa (Prophète, figure centrale du christianisme)", "Marie (mère de Jésus, vénérée dans l'Islam)", "Jean-Baptiste/Yahya (Prophète, précurseur de Jésus)", "Joseph de Nazareth (père nourricier de Jésus)", "Hérode le Grand (roi de Judée)"],
      30: ["Pierre/Kephas (apôtre, fondateur de l'Église de Rome)", "Paul de Tarse (apôtre, diffuseur du christianisme aux nations)", "Jean l'Évangéliste (apôtre, auteur du quatrième Évangile)", "Marie-Madeleine (disciple fidèle)", "Étienne (premier martyr chrétien)"],
      31: ["Marc Aurèle (emperor philosophe romain, 121-180 ap. J.-C.)", "Ptolémée (astronome alexandrin, ~100-170)", "Galien (père de la médecine romaine, 129-216)", "Tertullien (théologien africain, Carthage, 160-220)", "Justin Martyr (apologiste chrétien)"],
      32: ["Origène (théologien alexandrin, 185-254)", "Plotin (philosophe néoplatonicien, 205-270)", "Diophante d'Alexandrie (mathématicien, ~210-290)", "Zénobie (reine de Palmyre, ~240-274)", "Mani (fondateur du manichéisme)"],
      33: ["Constantin Ier (premier emperor chrétien, 272-337)", "Augustin d'Hippone (théologien, Algérie, 354-430)", "Ambroise de Milan (évêque et compositeur, 340-397)", "Nicolas de Myre (saint patron des enfants)", "Lactance (apologiste africain)"],
      34: ["Jérôme (traducteur de la Bible-Vulgate, 347-420)", "Jean Chrysostome (prédicateur d'or, 349-407)", "Hypatia d'Alexandrie (mathématicienne et philosophe, 360-415)", "Augustin d'Hippone (auteur des Confessions)", "Synésius (philosophe et évêque)"],
      35: ["Attila (chef hun, rassembleur des peuples des steppes, 406-453)", "Saint Patrick (évangélisateur d'Irlande, 386-461)", "Théodoric le Grand (roi ostrogoth bâtisseur, 454-526)", "Genséric (roi vandale d'Afrique du Nord)", "Columban (moine irlandais missionnaire, 543-615)"],
      36: ["Justinien Ier (emperor byzantin codificateur, 483-565)", "Théodora (impératrice, cofondatrice de l'Empire, 500-548)", "Bélisaire (général brillant)", "Isidore de Séville (encyclopédiste espagnol, 560-636)", "Procope (historien byzantin)"],
      37: ["Grégoire le Grand (pape réformateur, 540-604)", "Boèce (philosophe romain, 480-524)", "Mahomet ibn Abdullah naît à La Mecque (~570 ap. J.-C.)", "Columba (moine irlandais, évangélisateur d'Écosse)", "Dagobert Ier (roi des Francs)"],
      38: ["Muhammad (PBSL) (Prophète de l'Islam, Sceau des Prophètes, 570-632)", "Khadija bint Khuwaylid (première épouse, soutien indéfectible)", "Abu Bakr as-Siddiq (premier compagnon et calife)", "Ali ibn Abi Talib (cousin et gendre du Prophète)", "Uthman ibn Affan (troisième calife, compilateur du Coran)"],
      39: ["Omar ibn al-Khattab (deuxième calife, juste et fort, 584-644)", "Khalid ibn al-Walid (général invaincu)", "Bilal ibn Rabah (premier muezzin, Éthiopien affranchi)", "Aisha bint Abi Bakr (savante de l'Islam, épouse du Prophète)", "Salman al-Farisi (compagnon persan du Prophète)"],
      40: ["Ali ibn Abi Talib (quatrième calife, 601-661)", "Hassan ibn Ali (cinquième calife)", "Hussein ibn Ali (martyr de Karbala, 626-680)", "Fatima Zahra (fille bien-aimée du Prophète)", "Umm Salamah (grande juriste et savante islamique)"],
      41: ["Omar ibn Abd al-Aziz (calife de justice et de piété, 682-720)", "Tariq ibn Ziyad (conquérant de l'Espagne, 670-720)", "Al-Hasan al-Basri (fondateur du soufisme, 642-728)", "Musa ibn Nusayr (conquérant de l'Afrique du Nord)", "Qutayba ibn Muslim (conquérant de l'Asie centrale)"],
      42: ["Al-Khalil ibn Ahmad (fondateur de la linguistique arabe, 718-786)", "Jabir ibn Hayyan (père de la chimie expérimentale, 721-815)", "Haroun al-Rachid (calife abbasside, ~763-809)", "Charlemagne (roi des Francs, unificateur de l'Europe, 742-814)", "Al-Kindi (premier philosophe arabe, ~801-873)"],
      43: ["Al-Khwarizmi (père de l'algèbre et de l'algorithmique, ~780-850)", "Al-Farabi (philosophe et musicologue, 872-950)", "Al-Battani (astronome, calculateur des éclipses, ~858-929)", "Ibn Hanbal (imam, ~780-855)", "Al-Masudi (géographe et historien, ~896-956)"],
      44: ["Ibn Sina/Avicenne (médecin universel, Canon de la médecine, 980-1037)", "Al-Biruni (polymathe, premier anthropologue, 973-1048)", "Al-Razi/Rhazes (père de la médecine clinique, 854-925)", "Firdousi (auteur du Shahnameh, épopée perse, 940-1020)", "Mahmoud de Ghazni (sultan mécène des lettres, 971-1030)"],
      45: ["Ibn Hazm (philosophe d'Al-Andalus, 994-1064)", "Al-Ghazali (philosophe soufi, 1058-1111)", "Omar Khayyam (mathématicien et poète, 1048-1131)", "Ibn al-Haytham/Alhazen (père de l'optique, 965-1040)", "Al-Idrisi (géographe et cartographe, 1100-1165)"],
      46: ["Soundiata Keita (fondateur de l'Empire du Mali, ~1217-1255)", "Pierre Abélard (philosophe scolastique, 1079-1142)", "Hildegard von Bingen (compositrice, philosophe et mystique, 1098-1179)", "Bernard de Clairvaux (théologien mystique, 1090-1153)", "Averroès/Ibn Rushd (philosophe arabe, 1126-1198)"],
      47: ["Saladin/Salah ad-Din (sultan libérateur de Jérusalem, 1137-1193)", "Maïmonide (philosophe et médecin juif, 1135-1204)", "Thomas Becket (archevêque martyr, 1118-1170)", "Ibn Jubayr (géographe et voyageur arabe, 1145-1217)", "Averroès (commentateur d'Aristote, 1126-1198)"],
      48: ["Gengis Khan (fondateur de l'Empire mongol, rassembleur des steppes, 1162-1227)", "Thomas d'Aquin (théologien universel, 1225-1274)", "Roger Bacon (précurseur de la méthode scientifique, ~1214-1292)", "Rumi/Jalal ad-Din (poète soufi universel, 1207-1273)", "Ibn al-Nafis (découvreur de la circulation pulmonaire, 1213-1288)"],
      49: ["Marco Polo (explorateur vénitien de la Chine, 1254-1324)", "Dante Alighieri (auteur de La Divine Comédie, 1265-1321)", "Mansa Musa Ier (emperor du Mali, plus grand pèlerin, 1280-1337)", "Giotto di Bondone (père de la peinture moderne, 1267-1337)", "Ibn Battuta (plus grand voyageur du Moyen Âge, 1304-1368)"],
      50: ["Ibn Khaldun (père de la sociologie et de l'histoire critique, 1332-1406)", "Hafez de Chiraz (poète mystique persan, ~1325-1390)", "Askia Mohammed (emperor de Songhaï, réformateur, ~1443-1538)", "Christine de Pizan (poète féministe française, 1364-1430)", "Ahmed Baba de Tombouctou (grand savant africain, 1556-1627)"],
      51: ["Johannes Gutenberg (inventeur de l'imprimerie, ~1400-1468)", "Léonard de Vinci (génie universel : art, science, ingénierie, 1452-1519)", "Sunni Ali (roi fondateur de l'Empire Songhaï, ~1464-1492)", "Cosimo de Médicis (mécène de la Renaissance, 1389-1464)", "Bayezid II (sultan ottoman, 1447-1512)"],
      52: ["Michel-Ange Buonarroti (artiste universel, 1475-1564)", "Christophe Colomb (explorateur de l'Amérique, 1451-1506)", "Vasco de Gama (explorateur de la route des Indes, ~1469-1524)", "Raphaël Sanzio (peintre de la Renaissance, 1483-1520)", "Montezuma II (dernier emperor aztèque, 1466-1520)"],
      53: ["Martin Luther (réformateur protestant, 1483-1546)", "Copernic (révolution astronomique, 1473-1543)", "Érasme de Rotterdam (humaniste universel, 1466-1536)", "Soliman le Magnifique (sultan ottoman, 1494-1566)", "Machiavel (théoricien politique, 1469-1527)"],
      54: ["Galilée (astronome et physicien, 1564-1642)", "William Shakespeare (dramaturge universel, 1564-1616)", "Miguel de Cervantes (auteur de Don Quichotte, 1547-1616)", "Montaigne (père de l'essai littéraire, 1533-1592)", "Tycho Brahe (astronome danois, 1546-1601)"],
      55: ["Francis Bacon (père de la méthode scientifique moderne, 1561-1626)", "René Descartes (père du rationalisme, 1596-1650)", "Blaise Pascal (mathématicien et philosophe, 1623-1662)", "Rembrandt van Rijn (maître de la lumière en peinture, 1606-1669)", "Johannes Kepler (lois du mouvement planétaire, 1571-1630)"],
      56: ["Isaac Newton (lois de la gravitation universelle, 1643-1727)", "John Locke (père du libéralisme politique, 1632-1704)", "Leibniz (inventeur du calcul infinitésimal, 1646-1716)", "Spinoza (philosophe de l'éthique, 1632-1677)", "Molière (dramaturge français universel, 1622-1673)"],
      57: ["Johann Sebastian Bach (compositeur universel, 1685-1750)", "Voltaire (philosophe des Lumières, 1694-1778)", "Jean-Jacques Rousseau (contrat social, 1712-1778)", "Montesquieu (séparation des pouvoirs, 1689-1755)", "Handel (compositeur baroque, 1685-1759)"],
      58: ["George Washington (premier président américain, 1732-1799)", "Thomas Jefferson (auteur de la Déclaration d'indépendance, 1743-1826)", "Benjamin Franklin (scientifique et diplomate, 1706-1790)", "Toussaint Louverture (libérateur d'Haïti, premier État noir libre, 1743-1803)", "Kant (philosophe allemand, 1724-1804)"],
      59: ["Napoléon Bonaparte (réformateur de l'Europe, 1769-1821)", "Ludwig van Beethoven (compositeur universel, 1770-1827)", "Wolfgang Amadeus Mozart (génie musical, 1756-1791)", "Tipu Sultan (sultan résistant de Mysore, Inde, 1750-1799)", "Jean-Jacques Dessalines (fondateur d'Haïti, 1758-1806)"],
      60: ["Simón Bolívar (libérateur de l'Amérique latine, 1783-1830)", "San Martín (libérateur d'Argentine et du Pérou, 1778-1850)", "Goethe (génie universel allemand, 1749-1832)", "Cheikh Usman dan Fodio (réformateur islamique en Afrique de l'Ouest, 1754-1817)", "Shaka Zulu (roi guerrier zoulou, ~1787-1828)"],
      61: ["El Hadj Oumar Tall (résistant et chef religieux sénégalais, 1797-1864)", "Victor Hugo (auteur des Misérables et Notre-Dame de Paris, 1802-1885)", "Alexandre Dumas (romancier des Trois Mousquetaires, 1802-1870)", "Charles Dickens (romancier social britannique, 1812-1870)", "George Sand (écrivaine et pionnière féministe, 1804-1876)"],
      62: ["Harriet Tubman (libératrice des esclaves américains, 1822-1913)", "Abraham Lincoln (président américain, abolition esclavage, 1809-1865)", "Louis Pasteur (père de la microbiologie, 1822-1895)", "Charles Darwin (auteur de L'Origine des espèces, 1809-1882)", "Florence Nightingale (fondatrice des soins infirmiers modernes, 1820-1910)"],
      63: ["Samori Touré (roi de Wassoulou, grand résistant, 1830-1900)", "Mendeleïev (créateur du tableau périodique, 1834-1907)", "Karl Marx (théoricien social, 1818-1883)", "Jules Verne (précurseur de la science-fiction, 1828-1905)", "Dostoïevski (romancier russe universel, 1821-1881)"],
      64: ["Thomas Edison (inventeur de l'ampoule électrique, 1847-1931)", "Nikola Tesla (inventeur de l'électricité alternative, 1856-1943)", "Marie Curie (double prix Nobel physique et chimie, 1867-1934)", "Fredrick Douglass (abolitionniste et orateur, 1818-1895)", "Mark Twain (auteur américain, père de la littérature américaine, 1835-1910)"],
      65: ["Albert Einstein (auteur de la relativité, 1879-1955)", "Sigmund Freud (père de la psychanalyse, 1856-1939)", "Mahatma Gandhi (père de l'indépendance indienne par la non-violence, 1869-1948)", "W.E.B. Du Bois (père des droits civiques américains, 1868-1963)", "Max Planck (fondateur de la physique quantique, 1858-1947)"],
      66: ["Cheikh Amadou Bamba (fondateur du mouridisme, Sénégal, 1853-1927)", "Léopold Sédar Senghor (poète et premier président du Sénégal, 1906-2001)", "Aimé Césaire (père de la négritude, Martinique, 1913-2008)", "Modibo Keita (premier président du Mali, 1915-1977)", "Léon Gontran Damas (poète de la négritude, Guyane, 1912-1978)"],
      67: ["Kwame Nkrumah (père de l'indépendance du Ghana, 1909-1972)", "Patrice Lumumba (premier ministre du Congo, martyr de l'indépendance, 1925-1961)", "Habib Bourguiba (père de la Tunisie moderne, 1903-2000)", "Gamal Abdel Nasser (leader panarabiste, 1918-1970)", "Jomo Kenyatta (père de l'indépendance du Kenya, 1897-1978)"],
      68: ["Martin Luther King Jr. (prophète des droits civiques, 1929-1968)", "Nelson Mandela (père de la réconciliation nationale, 1918-2013)", "Malcolm X (leader des droits des Noirs américains, 1925-1965)", "Frantz Fanon (théoricien de la décolonisation, 1925-1961)", "Cheikh Anta Diop (historien et savant sénégalais, 1923-1986)"],
      69: ["Ahmed Sékou Touré (premier président de Guinée, 1922-1984)", "Thomas Sankara (révolutionnaire africain du Burkina Faso, 1949-1987)", "Wangari Maathai (écologiste kenyane, prix Nobel de la paix, 1940-2011)", "Amílcar Cabral (révolutionnaire africain de Guinée-Bissau, 1924-1973)", "Steve Biko (père de la conscience noire, Afrique du Sud, 1946-1977)"],
      70: ["Nelson Mandela (premier président noir d'Afrique du Sud, 1918-2013)", "Desmond Tutu (archevêque, prix Nobel de la paix, 1931-2021)", "Miriam Makeba (Mama Africa, chanteuse et militante, 1932-2008)", "Wole Soyinka (premier prix Nobel de littérature africain, né 1934)", "Chinua Achebe (auteur de Things Fall Apart, 1930-2013)"],
      71: ["Amadou Hampâté Bâ (sage africain, gardien des traditions orales, 1900-1991)", "Ousmane Sembène (père du cinéma africain, 1923-2007)", "Diallo Telli (premier secrétaire général de l'OUA, Guinée, 1925-1977)", "Kofi Annan (secrétaire général de l'ONU, Ghana, 1938-2018)", "Meles Zenawi (dirigeant éthiopien réformateur, 1955-2012)"],
      72: ["Tim Berners-Lee (inventeur du World Wide Web, né 1955)", "Mae Jemison (première femme noire astronaute, née 1956)", "Yasser Arafat (leader palestinien, 1929-2004)", "Boutros Boutros-Ghali (secrétaire général ONU, Égypte, 1922-2016)", "Ellen Johnson Sirleaf (première femme présidente africaine, Libéria, née 1938)"],
      73: ["Barack Obama (44e président américain, d'origine kenyane, né 1961)", "Malala Yousafzai (prix Nobel de la paix, Pakistan, née 1997)", "Ngozi Okonjo-Iweala (directrice générale de l'OMC, Nigéria, née 1954)", "Chimamanda Ngozi Adichie (écrivaine universelle, Nigéria, née 1977)", "Aliko Dangote (entrepreneur africain, né 1957)"],
      74: ["Maryam Mirzakhani (première femme Médaille Fields en mathématiques, Iran, 1977-2017)", "Simone Biles (gymnaste la plus décorée de l'histoire, née 1997)", "Angélique Kidjo (chanteuse béninoise, ambassadrice UNICEF, née 1960)", "Burna Boy (artiste nigérian, prix Grammy, né 1991)", "Timnit Gebru (chercheuse en éthique de l'IA, Éthiopie, née 1983)"],
      75: ["Kylian Mbappé (footballeur français d'origine camerounaise, champion du monde, né 2000)", "Wizkid (artiste afrobeats mondial, Nigéria, né 1990)", "Davido (artiste africain mondial, né 1992)", "Yemi Alade (artiste et ambassadrice africaine, née 1989)", "Greta Thunberg (militante pour le climat, Suède, née 2003)"],
      76: ["Leïla Slimani (prix Goncourt, Maroc-France, née 1981)", "Fatoumata Diawara (chanteuse et actrice malienne, née 1982)", "Stromae (artiste belgo-rwandais, né 1985)", "Rokhaya Diallo (journaliste et militante africaine-française, née 1978)", "Mory Kanté (musicien guinéen, Yeke Yeke, 1950-2020)"],
      77: ["Alpha Condé (premier président démocratique élu de Guinée, 1938-)", "Cellou Dalein Diallo (homme politique guinéen, né 1952)", "Sékou Touré (père de l'indépendance guinéenne, 1922-1984)", "Diallo Telli (premier secrétaire général de l'OUA, 1925-1977)", "Barry Diawadou (homme politique guinéen pionnier)"],
      78: ["Camara Laye (auteur de L'Enfant noir, Guinée, 1928-1980)", "Keïta Fodéba (fondateur du Ballet Africain de Guinée, 1921-1969)", "Famoudou Konaté (maître mondial du djembé, Guinée, 1931-2021)", "Balla Moussa Keïta (balaphoniste guinéen légendaire, 1920-1982)", "Manfila Kanté (guitariste guinéen, pionnier de la musique moderne)"],
      79: ["El Hadj Oumar Tall (réformateur islamique et résistant, 1797-1864)", "Alfa Yaya Diallo (roi du Fouta Djallon, résistant courageux, ~1850-1912)", "Bokar Biro Barry (dernier almami du Fouta Djallon, ~1860-1896)", "Thierno Aliou Bah (grand savant islamique de Guinée, 1844-1927)", "Almami Umaru (souverain du Fouta Djallon)"],
      80: ["Almami Samori Touré (roi de Wassoulou, résistant légendaire, 1830-1900)", "Menelik II (emperor d'Éthiopie, vainqueur d'Adoua contre l'Italie, 1844-1913)", "Bai Bureh (résistant sierra-léonais, héros de la guerre de Hut-Hut, ~1840-1908)", "Nana Asmau (poétesse et savante islamique, Nigéria, 1793-1864)", "Reine Pokou (fondatrice du royaume Baoulé, Côte d'Ivoire, ~1700s)"],
      81: ["Cheikh Ahmadou Bamba (fondateur du mouridisme, Sénégal, 1853-1927)", "El Hadj Malick Sy (grand savant islamique sénégalais, 1855-1922)", "Mohammed Abduh (réformateur islamique égyptien, 1849-1905)", "Jamal ad-Din al-Afghani (réformateur islamique panislamique, 1838-1897)", "Nana Asmau (poétesse savante du Nigéria, 1793-1864)"],
      82: ["Booker T. Washington (éducateur africain-américain, 1856-1915)", "W.E.B. Du Bois (fondateur de la NAACP, 1868-1963)", "Marcus Garvey (père du panafricanisme moderne, 1887-1940)", "Sun Yat-sen (fondateur de la République de Chine, 1866-1925)", "Mahatma Gandhi (leader de la résistance non-violente, 1869-1948)"],
      83: ["Atatürk (fondateur de la Turquie moderne, 1881-1938)", "Ho Chi Minh (libérateur du Vietnam, 1890-1969)", "Jawaharlal Nehru (premier ministre de l'Inde indépendante, 1889-1964)", "Ahmed Ben Bella (premier président de l'Algérie indépendante, 1916-2012)", "Hô Chi Minh (père de l'indépendance vietnamienne, 1890-1969)"],
      84: ["Frantz Fanon (théoricien de la décolonisation, Martinique, 1925-1961)", "Amílcar Cabral (révolutionnaire africain, 1924-1973)", "Félix Houphouët-Boigny (père de la Côte d'Ivoire, 1905-1993)", "Julius Nyerere (père de la Tanzanie, 1922-1999)", "Kenneth Kaunda (père de la Zambie, 1924-2021)"],
      85: ["Léopold Sédar Senghor (poète et académicien, 1906-2001)", "Aimé Césaire (négritude et politique, 1913-2008)", "Ousmane Sembène (cinéaste africain, 1923-2007)", "Seydou Keïta (photographe malien légendaire, 1921-2001)", "Malick Sidibé (photographe, humaniste malien, 1935-2016)"],
      86: ["Youssou N'Dour (chanteur sénégalais de renommée mondiale, né 1959)", "Salif Keïta (Voix d'or de l'Afrique, né 1949)", "Fela Kuti (inventeur de l'Afrobeat, Nigéria, 1938-1997)", "Miriam Makeba (Mama Africa, 1932-2008)", "Oliver Tambo (président de l'ANC, 1917-1993)"],
      87: ["Ahmed Sékou Touré (père de l'indépendance guinéenne, 1922-1984)", "Modibo Keita (premier président du Mali, 1915-1977)", "Dawda Jawara (premier président de Gambie, 1924-2019)", "Sirimavo Bandaranaike (première femme Premier ministre au monde, Sri Lanka, 1916-2000)", "Indira Gandhi (première femme Premier ministre de l'Inde, 1917-1984)"],
      88: ["Nelson Mandela (symbole mondial de réconciliation, 1918-2013)", "Desmond Tutu (archevêque de la paix, 1931-2021)", "Oliver Tambo (président de l'ANC en exil, 1917-1993)", "Walter Sisulu (militant anti-apartheid, 1912-2003)", "Albertina Sisulu (militante courageuse, 1918-2011)"],
      89: ["Wole Soyinka (prix Nobel de littérature africain, né 1934)", "Chinua Achebe (auteur africain universel, 1930-2013)", "Ngugi wa Thiong'o (romancier kenyan, né 1938)", "Aminata Sow Fall (romancière sénégalaise, née 1941)", "Mongo Beti (romancier camerounais, 1932-2001)"],
      90: ["Kofi Annan (secrétaire général de l'ONU, Ghana, 1938-2018)", "Wangari Maathai (prix Nobel de la paix, Kenya, 1940-2011)", "Ellen Johnson Sirleaf (première femme présidente africaine, Libéria, née 1938)", "Abdoulaye Wade (président du Sénégal, né 1926)", "Amadou Toumani Touré (président du Mali, 1948-2020)"],
      91: ["Barack Obama (44e président des États-Unis, d'origine kenyane, né 1961)", "Malala Yousafzai (prix Nobel de la paix, Pakistan, née 1997)", "Ngozi Okonjo-Iweala (directrice de l'OMC, née 1954)", "Chimamanda Ngozi Adichie (écrivaine universelle, née 1977)", "Aliko Dangote (entrepreneur africain, né 1957)"],
      92: ["Burna Boy (artiste africain, prix Grammy, né 1991)", "Wizkid (afrobeats mondial, Nigéria, né 1990)", "Kylian Mbappé (footballeur, champion du monde, né 2000)", "Timnit Gebru (éthique de l'intelligence artificielle, née 1983)", "Leïla Slimani (prix Goncourt, née 1981)"],
      93: ["Greta Thunberg (militante climatique mondiale, née 2003)", "Maryam Mirzakhani (mathématicienne, Médaille Fields, 1977-2017)", "Simone Biles (gymnaste, athlète universelle, née 1997)", "Chadwick Boseman (acteur, Black Panther, 1976-2020)", "Virgil Abloh (designer africain-américain, 1980-2021)"],
      94: ["Davido (artiste africain mondial, né 1992)", "Yemi Alade (chanteuse africaine internationale, née 1989)", "Fatoumata Diawara (chanteuse malienne, née 1982)", "Stromae (artiste belgo-rwandais universel, né 1985)", "Angélique Kidjo (ambassadrice UNICEF, 4 prix Grammy, née 1960)"],
      95: ["C'est votre génération — racontez votre histoire ici", "Vos parents et grands-parents ont vécu des moments historiques uniques", "Partagez vos récits pour les transmettre à vos enfants et petits-enfants", "Chaque vie est un trésor pour l'humanité"],
      96: ["Vous faites partie de la 96e génération depuis Adam", "Votre vie est un chapitre vivant de l'Histoire de l'Humanité", "Écrivez votre histoire dès aujourd'hui pour les générations futures", "Les Enfants d'Adam continuent l'aventure humaine"]
    };
    return (figuresMap[gen] || ["Période de développement de l'humanité."]).slice(0, 8);
  };

  const getCulturalDevelopments = (gen: number): string[] => {
    const cultMap: Record<number, string[]> = {
      1:  ["Transmission orale des enseignements divins", "Premières chants et prières", "Langage humain originel"],
      2:  ["Premières traditions familiales", "Chants et récitations spirituelles", "Art rupestre et gravures"],
      3:  ["Cultes collectifs et rituels communautaires", "Premières danses sacrées", "Tisserands et potiers"],
      4:  ["Écriture et astronomie (Hénoch/Idris)", "Forgerons et métallurgistes (Tubal-Caïn)", "Musique instrumentale (Jubal)"],
      5:  ["Traditions patriarcales transmises oralement", "Architecture en bois et en pierre", "Premières formes de commerce"],
      6:  ["Construction navale : l'Arche de Noé", "Préservation de toutes les espèces vivantes", "Renouvellement de l'alliance divine"],
      7:  ["Dispersion culturelle aux quatre horizons", "Naissance des premières langues distinctes", "Architecture sumérienne et ziggurats (~3000 av. J.-C.)"],
      8:  ["Écriture cunéiforme sumérienne (~3200 av. J.-C.)", "Tour de Babel, symbole d'ambition humaine", "Premières cités-États : Ur, Uruk, Eridu"],
      9:  ["Cité d'Ur, berceau d'Abraham", "Premières formes d'écriture alphabétique", "Traditions nomades et caravanes commerciales"],
      10: ["Construction de la Kaaba, premier sanctuaire de l'humanité", "Traditions de l'hospitalité arabe", "Chants et poésie tribale du Proche-Orient"],
      11: ["Écriture cunéiforme et hiéroglyphes égyptiens", "Premières pyramides et temples", "Code de Hammurabi, première charte juridique"],
      12: ["Civilisation de l'Indus à son apogée (~2000 av. J.-C.)", "Papyrus égyptien et littérature ancienne", "Artisanat en bronze, bijoux et mosaïques"],
      13: ["Sortie d'Égypte et Torah : civilisation hébraïque", "Temples égyptiens d'Abou Simbel (Ramsès II)", "Traité de Kadesh, premier accord international écrit"],
      14: ["Alphabet phénicien, ancêtre de tous les alphabets (~1050 av. J.-C.)", "Navigation méditerranéenne des Phéniciens", "Poésie et psaumes de David"],
      15: ["Art mycénien en Grèce", "Philosophie védique en Inde (Upanishads)", "Premières formes de théâtre en Grèce"],
      16: ["Psaumes de David : poésie et musique sacrée", "Architecture du Temple de Salomon", "Épopée d'Homère (Iliade et Odyssée) vers ~800 av. J.-C."],
      17: ["Temple de Salomon, merveille architecturale", "Art phénicien et ivoires sculptés", "Proverbes de Salomon, sagesse universelle"],
      18: ["Prophètes littéraires d'Israël : Isaïe, Jérémie", "Poésie hébraïque des Psaumes", "Manuscrits et rouleaux de la Torah"],
      19: ["Livre des Psaumes, poésie spirituelle intemporelle", "Livres des Prophètes, chefs-d'œuvre littéraires", "Civilisation perse achéménide et ses arts"],
      20: ["Art perse de Persépolis", "Livre d'Esther et de Daniel, littérature narrative", "Rouleaux de la mer Morte, trésor de l'humanité"],
      21: ["Zoroastre : poèmes sacrés (Gathas)", "Confucius : Entretiens, sagesse universelle", "Laozi : Tao Te Ching, philosophie de l'équilibre"],
      22: ["Bouddhisme : Dharma et méditation", "Jaïnisme : ahimsa (non-violence)", "Art grec archaïque et sculptures idéales"],
      23: ["Tragédies grecques : Eschyle, Sophocle, Euripide", "Architecture du Parthénon (~447 av. J.-C.)", "Olympiades, fraternité sportive mondiale"],
      24: ["Théâtre grec et comédie d'Aristophane", "Sculpture classique grecque (Phidias)", "Histoire d'Hérodote, récit des peuples du monde"],
      25: ["Philosophie de Socrate, Platon, Aristote", "Académie de Platon, première université", "Médecine d'Hippocrate : serment éthique"],
      26: ["Platon : La République, utopie politique", "Alexandre diffuse la culture grecque en Orient (hellénisme)", "Bibliothèque d'Alexandrie fondée (331 av. J.-C.)"],
      27: ["Bibliothèque d'Alexandrie : 500 000 rouleaux de savoir", "Art bouddhiste d'Ashoka : stupas et piliers", "Comédie romaine (Plaute, Térence)"],
      28: ["Épopée de Virgile (Énéide)", "Poésie d'Ovide et Horace", "Architecture romaine : Panthéon, aqueducs, routes"],
      29: ["Évangiles : récit de la vie de Jésus-Christ", "Paroles de Jésus : Sermon sur la montagne, paraboles", "Architecture synagogale et premières communautés chrétiennes"],
      30: ["Épîtres de Paul, littérature spirituelle universelle", "Art paléochrétien dans les catacombes", "Architecture des premières basiliques chrétiennes"],
      31: ["Méditations de Marc Aurèle, philosophie stoïcienne", "Art romain des portraits et mosaïques", "Littérature chrétienne : Tertullien, Justin Martyr"],
      32: ["Néoplatonisme de Plotin, pont entre philosophies", "Art copte en Égypte et Éthiopie", "Littérature manichéenne"],
      33: ["Confessions d'Augustin, chef-d'œuvre spirituel", "Art byzantin et premières icônes", "Musique grégorienne naissante"],
      34: ["Cité de Dieu d'Augustin, pensée politique chrétienne", "Calligraphie latine et manuscrits enluminés", "Fresques des catacombes romaines"],
      35: ["Épopées germaniques (Beowulf)", "Art irlandais : Livre de Kells", "Traditions celtiques et traditions slaves"],
      36: ["Code de Justinien : fondation du droit occidental", "Sainte-Sophie de Constantinople, chef-d'œuvre architectural", "Musique grégorienne de Grégoire le Grand"],
      37: ["Mosquée de La Mecque, cœur de l'Islam", "Art et calligraphie préislamiques d'Arabie", "Poésie préislamique (muallaqat, odes suspendues)"],
      38: ["Le Coran, Parole divine révélée à Muhammad (PBSL)", "Architecture de la première mosquée de Médine", "Calligraphie arabe, art sacré de l'Islam"],
      39: ["Expansion de la calligraphie et l'art islamiques", "Architecture des premières mosquées d'Égypte et d'Iran", "Science islamique naissante à Bagdad"],
      40: ["Poésie arabe islamique classique", "Grande Mosquée de Kairouan (Tunisie, 670)", "Art omeyyade de Syrie et d'Espagne"],
      41: ["Al-Andalus : carrefour culturel islamo-chrétien-juif", "Grande Mosquée de Cordoue (~785)", "Premières universités islamiques (Qarawiyyin, 859)"],
      42: ["Maison de la Sagesse (Bayt al-Hikma) à Bagdad", "Art abbasside : palais, céramiques, manuscrits enluminés", "Musique arabo-andalouse : oud, maqam"],
      43: ["Littérature persane renaissante (Firdousi, Rudaki)", "Art islamique des miniatures persanes", "Architecture des mosquées de Samara et de Bagdad"],
      44: ["Canon de la Médecine d'Ibn Sina, manuel universel", "Poésie soufie persane (Rumi, Hafez)", "Art islamique : calligraphie, arabesque, mosaïque"],
      45: ["Rumi compose le Masnavi, poème universel (~1258)", "Architecture gothique en Europe (Notre-Dame, 1163)", "Art enluminé des manuscrits médiévaux"],
      46: ["Épopée du Soundiata Keita, fondatrice de l'Empire du Mali", "Troubadours et trouvères en Europe", "Architecture islamique d'Afrique de l'Ouest"],
      47: ["Roman de la Rose, littérature courtoise française", "Art islamique d'Espagne (Alhambra de Grenade, 1238)", "Épopées persanes et littérature ottomane naissante"],
      48: ["La Divine Comédie de Dante (1308), chef-d'œuvre universel", "Miniatures mongoles et persanes", "Art gothique flamboyant en Europe"],
      49: ["Marco Polo : récit de voyages, ouverture au monde", "Manuscrits de Tombouctou : science, droit, poésie islamiques", "Hafez de Chiraz, poète mystique universel"],
      50: ["Gutenberg invente l'imprimerie (1450), révolution du savoir", "Léonard de Vinci : art, ingénierie, anatomie", "Tombouctou, centre universitaire africain mondial"],
      51: ["La Joconde et la Sixtine de Michel-Ange (1508-1512)", "Poésie de Ronsard, Pétrarque, Shakespeare naissant", "Architecture de la Renaissance : dôme de Florence"],
      52: ["Shakespeare : Hamlet, Roméo et Juliette (~1600)", "Cervantes : Don Quichotte (1605)", "Épopées de la conquête améridienne et résistance autochtone"],
      53: ["Imprimerie diffuse la Bible dans toutes les langues", "Musique de Palestrina et Victoria, polyphonie sacrée", "Architecture ottomane : mosquée Süleymaniye (~1557)"],
      54: ["Théâtre élisabéthain de Shakespeare", "Peinture baroque de Rembrandt, Rubens, Vermeer", "Architecture baroque de Bernin (Saint-Pierre de Rome)"],
      55: ["Philosophie rationaliste de Descartes et Pascal", "Musique baroque de Bach et Purcell", "Littérature française classique : Molière, Racine, Corneille"],
      56: ["Siècle de Louis XIV : Versailles, art classique français", "Musique de Vivaldi, Haendel, Corelli", "Littérature des Lumières : Voltaire, Montesquieu"],
      57: ["Musique de Bach (Messe en si), Haendel (Messie)", "Encyclopédie de Diderot et d'Alembert", "Littérature sentimentale : Richardson, Fielding"],
      58: ["Mozart compose opéras et symphonies (1756-1791)", "Peinture néoclassique de David", "Littérature révolutionnaire : Rousseau, Paine"],
      59: ["Beethoven compose la 9e Symphonie et la Lettre à Élise", "Goethe publie Faust, chef-d'œuvre universel", "Architecture néoclassique : Arc de Triomphe, Capitole"],
      60: ["Romantisme de Hugo, Dumas, Balzac", "Musique romantique : Chopin, Schumann, Liszt", "Art romantique : Delacroix, Géricault"],
      61: ["Réalisme de Flaubert, Zola, Dickens", "Impressionnisme : Monet, Renoir, Degas (1860-1880)", "Musique de Wagner, Verdi, Brahms"],
      62: ["Naturalisme de Zola, Maupassant", "Post-impressionnisme : Van Gogh, Gauguin, Cézanne", "Photographie naissante, nouvelle forme d'art"],
      63: ["Symbolisme en poésie : Baudelaire, Rimbaud, Verlaine", "Art nouveau : Klimt, Gaudí, Mucha", "Musique de Mahler, Debussy, Dvorak"],
      64: ["Cubisme de Picasso et Braque (1907)", "Musique de Stravinski (Le Sacre du printemps, 1913)", "Cinéma des frères Lumière et de Méliès"],
      65: ["Surréalisme de Dalí et Magritte (1920s)", "Jazz américain issu de la culture africaine (1910-1920)", "Harlem Renaissance : arts africains-américains"],
      66: ["Négritude : Senghor, Césaire, Damas (1930-1940)", "Art africain reconnu par Picasso et les avant-gardes", "Photographie de Seydou Keïta au Mali (1940s)"],
      67: ["Cinéma africain de Sembène Ousmane (1963)", "Musique africaine : kora, balafon, djembé sur la scène mondiale", "Ballet National Africain de Guinée fondé (1958)"],
      68: ["Martin Luther King et les chansons de lutte (We Shall Overcome)", "Bossa Nova brésilienne, expression de la liberté", "Photographie de Malick Sidibé, humanisme malien"],
      69: ["Thomas Sankara révolutionne l'art et la culture au Burkina Faso", "Musique de Miriam Makeba (Mama Africa) contre l'apartheid", "Fela Kuti invente l'Afrobeat et dénonce l'injustice (1970)"],
      70: ["Youssou N'Dour et le mbalax sénégalais conquièrent le monde (1977)", "Salif Keïta, Voix d'or de l'Afrique", "Littérature africaine de Soyinka, Achebe, Ngugi"],
      71: ["Amadou Hampâté Bâ préserve les traditions orales", "Musique mandingue de Ali Farka Touré et Mory Kanté", "Cinéma africain aux Oscars (2000s)"],
      72: ["Hip-hop africain-américain conquiert le monde (1990s)", "Musiques du monde : World Music festival (1980s)", "Littérature africaine traduite dans 50 langues"],
      73: ["Afrobeats de Wizkid, Davido, Burna Boy (2010s)", "Littérature de Chimamanda Adichie, Leïla Slimani", "Mode africaine : Lagos Fashion Week, Dakar Mode"],
      74: ["Grammy Awards pour les artistes africains (2020-2023)", "Fatoumata Diawara et Stromae, voix métissées du monde", "Art numérique africain et NFT"],
      75: ["Kylian Mbappé et les footballeurs africains conquièrent le monde", "Séries africaines sur Netflix", "Art et mode africains mondiaux"],
      76: ["Leïla Slimani prix Goncourt (2016)", "Architecture africaine contemporaine : Diébédo Francis Kéré", "Cinéma africain à Cannes et aux Oscars"],
      77: ["Culture guinéenne rayonnante : musique, danse, artisanat", "Traditions oratoires et griots de Guinée", "Artisanat africain reconnu patrimoine mondial"],
      78: ["Famoudou Konaté, maître mondial du djembé", "Ballet Africain de Guinée en tournée mondiale", "Musique traditionnelle de Guinée classée UNESCO"],
      79: ["Épopée de Soundiata, transmise par les griots depuis 800 ans", "Tradition des almamis du Fouta Djallon", "Art islamique de Tombouctou et manuscrits sahéliens"],
      80: ["Épopée de Samori Touré, héros de la résistance africaine", "Art zoulou, peinture rupestre en Afrique australe", "Traditions royales éthiopiennes (2000 ans d'histoire)"],
      81: ["Poésie soufie d'Ahmadou Bamba", "Nana Asmau, poétesse et savante islamique du Nigéria", "Architecture des mosquées sahéliennes en banco"],
      82: ["Harlem Renaissance : Langston Hughes, Zora Neale Hurston", "Jazz de Louis Armstrong, Duke Ellington", "Blues, soul, gospel : âme africaine en Amérique"],
      83: ["Littérature anticoloniale : Aimé Césaire, Léon-Gontran Damas", "Cinéma asiatique : Akira Kurosawa (Japon)", "Architecture moderne : Le Corbusier, Mies van der Rohe"],
      84: ["Littérature africaine de Fanon, Senghor, Mongo Beti", "Musique cubaine, salsa : héritage africain des Amériques", "Architecture africaine post-coloniale"],
      85: ["Négritude célébrée au Festival Mondial des Arts Nègres (Dakar, 1966)", "Cinéma de Sembène Ousmane, Oumarou Ganda", "Photographie africaine : Seydou Keïta, Malick Sidibé"],
      86: ["Youssou N'Dour chante pour l'Afrique au monde entier", "Fela Kuti et l'Afrobeat, musique de résistance", "Arts visuels africains dans les musées du monde"],
      87: ["Musique africaine aux concerts Live Aid (1985)", "Littérature francophone africaine : Prix Renaudot", "Art africain reconnu au Centre Pompidou"],
      88: ["Mandela : Long Walk to Freedom, mémoires universels (1994)", "Musique de lutte anti-apartheid dans le monde", "Art sud-africain de l'après-apartheid"],
      89: ["Wole Soyinka reçoit le prix Nobel de littérature (1986)", "Chinua Achebe, Things Fall Apart traduit en 50 langues", "Ngugi wa Thiong'o, choix du kikuyu contre la langue coloniale"],
      90: ["Musique afro-pop mondiale (2000s)", "Littérature africaine aux prix Goncourt et Booker", "Architecture africaine contemporaine"],
      91: ["Afrobeats, nouvelle musique mondiale dominante (2010s)", "Littérature de Chimamanda Adichie, féminisme et identité africaine", "Mode africaine : Lagos, Dakar, Nairobi"],
      92: ["Grammy Awards de Burna Boy et Wizkid (2021-2023)", "Streaming africain : musique, séries, films sur Netflix", "Art contemporain africain aux grandes foires mondiales"],
      93: ["Mouvement #MeToo et conscience sociale mondiale (2017)", "Musique K-pop coréenne conquiert le monde", "Art numérique, NFT et nouvelles formes de création"],
      94: ["Afrobeats aux charts mondiaux : Davido, Yemi Alade", "Séries africaines : première génération Netflix Afrique", "Streetwear africain, Virgil Abloh et Off-White"],
      95: ["Votre génération crée la culture de demain", "Arts numériques, musiques nouvelles, littérature vivante", "Votre histoire personnelle enrichit le patrimoine mondial"],
      96: ["Vous vivez l'histoire en ce moment", "La culture de votre époque sera le patrimoine de demain", "Partagez votre création, votre art, votre récit"]
    };
    return (cultMap[gen] || ["Développement culturel de l'humanité."]).slice(0, 4);
  };

  const getReligiousEvents = (gen: number): string[] => {
    const relMap: Record<number, string[]> = {
      1:  ["Création d'Adam et Ève par Dieu", "Premier enseignement divin à l'humanité", "Descente d'Adam sur Terre et repentir"],
      2:  ["Seth et ses descendants invoquent Dieu en assemblée", "Premières formes de prière collective", "Transmission de la foi monothéiste"],
      3:  ["Kenan et Méhaléel perpétuent la foi d'Adam", "Premières formes de culte organisé", "Traditions de bénédiction et de reconnaissance divine"],
      4:  ["Hénoch/Idris (Prophète), homme de prière intense", "Mathusalem, symbole de sagesse spirituelle", "Premières formes de liturgie sacrée"],
      5:  ["Noé commence sa mission prophétique", "Appel à la repentance lancé pendant des siècles", "Alliance entre Noé et Dieu avant le déluge"],
      6:  ["Alliance de l'Arc-en-ciel entre Dieu et Noé", "Noé bâtit l'Arche sur ordre divin", "Le Déluge : purification et recommencement"],
      7:  ["Sem perpétue la tradition monothéiste", "Premières formes de religion en Égypte (Cham/Misraïm)", "Temples et ziggourats, lieux du divin en Mésopotamie"],
      8:  ["Nimrod s'oppose à Dieu, Abraham résiste", "Tour de Babel : orgueil humain contre la volonté divine", "Abraham brise les idoles à Ur (~2100 av. J.-C.)"],
      9:  ["Abraham reçoit la révélation et migre vers Canaan", "Alliance d'Abraham avec Dieu (Alliance abrahamique)", "Naissance d'Ismaël, ancêtre des Arabes"],
      10: ["Construction de la Kaaba par Abraham et Ismaël", "Sacrifice d'Ismaël/Isaac, épreuve suprême de foi", "Naissance d'Isaac, ancêtre des Hébreux"],
      11: ["Jacob reçoit le nom Israël ('qui lutte avec Dieu')", "Les 12 tribus d'Israël fondées par les fils de Jacob", "Premières formes de culte en Canaan"],
      12: ["Joseph (Prophète) garde la foi en toutes circonstances", "Culte de Pharaon et du soleil en Égypte", "Traditions religieuses en Mésopotamie et Égypte"],
      13: ["Révélation de la Torah à Moïse sur le Sinaï", "Les 10 Commandements, loi universelle de Dieu", "Sortie d'Égypte : Pâques hébraïque première liberté divine"],
      14: ["Josué et la conquête de Canaan, terre promise", "Déborah, prophétesse et juge d'Israël", "Premières formes de culte au Temple"],
      15: ["Samuel oint les rois d'Israël au nom de Dieu", "Fondation de la monarchie d'Israël sur la loi divine", "Livre de Ruth, symbole de foi et loyauté"],
      16: ["David écrit les Psaumes, poésie spirituelle universelle", "Jérusalem proclamée ville sainte de Dieu", "Alliance de Dieu avec David pour l'éternité"],
      17: ["Salomon construit le Temple de Jérusalem, maison de Dieu", "La reine de Saba vient s'incliner devant la sagesse divine", "Proverbes et Ecclésiaste : sagesse spirituelle universelle"],
      18: ["Élie/Ilyas défend Dieu contre les idoles de Baal", "Élisée accomplit des miracles au nom de Dieu", "Prophètes d'Israël : Isaïe, Amos, Osée"],
      19: ["Isaïe prophétise la venue du Messie (~740 av. J.-C.)", "Jérémie pleure sur Jérusalem et appelle à la fidélité", "Exil à Babylone : foi en temps de tribulation"],
      20: ["Daniel maintient sa foi à la cour de Babylone", "Cyrus libère les Juifs par décret divin (538 av. J.-C.)", "Reconstruction du Temple de Jérusalem par Esdras"],
      21: ["Zoroastre enseigne la lutte du bien contre le mal", "Prophètes mineurs d'Israël : Aggée, Zacharie, Malachie", "Clôture de la Torah et du canon hébraïque"],
      22: ["Bouddha atteint l'Éveil, enseigne la compassion (~528 av. J.-C.)", "Confucius enseigne la piété filiale et la vertu", "Jaïnisme : ahimsa (non-violence absolue)"],
      23: ["Philosophie grecque comme quête du divin", "Pythagorisme : âme immortelle et transmigration", "Oracles de Delphes, autorité spirituelle grecque"],
      24: ["Philosophie socratique comme spiritualité de la raison", "Temples grecs dédiés aux dieux (Athéna, Zeus)", "Mystères d'Éleusis, rites d'initiation spirituelle"],
      25: ["Platon : âme immortelle et monde des idées divines", "Socrate meurt pour ses convictions spirituelles (399 av. J.-C.)", "Naissance du stoïcisme : Providence divine universelle"],
      26: ["Aristote : Dieu comme Premier Moteur immobile", "Alexandre diffuse le syncrétisme religieux en Orient", "Philosophies hédoniste et épicurienne"],
      27: ["Ashoka embrasse le bouddhisme et prêche la paix (268 av. J.-C.)", "Expansion du bouddhisme de l'Inde vers l'Asie", "Stoïcisme : vie selon la raison divine"],
      28: ["Religion romaine et culte de l'Empereur", "Cléopâtre VII et le culte d'Isis en Égypte", "Syncrétisme religieux dans l'Empire romain"],
      29: ["Naissance de Jésus-Christ/Isa (Prophète), lumière du monde", "Baptême de Jésus par Jean-Baptiste dans le Jourdain", "Sermon sur la montagne, enseignements spirituels universels"],
      30: ["Mort et Résurrection de Jésus-Christ (Pâques chrétienne)", "Pentecôte et naissance de l'Église chrétienne", "Paul prêche l'Évangile aux nations du monde entier"],
      31: ["Expansion chrétienne jusqu'en Afrique (Égypte, Éthiopie)", "Martyrs chrétiens des arènes romaines", "Premières communautés coptes en Égypte"],
      32: ["Persécutions des chrétiens par Dioclétien (~303)", "Plotin, synthèse philosophique et spirituelle", "Manichéisme de Mani, religion universelle"],
      33: ["Édit de Milan : liberté religieuse (313)", "Concile de Nicée définit le dogme chrétien (325)", "Christianisme religion officielle de Rome (380)"],
      34: ["Augustin d'Hippone, théologien universel (354-430)", "Jérôme traduit la Bible en latin (Vulgate)", "Hypatia d'Alexandrie, martyre de la philosophie"],
      35: ["Saint Patrick évangélise l'Irlande (~432)", "Christianisme irlandais et scots, missionnaires en Europe", "Monastères irlandais, lumières de l'Europe médiévale"],
      36: ["Justinien réforme l'Église byzantine", "Concile de Constantinople (553)", "Sainte-Sophie, icône de la foi chrétienne"],
      37: ["Grégoire le Grand : réforme liturgique et Gregoriana", "Expansion du christianisme en Afrique sub-saharienne", "Prophétie de la venue de Muhammad (PBSL) dans les Écritures"],
      38: ["Révélation du Coran à Muhammad (PBSL) dans la caverne Hira (610)", "Hégire (622) : fondation de la communauté islamique (Oumma)", "Conquête pacifique de La Mecque (630), pardon et miséricorde"],
      39: ["Compilation définitive du Coran sous Uthman (644)", "Expansion de l'Islam en Perse, Syrie, Égypte, Afrique du Nord", "Bataille de Karbala et martyrdom de Hussein (680)"],
      40: ["Expansion de l'Islam jusqu'en Espagne (711)", "Fondation des premières madrasas islamiques", "Soufisme naissant : Al-Hasan al-Basri"],
      41: ["Omar ibn Abd al-Aziz, calife de justice islamique (717-720)", "Islam en Afrique de l'Ouest : premières conversions sahéliennes", "Premiers savants islamiques d'Afrique (Kairouan)"],
      42: ["Traduction des textes grecs en arabe à la Maison de la Sagesse", "Développement de la théologie islamique (kalam)", "Islam au Maghreb et en Afrique sub-saharienne"],
      43: ["Sciences islamiques : al-Kindi, al-Farabi synthèse foi et raison", "Diffusion de l'Islam jusqu'en Asie centrale et en Inde", "Al-Battani : astronomie islamique et calcul des dates sacrées"],
      44: ["Ibn Sina : philosophie islamique et théologie de l'âme", "Soufisme d'Al-Ghazali : réconciliation foi et philosophie (1111)", "Expansion de l'Islam en Afrique de l'Ouest et en Asie"],
      45: ["Al-Ghazali : La Revivification des sciences de la religion (1111)", "Mystique soufie de Rumi, amour divin universel", "Croisades : rencontre Islam-Christianisme"],
      46: ["Soundiata Keita islamise l'Empire du Mali", "Expansion du Christianisme en Éthiopie (Zagwé)", "Thomas d'Aquin naît, futur pilier de la théologie chrétienne"],
      47: ["Saladin libère Jérusalem avec clémence et foi (1187)", "Maïmonide : synthèse judaïsme et philosophie arabe", "Islam en Afrique de l'Ouest : Tombouctou, Djenné"],
      48: ["Mongols convertis à l'Islam en masse (XIIIe siècle)", "Thomas d'Aquin : Somme théologique, synthèse chrétienne (1265-1274)", "Soufisme de Rumi : 'Cherche Dieu dans ton cœur'"],
      49: ["Mansa Musa fait le pèlerinage à La Mecque (1324-1325)", "Tombouctou, capitale du savoir islamique africain", "Dante : La Divine Comédie, vision chrétienne de l'au-delà"],
      50: ["Ibn Khaldun : philosophie de l'histoire islamique", "Askia Mohammed pèlerin à La Mecque, roi savant du Songhaï", "Islam se diffuse jusqu'en Asie du Sud-Est (Malaisie, Indonésie)"],
      51: ["Expulsion des Juifs et des Musulmans d'Espagne (1492)", "Pape Innocent X et pouvoir spirituel de l'Église", "Islam en Afrique de l'Ouest : Timbuktu, Djenné, Gao"],
      52: ["Traités de Tordesillas (partage du monde entre Espagne et Portugal)", "Islam en Inde : Mughal empire de Babur (1526)", "Christianisme en Amérique : premières missions"],
      53: ["Réforme protestante de Luther (1517), Bible pour tous", "Calvin fonde la réforme à Genève (1536)", "Concile de Trente, Contre-Réforme catholique (1545-1563)"],
      54: ["Galilée condamné par l'Inquisition (1633)", "Guerres de religion en Europe (XVIe-XVIIe s.)", "Islam ottoman à son apogée (Soliman le Magnifique)"],
      55: ["Pascal : apologie du christianisme (Pensées)", "Mysticisme espagnol : Thérèse d'Avila, Jean de la Croix", "Spinoza excommunié pour sa philosophie de Dieu"],
      56: ["Newton cherche Dieu dans les lois de l'univers", "Lokeye : tolérance religieuse et droits naturels", "Piétisme protestant en Allemagne"],
      57: ["Musique sacrée de Bach dédiée à Dieu", "Jansénisme en France : retour à Augustin", "Méthodisme de John Wesley, foi du peuple"],
      58: ["Déclaration d'Indépendance : 'tous les hommes sont créés égaux par Dieu'", "Lumières : déisme, foi rationnelle en Dieu", "Révolution haïtienne au nom de la liberté divine"],
      59: ["Romantisme et retour au sacré : Chateaubriand", "Missionnaires protestants en Afrique (1795)", "Islam en Afrique de l'Ouest : Cheikh Usman dan Fodio"],
      60: ["El Hadj Oumar Tall, djihad islamique spirituel au Sahel (~1852)", "Missions catholiques en Afrique centrale et australe", "Abolition de l'esclavage : victoire de la foi et de la dignité"],
      61: ["El Hadj Oumar Tall fonde l'Empire toucouleur au nom de l'Islam", "Karl Marx publie sa critique de la religion (1844)", "Missionnaires en Afrique de l'Ouest et centrale"],
      62: ["Lincoln : abolition de l'esclavage au nom de Dieu (1865)", "Harriet Tubman guidée par la foi chrétienne", "Missions africaines catholiques et protestantes"],
      63: ["Mouvement des Droits de l'Homme : foi et dignité humaine", "Islam dans les Amériques : premières mosquées", "Conversion massive en Afrique sub-saharienne au christianisme"],
      64: ["Islam et christianisme en compétition en Afrique de l'Ouest", "Premières constitutions laïques séparant État et religion", "Foi des Africains-Américains : gospel, freedom songs"],
      65: ["Ahmadiyya fondée en Inde (~1889), nouvelle branche islamique", "Sionisme fondé par Herzl pour créer un foyer juif (1897)", "Mouvements de réveil chrétien en Afrique (Pentecôtisme)"],
      66: ["Ahmadou Bamba : résistance spirituelle, voie soufie mouride", "El Hadj Malick Sy, Tijaniyya au Sénégal", "Islam en Afrique noire, grande conversion des peuples"],
      67: ["Indépendances africaines au nom de la foi et de la dignité", "Dialogue islamo-chrétien naissant", "Kwame Nkrumah : 'Seek ye first the political kingdom'"],
      68: ["Martin Luther King : 'I Have a Dream', foi et liberté", "Congrès Vatican II : ouverture de l'Église catholique (1962-1965)", "Islam de Malcolm X, conscience africaine-américaine"],
      69: ["Sékou Touré et la laïcité africaine", "Mouvement de libération en Afrique du Sud au nom de la dignité", "Islam et développement africain : nouvelles mosquées"],
      70: ["Tutu et Mandela : réconciliation au nom de Dieu (1994)", "Dialogue interreligieux mondial après la Guerre Froide", "Islam et modernité africaine"],
      71: ["Coopération islamo-chrétienne en Afrique de l'Ouest", "Mouvements de renouveau spirituel en Afrique", "Foi et développement : missions humanitaires"],
      72: ["Attentats du 11 septembre 2001, dialogue des civilisations", "Pape Jean-Paul II dialogue avec toutes les religions", "Islam, paix et développement en Afrique"],
      73: ["Printemps arabe et quête de dignité et de liberté (2011)", "Dialogue interreligieux de l'ONU et de l'UNESCO", "Islam en Occident : concitoyenneté et valeurs universelles"],
      74: ["COVID-19 : prières collectives mondiales (2020)", "Dialogue des religions pour la paix mondiale", "Foi et justice sociale : mouvements contemporains"],
      75: ["Renouveau spirituel dans la jeunesse africaine", "Islam et christianisme en Afrique : fraternité", "Traditions ancestrales africaines reconnues UNESCO"],
      76: ["Foi et identité pour la diaspora africaine", "Spiritualité africaine contemporaine", "Dialogue entre tradition et modernité"],
      77: ["Islam et modernité en Guinée", "Traditions religieuses guinéennes préservées", "Fraternité islamo-chrétienne en Afrique de l'Ouest"],
      78: ["Confréries soufies de Guinée : Tijaniyya, Qadiriyya", "Chefs religieux guinéens, guides des communautés", "Pèlerinages et retraites spirituelles en Guinée"],
      79: ["El Hadj Oumar Tall, grand réformateur islamique du Sahel", "Thierno Aliou Bah, grand savant de Guinée (1844-1927)", "Almamis du Fouta Djallon, gouvernance islamique"],
      80: ["Samori Touré mène son djihad au nom de la foi islamique", "Menelik II protège l'Église orthodoxe d'Éthiopie", "Résistances au nom de la dignité humaine et de la foi"],
      81: ["Ahmadou Bamba fonde la Mouridiyya au Sénégal (1883)", "Tijaniyya d'Al-Hajj Umar, confrérie soufie ouest-africaine", "Mohammed Abduh appelle à la réforme islamique (1899)"],
      82: ["Islam panafricain : Marcus Garvey et la spiritualité africaine-américaine", "Mouvement rastafari (Jamaïque, 1930)", "Christianisme africain-américain : liberté et dignité"],
      83: ["Islam en Asie : Gandhi et la coexistence religieuse", "Ho Chi Minh et la spiritualité du peuple vietnamien", "Laïcité en Turquie (Atatürk, 1923)"],
      84: ["Fanon : critique de la religion comme outil colonial", "Nyerere : foi et socialisme africain (ujamaa)", "Islam africain et identité post-coloniale"],
      85: ["Festival Mondial des Arts Nègres, Dakar (1966) : spiritualité africaine", "Senghor : foi catholique et négritude", "Traditionalisme et modernité en Afrique"],
      86: ["Fela Kuti et la critique spirituelle de l'injustice", "Youssou N'Dour chante la foi et la paix", "Islam et arts dans l'Afrique contemporaine"],
      87: ["Sékou Touré : laïcité et identité africaine en Guinée", "Islam, développement et démocratie en Afrique", "Mouvements pentecôtistes en Afrique sub-saharienne"],
      88: ["Desmond Tutu : théologie de la réconciliation (1994)", "Commission Vérité et Réconciliation au nom de la foi", "Islam et Christianisme, frères en Afrique du Sud"],
      89: ["Wole Soyinka, foi yoruba et critique sociale littéraire", "Ngugi wa Thiong'o : foi africaine et résistance culturelle", "Spiritualités africaines reconnues patrimoine mondial"],
      90: ["Kofi Annan guide l'ONU vers la paix entre les religions (1997-2006)", "Wangari Maathai : foi en la Création et l'environnement", "Dialogue interreligieux de l'ONU pour la paix mondiale"],
      91: ["Obama : foi chrétienne et rassemblement des peuples", "Islam, christianisme et développement en Afrique", "Mouvements de justice sociale inspirés par la foi"],
      92: ["Burna Boy chante l'Afrique et sa spiritualité (Twice as Tall)", "Foi et identité africaine dans la diaspora mondiale", "Islam et christianisme en Afrique : fraternité réelle"],
      93: ["Mouvements de prière mondiale pendant COVID-19 (2020)", "Foi et justice climatique : laudato si', encyclique du pape", "Spiritualités autochtones reconnues par l'ONU"],
      94: ["Afrobeats comme expression de la foi et de la joie africaine", "Traditions spirituelles africaines dans la culture mondiale", "Dialogue des religions pour la paix et le développement"],
      95: ["Votre foi personnelle, vos prières, votre chemin spirituel", "Les traditions religieuses de votre famille", "Votre rapport à Dieu et à la spiritualité"],
      96: ["Votre génération porte la foi des générations passées", "Vos convictions spirituelles éclairent votre vie", "La foi transmise depuis Adam jusqu'à vous"]
    };
    return (relMap[gen] || ["Développement spirituel de l'humanité."]).slice(0, 4);
  };

  const getScientificAdvances = (gen: number): string[] => {
    const sciMap: Record<number, string[]> = {
      1:  ["Maîtrise du feu et premiers outils taillés", "Agriculture naissante : culture des céréales", "Premières formes d'habitat permanent"],
      2:  ["Poterie, cuisson des aliments", "Élevage des animaux (chèvres, moutons, bœufs)", "Tissage des premières étoffes (lin, laine)"],
      3:  ["Irrigation primitive des champs", "Observation des étoiles pour le calendrier agricole", "Premiers médicaments à base de plantes"],
      4:  ["Métallurgie du cuivre et du bronze naissante (Tubal-Caïn)", "Premières forges et outils en métal", "Calendrier lunaire et observation astronomique"],
      5:  ["Construction navale primitive", "Premières routes et pistes commerciales", "Mesure du temps par observation du soleil"],
      6:  ["Construction de l'Arche : première ingénierie navale monumentale", "Préservation des espèces vivantes, premier acte de conservation", "Calendrier et mesure des inondations"],
      7:  ["Fondation de Sumer : premières cités avec égouts (~3500 av. J.-C.)", "Roue inventée en Mésopotamie (~3500 av. J.-C.)", "Écriture pictographique précurseur du cunéiforme (~3200 av. J.-C.)"],
      8:  ["Écriture cunéiforme complète (~3000 av. J.-C.)", "Mathématiques de base : addition, multiplication", "Astronomie babylonienne : observation des planètes"],
      9:  ["Métallurgie du bronze avancée en Mésopotamie", "Navigation maritime des Phéniciens en Méditerranée", "Premières cartes géographiques"],
      10: ["Pyramides de Gizeh : chef-d'œuvre d'ingénierie (~2560 av. J.-C.)", "Papyrus égyptien : support d'écriture léger", "Médecine égyptienne : Imhotep, premier médecin historique"],
      11: ["Code de Hammurabi : première loi codifiée (~1792 av. J.-C.)", "Mathématiques égyptiennes : géométrie du Nil", "Textes médicaux de l'Égypte ancienne (Edwin Smith)"],
      12: ["Charrue et irrigation avancée en Mésopotamie", "Mesure du temps : horloge à eau (clepsydre)", "Commerce maritime de l'Inde à la Méditerranée (route de l'Indus)"],
      13: ["Sidérurgie hittite : premières armes en fer (~1300 av. J.-C.)", "Traité de Kadesh : première diplomatie internationale (1259 av. J.-C.)", "Papyrus Ebers : traité médical le plus ancien (~1550 av. J.-C.)"],
      14: ["Alphabet phénicien (~1050 av. J.-C.) : révolution de l'écriture", "Navigation astronomique phénicienne en haute mer", "Extraction du verre soufflé et de la pourpre"],
      15: ["Calendrier hébraïque lunaire-solaire", "Systèmes d'irrigation en Canaan", "Navigation phénicienne jusqu'en Afrique de l'Ouest"],
      16: ["Architecture du Temple de Salomon avec bois de cèdre du Liban", "Extraction minière et forge en Israël", "Premières routes commerciales Méditerranée-Arabie"],
      17: ["Temple de Salomon, exploit architectural de l'Antiquité", "Commerce maritime de Salomon jusqu'à Ophir (Afrique)", "Mathématiques et astronomie phéniciennes"],
      18: ["Médecine assyrienne et babylonienne", "Astronomie de Babylone : prédiction des éclipses (~700 av. J.-C.)", "Jardins suspendus de Babylone, merveille d'irrigation"],
      19: ["Astronomie babylonienne avancée (cycles de Saros)", "Médecine perse et mésopotamienne", "Premières formes de chirurgie"],
      20: ["Mathématiques persanes et astronomie de Zoroastre", "Routes royales perses : premières autoroutes de l'Antiquité", "Médecine hippocratique naissante"],
      21: ["Mathématiques de Pythagore (~570 av. J.-C.) : théorème universel", "Astronomie de Thalès : prédiction des éclipses (585 av. J.-C.)", "Philosophie naturelle : Anaximandre, Héraclite"],
      22: ["Médecine de Sushruta (chirurgie en Inde ~600 av. J.-C.)", "Mathématiques de l'Inde ancienne : zéro et décimaux", "Astronomie chinoise : premières cartes stellaires"],
      23: ["Hérodote : méthode historique et enquête géographique", "Hippocrate fonde la médecine rationnelle (~460 av. J.-C.)", "Archéologie naissante : Hérodote visite les pyramides"],
      24: ["Hippocrate : serment médical et éthique médicale", "Géographie d'Hérodote, description des peuples du monde", "Architecture du Parthénon : mathématiques et esthétique"],
      25: ["Médecine d'Hippocrate : observation, diagnostic, traitement", "Atomisme de Démocrite : matière faite d'atomes (~460 av. J.-C.)", "Géométrie et logique de Platon"],
      26: ["Aristote fonde la biologie, la physique, la logique (~350 av. J.-C.)", "Alexandre ouvre l'Orient aux savoirs grecs, persans et indiens", "Bibliothèque d'Alexandrie : premier centre mondial du savoir (331 av. J.-C.)"],
      27: ["Géométrie d'Euclide : Les Éléments (~300 av. J.-C.)", "Archimède : poussée, levier, pi (~287 av. J.-C.)", "Eratosthène mesure la circonférence de la Terre (~240 av. J.-C.)"],
      28: ["Astronomie d'Hipparque : catalogues stellaires (~190 av. J.-C.)", "Ingénierie romaine : aqueducs, ponts, routes, égouts", "Médecine de Galien, base de la médecine mondiale (129-216)"],
      29: ["Astronomie ptolémaïque, modèle géocentrique (~100 ap. J.-C.)", "Ingénierie romaine au sommet : Colisée, Panthéon", "Médecine de Celse (encyclopédiste médical romain)"],
      30: ["Ptolémée : Almageste, base de l'astronomie pour 1400 ans", "Galien révolutionne l'anatomie et la médecine (129-216)", "Ingénierie hydraulique romaine : thermae et fontaines"],
      31: ["Galien : anatomie humaine et théorie des humeurs", "Ptolémée : cartographie mondiale (Géographie ~150)", "Diophante : algèbre symbolique (~250)"],
      32: ["Diophante d'Alexandrie fonde l'algèbre (~280)", "Papyrus Rhind : mathématiques égyptiennes traduites", "Astronomie de Porphyre et néoplatoniciens"],
      33: ["Premières universités chrétiennes (Édesse, Beyrouth, Alexandrie)", "Architecture de Sainte-Sophie, exploit d'ingénierie (532-537)", "Astronomie et mathématiques dans les monastères"],
      34: ["Conservation des textes grecs dans les monastères", "Médecine byzantine : hôpitaux fondés (Basileias, ~370)", "Hypatia enseigne les mathématiques et l'astronomie à Alexandrie"],
      35: ["Agriculture médiévale améliorée : assolement triennal", "Architecture en pierre des cathédrales romanes", "Navigation des Vikings : longships et orientation stellaire"],
      36: ["Code Justinien : codification du droit (529)", "Architecture de Sainte-Sophie : coupole révolutionnaire (537)", "Premières encyclopédies : Isidore de Séville (~630)"],
      37: ["Boèce traduit et transmet les mathématiques grecques (524)", "Premières horloges mécaniques dans les monastères", "Agriculture améliorée en Europe par les moines"],
      38: ["Coran contient des connaissances sur l'astronomie et la biologie", "Médecine arabe naissante (Ibn Abi Usaybi'a)", "Mathématiques arabes héritées de l'Inde et de la Grèce"],
      39: ["Transmission des sciences grecques en arabe", "Premières universités islamiques (Masjid al-Qarawiyyin, 859)", "Mathématiques : introduction du zéro indien en Islam"],
      40: ["Al-Kindi (~801-873) : optique, médecine, philosophie", "Algèbre naissante des mathématiciens arabes", "Astronomie islamique : observatoires à Bagdad"],
      41: ["Al-Khwarizmi invente l'algèbre et l'algorithmique (830)", "Al-Battani calcule l'obliquité de l'écliptique (~900)", "Premières encyclopédies islamiques de médecine"],
      42: ["Maison de la Sagesse traduit tout le savoir grec en arabe", "Al-Kindi : 267 œuvres scientifiques, fondateur de la science arabe", "Jabir ibn Hayyan (~721-815) : chimie expérimentale"],
      43: ["Al-Razi/Rhazes (854-925) : médecine clinique et variole", "Al-Farabi (~872-950) : musique et philosophie des sciences", "Al-Masudi : géographie mondiale (~896-956)"],
      44: ["Ibn Sina/Avicenne (980-1037) : Canon de la Médecine, référence mondiale", "Al-Biruni (973-1048) : mesure de la Terre, géologie, ethnologie", "Ibn al-Haytham (965-1040) : Livre de l'Optique, base de la physique optique"],
      45: ["Omar Khayyam : algèbre, réforme du calendrier perse (1048-1131)", "Al-Ghazali (1058-1111) : logique et épistémologie islamique", "Al-Idrisi (1100-1165) : Tabula Rogeriana, carte du monde médiéval"],
      46: ["Roger Bacon prône l'expérimentation scientifique (~1214-1292)", "Architecture gothique : calcul des voûtes et arcs-boutants", "Médecine médiévale : Ibn Rushd commente Galien"],
      47: ["Ibn al-Nafis (1213-1288) : découvre la circulation pulmonaire", "Médecine islamique d'Al-Andalus au sommet", "Universités de Bologne, Oxford, Paris : naissance de l'université"],
      48: ["Roger Bacon : lunettes, poudre à canon, méthode scientifique (~1260)", "Mathématiques de Fibonacci (1170-1250) : chiffres arabes en Europe", "Architecture gothique : Chartres, Notre-Dame de Paris"],
      49: ["Marco Polo documente la technologie chinoise (boussole, papier, poudre)", "Ibn Khaldun fonde la sociologie et la philosophie de l'histoire (1332-1406)", "Observation astronomique arabe avancée"],
      50: ["Gutenberg invente l'imprimerie (~1450) : révolution du savoir", "Léonard de Vinci : anatomie, machines volantes, hydraulique (1452-1519)", "Regiomontanus : trigonométrie moderne (~1436-1476)"],
      51: ["Copernic : théorie héliocentrique (1543)", "Léonard de Vinci : anatomie humaine par dissection", "Cartes nautiques de Vasco de Gama et Colomb"],
      52: ["Vasco de Gama ouvre la route des Indes (1498)", "Amérique découverte et géographie mondiale redessinée (1492)", "Invention de l'imprimerie appliquée à la Bible (~1456)"],
      53: ["Copernic publie De Revolutionibus (1543)", "Vésale fonde l'anatomie moderne (De humani corporis fabrica, 1543)", "Paracelse révolutionne la médecine et la chimie"],
      54: ["Galilée améliore le télescope et observe les lunes de Jupiter (1609)", "Kepler formule les lois du mouvement planétaire (1609-1619)", "William Harvey découvre la circulation sanguine (1628)"],
      55: ["Descartes fonde les mathématiques cartésiennes (~1637)", "Pascal invente la calculatrice mécanique (1642)", "Torricelli invente le baromètre (1643)"],
      56: ["Newton : lois de la gravitation universelle et calcul (1687)", "Leibniz invente le calcul infinitésimal (1675)", "Robert Hooke observe les cellules au microscope (1665)"],
      57: ["Celsius crée l'échelle thermométrique (1742)", "Linnée classe les espèces vivantes (1735)", "Euler révolutionne les mathématiques (topologie, graphes, 1736)"],
      58: ["Lavoisier fonde la chimie moderne et découvre l'oxygène (1777)", "Watt perfectionne la machine à vapeur (1769)", "Franklin découvre la nature électrique de la foudre (1752)"],
      59: ["Lamarck propose l'évolution des espèces (1809)", "Gauss révolutionne les mathématiques et la physique (1777-1855)", "John Dalton fonde la théorie atomique moderne (1803)"],
      60: ["Darwin : L'Origine des espèces (1859)", "Pasteur : microbiologie et vaccins (1857-1885)", "Faraday découvre l'électromagnétisme (1831)"],
      61: ["Maxwell formule les équations de l'électromagnétisme (1864)", "Mendeleïev crée le tableau périodique (1869)", "Bell invente le téléphone (1876)"],
      62: ["Pasteur développe le vaccin contre la rage (1885)", "Röntgen découvre les rayons X (1895)", "Tesla invente le moteur à courant alternatif (1888)"],
      63: ["Marie Curie découvre le radium et le polonium (1898)", "Freud fonde la psychanalyse (1900)", "Premiers vols motorisés (Frères Wright, 1903)"],
      64: ["Einstein publie la relativité restreinte (1905)", "Planck fonde la physique quantique (1900)", "Hubble démontre l'expansion de l'univers (1929)"],
      65: ["Einstein : relativité générale (1915)", "Bohr et Heisenberg : mécanique quantique (1925)", "Fleming découvre la pénicilline (1928)"],
      66: ["Turing : machine universelle, fondement de l'informatique (1936)", "Premier antibiotique utilisé en médecine (pénicilline, 1940)", "Cheikh Anta Diop démontre l'origine africaine de la civilisation (1954)"],
      67: ["Structure de l'ADN découverte par Watson, Crick, Franklin (1953)", "Premier satellite artificiel (Spoutnik, 1957)", "Premier vol habité dans l'espace (Gagarine, 1961)"],
      68: ["Premier pas sur la Lune (Apollo 11, 1969)", "Premiers ordinateurs personnels (1970s)", "Thérapie génique et biotechnologies naissantes"],
      69: ["Réseaux informatiques ARPANET (précurseur d'Internet, 1969)", "Révolution verte : semences améliorées contre la famine", "Énergie solaire et renouvelables naissantes"],
      70: ["Naissance d'Internet (1983) et du World Wide Web (1991)", "Génome humain séquencé partiellement (1990s)", "Téléphonie mobile mondiale"],
      71: ["Tim Berners-Lee invente le Web (1991)", "Séquençage du génome humain (2003)", "Thérapies géniques contre le cancer"],
      72: ["Séquençage complet du génome humain (2003)", "Smartphones révolutionnent la communication (iPhone, 2007)", "Énergies renouvelables en expansion mondiale"],
      73: ["Intelligence artificielle : AlphaGo bat le champion de jeu de go (2016)", "Premières thérapies CRISPR de modification du génome (2012)", "Voitures électriques et autonomes (Tesla, 2010s)"],
      74: ["Vaccins à ARNm contre le COVID-19 (Pfizer, Moderna, 2020)", "Télescope James Webb observe les confins de l'univers (2021)", "Intelligence artificielle générative (GPT-4, 2023)"],
      75: ["IA générative révolutionne toutes les disciplines (2023)", "Fusion nucléaire : première réaction positive (NIF, 2022)", "Agriculture africaine numérique et drones pour les semis"],
      76: ["Informatique quantique (IBM, Google, 2020s)", "Médecine personnalisée basée sur le génome", "Satellites africains et souveraineté spatiale"],
      77: ["Guinée : ressources minières et développement technologique", "Agriculture améliorée en Afrique de l'Ouest", "Télécommunications mobiles en Afrique rurale"],
      78: ["Musique guinéenne : instruments ancestraux (kora, balafon, djembé)", "Techniques de forge africaine transmises depuis des générations", "Pharmacopée traditionnelle africaine"],
      79: ["Savants islamiques de Tombouctou : mathématiques et astronomie", "Médecine traditionnelle du Fouta Djallon", "Architecture en banco des mosquées sahéliennes"],
      80: ["Résistance africaine aux armes européennes : tactiques militaires ingénieuses", "Médecine traditionnelle africaine contre les épidémies coloniales", "Navigation des fleuves et des côtes africaines"],
      81: ["Islam et développement des sciences en Afrique de l'Ouest", "Cheikh Ahmadou Bamba : pensée soufie et science spirituelle", "Agriculture et hydraulique en Afrique sahélienne"],
      82: ["Radio et télécommunications révolutionnent le monde (1900s)", "Avion des frères Wright (1903), début de l'aviation mondiale", "Automobile (Ford Model T, 1908) : révolution des transports"],
      83: ["Pénicilline utilisée en masse contre les infections (1940s)", "Bombe atomique et énergie nucléaire (1945)", "Radar et premières formes d'informatique"],
      84: ["ADN découvert comme structure hélicoïdale (1953)", "Vaccin contre la polio (Salk, 1955)", "Énergies fossiles et révolution pétrolière"],
      85: ["Satellites et télécommunications mondiales (1960s)", "Médecine : transplantation cardiaque (1967)", "Révolution verte contre la famine mondiale (1960s)"],
      86: ["Ordinateurs personnels (Apple, IBM, 1970-80s)", "Éradication de la variole par l'OMS (1980)", "IRM et scanner révolutionnent la médecine (1980s)"],
      87: ["Internet naissant (ARPANET, 1969 → Internet, 1983)", "Génie génétique : premières manipulations génétiques (1973)", "Énergie solaire et éolienne en développement"],
      88: ["HIV/SIDA découvert, mobilisation scientifique mondiale (1983)", "Thérapies antirétrovirales transforment le SIDA (1996)", "Biotechnologies agricoles en Afrique du Sud"],
      89: ["Téléphonie mobile mondiale (1990s)", "Séquençage du génome humain lancé (1990)", "Découverte des exoplanètes (1995)"],
      90: ["Séquençage complet du génome humain (2003)", "Nanotechnologies médicales naissantes", "Smartphones et révolution numérique (2000s)"],
      91: ["Intelligence artificielle profonde (Deep Learning, 2010s)", "CRISPR : modification précise du génome (2012)", "Voitures électriques et autonomes"],
      92: ["Vaccins à ARNm contre le COVID-19 (2020)", "Télescope James Webb (2021) : confins de l'univers", "IA générative : ChatGPT, Claude (2022-2023)"],
      93: ["Fusion nucléaire positive (NIF, 2022)", "Informatique quantique en développement accéléré", "Médecine personnalisée basée sur l'ADN individuel"],
      94: ["IA dans tous les domaines : médecine, art, science, éducation (2024)", "Satellites africains et souveraineté spatiale du continent", "Énergies renouvelables dominantes en Afrique"],
      95: ["Vous vivez la révolution de l'intelligence artificielle", "Biotechnologies et médecine de précision sont votre quotidien", "Votre génération résoudra les grands défis de l'humanité"],
      96: ["L'intelligence artificielle, l'espace et la biologie sont votre terrain", "Vous héritez du savoir de 96 générations pour bâtir l'avenir", "L'humanité compte sur vous pour les prochains défis"]
    };
    return (sciMap[gen] || ["Avancée scientifique de l'humanité."]).slice(0, 4);
  };

  // Ressources réelles (articles/images/vidéos) soigneusement choisies pour éviter toute apparition de cheveux féminins
  function getRealResources(genId: number): { title: string; url: string; type: 'article' | 'image' | 'video' }[] {
    // Reorganisation par grandes périodes
    if (genId >= 1 && genId <= 10) {
      return [
        { title: "Tablettes d'écriture cunéiforme (Musée britannique)", url: "https://www.britishmuseum.org/collection/object/W_1923-1112-1", type: 'image' },
        { title: "Grottes de Lascaux (art rupestre)", url: "https://www.lascaux.fr/fr", type: 'article' },
        { title: "Manuscrits de la mer Morte (bibliothèque numérique)", url: "https://www.deadseascrolls.org.il/", type: 'image' }
      ]
    }
    if (genId >= 11 && genId <= 20) {
      return [
        { title: "Pyramides d'Égypte (Musée d'Égypte)", url: "https://egypt-museum.com/", type: 'article' },
        { title: "Ziggourat d'Ur (restitution et fouilles)", url: "https://oi.uchicago.edu/research/projects/ur-ancient-city-mesopotamia", type: 'article' },
        { title: "Hiéroglyphes et stèles (Musée du Louvre)", url: "https://collections.louvre.fr/", type: 'image' }
      ]
    }
    if (genId >= 21 && genId <= 40) {
      return [
        { title: "Parthénon et art classique (Musée de l'Acropole)", url: "https://www.theacropolismuseum.gr/en", type: 'image' },
        { title: "Empire achéménide à Persépolis (ICHTO Iran)", url: "https://whc.unesco.org/en/list/114/", type: 'article' },
        { title: "Bouddhisme ancien — stupas et manuscrits", url: "https://www.britannica.com/topic/stupa", type: 'article' }
      ]
    }
    if (genId >= 41 && genId <= 60) {
      return [
        { title: "Manuscrits bibliques et évangéliaires (Gallica)", url: "https://gallica.bnf.fr/accueil/fr/content/accueil-fr?mode=desktop", type: 'image' },
        { title: "Calligraphie et Corans anciens (Musée d'art islamique)", url: "https://mia.org.qa/en/", type: 'image' },
        { title: "Hégire et premiers siècles de l'Islam (UNESCO)", url: "https://fr.unesco.org/silkroad/", type: 'article' }
      ]
    }
    if (genId >= 61 && genId <= 80) {
      return [
        { title: "Codex de Léonard de Vinci (Bibliothèque britannique)", url: "https://www.bl.uk/collection-guides/leonardo-da-vinci", type: 'image' },
        { title: "Observations de Galilée (Sidereus Nuncius)", url: "https://brunelleschi.imss.fi.it/galileopalazzo/", type: 'article' },
        { title: "Mali impérial: Mansa Musa et Tombouctou (UNESCO)", url: "https://whc.unesco.org/fr/list/119/", type: 'article' }
      ]
    }
    if (genId >= 81 && genId <= 96) {
      return [
        { title: "Manuscrits de Tombouctou (bibliothèques)", url: "https://www.hypotheses.org/31606", type: 'image' },
        { title: "Discours de Mandela (Fondation Nelson Mandela)", url: "https://www.nelsonmandela.org/collections/digital-archives", type: 'article' },
        { title: "Archives coloniales et indépendances (INA)", url: "https://www.ina.fr/", type: 'video' }
      ]
    }
    // Défaut — ressources généralistes fiables
    return [
      { title: "UNESCO — Patrimoine mondial", url: "https://whc.unesco.org/fr/list/", type: 'article' },
      { title: "Musée britannique — Collections", url: "https://www.britishmuseum.org/collection", type: 'image' },
      { title: "Bibliothèque nationale de France — Gallica", url: "https://gallica.bnf.fr/", type: 'article' }
    ]
  }


  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Chargement de l'histoire...</div>
        </div>
      </div>
    );
  }

  if (!userData) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📜 Chronique des origines</h1>
              <p className="mt-1 text-gray-600">{userData.prenom} — Génération {userData.generation || '96'} · Vous commencez ici à écrire votre histoire</p>
              <p className="mt-1 text-xs text-amber-700 font-semibold bg-amber-50 inline-block px-2 py-0.5 rounded">
                📜 Gén. 1–95 : racontées par d'autres à leur place · Gén. 96 : chacun raconte sa propre histoire
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/a-retenir')}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
              >
                ✍️ Écrire mon histoire (Gén. 96)
              </button>
              <button
                onClick={() => navigate('/histoire-humanite')}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors text-sm"
              >
                📖 Histoires publiées
              </button>
              <button
                onClick={() => navigate('/moi')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                ← Retour
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Toutes les sections sur une seule page */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Section Générations */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <span>📜</span>
              <span>Les 95 premières générations — Traditions ancestrales</span>
            </h2>
            <div className="mb-4 bg-amber-50 border-l-4 border-amber-400 px-4 py-3 rounded-r-lg">
              <p className="text-amber-800 text-sm font-semibold">
                📜 Ces générations (1 à 95) n'ont pas pu raconter leur histoire elles-mêmes. Ce sont d'autres personnes — historiens, transmetteurs, traditions religieuses et ancestrales — qui ont narré leur vie à leur place.
              </p>
              <p className="text-amber-700 text-xs mt-1">
                👉 <strong>Génération 96</strong> : pour la première fois, chaque personne est l'auteur de sa propre histoire. C'est votre tour — utilisez le bouton <em>"Écrire mon histoire"</em> ci-dessus.
              </p>
            </div>
              
              {/* Saut rapide vers une génération */}
              <div className="mb-6 flex gap-4 items-center">
                <label className="font-semibold">Aller à la génération:</label>
                <input
                  type="number"
                  min={1}
                  max={96}
                  placeholder="1 - 96"
                  value={searchGen}
                  onChange={(e) => setSearchGen(e.target.value)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => {
                    const n = parseInt(searchGen, 10);
                    if (!isNaN(n) && n >= 1 && n <= 96) {
                      const found = generations.find(g => g.id === n);
                      if (found) setSelectedGeneration(found);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Voir
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {generations.map(gen => (
                  gen.id === 96 ? (
                    /* ── Génération 96 : spéciale "Votre histoire" ── */
                    <div
                      key={gen.id}
                      className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-lg p-6 border-2 border-indigo-400 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 col-span-1 md:col-span-2 lg:col-span-3"
                      onClick={() => navigate('/a-retenir')}
                    >
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">✍️</span>
                          <div>
                            <h3 className="text-xl font-bold text-white">Génération 96 — Votre Histoire</h3>
                            <p className="text-indigo-200 text-xs">Aujourd'hui · La première génération à écrire sa propre histoire</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold bg-white text-indigo-700 px-3 py-1 rounded-full">G96 — Vous</span>
                      </div>
                      <p className="text-indigo-100 text-sm mb-4">{gen.description}</p>
                      <div className="flex items-center gap-3">
                        <span className="inline-block px-4 py-2 bg-white text-indigo-700 font-bold rounded-lg text-sm shadow hover:bg-indigo-50 transition-colors">
                          ✍️ Écrire mon histoire maintenant →
                        </span>
                        <span className="text-indigo-200 text-xs">Vous êtes l'auteur — personne d'autre ne le fera à votre place</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={gen.id}
                      className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-6 border border-amber-200 hover:shadow-lg transition-all duration-300 cursor-pointer"
                      onClick={() => setSelectedGeneration(gen)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xl font-bold text-gray-900">{gen.name}</h3>
                        <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded-full">
                          {gen.id}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{gen.period}</p>
                      <p className="text-gray-600 text-sm mb-3">{gen.description}</p>
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">
                          📅 {gen.keyEvents[0]}
                        </div>
                        <div className="text-xs text-gray-500">
                          👑 {gen.importantFigures[0]}
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>

        {/* Section Chronologie */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <span>📅</span>
              <span>Chronologie Générale de l'Humanité</span>
            </h2>
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                  <h3 className="text-xl font-bold text-blue-900 mb-2">🏛️ Antiquité (Générations 1-50)</h3>
                  <p className="text-blue-800">De Adam et Ève jusqu'à la chute de l'Empire romain</p>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                  <h3 className="text-xl font-bold text-green-900 mb-2">🕌 Moyen Âge (Générations 51-70)</h3>
                  <p className="text-green-800">De l'expansion de l'Islam jusqu'à la Renaissance</p>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-6 border border-purple-200">
                  <h3 className="text-xl font-bold text-purple-900 mb-2">⚙️ Époque Moderne (Générations 71-90)</h3>
                  <p className="text-purple-800">De la Révolution industrielle aux guerres mondiales</p>
                </div>
                <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6 border border-orange-200">
                  <h3 className="text-xl font-bold text-orange-900 mb-2">🌍 Époque Contemporaine (Générations 91-96)</h3>
                  <p className="text-orange-800">De la mondialisation à nos jours</p>
                </div>
              </div>
            </div>
          </div>

        {/* Section Personnages */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <span>👑</span>
              <span>Grandes Figures de l'Histoire</span>
            </h2>
              
        <div className="space-y-8">
                {/* Prophètes */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    🕌 Prophètes et Messagers Divins
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-bold text-blue-900">Adam (Prophète)</h4>
                      <p className="text-sm text-blue-800">Premier homme et prophète selon la tradition</p>
                      <span className="text-xs text-blue-600">Génération 1</span>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-bold text-blue-900">Noé (Prophète)</h4>
                      <p className="text-sm text-blue-800">Prophète du Déluge et constructeur de l'Arche</p>
                      <span className="text-xs text-blue-600">Génération 6</span>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-bold text-blue-900">Abraham (Prophète)</h4>
                      <p className="text-sm text-blue-800">Père des trois religions monothéistes</p>
                      <span className="text-xs text-blue-600">Génération 8</span>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-bold text-blue-900">Moïse (Prophète)</h4>
                      <p className="text-sm text-blue-800">Libérateur d'Israël et receveur des Tables de la Loi</p>
                      <span className="text-xs text-blue-600">Génération 12</span>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-bold text-blue-900">Jésus-Christ (Prophète)</h4>
                      <p className="text-sm text-blue-800">Messie et fondateur du christianisme</p>
                      <span className="text-xs text-blue-600">Génération 44</span>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-bold text-blue-900">Muhammad (PBSL)</h4>
                      <p className="text-sm text-blue-800">Dernier prophète et fondateur de l'Islam</p>
                      <span className="text-xs text-blue-600">Génération 52</span>
                    </div>
                  </div>
                </div>

                {/* Figures Africaines */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    🌍 Figures Africaines Importantes
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                      <h4 className="font-bold text-green-900">Soundiata Keita (Empereur)</h4>
                      <p className="text-sm text-green-800">Fondateur de l'Empire du Mali</p>
                      <span className="text-xs text-green-600">Génération 65</span>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                      <h4 className="font-bold text-green-900">Mansa Musa (Empereur)</h4>
                      <p className="text-sm text-green-800">Empereur du Mali, l'homme le plus riche de l'histoire</p>
                      <span className="text-xs text-green-600">Génération 68</span>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                      <h4 className="font-bold text-green-900">Samori Touré (Résistant)</h4>
                      <p className="text-sm text-green-800">Résistant et fondateur de l'Empire Wassoulou</p>
                      <span className="text-xs text-green-600">Génération 78</span>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                      <h4 className="font-bold text-green-900">El Hadj Oumar Tall (Chef religieux)</h4>
                      <p className="text-sm text-green-800">Chef religieux et conquérant peulh</p>
                      <span className="text-xs text-green-600">Génération 76</span>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                      <h4 className="font-bold text-green-900">Ahmadou Bamba (Chef religieux)</h4>
                      <p className="text-sm text-green-800">Fondateur du mouridisme</p>
                      <span className="text-xs text-green-600">Génération 79</span>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                      <h4 className="font-bold text-green-900">Sékou Touré (Président)</h4>
                      <p className="text-sm text-green-800">Premier président de la Guinée</p>
                      <span className="text-xs text-green-600">Génération 85</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Section Culture */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <span>🎭</span>
              <span>Développement Culturel de l'Humanité</span>
            </h2>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">🏛️ Arts et Architecture</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
                      <h4 className="font-bold text-purple-900">Art Rupestre</h4>
                      <p className="text-sm text-purple-800">Premières expressions artistiques de l'humanité</p>
                      <span className="text-xs text-purple-600">Générations 1-5</span>
                  </div>
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
                      <h4 className="font-bold text-purple-900">Architecture Monumentale</h4>
                      <p className="text-sm text-purple-800">Pyramides, ziggourats, temples</p>
                      <span className="text-xs text-purple-600">Générations 11-20</span>
                        </div>
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
                      <h4 className="font-bold text-purple-900">Art Islamique</h4>
                      <p className="text-sm text-purple-800">Calligraphie, géométrie, architecture mauresque</p>
                      <span className="text-xs text-purple-600">Générations 51-60</span>
                      </div>
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
                      <h4 className="font-bold text-purple-900">Renaissance</h4>
                      <p className="text-sm text-purple-800">Renaissance artistique européenne</p>
                      <span className="text-xs text-purple-600">Générations 61-70</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">🌍 Cultures Africaines</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200">
                      <h4 className="font-bold text-orange-900">Empires Peulhs</h4>
                      <p className="text-sm text-orange-800">Macina, Sokoto, Fouta Djallon</p>
                      <span className="text-xs text-orange-600">Générations 70-80</span>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200">
                      <h4 className="font-bold text-orange-900">Empires Malinkés</h4>
                      <p className="text-sm text-orange-800">Mali, Songhaï, Kaabu</p>
                      <span className="text-xs text-orange-600">Générations 65-75</span>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200">
                      <h4 className="font-bold text-orange-900">Traditions Oratoires</h4>
                      <p className="text-sm text-orange-800">Griots, épopées, contes</p>
                      <span className="text-xs text-orange-600">Toutes générations</span>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200">
                      <h4 className="font-bold text-orange-900">Artisanat Traditionnel</h4>
                      <p className="text-sm text-orange-800">Bogolan, sculpture, tissage</p>
                      <span className="text-xs text-orange-600">Toutes générations</span>
                    </div>
                  </div>
                </div>
              </div>
        </div>
          </div>
      </div>

      {/* Modal de détail d'une génération */}
      {selectedGeneration && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                  <h2 className="text-3xl font-bold mb-2">{selectedGeneration.name}</h2>
                  <p className="text-lg opacity-90">{selectedGeneration.period}</p>
              </div>
              <button
                  onClick={() => setSelectedGeneration(null)}
                className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors duration-200"
              >
                ✕ Fermer
              </button>
            </div>
          </div>
          
          <div className="p-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">📝 Description</h3>
                  <p className="text-gray-700">{selectedGeneration.description}</p>
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">📅 Événements Clés</h3>
                  <ul className="space-y-2">
                    {selectedGeneration.keyEvents.map((event, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        <span className="text-gray-700">{event}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">👑 Personnages Importants</h3>
                  <ul className="space-y-2">
                    {selectedGeneration.importantFigures.map((figure, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span>
                        <span className="text-gray-700">{figure}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">🎭 Développements Culturels</h3>
                  <ul className="space-y-2">
                    {selectedGeneration.culturalDevelopments.map((dev, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-purple-500 mt-1">•</span>
                        <span className="text-gray-700">{dev}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">🕌 Événements Religieux</h3>
                  <ul className="space-y-2">
                    {selectedGeneration.religiousEvents.map((event, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-indigo-500 mt-1">•</span>
                        <span className="text-gray-700">{event}</span>
                      </li>
                    ))}
                  </ul>
            </div>
            
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">🔬 Avancées Scientifiques</h3>
                  <ul className="space-y-2">
                    {selectedGeneration.scientificAdvances.map((advance, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-red-500 mt-1">•</span>
                        <span className="text-gray-700">{advance}</span>
                      </li>
                    ))}
                  </ul>
              </div>

                {/* Ressources réelles */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">🔗 Ressources réelles</h3>
                  <ul className="space-y-2">
                    {getRealResources(selectedGeneration.id).map((r, idx) => (
                      <li key={idx}>
                        <a href={r.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-2">
                          {r.type === 'article' ? '📄' : r.type === 'image' ? '🖼️' : '🎥'} {r.title}
                        </a>
                      </li>
                    ))}
                  </ul>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
  );
}