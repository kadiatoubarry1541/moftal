import type { Lot } from "./type";
// « texte français » → [anglais, arabe, mandingue, pular]
// École : parents reliés par le matricule, classes à plusieurs enseignants
const lot: Lot = {
  "Parents": ["Parents", "أولياء الأمور", "Bangebagaw", "Jibinɓe"],
  "Parent": ["Parent", "وليّ الأمر", "Bangebaga", "Jibinɗo"],
  "Ajouter un parent": ["Add a parent", "إضافة وليّ أمر", "Bangebaga dɔ fara a kan", "Ɓeydu jibinɗo"],
  "Indiquez le téléphone (ou le NuméroH) du parent": ["Enter the parent's phone number (or NuméroH)", "أدخل هاتف وليّ الأمر (أو NuméroH)", "Bangebaga ka telefɔni nimɔrɔ sɛbɛn (walima a ka NuméroH)", "Winndu noddirgal jibinɗo (walla NuméroH makko)"],
  "Indiquez le matricule d'au moins un enfant": ["Enter the registration number of at least one child", "أدخل الرقم التسلسلي لطفل واحد على الأقل", "Den kelen ka matirikili sɛbɛn dɔrɔn", "Winndu limoore binnditagol hay ɓiɗɗo gooto"],
  "Téléphone du parent": ["Parent's phone", "هاتف وليّ الأمر", "Bangebaga ka telefɔni", "Noddirgal jibinɗo"],
  "Ex : 620 00 00 00 (ou son NuméroH)": ["E.g. 620 00 00 00 (or their NuméroH)", "مثال: 620 00 00 00 (أو NuméroH)", "Misali : 620 00 00 00 (walima a ka NuméroH)", "Misal : 620 00 00 00 (walla NuméroH makko)"],
  "Matricule de ses enfants": ["Registration number of their children", "الرقم التسلسلي لأطفاله", "A denw ka matirikili", "Limoore binnditagol ɓiɓɓe makko"],
  "Ex : ELV-0001, ELV-0002": ["E.g. ELV-0001, ELV-0002", "مثال: ELV-0001, ELV-0002", "Misali : ELV-0001, ELV-0002", "Misal : ELV-0001, ELV-0002"],
  "Matricule introuvable : {m}": ["Registration number not found: {m}", "رقم تسلسلي غير موجود: {m}", "Matirikili ma sɔrɔ : {m}", "Limoore binnditagol yiytaaka : {m}"],
  "Un numéro = un seul parent : s'il est déjà enregistré, l'enfant s'ajoute simplement à sa fiche. Le parent suit ses enfants dans l'application de l'école.": ["One number = one parent: if already registered, the child is simply added to their record. The parent follows their children in the school app.", "رقم واحد = وليّ أمر واحد: إن كان مسجلًا يُضاف الطفل إلى ملفه فقط. يتابع وليّ الأمر أطفاله في تطبيق المدرسة.", "Nimɔrɔ kelen = bangebaga kelen : n'a sɛbɛnnen don kaban, den bɛ fara a ka sɛbɛn kan dɔrɔn. Bangebaga b'a denw kɔlɔsi lakɔliso porogaramu kɔnɔ.", "Limoore wootere = jibinɗo gooto : so o winndaama ko adii, ɓiɗɗo on ɓeydetee e fiše makko tan. Jibinɗo ina jokka ɓiɓɓe makko e jaaɓnirgal duɗal ngal."],
  "Aucun parent pour l'instant. Touchez « + Ajouter un parent » : son téléphone et le matricule de ses enfants suffisent.": ["No parents yet. Tap “+ Add a parent”: their phone and their children's registration numbers are enough.", "لا يوجد أولياء أمور بعد. المس «+ إضافة وليّ أمر»: يكفي هاتفه والأرقام التسلسلية لأطفاله.", "Bangebaga si tɛ yen fɔlɔ. « + Bangebaga dɔ fara a kan » digi : a ka telefɔni ni a denw ka matirikili bɛ se.", "Alaa jibinɗo tawo. Meemu « + Ɓeydu jibinɗo » : noddirgal makko e limooje binnditagol ɓiɓɓe makko ina yonata."],
  "Retirer ce parent de l'établissement ?": ["Remove this parent from the school?", "إزالة وليّ الأمر هذا من المؤسسة؟", "Nin bangebaga bɔ lakɔliso la wa ?", "Itto ɗo jibinɗo e duɗal ngal ?"],
  "Enfant": ["Child", "طفل", "Den", "Ɓiɗɗo"],
  "Classe": ["Class", "الصف", "Kalanso", "Suudu jaŋde"],
  "— Aucune —": ["— None —", "— لا شيء —", "— Foyi —", "— Alaa —"],
  "Matricule": ["Registration no.", "الرقم التسلسلي", "Matirikili", "Limoore binnditagol"],
  "Automatique si vide": ["Automatic if empty", "تلقائي إن كان فارغًا", "A bɛ dilan a yɛrɛ ma n'a lankolon don", "Ina waɗa hoore mum so ɗum woni meho"],
  "Le matricule sert à relier l'élève à ses parents : donnez-le au parent ou tapez-le en ajoutant le parent.": ["The registration number links the pupil to their parents: give it to the parent or type it when adding the parent.", "يربط الرقم التسلسلي التلميذ بوالديه: أعطه لوليّ الأمر أو اكتبه عند إضافته.", "Matirikili bɛ kalanden ni a bangebagaw ɲɔgɔn sɔrɔ : a di bangebaga ma walima a sɛbɛn ka bangebaga fara a kan.", "Limoore binnditagol ina humpita taalibo e jibinɓe makko : hokku jibinɗo walla winndu ɗum nde ɓeydaa jibinɗo."],
  "Un numéro de téléphone = une seule personne : il n'est jamais enregistré deux fois.": ["One phone number = one person: it is never registered twice.", "رقم هاتف واحد = شخص واحد: لا يُسجَّل مرتين أبدًا.", "Telefɔni nimɔrɔ kelen = mɔgɔ kelen : a tɛ sɛbɛn siɲɛ fila abada.", "Limoore noddirgal wootere = neɗɗo gooto : ɗum winndetaake laabi ɗiɗi abada."],
  "Enseignants de la classe (plusieurs possibles)": ["Class teachers (several possible)", "معلمو الصف (يمكن أكثر من واحد)", "Kalanso karamɔgɔw (caman bɛ se)", "Jannginooɓe suudu jaŋde (ina waawi ɗuuɗude)"],
  "Ajoutez d'abord vos professeurs dans Personnel.": ["First add your teachers in Staff.", "أضف معلميك أولًا في قسم الموظفين.", "I ka karamɔgɔw fara Baarakɛlaw la fɔlɔ.", "Ɓeydu jannginooɓe maa e Golloɓe adii."],
  "Nom du parent (facultatif)": ["Parent's name (optional)", "اسم وليّ الأمر (اختياري)", "Bangebaga tɔgɔ (n'i b'a fɛ)", "Innde jibinɗo (so a yiɗii)"],
  "Ex : Mariama Diallo": ["E.g. Mariama Diallo", "مثال: Mariama Diallo", "Misali : Mariama Diallo", "Misal : Mariama Diallo"],
};
export default lot;
