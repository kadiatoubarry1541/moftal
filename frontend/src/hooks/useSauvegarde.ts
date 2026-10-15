import { useCallback, useEffect, useRef, useState } from "react";
import { useTraduction } from "../i18n/traduction";
import { subscribeOfflineStatus, surChangementLocal, syncNow, type OfflineStatus } from "../utils/offlineSync";
import {
  construireSauvegarde, lireContenu, reprendreSauvegarde, nomFichierParDefaut, fichierAutomatiquePossible,
  choisirFichier, ecrireFichierChoisi, lireFichierChoisi, permissionFichier, oublierFichierChoisi,
  telechargerSauvegarde, ecrireCopieAuto, lireCopieAuto, demanderStockageDurable, lireEtat, type EtatFichier,
} from "../utils/fichierSauvegarde";

// État et actions du fichier de sauvegarde d'un établissement (écrans dans
// components/SauvegardeEtablissement.tsx, fichier dans utils/fichierSauvegarde.ts)

interface Etab { code: string; nom: string; secteur: string }

export interface Sauvegarde {
  /** Heure du dernier enregistrement pas encore envoyé (0 s'il n'y en a pas) */
  derniereOperation: number;
  /** État du fichier lu (évite d'afficher le rappel avant de savoir) */
  pret: boolean;
  etat: EtatFichier;
  status: OfflineStatus | null;
  autorisation: PermissionState | "aucun";
  occupe: boolean;
  message: { ok: boolean; texte: string } | null;
  nomPropose: string;
  automatique: boolean;
  enregistrer: () => Promise<void>;
  choisirEmplacement: () => Promise<void>;
  autoriser: () => Promise<void>;
  recupererFichier: (f: File) => Promise<void>;
  oublier: () => Promise<void>;
}

