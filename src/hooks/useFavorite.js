import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/stores/useAuthStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { isFavorite, addFavorite, removeFavorite } from "@/api/favorites";

/** Mise à jour optimiste et tolérante aux pannes. */
export function useFavorite(slug, meta = {}) {
  const [fav, setFav] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!slug) {
      setFav(false);
      return;
    }
    let alive = true;
    isFavorite(slug)
      .then((v) => alive && setFav(v))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [slug]);

  const toggle = async () => {
    if (busy) return;
    const next = !fav;
    setFav(next);
    setBusy(true);
    const store = useFavoritesStore.getState();
    if (next) store.markFavorite(slug);
    else store.unmarkFavorite(slug);
    try {
      if (next) {
        await addFavorite({
          slug,
          title: meta.title,
          cover: meta.cover,
          genre: meta.genre,
          mediaType: meta.mediaType,
        });
        toast.success("Ajouté aux favoris");
      } else {
        await removeFavorite(slug);
        toast.info("Retiré des favoris");
      }
    } catch (e) {
      console.warn("[favorite] toggle:", e);
      // Ne pas annuler si la sauvegarde locale a réussi
    } finally {
      setBusy(false);
    }
  };

  return { fav, toggle, busy };
}
