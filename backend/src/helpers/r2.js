/** R2 storage helpers */

export async function uploadToR2(bucket, key, data, contentType) {
  await bucket.put(key, data, {
    httpMetadata: { contentType },
  });
  return key;
}

export async function getFromR2(bucket, key) {
  return bucket.get(key);
}

export async function deleteFromR2(bucket, key) {
  return bucket.delete(key);
}

export function r2KeyForUser(numeroH, filename) {
  return `users/${numeroH}/${filename}`;
}

export function r2KeyForGallery(familyName, albumType, filename) {
  return `gallery/${familyName}/${albumType}/${filename}`;
}

export function r2KeyForPro(proId, filename) {
  return `pros/${proId}/${filename}`;
}

export function r2KeyForDocument(userId, filename) {
  return `docs/${userId}/${filename}`;
}

/** Convert R2 object to base64 data URL (for backward compat with existing frontend) */
export async function r2ToDataUrl(r2Object) {
  if (!r2Object) return null;
  const ct = r2Object.httpMetadata?.contentType ?? 'application/octet-stream';
  const buf = await r2Object.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return `data:${ct};base64,${b64}`;
}
