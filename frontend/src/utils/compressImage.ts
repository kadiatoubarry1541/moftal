/**
 * Réduit une photo avant l'envoi au serveur.
 * Les photos de téléphone pèsent souvent 3 à 12 Mo : sur réseau mobile l'envoi
 * est coupé (« Failed to fetch ») ou dépasse la limite du serveur (10 Mo).
 * On redimensionne (côté le plus long ≤ maxSize) et on ré-encode en JPEG.
 * Si le navigateur ne sait pas lire l'image (ex. HEIC), on renvoie le fichier d'origine.
 */
export async function compressImage(file: File, maxSize = 1600, quality = 0.85): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });

    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#fff'; // fond blanc pour les PNG transparents
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
