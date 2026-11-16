/**
 * Client API TMDB en lecture seule pour Dayumi Movie.
 * Supporte le Bearer v4 (VITE_TMDB_TOKEN) et la clé v3 en paramètre (VITE_TMDB_KEY).
 * Normalise toutes les réponses au format interne Dayumi.
 */

import { MOVIE_PROVIDERS, getPrioritizedMovieSources } from "@/utils/movieSources";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_TOKEN = import.meta.env.VITE_TMDB_TOKEN;
const TMDB_KEY = import.meta.env.VITE_TMDB_KEY;

const TMDB_GENRES = {
  28: "Action",
  12: "Aventure",
  16: "Animation",
  35: "Comédie",
  80: "Crime",
  99: "Documentaire",
  18: "Drame",
  10751: "Familial",
  14: "Fantastique",
  36: "Histoire",
  27: "Horreur",
  10402: "Musique",
  9648: "Mystère",
  10749: "Romance",
  878: "Science-Fiction",
  10770: "Téléfilm",
  53: "Thriller",
  10752: "Guerre",
  37: "Western",
  10759: "Action & Aventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

export function getGenreNameById(id) {
  return TMDB_GENRES[id] || null;
}

function buildHeaders() {
  const headers = { "Content-Type": "application/json;charset=utf-8" };
  if (TMDB_TOKEN) {
    headers["Authorization"] = `Bearer ${TMDB_TOKEN}`;
  }
  return headers;
}

function buildUrl(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set("language", "fr-FR");
  url.searchParams.set("region", "FR");
  if (!TMDB_TOKEN && TMDB_KEY) {
    url.searchParams.set("api_key", TMDB_KEY);
  }
  for (const [key, val] of Object.entries(params)) {
    if (val != null && val !== "") {
      url.searchParams.set(key, String(val));
    }
  }
  return url.toString();
}

async function fetchTmdb(endpoint, params = {}) {
  const url = buildUrl(endpoint, params);
  const res = await fetch(url, { headers: buildHeaders() });
  if (!res.ok) {
    throw new Error(`Erreur TMDB ${res.status}: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Normalise un film ou une série au format catalogue Dayumi.
 */
export function normalizeMedia(item, forcedType = null) {
  if (!item || typeof item !== "object") return null;
  const mediaType = forcedType || item.media_type || (item.first_air_date || item.name ? "serie" : "movie");
  const id = item.id;
  const title = item.title || item.name || item.original_title || item.original_name || "Sans titre";
  const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null;
  const banner = item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : poster;
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const score = item.vote_average ? Number(item.vote_average) : null;

  const genres = Array.isArray(item.genres)
    ? item.genres.map((g) => g.name || g)
    : Array.isArray(item.genre_ids)
    ? item.genre_ids.map(getGenreNameById).filter(Boolean)
    : [];

  return {
    slug: `tmdb-${mediaType}-${id}`,
    id,
    tmdbId: id,
    title,
    image: poster,
    cover: poster,
    banner,
    description: item.overview || "",
    synopsis: item.overview || "",
    year,
    score,
    rating: score,
    runtime: item.runtime || (item.episode_run_time ? item.episode_run_time[0] : null),
    genres,
    mediaType,
    numberOfSeasons: item.number_of_seasons || null,
    numberOfEpisodes: item.number_of_episodes || null,
    seasons: Array.isArray(item.seasons) ? item.seasons : [],
    status: item.status || null,
    tagline: item.tagline || null,
  };
}

export async function getMoviePage(id) {
  const raw = await fetchTmdb(`/movie/${id}`, { append_to_response: "similar,recommendations,credits" });
  const normalized = normalizeMedia(raw, "movie");
  if (raw.credits?.cast) {
    normalized.cast = raw.credits.cast.slice(0, 10).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profile: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
    }));
  }
  if (raw.similar?.results) {
    normalized.similar = raw.similar.results.map((item) => normalizeMedia(item, "movie")).filter(Boolean);
  }
  return normalized;
}

export async function getSeriePage(id) {
  const raw = await fetchTmdb(`/tv/${id}`, { append_to_response: "similar,recommendations,credits" });
  const normalized = normalizeMedia(raw, "serie");
  if (raw.credits?.cast) {
    normalized.cast = raw.credits.cast.slice(0, 10).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profile: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
    }));
  }
  if (raw.similar?.results) {
    normalized.similar = raw.similar.results.map((item) => normalizeMedia(item, "serie")).filter(Boolean);
  }
  return normalized;
}

export async function getSeasonEpisodes(serieId, seasonNumber) {
  const raw = await fetchTmdb(`/tv/${serieId}/season/${seasonNumber}`);
  const episodes = Array.isArray(raw.episodes)
    ? raw.episodes.map((ep) => ({
        id: ep.id,
        episode_number: ep.episode_number,
        episodeNumber: ep.episode_number,
        season_number: ep.season_number,
        seasonNumber: ep.season_number,
        name: ep.name || `Épisode ${ep.episode_number}`,
        title: ep.name || `Épisode ${ep.episode_number}`,
        overview: ep.overview || "",
        still: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : null,
        still_path: ep.still_path,
        air_date: ep.air_date,
        airDate: ep.air_date,
        runtime: ep.runtime,
        vote_average: ep.vote_average,
        rating: ep.vote_average ? Number(ep.vote_average) : null,
      }))
    : [];
  return {
    season_number: raw.season_number,
    seasonNumber: raw.season_number,
    name: raw.name,
    overview: raw.overview,
    episodes,
  };
}

export const getSerieSeason = getSeasonEpisodes;

export function getMovieSources(tmdbId) {
  return getPrioritizedMovieSources(MOVIE_PROVIDERS).map((src) => ({
    ...src,
    url: typeof src.movie === "function" ? src.movie(tmdbId) : null,
  }));
}

export function getSerieSources(tmdbId, season = 1, episode = 1) {
  return getPrioritizedMovieSources(MOVIE_PROVIDERS).map((src) => ({
    ...src,
    url: typeof src.episode === "function" ? src.episode(tmdbId, season, episode) : null,
  }));
}

export async function getTrending(mediaType = "all", timeWindow = "day") {
  const type = mediaType === "all" ? "all" : mediaType === "serie" ? "tv" : "movie";
  const raw = await fetchTmdb(`/trending/${type}/${timeWindow}`);
  return (raw.results || []).map((item) => normalizeMedia(item)).filter(Boolean);
}

export async function getDiscoverMovie({ genre, sort = "popularity.desc", page = 1 } = {}) {
  const params = { page, sort_by: sort };
  if (genre) params.with_genres = genre;
  const raw = await fetchTmdb("/discover/movie", params);
  return {
    page: raw.page,
    totalPages: raw.total_pages,
    totalResults: raw.total_results,
    items: (raw.results || []).map((item) => normalizeMedia(item, "movie")).filter(Boolean),
  };
}

export async function getDiscoverSerie({ genre, sort = "popularity.desc", page = 1 } = {}) {
  const params = { page, sort_by: sort };
  if (genre) params.with_genres = genre;
  const raw = await fetchTmdb("/discover/tv", params);
  return {
    page: raw.page,
    totalPages: raw.total_pages,
    totalResults: raw.total_results,
    items: (raw.results || []).map((item) => normalizeMedia(item, "serie")).filter(Boolean),
  };
}

export async function searchMulti(query, { page = 1 } = {}) {
  if (!query || !query.trim()) {
    return { items: [], totalPages: 0, totalResults: 0 };
  }
  const raw = await fetchTmdb("/search/multi", { query: query.trim(), page });
  const items = (raw.results || [])
    .filter((item) => item.media_type === "movie" || item.media_type === "tv")
    .map((item) => normalizeMedia(item))
    .filter(Boolean);
  return {
    page: raw.page,
    totalPages: raw.total_pages,
    totalResults: raw.total_results,
    items,
  };
}

export async function getSimilar(mediaType, id) {
  const type = mediaType === "serie" ? "tv" : "movie";
  const raw = await fetchTmdb(`/${type}/${id}/similar`);
  return (raw.results || []).map((item) => normalizeMedia(item, mediaType)).filter(Boolean);
}

export async function getGenres(mediaType = "movie") {
  const type = mediaType === "serie" ? "tv" : "movie";
  const raw = await fetchTmdb(`/genre/${type}/list`);
  return raw.genres || [];
}
