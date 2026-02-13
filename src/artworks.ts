export interface ArtworkSource {
  id: string;
  artiste?: string;
  titre?: string;
  annee?: number | string;
  periode?: string;
  type?: string;
  image?: string;
  resume?: string;
  contexte?: string;
  materiaux?: string[];
  lieu?: string;
  mots_cles?: string[];
  source_url?: string;
  palette?: string[];
}

export interface ArtworkInfo {
  artist: string;
  year: string;
  period: string;
  type: string;
  materials: string[];
  place: string;
  keywords: string[];
  description: string;
}

export interface ArtworkRecord {
  id: string;
  title: string;
  imageSrc: string;
  info: ArtworkInfo;
  linkUrl: string;
  palette: string[];
}

const asString = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};

const normalizeImagePath = (path: string): string => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return path;
  if (path.startsWith("images/")) return `/${path}`;
  return `/images/${path}`;
};

export const createArtworkDataset = (source: ArtworkSource[]): ArtworkRecord[] => {
  return source.map((item) => {
    const title = asString(item.titre) || "Oeuvre";
    const year = item.annee === undefined || item.annee === null ? "" : String(item.annee);
    const description = asString(item.contexte) || asString(item.resume);
    return {
      id: item.id,
      title,
      imageSrc: normalizeImagePath(asString(item.image)),
      info: {
        artist: asString(item.artiste) || "Marcelle Ferron",
        year,
        period: asString(item.periode),
        type: asString(item.type),
        materials: asStringArray(item.materiaux),
        place: asString(item.lieu),
        keywords: asStringArray(item.mots_cles),
        description
      },
      linkUrl: asString(item.source_url),
      palette: asStringArray(item.palette)
    };
  });
};

export const findArtworkById = (
  artworks: ArtworkRecord[],
  id: string | null
): ArtworkRecord | undefined => {
  if (!id) return undefined;
  return artworks.find((artwork) => artwork.id === id);
};
