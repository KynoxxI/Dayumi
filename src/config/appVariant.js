/**
 * Configuration de la variante d'application Dayumi.
 * Piloté par VITE_APP ("anime" | "movie" | "fm" | "hub").
 */

const getHostnameVariant = () => {
  if (typeof window === "undefined" || !window.location) return null;
  const host = window.location.hostname.toLowerCase();
  if (host.startsWith("movie.") || host.includes("movie")) return "movie";
  if (host.startsWith("fm.") || host.includes("fm")) return "fm";
  return null;
};

export const APP =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP) ||
  getHostnameVariant() ||
  (typeof process !== "undefined" && process.env?.VITE_APP) ||
  "anime";

export const isMovie = APP === "movie";
export const isAnime = APP === "anime";
export const isFm = APP === "fm";
export const isHub = APP === "hub";

export const DEFAULT_THEME_PRESET = isMovie ? "cinema" : "vermillon";
export const DEFAULT_CUSTOM_COLOR = isMovie ? "#7C5CFF" : "#FF713E";

export const APP_NAME = {
  anime: "Dayumi",
  movie: "Dayumi Movie",
  fm: "Dayumi FM",
  hub: "Dayumi Hub"
}[APP] || "Dayumi";

export const DOWNLOAD_BASE = `https://dayumi.site/dl/${APP}`;

export const ROUTES_ENABLED = {
  movie: isMovie || isAnime,
  serie: isMovie || isAnime,
  anime: isAnime,
  mangas: isAnime,
  fm: isFm
};
