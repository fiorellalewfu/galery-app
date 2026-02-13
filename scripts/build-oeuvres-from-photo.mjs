import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PHOTO_PATH = path.join(ROOT, "assets", "photo.json");
const OUT_PATH = path.join(ROOT, "data", "oeuvres.json");
const BACKUP_PATH = path.join(ROOT, "data", "oeuvres.backup.json");

const normalizeSourceUrl = (u) => {
  if (!u) return "";
  try {
    const url = new URL(u);
    // Canonique: pas de query/fragment, pathname sans double slash, et slash final.
    let p = url.pathname.replace(/\/{2,}/g, "/");
    if (!p.endsWith("/")) p += "/";
    return `${url.origin}${p}`;
  } catch {
    return String(u).trim();
  }
};

const slugFromUrl = (u) => {
  const url = new URL(u);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
};

const stripHtml = (s) => String(s ?? "").replace(/<[^>]*>/g, "").trim();

const guessPeriod = (dateStr) => {
  const m = String(dateStr ?? "").match(/(\d{4})/);
  const y = m ? Number(m[1]) : 0;
  if (!y) return "toutes";
  if (y < 1950) return "1940s";
  if (y < 1960) return "1950s";
  if (y < 1970) return "1960s";
  return "1970s-80s";
};

const safeReadJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

const photo = safeReadJson(PHOTO_PATH);

let old = [];
if (fs.existsSync(OUT_PATH)) {
  try {
    old = safeReadJson(OUT_PATH);
  } catch {
    old = [];
  }
}

// Map pour conserver tes champs enrichis (palette, tags, contexte, etc.)
const oldBySource = new Map();
for (const item of Array.isArray(old) ? old : []) {
  const key = normalizeSourceUrl(item?.source_url);
  if (key) oldBySource.set(key, item);
}

const out = [];
const seen = new Set();

const pushWork = (w) => {
  const baseUrl = normalizeSourceUrl(w.url);
  const id = slugFromUrl(w.url);
  if (!id) return;

  const merged = (() => {
    const prev = oldBySource.get(baseUrl);
    if (!prev) {
      return {
        id,
        artiste: "Marcelle Ferron",
        titre: w.titre,
        annee: w.dateProduction,
        periode: guessPeriod(w.dateProduction),
        type: "Oeuvre",
        tags: [],
        mots_cles: [],
        palette: ["#1b1b1b", "#f0f0f0", "#6249AC"],
        image: `images/${id}.jpg`,
        source: "MACrépertoire (MACM)",
        source_url: baseUrl
      };
    }

    // Préserver les enrichissements, mais basculer sur l'id (slug) stable.
    return {
      ...prev,
      id,
      titre: prev.titre ?? w.titre,
      annee: prev.annee ?? w.dateProduction,
      periode: prev.periode ?? guessPeriod(w.dateProduction),
      type: prev.type ?? "Oeuvre",
      artiste: prev.artiste ?? "Marcelle Ferron",
      source: prev.source ?? "MACrépertoire (MACM)",
      source_url: baseUrl,
      // L'image suit toujours l'id (slug). Si tu veux garder tes anciens noms, remplace ici.
      image: `images/${id}.jpg`
    };
  })();

  // Dédupliquer
  if (seen.has(merged.id)) return;
  seen.add(merged.id);
  out.push(merged);
};

for (const o of photo.oeuvres ?? []) {
  const artist = stripHtml(o.libelleNomsArtistes);

  // Si l'entrée principale n'est pas Ferron mais contient des elements Ferron, on ne garde que les elements.
  if (Array.isArray(o.elements) && o.elements.length) {
    for (const e of o.elements) {
      pushWork(e);
    }
    if (artist.includes("Marcelle Ferron")) {
      pushWork(o);
    }
    continue;
  }

  if (artist.includes("Marcelle Ferron")) {
    pushWork(o);
  }
}

// Trier par année (approx: premier 4 chiffres) puis titre
out.sort((a, b) => {
  const ya = Number(String(a.annee ?? "").match(/(\d{4})/)?.[1] ?? 0);
  const yb = Number(String(b.annee ?? "").match(/(\d{4})/)?.[1] ?? 0);
  if (ya !== yb) return ya - yb;
  return String(a.titre ?? "").localeCompare(String(b.titre ?? ""), "fr");
});

if (fs.existsSync(OUT_PATH)) {
  fs.copyFileSync(OUT_PATH, BACKUP_PATH);
}

fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`OK: ${out.length} oeuvres ecrites dans data/oeuvres.json (backup: data/oeuvres.backup.json)`);

