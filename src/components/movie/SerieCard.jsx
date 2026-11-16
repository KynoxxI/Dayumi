import { memo, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Star, Heart, Tv } from "lucide-react";
import { useFavoritesStore } from "@/stores/useFavoritesStore";

/**
 * Carte série avec affichage du poster, note, nombre de saisons et statut.
 */
function SerieCard({
  serie,
  index,
  showFavorite = true,
  titleLines = 1,
  highlightedGenres = [],
}) {
  const navigate = useNavigate();
  const serieId = serie.tmdbId || serie.id;
  const slug = `tmdb-tv-${serieId}`;
  const isFav = useFavoritesStore((s) => s.slugs?.has(slug) || s.slugs?.has(String(serieId)));
  const title = serie.title || serie.name || "Série sans titre";

  const imgRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const poster = serie.cover || serie.image;

  useEffect(() => {
    setLoaded(false);
    if (imgRef.current?.complete) setLoaded(true);
  }, [poster]);

  const displayedGenres = [
    ...highlightedGenres.filter((genre) => serie.genres?.includes(genre)),
    ...(serie.genres || []),
  ]
    .filter((genre, genreIndex, allGenres) => allGenres.indexOf(genre) === genreIndex)
    .slice(0, 2);

  const handleClick = () => {
    navigate(`/serie/${serieId}`);
  };

  return (
    <button
      onClick={handleClick}
      className="group block w-full select-none text-left transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] md:active:scale-100"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-surface-2 border border-white/[0.08] shadow-[0_8px_20px_rgba(0,0,0,0.5)] group-hover:border-primary/50 group-hover:shadow-[0_12px_32px_rgba(124,92,255,0.22)] transition-all duration-300">
        {poster ? (
          <>
            {!loaded && <div className="absolute inset-0 skeleton" />}
            <img
              ref={imgRef}
              src={poster}
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
          <div className="h-full w-full skeleton flex items-center justify-center text-muted text-xs">
            Affiche indisponible
          </div>
        )}

        <div className="absolute inset-0 hidden items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/50 group-hover:opacity-100 md:flex backdrop-blur-[2px]">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-purple-500 text-white shadow-[0_0_25px_rgba(124,92,255,0.65)] transform group-hover:scale-110 transition-transform duration-200">
            <Play size={18} className="ml-0.5 fill-current" />
          </span>
        </div>

        {/* Index */}
        {typeof index === "number" && (
          <span className="absolute left-2.5 top-2.5 z-10 rounded-xl bg-black/80 px-2.5 py-1 font-['Outfit'] font-black text-xs text-primary backdrop-blur-md border border-primary/30 shadow-md">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}

        {/* Note */}
        {serie.score != null && serie.score > 0 && (
          <span className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1 rounded-xl bg-black/80 px-2.5 py-1 text-[0.7rem] font-bold text-yellow-400 backdrop-blur-md border border-white/10 shadow-md">
            <Star size={11} className="fill-yellow-400 text-yellow-400" />
            {Number(serie.score).toFixed(1)}
          </span>
        )}

        {/* Favori */}
        {showFavorite && isFav && (
          <span
            title="Dans tes favoris"
            className="absolute bottom-2.5 left-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/80 backdrop-blur-md border border-pink-500/50 shadow-md"
          >
            <Heart size={13} className="fill-pink-500 text-pink-500" />
          </span>
        )}

        {/* Nombre de saisons ou Année */}
        <span className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 rounded-lg bg-black/70 px-2 py-0.5 text-[0.65rem] font-medium text-white/80 backdrop-blur-sm border border-white/10">
          <Tv size={10} className="text-primary" />
          {serie.seasonsCount ? `${serie.seasonsCount} S.` : serie.year || "Série"}
        </span>
      </div>

      <h3
        className={`mt-2.5 text-sm font-bold text-text font-['Outfit'] tracking-tight transition-colors group-hover:text-primary ${
          titleLines === 2 ? "min-h-10 line-clamp-2 leading-5" : "line-clamp-1"
        }`}
      >
        {title}
      </h3>
      <p className="mt-0.5 line-clamp-1 text-xs text-muted">
        {displayedGenres.length > 0 ? displayedGenres.join(" · ") : "Série"}
      </p>
    </button>
  );
}

export default memo(SerieCard);
