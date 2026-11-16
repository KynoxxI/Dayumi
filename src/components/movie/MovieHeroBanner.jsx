import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Info, Star, Calendar } from "lucide-react";

function MovieHeroBanner({ media }) {
  const navigate = useNavigate();

  if (!media) return null;

  const isSerie = media.mediaType === "serie" || media.mediaType === "tv";
  const id = media.tmdbId || media.id;
  const bannerUrl = media.banner || media.image || media.cover;
  const watchUrl = isSerie ? `/watch/serie/${id}` : `/watch/movie/${id}`;
  const detailsUrl = isSerie ? `/serie/${id}` : `/movie/${id}`;

  return (
    <div className="relative h-[65vh] min-h-[440px] max-h-[620px] w-full overflow-hidden">
      {/* Image de fond avec dégradés soignés */}
      {bannerUrl && (
        <img
          src={bannerUrl}
          alt={media.title}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      )}

      {/* Dégradés cinématiques */}
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/70 to-transparent w-full md:w-3/4" />

      {/* Contenu textuel */}
      <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-12 pt-20 md:px-12 md:pb-16 max-w-3xl">
        {/* Badge catégorie */}
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-primary/25 border border-primary/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            {isSerie ? "Série à l'affiche" : "Film à l'affiche"}
          </span>
          {media.score > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-yellow-400 backdrop-blur-md border border-white/10">
              <Star size={12} className="fill-yellow-400 text-yellow-400" />
              {Number(media.score).toFixed(1)}
            </span>
          )}
          {media.year && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Calendar size={12} />
              {media.year}
            </span>
          )}
        </div>

        <h1 className="font-['Outfit'] text-3xl font-black tracking-tight text-white sm:text-5xl md:text-6xl drop-shadow-xl line-clamp-2">
          {media.title}
        </h1>

        {media.description && (
          <p className="mt-3 line-clamp-3 text-sm md:text-base text-muted/90 max-w-2xl leading-relaxed drop-shadow">
            {media.description}
          </p>
        )}

        {/* Boutons d'action */}
        <div className="mt-6 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(watchUrl)}
            className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-primary to-purple-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_0_30px_rgba(124,92,255,0.45)] transition-all hover:scale-105 active:scale-95"
          >
            <Play size={18} className="fill-current" />
            <span>Regarder maintenant</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(detailsUrl)}
            className="flex items-center gap-2 rounded-2xl bg-surface-2/80 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-md border border-white/10 transition-all hover:bg-white/10 hover:border-white/20 active:scale-95"
          >
            <Info size={18} />
            <span>Plus d'infos</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(MovieHeroBanner);
