import fs from "fs";
import path from "path";
import png2icons from "png2icons";

const root = "c:/Users/manex/Documents/Dev/Streaming APP";

console.log("--- Generating proper icons for Dayumi Hub and Dayumi Movies ---");

// 1. Dayumi Movies Icon (Violet Movie Crystal)
const moviePngPath = path.join(root, "Dayumi/branding/logo_cristal_violet_movie.png");
const movieIcoDest = path.join(root, "Dayumi-Movies/public/icon.ico");
const moviePngDest = path.join(root, "Dayumi-Movies/public/icon.png");

if (fs.existsSync(moviePngPath)) {
  const movieBuf = fs.readFileSync(moviePngPath);
  fs.writeFileSync(moviePngDest, movieBuf);
  const movieIco = png2icons.createICO(movieBuf, png2icons.BICUBIC, 0, false);
  if (movieIco) {
    fs.writeFileSync(movieIcoDest, movieIco);
    console.log("[OK] Generated Dayumi Movies icon.ico and icon.png from logo_cristal_violet_movie.png");
  }
}

// 2. Dayumi Hub Icon (Violet Hub Crystal)
const hubPngPath = path.join(root, "Dayumi/branding/logo_cristal_violet_hub.png");
const hubLogoDest = path.join(root, "Dayumi/hub/dist/logo.png");
const hubIcoDest = path.join(root, "Dayumi/hub/dist/icon.ico");

if (fs.existsSync(hubPngPath)) {
  const hubBuf = fs.readFileSync(hubPngPath);
  fs.writeFileSync(hubLogoDest, hubBuf);
  console.log("[OK] Replaced glitched Dayumi/hub/dist/logo.png with clean logo_cristal_violet_hub.png");

  const hubIco = png2icons.createICO(hubBuf, png2icons.BICUBIC, 0, false);
  if (hubIco) {
    fs.writeFileSync(hubIcoDest, hubIco);
    console.log("[OK] Generated Dayumi Hub dist/icon.ico from logo_cristal_violet_hub.png");
  }
}

