// Médias d'une publication (photos, vidéos, messages vocaux) — voir components/AjoutMedias
export interface Medias {
  images: File[];
  videos: File[];
  audios: File[];
}

export const MEDIAS_VIDES: Medias = { images: [], videos: [], audios: [] };
