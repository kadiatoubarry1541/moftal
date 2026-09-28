// ─────────────────────────────────────────────────────────────────────────────
// Mode hors connexion — Santé (clinique) & Éducation (école / madrasa)
//
// Installe une surcouche sur window.fetch, limitée aux API de gestion interne
// et de site vitrine santé / éducation :
//   • Lecture (GET)  : réseau d'abord ; chaque réponse est gardée sur l'appareil
//     (IndexedDB). Sans connexion, la dernière copie gardée est renvoyée.
//   • Écriture (POST/PUT/DELETE) : sans connexion, l'opération est sauvegardée
//     dans une file d'attente locale, l'écran est mis à jour tout de suite, et
//     tout est envoyé au serveur (dans l'ordre) dès que la connexion revient.
// ─────────────────────────────────────────────────────────────────────────────

const DB_NAME = "moftal-offline";
const DB_VERSION = 1;
const STORE_CACHE = "responses";
const STORE_QUEUE = "outbox";

// API dont les lectures sont gardées sur l'appareil
const CACHE_PATTERNS = [
  /\/api\/clinic-mgmt\//,
  /\/api\/school-mgmt\//,
  /\/api\/madrasa-mgmt\//,
  /\/api\/clinic-public\//,
  /\/api\/pro-public\/(school|madrasa)\//,
  /\/api\/professionals\/my-accounts/,
  /\/api\/professionals\/admin\/tenants/,
  /\/api\/payment\/acces-gestion-interne/,
];

// API dont les écritures peuvent être mises en file d'attente
const QUEUE_PATTERNS = [
  /\/api\/clinic-mgmt\//,
  /\/api\/school-mgmt\//,
  /\/api\/madrasa-mgmt\//,
  /\/api\/clinic-public\/[^/]+\/(quick-request|request-appointment|reviews)$/,
  /\/api\/pro-public\/(school|madrasa)\/[^/]+\/(enroll-request|reviews)$/,
];

// Opérations qui ont besoin du serveur tout de suite (calculs / recherche côté serveur)
const ONLINE_ONLY_PATTERNS = [/\/bulletins\/generate$/, /\/members\/add$/, /\/pharmacy\/dispense\//];

// Base « tenant » d'une URL : /api/clinic-mgmt/CODE
const TENANT_BASE = /^(.*\/api\/(?:clinic-mgmt|school-mgmt|madrasa-mgmt)\/[^/]+)(\/.*)?$/;

const GET_TIMEOUT_MS = 8000;
const TEMP_PREFIX = "hors-ligne-";

interface QueueItem {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  tempId?: string;
  createdAt: number;
}

export interface OfflineStatus {
  online: boolean;
  pending: number;
  syncing: boolean;
  lastSyncOk: number; // nombre d'opérations envoyées lors de la dernière synchro
  lastErrors: string[];
}

let status: OfflineStatus = {
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  pending: 0,
  syncing: false,
  lastSyncOk: 0,
  lastErrors: [],
};
const listeners = new Set<(s: OfflineStatus) => void>();

function setStatus(patch: Partial<OfflineStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l(status));
}

export function getOfflineStatus() {
  return status;
}

export function subscribeOfflineStatus(fn: (s: OfflineStatus) => void) {
  listeners.add(fn);
  fn(status);
  return () => {
    listeners.delete(fn);
  };
}

// ─── IndexedDB (petit utilitaire sans dépendance) ────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CACHE)) db.createObjectStore(STORE_CACHE);
      if (!db.objectStoreNames.contains(STORE_QUEUE)) db.createObjectStore(STORE_QUEUE, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

function idb<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      })
  );
}

const cacheGet = (key: string) => idb<{ data: any; ts: number } | undefined>(STORE_CACHE, "readonly", (s) => s.get(key));
const cachePut = (key: string, data: any) => idb(STORE_CACHE, "readwrite", (s) => s.put({ data, ts: Date.now() }, key));
const cacheKeys = () => idb<IDBValidKey[]>(STORE_CACHE, "readonly", (s) => s.getAllKeys());
const queueAll = () => idb<QueueItem[]>(STORE_QUEUE, "readonly", (s) => s.getAll());
const queueAdd = (item: QueueItem) => idb(STORE_QUEUE, "readwrite", (s) => s.add(item));
const queueDelete = (id: number) => idb(STORE_QUEUE, "readwrite", (s) => s.delete(id));

