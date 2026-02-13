import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, "data", "oeuvres.json");
const BACKUP_PATH = path.join(ROOT, "data", "oeuvres.before-public.json");
const IMAGES_DIR = path.join(ROOT, "images");

const copyIfMissing = (src, dest) => {
  if (!fs.existsSync(src)) return false;
  if (fs.existsSync(dest)) return false;
  fs.copyFileSync(src, dest);
  return true;
};

const normalizeUrl = (u) => {
  if (!u) return "";
  try {
    const url = new URL(u);
    let p = url.pathname.replace(/\/{2,}/g, "/");
    if (!p.endsWith("/")) p += "/";
    return `${url.origin}${p}`;
  } catch {
    return String(u).trim();
  }
};

if (!fs.existsSync(DATA_PATH)) {
  console.error("ERREUR: data/oeuvres.json introuvable");
  process.exit(1);
}
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
if (!Array.isArray(data)) {
  console.error("ERREUR: data/oeuvres.json doit etre un tableau");
  process.exit(1);
}

const existsById = new Set(data.map((x) => x?.id).filter(Boolean));
const existsBySource = new Set(data.map((x) => normalizeUrl(x?.source_url)).filter(Boolean));

const PUBLIC = [
  {
    id: "les-grandes-formes-qui-dansent-champ-de-mars-1968",
    artiste: "Marcelle Ferron",
    titre: "Les grandes formes qui dansent (Champ-de-Mars, Montréal)",
    annee: "1968",
    periode: "1960s",
    type: "Vitrail (art public)",
    tags: ["vitrail", "art-public", "lumiere", "montreal"],
    mots_cles: ["plomb", "verre", "lumière", "métro", "Champ-de-Mars"],
    materiaux: ["verre", "plomb"],
    lieu: "Station Champ-de-Mars (métro de Montréal)",
    palette: ["#5F388F", "#6249AC", "#FEC842"],
    image: "images/ferron-champ-de-mars.jpg",
    source: "Wikimedia Commons (photo)",
    source_url: "https://commons.wikimedia.org/wiki/File:Les_grandes_formes_qui_dansent.jpg"
  },
  {
    id: "sans-titre-1979-palais-de-justice-granby",
    artiste: "Marcelle Ferron",
    titre: "Sans titre (vitrail), Palais de justice de Granby",
    annee: "1979",
    periode: "1970s-80s",
    type: "Vitrail (art public)",
    tags: ["vitrail", "art-public", "granby", "lumiere"],
    mots_cles: ["plomb", "verre", "lumière", "architecture"],
    materiaux: ["verre", "plomb"],
    lieu: "Palais de justice de Granby",
    palette: ["#ED575A", "#FEC842", "#6249AC"],
    image: "images/ferron-granby.jpg",
    source: "Wikimedia Commons (photo)",
    source_url: "https://commons.wikimedia.org/wiki/File:Marcelle_Ferron,_-Sans_titre-,_1979_(6932256174).jpg"
  },
  {
    id: "verriere-et-sculpture-1979-station-vendome",
    artiste: "Marcelle Ferron",
    titre: "Verrière et sculpture, station Vendôme (métro de Montréal)",
    annee: "1979",
    periode: "1970s-80s",
    type: "Vitrail (art public)",
    tags: ["vitrail", "art-public", "montreal", "vendome", "lumiere"],
    mots_cles: ["plomb", "verre", "lumière", "métro", "Vendôme"],
    materiaux: ["verre", "plomb"],
    lieu: "Station Vendôme (métro de Montréal)",
    palette: ["#5F388F", "#6249AC", "#FEC842"],
    image: "images/ferron-vendome.jpg",
    source: "Wikimedia Commons (photo)",
    source_url:
      "https://commons.wikimedia.org/wiki/File:Marcelle_Ferron,_Verri%C3%A8re_et_sculpture,_1979,_verre_et_acier_inoxydable,_station_Vend%C3%B4me,_m%C3%A9tro_de_Montr%C3%A9al_(12501634003).jpg"
  },
  {
    id: "untitled-1972-mmfa",
    artiste: "Marcelle Ferron",
    titre: "Untitled (vitrail), Musée des beaux-arts de Montréal (MMFA)",
    annee: "1972",
    periode: "1970s-80s",
    type: "Vitrail",
    tags: ["vitrail", "mmfa", "lumiere"],
    mots_cles: ["plomb", "verre", "lumière", "musée"],
    materiaux: ["verre", "plomb"],
    lieu: "Musée des beaux-arts de Montréal (MMFA)",
    palette: ["#5F388F", "#6249AC", "#FEC842"],
    image: "images/ferron-mmfa-untitled-1972.jpg",
    source: "Wikimedia Commons (photo)",
    source_url: "https://commons.wikimedia.org/wiki/File:Marcelle-ferron-untitled.jpg"
  }
];

// Copie les 4 vraies photos dans images/ pour que l'app les serve facilement
const copies = [
  copyIfMissing(path.join(ROOT, "assets", "ferron-champ-de-mars.jpg"), path.join(IMAGES_DIR, "ferron-champ-de-mars.jpg")),
  copyIfMissing(path.join(ROOT, "assets", "ferron-granby.jpg"), path.join(IMAGES_DIR, "ferron-granby.jpg")),
  copyIfMissing(path.join(ROOT, "assets", "ferron-vendome.jpg"), path.join(IMAGES_DIR, "ferron-vendome.jpg")),
  copyIfMissing(path.join(ROOT, "assets", "ferron-mmfa-untitled-1972.jpg"), path.join(IMAGES_DIR, "ferron-mmfa-untitled-1972.jpg"))
];

let added = 0;
for (const item of PUBLIC) {
  const src = normalizeUrl(item.source_url);
  if (existsById.has(item.id)) continue;
  if (src && existsBySource.has(src)) continue;
  data.push(item);
  added++;
}

fs.copyFileSync(DATA_PATH, BACKUP_PATH);
fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");

console.log(`OK: ${added} oeuvres publiques ajoutees (backup: data/oeuvres.before-public.json)`);
console.log(`OK: ${copies.filter(Boolean).length} photos copiees dans images/`);
