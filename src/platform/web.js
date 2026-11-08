const noop = () => { };

export const webPlatform = {
  name: "web",
  isElectron: false,
  os: null,
  isMobile: false,
  isDesktop: false,
  getMachineId: async () => null,
  resolveStream: async (payload = {}) => {
    const { token, apiBaseUrl } = payload;
    if (!token) return { success: false, error: "Jeton manquant" };
    try {
      const base = apiBaseUrl || (typeof window !== "undefined" ? window.location.origin : "https://dayumi.site");
      const res = await fetch(`${base}/v1/resolve-stream?token=${encodeURIComponent(token)}`, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) return { success: false, error: `Erreur serveur (${res.status})` };
      return await res.json();
    } catch (e) {
      return { success: false, error: e?.message || "Erreur de résolution" };
    }
  },
  downloads: null,
  session: null,
  cast: null,
  hub: null,
  discord: null,
  openExternal: (url) => window.open(url, "_blank", "noopener,noreferrer"),
  async openAuth(url) {
    window.location.assign(url);
    return { opened: true };
  },
  getAuthRedirectUrl: async () => null,
  onAuthCallback: noop,
  onNavigate: () => noop,
  getVersion: async () => null,
  installUpdate: async ({ url } = {}) => {
    window.open(url, "_blank", "noopener,noreferrer");
    return { opened: true };
  },
  setOrientation: noop,
  setBrightness: noop,
  getVolume: async () => null,
  setVolume: noop,
  captureVolumeButtons: noop,
  onVolumeChange: () => noop,
  nativePip: null,
  haptic: () => navigator.vibrate?.(10),
  share: async (data) => {
    if (!navigator.share) return false;
    await navigator.share(data);
    return true;
  },
  canOpenNewWindow: false,
  openNewWindow: noop,
  quit: noop,
  focusWindow: noop,
};
