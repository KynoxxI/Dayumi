import { useEffect, useState, useTransition } from "react";
import { searchMulti } from "@/api/movieApi";
import MovieCard from "@/components/movie/MovieCard";
import SerieCard from "@/components/movie/SerieCard";
import { Search, Loader2, Film, Tv, Sparkles, X } from "lucide-react";

export default function MovieSearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // "all" | "movie" | "tv"
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  // Debounce de recherche 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    if (!debouncedQuery) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    searchMulti(debouncedQuery)
      .then((data) => {
        if (cancelled) return;
        startTransition(() => {
          setResults(data?.items || (Array.isArray(data) ? data : []));
          setLoading(false);
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[MovieSearchPage] Erreur recherche:", err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const filteredResults = results.filter((item) => {
    if (activeTab === "movie") return item.mediaType === "movie";
    if (activeTab === "tv") return item.mediaType === "serie" || item.mediaType === "tv";
    return true;
  });

  return (
    <div className="min-h-full px-4 md:px-10 py-8 max-w-7xl mx-auto space-y-8">
      {/* Barre de recherche */}
      <div className="relative max-w-2xl mx-auto">
        <div className="relative flex items-center">
          <Search
            size={20}
            className="absolute left-4 text-muted pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un film, une série…"
            autoFocus
            className="w-full rounded-2xl bg-surface-2 border border-white/10 pl-12 pr-12 py-4 text-base font-medium text-text placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-xl transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 text-muted hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Onglets de filtrage */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "all"
                ? "bg-primary text-white shadow-md border border-primary/50"
                : "bg-surface-2 text-muted hover:text-white border border-white/5"
            }`}
          >
            <Sparkles size={14} />
            <span>Tous</span>
          </button>

          <button
            onClick={() => setActiveTab("movie")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "movie"
                ? "bg-primary text-white shadow-md border border-primary/50"
                : "bg-surface-2 text-muted hover:text-white border border-white/5"
            }`}
          >
            <Film size={14} />
            <span>Films</span>
          </button>

          <button
            onClick={() => setActiveTab("tv")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "tv"
                ? "bg-primary text-white shadow-md border border-primary/50"
                : "bg-surface-2 text-muted hover:text-white border border-white/5"
            }`}
          >
            <Tv size={14} />
            <span>Séries</span>
          </button>
        </div>
      </div>

      {/* État de chargement */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      )}

      {/* Résultats de recherche */}
      {!loading && debouncedQuery && (
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            {filteredResults.length} résultat{filteredResults.length > 1 ? "s" : ""} pour « {debouncedQuery} »
          </p>

          {filteredResults.length === 0 ? (
            <div className="py-16 text-center text-muted">
              Aucun film ou série trouvé correspondant à votre recherche.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredResults.map((item) => {
                const isSerie = item.mediaType === "serie" || item.mediaType === "tv";
                return isSerie ? (
                  <SerieCard key={item.tmdbId || item.id} serie={item} />
                ) : (
                  <MovieCard key={item.tmdbId || item.id} movie={item} />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* État initial sans recherche */}
      {!loading && !debouncedQuery && (
        <div className="py-24 text-center text-muted/60 flex flex-col items-center justify-center gap-3">
          <Search size={36} className="text-muted/40" />
          <p className="text-sm">Saisissez un titre pour explorer des milliers de films et séries.</p>
        </div>
      )}
    </div>
  );
}
