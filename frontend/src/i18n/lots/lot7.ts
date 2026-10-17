import type { Lot } from "./type";
// « texte français » → [anglais, arabe, mandingue, pular]
// Hors connexion et coordonnées du site
const lot: Lot = {
  "Enregistré sur l'appareil — sera envoyé dès le retour de la connexion": ["Saved on the device — will be sent as soon as the connection is back", "حُفظ على الجهاز — سيُرسل فور عودة الاتصال", "A marala minɛn kan — a bɛna ci ni siri seginna", "Danndaama e kaɓirgal — maa neldee nde jokkol artii"],
  "Pas de connexion — ces données n'ont pas encore été ouvertes sur cet appareil.": ["No connection — this data has not been opened on this device yet.", "لا يوجد اتصال — لم تُفتح هذه البيانات على هذا الجهاز بعد.", "Siri tɛ — nin kunnafoniw ma da nin minɛn kan fɔlɔ.", "Alaa jokkol — ɗee kabaruuji udditaaka e ngal kaɓirgal tawo."],
  "Cette action a besoin d'une connexion internet.": ["This action needs an internet connection.", "يحتاج هذا الإجراء إلى اتصال بالإنترنت.", "Nin baara mago bɛ ɛntɛrinɛti siri la.", "Ndee golle ina sokli jokkol internet."],
  "Fichier trop lourd pour être gardé sans connexion (30 Mo max.). Réessayez avec internet.": ["File too large to keep offline (30 MB max.). Try again with the internet.", "الملف كبير جداً لحفظه دون اتصال (30 ميغابايت كحد أقصى). أعد المحاولة مع الإنترنت.", "Fisiye ka girin kojugu ka mara siri tɛ tuma (30 Mo dan). A kɛ tugun ni ɛntɛrinɛti ye.", "Fiise ina teddi no feewi ngam danndeede tawa alaa jokkol (30 Mo ɓuri). Fuɗɗito e internet."],
  "Impossible de charger vos coordonnées.": ["Your contact details could not be loaded.", "تعذّر تحميل بيانات الاتصال الخاصة بك.", "Aw ka kunnafoni sirilenw ma se ka doni.", "Kabaruuji jokkol mon mbaawaa loowede."],
  "Rien n'a été publié. Réessayez.": ["Nothing was published. Try again.", "لم يُنشر أي شيء. أعد المحاولة.", "Foyi ma bɔ. A kɛ tugun.", "Alaa ko yaltinaa. Fuɗɗito."],
  "Pas de connexion : rien n'a été publié. Réessayez.": ["No connection: nothing was published. Try again.", "لا يوجد اتصال: لم يُنشر أي شيء. أعد المحاولة.", "Siri tɛ : foyi ma bɔ. A kɛ tugun.", "Alaa jokkol : alaa ko yaltinaa. Fuɗɗito."],
};
export default lot;
