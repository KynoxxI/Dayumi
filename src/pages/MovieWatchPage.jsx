import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { getMoviePage } from "@/api/movieApi";
import {
  MOVIE_PROVIDERS,
  resolveMovieSource,
} from "@/utils/movieSources";
import { getEpisodeProgress, saveEpisodeProgress } from "@/api/progress";
import { useAuthStore } from "@/stores/useAuthStore";
import { useDiscordPresence } from "@/hooks/useDiscordPresence";
import { platform } from "@/platform";
import VideoPlayer from "@/components/player/VideoPlayer";
import {
  FallbackBackButton,
  WatchError,
  WatchLoading,
} from "@/components/player/WatchOverlays";
import SourcePicker from "@/components/movie/SourcePicker";
import { toast } from "@/lib/toast";

// Temps max avant de considérer qu'une iframe ne répond pas (8 secondes)
const IFRAME_LOAD_TIMEOUT_MS = 8000;

export default function MovieWatchPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;

  const cleanId = String(id || "").replace(/^tmdb-/, "");
  const movieSlug = `tmdb-${cleanId}`;

  const source = params.get("src") || "auto";

  // Orientation paysage sur mobile
  useEffect(() => {
    if (!platform.isMobile) return undefined;
    platform.setOrientation?.("player");
    return () => platform.setOrientation?.("portrait");
  }, []);

  const [movie, setMovie] = useState(null);
  const [loadingMovie, setLoadingMovie] = useState(true);

  // État de la résolution
  const [resolving, setResolving] = useState(true);
  const [error, setError] = useState(null);
  const [streamData, setStreamData] = useState(null);
  const [failedSources, setFailedSources] = useState(() => new Set());
  const [resumeAt, setResumeAt] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);

  const iframeTimeoutRef = useRef(null);
  const playerApiRef = useRef(null);

  // 1. Chargement des métadonnées du film
  useEffect(() => {
    let cancelled = false;
    setLoadingMovie(true);

    getMoviePage(cleanId)
      .then((data) => {
        if (cancelled) return;
        setMovie(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[MovieWatchPage] Erreur chargement film:", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingMovie(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cleanId]);

  const movieTitle = movie?.title || "Film";
  const movieCover = movie?.image || movie?.cover || "";

  // 2. Présence Discord
  useDiscordPresence(
    {
      type: "watching",
      animeTitle: movieTitle,
      episodeTitle: movie?.year ? `Film (${movie.year})` : "Film",
    },
    [movieTitle, movie?.year]
  );

  // 3. Récupération de la reprise
  useEffect(() => {
    let cancelled = false;
    getEpisodeProgress(movieSlug, "1", 1, "VF", userId)
      .then((prog) => {
        if (cancelled || !prog) return;
        if (!prog.completed && prog.positionSeconds > 10) {
          setResumeAt(prog.positionSeconds);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [movieSlug, userId]);

  // 4. Résolution de la source vidéo
  const executeResolution = useCallback(
    async (sourceToUse = source, excluded = failedSources) => {
      setResolving(true);
      setError(null);
      setIframeLoaded(false);
      clearTimeout(iframeTimeoutRef.current);

      try {
        const targetSource = sourceToUse !== "auto" ? sourceToUse : undefined;
        const res = await resolveMovieSource(
          { tmdbId: cleanId, mediaType: "movie", sourceId: targetSource },
          { excludeIds: excluded }
        );

        if (res.success) {
          setStreamData(res);
          setResolving(false);

          // Si source iframe : armer le timeout de repli si elle ne charge pas
          if (res.mode === "iframe" && sourceToUse === "auto") {
            iframeTimeoutRef.current = setTimeout(() => {
              // Si toujours pas chargée après 8s, on tente la source suivante
              if (!iframeLoaded) {
                console.warn(`[MovieWatchPage] Timeout iframe pour ${res.source?.label}, repli...`);
                const nextFailed = new Set(excluded);
                if (res.source?.id) nextFailed.add(res.source.id);
                setFailedSources(nextFailed);
                executeResolution(sourceToUse, nextFailed);
              }
            }, IFRAME_LOAD_TIMEOUT_MS);
          }
        } else {
          setStreamData(null);
          const count = excluded.size || MOVIE_PROVIDERS.length;
          setError(
            `Toutes les sources (${count} testée${count > 1 ? "s" : ""}) sont actuellement indisponibles.`
          );
          setResolving(false);
        }
      } catch (err) {
        console.error("[MovieWatchPage] Erreur résolution:", err);
        setError("Erreur inattendue lors de la résolution du flux.");
        setResolving(false);
      }
    },
    [cleanId, source, failedSources, iframeLoaded]
  );

  // Déclenchement de la résolution au montage ou changement de film/source
  useEffect(() => {
    executeResolution(source, failedSources);
    return () => clearTimeout(iframeTimeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanId, source]);

  // Gestion du retour (cohérent avec WatchPage)
  const handleBack = useCallback(() => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate(`/movie/${cleanId}`, { replace: true });
    }
  }, [navigate, cleanId]);

  // Changement manuel de source
  const handleChangeSource = (newSourceId) => {
    const next = new URLSearchParams(params);
    if (newSourceId === "auto") {
      next.delete("src");
    } else {
      next.set("src", newSourceId);
    }
    setParams(next);
  };

  // Réinitialisation et nouvelle tentative
  const handleRetry = () => {
    const emptySet = new Set();
    setFailedSources(emptySet);
    executeResolution(source, emptySet);
  };

  // Échec en cours de lecture directe (ArtPlayer / Hls)
  const handleDirectPlaybackError = () => {
    if (streamData?.source?.id) {
      const nextFailed = new Set(failedSources);
      nextFailed.add(streamData.source.id);
      setFailedSources(nextFailed);
      toast.error(`La source ${streamData.usedLabel || streamData.source.label} a échoué. Repli en cours…`);
      executeResolution(source, nextFailed);
    }
  };

  // Mise à jour de la progression
  const handleTimeUpdate = (time, duration) => {
    if (movie && time > 5) {
      saveEpisodeProgress({
        slug: movieSlug,
        seasonId: "1",
        episodeNumber: 1,
        language: "VF",
        positionSeconds: Math.floor(time),
        duration: Math.floor(duration || (movie.runtime || 110) * 60),
        title: movieTitle,
        cover: movieCover,
        userId,
        mediaType: "movie",
      });
    }
  };

  // Sources encore disponibles
  const availableSources = useMemo(() => {
    return MOVIE_PROVIDERS.filter((p) => !failedSources.has(p.id));
  }, [failedSources]);

  if (loadingMovie && !movie) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <FallbackBackButton onClick={handleBack} />
        <WatchLoading />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white select-none">
      {/* Barre supérieure identique à WatchPage */}
      <header className="absolute left-0 right-0 top-0 z-40 flex items-center justify-between p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <FallbackBackButton onClick={handleBack} />
          <div className="ml-10">
            <h1 className="text-sm sm:text-base font-bold text-white drop-shadow-md line-clamp-1 font-['Outfit']">
              {movieTitle}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="font-semibold text-primary">Dayumi Movie</span>
              {movie?.year && <span>• {movie.year}</span>}
              {movie?.runtime && (
                <span>• {Math.floor(movie.runtime / 60)}h{movie.runtime % 60}m</span>
              )}
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-3">
          <SourcePicker
            sources={availableSources}
            selectedSourceId={source}
            usedSource={streamData?.source}
            onSelectSource={handleChangeSource}
            disabled={resolving}
            isOpen={sourcePickerOpen}
            onToggle={setSourcePickerOpen}
          />
        </div>
      </header>

      {/* Zone de lecture plein écran */}
      <main className="relative flex-1 w-full h-full overflow-hidden bg-black flex items-center justify-center">
        {resolving ? (
          <WatchLoading />
        ) : error ? (
          <div className="flex flex-col items-center gap-4 text-center max-w-md px-6">
            <WatchError message={error} onRetry={handleRetry} />
            <button
              type="button"
              onClick={() => setSourcePickerOpen(true)}
              className="rounded-xl bg-surface-2 px-4 py-2 text-xs font-semibold text-white border border-white/10 hover:bg-white/10 transition-all"
            >
              Choisir une autre source
            </button>
          </div>
        ) : streamData?.mode === "direct" && streamData?.videoUrl ? (
          <VideoPlayer
            src={streamData.videoUrl}
            title={movieTitle}
            poster={movie?.banner || movieCover}
            resumeAt={resumeAt}
            sources={availableSources.map((s) => ({ id: s.id, label: s.label }))}
            sourceId={source}
            provider={streamData.usedLabel}
            onSourceChange={handleChangeSource}
            onTimeUpdate={handleTimeUpdate}
            onError={handleDirectPlaybackError}
            onPlayerApi={(api) => {
              playerApiRef.current = api;
            }}
          />
        ) : streamData?.mode === "iframe" && streamData?.videoUrl ? (
          <div className="relative w-full h-full flex items-center justify-center pt-14">
            <iframe
              src={streamData.videoUrl}
              title={movieTitle}
              className="w-full h-full border-0 aspect-video max-w-full max-h-full"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
              onLoad={() => {
                setIframeLoaded(true);
                clearTimeout(iframeTimeoutRef.current);
              }}
              onError={() => {
                console.warn("[MovieWatchPage] Erreur iframe, repli...");
                const nextFailed = new Set(failedSources);
                if (streamData.source?.id) nextFailed.add(streamData.source.id);
                setFailedSources(nextFailed);
                executeResolution(source, nextFailed);
              }}
            />
          </div>
        ) : (
          <WatchError message="Source introuvable." onRetry={handleRetry} />
        )}
      </main>
    </div>
  );
}
