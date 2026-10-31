// Fonctions du navigateur que TypeScript ne connaît pas encore (installation de
// l'application, mode « écran d'accueil » de l'iPhone, carnet de contacts) :
// toutes facultatives, car absentes sur une partie des navigateurs.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Application installée renvoyée par getInstalledRelatedApps() (Chrome Android) */
interface RelatedApplication {
  platform: string;
  url?: string;
  id?: string;
}

interface ContactChoisi {
  tel?: string[];
  name?: string[];
}

interface Navigator {
  /** iPhone : vrai quand le site est ouvert depuis l'écran d'accueil */
  standalone?: boolean;
  getInstalledRelatedApps?: () => Promise<RelatedApplication[]>;
  contacts?: { select: (proprietes: string[], options?: { multiple?: boolean }) => Promise<ContactChoisi[]> };
}

interface Window {
  /** Proposition d'installation de l'app principale, gardée par main.tsx */
  __pwaInstallPrompt?: BeforeInstallPromptEvent | null;
  /** Proposition d'installation de l'app d'une gestion interne */
  __pwaGestionPrompt?: BeforeInstallPromptEvent | null;
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
}