async function refreshPending() {
  try {
    setStatus({ pending: (await queueAll()).length });
  } catch {
    /* IndexedDB indisponible */
  }
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

// Les données gardées sont propres à l'utilisateur connecté sur l'appareil.
function userScope(): string {
  try {
    const s = JSON.parse(localStorage.getItem("session_user") || "null");
    return s?.numeroH || s?.numero_h || "anon";
  } catch {
    return "anon";
  }
}

function absUrl(url: string) {
  return new URL(url, window.location.href).href;
}

function cacheKey(url: string) {
  return `${userScope()}|${absUrl(url)}`;
}

function pathOf(url: string) {
  return new URL(url, window.location.href).pathname;
}

function matches(url: string, patterns: RegExp[]) {
  const path = pathOf(url);
  return patterns.some((p) => p.test(path));
}

function headersToObject(h?: HeadersInit): Record<string, string> {
  const out: Record<string, string> = {};
  if (!h) return out;
  new Headers(h).forEach((v, k) => (out[k] = v));
  return out;
}

function jsonResponse(data: any, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

function isNetworkError(e: unknown) {
  return e instanceof TypeError || (e as any)?.name === "AbortError";
}

// Parcourt une réponse JSON et applique fn sur chaque tableau d'objets rencontré
function mapArrays(data: any, fn: (arr: any[]) => any[]): any {
  if (Array.isArray(data)) return fn(data.map((x) => mapArrays(x, fn)));
  if (data && typeof data === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(data)) out[k] = mapArrays(v, fn);
    return out;
  }
  return data;
}

function findById(data: any, id: string): any {
  if (Array.isArray(data)) {
    for (const x of data) {
      const f = findById(x, id);
      if (f) return f;
    }
  } else if (data && typeof data === "object") {
    if (data.id != null && String(data.id) === id) return data;
    for (const v of Object.values(data)) {
      const f = findById(v, id);
      if (f) return f;
    }
  }
  return null;
}

// ─── Mise à jour optimiste des copies locales ────────────────────────────────

async function eachCachedUnder(base: string, fn: (key: string, data: any, path: string) => any) {
  const scope = userScope() + "|";
  const keys = (await cacheKeys()).map(String).filter((k) => k.startsWith(scope + base));
  for (const key of keys) {
    const entry = await cacheGet(key);
    if (!entry) continue;
    const path = new URL(key.slice(scope.length)).pathname;
    const next = fn(key, entry.data, path);
    if (next !== undefined) await cachePut(key, next);
  }
}

async function applyOptimistic(url: string, method: string, body: any, tempId?: string): Promise<any> {
  const full = absUrl(url);
  const m = full.match(TENANT_BASE);
  if (!m) return null;
  const base = m[1];
  const sub = new URL(full).pathname.slice(new URL(base).pathname.length) || "/";
  const segs = sub.split("/").filter(Boolean);

  if (method === "POST" && tempId) {
    const item = { ...(body || {}), id: tempId, _horsLigne: true, created_at: new Date().toISOString() };
    const collection = new URL(base).pathname + sub;
    await eachCachedUnder(base, (_k, data, path) => {
      if (path !== collection) return undefined;
      let done = false;
      return mapArrays(data, (arr) => {
        if (done || (arr.length && typeof arr[0] !== "object")) return arr;
        done = true;
        return [item, ...arr];
      });
    });
    return item;
  }

  if (sub === "/settings") {
    let merged: any = null;
    await eachCachedUnder(base, (_k, data) => {
      if (!data?.tenant) return undefined;
      merged = { ...data.tenant, ...(body || {}) };
      return { ...data, tenant: merged };
    });
    return merged;
  }

  // PUT / DELETE sur /collection/:id[/action]
  if (segs.length < 2) return null;
  const id = segs[1];
  const collectionPath = new URL(base).pathname + "/" + segs[0];
  const isPlainUpdate = segs.length === 2;
  let found: any = null;

  await eachCachedUnder(base, (_k, data, path) => {
    const hit = findById(data, id);
    if (!hit) return undefined;
    if (!found) found = { ...hit, ...(isPlainUpdate ? body || {} : {}) };
    if (method === "DELETE" && path === collectionPath) {
      return mapArrays(data, (arr) => arr.filter((x) => !(x && typeof x === "object" && String(x.id) === id)));
    }
    if (method === "PUT" && isPlainUpdate) {
      return mapArrays(data, (arr) => arr.map((x) => (x && typeof x === "object" && String(x.id) === id ? { ...x, ...(body || {}) } : x)));
    }
    return undefined;
  });
  return found;
}

// Réponse renvoyée à l'écran pour une écriture mise en attente : { success: true }
// et, pour toute autre propriété lue (d.patient, d.student, d.invoice…),
// l'élément créé / modifié localement.
function queuedResponse(item: any) {
  const base: any = {
    success: true,
    queued: true,
    offline: true,
    message: "Enregistré sur l'appareil — sera envoyé dès le retour de la connexion",
  };
  const falsy = new Set(["conflict", "error", "errors", "then", "toJSON", "generated"]);
  const proxy = new Proxy(base, {
    get(target, prop) {
      if (prop in target) return target[prop as string];
      if (typeof prop !== "string" || falsy.has(prop)) return undefined;
      return item ?? { id: undefined };
    },
  });
  const res = jsonResponse(base, 202, { "X-Moftal-Offline": "queued" });
  Object.defineProperty(res, "json", { value: async () => proxy });
  return res;
}

// ─── Lecture ─────────────────────────────────────────────────────────────────

async function handleGet(original: typeof fetch, req: Request): Promise<Response> {
  const key = cacheKey(req.url);
  const store = (res: Response) => {
    if (!res.ok) return;
    res
      .clone()
      .json()
      .then((data) => cachePut(key, data))
      .catch(() => {});
  };

  const network = original(req.clone()).then((res) => {
    store(res);
    setStatus({ online: true });
    return res;
  });

  const fromCache = async (): Promise<Response | null> => {
    const entry = await cacheGet(key).catch(() => undefined);
    return entry ? jsonResponse(entry.data, 200, { "X-Moftal-Offline": "cache" }) : null;
  };

  if (!navigator.onLine) {
    network.catch(() => {});
    const cached = await fromCache();
    if (cached) return cached;
    return network.catch(() => offlineMissing());
  }

  try {
    return await Promise.race([
      network,
      new Promise<Response>((_, reject) => setTimeout(() => reject(new TypeError("timeout")), GET_TIMEOUT_MS)),
    ]);
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    const cached = await fromCache();
    if (cached) {
      network.catch(() => {});
      return cached;
    }
    // Pas de copie locale : on laisse le réseau finir (connexion lente)
    return network.catch(() => offlineMissing());
  }
}

function offlineMissing() {
  setStatus({ online: false });
  return jsonResponse(
    {
      success: false,
      offline: true,
      message: "Pas de connexion — ces données n'ont pas encore été ouvertes sur cet appareil.",
    },
    503
  );
}

// ─── Écriture ────────────────────────────────────────────────────────────────

async function handleWrite(original: typeof fetch, req: Request, init?: RequestInit): Promise<Response> {
  const method = req.method.toUpperCase();
  let bodyText: string | null = null;
  if (init?.body != null) {
    if (typeof init.body !== "string") return original(req); // fichiers / FormData : pas de file d'attente
    bodyText = init.body;
  }

  const enqueue = async () => {
    if (matches(req.url, ONLINE_ONLY_PATTERNS)) {
      return jsonResponse(
        { success: false, offline: true, message: "Cette action a besoin d'une connexion internet." },
        503
      );
    }
    let body: any = null;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      /* corps non JSON */
    }
    const tempId = method === "POST" ? `${TEMP_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 7)}` : undefined;

    // Suppression d'un élément créé hors ligne et pas encore envoyé : on annule simplement la création
    if (method === "DELETE") {
      const pendingCreate = (await queueAll()).find((q) => q.tempId && pathOf(req.url).split("/").includes(q.tempId));
      if (pendingCreate?.id != null) {
        await queueDelete(pendingCreate.id);
        await applyOptimistic(req.url, method, null);
        await refreshPending();
        return queuedResponse(null);
      }
    }

    await queueAdd({
      url: absUrl(req.url),
      method,
      headers: headersToObject(init?.headers),
      body: bodyText,
      tempId,
      createdAt: Date.now(),
    });
    const item = await applyOptimistic(req.url, method, body, tempId).catch(() => null);
    setStatus({ online: false });
    await refreshPending();
    return queuedResponse(item ?? (tempId ? { ...(body || {}), id: tempId, _horsLigne: true } : body));
  };

  // S'il reste des opérations en attente, les nouvelles passent derrière (ordre conservé)
  if (!navigator.onLine || status.pending > 0) {
    if (status.pending > 0 && navigator.onLine) void syncNow();
    return enqueue();
  }
  try {
    return await original(req);
  } catch (e) {
    if (isNetworkError(e)) return enqueue();
    throw e;
  }
}

