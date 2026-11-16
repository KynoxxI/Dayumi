/**
 * Résolution des sources vidéo Cinéma/Séries côté processus principal Electron.
 * Gère l'extraction directe, la détection HLS, le proxy local et la désactivation
 * automatique des hébergeurs en panne récurrente (3 échecs consécutifs).
 */

import Store from "electron-store";
import localProxyServer from "./local-proxy-server.js";
import { mintHandle } from "./stream-handles.js";
import { extractFromHtml } from "./video-extract.js";
import { fetchChecked } from "./provider-fetch.js";

const store = new Store({ name: "movie-settings" });
const MAX_FAILURES_BEFORE_DISABLE = 3;
const PROVIDER_TIMEOUT_MS = 20000;

// Compteurs d'échecs consécutifs en mémoire
const failureCounts = new Map();

/**
 * Récupère l'ensemble des fournisseurs désactivés persistés.
 * @returns {Set<string>}
 */
export function getDisabledProviders() {
  const list = store.get("movies:disabledProviders", []);
  return new Set(Array.isArray(list) ? list : []);
}

/**
 * Enregistre un échec pour un fournisseur et le désactive si le seuil est atteint.
 */
export function recordProviderFailure(providerId) {
  if (!providerId) return;
  const current = (failureCounts.get(providerId) || 0) + 1;
  failureCounts.set(providerId, current);

  if (current >= MAX_FAILURES_BEFORE_DISABLE) {
    const disabled = getDisabledProviders();
    disabled.add(providerId);
    store.set("movies:disabledProviders", Array.from(disabled));
    console.warn(`[MovieResolver] Fournisseur '${providerId}' désactivé après ${current} échecs consécutifs.`);
  }
}

/**
 * Réinitialise le compteur d'échecs en cas de succès.
 */
export function recordProviderSuccess(providerId) {
  if (!providerId) return;
  failureCounts.delete(providerId);
  const disabled = getDisabledProviders();
  if (disabled.has(providerId)) {
    disabled.delete(providerId);
    store.set("movies:disabledProviders", Array.from(disabled));
  }
}

/**
 * Résout une URL d'embed ou de flux direct en flux proxifié localement.
 */
export async function resolveMovieStream(payload = {}) {
  const { provider, url, mode = "stream" } = payload;
  if (!url) {
    return { success: false, error: "URL manquante" };
  }

  const disabled = getDisabledProviders();
  if (provider && disabled.has(provider)) {
    return { success: false, error: `Fournisseur '${provider}' temporairement désactivé` };
  }

  // Si c'est déjà un flux direct HLS ou MP4
  if (/\.(m3u8|mp4)(\?|$)/i.test(url)) {
    try {
      const isHls = /\.m3u8(\?|$)/i.test(url);
      const handle = mintHandle({
        url,
        provider: provider || "direct",
        referer: url,
        origin: new URL(url).origin,
      });
      if (!handle) return { success: false, error: "Impossible de créer la poignée de flux" };
      const proxyUrl = localProxyServer.urlForHandle(handle, { mode, isHls });
      recordProviderSuccess(provider);
      return { success: true, url: proxyUrl, handle, isHls, mode: "direct" };
    } catch (e) {
      recordProviderFailure(provider);
      return { success: false, error: e?.message || "Erreur de proxy" };
    }
  }

  // Extraction depuis la page d'embed
  const startedAt = Date.now();
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), PROVIDER_TIMEOUT_MS)
    );

    const fetchPromise = (async () => {
      const res = await fetchChecked(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Referer: new URL(url).origin,
        },
      });
      if (!res.ok) {
        throw new Error(`Erreur HTTP ${res.status}`);
      }
      return await res.text();
    })();

    const html = await Promise.race([fetchPromise, timeoutPromise]);
    const extracted = extractFromHtml(html, { devName: provider });

    if (!extracted.success || !extracted.videoUrl) {
      recordProviderFailure(provider);
      return { success: false, error: extracted.error || "Flux vidéo introuvable dans la page" };
    }

    const isHls = /\.m3u8(\?|$)/i.test(extracted.videoUrl);
    const handle = mintHandle({
      url: extracted.videoUrl,
      provider: provider || "movie",
      referer: url,
      origin: new URL(url).origin,
    });

    if (!handle) {
      recordProviderFailure(provider);
      return { success: false, error: "Impossible de créer la poignée de flux" };
    }

    if (isHls && mode !== "download") {
      localProxyServer.warmUp(handle);
    }

    recordProviderSuccess(provider);
    const proxyUrl = localProxyServer.urlForHandle(handle, { mode, isHls });
    console.log(`[MovieResolver] ✓ Résolu ${provider || "?"} en ${Date.now() - startedAt} ms (${isHls ? "HLS" : "MP4"})`);
    return { success: true, url: proxyUrl, handle, isHls, mode: "direct" };
  } catch (err) {
    recordProviderFailure(provider);
    const msg = err?.message === "TIMEOUT" ? "Délai d'attente dépassé (20s)" : err?.message || "Échec d'extraction";
    console.warn(`[MovieResolver] ✗ Échec ${provider || "?"} (${msg})`);
    return { success: false, error: msg };
  }
}

/**
 * Enregistre le canal IPC sécurisé pour Movie.
 */
export function registerMovieIpc(secureIpc) {
  secureIpc.handle("movie:resolve", async (_event, payload) => {
    return await resolveMovieStream(payload);
  });
}
