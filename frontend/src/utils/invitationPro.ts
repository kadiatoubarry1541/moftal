// Message prêt à envoyer avec le lien de l'application d'un établissement
export function messageLienApplication(etablissement: string, lien: string, proprietaire = false) {
  return proprietaire
    ? `Bonjour ! Votre application « ${etablissement} » est prête sur Moftal. Ouvrez ce lien, connectez-vous avec votre téléphone ou votre e-mail (la première fois, vous choisissez votre mot de passe) puis installez-la : ${lien}`
    : `Bonjour ! Voici l'application de ${etablissement} sur Moftal. Ouvrez ce lien, connectez-vous avec votre téléphone ou votre e-mail (la première fois, vous choisissez votre mot de passe) puis installez-la : ${lien}`;
}

/** Lien de message vers ce numéro (indicatif 224 ajouté si absent). */
export function lienMessage(telephone: string, texte: string) {
  let n = String(telephone || "").replace(/[^0-9]/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.length === 9) n = `224${n}`;
  return `https://wa.me/${n}?text=${encodeURIComponent(texte)}`;
}
