// Lien d'invitation d'un pro (créé par l'admin) et messages prêts à envoyer
export function lienInvitationPro(token: string) {
  return `${window.location.origin}/rejoindre-pro/${token}`;
}

export function messageInvitation(nom: string, lien: string) {
  return `Bonjour ! Votre espace professionnel « ${nom} » est prêt sur Moftal. Ouvrez ce lien pour choisir votre mot de passe, ajouter votre logo et installer votre application de gestion : ${lien}`;
}

/** Lien WhatsApp vers ce numéro (indicatif 224 ajouté si absent). */
export function lienWhatsApp(telephone: string, texte: string) {
  let n = String(telephone || "").replace(/[^0-9]/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.length === 9) n = `224${n}`;
  return `https://wa.me/${n}?text=${encodeURIComponent(texte)}`;
}
