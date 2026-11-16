import React, { lazy, Suspense, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { Slide, ToastContainer } from "react-toastify";
import { useAchievementUnlockStore } from "./stores/useAchievementUnlockStore.js";
import "react-toastify/dist/ReactToastify.css";
import App from "./App.jsx";
import { platform } from "./platform/index.js";
import { installGlobalErrorLogging } from "./api/clientLogs.js";
import { useSettingsStore } from "./stores/useSettingsStore.js";
import NartyaIntro from "./components/NartyaIntro.jsx";
import HalloweenIntro from "./components/HalloweenIntro.jsx";
import { isHalloween } from "./lib/season.js";
import "./index.css";

const AchievementUnlock = lazy(() => import("./components/achievements/AchievementUnlock.jsx"));

if (platform.isMobile) document.documentElement.classList.add("mobile-runtime");

// Avant le rendu, pour ne pas manquer une exception au montage.
installGlobalErrorLogging();

/** La fenêtre est créée cachée : on attend qu'elle soit visible pour jouer l'ident. */
function AppIntro() {
  const [state, setState] = useState(() =>
    !useSettingsStore.getState().nartyaIntro
      ? "done"
      : document.visibilityState === "visible"
        ? "playing"
        : "waiting"
  );

  useEffect(() => {
    if (state !== "waiting") return undefined;
    const onVisible = () => {
      if (document.visibilityState === "visible") setState("playing");
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [state]);

  if (state !== "playing") return null;
  const Intro = isHalloween() ? HalloweenIntro : NartyaIntro;
  return <Intro onDone={() => setState("done")} />;
}

function AchievementUnlockHost() {
  const hasPending = useAchievementUnlockStore((state) => state.queue.length > 0);
  if (!hasPending) return null;
  return (
    <Suspense fallback={null}>
      <AchievementUnlock />
    </Suspense>
  );
}

/**
 * L'app n'enregistre aucun service worker, mais un reliquat peut intercepter les segments
 * vidéo et en servir une copie partielle.
 */
if (typeof navigator !== "undefined" && navigator.serviceWorker) {
  navigator.serviceWorker
    .getRegistrations()
    .then(async (regs) => {
      if (!regs.length) return;
      console.warn(`[sw] ${regs.length} service worker(s) résiduel(s) — désinscription`);
      await Promise.all(regs.map((r) => r.unregister()));
      if (typeof caches !== "undefined") {
        const noms = await caches.keys();
        await Promise.all(noms.map((n) => caches.delete(n)));
      }
    })
    .catch(() => {});
}

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("[CRITICAL RENDER ERROR]", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: "#fff", background: "#0e0c12", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <h2 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 12 }}>Une erreur est survenue lors de l'affichage</h2>
          <pre style={{ maxWidth: 600, padding: 16, background: "rgba(255,255,255,0.06)", borderRadius: 12, fontSize: 13, color: "#f87171", overflowX: "auto" }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 24, padding: "10px 24px", background: "#f97316", color: "#fff", border: "none", borderRadius: 9999, fontWeight: "bold", cursor: "pointer" }}
          >
            Recharger l'application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// En mode web, si un ancien lien #/party/... est ouvert, convertir vers l'URL directe
const isFileProtocol = typeof window !== "undefined" && window.location.protocol === "file:";
const isElectronEnv = Boolean(platform.isElectron || platform.name === "electron" || isFileProtocol);

if (!isElectronEnv && typeof window !== "undefined" && window.location.hash.startsWith("#/")) {
  const hashPath = window.location.hash.slice(1);
  window.history.replaceState(null, "", hashPath);
}

const RouterComponent = isElectronEnv ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <RouterComponent>
        <App />
        {/* La cérémonie de succès couvre toute l'app, lecteur compris. */}
        <AchievementUnlockHost />
        <AppIntro />
        {platform.isMobile ? (
          <ToastContainer
            theme="dark"
            position="bottom-center"
            autoClose={2600}
            transition={Slide}
            icon={false}
            limit={1}
            closeButton={false}
            hideProgressBar
            pauseOnFocusLoss={false}
            pauseOnHover={false}
            draggable="touch"
            draggableDirection="y"
            draggablePercent={30}
          />
        ) : (
          <ToastContainer theme="dark" position="bottom-right" autoClose={3500} />
        )}
      </RouterComponent>
    </GlobalErrorBoundary>
  </React.StrictMode>
);
