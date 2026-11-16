import { useEffect, useState } from "react";
import { Fox, DayumiLockup, DayumiEmblem } from "@/components/brand/DayumiMark";
import { useNavigate } from "react-router-dom";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { getRow } from "@/api/anilist";
import TermsDialog from "@/components/legal/TermsDialog";
import { translateAuthError } from "@/lib/authErrors";
import { platform } from "@/platform";
import { isMovie } from "@/config/appVariant";
import HubSignInCard from "@/components/auth/HubSignInCard";

/** Contenu dupliqué et translaté de -50 % pour boucler. */
function MarqueeRow({ covers, reverse, duration }) {
  const doubled = [...covers, ...covers];
  return (
    <div
      className="flex w-max animate-marquee-x"
      style={{ animationDuration: duration, animationDirection: reverse ? "reverse" : "normal" }}
    >
      {doubled.map((src, i) => (
        <div
          key={i}
          className="mr-5 aspect-[2/3] h-[38vh] shrink-0 overflow-hidden rounded-xl shadow-card ring-1 ring-white/10"
        >
          <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  );
}

export default function LoginPage() {
  const session = useAuthStore((s) => s.session);
  const signInWithDiscord = useAuthStore((s) => s.signInWithDiscord);
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const navigate = useNavigate();
  const [covers, setCovers] = useState([]);
  const [termsOpen, setTermsOpen] = useState(false);

  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isHubTheme = Boolean(platform.isElectron);

  useEffect(() => {
    // Un invité peut revenir créer un vrai compte : seule une session non anonyme redirige.
    if (session && !session.user?.is_anonymous) navigate("/", { replace: true });
  }, [session, navigate]);

  if (platform.isElectron && !isMovie) {
    return (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-bg">
        {covers.length > 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-5 opacity-55 blur-[1px]">
            <MarqueeRow covers={row1} duration="65s" />
            <MarqueeRow covers={row2} reverse duration="80s" />
          </div>
        )}
        <div className="absolute inset-0 bg-bg/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-bg/80" />
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(55% 55% at 50% 50%, rgb(var(--primary) / 0.18), transparent 70%)",
          }}
        />
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-y-auto px-6 py-8">
          <div className="w-full max-w-sm animate-slide-up">
            <HubSignInCard onOpenTerms={() => setTermsOpen(true)} />
          </div>
        </div>
        <TermsDialog open={termsOpen} onOpenChange={setTermsOpen} />
      </div>
    );
  }

  const submitEmail = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");
    if (!email.trim() || password.length < 6) {
      setError("Renseigne un email et un mot de passe d'au moins 6 caractères.");
      return;
    }
    setBusy("email");
    try {
      const res =
        mode === "signup"
          ? await signUpWithEmail(email, password)
          : await signInWithEmail(email, password);
      if (res?.error) {
        setError(translateAuthError(res.error));
      } else if (res?.needsConfirm) {
        setNotice("Compte créé ! Vérifie ta boîte mail pour confirmer, puis connecte-toi.");
        setMode("signin");
      }
    } finally {
      setBusy(null);
    }
  };

  const onGuest = async () => {
    if (busy) return;
    setError("");
    setBusy("guest");
    try {
      const res = await continueAsGuest();
      if (res?.error) {
        setError("Le mode visiteur est momentanément indisponible.");
        return;
      }
      navigate("/", { replace: true });
    } finally {
      setBusy(null);
    }
  };

  const onDiscord = async () => {
    if (busy) return;
    setError("");
    setBusy("discord");
    try {
      const result = await signInWithDiscord();
      if (result?.error) setError(result.error);
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    getRow({ sort: ["POPULARITY_DESC"], perPage: 24 })
      .then((list) => setCovers(list.map((a) => a.cover).filter(Boolean)))
      .catch(() => {});
  }, []);

  const row1 = covers.slice(0, 12);
  const row2 = covers.slice(12, 24).reverse();

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-bg">
      {covers.length > 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-5 opacity-55 blur-[1px]">
          <MarqueeRow covers={row1} duration="65s" />
          <MarqueeRow covers={row2} reverse duration="80s" />
        </div>
      )}

      {/* Lisibilité de la carte. */}
      <div className="absolute inset-0 bg-bg/75" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-bg/80" />
      <div
        className="absolute inset-0"
        style={{
          background: isMovie
            ? "radial-gradient(55% 55% at 50% 50%, rgba(124, 92, 255, 0.25), transparent 70%)"
            : isHubTheme
            ? "radial-gradient(55% 55% at 50% 50%, rgba(168, 85, 247, 0.22), transparent 70%)"
            : "radial-gradient(55% 55% at 50% 50%, rgb(var(--primary) / 0.18), transparent 70%)",
        }}
      />

      {isMovie ? (
        <DayumiEmblem
          variant="movie"
          className="pointer-events-none absolute -bottom-24 -left-16 h-[34rem] w-[34rem] -rotate-6 select-none opacity-20"
        />
      ) : isHubTheme ? (
        <DayumiEmblem
          variant="hub"
          className="pointer-events-none absolute -bottom-24 -left-16 h-[34rem] w-[34rem] -rotate-6 select-none opacity-20"
        />
      ) : (
        <Fox className="pointer-events-none absolute -bottom-24 -left-16 h-[34rem] w-[34rem] -rotate-6 select-none text-white/[0.035]" />
      )}

      {/* Défilable : le clavier mobile ne coupe pas la carte. */}
      <div className="absolute inset-0 z-10 flex items-center justify-center overflow-y-auto px-6 py-8">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="rounded-lg bg-surface/70 p-7 shadow-card ring-1 ring-white/10 backdrop-blur-2xl">
            <div className="mb-6 text-center">
              <DayumiLockup
                word={isMovie ? "Movie" : isHubTheme ? "Hub" : "Anime"}
                variant={isMovie ? "movie" : isHubTheme ? "hub" : "anime"}
                className="mb-5"
              />
              <p className="text-sm leading-relaxed text-muted">
                {isMovie
                  ? mode === "signup"
                    ? "Crée ton compte pour sauvegarder tes films et séries favoris."
                    : "Connecte-toi pour retrouver ta liste et ton historique de visionnage."
                  : isHubTheme
                  ? mode === "signup"
                    ? "Crée ton compte Dayumi pour synchroniser toutes tes applications."
                    : "Connecte-toi pour retrouver ta progression et synchroniser tes applications."
                  : mode === "signup"
                    ? "Crée ton compte pour suivre ta progression et bâtir ta collection."
                    : "Connecte-toi pour retrouver ta progression et ta collection."}
              </p>
            </div>

            <form onSubmit={submitEmail} className="space-y-3">
              <label
                className={`flex items-center gap-2.5 rounded-md bg-surface-2/70 px-3.5 ring-1 ring-border transition-colors ${
                  isMovie ? "focus-within:ring-[#7C5CFF]/60" : isHubTheme ? "focus-within:ring-purple-500/60" : "focus-within:ring-primary/60"
                }`}
              >
                <Mail size={16} className="shrink-0 text-muted" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Adresse email"
                  className="w-full bg-transparent py-3 text-sm text-text outline-none placeholder:text-muted"
                />
              </label>

              <label
                className={`flex items-center gap-2.5 rounded-md bg-surface-2/70 px-3.5 ring-1 ring-border transition-colors ${
                  isMovie ? "focus-within:ring-[#7C5CFF]/60" : isHubTheme ? "focus-within:ring-purple-500/60" : "focus-within:ring-primary/60"
                }`}
              >
                <Lock size={16} className="shrink-0 text-muted" />
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mot de passe"
                  className="w-full bg-transparent py-3 text-sm text-text outline-none placeholder:text-muted"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="shrink-0 text-muted transition-colors hover:text-text"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </label>

              {error && (
                <p className={`text-xs leading-relaxed ${isHubTheme ? "text-rose-400" : "text-primary"}`}>
                  {error}
                </p>
              )}
              {notice && (
                <p className={`text-xs leading-relaxed ${isHubTheme ? "text-purple-300" : "text-accent"}`}>
                  {notice}
                </p>
              )}

              <button
                type="submit"
                disabled={!!busy}
                className={`flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90 disabled:opacity-60 ${
                  isMovie
                    ? "bg-[#7C5CFF] shadow-[0_0_20px_rgba(124,92,255,0.35)] hover:bg-[#6A4BE8]"
                    : isHubTheme
                    ? "bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(168,85,247,0.35)]"
                    : "bg-primary"
                }`}
              >
                {busy === "email" && <Loader2 size={16} className="animate-spin" />}
                {mode === "signup" ? "Créer mon compte" : "Se connecter"}
              </button>
            </form>

            <p className="mt-3 text-center text-xs text-muted">
              {mode === "signup" ? "Déjà un compte ? " : "Pas encore de compte ? "}
              <button
                type="button"
                onClick={() => {
                  setMode((m) => (m === "signup" ? "signin" : "signup"));
                  setError("");
                  setNotice("");
                }}
                className={`font-semibold text-text underline decoration-dotted underline-offset-2 transition-colors ${
                  isMovie ? "hover:text-[#7C5CFF]" : isHubTheme ? "hover:text-purple-400" : "hover:text-primary"
                }`}
              >
                {mode === "signup" ? "Se connecter" : "Créer un compte"}
              </button>
            </p>

            <button
              onClick={onGuest}
              disabled={!!busy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-surface-2/70 px-4 py-2.5 text-sm font-medium text-muted ring-1 ring-border transition-colors hover:text-text disabled:opacity-60"
            >
              {busy === "guest" && <Loader2 size={15} className="animate-spin" />}
              Continuer en visiteur
            </button>

            <p className="mt-5 text-center text-xs leading-relaxed text-muted/70">
              En continuant, tu acceptes nos{" "}
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className={`font-medium text-muted underline decoration-dotted underline-offset-2 transition-colors ${
                  isHubTheme ? "hover:text-purple-400" : "hover:text-primary"
                }`}
              >
                conditions d'utilisation
              </button>
              .
            </p>
          </div>
        </div>
      </div>

      <TermsDialog open={termsOpen} onOpenChange={setTermsOpen} />
    </div>
  );
}
