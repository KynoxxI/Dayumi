import { supabase } from "@/lib/supabase";
import { isGuestSession } from "@/lib/guest";
import { expireCache } from "@/hooks/useCachedResource";
import { dbListProgress, dbSaveProgress, getUserId } from "./dayumiDb";

const LOCAL_PROGRESS_KEY = "dayumi_local_progress";

function getLocalProgressList() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PROGRESS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalProgressItem(item) {
  try {
    let list = getLocalProgressList();
    list = list.filter((x) => x.episode_key !== item.episode_key);
    list.unshift(item);
    if (list.length > 200) list = list.slice(0, 200);
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(list));
  } catch {}
}

function expireProfileProgress(userId = "") {
  expireCache(userId ? `profile:stats:${userId}` : "profile:stats:");
  expireCache(userId ? `profile:activity:${userId}` : "profile:activity:");
}

// Une seule lecture alimente « Reprendre » et « Pour toi ».
const RESUME_CACHE_MS = 15_000;
const RESUME_QUERY_LIMIT = 120;
let resumeCache = { userId: null, rows: null, ts: 0, promise: null };

function invalidateResumeCache() {
  resumeCache = { userId: null, rows: null, ts: 0, promise: null };
}

async function getResumeRows() {
  const uid = getUserId();
  const userId = uid && uid !== "guest_user" ? uid : null;
  const now = Date.now();
  if (resumeCache.userId === userId && resumeCache.rows && now - resumeCache.ts < RESUME_CACHE_MS) {
    return resumeCache.rows;
  }
  if (resumeCache.userId === userId && resumeCache.promise) return resumeCache.promise;

  const localRows = getLocalProgressList().filter((r) => !r.hidden_from_resume);

  const request = (async () => {
    try {
      let remote = [];
      if (userId) {
        const dbRows = await dbListProgress(userId);
        remote = (dbRows || []).map((r) => ({
          episode_key: `${r.anime_slug}:${r.season_id}:${r.episode_number}:${r.language || "VOSTFR"}`,
          anime_slug: r.anime_slug,
          anime_title: r.anime_title || r.title || r.anime_slug,
          anime_cover: r.anime_cover || r.cover || null,
          season_id: String(r.season_id),
          episode_number: Number(r.episode_number),
          language: r.language || "VOSTFR",
          position_seconds: Number(r.progress_seconds || 0),
          duration: Number(r.duration_seconds || 0),
          progress_percent: r.progress_percent != null ? Number(r.progress_percent) : (r.duration_seconds > 0 ? (r.progress_seconds / r.duration_seconds) * 100 : 0),
          completed: Boolean(r.completed),
          updated_at: r.updated_at,
        }));
      }

      // Fusionner les données locales et distantes
      const map = new Map();
      localRows.forEach((r) => map.set(r.episode_key, r));
      remote.forEach((r) => {
        const existing = map.get(r.episode_key);
        if (!existing || new Date(r.updated_at) >= new Date(existing.updated_at)) {
          map.set(r.episode_key, r);
        }
      });
      const rows = Array.from(map.values()).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      resumeCache = { userId, rows, ts: Date.now(), promise: null };
      return rows;
    } catch (_) {
      resumeCache = { userId, rows: localRows, ts: Date.now(), promise: null };
      return localRows;
    }
  })();

  resumeCache = { userId, rows: null, ts: 0, promise: request };
  return request;
}

export function episodeKey(slug, seasonId, episodeNumber, language) {
  return `${slug}:${seasonId}:${episodeNumber}:${language}`;
}

/** « Sans titre » est affiché tant que la fiche n'est pas chargée : on ne l'enregistre pas. */
function cleanTitle(title) {
  const t = (title || "").trim();
  return t && t !== "Sans titre" ? t : null;
}

/**
 * Toutes les 30 s environ. Le serveur ne crédite que le temps réel écoulé, plafonné.
 * Sans `duration`, dénominateur du « réellement vu », l'épisode n'est jamais compté comme vu.
 */
export async function heartbeatWatch(key, duration = null) {
  if (!key || isGuestSession()) return;
  try {
    await supabase.rpc("heartbeat_watch", {
      p_episode_key: key,
      p_duration: duration > 0 ? duration : null,
      p_tz_offset: tzOffsetMinutes(),
    });
  } catch (_) {}
}

/**
 * Minutes à l'est de UTC (`getTimezoneOffset()` compte à l'envers), pour les succès liés
 * à l'heure locale.
 */
function tzOffsetMinutes() {
  const offset = -new Date().getTimezoneOffset();
  return Number.isFinite(offset) ? offset : null;
}

