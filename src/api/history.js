import { supabase } from "@/lib/supabase";
import { dbListProgress, getUserId } from "./dayumiDb";

const LOCAL_PROGRESS_KEY = "dayumi_local_progress";

function getLocalProgressList() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PROGRESS_KEY) || "[]");
  } catch {
    return [];
  }
}

// Au-delà, l'historique s'arrête : deux pages PostgREST couvrent des mois de visionnage.
const MAX_ROWS = 2000;
const PAGE = 1000;

async function fetchRows(table, columns) {
  try {
    const rows = [];
    for (let from = 0; from < MAX_ROWS; from += PAGE) {
      const { data, error } = await supabase
        .from(table)
        .select(columns)
        .order("updated_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) break;
      rows.push(...(data || []));
      if (!data || data.length < PAGE) break;
    }
    return rows;
  } catch {
    return [];
  }
}

/**
 * Un élément par anime, au dernier épisode touché. Contrairement à « Reprendre », les
 * animes qu'on en a retirés y restent : c'est tout l'intérêt de l'historique.
 */
export async function getWatchHistory() {
  const uid = getUserId();
  const userId = uid && uid !== "guest_user" ? uid : null;
  const localList = getLocalProgressList();

  let remoteRows = [];
  if (userId) {
    try {
      const dbRows = await dbListProgress(userId);
      if (dbRows && dbRows.length > 0) {
        remoteRows = dbRows;
      }
    } catch (_) {}
  }

  // Si pas de données dans MariaDB, tenter Supabase en repli
  if (remoteRows.length === 0) {
    try {
      const sbRows = await fetchRows(
        "episode_progress",
        "anime_slug, anime_title, anime_cover, season_id, episode_number, language, progress_percent, completed, updated_at"
      );
      if (sbRows && sbRows.length > 0) {
        remoteRows = sbRows;
      }
    } catch (_) {}
  }

  // Fusionner les données : d'abord local, puis distant pour avoir les informations les plus fraîches
  const bySlug = new Map();

  const processRow = (row) => {
    const slug = row.anime_slug;
    if (!slug) return;
    const existing = bySlug.get(slug);
    const rowDate = row.updated_at ? new Date(row.updated_at).getTime() : 0;
    const existingDate = existing?.updatedAt ? new Date(existing.updatedAt).getTime() : 0;

    if (!existing || rowDate >= existingDate) {
      bySlug.set(slug, {
        slug,
        title: row.anime_title || row.title || slug,
        cover: row.anime_cover || row.cover || null,
        seasonId: String(row.season_id || "1"),
        episodeNumber: Number(row.episode_number || 1),
        language: row.language || "VOSTFR",
        progressPercent: Math.round(row.progress_percent || (row.duration_seconds > 0 ? (row.progress_seconds / row.duration_seconds) * 100 : 0)),
        completed: Boolean(row.completed),
        updatedAt: row.updated_at || new Date().toISOString(),
        episodes: (existing?.episodes || 0) + 1,
      });
    } else {
      existing.episodes++;
    }
  };

  // Traiter localement
  localList.forEach(processRow);
  // Traiter distant
  remoteRows.forEach(processRow);

  return [...bySlug.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/** Une ligne par œuvre lue : `scan_progress` n'en garde qu'une (dernier chapitre et page). */
export async function getReadingHistory() {
  const rows = await fetchRows(
    "scan_progress",
    "anime_slug, anime_title, anime_cover, oeuvre, oeuvre_label, chapter, page, total_pages, completed, updated_at"
  );
  return rows.map((row) => ({
    slug: row.anime_slug,
    title: row.anime_title,
    cover: row.anime_cover,
    oeuvre: row.oeuvre,
    oeuvreLabel: row.oeuvre_label,
    chapter: row.chapter || 1,
    page: row.page || 0,
    totalPages: Math.max(0, row.total_pages || 0),
    completed: !!row.completed,
    updatedAt: row.updated_at,
  }));
}
