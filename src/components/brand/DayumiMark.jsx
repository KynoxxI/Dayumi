import React from "react";
import { asset } from "@/lib/asset";

/**
 * Emblème Dayumi : lettre D cristalline (orange pour Anime, violette pour Hub) avec facettes géométriques
 * et pétales de sakura subtils. Supporte les enfants éventuels (effets Halloween).
 */
export function DayumiEmblem({ className = "h-12 w-12", alt = "Dayumi", variant = "anime", children, ...rest }) {
  const isHub = variant === "hub";
  const imgSrc = isHub ? asset("dayumi-hub.png") : asset("dayumi-anime.png");
  const shadowClass = isHub
    ? "drop-shadow-[0_0_20px_rgba(168,85,247,0.7)]"
    : "drop-shadow-[0_0_16px_rgba(255,120,0,0.5)]";

  return (
    <span
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      {...rest}
    >
      <img
        src={imgSrc}
        alt={alt}
        className={`h-full w-full object-contain pointer-events-none ${shadowClass}`}
      />
      {children && (
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 h-full w-full pointer-events-none"
          fill="none"
        >
          {children}
        </svg>
      )}
    </span>
  );
}

// Alias pour compatibilité descendante
export const Fox = DayumiEmblem;
export const HalloweenFox = DayumiEmblem;

/** Emblème + « DAYUMI » + sous-titre. Supporte les déclinaisons Anime et Hub. */
export function DayumiLockup({ word = "Anime", variant = "anime", className = "" }) {
  const isHub = variant === "hub" || String(word).toLowerCase() === "hub";
  const displayWord = isHub ? "Hub" : word;
  const subtitleColor = isHub ? "text-purple-400" : "text-[#ff7700]";
  const emblemVariant = isHub ? "hub" : "anime";

  return (
    <div className={`flex items-center justify-center gap-4 ${className}`} role="img" aria-label={`Dayumi ${displayWord}`}>
      <DayumiEmblem variant={emblemVariant} className="h-16 w-16 shrink-0" />
      <div className="text-left">
        <p className={`text-sm font-bold uppercase tracking-[0.42em] ${subtitleColor}`}>Dayumi</p>
        <p className="t-impact mt-1 text-5xl text-text">{displayWord}</p>
      </div>
    </div>
  );
}

export const NartyaLockup = DayumiLockup;
