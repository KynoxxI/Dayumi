/**
 * Registre des fournisseurs de films et séries Dayumi Movie.
 * Gère les sources iframe et extract avec entonnoir de repli automatique hedgé.
 */

import { platform } from "../platform/index.js";

const HEDGE_STAGGER_MS = 1600;
const RESOLUTION_TIMEOUT_MS = 20000;

export const MOVIE_PROVIDERS = [
  {
    id: "frembed",
    label: "Source FR (VF/VOSTFR)",
    kind: "iframe",
    rank: 5,
    langs: ["vf", "vostfr"],
    movie: (tmdbId) => `https://frembed.icu/api/film.php?id=${tmdbId}`,
    episode: (tmdbId, s, ep) => `https://frembed.icu/api/serie.php?id=${tmdbId}&sa=${s}&epi=${ep}`,
  },
  {
    id: "vidsrc-to",
    label: "Source A (vidsrc.to)",
    kind: "iframe",
    rank: 10,
    langs: ["vf", "vostfr"],
    movie: (tmdbId) => `https://vidsrc.to/embed/movie/${tmdbId}`,
    episode: (tmdbId, s, ep) => `https://vidsrc.to/embed/tv/${tmdbId}/${s}/${ep}`,
  },
  {
    id: "vidsrc-xyz",
    label: "Source B (vidsrc.xyz)",
    kind: "iframe",
    rank: 20,
    langs: ["vf", "vostfr"],
    movie: (tmdbId) => `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`,
    episode: (tmdbId, s, ep) => `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${s}&episode=${ep}`,
  },
  {
    id: "embed-su",
    label: "Source C (embed.su)",
    kind: "iframe",
    rank: 30,
    langs: ["vf", "vostfr"],
    movie: (tmdbId) => `https://embed.su/embed/movie/${tmdbId}`,
    episode: (tmdbId, s, ep) => `https://embed.su/embed/tv/${tmdbId}/${s}/${ep}`,
  },
  {
    id: "superembed",
    label: "Source D (superembed)",
    kind: "iframe",
    rank: 40,
    langs: ["vf", "vostfr"],
    movie: (tmdbId) => `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`,
    episode: (tmdbId, s, ep) => `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${s}&e=${ep}`,
  },
  {
    id: "deuxembed",
    label: "Source E (2embed)",
    kind: "iframe",
    rank: 50,
    langs: ["vf", "vostfr"],
    movie: (tmdbId) => `https://www.2embed.cc/embed/${tmdbId}`,
    episode: (tmdbId, s, ep) => `https://www.2embed.cc/embedtv/${tmdbId}&s=${s}&e=${ep}`,
  },
  {
    id: "vidlink",
    label: "Source F (vidlink)",
    kind: "iframe",
    rank: 60,
    langs: ["vf", "vostfr"],
    movie: (tmdbId) => `https://vidlink.pro/movie/${tmdbId}`,
    episode: (tmdbId, s, ep) => `https://vidlink.pro/tv/${tmdbId}/${s}/${ep}`,
  },
  {
    id: "vidsrc-vip",
    label: "Source G (vidsrc.vip)",
    kind: "iframe",
    rank: 70,
    langs: ["vf", "vostfr"],
    movie: (tmdbId) => `https://vidsrc.vip/embed/movie/${tmdbId}`,
    episode: (tmdbId, s, ep) => `https://vidsrc.vip/embed/tv/${tmdbId}/${s}/${ep}`,
  },
];

/**
 * Normalise la liste des sources disponibles.
 */
export function normalizeMovieSources(sources) {
  const list = sources === undefined ? MOVIE_PROVIDERS : Array.isArray(sources) ? sources : [];
  return list
    .filter((src) => src && typeof src === "object" && src.id)
    .map((src) => ({
      key: src.id,
      id: src.id,
      label: src.label || src.id,
      kind: src.kind || "iframe",
      rank: Number.isFinite(src.rank) ? src.rank : 999,
      langs: Array.isArray(src.langs) ? src.langs : ["vf", "vostfr"],
      movie: src.movie,
      episode: src.episode,
    }))
    .sort((a, b) => a.rank - b.rank);
}

/**
 * Filtre et ordonne les sources en écartant celles déjà échouées.
 */
export function getPrioritizedMovieSources(sources, { excludeIds = new Set() } = {}) {
  const normalized = normalizeMovieSources(sources);
  const excluded = excludeIds instanceof Set ? excludeIds : new Set(excludeIds || []);
  return normalized.filter((src) => !excluded.has(src.id) && !excluded.has(src.key));
}

export function hasPlayableSources(sources) {
  if (sources === null || sources === undefined) return false;
  return normalizeMovieSources(sources).length > 0;
}

export function getSourceUrlForMedia(provider, media) {
  if (!provider || !media?.tmdbId) return null;
  const isMovie = media.mediaType === "movie" || (!media.season && !media.episode);
  if (isMovie) {
    return typeof provider.movie === "function" ? provider.movie(media.tmdbId) : null;
  }
  const season = media.season || 1;
  const episode = media.episode || 1;
  return typeof provider.episode === "function" ? provider.episode(media.tmdbId, season, episode) : null;
}

/**
 * Tente de résoudre une source unitaire (direct ou iframe).
 */
