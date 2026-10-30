import React from "react";

/**
 * Emblème Dayumi : lettre D cristalline en origami cyberpunk avec facettes géométriques
 * et pétales de sakura subtils.
 */
export function DayumiEmblem({ className = "h-12 w-12", ...rest }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...rest}>
      <defs>
        <linearGradient id="dayumi-primary-grad" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="50%" stopColor="#e056fd" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
        <linearGradient id="dayumi-glow-grad" x1="40" y1="25" x2="175" y2="175" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f472b6" stopOpacity="0.9" />
        </linearGradient>
        <filter id="dayumi-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="glow" />
          <feComposite in="SourceGraphic" in2="glow" operator="over" />
        </filter>
      </defs>

      {/* Lueur externe */}
      <path
        d="M 45,25 L 125,25 L 175,75 L 175,125 L 125,175 L 45,175 Z"
        stroke="url(#dayumi-primary-grad)"
        strokeWidth="6"
        strokeLinejoin="round"
        fill="none"
        filter="url(#dayumi-glow)"
        opacity="0.45"
      />

      {/* Facettes d'origami */}
      {/* 1. Colonne gauche haut */}
      <polygon points="45,25 85,65 45,100" fill="url(#dayumi-primary-grad)" fillOpacity="0.85" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.4" />
      {/* 2. Colonne gauche bas */}
      <polygon points="45,100 85,135 45,175" fill="url(#dayumi-primary-grad)" fillOpacity="0.75" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.4" />
      {/* 3. Colonne gauche centre */}
      <polygon points="45,100 85,65 85,135" fill="url(#dayumi-primary-grad)" fillOpacity="0.95" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.5" />
      {/* 4. Barre supérieure */}
      <polygon points="45,25 125,25 115,65 85,65" fill="url(#dayumi-primary-grad)" fillOpacity="0.9" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.5" />
      {/* 5. Coin supérieur droit */}
      <polygon points="125,25 175,75 135,88 115,65" fill="url(#dayumi-primary-grad)" fillOpacity="0.8" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.4" />
      {/* 6. Tranchant droit vertical */}
      <polygon points="175,75 175,125 135,112 135,88" fill="url(#dayumi-primary-grad)" fillOpacity="0.98" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.6" />
      {/* 7. Coin inférieur droit */}
      <polygon points="175,125 125,175 115,135 135,112" fill="url(#dayumi-primary-grad)" fillOpacity="0.75" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.4" />
      {/* 8. Barre inférieure */}
      <polygon points="125,175 45,175 85,135 115,135" fill="url(#dayumi-primary-grad)" fillOpacity="0.85" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.5" />

      {/* Contours géométriques cristallins */}
      <path
        d="M 45,25 L 125,25 L 175,75 L 175,125 L 125,175 L 45,175 Z"
        stroke="url(#dayumi-primary-grad)"
        strokeWidth="3.5"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M 85,65 L 115,65 L 135,88 L 135,112 L 115,135 L 85,135 Z"
        stroke="#ffffff"
        strokeWidth="2"
        strokeOpacity="0.6"
        strokeLinejoin="round"
        fill="#0e0c12"
        fillOpacity="0.6"
      />

      {/* Pétale de sakura stylisé gravé au centre */}
      <g transform="translate(100, 100) scale(0.7)" opacity="0.85">
        <circle cx="0" cy="0" r="3" fill="#ffffff" />
        <path d="M0,0 Q-4,-12 0,-18 Q4,-12 0,0" fill="#f472b6" />
        <path d="M0,0 Q-12,-4 -18,0 Q-12,4 0,0" fill="#c084fc" />
        <path d="M0,0 Q-4,12 0,18 Q4,12 0,0" fill="#f472b6" />
        <path d="M0,0 Q12,-4 18,0 Q12,4 0,0" fill="#c084fc" />
      </g>
    </svg>
  );
}

// Alias pour compatibilité descendante
export const Fox = DayumiEmblem;
export const HalloweenFox = DayumiEmblem;

/** Emblème + « DAYUMI » + sous-titre incliné. */
export function DayumiLockup({ word = "Anime", className = "" }) {
  return (
    <div className={`flex items-center justify-center gap-4 ${className}`} role="img" aria-label={`Dayumi ${word}`}>
      <DayumiEmblem className="h-16 w-16 shrink-0 drop-shadow-[0_0_16px_rgba(224,86,253,0.35)]" />
      <div className="text-left">
        <p className="text-sm font-bold uppercase tracking-[0.42em] text-primary">Dayumi</p>
        <p className="t-impact mt-1 text-5xl text-text">{word}</p>
      </div>
    </div>
  );
}

export const NartyaLockup = DayumiLockup;