/**
 * Temps de visionnage et progression en une requête ; les sauvegardes ponctuelles passent
 * par `saveEpisodeProgress`. `seasonTotal` sert au succès « saison terminée ».
 * @returns {Promise<string[]>} paliers nouvellement débloqués
 */
export async function watchTick({
  slug,
  seasonId,
  episodeNumber,
  language,
  positionSeconds,
  duration,
  title = null,
  cover = null,
  seasonTotal = null,
  userId = null,
}) {
  if (!slug || isGuestSession()) return [];
  try {
    const { data } = await supabase.rpc("watch_tick", {
      p_episode_key: episodeKey(slug, seasonId, episodeNumber, language),
      p_slug: slug,
      p_season_id: String(seasonId),
      p_episode_number: episodeNumber,
      p_language: language,
      p_position: positionSeconds,
      p_duration: duration,
      p_title: cleanTitle(title),
      p_cover: cover,
      p_tz_offset: tzOffsetMinutes(),
      p_season_total: seasonTotal > 0 ? seasonTotal : null,
    });
    expireProfileProgress(userId);
    invalidateResumeCache();
    const unlocked = data?.unlocked || [];
    // Un déblocage périme la vitrine du profil.
    if (unlocked.length) expireCache("achievements:");
    return unlocked;
  } catch (_) {
    return [];
  }
}

/**
 * Les spéciaux portent un numéro fractionnaire (24.001) ; la colonne est entière,
 * l'identité reste dans `episode_key`.
 */
function storedEpisodeNumber(n) {
  return Number.isFinite(Number(n)) ? Math.round(Number(n)) : null;
}

/** Au-delà, l'épisode est considéré comme vu. */
export const COMPLETION_THRESHOLD = 90;

/** @returns {{ positionSeconds, duration, progressPercent, completed }|null} */
export async function getEpisodeProgress(slug, seasonId, episodeNumber, language, userId) {
  const norm = (s) => String(s || "").toLowerCase().replace(/^(saison|season)[-_]?/i, "").trim();
  const key = episodeKey(slug, seasonId, episodeNumber, language);
  const localList = getLocalProgressList();
  const local = localList.find((r) => r.episode_key === key) ||
                localList.find((r) => r.anime_slug === slug && norm(r.season_id) === norm(seasonId) && Number(r.episode_number) === Number(episodeNumber));

  const uid = userId || getUserId();
  if (uid && uid !== "guest_user") {
    try {
      const dbRows = await dbListProgress(uid, slug);
      if (dbRows && dbRows.length > 0) {
        const match = dbRows.find(
          (r) =>
            (String(r.season_id) === String(seasonId) || norm(r.season_id) === norm(seasonId)) &&
            Number(r.episode_number) === Number(episodeNumber)
        );
        if (match) {
          const pos = Number(match.progress_seconds || 0);
          const dur = Number(match.duration_seconds || 0);
          const pct = Number(match.progress_percent || (dur > 0 ? (pos / dur) * 100 : 0));
          return {
            positionSeconds: pos,
            duration: dur,
            progressPercent: pct,
            completed: Boolean(match.completed),
          };
        }
      }
    } catch (_) {}

    // Fallback Supabase
    try {
      const { data, error } = await supabase
        .from("episode_progress")
        .select("position_seconds, duration, progress_percent, completed")
        .eq("user_id", uid)
        .eq("episode_key", key)
        .maybeSingle();
      if (!error && data) {
        return {
          positionSeconds: data.position_seconds || 0,
          duration: data.duration || 0,
          progressPercent: data.progress_percent || 0,
          completed: data.completed || false,
        };
      }
    } catch (_) {}
  }

  if (local) {
    return {
      positionSeconds: local.position_seconds || 0,
      duration: local.duration || 0,
      progressPercent: local.progress_percent || 0,
      completed: local.completed || false,
    };
  }
  return null;
}

/** @param {string} [p.title] titre de l'anime, pour « Reprendre » */
export async function saveEpisodeProgress({
  slug,
  seasonId,
  episodeNumber,
  language,
  positionSeconds,
  duration,
  title = null,
  cover = null,
  userId,
}) {
  const pct = duration > 0 ? Math.min((positionSeconds / duration) * 100, 100) : 0;
  const completed = pct >= COMPLETION_THRESHOLD;
  const key = episodeKey(slug, seasonId, episodeNumber, language);

  // 1. Sauvegarde locale garantie
  saveLocalProgressItem({
    episode_key: key,
    anime_slug: slug,
    anime_title: cleanTitle(title),
    anime_cover: cover,
    season_id: String(seasonId),
    episode_number: storedEpisodeNumber(episodeNumber),
    language,
    position_seconds: positionSeconds,
    duration,
    progress_percent: pct,
    completed,
    hidden_from_resume: false,
    updated_at: new Date().toISOString(),
  });
  invalidateResumeCache();

  // 2. Synchronisation BDD Dayumi MariaDB
  const uid = userId || getUserId();
  if (uid && uid !== "guest_user") {
    dbSaveProgress({
      userId: uid,
      animeSlug: slug,
      seasonId,
      episodeNumber,
      progressSeconds: positionSeconds,
      durationSeconds: duration,
      completed,
      language,
      animeTitle: cleanTitle(title),
      animeCover: cover,
    }).catch(() => {});
  }
}

