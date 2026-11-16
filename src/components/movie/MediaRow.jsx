import { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MovieCard from "./MovieCard";
import SerieCard from "./SerieCard";
import { platform } from "@/platform";

export default function MediaRow({ title, items = [], numbered = false }) {
  const [emblaRef, embla] = useEmblaCarousel({
    active: !platform.isMobile,
    dragFree: true,
    containScroll: "trimSnaps",
    align: "start",
  });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const uniqueItems = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const item of items || []) {
      const key = item.tmdbId || item.id;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }, [items]);

  const onSelect = useCallback(() => {
    if (!embla) return;
    setCanPrev(embla.canScrollPrev());
    setCanNext(embla.canScrollNext());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    onSelect();
    embla.on("select", onSelect);
    embla.on("reInit", onSelect);
    return () => {
      embla.off("select", onSelect);
      embla.off("reInit", onSelect);
    };
  }, [embla, onSelect]);

  if (!uniqueItems.length) return null;

  return (
    <section className="carousel-section relative">
      <div className="mb-4 flex items-center justify-between px-4 md:px-8">
        <h2 className="text-xl md:text-2xl font-black font-['Outfit'] tracking-tight text-text">
          {title}
        </h2>

        {!platform.isMobile && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => embla?.scrollPrev()}
              disabled={!canPrev}
              aria-label="Défiler vers la gauche"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-text border border-white/10 transition-all hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => embla?.scrollNext()}
              disabled={!canNext}
              aria-label="Défiler vers la droite"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-text border border-white/10 transition-all hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <div
        ref={emblaRef}
        className={platform.isMobile ? "overflow-x-auto scrollbar-none px-4" : "overflow-hidden px-4 md:px-8"}
      >
        <div className="flex gap-3 md:gap-4 pb-2">
          {uniqueItems.map((item, index) => {
            const isSerie = item.mediaType === "serie" || item.mediaType === "tv";
            return (
              <div
                key={item.tmdbId || item.id}
                className="w-[140px] shrink-0 sm:w-[160px] md:w-[180px] lg:w-[200px]"
              >
                {isSerie ? (
                  <SerieCard serie={item} index={numbered ? index : undefined} />
                ) : (
                  <MovieCard movie={item} index={numbered ? index : undefined} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
