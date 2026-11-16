/**
 * API locale si le dossier `api/` est présent, sinon l'API publique. `NARTYA_DEV_API` force
 * une adresse.
 * node scripts/dev.mjs web       interface dans le navigateur
 * node scripts/dev.mjs electron  fenêtre Electron
 */
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { API_URL } from "../src/config/instance.js";

// Lecture de .env pour propager VITE_APP si présent
try {
  const envPath = new URL("../.env", import.meta.url);
  if (existsSync(envPath)) {
    const raw = readFileSync(envPath, "utf8");
    for (const l of raw.split("\n")) {
      const trimmed = l.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
} catch (_) {}

const target = process.argv[2] === "electron" ? "electron" : "web";
const isMovie =
  process.env.VITE_APP === "movie" ||
  process.argv.includes("movie") ||
  process.argv.includes("--movie");

const hasLocalApi = existsSync(new URL("../api/src/index.js", import.meta.url));
const local = !process.env.NARTYA_DEV_API && hasLocalApi;

const baseScript = isMovie
  ? (target === "electron" ? "electron:dev:movie" : "dev:movie")
  : (target === "electron" ? "electron:dev" : "dev:web");

const script = isMovie
  ? baseScript
  : `${baseScript}:${local ? "local" : "public"}`;

const env = { ...process.env };
if (isMovie) env.VITE_APP = "movie";
if (!local) env.NARTYA_DEV_API ||= API_URL;

console.log(`[dev] Variante: ${isMovie ? "Dayumi Movie" : "Dayumi Anime"} | API ${local ? "locale (api/)" : env.NARTYA_DEV_API}`);
const child = spawn("npm", ["run", script], { stdio: "inherit", shell: true, env });
child.on("exit", (code) => process.exit(code ?? 0));