// ─── Synchronisation ─────────────────────────────────────────────────────────

let originalFetch: typeof fetch | null = null;
let syncing: Promise<void> | null = null;

// Identifiants temporaires déjà remplacés par le vrai identifiant du serveur
const ID_MAP_KEY = "moftal-offline-idmap";
function loadIdMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(ID_MAP_KEY) || "{}");
  } catch {
    return {};
  }
}
function rememberId(tempId: string, realId: string) {
  const map = loadIdMap();
  map[tempId] = realId;
  try {
    localStorage.setItem(ID_MAP_KEY, JSON.stringify(map));
  } catch {
    /* stockage plein */
  }
}
function replaceIds(text: string, map: Record<string, string>) {
  let out = text;
  for (const [tmp, real] of Object.entries(map)) {
    if (!out.includes(tmp)) continue;
    // "hors-ligne-…" entre guillemets devient un nombre si le vrai id est numérique
    const realJson = /^\d+$/.test(real) ? real : JSON.stringify(real);
    out = out.split(JSON.stringify(tmp)).join(realJson).split(tmp).join(real);
  }
  return out;
}

function findRealId(data: any): string | null {
  if (!data || typeof data !== "object") return null;
  for (const v of Object.values(data)) {
    if (v && typeof v === "object" && !Array.isArray(v) && (v as any).id != null) return String((v as any).id);
  }
  return data.id != null ? String(data.id) : null;
}

