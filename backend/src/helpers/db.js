/** D1 query helpers */

export function uid() {
  return crypto.randomUUID().replace(/-/g, '');
}

export async function dbFirst(db, sql, params = []) {
  const stmt = db.prepare(sql);
  return params.length ? stmt.bind(...params).first() : stmt.first();
}

export async function dbAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  const result = params.length ? await stmt.bind(...params).all() : await stmt.all();
  return result.results ?? [];
}

export async function dbRun(db, sql, params = []) {
  const stmt = db.prepare(sql);
  return params.length ? stmt.bind(...params).run() : stmt.run();
}

export async function dbBatch(db, statements) {
  return db.batch(statements);
}

export function now() {
  return new Date().toISOString();
}