/** Sans toucher à l'historique. */
export async function hideAnimeFromResume(slug) {
  const list = getLocalProgressList().map((item) =>
    item.anime_slug === slug ? { ...item, hidden_from_resume: true } : item
  );
  localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(list));
  invalidateResumeCache();

  if (!slug || isGuestSession()) return;
  try {
    await supabase
      .from("episode_progress")
      .update({ hidden_from_resume: true })
      .eq("anime_slug", slug);
  } catch (_) {}
}

export async function markEpisodeWatched({ slug, seasonId, episodeNumber, language, title, cover, userId }) {
  if (!userId || isGuestSession()) return;
  const { error } = await supabase.from("episode_progress").upsert(
    {
      user_id: userId,
      episode_key: episodeKey(slug, seasonId, episodeNumber, language),
      anime_slug: slug,
      anime_title: cleanTitle(title),
      anime_cover: cover || null,
      season_id: String(seasonId),
      episode_number: storedEpisodeNumber(episodeNumber),
      language,
      position_seconds: 0,
      duration: 0,
      progress_percent: 100,
      completed: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,episode_key" }
  );
  if (error) console.warn("[progress] mark vu échoué:", error.message);
  else {
    expireProfileProgress(userId);
    invalidateResumeCache();
  }
}

/** Une même saison et langue, en une requête. */
export async function markEpisodesWatched({ slug, seasonId, episodeNumbers, language, title, cover, userId }) {
  if (!userId || isGuestSession() || !episodeNumbers?.length) return;
  const now = new Date().toISOString();
  const rows = episodeNumbers.map((num) => ({
    user_id: userId,
    episode_key: episodeKey(slug, seasonId, num, language),
    anime_slug: slug,
    anime_title: cleanTitle(title),
    anime_cover: cover || null,
    season_id: String(seasonId),
    episode_number: storedEpisodeNumber(num),
    language,
    position_seconds: 0,
    duration: 0,
    progress_percent: 100,
    completed: true,
    updated_at: now,
  }));
  const { error } = await supabase
    .from("episode_progress")
    .upsert(rows, { onConflict: "user_id,episode_key" });
  if (error) console.warn("[progress] mark bulk vu échoué:", error.message);
  else {
    expireProfileProgress(userId);
    invalidateResumeCache();
  }
}

/** Toutes langues ; la progression partielle est conservée. */
export async function unmarkSeasonWatched({ slug, seasonId }) {
  if (isGuestSession()) return;
  const { error } = await supabase
    .from("episode_progress")
    .delete()
    .eq("anime_slug", slug)
    .eq("season_id", String(seasonId))
    .eq("completed", true);
  if (error) console.warn("[progress] démarquage saison échoué:", error.message);
  else {
    expireProfileProgress();
    invalidateResumeCache();
  }
}

/** Toutes langues confondues. */
export async function unmarkEpisodeWatched({ slug, seasonId, episodeNumber }) {
  if (isGuestSession()) return;
  const { error } = await supabase
    .from("episode_progress")
    .delete()
    .eq("anime_slug", slug)
    .eq("season_id", String(seasonId))
    .eq("episode_number", episodeNumber);
  if (error) console.warn("[progress] mark non-vu échoué:", error.message);
  else {
    expireProfileProgress();
    invalidateResumeCache();
  }
}

/** `achievements` = plus haut palier atteint par famille. */
export async function getUserStats() {
  const { data, error } = await supabase.rpc("get_user_stats");
  if (error) {
    console.warn("[progress] get_user_stats:", error.message);
    return { totalWatchSeconds: 0, totalEpisodes: 0, totalAnimes: 0, achievements: {} };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    totalWatchSeconds: Math.round(row?.total_watch_seconds || 0),
    totalEpisodes: Number(row?.total_episodes || 0),
    totalAnimes: Number(row?.total_animes || 0),
    achievements: row?.achievements || {},
  };
}

/** Du plus récent au plus ancien. */
export async function getContinueWatching(limit = 12) {
  const data = await getResumeRows();

  const seen = new Set();
  const result = [];
  for (const row of data) {
    if (seen.has(row.anime_slug)) continue;
    seen.add(row.anime_slug);
    result.push({
      episodeKey: row.episode_key,
      slug: row.anime_slug,
      title: row.anime_title,
      cover: row.anime_cover,
      seasonId: row.season_id,
      episodeNumber: row.episode_number,
      language: row.language,
      positionSeconds: row.position_seconds || 0,
      duration: row.duration || 0,
      progressPercent: Math.round(row.progress_percent || 0),
      completed: row.completed,
      updatedAt: row.updated_at,
    });
    if (result.length >= limit) break;
  }
  return result;
}

export async function getLastWatched(slug, userId) {
  if (!slug) return null;
  const local = getLocalProgressList()
    .filter((r) => r.anime_slug === slug)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

  if (!userId) {
    if (local) {
      return {
        seasonId: local.season_id,
        episodeNumber: local.episode_number,
        language: local.language,
        progressPercent: Math.round(local.progress_percent || 0),
        completed: local.completed,
      };
    }
    return null;
  }

  try {
    const dbRows = await dbListProgress(userId, slug);
    if (dbRows && dbRows.length > 0) {
      const best = dbRows[0];
      return {
        seasonId: String(best.season_id),
        episodeNumber: Number(best.episode_number),
        language: best.language || "VOSTFR",
        progressPercent: best.duration_seconds > 0 ? Math.round((best.progress_seconds / best.duration_seconds) * 100) : 0,
        completed: Boolean(best.completed),
      };
    }
    if (local) {
      return {
        seasonId: local.season_id,
        episodeNumber: local.episode_number,
        language: local.language,
        progressPercent: Math.round(local.progress_percent || 0),
        completed: local.completed,
      };
    }
    return null;
  } catch (_) {
    if (local) {
      return {
        seasonId: local.season_id,
        episodeNumber: local.episode_number,
        language: local.language,
        progressPercent: Math.round(local.progress_percent || 0),
        completed: local.completed,
      };
    }
    return null;
  }
}

/** `slug → { lastEpisode, lastSeasonId, lastUpdatedAt, lastPercent, lastCompleted, watchedCount }` */
export async function getFavoritesProgress() {
  const uid = getUserId();
  const userId = uid && uid !== "guest_user" ? uid : null;
  let rows = [];

  if (userId) {
    try {
      const dbRows = await dbListProgress(userId);
      if (dbRows && dbRows.length > 0) {
        rows = dbRows;
      }
    } catch (_) {}
  }

  if (rows.length === 0) {
    rows = getLocalProgressList();
  }

  const map = {};
  const seenByAnime = {};
  for (const row of rows) {
    const slug = row.anime_slug;
    if (!slug) continue;
    let s = map[slug];
    if (!s) {
      const pct = Math.round(row.progress_percent || (row.duration_seconds > 0 ? (row.progress_seconds / row.duration_seconds) * 100 : 0));
      s = map[slug] = {
        lastEpisode: Number(row.episode_number || 1),
        lastSeasonId: String(row.season_id || "1"),
        lastUpdatedAt: row.updated_at || new Date().toISOString(),
        lastPercent: pct,
        lastCompleted: Boolean(row.completed),
        watchedCount: 0,
      };
      seenByAnime[slug] = new Set();
    }
    if (row.completed) {
      const k = `${row.season_id}:${row.episode_number}`;
      if (!seenByAnime[slug].has(k)) {
        seenByAnime[slug].add(k);
        s.watchedCount += 1;
      }
    }
  }
  return map;
}

/** Indexée par `${seasonId}:${episodeNumber}`, toutes langues confondues. */
export async function getAnimeProgressMap(slug) {
  if (!slug) return {};
  const uid = getUserId();
  const userId = uid && uid !== "guest_user" ? uid : null;
  let rows = [];

  if (userId) {
    try {
      const dbRows = await dbListProgress(userId, slug);
      if (dbRows && dbRows.length > 0) {
        rows = dbRows;
      }
    } catch (_) {}
  }

  // Fusionner avec les données locales
  const localRows = getLocalProgressList().filter((r) => r.anime_slug === slug);
  const combined = [...rows, ...localRows];

  const map = {};
  for (const row of combined) {
    const k = `${row.season_id}:${row.episode_number}`;
    const pct = Math.round(row.progress_percent || (row.duration_seconds > 0 ? (row.progress_seconds / row.duration_seconds) * 100 : 0));
    const cur = { progressPercent: pct, completed: Boolean(row.completed) };
    const prev = map[k];
    if (!prev || cur.progressPercent > prev.progressPercent || (cur.completed && !prev.completed)) {
      map[k] = cur;
    }
  }
  return map;
}
