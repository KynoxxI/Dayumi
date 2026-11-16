import { supabase } from "@/lib/supabase";
import { dbGetRating, dbSaveRating, getUserId } from "./dayumiDb";

const LOCAL_RATINGS_KEY = "dayumi_local_ratings";

function getLocalRatings() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_RATINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveLocalRatings(ratings) {
  try {
    localStorage.setItem(LOCAL_RATINGS_KEY, JSON.stringify(ratings));
  } catch {}
}

const normalize = (row = {}, localMine = null) => {
  const mine = row.my_rating == null ? localMine : Number(row.my_rating);
  const avg = row.average_rating == null ? (mine ?? null) : Number(row.average_rating);
  const count = Number(row.ratings_count || (mine != null ? 1 : 0));
  return {
    average: avg,
    count,
    mine,
  };
};

export async function getAnimeRatingSummary(slug) {
  const local = getLocalRatings();
  const localMine = local[slug] != null ? Number(local[slug]) : null;
  const uid = getUserId();
  try {
    const res = await dbGetRating(slug, uid);
    if (res && (res.count > 0 || res.userRating != null)) {
      return {
        average: res.average,
        count: res.count,
        mine: res.userRating ?? localMine,
      };
    }
  } catch (_) {}
  return normalize({}, localMine);
}

export async function saveAnimeRating(slug, rating) {
  const local = getLocalRatings();
  local[slug] = Number(rating);
  saveLocalRatings(local);

  const uid = getUserId();
  try {
    await dbSaveRating({ animeSlug: slug, score: rating, userId: uid });
  } catch (err) {
    console.warn("[ratings] save BDD échoué :", err?.message || err);
  }
  return Number(rating);
}

export async function removeAnimeRating(slug) {
  const local = getLocalRatings();
  delete local[slug];
  saveLocalRatings(local);

  try {
    await supabase.rpc("delete_anime_rating", { p_slug: slug });
  } catch (_) {}
  return true;
}

export function ratingErrorMessage(error) {
  const messages = {
    note_invalide: "Choisis une note entre 1 et 5 étoiles.",
    cible_invalide: "Cette fiche ne peut pas encore être notée.",
    guest_not_allowed: "Crée un compte pour noter cet anime.",
    account_banned: "Ton compte ne peut pas publier de note.",
    account_too_recent: "Ton compte est trop récent — réessaie dans quelques minutes.",
    forbidden: "Connecte-toi pour noter cet anime.",
  };
  return messages[(error?.message || "").trim()] || "La note n’a pas pu être enregistrée.";
}
