import { memo } from "react";

/**
 * Sélecteur de saisons sous forme d'onglets / pilules scrollables.
 */
function SeasonSelector({ seasons = [], selectedSeason = 1, onSelectSeason }) {
  if (!seasons || seasons.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
      {seasons.map((s) => {
        const seasonNum = s.season_number;
        const isActive = Number(selectedSeason) === Number(seasonNum);
        const label = s.name || `Saison ${seasonNum}`;

        return (
          <button
            key={seasonNum}
            type="button"
            onClick={() => onSelectSeason(seasonNum)}
            className={`shrink-0 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
              isActive
                ? "bg-primary text-white shadow-[0_0_20px_rgba(124,92,255,0.4)] border border-primary/50"
                : "bg-surface-2 text-muted hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
            }`}
          >
            {label}
            {s.episode_count ? (
              <span className={`ml-2 text-xs ${isActive ? "text-white/80" : "text-muted/70"}`}>
                ({s.episode_count})
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default memo(SeasonSelector);
