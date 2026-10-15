// ─────────────────────────────────────────────────────────────────────────────
// Fichier de sauvegarde d'un établissement (école, madrasa…)
//
// Un seul fichier contient tout ce que l'appareil garde pour l'établissement :
// les listes (élèves, notes, frais…) et les enregistrements faits sans
// connexion qui n'ont pas encore été reçus par le serveur.
//
//   • Copie automatique : écrite en continu dans l'espace privé de
//     l'application sur l'appareil (aucune action de la personne).
//   • Fichier choisi : « Sauvegarde-<établissement>.moftal.json », à
//     l'emplacement proposé ou à celui choisi par la personne. Là où le
//     navigateur le permet (ordinateur), il est réécrit tout seul à chaque
//     changement ; ailleurs (téléphone), il est enregistré d'un appui.
//   • Récupération : à chaque retour de la connexion, le fichier choisi et la
//     copie automatique sont relus ; ce qui n'a pas encore été envoyé part au
//     serveur, sans jamais créer de doublon.
//
// Le serveur reste la référence (règle du projet) : le fichier n'est qu'un
// relais tant qu'il n'y a pas de connexion.
// ─────────────────────────────────────────────────────────────────────────────

import { exporterDonneesLocales, importerDonneesLocales, type DonneesLocales, type ResultatImport } from "./offlineSync";

export const FORMAT_SAUVEGARDE = "moftal-sauvegarde-gestion";

export interface Sauvegarde extends DonneesLocales {
  format: typeof FORMAT_SAUVEGARDE;
  version: 1;
  etablissement: { code: string; nom: string; secteur: string };
  enregistreLe: string;
  /** Résumé lisible : ce que contient le fichier */
  resume: Record<string, number>;
}

// ─── Petit stockage des réglages du fichier (IndexedDB) ──────────────────────

const DB = "moftal-sauvegarde";
const STORE = "fichiers";
let dbP: Promise<IDBDatabase> | null = null;
function ouvrir(): Promise<IDBDatabase> {
  if (dbP) return dbP;
  dbP = new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => { dbP = null; reject(r.error); };
  });
  return dbP;
}
function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return ouvrir().then((db) => new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  }));
}

export interface EtatFichier {
  /** Fichier choisi par la personne (navigateurs qui le permettent) */
  handle?: FileSystemFileHandle;
  nomFichier?: string;
  /** Dernière écriture du fichier choisi / dernier enregistrement sur l'appareil */
  derniereEcriture?: number;
  /** Dernier enregistrement fait d'un appui (téléphone) */
  dernierTelechargement?: number;
  /** Dernière copie automatique */
  derniereCopieAuto?: number;
}

export const lireEtat = (code: string) => idb<EtatFichier | undefined>("readonly", (s) => s.get(code)).then((e) => e || {}).catch(() => ({} as EtatFichier));
async function majEtat(code: string, patch: Partial<EtatFichier>) {
  const e = await lireEtat(code);
  await idb("readwrite", (s) => s.put({ ...e, ...patch }, code));
}

// ─── Contenu du fichier ──────────────────────────────────────────────────────

export function nomFichierParDefaut(nom: string) {
  const propre = (nom || "Etablissement").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `Sauvegarde-${propre || "Etablissement"}.moftal.json`;
}

const COLLECTIONS: Record<string, string> = {
  "/students": "students", "/staff": "staff", "/classrooms": "classrooms", "/halaqas": "halaqas",
  "/grades": "grades", "/fees": "fees", "/bulletins": "bulletins", "/members": "members",
};

export async function construireSauvegarde(base: string, etab: Sauvegarde["etablissement"]): Promise<Sauvegarde> {
  const donnees = await exporterDonneesLocales(base);
  const resume: Record<string, number> = { "Enregistrements pas encore envoyés": donnees.operations.length };
  for (const c of donnees.copies) {
    const chemin = new URL(c.url).pathname.replace(/^.*\/api\/[a-z]+-mgmt\/[^/]+/, "");
    const cle = COLLECTIONS[chemin];
    if (cle && Array.isArray(c.data?.[cle])) resume[cle] = c.data[cle].length;
  }
  return { format: FORMAT_SAUVEGARDE, version: 1, etablissement: etab, enregistreLe: new Date().toISOString(), resume, ...donnees };
}

export function lireContenu(texte: string, code: string): Sauvegarde {
  let d: any;
  try { d = JSON.parse(texte); } catch { throw new Error("Ce fichier n'est pas une sauvegarde Moftal."); }
  if (d?.format !== FORMAT_SAUVEGARDE) throw new Error("Ce fichier n'est pas une sauvegarde Moftal.");
  if (String(d.etablissement?.code || "").toLowerCase() !== String(code).toLowerCase()) {
    throw new Error("Cette sauvegarde est celle d'un autre établissement.");
  }
  return d as Sauvegarde;
}

