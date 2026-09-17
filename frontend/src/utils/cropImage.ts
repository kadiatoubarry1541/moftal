export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = url;
  });
}

/** Découpe une image selon la zone choisie et renvoie un fichier JPEG prêt à téléverser. */
export async function getCroppedImageFile(
  imageSrc: string,
  cropPixels: PixelCrop,
  fileName: string,
  outputWidth?: number,
  outputHeight?: number
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth || cropPixels.width;
  canvas.height = outputHeight || cropPixels.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non supporté');

  ctx.drawImage(
    image,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, canvas.width, canvas.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Échec du découpage de l\'image')); return; }
      const baseName = fileName.replace(/\.[^.]+$/, '') || 'image';
      resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  });
}
