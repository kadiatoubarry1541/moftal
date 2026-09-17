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

function getRadianAngle(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Dimensions du rectangle englobant l'image une fois pivotée. */
function rotatedSize(width: number, height: number, rotation: number) {
  const rad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

/** Dessine l'image pivotée (si besoin) puis découpée sur le canvas fourni. */
async function drawRotatedCrop(canvas: HTMLCanvasElement, imageSrc: string, cropPixels: PixelCrop, rotation: number) {
  const image = await loadImage(imageSrc);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non supporté');

  if (!rotation) {
    canvas.width = cropPixels.width;
    canvas.height = cropPixels.height;
    ctx.drawImage(
      image,
      cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
      0, 0, cropPixels.width, cropPixels.height
    );
    return;
  }

  // L'image doit d'abord être pivotée en entier (dans un canvas assez grand
  // pour la contenir), puis on découpe la zone choisie sur ce résultat pivoté
  // — les coordonnées de cropPixels sont déjà exprimées dans ce repère pivoté.
  const { width: bw, height: bh } = rotatedSize(image.width, image.height, rotation);
  const rotCanvas = document.createElement('canvas');
  rotCanvas.width = bw;
  rotCanvas.height = bh;
  const rotCtx = rotCanvas.getContext('2d');
  if (!rotCtx) throw new Error('Canvas non supporté');
  rotCtx.translate(bw / 2, bh / 2);
  rotCtx.rotate(getRadianAngle(rotation));
  rotCtx.translate(-image.width / 2, -image.height / 2);
  rotCtx.drawImage(image, 0, 0);

  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;
  ctx.drawImage(
    rotCanvas,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, cropPixels.width, cropPixels.height
  );
}

/** Découpe une image (avec rotation éventuelle) et renvoie un fichier JPEG prêt à téléverser. */
export async function getCroppedImageFile(
  imageSrc: string,
  cropPixels: PixelCrop,
  fileName: string,
  outputWidth?: number,
  outputHeight?: number,
  rotation = 0
): Promise<File> {
  const cropCanvas = document.createElement('canvas');
  await drawRotatedCrop(cropCanvas, imageSrc, cropPixels, rotation);

  let finalCanvas = cropCanvas;
  if (outputWidth && outputHeight) {
    finalCanvas = document.createElement('canvas');
    finalCanvas.width = outputWidth;
    finalCanvas.height = outputHeight;
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) throw new Error('Canvas non supporté');
    ctx.drawImage(cropCanvas, 0, 0, outputWidth, outputHeight);
  }

  return new Promise((resolve, reject) => {
    finalCanvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Échec du découpage de l\'image')); return; }
      const baseName = fileName.replace(/\.[^.]+$/, '') || 'image';
      resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  });
}

/** Miniature d'aperçu (data URL) du cadrage actuel, avec rotation éventuelle. */
export async function getCroppedPreviewDataUrl(
  imageSrc: string,
  cropPixels: PixelCrop,
  previewWidth: number,
  previewHeight: number,
  rotation = 0
): Promise<string> {
  const cropCanvas = document.createElement('canvas');
  await drawRotatedCrop(cropCanvas, imageSrc, cropPixels, rotation);

  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = previewWidth;
  previewCanvas.height = previewHeight;
  const ctx = previewCanvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non supporté');
  ctx.drawImage(cropCanvas, 0, 0, previewWidth, previewHeight);
  return previewCanvas.toDataURL('image/jpeg', 0.85);
}
