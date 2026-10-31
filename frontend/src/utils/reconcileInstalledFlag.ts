// Demande au navigateur (Chrome/Edge/Android uniquement — API absente sur iOS
// Safari et Firefox) si l'app est installée. Une réponse positive confirme la note
// « installée ». Une réponse vide ne l'efface PAS : ce navigateur ne voit souvent
// pas l'app installée, et effacer la note faisait revenir le bouton « Installer »,
// d'où des installations en double. Si l'app a vraiment été désinstallée, le
// navigateur propose à nouveau l'installation (beforeinstallprompt) et la note est
// effacée à ce moment-là.
export async function reconcileInstalledFlag(storageKey: string | null, setInstalled: (v: boolean) => void) {
  if (!storageKey) return;
  const nav = navigator;
  if (typeof nav.getInstalledRelatedApps !== "function") return;
  try {
    const related = await nav.getInstalledRelatedApps();
    if (related && related.length > 0) {
      localStorage.setItem(storageKey, "1");
      setInstalled(true);
    }
  } catch { /* silencieux */ }
}
