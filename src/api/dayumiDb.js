import { useAuthStore } from "@/stores/useAuthStore";

const API_BASE = "https://anime.dayumi.site";

export function getUserId() {
  try {
    const state = useAuthStore.getState();
    if (state?.user?.id) return state.user.id;
    if (state?.session?.user?.id) return state.session.user.id;
    // Fallback: chercher dans localStorage si session temporaire
    const local = localStorage.getItem("dayumi-auth") || localStorage.getItem("nartya-auth");
    if (local) {
      const parsed = JSON.parse(local);
      const uid = parsed?.user?.id || parsed?.currentSession?.user?.id;
      if (uid) return uid;
    }
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("sb-") || k.includes("auth"))) {
        const val = localStorage.getItem(k);
        if (val && val.includes('"user"')) {
          try {
            const parsed = JSON.parse(val);
            const uid = parsed?.user?.id || parsed?.currentSession?.user?.id;
            if (uid) return uid;
          } catch {}
        }
      }
    }
  } catch {}
  return "guest_user";
}

export async function dbSyncUser(user) {
  if (!user || !user.id) return;
  try {
    const isOwner =
      user.id === "0a0a9e1d-36a7-4676-b0ac-9bc707fc5b47" ||
      user.email === "manex.off@gmail.com" ||
      user.user_metadata?.discord_id === "921387528169345064" ||
      user.discord_id === "921387528169345064";

    const resolvedUsername = isOwner
      ? "!'Kynoxx🍵"
      : (user.user_metadata?.global_name ||
         user.user_metadata?.custom_claims?.global_name ||
         user.user_metadata?.full_name ||
         user.user_metadata?.username ||
         user.username ||
         user.email?.split("@")[0] ||
         "Membre");

    const res = await fetch(`${API_BASE}/v1/users/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        discordId: user.user_metadata?.discord_id || user.discord_id || (isOwner ? "921387528169345064" : null),
        username: resolvedUsername,
        avatar: user.user_metadata?.avatar_url || user.avatar || (isOwner ? "https://cdn.discordapp.com/avatars/921387528169345064/a_6615d16a27ce980abdc85a6c0ea4bab7.gif" : null),
        role: isOwner ? "owner" : (user.role || "member"),
      }),
    });
    return await res.json();
  } catch (err) {
    console.warn("[dayumiDb] dbSyncUser error:", err?.message || err);
  }
}

// ─── Favorites ───
export async function dbListFavorites(userId) {
  const uid = userId || getUserId();
  if (!uid || uid === "guest_user") return [];
  try {
    const res = await fetch(`${API_BASE}/v1/favorites?userId=${encodeURIComponent(uid)}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn("[dayumiDb] dbListFavorites error:", err?.message || err);
    return [];
  }
}

export async function dbAddFavorite({ userId, slug, mediaType = "anime", title, cover }) {
  const uid = userId || getUserId();
  try {
    await fetch(`${API_BASE}/v1/favorites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: uid,
        animeSlug: slug,
        mediaType,
        title: title || "",
        cover: cover || "",
      }),
    });
  } catch (err) {
    console.warn("[dayumiDb] dbAddFavorite error:", err?.message || err);
  }
}

export async function dbRemoveFavorite({ userId, slug, mediaType = "anime" }) {
  const uid = userId || getUserId();
  try {
    await fetch(
      `${API_BASE}/v1/favorites?userId=${encodeURIComponent(uid)}&animeSlug=${encodeURIComponent(slug)}&mediaType=${encodeURIComponent(mediaType)}`,
      { method: "DELETE" }
    );
  } catch (err) {
    console.warn("[dayumiDb] dbRemoveFavorite error:", err?.message || err);
  }
}

// ─── Progress ───
export async function dbListProgress(userId, animeSlug, mediaType) {
  const uid = userId || getUserId();
  if (!uid || uid === "guest_user") return [];
  try {
    let url = `${API_BASE}/v1/progress?userId=${encodeURIComponent(uid)}`;
    if (animeSlug) url += `&animeSlug=${encodeURIComponent(animeSlug)}`;
    if (mediaType) url += `&mediaType=${encodeURIComponent(mediaType)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn("[dayumiDb] dbListProgress error:", err?.message || err);
    return [];
  }
}

export async function dbSaveProgress({
  userId,
  animeSlug,
  mediaType = "anime",
  seasonId,
  episodeNumber,
  progressSeconds,
  durationSeconds,
  completed,
  language,
  animeTitle,
  animeCover,
}) {
  const uid = userId || getUserId();
  try {
    await fetch(`${API_BASE}/v1/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: uid,
        animeSlug,
        mediaType,
        seasonId: String(seasonId),
        episodeNumber: Number(episodeNumber),
        progressSeconds: Math.round(progressSeconds || 0),
        durationSeconds: Math.round(durationSeconds || 0),
        completed: Boolean(completed),
        language: language || "VOSTFR",
        animeTitle: animeTitle || "",
        animeCover: animeCover || "",
      }),
    });
  } catch (err) {
    console.warn("[dayumiDb] dbSaveProgress error:", err?.message || err);
  }
}

// ─── Ratings ───
export async function dbGetRating(animeSlug, userId) {
  const uid = userId || getUserId();
  try {
    let url = `${API_BASE}/v1/ratings?animeSlug=${encodeURIComponent(animeSlug)}`;
    if (uid && uid !== "guest_user") url += `&userId=${encodeURIComponent(uid)}`;
    const res = await fetch(url);
    if (!res.ok) return { average: null, count: 0, userRating: null };
    return await res.json();
  } catch (err) {
    console.warn("[dayumiDb] dbGetRating error:", err?.message || err);
    return { average: null, count: 0, userRating: null };
  }
}

export async function dbSaveRating({ animeSlug, score, userId }) {
  const uid = userId || getUserId();
  try {
    await fetch(`${API_BASE}/v1/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: uid,
        animeSlug,
        score: Number(score),
      }),
    });
  } catch (err) {
    console.warn("[dayumiDb] dbSaveRating error:", err?.message || err);
  }
}

