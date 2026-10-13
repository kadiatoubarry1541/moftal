// Site vitrine de l'école (/ecole/:tenantCode) et liste publique des écoles
const ar: Record<string, string> = {
  // --- Site vitrine : chargement / erreurs ---
  "Chargement en cours...": "جارٍ التحميل...",
  "École introuvable": "المدرسة غير موجودة",
  "Cette école n'existe pas ou n'est pas disponible.": "هذه المدرسة غير موجودة أو غير متاحة.",
  "Impossible de charger l'école.": "تعذّر تحميل المدرسة.",
  "Retour à l'accueil": "العودة إلى الصفحة الرئيسية",
  "Nom de l'enfant et téléphone sont obligatoires.": "اسم الطفل ورقم الهاتف إلزاميان.",
  "Erreur lors de l'envoi.": "حدث خطأ أثناء الإرسال.",
  "Impossible de joindre le serveur.": "تعذّر الاتصال بالخادم.",
  // Messages du serveur (pro-public.js)
  "Espace introuvable ou inactif.": "الفضاء غير موجود أو غير مفعّل.",
  "Nom de l'enfant et téléphone requis.": "اسم الطفل ورقم الهاتف مطلوبان.",
  "Note invalide (1 à 5).": "تقييم غير صالح (من 1 إلى 5).",
  "Merci ! Votre avis sera visible après validation.": "شكرًا! سيظهر رأيك بعد المراجعة.",

  // --- En-tête / navigation ---
  "🚨 Urgence": "🚨 طوارئ",
  "École": "مدرسة",
  "Accueil": "الرئيسية",
  "Enseignants": "المعلمون",
  "Inscription": "التسجيل",
  "Contact": "التواصل",
  "👪 Espace Parent": "👪 فضاء ولي الأمر",
  "🧑‍🏫 Espace Enseignant": "🧑‍🏫 فضاء المعلم",

  // --- Accueil ---
  "Une école d'excellence dédiée à la réussite de chaque élève. Formation de qualité, environnement sûr et épanouissant.": "مدرسة متميزة مكرّسة لنجاح كل تلميذ. تعليم عالي الجودة في بيئة آمنة ومحفّزة على النمو.",
  "Inscrire mon enfant": "تسجيل طفلي",
  "Nous contacter": "تواصل معنا",

  // --- Chiffres ---
  "Enseignants qualifiés": "معلمون مؤهَّلون",
  "Élèves inscrits": "التلاميذ المسجَّلون",
  "Classes": "الفصول",
  "{n} avis parents": "{n} من آراء أولياء الأمور",
  "Niveaux proposés": "المستويات المتاحة",

  // --- Enseignants ---
  "L'équipe pédagogique": "الفريق التربوي",
  "Nos Enseignants": "معلمونا",
  "Des éducateurs passionnés dédiés à la réussite de vos enfants.": "مربّون شغوفون مكرّسون لنجاح أبنائكم.",

  // --- Classes ---
  "Nos Classes": "فصولنا",
  "Les niveaux et classes proposés par notre école.": "المستويات والفصول التي تقدمها مدرستنا.",

  // --- Frais ---
  "Frais de scolarité": "الرسوم الدراسية",
  "Indicatifs — contactez-nous pour le détail complet.": "مبالغ تقريبية — تواصلوا معنا لمعرفة التفاصيل الكاملة.",
  "GNF": "فرنك غيني",

  // --- Avis ---
  "Avis de nos parents": "آراء أولياء الأمور",
  "Note moyenne : {moyenne}/5 sur {total} avis": "متوسط التقييم: {moyenne}/5 من {total} رأي",
  "Parent": "ولي أمر",

  // --- Pourquoi nous ---
  "Pourquoi choisir notre école ?": "لماذا تختار مدرستنا؟",
  "Un cadre d'apprentissage moderne pour préparer les leaders de demain.": "بيئة تعلّم حديثة لإعداد قادة الغد.",
  "Programme de qualité": "برنامج عالي الجودة",
  "Un curriculum complet et adapté aux standards nationaux avec des méthodes pédagogiques modernes.": "منهج متكامل يتوافق مع المعايير الوطنية ويعتمد أساليب تربوية حديثة.",
  "Une équipe pédagogique diplômée et expérimentée, passionnée par l'enseignement.": "فريق تربوي حاصل على شهادات وذو خبرة، شغوف بالتعليم.",
  "Environnement sécurisé": "بيئة آمنة",
  "Un cadre sûr et bienveillant où chaque élève peut s'épanouir librement.": "إطار آمن ورعاية حانية يتيح لكل تلميذ أن ينمو بحرية.",

  // --- Pré-inscription ---
  "Inscrire votre enfant": "سجّلوا طفلكم",
  "Remplissez ce formulaire, l'école vous recontacte pour finaliser l'inscription — pas besoin de compte Moftal pour commencer.": "املؤوا هذه الاستمارة وستتواصل معكم المدرسة لإتمام التسجيل — لا حاجة إلى حساب Moftal للبدء.",
  "Demande envoyée !": "تم إرسال الطلب!",
  "L'école vous contactera au {tel}.": "ستتصل بكم المدرسة على الرقم {tel}.",
  "Nom de l'enfant *": "اسم الطفل *",
  "Date de naissance": "تاريخ الميلاد",
  "Niveau souhaité (ex: CP1, 7ème année, Licence 1...)": "المستوى المطلوب (مثال: CP1، السنة السابعة، الإجازة 1...)",
  "Nom du parent": "اسم ولي الأمر",
  "Téléphone du parent *": "هاتف ولي الأمر *",
  "Envoi...": "جارٍ الإرسال...",
  "Envoyer la demande de pré-inscription": "إرسال طلب التسجيل المسبق",
  "Vous avez déjà un compte Moftal ?": "هل لديكم حساب Moftal بالفعل؟",
  "Connectez-vous": "سجّلوا الدخول",
  "pour suivre l'inscription en ligne.": "لمتابعة التسجيل عبر الإنترنت.",

  // --- Contact ---
  "Nous Contacter": "تواصل معنا",
  "Notre équipe est disponible pour répondre à toutes vos questions.": "فريقنا متاح للإجابة عن جميع أسئلتكم.",
  "Téléphone": "الهاتف",
  "Email": "البريد الإلكتروني",
  "Adresse": "العنوان",
  "Non renseigné": "غير محدد",
  "Non renseignée": "غير محددة",
  "Bonjour ! Je souhaite des informations sur l'école.": "السلام عليكم! أرغب في الحصول على معلومات عن المدرسة.",
  "📲 Contacter via WhatsApp": "📲 التواصل عبر WhatsApp",
  "Retour à la plateforme": "العودة إلى المنصة",

  // --- Liste des écoles ---
  "🏫 Écoles & Établissements": "🏫 المدارس والمؤسسات",
  "Liste des écoles partenaires de la communauté": "قائمة المدارس الشريكة للمجتمع",
  "+ Inscrire mon école": "+ تسجيل مدرستي",
  "Inscrire mon établissement": "تسجيل مؤسستي",
  "Votre école sera visible dans cette liste après validation par un administrateur.": "ستظهر مدرستك في هذه القائمة بعد موافقة المسؤول.",
  "Nom de l'établissement": "اسم المؤسسة",
  "Ex : Lycée Moftal": "مثال: ثانوية Moftal",
  "Adresse (optionnel)": "العنوان (اختياري)",
  "Ville, pays": "المدينة، البلد",
  "Contact (optionnel)": "وسيلة الاتصال (اختياري)",
  "Téléphone ou email": "الهاتف أو البريد الإلكتروني",
  "Présentation (optionnel)": "نبذة تعريفية (اختياري)",
  "Quelques mots sur l'établissement...": "بضع كلمات عن المؤسسة...",
  "Enregistrement...": "جارٍ الحفظ...",
  "Enregistrer mon école": "حفظ مدرستي",
  "Écoles partenaires": "المدارس الشريكة",
  "Aucune école enregistrée pour l'instant": "لا توجد مدرسة مسجّلة حتى الآن",
  "Soyez le premier à inscrire votre établissement !": "كن أول من يسجّل مؤسسته!",
  "Inscrire mon école": "تسجيل مدرستي",
  "École enregistrée avec succès.": "تم تسجيل المدرسة بنجاح.",
  "Erreur lors de l'inscription.": "حدث خطأ أثناء التسجيل.",
  "Erreur de connexion.": "خطأ في الاتصال.",
  // Messages du serveur (education.js)
  "Le nom de l'établissement est obligatoire": "اسم المؤسسة إلزامي",
  "École enregistrée. Elle sera visible après validation par l'administrateur.": "تم تسجيل المدرسة. ستظهر بعد موافقة المسؤول.",
  "Erreur serveur lors de l'inscription de l'école": "خطأ في الخادم أثناء تسجيل المدرسة",
};
export default ar;
