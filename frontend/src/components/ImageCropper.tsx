import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImageFile, getCroppedPreviewDataUrl, type PixelCrop } from '../utils/cropImage';

interface Props {
  file: File;
  /** Largeur / hauteur souhaitée, ex. 4 pour un format 4:1 comme les bannières de publicité */
  aspect: number;
  outputWidth?: number;
  outputHeight?: number;
  title?: string;
  onCancel: () => void;
  onConfirm: (croppedFile: File) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;
const PREVIEW_WIDTH = 240;

/**
 * Recadrage façon WhatsApp avant l'envoi : on ajuste la photo dans un cadre
 * au format exact de la carte finale (annonce/publicité), avec un aperçu en
 * direct de ce qui sera exactement publié — pour bien cadrer avant l'envoi.
 */
export default function ImageCropper({ file, aspect, outputWidth, outputHeight, title, onCancel, onConfirm }: Props) {
  const [imageSrc] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => () => URL.revokeObjectURL(imageSrc), [imageSrc]);

  const onCropComplete = useCallback((_croppedArea: unknown, pixels: PixelCrop) => {
    setCroppedAreaPixels(pixels);
    getCroppedPreviewDataUrl(imageSrc, pixels, PREVIEW_WIDTH, Math.round(PREVIEW_WIDTH / aspect), rotation)
      .then(setPreviewUrl)
      .catch(() => {});
  }, [imageSrc, aspect, rotation]);

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const cropped = await getCroppedImageFile(imageSrc, croppedAreaPixels, file.name, outputWidth, outputHeight, rotation);
      onConfirm(cropped);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white flex-shrink-0">
        <button type="button" onClick={onCancel} className="text-sm font-semibold text-gray-300 hover:text-white">
          Annuler
        </button>
        <h3 className="font-semibold text-sm">{title || "Ajuster l'image"}</h3>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={processing || !croppedAreaPixels}
          className="text-emerald-400 font-bold text-sm disabled:opacity-40"
        >
          {processing ? '...' : 'Valider'}
        </button>
      </div>

      <p className="text-center text-gray-300 text-xs px-6 py-2 flex-shrink-0">
        Faites glisser l'image et zoomez pour bien la cadrer dans le cadre.
      </p>

      <div className="relative flex-1 min-h-0">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          showGrid
        />
      </div>

      <div className="bg-black/90 flex-shrink-0 px-4 py-3 space-y-3">
        {/* Zoom : boutons +/- en plus du curseur, pour un réglage plus précis */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setZoom(z => Math.max(MIN_ZOOM, Number((z - ZOOM_STEP).toFixed(2))))}
            className="w-8 h-8 flex-shrink-0 rounded-full bg-white/15 hover:bg-white/25 text-white text-lg font-bold flex items-center justify-center"
            aria-label="Dézoomer"
          >
            −
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={ZOOM_STEP}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-emerald-500"
            aria-label="Zoom"
          />
          <button
            type="button"
            onClick={() => setZoom(z => Math.min(MAX_ZOOM, Number((z + ZOOM_STEP).toFixed(2))))}
            className="w-8 h-8 flex-shrink-0 rounded-full bg-white/15 hover:bg-white/25 text-white text-lg font-bold flex items-center justify-center"
            aria-label="Zoomer"
          >
            +
          </button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setRotation(r => (r + 90) % 360)}
            className="text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1"
          >
            ↻ Pivoter
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1"
          >
            ↺ Réinitialiser
          </button>
          {/* Aperçu en direct — exactement ce qui sera publié */}
          {previewUrl && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400">Aperçu :</span>
              <img
                src={previewUrl}
                alt="Aperçu du cadrage"
                className="rounded border border-white/30"
                style={{ width: 64, height: Math.round(64 / aspect) }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
