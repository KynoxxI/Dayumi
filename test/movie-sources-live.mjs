/** Test en direct des hébergeurs de films & séries. Usage : `node test/movie-sources-live.mjs` */
import { MOVIE_PROVIDERS } from "../src/utils/movieSources.js";

const TEST_MEDIA = {
  movie: { tmdbId: 550, title: "Fight Club" },
  tv: { tmdbId: 1399, season: 1, episode: 1, title: "Game of Thrones" },
};

async function checkProviderLive(provider, media) {
  const url =
    media.mediaType === "tv"
      ? provider.episode(media.tmdbId, media.season, media.episode)
      : provider.movie(media.tmdbId);

  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });

    const duration = Date.now() - start;
    if (res.ok || (res.status >= 300 && res.status < 400)) {
      return { ok: true, status: res.status, duration };
    }
    return { ok: false, status: res.status, duration };
  } catch (err) {
    return { ok: false, error: err.name === "TimeoutError" ? "Timeout (8s)" : err.message };
  }
}

async function run() {
  console.log("=== Test en direct des sources Film / Série ===");
  console.log(`Média de test : ${TEST_MEDIA.movie.title} (TMDB ${TEST_MEDIA.movie.tmdbId})\n`);

  let workingCount = 0;

  for (const p of MOVIE_PROVIDERS) {
    process.stdout.write(`Vérification de ${p.label.padEnd(16)} (${p.id}) ... `);
    const res = await checkProviderLive(p, { ...TEST_MEDIA.movie, mediaType: "movie" });

    if (res.ok) {
      workingCount++;
      console.log(`✓ HTTP ${res.status} (${res.duration} ms)`);
    } else {
      console.log(`✗ ÉCHEC : ${res.error || `HTTP ${res.status}`} (${res.duration ? `${res.duration} ms` : ""})`);
    }
  }

  console.log(`\nRésultat : ${workingCount}/${MOVIE_PROVIDERS.length} sources ont répondu.`);
  if (workingCount === 0) {
    console.error("Aucune source en ligne !");
    process.exit(1);
  }
}

run();
