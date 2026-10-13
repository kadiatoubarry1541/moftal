// Dictionnaire français → arabe des pages de l'école, une partie par écran.
import commun from "./commun";
import gestion from "./gestion";
import espaces from "./espaces";
import vitrine from "./vitrine";
import partages from "./partages";

const AR_ECOLE: Record<string, string> = { ...partages, ...vitrine, ...espaces, ...gestion, ...commun };
export default AR_ECOLE;
