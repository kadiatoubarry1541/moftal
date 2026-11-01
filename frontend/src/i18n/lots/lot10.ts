import type { Lot } from "./type";
// « texte français » → [anglais, arabe, mandingue, pular]
// École pour tous (« apprenant ») : lien de l'application, espace enseignant complet
const lot: Lot = {
  "Application de {ecole}": ["{ecole} app", "تطبيق {ecole}", "{ecole} ka porogaramu", "Jaaɓnirgal {ecole}"],
  "Aucun apprenant dans cette classe pour le moment.": ["No learners in this class yet.", "لا يوجد متعلمون في هذا الصف بعد.", "Kalanden si tɛ nin kalanso la fɔlɔ.", "Alaa jaŋngoowo e ndee suudu tawo."],
  "Aucun apprenant relié à votre compte pour le moment.": ["No learner linked to your account yet.", "لا يوجد متعلم مرتبط بحسابك بعد.", "Kalanden si ma siri i ka jatɔ la fɔlɔ.", "Alaa jaŋngoowo jokkondiraaɗo e konte maa tawo."],
  "Aucune classe ne vous est attribuée pour le moment.": ["No class is assigned to you yet.", "لم يُسند إليك أي صف بعد.", "Kalanso si ma di i ma fɔlɔ.", "Alaa suudu jaŋde hokkaaɗo-ma tawo."],
  "Aujourd'hui": ["Today", "اليوم", "Bi", "Hannde"],
  "aujourd'hui": ["today", "اليوم", "bi", "hannde"],
  "Avis parents/apprenants": ["Parent/learner reviews", "آراء الأولياء والمتعلمين", "Bangebagaw ni kalandenw ka miiriyaw", "Miijooji jibinɓe e jaŋngooɓe"],
  "Bonjour {prenom} ! {ecole} vous a ajouté(e) comme {role} dans son application. Ouvrez ce lien, connectez-vous avec votre numéro{tel} (la première fois, vous choisissez votre mot de passe), puis installez l'application : {lien}": [
    "Hello {prenom}! {ecole} has added you as {role} in its app. Open this link, log in with your number{tel} (the first time, you choose your password), then install the app: {lien}",
    "مرحبًا {prenom}! أضافك {ecole} بصفة {role} في تطبيقه. افتح هذا الرابط، وسجّل الدخول برقمك{tel} (في المرة الأولى تختار كلمة المرور)، ثم ثبّت التطبيق: {lien}",
    "I ni ce {prenom} ! {ecole} y'i fara a ka porogaramu kan i n'a fɔ {role}. Nin sira da, i don ni i ka nimɔrɔ ye{tel} (siɲɛ fɔlɔ, i bɛ i ka gundo sugandi), o kɔ porogaramu sigi : {lien}",
    "On jaarama {prenom} ! {ecole} ɓeydii-ma no {role} e jaaɓnirgal mum. Uddit ngol laawol, naatu e limoore maa{tel} (laawol arandewol, a suɓoto finnde maa), refti aaf jaaɓnirgal ngal : {lien}"],
  "Envoyer le lien": ["Send the link", "إرسال الرابط", "Sira ci", "Neldu laawol"],
  "Envoyer le lien de l'application": ["Send the app link", "إرسال رابط التطبيق", "Porogaramu sira ci", "Neldu laawol jaaɓnirgal"],
  "Ex : 2026-0145": ["E.g. 2026-0145", "مثال: 2026-0145", "Misali : 2026-0145", "Misal : 2026-0145"],
  "La personne": ["The person", "الشخص", "Mɔgɔ in", "Neɗɗo on"],
  "Le matricule de votre établissement relie l'apprenant à ses parents : tapez-le en ajoutant le parent.": ["Your institution's registration number links the learner to their parents: type it when adding the parent.", "الرقم التسلسلي لمؤسستك يربط المتعلم بوالديه: اكتبه عند إضافة وليّ الأمر.", "I ka lakɔliso ka matirikili bɛ kalanden ni a bangebagaw siri : a sɛbɛn ka bangebaga fara a kan.", "Limoore binnditagol duɗal maa ina jokkondira jaŋngoowo e jibinɓe makko : winndu ɗum nde ɓeydaa jibinɗo."],
  "Les images parlent mieux : montrez vos locaux, vos apprenants en activité, vos fêtes et vos résultats. Elles apparaissent sur votre site, visible par tout le monde.": ["Pictures speak louder: show your premises, your learners at work, your events and results. They appear on your site, visible to everyone.", "الصور أبلغ: أظهر مقرك ومتعلميك أثناء النشاط واحتفالاتك ونتائجك. تظهر على موقعك للجميع.", "Jaw bɛ kuma ka fisa : i ka yɔrɔw, i ka kalandenw baara la, i ka seliw ani i ka jɛtaw jira. U bɛ bɔ i ka siti kan, bɛɛ bɛ u ye.", "Nate ɓuri haalde : hollu nokku maa, jaŋngooɓe maa e golle, juulde maa e ɓeydaari maa. Ɗe ina feeña e lowre maa, kala ina yi'a."],
  "Les livres PDF de l'établissement. Seuls ses membres (enseignants, apprenants, parents) peuvent les lire.": ["The institution's PDF books. Only its members (teachers, learners, parents) can read them.", "كتب PDF الخاصة بالمؤسسة. لا يقرؤها إلا أعضاؤها (معلمون، متعلمون، أولياء).", "Lakɔliso ka PDF gafew. A mɔgɔw dɔrɔn (karamɔgɔw, kalandenw, bangebagaw) bɛ se k'u kalan.", "Defte PDF duɗal ngal. Tergaal mum tan (jannginooɓe, jaŋngooɓe, jibinɓe) waawi jaŋngude ɗe."],
  "Lien": ["Link", "الرابط", "Sira", "Laawol"],
  "Matière à préciser dans l'emploi du temps": ["Subject to set in the timetable", "المادة تُحدد في جدول الحصص", "Kalansen ka sɛbɛn waati tabulo la", "Ganndal ngal ina winndee e ɗowgol saaɗi"],
  "Matricule *": ["Registration no. *", "الرقم التسلسلي *", "Matirikili *", "Limoore binnditagol *"],
  "Mes classes": ["My classes", "صفوفي", "N ka kalansow", "Suudu jaŋde am"],
  "Saisissez le matricule de l'apprenant (celui de votre établissement).": ["Enter the learner's registration number (your institution's).", "أدخل الرقم التسلسلي للمتعلم (رقم مؤسستك).", "Kalanden ka matirikili sɛbɛn (i ka lakɔliso ta).", "Winndu limoore binnditagol jaŋngoowo (ndee duɗal maa)."],
  "Votre emploi du temps n'est pas encore rempli. Le directeur le remplit dans chaque classe.": ["Your timetable is not filled in yet. The head fills it in for each class.", "جدول حصصك لم يُملأ بعد. يملؤه المدير لكل صف.", "I ka waati tabulo ma fa fɔlɔ. Ɲɛmɔgɔ b'a fa kalanso kelen-kelen bɛɛ la.", "Ɗowgol saaɗi maa heewaani tawo. Hooreejo on heewnata ɗum e kala suudu jaŋde."],
  "Vous n'êtes pas encore relié(e) à un apprenant dans cet établissement. Contactez l'école pour vous inscrire.": ["You are not linked to a learner in this institution yet. Contact the school to register.", "لست مرتبطًا بعد بمتعلم في هذه المؤسسة. تواصل مع المدرسة للتسجيل.", "I ma siri kalanden dɔ la nin lakɔliso la fɔlɔ. Lakɔliso wele ka i tɔgɔ sɛbɛn.", "A jokkondiraaki e jaŋngoowo e ndee duɗal tawo. Noddu duɗal ngal ngam winnditaade."],
  "cet apprenant": ["this learner", "هذا المتعلم", "nin kalanden", "ɗo jaŋngoowo"],
  "{n} apprenant(s)": ["{n} learner(s)", "{n} متعلم", "kalanden {n}", "jaŋngooɓe {n}"],
  "{prenom} ouvre ce lien, se connecte avec son numéro et choisit son mot de passe : il arrive directement dans son espace, avec les droits que vous lui avez donnés. Même sans compte Moftal.": ["{prenom} opens this link, logs in with their number and chooses a password: they go straight to their space, with the rights you gave them. Even without a Moftal account.", "يفتح {prenom} هذا الرابط ويسجّل الدخول برقمه ويختار كلمة مروره: فيصل مباشرة إلى مساحته بالصلاحيات التي منحتها له. حتى دون حساب في Moftal.", "{prenom} bɛ nin sira da, ka don ni a ka nimɔrɔ ye, ka a ka gundo sugandi : a bɛ se a ka yɔrɔ la yen, ni i ye sira minnu di a ma. Hali ni Moftal jatɔ t'a fɛ.", "{prenom} ina uddita ngol laawol, naata e limoore mum, suɓa finnde mum : ina yetta nokku mum ɗoon e ɗoon, e baɗe ɗe hokku-ɗaa mo. Hay so alaa konte Moftal."],
};
export default lot;
