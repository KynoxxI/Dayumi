/** Génère les jeux d'icônes (.ico, .icns, .png) pour Anime, Movie, Hub et FM. Usage : `npm run icons` */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import png2icons from "png2icons";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const VARIANTS = [
  {
    name: "anime",
    src: path.join(root, "branding", "logo_cristal_orange_anime.png"),
    fallbackSrc: path.join(root, "public", "icon.png"),
    outDir: path.join(root, "public"),
  },
  {
    name: "movie",
    src: path.join(root, "branding", "logo_cristal_violet_movie.png"),
    outDir: path.join(root, "public", "movie"),
  },
  {
    name: "hub",
    src: path.join(root, "branding", "logo_cristal_violet_hub.png"),
    outDir: path.join(root, "public", "hub"),
  },
  {
    name: "fm",
    src: path.join(root, "branding", "logo_cristal_jaune_gold.png"),
    outDir: path.join(root, "public", "fm"),
  },
];

for (const variant of VARIANTS) {
  let srcPath = variant.src;
  if (!fs.existsSync(srcPath) && variant.fallbackSrc && fs.existsSync(variant.fallbackSrc)) {
    srcPath = variant.fallbackSrc;
  }

  if (!fs.existsSync(srcPath)) {
    console.warn(`⚠ Source introuvable pour ${variant.name} : ${srcPath}`);
    continue;
  }

  fs.mkdirSync(variant.outDir, { recursive: true });

  const input = fs.readFileSync(srcPath);

  // Copie en icon.png si dans un sous-dossier
  const pngDest = path.join(variant.outDir, "icon.png");
  if (pngDest !== srcPath) {
    fs.writeFileSync(pngDest, input);
  }

  // Génération .ico
  const ico = png2icons.createICO(input, png2icons.BICUBIC, 0, false);
  if (ico) {
    const icoPath = path.join(variant.outDir, "icon.ico");
    fs.writeFileSync(icoPath, ico);
    console.log(`✓ [${variant.name}] ${path.relative(root, icoPath)} (${(ico.length / 1024).toFixed(0)} Ko)`);
  }

  // Génération .icns
  const icns = png2icons.createICNS(input, png2icons.BICUBIC, 0);
  if (icns) {
    const icnsPath = path.join(variant.outDir, "icon.icns");
    fs.writeFileSync(icnsPath, icns);
    console.log(`✓ [${variant.name}] ${path.relative(root, icnsPath)} (${(icns.length / 1024).toFixed(0)} Ko)`);
  }
}

console.log("Icônes générées pour toutes les variantes.");
