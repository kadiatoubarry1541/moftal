import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImageFile, type PixelCrop } from '../utils/cropImage';

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

/**
 * Recadrage façon WhatsApp avant l'envoi : on ajuste la photo dans un cadre
 * au format exact de la carte finale (annonce/publicité), pour savoir
 * précisément ce qui s'affichera avant même la publication.
 */
export default function ImageCropper({ file, aspect, outputWidth, outputHeight, title, onCancel, onConfirm }: Props) {
  const [imageSrc] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => () => URL.revokeObjectURL(imageSrc), [imageSrc]);

  const onCropComplete = useCallback((_croppedArea: unknown, pixels: PixelCrop) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const cropped = await getCroppedImageFile(imageSrc, croppedAreaPixels, file.name, outputWidth, outputHeight);
      onConfirm(cropped);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white flex-shrink-0">
        <button type="button" onClick={onCancel} className="text-2xl leading-none w-8">×</button>
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
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          showGrid
        />
      </div>
      <div className="px-6 py-4 bg-black/80 flex-shrink-0 flex items-center gap-3">
        <span className="text-white text-xs">🔍</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
      </div>
    </div>
  );
}
