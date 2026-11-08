/**
 * Annonces officielles Dayumi : gérées depuis l'API Dayumi (https://dayumi.site/fn/announcements).
 * Les états lus et masqués sont persistés localement par utilisateur.
 */

const STORAGE_READ = "dayumi_announcements_read";
const STORAGE_DISMISSED = "dayumi_announcements_dismissed";

function getStoredSet(key) {
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveStoredSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {}
}

export async function getMyAnnouncements({ limit = 20, offset = 0 } = {}) {
  try {
    const res = await fetch("https://dayumi.site/fn/announcements", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const all = Array.isArray(json?.data) ? json.data : [];

    const readSet = getStoredSet(STORAGE_READ);
    const dismissedSet = getStoredSet(STORAGE_DISMISSED);

    // Filtrer les annonces masquées
    const visible = all.filter((a) => !dismissedSet.has(a.id));
    const paged = visible.slice(offset, offset + limit);

    return {
      total: visible.length,
      items: paged.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        type: a.type || "info",
        buttons: Array.isArray(a.buttons) ? a.buttons : [],
        createdAt: a.createdAt || a.created_at || new Date().toISOString(),
        isGlobal: !!a.isGlobal,
        authorName: a.authorName || '!"Kynoxx 🧃',
        authorAvatar: a.authorAvatar || null,
        isRead: readSet.has(a.id),
      })),
    };
  } catch (e) {
    console.warn("[Dayumi Announcements] repli local:", e.message);
    return {
      total: 1,
      items: [
        {
          id: "dayumi-v0-4-0-launch",
          title: "Bienvenue sur Dayumi Anime v0.4.0 !",
          body: "Nouvelle interface orange cristal, lecteur ultra rapide et liaison Discord instantanée.",
          type: "update",
          buttons: [
            { label: "Rejoindre le Discord", url: "https://discord.gg/EtHUwUhEvF", variant: "primary" },
          ],
          createdAt: new Date().toISOString(),
          isGlobal: true,
          authorName: '!"Kynoxx 🧃 (Fondateur)',
          authorAvatar: "https://cdn.discordapp.com/avatars/921387528169345064/a_5e7fd1d57694a71edbc751d8a9745277.gif",
          isRead: false,
        },
      ],
    };
  }
}

export async function markRead(ids) {
  if (!ids?.length) return;
  const readSet = getStoredSet(STORAGE_READ);
  for (const id of ids) readSet.add(id);
  saveStoredSet(STORAGE_READ, readSet);
}

export async function dismiss(id) {
  if (!id) return;
  const dismissedSet = getStoredSet(STORAGE_DISMISSED);
  dismissedSet.add(id);
  saveStoredSet(STORAGE_DISMISSED, dismissedSet);
}
