import { supabase } from "@/lib/supabase";
import { isGuestSession } from "@/lib/guest";
import { invalidateCache } from "@/hooks/useCachedResource";
import { getAnimePage } from "@/api/animeApi";
import { dbListFavorites, dbAddFavorite, dbRemoveFavorite, getUserId } from "./dayumiDb";

const LOCAL_FAVS_KEY = "dayumi_local_favorites";

export function getLocalFavorites() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_FAVS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalFavorites(items) {
  try {
    localStorage.setItem(LOCAL_FAVS_KEY, JSON.stringify(items));
  } catch {}
}

function invalidateFavoriteProfileData() {
  invalidateCache("profile:favorites:");
  invalidateCache("profile:activity:");
}

/** `sort_order` (tri manuel) quand il est posé, sinon par ajout récent. */
export async function listFavorites() {
  const local = getLocalFavorites();
  const uid = getUserId();
  try {
    const dbRows = await dbListFavorites(uid);
    const remote = (dbRows || []).map((r) => ({
      anime_slug: r.anime_slug,
      media_type: r.media_type || "anime",
      anime_title: r.title || r.anime_title || null,
      anime_cover: r.cover || r.anime_cover || null,
      added_at: r.created_at || r.added_at,
    }));
    // Fusionner les favoris locaux s'ils ne sont pas déjà dans la base
    const seen = new Set(remote.map((r) => r.anime_slug));
    const merged = [...remote];
    for (const item of local) {
      if (!seen.has(item.anime_slug)) {
        merged.push(item);
      }
    }
    return merged;
  } catch (e) {
    console.warn("[favorites] listFavorites fallback local:", e?.message || e);
    return local;
  }
}

/** Du plus prioritaire au moins prioritaire. */
export async function reorderFavorites(slugs) {
  const local = getLocalFavorites();
  const slugIndex = new Map(slugs.map((s, idx) => [s, idx]));
  local.sort((a, b) => {
    const ia = slugIndex.has(a.anime_slug) ? slugIndex.get(a.anime_slug) : 9999;
    const ib = slugIndex.has(b.anime_slug) ? slugIndex.get(b.anime_slug) : 9999;
    return ia - ib;
  });
  saveLocalFavorites(local);

  try {
    if (!isGuestSession() && slugs?.length) {
      await supabase.rpc("reorder_favorites", { p_slugs: slugs });
    }
  } catch (_) {}
  invalidateFavoriteProfileData();
}

export async function isFavorite(slug) {
  const local = getLocalFavorites();
  if (local.some((item) => item.anime_slug === slug)) return true;
  try {
    const { data, error } = await supabase
      .from("favorites")
      .select("anime_slug")
      .eq("anime_slug", slug)
      .maybeSingle();
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Sans genre fourni, il est résolu en arrière-plan. `mediaType` "manga" range le favori dans
 * l'onglet Mangas ; omis, la colonne garde sa valeur (« anime » par défaut).
 */
export async function addFavorite({ slug, title, cover, genre, mediaType }) {
  // 1. Sauvegarde locale garantie (fonctionne toujours, même déconnecté ou erreur 401)
  const local = getLocalFavorites();
  const existingIdx = local.findIndex((item) => item.anime_slug === slug);
  const localItem = {
    anime_slug: slug,
    anime_title: title || null,
    anime_cover: cover || null,
    genre: genre || null,
    media_type: mediaType || "anime",
    added_at: new Date().toISOString(),
  };
  if (existingIdx >= 0) local[existingIdx] = { ...local[existingIdx], ...localItem };
  else local.unshift(localItem);
  saveLocalFavorites(local);
  invalidateFavoriteProfileData();

  // 2. Synchronisation BDD Dayumi MariaDB
  try {
    const uid = getUserId();
    if (uid && uid !== "guest_user") {
      await dbAddFavorite({
        userId: uid,
        slug,
        mediaType: mediaType || "anime",
        title: title || "",
        cover: cover || "",
      });
    }
  } catch (err) {
    console.warn("[favorites] addFavorite BDD échoué :", err?.message || err);
  }

  if (!genre) backfillFavoriteGenre(slug);
}

async function backfillFavoriteGenre(slug) {
  try {
    const { anilist } = await getAnimePage(slug);
    const genre = anilist?.genres?.[0];
    if (!genre) return;
    const local = getLocalFavorites();
    const item = local.find((i) => i.anime_slug === slug);
    if (item && !item.genre) {
      item.genre = genre;
      saveLocalFavorites(local);
    }
    const { error } = await supabase.from("favorites").update({ genre }).eq("anime_slug", slug);
    if (!error) invalidateFavoriteProfileData();
  } catch {
    // L'anime restera « Non classé ».
  }
}

export async function removeFavorite(slug) {
  // 1. Suppression locale garantie
  const local = getLocalFavorites().filter((item) => item.anime_slug !== slug);
  saveLocalFavorites(local);
  invalidateFavoriteProfileData();

  // 2. Suppression BDD Dayumi MariaDB
  try {
    const uid = getUserId();
    if (uid && uid !== "guest_user") {
      await dbRemoveFavorite({ userId: uid, slug });
    }
  } catch (err) {
    console.warn("[favorites] removeFavorite BDD échoué :", err?.message || err);
  }
}

/** Idempotent (rafraîchit la date). */
export async function pinFavorite(slug) {
  if (isGuestSession()) return;
  const { error } = await supabase
    .from("favorites")
    .update({ pinned_at: new Date().toISOString() })
    .eq("anime_slug", slug);
  if (error) throw error;
  invalidateFavoriteProfileData();
}

/**
 * Ordre des favoris à la une (et donc du podium), porté par `pinned_at` : le premier de la
 * liste reçoit la date la plus ancienne. Toutes les dates restent dans le passé.
 */
export async function setPinnedOrder(slugs) {
  if (isGuestSession() || !slugs?.length) return;
  const base = Date.now() - (slugs.length + 1) * 1000;
  const results = await Promise.all(
    slugs.map((slug, i) =>
      supabase
        .from("favorites")
        .update({ pinned_at: new Date(base + i * 1000).toISOString() })
        .eq("anime_slug", slug)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed) throw failed.error;
  invalidateFavoriteProfileData();
}

/**
 * Affiche choisie par le membre parmi les visuels de la galerie. Le marqueur, ignoré par le
 * navigateur, dit au podium de la garder au lieu de chercher l'affiche AniList.
 */
const CUSTOM_COVER_MARK = "#affiche-choisie";

export const isCustomCover = (url) => typeof url === "string" && url.endsWith(CUSTOM_COVER_MARK);

/** `url` null : retour à l'affiche d'origine (`fallbackCover`). Renvoie la valeur enregistrée. */
export async function setFavoriteCover(slug, url, fallbackCover = null) {
  if (isGuestSession()) return null;
  const cover = url ? `${url}${CUSTOM_COVER_MARK}` : fallbackCover;
  const { error } = await supabase.from("favorites").update({ anime_cover: cover }).eq("anime_slug", slug);
  if (error) throw error;
  invalidateFavoriteProfileData();
  return cover;
}

export async function unpinFavorite(slug) {
  if (isGuestSession()) return;
  const { error } = await supabase
    .from("favorites")
    .update({ pinned_at: null })
    .eq("anime_slug", slug);
  if (error) throw error;
  invalidateFavoriteProfileData();
}
