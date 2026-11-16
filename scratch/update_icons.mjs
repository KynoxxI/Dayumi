import fs from "node:fs";
import path from "node:path";
import png2icons from "png2icons";

const root = "c:/Users/manex/Documents/Dev/Streaming APP/Dayumi";
const src = path.join(root, "hub/dist/dayumi-anime.png");

// 1. Copy to public/icon.png and dist/icon.png and dayumi-anime.png
for (const dir of ["public", "dist"]) {
  fs.copyFileSync(src, path.join(root, dir, "dayumi-anime.png"));
  fs.copyFileSync(src, path.join(root, dir, "icon.png"));
}

// 2. Generate ICO and ICNS
const input = fs.readFileSync(src);
const ico = png2icons.createICO(input, png2icons.BICUBIC, 0, false);
if (ico) {
  fs.writeFileSync(path.join(root, "public/icon.ico"), ico);
  fs.writeFileSync(path.join(root, "dist/icon.ico"), ico);
  console.log("Generated icon.ico successfully");
}

const icns = png2icons.createICNS(input, png2icons.BICUBIC, 0);
if (icns) {
  fs.writeFileSync(path.join(root, "public/icon.icns"), icns);
  fs.writeFileSync(path.join(root, "dist/icon.icns"), icns);
  console.log("Generated icon.icns successfully");
}

