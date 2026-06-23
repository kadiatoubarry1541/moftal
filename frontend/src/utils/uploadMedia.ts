const API_BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL + '/api'
  : '/api';

/**
 * Upload un fichier vers le stockage cloud (ImageKit pour images, R2 pour vidéos/docs)
 * Retourne l'URL publique du fichier uploadé
 */
export async function uploadMedia(
  file: File,
  folder?: string
): Promise<string> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Non connecté');

  const formData = new FormData();
  formData.append('file', file);
  if (folder) formData.append('folder', folder);

  const res = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Erreur upload');
  return data.url;
}

/**
 * Upload lors de l'inscription (sans token, endpoint public limité)
 */
export async function uploadForRegistration(
  file: File | Blob,
  folder?: string,
  filename?: string
): Promise<string> {
  const formData = new FormData();
  const name = filename || (file instanceof File ? file.name : 'video.mp4');
  formData.append('file', file, name);
  if (folder) formData.append('folder', folder);

  const res = await fetch(`${API_BASE_URL}/upload/register`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Erreur upload');
  return data.url;
}

/**
 * Convertit un fichier en base64 (fallback si upload échoue)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload avec fallback base64 si le serveur échoue
 */
export async function uploadMediaSafe(file: File, folder?: string): Promise<string> {
  try {
    return await uploadMedia(file, folder);
  } catch (e) {
    console.warn('Upload cloud échoué, fallback base64:', e);
    return fileToBase64(file);
  }
}
