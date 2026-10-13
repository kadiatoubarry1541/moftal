import EnvoiLien from "./EnvoiLien";
import { lienInvitationPro, messageInvitation } from "../utils/invitationPro";

// Lien d'invitation d'un pro créé par l'admin, avec les moyens de l'envoyer
export default function EnvoiInvitationPro({ token, nom, telephone, email }: { token: string; nom: string; telephone?: string; email?: string }) {
  const lien = lienInvitationPro(token);
  return <EnvoiLien lien={lien} message={messageInvitation(nom, lien)} telephone={telephone} email={email} sujet={`Votre espace ${nom} sur Moftal`} />;
}