export function useSauvegarde(base: string, etab: Etab): Sauvegarde {
  const { tr } = useTraduction();
  const [etat, setEtat] = useState<EtatFichier>({});
  const [pret, setPret] = useState(false);
  const [status, setStatus] = useState<OfflineStatus | null>(null);
  const [autorisation, setAutorisation] = useState<PermissionState | "aucun">("aucun");
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const nomPropose = nomFichierParDefaut(etab.nom);
  const automatique = fichierAutomatiquePossible();
  const etabRef = useRef(etab);
  etabRef.current = etab;

  const relireEtat = useCallback(async () => {
    setEtat(await lireEtat(etab.code));
    setAutorisation(await permissionFichier(etab.code).catch(() => "aucun" as const));
    setPret(true);
  }, [etab.code]);

  // Heure du dernier enregistrement fait sans connexion (pas encore envoyé)
  const [derniereOperation, setDerniereOperation] = useState(0);
  const contenu = useCallback(async () => {
    const sauvegarde = await construireSauvegarde(base, etabRef.current);
    setDerniereOperation(Math.max(0, ...sauvegarde.operations.map((o) => Number(o.createdAt) || 0)));
    return JSON.stringify(sauvegarde);
  }, [base]);

  // Écrit la copie automatique et le fichier choisi (s'il est encore autorisé)
  const ecrireTout = useCallback(async () => {
    const c = await contenu();
    await ecrireCopieAuto(etab.code, c);
    await ecrireFichierChoisi(etab.code, c).catch(() => false);
    await relireEtat();
  }, [contenu, etab.code, relireEtat]);

  const resumeImport = useCallback((r: { operations: number; copies: number }) => {
    if (r.operations > 0) setMessage({ ok: true, texte: tr("{n} enregistrement(s) récupéré(s) depuis le fichier de sauvegarde : envoi au serveur en cours.", { n: r.operations }) });
  }, [tr]);

  // Reprend le fichier choisi et la copie automatique (rien n'est jamais envoyé deux fois)
  const recupererAuto = useCallback(async () => {
    for (const texte of [await lireFichierChoisi(etab.code), await lireCopieAuto(etab.code)]) {
      if (!texte) continue;
      try { resumeImport(await reprendreSauvegarde(base, lireContenu(texte, etab.code))); } catch { /* fichier d'un autre établissement ou abîmé */ }
    }
    if (navigator.onLine) void syncNow();
  }, [base, etab.code, resumeImport]);

  useEffect(() => {
    void demanderStockageDurable();
    void relireEtat();
    void recupererAuto();
    const off = subscribeOfflineStatus(setStatus);
    // Chaque changement (liste lue, enregistrement fait, envoi réussi) : fichier réécrit
    let minuterie: ReturnType<typeof setTimeout> | null = null;
    const offChange = surChangementLocal(() => {
      if (minuterie) clearTimeout(minuterie);
      minuterie = setTimeout(() => { void ecrireTout(); }, 2500);
    });
    const enLigne = () => { void recupererAuto(); };
    window.addEventListener("online", enLigne);
    return () => { off(); offChange(); window.removeEventListener("online", enLigne); if (minuterie) clearTimeout(minuterie); };
  }, [relireEtat, recupererAuto, ecrireTout]);

  const enregistrer = async () => {
    setOccupe(true); setMessage(null);
    try {
      const c = await contenu();
      await ecrireCopieAuto(etab.code, c);
      if (automatique && etat.handle) {
        if ((await permissionFichier(etab.code, true)) === "granted" && (await ecrireFichierChoisi(etab.code, c))) {
          setMessage({ ok: true, texte: tr("Sauvegarde enregistrée dans « {nom} ».", { nom: etat.nomFichier || nomPropose }) });
        } else setMessage({ ok: false, texte: tr("Autorisez l'écriture dans le fichier de sauvegarde, ou choisissez un autre emplacement.") });
      } else if (automatique) {
        const nom = await choisirFichier(etab.code, nomPropose, c);
        setMessage({ ok: true, texte: tr("Sauvegarde enregistrée dans « {nom} ». Elle sera mise à jour toute seule.", { nom }) });
      } else {
        await telechargerSauvegarde(etab.code, nomPropose, c);
        setMessage({ ok: true, texte: tr("Sauvegarde enregistrée : « {nom} » (dossier Téléchargements, sauf si vous avez choisi un autre emplacement).", { nom: nomPropose }) });
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setMessage({ ok: false, texte: tr("La sauvegarde n'a pas pu être enregistrée : {err}", { err: tr((e as Error)?.message || "") }) });
    } finally { setOccupe(false); void relireEtat(); }
  };

  const choisirEmplacement = async () => {
    setOccupe(true); setMessage(null);
    try {
      const nom = await choisirFichier(etab.code, etat.nomFichier || nomPropose, await contenu());
      setMessage({ ok: true, texte: tr("Sauvegarde enregistrée dans « {nom} ». Elle sera mise à jour toute seule.", { nom }) });
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setMessage({ ok: false, texte: tr("La sauvegarde n'a pas pu être enregistrée : {err}", { err: tr((e as Error)?.message || "") }) });
    } finally { setOccupe(false); void relireEtat(); }
  };

  const autoriser = async () => {
    if ((await permissionFichier(etab.code, true)) === "granted") { await ecrireTout(); await recupererAuto(); }
    await relireEtat();
  };

  const recupererFichier = async (f: File) => {
    setOccupe(true); setMessage(null);
    try {
      const r = await reprendreSauvegarde(base, lireContenu(await f.text(), etab.code));
      const parties = [
        r.operations ? tr("{n} enregistrement(s) à envoyer au serveur", { n: r.operations }) : tr("aucun enregistrement en attente"),
        r.copies ? tr("{n} liste(s) mise(s) à jour sur cet appareil", { n: r.copies }) : "",
        r.dejaEnvoyees ? tr("{n} déjà reçu(s) par le serveur (ignoré(s))", { n: r.dejaEnvoyees }) : "",
        r.autreCompte ? tr("{n} fait(s) avec un autre compte (ignoré(s))", { n: r.autreCompte }) : "",
      ].filter(Boolean);
      setMessage({ ok: true, texte: tr("Sauvegarde récupérée : {detail}.", { detail: parties.join(" · ") }) });
      window.dispatchEvent(new CustomEvent("moftal-offline-synced", { detail: { sent: 0 } }));
    } catch (e) {
      setMessage({ ok: false, texte: tr((e as Error)?.message || "Ce fichier n'est pas une sauvegarde Moftal.") });
    } finally { setOccupe(false); }
  };

  const oublier = async () => { await oublierFichierChoisi(etab.code); await relireEtat(); };

  return { derniereOperation, pret, etat, status, autorisation, occupe, message, nomPropose, automatique, enregistrer, choisirEmplacement, autoriser, recupererFichier, oublier };
}

/** Fichier de sauvegarde à jour ? (sinon le bandeau le rappelle) */
export function sauvegardeAJour(s: Sauvegarde) {
  if (s.automatique) return !!s.etat.handle && s.autorisation === "granted";
  // Téléphone : fichier enregistré après le dernier changement fait sans connexion
  const enregistre = s.etat.dernierTelechargement || 0;
  return (s.status?.pending || 0) === 0 ? enregistre > 0 : enregistre > 0 && enregistre >= s.derniereOperation;
}