async function resolveOneMovieSource(provider, media, { forceRefresh = false } = {}) {
  const url = getSourceUrlForMedia(provider, media);
  if (!url) {
    return { success: false, error: "URL non constructible" };
  }

  // Les sources iframe sont immédiatement utilisables dans le conteneur sandboxé
  if (provider.kind === "iframe") {
    return {
      success: true,
      videoUrl: url,
      mode: "iframe",
      usedSource: { id: provider.id, label: provider.label, kind: provider.kind },
      usedLabel: provider.label,
    };
  }

  // Pour le kind "extract", on interroge l'IPC Electron
  if (typeof platform.resolveMovieStream !== "function") {
    return { success: false, error: "Lecture directe disponible uniquement dans l'application desktop" };
  }

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), RESOLUTION_TIMEOUT_MS)
    );
    const result = await Promise.race([
      platform.resolveMovieStream({
        provider: provider.id,
        url,
        tmdbId: media.tmdbId,
        mediaType: media.mediaType,
        season: media.season,
        episode: media.episode,
        forceRefresh,
      }),
      timeoutPromise,
    ]);

    if (result?.success && result.url) {
      return {
        success: true,
        videoUrl: result.url,
        mode: "direct",
        usedSource: provider.id,
        usedLabel: provider.label,
      };
    }
    return { success: false, error: result?.error || "Extraction impossible" };
  } catch (err) {
    return { success: false, error: err?.message || "Erreur de résolution" };
  }
}

/**
 * Entonnoir hedgé : les 2 premières sources démarrent décalées de 1600 ms.
 * La première qui répond gagne, repli séquentiel sur les suivantes en cas d'échec.
 */
export async function resolveMovieSource(media, { excludeIds = new Set(), forceRefresh = false } = {}) {
  // 1. Logue temporairement le registre initial
  console.groupCollapsed?.(`[MovieSources] Résolution de flux pour ${media?.mediaType || "media"} tmdb:${media?.tmdbId}`);
  console.info("[MovieSources] Registre complet des fournisseurs:", MOVIE_PROVIDERS.map((p) => `${p.label} (rang ${p.rank})`));

  let sources = getPrioritizedMovieSources(MOVIE_PROVIDERS, { excludeIds });
  if (media?.sourceId && media.sourceId !== "auto") {
    const forced = sources.find((s) => s.id === media.sourceId);
    if (forced) {
      sources = [forced];
      console.info(`[MovieSources] Sélection manuelle forcée : ${forced.label} (aucun repli)`);
    }
  }

  console.info(`[MovieSources] Sources candidates (${sources.length}) :`, sources.map((s) => s.id));

  if (sources.length === 0) {
    console.warn("[MovieSources] Aucune source candidate restante !");
    console.groupEnd?.();
    return { success: false, error: "Toutes les sources ont échoué", allFailed: true };
  }

  const [primary, secondary, ...rest] = sources;

  const trySource = async (src) => {
    const started = performance.now();
    const res = await resolveOneMovieSource(src, media, { forceRefresh });
    const ms = Math.round(performance.now() - started);
    console.info(`[MovieSources] ${res.success ? "✓ SUCCÈS" : "✗ ÉCHEC"} [${src.label}] (${ms} ms) ->`, res.videoUrl || res.error);
    return { ...res, source: src };
  };

  // Lance la source primaire
  const primaryPromise = trySource(primary);

  // Lance la source secondaire après 1600 ms si la première n'a pas encore répondu
  let secondaryPromise = null;
  const timer = setTimeout(() => {
    if (secondary) {
      console.info(`[MovieSources] HEDGE : lancement décalé de la source secondaire [${secondary.label}] (+${HEDGE_STAGGER_MS}ms)`);
      secondaryPromise = trySource(secondary);
    }
  }, HEDGE_STAGGER_MS);

  const firstResult = await primaryPromise;
  clearTimeout(timer);

  if (firstResult.success) {
    console.info(`[MovieSources] Source retenue : ${firstResult.source.label}`);
    console.groupEnd?.();
    return firstResult;
  }

  // Échec de la première : repli sur la secondaire
  console.warn(`[MovieSources] Échec de la source primaire [${primary.label}], bascule...`);
  if (excludeIds instanceof Set) excludeIds.add(primary.id);
  const secondResult = secondaryPromise ? await secondaryPromise : secondary ? await trySource(secondary) : null;
  if (secondResult?.success) {
    console.info(`[MovieSources] Source retenue après repli : ${secondResult.source.label}`);
    console.groupEnd?.();
    return secondResult;
  }
  if (secondary && excludeIds instanceof Set) excludeIds.add(secondary.id);

  // Repli séquentiel sur les suivantes si les deux premières ont échoué
  for (const fallback of rest) {
    console.info(`[MovieSources] Tentative de repli séquentiel sur [${fallback.label}]...`);
    const res = await trySource(fallback);
    if (res.success) {
      console.info(`[MovieSources] Source de repli réussie : ${fallback.label}`);
      console.groupEnd?.();
      return res;
    }
    if (excludeIds instanceof Set) excludeIds.add(fallback.id);
  }

  console.error("[MovieSources] Échec total de toutes les sources.");
  console.groupEnd?.();
  return { success: false, error: "Toutes les sources ont échoué", allFailed: true };
}
