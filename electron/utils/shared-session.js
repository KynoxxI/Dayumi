/**
 * Fichier commun hors des `userData` (%APPDATA%/Nartya/shared, ~/Library/Application
 * Support/Nartya/shared, ~/.config/Nartya/shared). Écriture atomique : hub et app peuvent
 * rafraîchir en parallèle. Pas de `safeStorage` : chaque app a sa propre clé.
 */

import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

let sharedFile = null;
let sharedDir = null;

export function initSharedSession(app) {
  // Parent commun des userData de chaque app.
  const base = app?.getPath ? app.getPath("appData") : path.join(os.homedir(), ".config");
  sharedDir = path.join(base, "Dayumi", "shared");
  try {
    fs.mkdirSync(sharedDir, { recursive: true, mode: 0o700 });
    const legacyDir = path.join(base, "Nartya", "shared");
    const legacySession = path.join(legacyDir, "session.json");
    const targetSession = path.join(sharedDir, "session.json");
    if (!fs.existsSync(targetSession) && fs.existsSync(legacySession)) {
      try {
        fs.copyFileSync(legacySession, targetSession);
      } catch (_) {}
    }
  } catch (e) {
    console.error("[shared-session] mkdir a échoué:", e);
  }
  sharedFile = path.join(sharedDir, "session.json");
  restrictPermissions();
  return sharedFile;
}

/** Refresh token en clair : réservé au compte courant. `mode` ne s'applique qu'à la création. */
function restrictPermissions() {
  if (process.platform === "win32") return;
  try {
    fs.chmodSync(sharedDir, 0o700);
    if (fs.existsSync(sharedFile)) fs.chmodSync(sharedFile, 0o600);
  } catch (e) {
    console.warn("[shared-session] chmod a échoué:", e?.message || e);
  }
}

/** Écrit par le hub au démarrage : `{version, lastSeen}`, ou `null` s'il n'a jamais tourné ici. */
export function getHubInfo() {
  try {
    if (!sharedDir) return null;
    const f = path.join(sharedDir, "hub.json");
    if (!fs.existsSync(f)) return null;
    const obj = JSON.parse(fs.readFileSync(f, "utf-8"));
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

function readAll() {
  try {
    if (!sharedFile || !fs.existsSync(sharedFile)) return {};
    const raw = fs.readFileSync(sharedFile, "utf-8");
    const parsed = JSON.parse(raw);
    // Un ancien fichier chiffré est ignoré : il sera réécrit en clair.
    if (parsed && typeof parsed === "object" && parsed.__enc) return {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(obj) {
  if (!sharedFile) return;
  const tmp = `${sharedFile}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(obj), { encoding: "utf-8", mode: 0o600 });
    fs.renameSync(tmp, sharedFile);
  } catch (e) {
    console.error("[shared-session] écriture a échoué:", e);
    try {
      fs.rmSync(tmp, { force: true });
    } catch {}
  }
}

export function getItem(key) {
  const v = readAll()[key];
  return v === undefined ? null : v;
}

function parseStoredAccessToken(raw) {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const session = parsed?.currentSession ?? parsed;
    const token = session?.access_token;
    return typeof token === "string" && token.length > 0 && token.length <= 16_384
      ? token
      : null;
  } catch {
    return null;
  }
}

let _refreshing = false;
async function refreshSharedSession(authObj) {
  if (_refreshing || !authObj?.refresh_token) return;
  _refreshing = true;
  try {
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVodWVwdXdyY2pjaXdmc2ZvZXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0OTI1NTIsImV4cCI6MjEwOTA2ODU1Mn0.SQdqYeZvhEgyvG9Nwufon2hqDZ4v-CVJCeLJY9dDaAo';
    const res = await fetch('https://uhuepuwrcjciwfsfoetn.supabase.co/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'apikey': anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: authObj.refresh_token }),
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.access_token) {
      const updated = {
        ...authObj,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
        expires_in: data.expires_in
      };
      const raw = JSON.stringify(updated);
      setItem("nartya-auth", raw);
      setItem("dayumi-auth", raw);
      console.log("[shared-session] Jeton de session rafraîchi avec succès.");
    }
  } catch (e) {
    console.warn("[shared-session] Erreur refresh session:", e?.message || e);
  } finally {
    _refreshing = false;
  }
}

/**
 * Lu dans le fichier partagé, pas reçu du renderer : un renderer compromis ne peut pas en
 * imposer un autre.
 */
export function getSharedAccessToken() {
  const raw = getItem("nartya-auth") || getItem("dayumi-auth");
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const session = parsed?.currentSession ?? parsed;
    if (session?.expires_at && session.expires_at - Math.floor(Date.now() / 1000) < 300) {
      refreshSharedSession(session).catch(() => {});
    }
  } catch (_) {}
  return parseStoredAccessToken(raw);
}

function setItem(key, value) {
  const all = readAll();
  if ((key === "nartya-auth" || key === "dayumi-auth") && typeof value === "string" && value.includes("dayumi-local-token")) {
    const existing = all[key] || all["nartya-auth"] || all["dayumi-auth"];
    if (existing && typeof existing === "string" && existing.includes('"access_token":"eyJ')) {
      console.log("[shared-session] BLOCKED overwrite of real Supabase token by dummy local token!");
      return;
    }
  }
  all[key] = value;
  if (key === "dayumi-auth") all["nartya-auth"] = value;
  if (key === "nartya-auth") all["dayumi-auth"] = value;
  writeAll(all);
}

function removeItem(key) {
  const all = readAll();
  delete all[key];
  if (key === "dayumi-auth") delete all["nartya-auth"];
  if (key === "nartya-auth") delete all["dayumi-auth"];
  writeAll(all);
}

/**
 * Écriture atomique : on surveille le dossier, le fichier étant remplacé.
 * @param {(value: string|null) => void} onChange `null` = déconnexion
 */
export function watchSharedSession(onChange, key = "dayumi-auth") {
  if (!sharedDir) return () => {};
  let last = getItem(key) || getItem("nartya-auth");
  let timer = null;
  let watcher = null;

  const check = () => {
    const now = getItem(key) || getItem("nartya-auth");
    if (now === last) return; // un rename déclenche plusieurs événements
    last = now;
    onChange(now);
  };

  try {
    watcher = fs.watch(sharedDir, (_event, filename) => {
      if (filename && filename !== "session.json") return;
      clearTimeout(timer);
      timer = setTimeout(check, 150);
    });
  } catch (e) {
    console.error("[shared-session] surveillance impossible:", e);
    return () => {};
  }

  return () => {
    clearTimeout(timer);
    try {
      watcher.close();
    } catch {}
  };
}

const isSessionKey = (key) => typeof key === "string" && /^(dayumi|nartya)-auth(-[\w-]+)?$/.test(key);

export function registerSessionIpc(ipcMain) {
  ipcMain.handle("session:get", (_e, key) => {
    if (!isSessionKey(key)) return null;
    let val = getItem(key);
    if (!val && key === "dayumi-auth") val = getItem("nartya-auth");
    return val;
  });
  ipcMain.handle("session:set", (_e, key, value) => {
    if (!isSessionKey(key) || typeof value !== "string") return false;
    setItem(key, value);
    return true;
  });
  ipcMain.handle("session:remove", (_e, key) => {
    if (!isSessionKey(key)) return false;
    removeItem(key);
    return true;
  });
  ipcMain.handle("hub:get-info", () => getHubInfo());
}
