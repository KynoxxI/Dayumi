import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMoviePage, getSimilar } from "@/api/movieApi";
import { Play, Heart, Star, Clock, Calendar, ArrowLeft, Loader2, Users } from "lucide-react";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import MediaRow from "@/components/movie/MediaRow";
import { toast } from "@/lib/toast";

export default function MoviePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cleanId = String(id || "").replace(/^tmdb-/, "");
  const slug = `tmdb-${cleanId}`;

  const [movie, setMovie] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);

  const isFav = useFavoritesStore((s) => s.slugs?.has(slug) || s.slugs?.has(cleanId));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getMoviePage(cleanId),
      getSimilar("movie", cleanId).catch(() => []),
    ])
      .then(([movieData, similarData]) => {
        if (cancelled) return;
        setMovie(movieData);
        setSimilar(similarData || []);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[MoviePage] Erreur chargement film:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cleanId]);

  if (loading && !movie) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-bold text-muted">Film introuvable</p>
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl bg-surface-2 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
        >
          Retour
        </button>
      </div>
    );
  }

  const handleFavoriteClick = async () => {
    if (toggleFavorite) {
      toggleFavorite({
        slug,
        title: movie.title,
        cover: movie.image || movie.cover,
        mediaType: "movie",
      });
      toast.success(isFav ? "Retiré des favoris" : "Ajouté aux favoris");
    }
  };

  const formatRuntime = (mins) => {
    if (!mins) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="min-h-full pb-16">
      {/* Bannière de fond */}
      <div className="relative h-[48vh] min-h-[380px] w-full overflow-hidden">
        {movie.banner && (
          <img
            src={movie.banner}
            alt={movie.title}
            className="h-full w-full object-cover object-top opacity-50 blur-[2px]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-transparent to-bg/50" />

        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 transition-transform hover:scale-105 active:scale-95"
          aria-label="Retour"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Contenu de la fiche */}
      <div className="relative z-10 -mt-44 px-4 md:px-12 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Affiche */}
          <div className="w-48 sm:w-56 md:w-64 shrink-0 mx-auto md:mx-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-surface-2">
            <img
              src={movie.image || movie.cover}
              alt={movie.title}
              className="w-full aspect-[2/3] object-cover"
            />
          </div>

          {/* Métadonnées & Synopsis */}
          <div className="flex-1 space-y-4 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/20 border border-primary/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                Film
              </span>
              {movie.year && (
                <span className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-xs text-muted border border-white/5">
                  <Calendar size={12} />
                  {movie.year}
                </span>
              )}
              {movie.runtime && (
                <span className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-xs text-muted border border-white/5">
                  <Clock size={12} />
                  {formatRuntime(movie.runtime)}
                </span>
              )}
              {movie.score > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-xs font-bold text-yellow-400 border border-white/5">
                  <Star size={12} className="fill-yellow-400 text-yellow-400" />
                  {Number(movie.score).toFixed(1)}
                </span>
              )}
            </div>

            <h1 className="font-['Outfit'] text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
              {movie.title}
            </h1>

            {movie.tagline && (
              <p className="text-sm font-medium italic text-muted/80">
                « {movie.tagline} »
              </p>
            )}

            {/* Genres */}
            {movie.genres?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {movie.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-medium text-text border border-white/5"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => navigate(`/watch/movie/${cleanId}`)}
                className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-primary to-purple-600 px-7 py-3.5 text-sm font-bold text-white shadow-[0_0_25px_rgba(124,92,255,0.4)] transition-all hover:scale-105 active:scale-95"
              >
                <Play size={18} className="fill-current" />
                <span>Regarder le film</span>
              </button>

              <button
                type="button"
                onClick={handleFavoriteClick}
                aria-label="Ajouter ou retirer des favoris"
                className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${
                  isFav
                    ? "border-pink-500/50 bg-pink-500/20 text-pink-500"
                    : "border-white/10 bg-surface-2 text-white hover:bg-white/10"
                }`}
              >
                <Heart size={20} className={isFav ? "fill-current" : ""} />
              </button>
            </div>

            {/* Synopsis */}
            {movie.description && (
              <div className="pt-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted">
                  Synopsis
                </h3>
                <p className="mt-2 text-sm sm:text-base leading-relaxed text-text/90">
                  {movie.description}
                </p>
              </div>
            )}

            {/* Casting */}
            {movie.cast?.length > 0 && (
              <div className="pt-4">
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted">
                  <Users size={15} />
                  <span>Casting principal</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {movie.cast.slice(0, 8).map((actor) => (
                    <span
                      key={actor.id || actor.name}
                      className="rounded-xl bg-surface-2 px-3 py-1.5 text-xs text-text border border-white/5"
                    >
                      <strong className="text-white">{actor.name}</strong>
                      {actor.character ? (
                        <span className="text-muted/70"> ({actor.character})</span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Films similaires */}
        {similar?.length > 0 && (
          <div className="mt-16">
            <MediaRow title="Dans le même genre" items={similar} />
          </div>
        )}
      </div>
    </div>
  );
}
