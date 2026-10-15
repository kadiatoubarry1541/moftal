// Dictionnaire français → arabe des pages de l'école, une partie par écran.
import commun from "./commun";
import gestion from "./gestion";
import espaces from "./espaces";
import vitrine from "./vitrine";
import partages from "./partages";
import sauvegarde from "./sauvegarde";

const AR_ECOLE: Record<string, string> = { ...partages, ...vitrine, ...espaces, ...gestion, ...sauvegarde, ...commun };
export default AR_ECOLE;
