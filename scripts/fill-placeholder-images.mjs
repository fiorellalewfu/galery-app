import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, "data", "oeuvres.json");
const IMAGES_DIR = path.join(ROOT, "images");

// Image "placeholder" (tu peux la remplacer plus tard par de vraies photos).
const PLACEHOLDER = path.join(ROOT, "assets", "vitrail-hd.jpg");

if (!fs.existsSync(DATA_PATH)) {
  console.error("ERREUR: data/oeuvres.json introuvable.");
  process.exit(1);
}
if (!fs.existsSync(PLACEHOLDER)) {
  console.error("ERREUR: placeholder introuvable:", PLACEHOLDER);
  process.exit(1);
}
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

const oeuvres = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
if (!Array.isArray(oeuvres)) {
  console.error("ERREUR: data/oeuvres.json doit etre un tableau.");
  process.exit(1);
}

let created = 0;
let skipped = 0;

for (const o of oeuvres) {
  const imgRel = o?.image;
  if (!imgRel || typeof imgRel !== "string") {
    skipped++;
    continue;
  }
  const imgPath = path.join(ROOT, imgRel);
  if (fs.existsSync(imgPath)) {
    skipped++;
    continue;
  }

  // Copie simple (pas de symlink/hardlink pour eviter les problemes Windows).
  fs.copyFileSync(PLACEHOLDER, imgPath);
  created++;
}

console.log(`OK: ${created} images placeholders creees dans images/ (deja presentes: ${skipped})`);

