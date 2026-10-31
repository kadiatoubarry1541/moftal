import type { NavigateFunction } from "react-router-dom";

/** Seul chemin de retour vers le site Moftal. */
export function goToMoftal(navigate: NavigateFunction) {
  if (window.location.hostname.startsWith("gestions.")) {
    window.location.href = "https://moftal.com/mes-comptes-pro";
  } else {
    navigate("/mes-comptes-pro");
  }
}