export const reprendreSauvegarde = (base: string, s: Sauvegarde): Promise<ResultatImport> =>
  importerDonneesLocales(base, { copies: s.copies || [], operations: s.operations || [] });

// ─── Fichier choisi par la personne ──────────────────────────────────────────

type FenetreFichiers = Window & {
  showSaveFilePicker?: (o: unknown) => Promise<FileSystemFileHandle>;
};
type HandleAvecPermission = FileSystemFileHandle & {
  queryPermission?: (o: { mode: string }) => Promise<PermissionState>;
  requestPermission?: (o: { mode: string }) => Promise<PermissionState>;
};

/** Le navigateur sait-il écrire tout seul dans un fichier choisi ? (ordinateur : Chrome, Edge…) */
export const fichierAutomatiquePossible = () => typeof window !== "undefined" && typeof (window as FenetreFichiers).showSaveFilePicker === "function";

/** Fait choisir l'emplacement (nom proposé par défaut) et y écrit la sauvegarde. */
export async function choisirFichier(code: string, nomPropose: string, contenu: string) {
  const handle = await (window as FenetreFichiers).showSaveFilePicker!({
    suggestedName: nomPropose,
    types: [{ description: "Sauvegarde Moftal", accept: { "application/json": [".json"] } }],
  });
  await ecrireDans(handle, contenu);
  await majEtat(code, { handle, nomFichier: handle.name, derniereEcriture: Date.now() });
  return handle.name;
}

async function ecrireDans(handle: FileSystemFileHandle, contenu: string) {
  const w = await handle.createWritable();
  await w.write(contenu);
  await w.close();
}

/** Permission d'écrire dans le fichier choisi (demandée seulement sur un appui si `demander`) */
export async function permissionFichier(code: string, demander = false): Promise<PermissionState | "aucun"> {
  const { handle } = await lireEtat(code);
  if (!handle) return "aucun";
  const h = handle as HandleAvecPermission;
  let p: PermissionState = (await h.queryPermission?.({ mode: "readwrite" })) ?? "granted";
  if (p !== "granted" && demander) p = (await h.requestPermission?.({ mode: "readwrite" })) ?? p;
  return p;
}

/** Réécrit le fichier choisi, si le navigateur l'autorise encore. */
export async function ecrireFichierChoisi(code: string, contenu: string): Promise<boolean> {
  const { handle } = await lireEtat(code);
  if (!handle || (await permissionFichier(code)) !== "granted") return false;
  await ecrireDans(handle, contenu);
  await majEtat(code, { derniereEcriture: Date.now() });
  return true;
}

/** Lit le fichier choisi (null s'il n'est pas lisible sans demander). */
export async function lireFichierChoisi(code: string): Promise<string | null> {
  const { handle } = await lireEtat(code);
  if (!handle || (await permissionFichier(code)) !== "granted") return null;
  try { return await (await handle.getFile()).text(); } catch { return null; }
}

export const oublierFichierChoisi = (code: string) => majEtat(code, { handle: undefined, nomFichier: undefined });

/** Téléphone : enregistre le fichier (le navigateur propose l'emplacement, Téléchargements par défaut). */
export async function telechargerSauvegarde(code: string, nom: string, contenu: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url; a.download = nom;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  await majEtat(code, { dernierTelechargement: Date.now(), nomFichier: nom });
}

// ─── Copie automatique (espace privé de l'application sur l'appareil) ───────

type StockageFichiers = StorageManager & { getDirectory?: () => Promise<FileSystemDirectoryHandle> };
const nomCopieAuto = (code: string) => `sauvegarde-${code.replace(/[^A-Za-z0-9_-]/g, "_")}.json`;

export async function ecrireCopieAuto(code: string, contenu: string): Promise<boolean> {
  const st = navigator.storage as StockageFichiers | undefined;
  if (!st?.getDirectory) return false;
  try {
    const dossier = await st.getDirectory();
    await ecrireDans(await dossier.getFileHandle(nomCopieAuto(code), { create: true }), contenu);
    await majEtat(code, { derniereCopieAuto: Date.now() });
    return true;
  } catch { return false; }
}

export async function lireCopieAuto(code: string): Promise<string | null> {
  const st = navigator.storage as StockageFichiers | undefined;
  if (!st?.getDirectory) return null;
  try {
    const dossier = await st.getDirectory();
    return await (await (await dossier.getFileHandle(nomCopieAuto(code))).getFile()).text();
  } catch { return null; }
}

/** Demande au navigateur de ne jamais effacer les données gardées sur l'appareil. */
export async function demanderStockageDurable() {
  try { if (navigator.storage?.persist && !(await navigator.storage.persisted?.())) await navigator.storage.persist(); } catch { /* non pris en charge */ }
}
