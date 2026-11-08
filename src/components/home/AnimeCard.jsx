import { memo, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Play, Star, Heart } from "lucide-react";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useDisplayTitle } from "@/stores/useTitlesStore";
import AnimeContextMenu from "@/components/anime/AnimeContextMenu";
import { platform } from "@/platform";

const LONG_PRESS_DELAY_MS = 450;
const LONG_PRESS_MOVE_TOLERANCE_PX = 12;

/** `showFavorite` : pastille cœur si l'anime est en favori. */
function AnimeCard({
  anime,
  index,
  showFavorite = true,
  openScans = false,
  titleLines = 1,
  highlightedGenres = [],
}) {
  const navigate = useNavigate();
  const isFav = useFavoritesStore((s) => s.slugs.has(anime.slug));
  const title = useDisplayTitle()(anime.slug, anime.title, anime);

  // `complete` couvre l'image déjà en cache, pour laquelle onLoad ne se déclenche pas.
  const imgRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setLoaded(false);
    if (imgRef.current?.complete) setLoaded(true);
  }, [anime.cover]);

  // { x, y } ou null
  const [menu, setMenu] = useState(null);
  const longPressTimerRef = useRef(null);
  const longPressStartRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const PrimaryIcon = openScans ? BookOpen : Play;
  const displayedGenres = [
    ...highlightedGenres.filter((genre) => anime.genres?.includes(genre)),
    ...(anime.genres || []),
  ]
    .filter((genre, genreIndex, allGenres) => allGenres.indexOf(genre) === genreIndex)
    .slice(0, 2);

  const cancelLongPress = () => {
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
    longPressStartRef.current = null;
  };

  useEffect(() => cancelLongPress, []);

  const openMobileMenu = () => {
    longPressTriggeredRef.current = true;
    platform.haptic?.("medium");
    setMenu({ x: 0, y: 0 });
  };

  const startLongPress = (event) => {
    if (!platform.isMobile || event.pointerType !== "touch" || !event.isPrimary) return;
    cancelLongPress();
    longPressTriggeredRef.current = false;
    longPressStartRef.current = { x: event.clientX, y: event.clientY };
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      longPressStartRef.current = null;
      openMobileMenu();
    }, LONG_PRESS_DELAY_MS);
  };

  const trackLongPress = (event) => {
    const start = longPressStartRef.current;
    if (!start) return;
    if (
      Math.hypot(event.clientX - start.x, event.clientY - start.y) >
      LONG_PRESS_MOVE_TOLERANCE_PX
    ) {
      cancelLongPress();
    }
  };

  const openCardOrIgnoreLongPress = (event) => {
    if (longPressTriggeredRef.current) {
      event.preventDefault();
      longPressTriggeredRef.current = false;
      return;
    }
    navigate(`/anime/${anime.slug}${openScans ? "?tab=scans" : ""}`);
  };

  return (
    <>
    <button
      onClick={openCardOrIgnoreLongPress}
      onPointerDown={startLongPress}
      onPointerMove={trackLongPress}
      onPointerUp={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onContextMenu={(e) => {
        e.preventDefault();
        if (platform.isMobile) {
          cancelLongPress();
          if (!longPressTriggeredRef.current) openMobileMenu();
          return;
        }
        setMenu({ x: e.clientX, y: e.clientY });
      }}
      className="group block w-full select-none text-left transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] md:active:scale-100"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-surface-2 border border-white/[0.08] shadow-[0_8px_20px_rgba(0,0,0,0.5)] group-hover:border-primary/50 group-hover:shadow-[0_12px_32px_rgba(249,115,22,0.22)] transition-all duration-300">
        {anime.cover ? (
          <>
            {!loaded && <div className="absolute inset-0 skeleton" />}
            <img
              ref={imgRef}
              src={anime.cover}
              alt={title}
              loading="lazy"
              decoding="async"
              draggable={false}
              onLoad={() => setLoaded(true)}
              onError={() => setLoaded(true)}
              className={`h-full w-full object-cover transition-[transform,opacity] duration-300 ease-out group-hover:scale-105 ${
                loaded ? "opacity-100" : "opacity-0"
              }`}
            />
          </>
        ) : (
          <div className="h-full w-full skeleton" />
        )}

        <div className="absolute inset-0 hidden items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/50 group-hover:opacity-100 md:flex backdrop-blur-[2px]">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-amber-500 text-white shadow-[0_0_25px_rgba(249,115,22,0.65)] transform group-hover:scale-110 transition-transform duration-200">
            <PrimaryIcon size={18} className={openScans ? "" : "ml-0.5 fill-current"} />
          </span>
        </div>

        {/* Index éditorial (rangée Tendances) */}
        {typeof index === "number" && (
          <span className="absolute left-2.5 top-2.5 z-10 rounded-xl bg-black/80 px-2.5 py-1 font-['Outfit'] font-black text-xs text-primary backdrop-blur-md border border-primary/30 shadow-md">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}

        {anime.score != null && (
          <span className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1 rounded-xl bg-black/80 px-2.5 py-1 text-[0.7rem] font-bold text-yellow-400 backdrop-blur-md border border-white/10 shadow-md">
            <Star size={11} className="fill-yellow-400 text-yellow-400" />
            {anime.score.toFixed(1)}
          </span>
        )}

        {showFavorite && isFav && (
          <span
            title="Dans tes favoris"
            className="absolute bottom-2.5 left-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/80 backdrop-blur-md border border-pink-500/50 shadow-md"
          >
            <Heart size={13} className="fill-pink-500 text-pink-500" />
          </span>
        )}
      </div>

      <h3
        className={`mt-2.5 text-sm font-bold text-text font-['Outfit'] tracking-tight transition-colors group-hover:text-primary ${
          titleLines === 2 ? "min-h-10 line-clamp-2 leading-5" : "line-clamp-1"
        }`}
      >
        {title}
      </h3>
      <p className="mt-0.5 line-clamp-1 text-xs text-muted">
        {displayedGenres.join(" · ")}
      </p>
    </button>
    {menu && (
      <AnimeContextMenu
        anime={anime}
        mediaType={openScans ? "manga" : undefined}
        x={menu.x}
        y={menu.y}
        onClose={() => {
          longPressTriggeredRef.current = false;
          setMenu(null);
        }}
      />
    )}
    </>
  );
}

export default memo(AnimeCard);
