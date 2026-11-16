import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { getSeriePage, getSerieSeason } from "@/api/movieApi";
import {
  MOVIE_PROVIDERS,
  resolveMovieSource,
} from "@/utils/movieSources";
import { getEpisodeProgress, saveEpisodeProgress } from "@/api/progress";
import { useAuthStore } from "@/stores/useAuthStore";
import { platform } from "@/platform";
import VideoPlayer from "@/components/player/VideoPlayer";
import {
  FallbackBackButton,
  WatchError,
  WatchLoading,
} from "@/components/player/WatchOverlays";
import SourcePicker from "@/components/movie/SourcePicker";
import { toast } from "@/lib/toast";
import { ChevronLeft, ChevronRight, List } from "lucide-react";

export default function SerieWatchPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;

  const rawSeason = params.get("s");
  const rawEpisode = params.get("ep");
  const rawSource = params.get("src") || "auto";

  const seasonNumber = Number.isFinite(Number(rawSeason)) && Number(rawSeason) > 0 ? Number(rawSeason) : 1;
  const episodeNumber = Number.isFinite(Number(rawEpisode)) && Number(rawEpisode) > 0 ? Number(rawEpisode) : 1;

  // Orientation paysage sur mobile
  useEffect(() => {
    if (!platform.isMobile) return undefined;
    platform.setOrientation?.("player");
    return () => platform.setOrientation?.("portrait");
  }, []);

  const [serie, setSerie] = useState(null);
  const [seasonData, setSeasonData] = useState(null);
  const [loadingSerie, setLoadingSerie] = useState(true);
  const [, setLoadingSeason] = useState(true);
  const [resolving, setResolving] = useState(true);
  const [resolutionError, setResolutionError] = useState(null);
  const [streamData, setStreamData] = useState(null);
  const [excludeIds, setExcludeIds] = useState([]);
  const [resumeAt, setResumeAt] = useState(0);
  const [showDrawer, setShowDrawer] = useState(false);

  const cleanId = String(id || "").replace(/^tmdb-(tv-)?/, "");
  const serieSlug = `tmdb-tv-${cleanId}`;

  // 1. Données de la série
  useEffect(() => {
    let cancelled = false;
    setLoadingSerie(true);
    getSeriePage(cleanId)
      .then((data) => {
        if (cancelled) return;
        setSerie(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[SerieWatchPage] Erreur fiche série:", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingSerie(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cleanId]);

  // 2. Données de la saison courante
  useEffect(() => {
    let cancelled = false;
    setLoadingSeason(true);
    getSerieSeason(cleanId, seasonNumber)
      .then((data) => {
        if (cancelled) return;
        setSeasonData(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[SerieWatchPage] Erreur saison:", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingSeason(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cleanId, seasonNumber]);

  // 3. Reprise de lecture pour cet épisode
  useEffect(() => {
    let cancelled = false;
    getEpisodeProgress(serieSlug, String(seasonNumber), episodeNumber, "VF", userId).then((p) => {
      if (cancelled || !p) return;
      if (!p.completed && p.positionSeconds > 10) {
        setResumeAt(p.positionSeconds);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [serieSlug, seasonNumber, episodeNumber, userId]);

  // 4. Résolution de la source vidéo
  const resolveStream = useCallback(
    async (sourceToUse = rawSource, excluded = excludeIds) => {
      setResolving(true);
      setResolutionError(null);

      const targetSource = sourceToUse !== "auto" ? sourceToUse : undefined;
      const res = await resolveMovieSource(
        {
          tmdbId: cleanId,
          season: seasonNumber,
          episode: episodeNumber,
          mediaType: "tv",
          sourceId: targetSource,
        },
        { excludeIds: excluded }
      );

      if (res.success) {
        setStreamData(res);
        setResolving(false);

        // Sauvegarde d'entrée dans l'historique
        if (serie) {
          saveEpisodeProgress({
            slug: serieSlug,
            seasonId: String(seasonNumber),
            episodeNumber,
            language: "VF",
            positionSeconds: resumeAt || 0,
            duration: 45 * 60,
            title: serie.title,
            cover: serie.image || serie.cover,
            userId,
            mediaType: "serie",
          });
        }
      } else {
        setStreamData(null);
        setResolutionError(
          res.error || `Aucune source jouable n'a été trouvée pour la saison ${seasonNumber} épisode ${episodeNumber}.`
        );
        setResolving(false);
      }
    },
    [cleanId, seasonNumber, episodeNumber, rawSource, excludeIds, serie, serieSlug, resumeAt, userId]
  );

  useEffect(() => {
    resolveStream(rawSource, excludeIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanId, seasonNumber, episodeNumber, rawSource]);

  const handleChangeSource = (newSourceId) => {
    setParams({ s: String(seasonNumber), ep: String(episodeNumber), src: newSourceId });
  };

  const handleRetry = () => {
    setExcludeIds([]);
    resolveStream(rawSource, []);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(`/serie/${cleanId}`);
    }
  };

  const episodes = seasonData?.episodes || [];
  const currentEpisodeData = episodes.find((e) => Number(e.episode_number) === Number(episodeNumber));

  const hasNext = episodeNumber < episodes.length;
  const hasPrev = episodeNumber > 1;

  const goToEpisode = (epNum, sNum = seasonNumber) => {
    setShowDrawer(false);
    setParams({ s: String(sNum), ep: String(epNum), src: rawSource });
  };

  const goNext = () => {
    if (hasNext) {
      goToEpisode(episodeNumber + 1);
    } else if (serie?.seasons && seasonNumber < serie.seasons.length) {
      goToEpisode(1, seasonNumber + 1);
    }
  };

  const goPrev = () => {
    if (hasPrev) {
      goToEpisode(episodeNumber - 1);
    }
  };

  const availableSources = useMemo(() => {
    return MOVIE_PROVIDERS.filter((p) => !excludeIds.includes(p.id));
  }, [excludeIds]);

  const serieTitle = serie?.title || "Série";
  const epTitle = currentEpisodeData?.name
    ? `S${seasonNumber} E${episodeNumber} · ${currentEpisodeData.name}`
    : `S${seasonNumber} Épisode ${episodeNumber}`;

  if (loadingSerie && !serie) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <FallbackBackButton onClick={handleBack} />
        <WatchLoading />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      {/* Barre supérieure d'overlay */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <FallbackBackButton onClick={handleBack} />
          <div className="ml-10">
            <h1 className="text-sm sm:text-base font-bold text-white drop-shadow-md line-clamp-1 font-['Outfit']">
              {serieTitle}
            </h1>
            <p className="text-xs text-white/70 font-medium">{epTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Boutons précédent / suivant */}
          <button
            type="button"
            disabled={!hasPrev}
            onClick={goPrev}
            aria-label="Épisode précédent"
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl bg-black/70 text-white backdrop-blur-md border border-white/10 disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={goNext}
            aria-label="Épisode suivant"
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl bg-black/70 text-white backdrop-blur-md border border-white/10 disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 transition-colors"
          >
            <ChevronRight size={18} />
          </button>

          {/* Bouton tiroir épisodes */}
          <button
            type="button"
            onClick={() => setShowDrawer(!showDrawer)}
            aria-label="Liste des épisodes"
            className="flex h-9 items-center gap-1.5 rounded-xl bg-black/70 px-3 text-xs font-semibold text-white backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors"
          >
            <List size={15} />
            <span className="hidden sm:inline">Épisodes</span>
          </button>

          {/* Sélecteur de source */}
          <SourcePicker
            sources={availableSources}
            selectedSourceId={rawSource}
            usedSource={streamData?.usedSource}
            onSelectSource={handleChangeSource}
            disabled={resolving}
          />
        </div>
      </div>

      {/* Contenu principal */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-black flex items-center justify-center">
        {resolving ? (
          <WatchLoading />
        ) : resolutionError ? (
          <WatchError message={resolutionError} onRetry={handleRetry} />
        ) : streamData?.mode === "direct" && streamData?.videoUrl ? (
          <VideoPlayer
            src={streamData.videoUrl}
            title={`${serieTitle} — ${epTitle}`}
            poster={currentEpisodeData?.still_path ? `https://image.tmdb.org/t/p/original${currentEpisodeData.still_path}` : serie?.banner}
            resumeAt={resumeAt}
            sources={availableSources.map((s) => ({ id: s.id, label: s.label }))}
            sourceId={rawSource}
            provider={streamData.usedLabel}
            onSourceChange={handleChangeSource}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPrev={goPrev}
            onNext={goNext}
            onTimeUpdate={(time, dur) => {
              if (serie && time > 5) {
                saveEpisodeProgress({
                  slug: serieSlug,
                  seasonId: String(seasonNumber),
                  episodeNumber,
                  language: "VF",
                  positionSeconds: Math.floor(time),
                  duration: Math.floor(dur || 45 * 60),
                  title: serie.title,
                  cover: serie.image || serie.cover,
                  userId,
                  mediaType: "serie",
                });
              }
            }}
            onError={() => {
              if (streamData?.usedSource?.id) {
                const nextExcluded = [...excludeIds, streamData.usedSource.id];
                setExcludeIds(nextExcluded);
                toast.error(`La source ${streamData.usedLabel} a échoué. Tentative sur une autre…`);
                resolveStream(rawSource, nextExcluded);
              }
            }}
          />
        ) : streamData?.mode === "iframe" && streamData?.videoUrl ? (
          <div className="relative w-full h-full flex items-center justify-center pt-14">
            <iframe
              src={streamData.videoUrl}
              title={`${serieTitle} — ${epTitle}`}
              className="w-full h-full border-0 aspect-video max-w-full max-h-full"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
            />
          </div>
        ) : (
          <WatchError message="Erreur inattendue lors de la lecture." onRetry={handleRetry} />
        )}
      </div>

      {/* Tiroir liste des épisodes */}
      {showDrawer && (
        <div className="fixed inset-y-0 right-0 z-40 w-80 max-w-[85vw] bg-[#0f0c18]/95 backdrop-blur-2xl border-l border-white/10 p-4 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="font-bold text-sm text-white">Saison {seasonNumber}</h3>
            <button
              onClick={() => setShowDrawer(false)}
              className="text-xs text-muted hover:text-white"
            >
              Fermer
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2 space-y-1">
            {episodes.map((e) => {
              const active = Number(e.episode_number) === Number(episodeNumber);
              return (
                <button
                  key={e.id || e.episode_number}
                  onClick={() => goToEpisode(e.episode_number)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors ${
                    active
                      ? "bg-primary text-white font-bold"
                      : "text-muted hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <p className="line-clamp-1">
                    Ép. {e.episode_number} {e.name ? `— ${e.name}` : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
