import { memo, useState, useRef, useEffect } from "react";
import { Server, ChevronDown, Star, Check } from "lucide-react";

/**
 * Sélecteur de source vidéo pour Dayumi Movie (films & séries).
 * Supporte le mode sélecteur compact et le panneau déroulant avec étoile recommandée.
 */
function SourcePicker({
  sources = [],
  selectedSourceId = "auto",
  usedSource = null,
  onSelectSource,
  disabled = false,
  className = "",
  isOpen = false,
  onToggle,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const containerRef = useRef(null);

  const open = onToggle ? isOpen : internalOpen;
  const toggle = () => {
    if (disabled) return;
    if (onToggle) onToggle();
    else setInternalOpen((o) => !o);
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (onToggle) {
          if (isOpen) onToggle(false);
        } else {
          setInternalOpen(false);
        }
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, isOpen, onToggle]);

  if (!sources || sources.length === 0) return null;

  const currentLabel =
    selectedSourceId === "auto"
      ? `Auto ${usedSource ? `(${usedSource.label || usedSource.id})` : ""}`
      : sources.find((s) => s.id === selectedSourceId)?.label || selectedSourceId;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-expanded={open}
        aria-label="Changer de source"
        className="flex items-center gap-2 rounded-xl bg-black/75 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md border border-white/10 shadow-lg transition-all hover:bg-white/10 hover:border-white/20 active:scale-95 disabled:opacity-50"
      >
        <Server size={14} className="text-primary" />
        <span className="text-muted/80 text-[0.7rem] uppercase tracking-wider hidden sm:inline">Source :</span>
        <span className="font-bold text-white max-w-[120px] truncate">{currentLabel}</span>
        <ChevronDown size={13} className={`text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl bg-[#13111c]/95 p-1.5 text-white shadow-2xl backdrop-blur-xl border border-white/10 animate-fade-in">
          <div className="px-3 py-2 text-[0.68rem] font-bold uppercase tracking-wider text-muted border-b border-white/5">
            Fournisseurs de flux
          </div>

          <div className="mt-1 space-y-0.5 max-h-60 overflow-y-auto scrollbar-none">
            {/* Option Auto */}
            <button
              type="button"
              onClick={() => {
                onSelectSource?.("auto");
                if (onToggle) onToggle(false);
                else setInternalOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                selectedSourceId === "auto"
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold">Automatique</span>
                <span className="text-[0.65rem] text-muted">Repli intelligent</span>
              </div>
              {selectedSourceId === "auto" && <Check size={14} className="text-primary" />}
            </button>

            {/* Liste des sources */}
            {sources.map((src) => {
              const isSelected = selectedSourceId === src.id;
              const isRecommended = src.rank != null && src.rank <= 10;

              return (
                <button
                  key={src.id}
                  type="button"
                  onClick={() => {
                    onSelectSource?.(src.id);
                    if (onToggle) onToggle(false);
                    else setInternalOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{src.label}</span>
                    {isRecommended && (
                      <span className="flex items-center gap-0.5 rounded bg-yellow-400/20 px-1 py-0.2 text-[0.62rem] font-bold text-yellow-300">
                        <Star size={10} className="fill-yellow-300" />
                        Top
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {src.langs?.length > 0 && (
                      <span className="text-[0.65rem] text-muted uppercase">
                        {src.langs.join("/")}
                      </span>
                    )}
                    {isSelected && <Check size={14} className="text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(SourcePicker);
