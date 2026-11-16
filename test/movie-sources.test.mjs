import assert from "node:assert/strict";
import test from "node:test";
import {
  MOVIE_PROVIDERS,
  normalizeMovieSources,
  getPrioritizedMovieSources,
  hasPlayableSources,
  resolveMovieSource,
} from "../src/utils/movieSources.js";

test("normalisation des sources : valide la structure de base", () => {
  const sources = normalizeMovieSources(MOVIE_PROVIDERS);
  assert.ok(Array.isArray(sources), "Le registre normalisé est un tableau");
  assert.ok(sources.length >= 7, "Au moins 7 fournisseurs par défaut");

  for (const s of sources) {
    assert.ok(typeof s.id === "string" && s.id.length > 0, "Chaque source a un id");
    assert.ok(typeof s.label === "string" && s.label.length > 0, "Chaque source a un label");
    assert.ok(typeof s.rank === "number", "Chaque source a un rang numérique");
    assert.ok(typeof s.movie === "function", "Chaque source a un générateur d'URL film");
    assert.ok(typeof s.episode === "function", "Chaque source a un générateur d'URL épisode");
  }
});

test("tri par rang : les sources de plus petit rang passent en premier", () => {
  const prioritized = getPrioritizedMovieSources();
  for (let i = 0; i < prioritized.length - 1; i++) {
    assert.ok(
      prioritized[i].rank <= prioritized[i + 1].rank,
      `Rang ordonné : ${prioritized[i].id} (${prioritized[i].rank}) <= ${prioritized[i + 1].id} (${prioritized[i + 1].rank})`
    );
  }
});

test("exclusion : les identifiants exclus sont bien retirés", () => {
  const excludeIds = ["frembed", "vidsrc-to"];
  const filtered = getPrioritizedMovieSources(MOVIE_PROVIDERS, { excludeIds });
  const ids = filtered.map((s) => s.id);

  assert.ok(!ids.includes("frembed"), "frembed est bien exclu");
  assert.ok(!ids.includes("vidsrc-to"), "vidsrc-to est bien exclu");
  assert.equal(filtered.length, MOVIE_PROVIDERS.length - 2, "La taille diminue de 2");
});

test("hasPlayableSources : détecte la présence de sources jouables", () => {
  assert.equal(hasPlayableSources(MOVIE_PROVIDERS), true);
  assert.equal(hasPlayableSources([]), false);
  assert.equal(hasPlayableSources(null), false);
});

test("générateurs d'URL film et série conformes au protocole", () => {
  const tmdbId = 550; // Fight Club
  const frembed = MOVIE_PROVIDERS.find((p) => p.id === "frembed");
  assert.ok(frembed, "frembed existe");
  assert.equal(frembed.movie(tmdbId), `https://frembed.icu/api/film.php?id=${tmdbId}`);
  assert.equal(frembed.episode(1399, 1, 1), `https://frembed.icu/api/serie.php?id=1399&sa=1&epi=1`);

  const vidsrcTo = MOVIE_PROVIDERS.find((p) => p.id === "vidsrc-to");
  assert.ok(vidsrcTo, "vidsrc-to existe");
  assert.equal(vidsrcTo.movie(tmdbId), `https://vidsrc.to/embed/movie/${tmdbId}`);
  assert.equal(vidsrcTo.episode(1399, 2, 5), `https://vidsrc.to/embed/tv/1399/2/5`);

  const vidsrcXyz = MOVIE_PROVIDERS.find((p) => p.id === "vidsrc-xyz");
  assert.ok(vidsrcXyz, "vidsrc-xyz existe");
  assert.equal(vidsrcXyz.movie(tmdbId), `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`);
  assert.equal(vidsrcXyz.episode(1399, 2, 5), `https://vidsrc.xyz/embed/tv?tmdb=1399&season=2&episode=5`);

  const embedSu = MOVIE_PROVIDERS.find((p) => p.id === "embed-su");
  assert.ok(embedSu, "embed-su existe");
  assert.equal(embedSu.movie(tmdbId), `https://embed.su/embed/movie/${tmdbId}`);
  assert.equal(embedSu.episode(1399, 2, 5), `https://embed.su/embed/tv/1399/2/5`);

  const deuxEmbed = MOVIE_PROVIDERS.find((p) => p.id === "deuxembed");
  assert.ok(deuxEmbed, "deuxembed existe");
  assert.equal(deuxEmbed.movie(tmdbId), `https://www.2embed.cc/embed/${tmdbId}`);
  assert.equal(deuxEmbed.episode(1399, 2, 5), `https://www.2embed.cc/embedtv/1399&s=2&e=5`);

  const vidlink = MOVIE_PROVIDERS.find((p) => p.id === "vidlink");
  assert.ok(vidlink, "vidlink existe");
  assert.equal(vidlink.movie(tmdbId), `https://vidlink.pro/movie/${tmdbId}`);
  assert.equal(vidlink.episode(1399, 2, 5), `https://vidlink.pro/tv/1399/2/5`);
});

test("résolution de source : renvoie une iframe valide pour un film", async () => {
  const res = await resolveMovieSource({
    tmdbId: 550,
    mediaType: "movie",
    sourceId: "frembed",
  });

  assert.equal(res.success, true);
  assert.equal(res.mode, "iframe");
  assert.ok(res.videoUrl.includes("550"));
  assert.equal(res.usedSource.id, "frembed");
});

test("entonnoir de repli automatique : prend la suivante quand les premières sont exclues", async () => {
  const excluded = new Set(["frembed", "vidsrc-to"]);
  const res = await resolveMovieSource(
    { tmdbId: 550, mediaType: "movie" },
    { excludeIds: excluded }
  );

  assert.equal(res.success, true);
  assert.equal(res.source.id, "vidsrc-xyz");
  assert.ok(res.videoUrl.includes("550"));
});
