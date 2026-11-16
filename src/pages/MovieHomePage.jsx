import { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { getTrending, getDiscoverMovie, getDiscoverSerie } from "@/api/movieApi";
import MovieHeroBanner from "@/components/movie/MovieHeroBanner";
import MediaRow from "@/components/movie/MediaRow";
import MovieCard from "@/components/movie/MovieCard";
import SerieCard from "@/components/movie/SerieCard";
import { Loader2, Sparkles } from "lucide-react";

const POPULAR_GENRES = [
  { id: 28, name: "Action" },
  { id: 12, name: "Aventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comédie" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentaire" },
  { id: 18, name: "Drame" },
  { id: 10751, name: "Familial" },
  { id: 14, name: "Fantastique" },
  { id: 36, name: "Histoire" },
  { id: 27, name: "Horreur" },
  { id: 10402, name: "Musique" },
  { id: 9648, name: "Mystère" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Science-Fiction" },
  { id: 53, name: "Thriller" },
];

export default function MovieHomePage() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [genreResults, setGenreResults] = useState([]);
  const [loadingGenre, setLoadingGenre] = useState(false);

  const [trending, setTrending] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [popularSeries, setPopularSeries] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [actionMovies, setActionMovies] = useState([]);

  const isFilmsTab = location.pathname.startsWith("/films");
  const isSeriesTab = location.pathname.startsWith("/series");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        const [tr, pm, ps, trm, act] = await Promise.all([
          getTrending("all", "week").catch(() => []),
          getDiscoverMovie({ sort: "popularity.desc" }).catch(() => ({ items: [] })),
          getDiscoverSerie({ sort: "popularity.desc" }).catch(() => ({ items: [] })),
          getDiscoverMovie({ sort: "vote_average.desc" }).catch(() => ({ items: [] })),
          getDiscoverMovie({ genre: 28, sort: "popularity.desc" }).catch(() => ({ items: [] })),
        ]);

        if (cancelled) return;
        setTrending(Array.isArray(tr) ? tr : tr?.items || []);
        setPopularMovies(pm?.items || (Array.isArray(pm) ? pm : []));
        setPopularSeries(ps?.items || (Array.isArray(ps) ? ps : []));
        setTopRated(trm?.items || (Array.isArray(trm) ? trm : []));
        setActionMovies(act?.items || (Array.isArray(act) ? act : []));
      } catch (err) {
        console.error("[MovieHomePage] Erreur chargement accueil:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Chargement spécifique si un genre est sélectionné
  useEffect(() => {
    if (!selectedGenre) {
      setGenreResults([]);
      return;
    }
    let cancelled = false;
    setLoadingGenre(true);

    const fetcher = isSeriesTab
      ? getDiscoverSerie({ genre: selectedGenre, sort: "popularity.desc" })
      : getDiscoverMovie({ genre: selectedGenre, sort: "popularity.desc" });

    fetcher
      .then((data) => {
        if (cancelled) return;
        setGenreResults(data?.items || (Array.isArray(data) ? data : []));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[MovieHomePage] Erreur filtrage genre:", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingGenre(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedGenre, isSeriesTab]);

  const heroItem = useMemo(() => {
    if (isFilmsTab) return popularMovies[0] || trending[0];
    if (isSeriesTab) return popularSeries[0] || trending[0];
    return trending[0] || popularMovies[0];
  }, [isFilmsTab, isSeriesTab, trending, popularMovies, popularSeries]);

  if (loading && !heroItem) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="text-sm font-medium">Chargement du catalogue Cinéma & Séries…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Banner en vedette */}
      {heroItem && <MovieHeroBanner media={heroItem} />}

      {/* Barre de sélection des genres */}
      <div className="px-4 md:px-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedGenre(null)}
            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              selectedGenre === null
                ? "bg-primary text-white shadow-[0_0_20px_rgba(124,92,255,0.4)] border border-primary/50"
                : "bg-surface-2 text-muted hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
            }`}
          >
            Tous les genres
          </button>
          {POPULAR_GENRES.map((g) => {
            const isSelected = selectedGenre === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGenre(isSelected ? null : g.id)}
                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-primary text-white shadow-[0_0_20px_rgba(124,92,255,0.4)] border border-primary/50"
                    : "bg-surface-2 text-muted hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
                }`}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Affichage des résultats par genre si sélectionné */}
      {selectedGenre ? (
        <div className="px-4 md:px-8 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            <h2 className="text-xl md:text-2xl font-bold font-['Outfit'] text-white">
              Sélection {POPULAR_GENRES.find((g) => g.id === selectedGenre)?.name || "Genre"}
            </h2>
          </div>

          {loadingGenre ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : genreResults.length === 0 ? (
            <p className="py-8 text-sm text-muted">Aucun titre trouvé pour ce genre.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {genreResults.map((item) => {
                const isSerie = item.mediaType === "serie" || item.mediaType === "tv";
                return isSerie ? (
                  <SerieCard key={`serie-${item.tmdbId || item.id}`} serie={item} />
                ) : (
                  <MovieCard key={`movie-${item.tmdbId || item.id}`} movie={item} />
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Rangées de contenus standards */
        <div className="space-y-10">
          {/* Si sur l'onglet Films */}
          {isFilmsTab && (
            <>
              <MediaRow title="Films populaires" items={popularMovies} />
              <MediaRow title="Films d'action & aventure" items={actionMovies} />
              <MediaRow title="Films les mieux notés" items={topRated} />
            </>
          )}

          {/* Si sur l'onglet Séries */}
          {isSeriesTab && (
            <>
              <MediaRow title="Séries à ne pas manquer" items={popularSeries} />
              <MediaRow title="Tendances Séries" items={trending.filter((t) => t.mediaType === "serie")} />
            </>
          )}

          {/* Si sur l'Accueil */}
          {!isFilmsTab && !isSeriesTab && (
            <>
              <MediaRow title="Tendances de la semaine" items={trending} numbered />
              <MediaRow title="Films populaires" items={popularMovies} />
              <MediaRow title="Séries TV incontournables" items={popularSeries} />
              <MediaRow title="Films d'action" items={actionMovies} />
              <MediaRow title="Chefs-d'œuvre recommandés" items={topRated} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