export function syncNow(): Promise<void> {
  if (syncing) return syncing;
  if (!originalFetch) return Promise.resolve();
  const doFetch = originalFetch;

  syncing = (async () => {
    let items: QueueItem[];
    try {
      items = (await queueAll()).sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    } catch {
      return;
    }
    if (!items.length) return;
    setStatus({ syncing: true, lastSyncOk: 0, lastErrors: [] });
    let sent = 0;
    const errors: string[] = [];

    for (const item of items) {
      const idMap = loadIdMap();
      const url = replaceIds(item.url, idMap);
      const body = item.body ? replaceIds(item.body, idMap) : item.body;
      const headers = { ...item.headers };
      const token = localStorage.getItem("token");
      if (token && headers["authorization"]) headers["authorization"] = `Bearer ${token}`;

      let res: Response;
      try {
        res = await doFetch(url, { method: item.method, headers, body: body ?? undefined });
      } catch {
        setStatus({ online: false });
        break; // toujours pas de connexion : on réessaiera plus tard
      }
      setStatus({ online: true });
      if (res.status === 401 || res.status === 402) {
        // Session expirée / accès bloqué : on garde les opérations pour plus tard
        errors.push("Reconnectez-vous pour envoyer les opérations en attente.");
        break;
      }
      if (res.status >= 500) break; // serveur indisponible : on réessaiera

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        /* réponse vide */
      }
      if (!res.ok || data?.success === false) {
        errors.push(data?.message || `Opération refusée par le serveur (${res.status})`);
      } else {
        sent++;
      }
      await queueDelete(item.id!);

      const realId = item.tempId ? findRealId(data) : null;
      if (item.tempId && realId) rememberId(item.tempId, realId);
    }

    await refreshPending();
    setStatus({ syncing: false, lastSyncOk: sent, lastErrors: errors });
    if (sent > 0) window.dispatchEvent(new CustomEvent("moftal-offline-synced", { detail: { sent } }));
  })().finally(() => {
    syncing = null;
    setStatus({ syncing: false });
    // Des opérations ajoutées pendant l'envoi ? On continue.
    if (status.pending > 0 && navigator.onLine && status.lastSyncOk > 0 && !status.lastErrors.length) {
      setTimeout(() => void syncNow(), 1000);
    }
  });
  return syncing;
}

// ─── Installation ────────────────────────────────────────────────────────────

let installed = false;

export function installOfflineSync() {
  if (installed || typeof window === "undefined" || !("indexedDB" in window)) return;
  installed = true;
  const original = window.fetch.bind(window);
  originalFetch = original;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let req: Request;
    try {
      req = new Request(input, init);
    } catch {
      return original(input, init);
    }
    const method = req.method.toUpperCase();
    try {
      if (method === "GET" && matches(req.url, CACHE_PATTERNS)) return await handleGet(original, req);
      if (method !== "GET" && method !== "HEAD" && matches(req.url, QUEUE_PATTERNS)) return await handleWrite(original, req, init);
    } catch (e) {
      if (!isNetworkError(e)) console.warn("[hors-ligne]", e);
      throw e;
    }
    return original(input, init);
  };

  window.addEventListener("online", () => {
    setStatus({ online: true });
    void syncNow();
  });
  window.addEventListener("offline", () => setStatus({ online: false }));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine) void syncNow();
  });
  // Filet de sécurité : l'évènement « online » n'est pas toujours fiable sur mobile
  setInterval(() => {
    if (status.pending > 0 && navigator.onLine) void syncNow();
  }, 30_000);

  void refreshPending().then(() => {
    if (navigator.onLine) void syncNow();
  });
}
