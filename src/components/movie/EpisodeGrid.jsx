import { memo } from "react";
import { Play, Clock3, Calendar, ImageOff } from "lucide-react";

/**
 * Grille d'épisodes d'une saison de série.
 */
function EpisodeGrid({
  episodes = [],
  currentEpisode = null,
  onSelectEpisode,
}) {
  if (!episodes || episodes.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted">
        Aucun épisode disponible pour cette saison.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {episodes.map((ep) => {
        const epNum = ep.episode_number;
        const isCurrent = Number(currentEpisode) === Number(epNum);
        const stillUrl = ep.still_path
          ? `https://image.tmdb.org/t/p/w500${ep.still_path}`
          : null;

        return (
          <button
            key={ep.id || epNum}
            type="button"
            onClick={() => onSelectEpisode?.(epNum, ep)}
            className={`group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all duration-300 hover:-translate-y-1 ${
              isCurrent
                ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(124,92,255,0.25)]"
                : "border-white/[0.08] bg-surface-2 hover:border-white/20 hover:bg-surface-3"
            }`}
          >
            {/* Vignette still */}
            <div className="relative aspect-video w-full overflow-hidden bg-black/40">
              {stillUrl ? (
                <img
                  src={stillUrl}
                  alt={ep.name || `Épisode ${epNum}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted/50">
                  <ImageOff size={24} />
                </div>
              )}

              {/* Badge numéro */}
              <span className="absolute left-2.5 top-2.5 rounded-lg bg-black/80 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-md border border-white/10">
                Ép. {epNum}
              </span>

              {/* Durée */}
              {ep.runtime ? (
                <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-lg bg-black/80 px-2 py-0.5 text-[0.7rem] text-muted backdrop-blur-md border border-white/10">
                  <Clock3 size={11} />
                  {ep.runtime} min
                </span>
              ) : null}

              {/* Bouton lecture au survol */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg">
                  <Play size={16} className="ml-0.5 fill-current" />
                </span>
              </div>
            </div>

            {/* Infos épisode */}
            <div className="flex flex-1 flex-col p-3.5">
              <h4 className="line-clamp-1 text-sm font-bold text-text transition-colors group-hover:text-primary">
                {ep.name ? `${epNum}. ${ep.name}` : `Épisode ${epNum}`}
              </h4>

              {ep.overview ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted leading-relaxed">
                  {ep.overview}
                </p>
              ) : null}

              {ep.air_date ? (
                <div className="mt-auto pt-2 flex items-center gap-1 text-[0.7rem] text-muted/60">
                  <Calendar size={11} />
                  <span>{ep.air_date}</span>
                </div>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default memo(EpisodeGrid);
